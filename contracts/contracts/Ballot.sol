// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./VoterRegistry.sol";
import "./Election.sol";

/**
 * @title Ballot
 * @notice The single entry-point through which votes are cast.
 *
 *   Security properties
 *   ────────────────────
 *   • Checks-Effects-Interactions pattern prevents reentrancy bugs.
 *   • ReentrancyGuard provides an additional mutex for extra safety.
 *   • A local voteCommitments mapping is the primary double-vote guard;
 *     the VoterRegistry provides a secondary, cross-contract guard.
 *   • NO voter PII or plaintext identity is stored on-chain or emitted
 *     in events — only a voterCommitment (a salted hash produced off-chain).
 *
 * Role hierarchy (same constants as VoterRegistry and Election)
 * ──────────────────────────────────────────────────────────────
 *   DEFAULT_ADMIN_ROLE  →  can update registry / election addresses and grant roles
 *   ELECTION_ADMIN_ROLE →  reserved for future admin helpers on this contract
 *   OFFICIAL_ROLE       →  not used internally; Ballot itself holds this role
 *                          on VoterRegistry and Election so it can write to them
 */
contract Ballot is AccessControl, ReentrancyGuard {
    // ─── Roles ────────────────────────────────────────────────────────────────
    bytes32 public constant ELECTION_ADMIN_ROLE = keccak256("ELECTION_ADMIN_ROLE");
    bytes32 public constant OFFICIAL_ROLE       = keccak256("OFFICIAL_ROLE");

    // ─── Immutable contract references ────────────────────────────────────────

    /// @notice The VoterRegistry that stores per-voter eligibility & voted flags.
    VoterRegistry public immutable voterRegistry;

    /// @notice The Election contract that stores election metadata and vote counts.
    Election public immutable election;

    // ─── Storage ──────────────────────────────────────────────────────────────

    /**
     * @dev Primary double-vote guard local to this contract.
     *      voteCommitments[electionId][voterCommitment] = true once a vote
     *      has been recorded for that commitment.
     *
     *      voterCommitment = keccak256(abi.encodePacked(voterHash, electionId, nonce))
     *      computed off-chain; the raw voter identity is never revealed.
     */
    mapping(bytes32 => mapping(bytes32 => bool)) private voteCommitments;

    // ─── Events ───────────────────────────────────────────────────────────────

    /**
     * @notice Emitted once per successfully cast vote.
     * @dev    Intentionally contains NO plaintext voter identity.
     *         voterCommitment is a salted hash — observers cannot derive the
     *         voter's real-world identity from this event alone.
     */
    event VoteCast(
        bytes32 indexed electionId,
        bytes32 indexed voterCommitment,
        uint256 indexed candidateId,
        uint256         timestamp
    );

    // ─── Constructor ──────────────────────────────────────────────────────────

    /**
     * @param admin           Address that receives DEFAULT_ADMIN_ROLE.
     * @param voterRegistry_  Deployed VoterRegistry contract address.
     * @param election_       Deployed Election contract address.
     */
    constructor(
        address admin,
        address voterRegistry_,
        address election_
    ) {
        require(voterRegistry_ != address(0), "Ballot: zero registry address");
        require(election_      != address(0), "Ballot: zero election address");

        _grantRole(DEFAULT_ADMIN_ROLE,  admin);
        _grantRole(ELECTION_ADMIN_ROLE, admin);

        voterRegistry = VoterRegistry(voterRegistry_);
        election      = Election(election_);
    }

    // ─── Core voting function ─────────────────────────────────────────────────

    /**
     * @notice Cast a vote for a candidate in an election.
     *
     *   Follows Checks → Effects → Interactions:
     *
     *   CHECKS
     *   1. Election must be in Open status.
     *   2. candidateId must be valid (> 0 and within bounds).
     *   3. voterCommitment must not have been used already (local mapping).
     *   4. Voter (identified by voterHash derived off-chain from voterCommitment)
     *      must be registered and not yet voted in VoterRegistry.
     *
     *   EFFECTS
     *   5. Mark voteCommitments[electionId][voterCommitment] = true.
     *
     *   INTERACTIONS (external calls after all state is updated)
     *   6. Call voterRegistry.markVoted() to record the voter has voted.
     *   7. Call election.incrementVote() to tally the vote.
     *
     *   8. Emit VoteCast event.
     *
     * @param electionId      Identifier of the open election.
     * @param candidateId     1-based identifier of the chosen candidate.
     * @param voterCommitment Salted hash produced off-chain that uniquely
     *                        identifies the voter for this election without
     *                        revealing their real-world identity on-chain.
     *                        Typically: keccak256(abi.encodePacked(voterHash, electionId, nonce)).
     * @param voterHash       The salted hash stored in VoterRegistry
     *                        (keccak256(nationalId ++ salt)). Passed explicitly
     *                        so the registry can validate registration/voted status.
     */
    function castVote(
        bytes32 electionId,
        uint256 candidateId,
        bytes32 voterCommitment,
        bytes32 voterHash
    ) external nonReentrant {
        // ── CHECKS ────────────────────────────────────────────────────────────

        require(voterCommitment != bytes32(0), "Ballot: zero voter commitment");
        require(voterHash       != bytes32(0), "Ballot: zero voter hash");

        // 1. Election must be open
        require(election.isOpen(electionId), "Ballot: election is not open");

        // 2. Candidate must exist — getCandidates reverts if election doesn't exist
        Election.Candidate[] memory candidates = election.getCandidates(electionId);
        require(candidateId > 0 && candidateId <= candidates.length,
            "Ballot: invalid candidate id");

        // 3. Local commitment must be unused (primary double-vote guard)
        require(!voteCommitments[electionId][voterCommitment],
            "Ballot: commitment already used");

        // 4. VoterRegistry checks: registered and not yet voted
        require(voterRegistry.isRegistered(voterHash, electionId),
            "Ballot: voter not registered");
        require(!voterRegistry.hasVoted(voterHash, electionId),
            "Ballot: voter already voted");

        // ── EFFECTS ───────────────────────────────────────────────────────────

        // 5. Record commitment locally before any external calls
        voteCommitments[electionId][voterCommitment] = true;

        // ── INTERACTIONS ──────────────────────────────────────────────────────

        // 6. Mark voter as voted in the registry
        voterRegistry.markVoted(voterHash, electionId);

        // 7. Tally the vote in the election contract
        election.incrementVote(electionId, candidateId);

        // 8. Emit event — no PII in any indexed or non-indexed field
        emit VoteCast(electionId, voterCommitment, candidateId, block.timestamp);
    }

    // ─── View functions ───────────────────────────────────────────────────────

    /**
     * @notice Returns the current vote count for a candidate.
     * @param electionId  Target election.
     * @param candidateId 1-based candidate identifier.
     */
    function getVoteCount(
        bytes32 electionId,
        uint256 candidateId
    ) external view returns (uint256) {
        Election.Candidate[] memory candidates = election.getCandidates(electionId);
        require(candidateId > 0 && candidateId <= candidates.length,
            "Ballot: invalid candidate id");
        return candidates[candidateId - 1].voteCount;
    }

    /**
     * @notice Returns true if the given voterCommitment has already been used
     *         in the specified election.
     * @param electionId      Target election.
     * @param voterCommitment The commitment to check.
     */
    function hasCommitmentVoted(
        bytes32 electionId,
        bytes32 voterCommitment
    ) external view returns (bool) {
        return voteCommitments[electionId][voterCommitment];
    }
}
