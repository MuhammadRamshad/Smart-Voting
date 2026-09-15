// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title VoterRegistry
 * @notice Stores privacy-preserving voter eligibility data for elections.
 *         All voter identities are represented as salted keccak256 hashes —
 *         NO personally identifiable information (PII) is ever written on-chain.
 *
 * Role hierarchy
 * ──────────────
 *   DEFAULT_ADMIN_ROLE  →  can grant / revoke other roles
 *   ELECTION_ADMIN_ROLE →  registers voters for a specific election
 *   OFFICIAL_ROLE       →  marks a voter as having voted (called by Ballot)
 */
contract VoterRegistry is AccessControl {
    // ─── Roles ────────────────────────────────────────────────────────────────
    bytes32 public constant ELECTION_ADMIN_ROLE = keccak256("ELECTION_ADMIN_ROLE");
    bytes32 public constant OFFICIAL_ROLE       = keccak256("OFFICIAL_ROLE");

    // ─── Storage ──────────────────────────────────────────────────────────────

    /**
     * @dev voterHash → electionId → is registered for that election
     *      voterHash is keccak256(abi.encodePacked(nationalId, salt)) computed
     *      off-chain; the raw value is never stored here.
     */
    mapping(bytes32 => mapping(bytes32 => bool)) private _registered;

    /**
     * @dev voterHash → electionId → has already cast a vote
     */
    mapping(bytes32 => mapping(bytes32 => bool)) private _voted;

    // ─── Events ───────────────────────────────────────────────────────────────

    /// @notice Emitted when a voter hash is registered for an election.
    event VoterRegistered(bytes32 indexed voterHash, bytes32 indexed electionId);

    /// @notice Emitted when a voter is marked as having voted.
    event VoterMarkedVoted(bytes32 indexed voterHash, bytes32 indexed electionId);

    // ─── Constructor ──────────────────────────────────────────────────────────

    /**
     * @param admin Address that receives DEFAULT_ADMIN_ROLE on deployment.
     *              This address can subsequently grant ELECTION_ADMIN_ROLE and
     *              OFFICIAL_ROLE to other contracts / accounts.
     */
    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ELECTION_ADMIN_ROLE, admin);
    }

    // ─── Mutating functions ───────────────────────────────────────────────────

    /**
     * @notice Register a voter (identified by hash) for a given election.
     * @dev    Only ELECTION_ADMIN_ROLE may call this.
     *         Re-registering the same hash for the same election is a no-op
     *         (idempotent) rather than an error, which eases batch imports.
     * @param voterHash  keccak256 hash of (nationalId ++ salt) computed off-chain.
     * @param electionId Identifier of the election.
     */
    function registerVoter(
        bytes32 voterHash,
        bytes32 electionId
    ) external onlyRole(ELECTION_ADMIN_ROLE) {
        require(voterHash  != bytes32(0), "VoterRegistry: zero voter hash");
        require(electionId != bytes32(0), "VoterRegistry: zero election id");

        if (!_registered[voterHash][electionId]) {
            _registered[voterHash][electionId] = true;
            emit VoterRegistered(voterHash, electionId);
        }
    }

    /**
     * @notice Mark a voter as having cast their vote.
     * @dev    Only OFFICIAL_ROLE may call this (i.e. the Ballot contract).
     *         Reverts if the voter was not registered or has already voted.
     * @param voterHash  Salted hash identifying the voter.
     * @param electionId Election in which the vote was cast.
     */
    function markVoted(
        bytes32 voterHash,
        bytes32 electionId
    ) external onlyRole(OFFICIAL_ROLE) {
        require(_registered[voterHash][electionId], "VoterRegistry: voter not registered");
        require(!_voted[voterHash][electionId],     "VoterRegistry: voter already voted");

        _voted[voterHash][electionId] = true;
        emit VoterMarkedVoted(voterHash, electionId);
    }

    // ─── View functions ───────────────────────────────────────────────────────

    /**
     * @notice Returns true if the voter has already voted in the election.
     * @param voterHash  Salted hash identifying the voter.
     * @param electionId Target election.
     */
    function hasVoted(
        bytes32 voterHash,
        bytes32 electionId
    ) external view returns (bool) {
        return _voted[voterHash][electionId];
    }

    /**
     * @notice Returns true if the voter is registered for the election.
     * @param voterHash  Salted hash identifying the voter.
     * @param electionId Target election.
     */
    function isRegistered(
        bytes32 voterHash,
        bytes32 electionId
    ) external view returns (bool) {
        return _registered[voterHash][electionId];
    }
}
