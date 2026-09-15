// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title Election
 * @notice Manages the full lifecycle of elections: creation, opening, closing,
 *         auditing, candidate management, and vote-count tracking.
 *
 * Role hierarchy (mirrored from VoterRegistry so both contracts share the same
 * role identifiers and can be administered from one admin account)
 * ──────────────────────────────────────────────────────────────────────────────
 *   DEFAULT_ADMIN_ROLE  →  can grant / revoke other roles
 *   ELECTION_ADMIN_ROLE →  creates and manages elections
 *   OFFICIAL_ROLE       →  increments vote counts (called by Ballot) and
 *                          marks elections as Audited
 */
contract Election is AccessControl {
    // ─── Roles ────────────────────────────────────────────────────────────────
    bytes32 public constant ELECTION_ADMIN_ROLE = keccak256("ELECTION_ADMIN_ROLE");
    bytes32 public constant OFFICIAL_ROLE       = keccak256("OFFICIAL_ROLE");

    // ─── Types ────────────────────────────────────────────────────────────────

    /// @notice Lifecycle states an election can move through (one-way).
    enum Status { Scheduled, Open, Closed, Audited }

    /// @notice Represents a single candidate within an election.
    struct Candidate {
        uint256 id;        // 1-based sequential id assigned at creation
        string  name;      // Display name (stored on-chain for transparency)
        uint256 voteCount; // Incremented by Ballot via OFFICIAL_ROLE
    }

    /// @notice All data associated with a single election.
    struct ElectionData {
        bytes32     id;
        string      title;
        uint256     startTime;
        uint256     endTime;
        Status      status;
        Candidate[] candidates;
    }

    // ─── Storage ──────────────────────────────────────────────────────────────

    /// @dev electionId → ElectionData (candidates array stored inline)
    mapping(bytes32 => ElectionData) private _elections;

    /// @dev Track which election IDs have been created to detect duplicates
    mapping(bytes32 => bool) private _exists;

    // ─── Events ───────────────────────────────────────────────────────────────

    event ElectionCreated(
        bytes32 indexed electionId,
        string          title,
        uint256         startTime,
        uint256         endTime
    );

    event ElectionOpened(bytes32 indexed electionId, uint256 timestamp);
    event ElectionClosed(bytes32 indexed electionId, uint256 timestamp);
    event ElectionAudited(bytes32 indexed electionId, uint256 timestamp);

    // ─── Constructor ──────────────────────────────────────────────────────────

    /**
     * @param admin Address that receives DEFAULT_ADMIN_ROLE and
     *              ELECTION_ADMIN_ROLE on deployment.
     */
    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ELECTION_ADMIN_ROLE, admin);
    }

    // ─── Mutating functions ───────────────────────────────────────────────────

    /**
     * @notice Create a new election with the supplied candidates.
     * @dev    startTime must be in the future (or present) and before endTime.
     *         At least one candidate is required.
     * @param id             Unique election identifier (bytes32, e.g. keccak256 of a slug).
     * @param title          Human-readable election title.
     * @param startTime      Unix timestamp when voting may begin.
     * @param endTime        Unix timestamp after which voting is no longer possible.
     * @param candidateNames Ordered list of candidate display names.
     */
    function createElection(
        bytes32          id,
        string  calldata title,
        uint256          startTime,
        uint256          endTime,
        string[] calldata candidateNames
    ) external onlyRole(ELECTION_ADMIN_ROLE) {
        require(id        != bytes32(0),       "Election: zero id");
        require(!_exists[id],                  "Election: already exists");
        require(bytes(title).length > 0,       "Election: empty title");
        require(startTime < endTime,           "Election: startTime >= endTime");
        require(candidateNames.length > 0,     "Election: no candidates");

        // Initialise the struct in storage (status defaults to Scheduled = 0)
        ElectionData storage e = _elections[id];
        e.id        = id;
        e.title     = title;
        e.startTime = startTime;
        e.endTime   = endTime;
        e.status    = Status.Scheduled;

        // Push candidates with 1-based IDs
        for (uint256 i = 0; i < candidateNames.length; i++) {
            require(bytes(candidateNames[i]).length > 0, "Election: empty candidate name");
            e.candidates.push(Candidate({ id: i + 1, name: candidateNames[i], voteCount: 0 }));
        }

        _exists[id] = true;
        emit ElectionCreated(id, title, startTime, endTime);
    }

    /**
     * @notice Transition the election from Scheduled → Open.
     * @dev    Requires block.timestamp >= startTime so the election has actually
     *         started (admin may not open it early).
     * @param electionId Target election.
     */
    function openElection(bytes32 electionId) external onlyRole(ELECTION_ADMIN_ROLE) {
        ElectionData storage e = _getExisting(electionId);
        require(e.status == Status.Scheduled,         "Election: not in Scheduled status");
        require(block.timestamp >= e.startTime,       "Election: start time not reached");

        e.status = Status.Open;
        emit ElectionOpened(electionId, block.timestamp);
    }

    /**
     * @notice Transition the election from Open → Closed.
     * @param electionId Target election.
     */
    function closeElection(bytes32 electionId) external onlyRole(ELECTION_ADMIN_ROLE) {
        ElectionData storage e = _getExisting(electionId);
        require(e.status == Status.Open, "Election: not Open");

        e.status = Status.Closed;
        emit ElectionClosed(electionId, block.timestamp);
    }

    /**
     * @notice Transition the election from Closed → Audited.
     * @param electionId Target election.
     */
    function markAudited(bytes32 electionId) external onlyRole(OFFICIAL_ROLE) {
        ElectionData storage e = _getExisting(electionId);
        require(e.status == Status.Closed, "Election: not Closed");

        e.status = Status.Audited;
        emit ElectionAudited(electionId, block.timestamp);
    }

    /**
     * @notice Increment the vote count for a specific candidate.
     * @dev    Only OFFICIAL_ROLE (Ballot contract) may call this.
     *         candidateId is 1-based.
     * @param electionId  Target election.
     * @param candidateId 1-based candidate identifier.
     */
    function incrementVote(
        bytes32 electionId,
        uint256 candidateId
    ) external onlyRole(OFFICIAL_ROLE) {
        ElectionData storage e = _getExisting(electionId);
        require(e.status == Status.Open, "Election: not Open");

        uint256 idx = _candidateIndex(e, candidateId);
        e.candidates[idx].voteCount += 1;
    }

    // ─── View functions ───────────────────────────────────────────────────────

    /**
     * @notice Returns the full ElectionData struct for a given election.
     * @dev    Solidity copies the struct (including the dynamic candidates array)
     *         into memory when returning from a public view function.
     * @param electionId Target election.
     */
    function getElection(bytes32 electionId)
        external
        view
        returns (ElectionData memory)
    {
        _requireExists(electionId);
        return _elections[electionId];
    }

    /**
     * @notice Returns all candidates for a given election.
     * @param electionId Target election.
     */
    function getCandidates(bytes32 electionId)
        external
        view
        returns (Candidate[] memory)
    {
        _requireExists(electionId);
        return _elections[electionId].candidates;
    }

    /**
     * @notice Returns true if the election is currently in Open status.
     * @param electionId Target election.
     */
    function isOpen(bytes32 electionId) external view returns (bool) {
        _requireExists(electionId);
        return _elections[electionId].status == Status.Open;
    }

    // ─── Internal helpers ─────────────────────────────────────────────────────

    /// @dev Revert if the election does not exist; otherwise return its storage pointer.
    function _getExisting(bytes32 electionId)
        internal
        view
        returns (ElectionData storage)
    {
        require(_exists[electionId], "Election: does not exist");
        return _elections[electionId];
    }

    /// @dev Revert if the election does not exist (view-only variant).
    function _requireExists(bytes32 electionId) internal view {
        require(_exists[electionId], "Election: does not exist");
    }

    /**
     * @dev Returns the 0-based array index for a 1-based candidateId.
     *      Reverts if the id is out of range.
     */
    function _candidateIndex(
        ElectionData storage e,
        uint256 candidateId
    ) internal view returns (uint256) {
        require(candidateId > 0 && candidateId <= e.candidates.length,
            "Election: invalid candidate id");
        return candidateId - 1; // candidates are stored 0-indexed in the array
    }
}
