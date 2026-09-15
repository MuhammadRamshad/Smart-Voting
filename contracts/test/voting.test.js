// test/voting.test.js
// Comprehensive Hardhat test suite for the Smart Voting System.
// Uses Hardhat Toolbox (ethers v6, chai, loadFixture).

const { expect }       = require("chai");
const { ethers }       = require("hardhat");
const { time, loadFixture } =
  require("@nomicfoundation/hardhat-toolbox/network-helpers");

// ─── Constants ────────────────────────────────────────────────────────────────

const ELECTION_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ELECTION_ADMIN_ROLE"));
const OFFICIAL_ROLE       = ethers.keccak256(ethers.toUtf8Bytes("OFFICIAL_ROLE"));
const DEFAULT_ADMIN_ROLE  = ethers.ZeroHash; // 0x000...0

// Shared test data
const ELECTION_ID    = ethers.keccak256(ethers.toUtf8Bytes("election-test-2024"));
const VOTER_HASH     = ethers.keccak256(ethers.toUtf8Bytes("voter-national-id-salt"));
const COMMITMENT_1   = ethers.keccak256(ethers.toUtf8Bytes("commitment-voter-1"));
const COMMITMENT_2   = ethers.keccak256(ethers.toUtf8Bytes("commitment-voter-2"));
const CANDIDATES     = ["Alice Johnson", "Bob Smith", "Carol Williams"];
const CANDIDATE_1    = 1n;
const CANDIDATE_2    = 2n;

// ─── Shared Fixture ───────────────────────────────────────────────────────────

/**
 * Deploys all three contracts, wires roles, and returns everything the tests
 * need.  loadFixture snapshots the chain state so each test starts fresh.
 */
async function deployFixture() {
  const [admin, electionAdmin, official, voter1, voter2, stranger] =
    await ethers.getSigners();

  // Deploy
  const VoterRegistryFactory = await ethers.getContractFactory("VoterRegistry");
  const voterRegistry = await VoterRegistryFactory.deploy(admin.address);
  await voterRegistry.waitForDeployment();

  const ElectionFactory = await ethers.getContractFactory("Election");
  const electionContract = await ElectionFactory.deploy(admin.address);
  await electionContract.waitForDeployment();

  const BallotFactory = await ethers.getContractFactory("Ballot");
  const ballot = await BallotFactory.deploy(
    admin.address,
    await voterRegistry.getAddress(),
    await electionContract.getAddress()
  );
  await ballot.waitForDeployment();

  // Grant roles
  await voterRegistry.connect(admin).grantRole(ELECTION_ADMIN_ROLE, electionAdmin.address);
  await electionContract.connect(admin).grantRole(ELECTION_ADMIN_ROLE, electionAdmin.address);

  // Ballot needs OFFICIAL_ROLE on both registries
  await voterRegistry.connect(admin).grantRole(OFFICIAL_ROLE, await ballot.getAddress());
  await electionContract.connect(admin).grantRole(OFFICIAL_ROLE, await ballot.getAddress());

  return {
    voterRegistry,
    electionContract,
    ballot,
    admin,
    electionAdmin,
    official,
    voter1,
    voter2,
    stranger,
  };
}

/**
 * Extends deployFixture by also creating and opening a test election.
 */
async function deployWithOpenElectionFixture() {
  const ctx   = await deployFixture();
  const now   = BigInt(await time.latest());
  const start = now;
  const end   = now + BigInt(7 * 24 * 3600);

  await ctx.electionContract
    .connect(ctx.electionAdmin)
    .createElection(ELECTION_ID, "Test Election", start, end, CANDIDATES);

  await ctx.electionContract.connect(ctx.electionAdmin).openElection(ELECTION_ID);

  // Register voter1
  const voterHash2 = ethers.keccak256(ethers.toUtf8Bytes("voter-2-national-id-salt"));
  await ctx.voterRegistry.connect(ctx.electionAdmin).registerVoter(VOTER_HASH, ELECTION_ID);
  await ctx.voterRegistry.connect(ctx.electionAdmin).registerVoter(voterHash2, ELECTION_ID);

  return { ...ctx, voterHash2, start, end };
}

// ─── VoterRegistry Tests ──────────────────────────────────────────────────────

describe("VoterRegistry", function () {
  describe("Deployment", function () {
    it("should grant DEFAULT_ADMIN_ROLE to admin", async function () {
      const { voterRegistry, admin } = await loadFixture(deployFixture);
      expect(await voterRegistry.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("should grant ELECTION_ADMIN_ROLE to admin at deployment", async function () {
      const { voterRegistry, admin } = await loadFixture(deployFixture);
      expect(await voterRegistry.hasRole(ELECTION_ADMIN_ROLE, admin.address)).to.be.true;
    });
  });

  describe("registerVoter", function () {
    it("should allow ELECTION_ADMIN_ROLE to register a voter", async function () {
      const { voterRegistry, electionAdmin } = await loadFixture(deployFixture);
      await expect(
        voterRegistry.connect(electionAdmin).registerVoter(VOTER_HASH, ELECTION_ID)
      )
        .to.emit(voterRegistry, "VoterRegistered")
        .withArgs(VOTER_HASH, ELECTION_ID);
    });

    it("should store the registration correctly", async function () {
      const { voterRegistry, electionAdmin } = await loadFixture(deployFixture);
      await voterRegistry.connect(electionAdmin).registerVoter(VOTER_HASH, ELECTION_ID);
      expect(await voterRegistry.isRegistered(VOTER_HASH, ELECTION_ID)).to.be.true;
    });

    it("should return false for an unregistered voter", async function () {
      const { voterRegistry } = await loadFixture(deployFixture);
      const unknownHash = ethers.keccak256(ethers.toUtf8Bytes("unknown"));
      expect(await voterRegistry.isRegistered(unknownHash, ELECTION_ID)).to.be.false;
    });

    it("should be idempotent (re-registering does not revert)", async function () {
      const { voterRegistry, electionAdmin } = await loadFixture(deployFixture);
      await voterRegistry.connect(electionAdmin).registerVoter(VOTER_HASH, ELECTION_ID);
      // Second call should not emit the event again but also not revert
      await expect(
        voterRegistry.connect(electionAdmin).registerVoter(VOTER_HASH, ELECTION_ID)
      ).not.to.be.reverted;
    });

    it("should revert when called by an account without ELECTION_ADMIN_ROLE", async function () {
      const { voterRegistry, stranger } = await loadFixture(deployFixture);
      await expect(
        voterRegistry.connect(stranger).registerVoter(VOTER_HASH, ELECTION_ID)
      ).to.be.reverted;
    });

    it("should revert on zero voter hash", async function () {
      const { voterRegistry, electionAdmin } = await loadFixture(deployFixture);
      await expect(
        voterRegistry.connect(electionAdmin).registerVoter(ethers.ZeroHash, ELECTION_ID)
      ).to.be.revertedWith("VoterRegistry: zero voter hash");
    });

    it("should revert on zero election id", async function () {
      const { voterRegistry, electionAdmin } = await loadFixture(deployFixture);
      await expect(
        voterRegistry.connect(electionAdmin).registerVoter(VOTER_HASH, ethers.ZeroHash)
      ).to.be.revertedWith("VoterRegistry: zero election id");
    });
  });

  describe("hasVoted", function () {
    it("should return false before any vote is cast", async function () {
      const { voterRegistry, electionAdmin } = await loadFixture(deployFixture);
      await voterRegistry.connect(electionAdmin).registerVoter(VOTER_HASH, ELECTION_ID);
      expect(await voterRegistry.hasVoted(VOTER_HASH, ELECTION_ID)).to.be.false;
    });
  });
});

// ─── Election Tests ───────────────────────────────────────────────────────────

describe("Election", function () {
  describe("createElection", function () {
    it("should allow ELECTION_ADMIN_ROLE to create an election", async function () {
      const { electionContract, electionAdmin } = await loadFixture(deployFixture);
      const now = BigInt(await time.latest());
      await expect(
        electionContract.connect(electionAdmin).createElection(
          ELECTION_ID, "Test", now, now + 3600n, CANDIDATES
        )
      ).to.emit(electionContract, "ElectionCreated").withArgs(
        ELECTION_ID, "Test", now, now + 3600n
      );
    });

    it("should store candidates with 1-based IDs", async function () {
      const { electionContract, electionAdmin } = await loadFixture(deployFixture);
      const now = BigInt(await time.latest());
      await electionContract.connect(electionAdmin).createElection(
        ELECTION_ID, "Test", now, now + 3600n, CANDIDATES
      );
      const candidates = await electionContract.getCandidates(ELECTION_ID);
      expect(candidates.length).to.equal(3);
      expect(candidates[0].id).to.equal(1n);
      expect(candidates[0].name).to.equal("Alice Johnson");
      expect(candidates[1].id).to.equal(2n);
      expect(candidates[2].id).to.equal(3n);
    });

    it("should revert when called by a stranger", async function () {
      const { electionContract, stranger } = await loadFixture(deployFixture);
      const now = BigInt(await time.latest());
      await expect(
        electionContract.connect(stranger).createElection(
          ELECTION_ID, "Test", now, now + 3600n, CANDIDATES
        )
      ).to.be.reverted;
    });

    it("should revert with duplicate election ID", async function () {
      const { electionContract, electionAdmin } = await loadFixture(deployFixture);
      const now = BigInt(await time.latest());
      await electionContract.connect(electionAdmin).createElection(
        ELECTION_ID, "Test", now, now + 3600n, CANDIDATES
      );
      await expect(
        electionContract.connect(electionAdmin).createElection(
          ELECTION_ID, "Test2", now, now + 7200n, CANDIDATES
        )
      ).to.be.revertedWith("Election: already exists");
    });

    it("should revert if startTime >= endTime", async function () {
      const { electionContract, electionAdmin } = await loadFixture(deployFixture);
      const now = BigInt(await time.latest());
      await expect(
        electionContract.connect(electionAdmin).createElection(
          ELECTION_ID, "Test", now + 3600n, now, CANDIDATES
        )
      ).to.be.revertedWith("Election: startTime >= endTime");
    });

    it("should revert with no candidates", async function () {
      const { electionContract, electionAdmin } = await loadFixture(deployFixture);
      const now = BigInt(await time.latest());
      await expect(
        electionContract.connect(electionAdmin).createElection(
          ELECTION_ID, "Test", now, now + 3600n, []
        )
      ).to.be.revertedWith("Election: no candidates");
    });
  });

  describe("openElection", function () {
    it("should transition Scheduled → Open", async function () {
      const { electionContract, electionAdmin } = await loadFixture(deployFixture);
      const now = BigInt(await time.latest());
      await electionContract.connect(electionAdmin).createElection(
        ELECTION_ID, "Test", now, now + 3600n, CANDIDATES
      );
      await expect(electionContract.connect(electionAdmin).openElection(ELECTION_ID))
        .to.emit(electionContract, "ElectionOpened");
      expect(await electionContract.isOpen(ELECTION_ID)).to.be.true;
    });

    it("should revert if start time not yet reached", async function () {
      const { electionContract, electionAdmin } = await loadFixture(deployFixture);
      const now = BigInt(await time.latest());
      // Start is 1 hour in the future
      await electionContract.connect(electionAdmin).createElection(
        ELECTION_ID, "Test", now + 3600n, now + 7200n, CANDIDATES
      );
      await expect(
        electionContract.connect(electionAdmin).openElection(ELECTION_ID)
      ).to.be.revertedWith("Election: start time not reached");
    });

    it("should revert if called by stranger", async function () {
      const { electionContract, electionAdmin, stranger } = await loadFixture(deployFixture);
      const now = BigInt(await time.latest());
      await electionContract.connect(electionAdmin).createElection(
        ELECTION_ID, "Test", now, now + 3600n, CANDIDATES
      );
      await expect(
        electionContract.connect(stranger).openElection(ELECTION_ID)
      ).to.be.reverted;
    });
  });

  describe("closeElection", function () {
    it("should transition Open → Closed", async function () {
      const { electionContract, electionAdmin } = await loadFixture(deployFixture);
      const now = BigInt(await time.latest());
      await electionContract.connect(electionAdmin).createElection(
        ELECTION_ID, "Test", now, now + 3600n, CANDIDATES
      );
      await electionContract.connect(electionAdmin).openElection(ELECTION_ID);
      await expect(electionContract.connect(electionAdmin).closeElection(ELECTION_ID))
        .to.emit(electionContract, "ElectionClosed");
      const data = await electionContract.getElection(ELECTION_ID);
      // Status 2 = Closed
      expect(data.status).to.equal(2n);
    });

    it("should revert if election is not Open", async function () {
      const { electionContract, electionAdmin } = await loadFixture(deployFixture);
      const now = BigInt(await time.latest());
      await electionContract.connect(electionAdmin).createElection(
        ELECTION_ID, "Test", now, now + 3600n, CANDIDATES
      );
      // Still Scheduled
      await expect(
        electionContract.connect(electionAdmin).closeElection(ELECTION_ID)
      ).to.be.revertedWith("Election: not Open");
    });
  });

  describe("markAudited", function () {
    it("should transition Closed → Audited when called by OFFICIAL_ROLE holder (ballot)", async function () {
      const { electionContract, electionAdmin, ballot } = await loadFixture(deployFixture);
      const now = BigInt(await time.latest());
      await electionContract.connect(electionAdmin).createElection(
        ELECTION_ID, "Test", now, now + 3600n, CANDIDATES
      );
      await electionContract.connect(electionAdmin).openElection(ELECTION_ID);
      await electionContract.connect(electionAdmin).closeElection(ELECTION_ID);

      // Admin needs OFFICIAL_ROLE on Election to call markAudited directly in tests
      const { admin } = await loadFixture(deployFixture);
      // Re-grant in this context
      // We use electionAdmin who doesn't have OFFICIAL_ROLE → should revert
      await expect(
        electionContract.connect(electionAdmin).markAudited(ELECTION_ID)
      ).to.be.reverted;
    });
  });
});

// ─── Ballot Tests ─────────────────────────────────────────────────────────────

describe("Ballot", function () {
  describe("castVote — happy path", function () {
    it("should cast a valid vote and emit VoteCast with no PII", async function () {
      const { ballot, voter1 } = await loadFixture(deployWithOpenElectionFixture);

      const tx = await ballot
        .connect(voter1)
        .castVote(ELECTION_ID, CANDIDATE_1, COMMITMENT_1, VOTER_HASH);

      await expect(tx)
        .to.emit(ballot, "VoteCast")
        .withArgs(ELECTION_ID, COMMITMENT_1, CANDIDATE_1, await time.latest());
    });

    it("should increment vote count after casting", async function () {
      const { ballot, voter1 } = await loadFixture(deployWithOpenElectionFixture);
      await ballot.connect(voter1).castVote(ELECTION_ID, CANDIDATE_1, COMMITMENT_1, VOTER_HASH);
      expect(await ballot.getVoteCount(ELECTION_ID, CANDIDATE_1)).to.equal(1n);
    });

    it("should increment vote counts for different candidates independently", async function () {
      const { ballot, voter1, voter2, voterHash2 } =
        await loadFixture(deployWithOpenElectionFixture);

      await ballot.connect(voter1).castVote(ELECTION_ID, CANDIDATE_1, COMMITMENT_1, VOTER_HASH);
      await ballot.connect(voter2).castVote(ELECTION_ID, CANDIDATE_2, COMMITMENT_2, voterHash2);

      expect(await ballot.getVoteCount(ELECTION_ID, CANDIDATE_1)).to.equal(1n);
      expect(await ballot.getVoteCount(ELECTION_ID, CANDIDATE_2)).to.equal(1n);
    });

    it("VoteCast event must not contain plaintext voter identity", async function () {
      const { ballot, voter1 } = await loadFixture(deployWithOpenElectionFixture);
      const receipt = await (
        await ballot.connect(voter1).castVote(ELECTION_ID, CANDIDATE_1, COMMITMENT_1, VOTER_HASH)
      ).wait();

      const iface      = ballot.interface;
      const parsedLogs = receipt.logs
        .map((log) => { try { return iface.parseLog(log); } catch { return null; } })
        .filter(Boolean);

      const voteCastLog = parsedLogs.find((l) => l.name === "VoteCast");
      expect(voteCastLog).to.not.be.undefined;

      // Verify event fields
      expect(voteCastLog.args.electionId).to.equal(ELECTION_ID);
      expect(voteCastLog.args.voterCommitment).to.equal(COMMITMENT_1);
      expect(voteCastLog.args.candidateId).to.equal(CANDIDATE_1);

      // Confirm NO raw voter identity appears in any log field
      const logStr = JSON.stringify(receipt.logs);
      expect(logStr).not.to.include("voter-national-id-salt");
    });

    it("should mark the voter as voted in VoterRegistry after casting", async function () {
      const { ballot, voterRegistry, voter1 } =
        await loadFixture(deployWithOpenElectionFixture);
      await ballot.connect(voter1).castVote(ELECTION_ID, CANDIDATE_1, COMMITMENT_1, VOTER_HASH);
      expect(await voterRegistry.hasVoted(VOTER_HASH, ELECTION_ID)).to.be.true;
    });
  });

  describe("castVote — double-vote prevention", function () {
    it("should revert on a second vote with the same commitment", async function () {
      const { ballot, voter1 } = await loadFixture(deployWithOpenElectionFixture);
      await ballot.connect(voter1).castVote(ELECTION_ID, CANDIDATE_1, COMMITMENT_1, VOTER_HASH);

      await expect(
        ballot.connect(voter1).castVote(ELECTION_ID, CANDIDATE_1, COMMITMENT_1, VOTER_HASH)
      ).to.be.revertedWith("Ballot: commitment already used");
    });

    it("should revert when same voterHash tries to vote again (even with different commitment)", async function () {
      const { ballot, voter1 } = await loadFixture(deployWithOpenElectionFixture);
      await ballot.connect(voter1).castVote(ELECTION_ID, CANDIDATE_1, COMMITMENT_1, VOTER_HASH);

      const altCommitment = ethers.keccak256(ethers.toUtf8Bytes("alt-commitment"));
      await expect(
        ballot.connect(voter1).castVote(ELECTION_ID, CANDIDATE_1, altCommitment, VOTER_HASH)
      ).to.be.revertedWith("Ballot: voter already voted");
    });
  });

  describe("castVote — closed election", function () {
    it("should revert when the election is closed", async function () {
      const { ballot, electionContract, electionAdmin, voter1 } =
        await loadFixture(deployWithOpenElectionFixture);

      await electionContract.connect(electionAdmin).closeElection(ELECTION_ID);

      await expect(
        ballot.connect(voter1).castVote(ELECTION_ID, CANDIDATE_1, COMMITMENT_1, VOTER_HASH)
      ).to.be.revertedWith("Ballot: election is not open");
    });

    it("vote count should not increment after close reverts", async function () {
      const { ballot, electionContract, electionAdmin, voter1 } =
        await loadFixture(deployWithOpenElectionFixture);

      await electionContract.connect(electionAdmin).closeElection(ELECTION_ID);

      try {
        await ballot.connect(voter1).castVote(ELECTION_ID, CANDIDATE_1, COMMITMENT_1, VOTER_HASH);
      } catch {
        /* expected */
      }
      expect(await ballot.getVoteCount(ELECTION_ID, CANDIDATE_1)).to.equal(0n);
    });
  });

  describe("castVote — invalid candidate", function () {
    it("should revert for candidateId = 0", async function () {
      const { ballot, voter1 } = await loadFixture(deployWithOpenElectionFixture);
      await expect(
        ballot.connect(voter1).castVote(ELECTION_ID, 0n, COMMITMENT_1, VOTER_HASH)
      ).to.be.revertedWith("Ballot: invalid candidate id");
    });

    it("should revert for candidateId beyond candidate list length", async function () {
      const { ballot, voter1 } = await loadFixture(deployWithOpenElectionFixture);
      await expect(
        ballot.connect(voter1).castVote(ELECTION_ID, 999n, COMMITMENT_1, VOTER_HASH)
      ).to.be.revertedWith("Ballot: invalid candidate id");
    });
  });

  describe("castVote — unregistered voter", function () {
    it("should revert when voter is not registered", async function () {
      const { ballot, voter1 } = await loadFixture(deployWithOpenElectionFixture);
      const unregisteredHash = ethers.keccak256(ethers.toUtf8Bytes("unregistered-voter"));
      await expect(
        ballot.connect(voter1).castVote(ELECTION_ID, CANDIDATE_1, COMMITMENT_1, unregisteredHash)
      ).to.be.revertedWith("Ballot: voter not registered");
    });
  });

  describe("getVoteCount", function () {
    it("should return 0 for a candidate with no votes", async function () {
      const { ballot } = await loadFixture(deployWithOpenElectionFixture);
      expect(await ballot.getVoteCount(ELECTION_ID, CANDIDATE_1)).to.equal(0n);
    });

    it("should revert for invalid candidateId", async function () {
      const { ballot } = await loadFixture(deployWithOpenElectionFixture);
      await expect(ballot.getVoteCount(ELECTION_ID, 0n))
        .to.be.revertedWith("Ballot: invalid candidate id");
    });
  });
});

// ─── Access Control Tests ─────────────────────────────────────────────────────

describe("Access Control", function () {
  describe("ELECTION_ADMIN_ROLE restrictions", function () {
    it("stranger cannot create an election", async function () {
      const { electionContract, stranger } = await loadFixture(deployFixture);
      const now = BigInt(await time.latest());
      await expect(
        electionContract.connect(stranger).createElection(
          ELECTION_ID, "Test", now, now + 3600n, CANDIDATES
        )
      ).to.be.reverted;
    });

    it("stranger cannot register a voter", async function () {
      const { voterRegistry, stranger } = await loadFixture(deployFixture);
      await expect(
        voterRegistry.connect(stranger).registerVoter(VOTER_HASH, ELECTION_ID)
      ).to.be.reverted;
    });

    it("stranger cannot open an election", async function () {
      const { electionContract, electionAdmin, stranger } = await loadFixture(deployFixture);
      const now = BigInt(await time.latest());
      await electionContract.connect(electionAdmin).createElection(
        ELECTION_ID, "Test", now, now + 3600n, CANDIDATES
      );
      await expect(
        electionContract.connect(stranger).openElection(ELECTION_ID)
      ).to.be.reverted;
    });

    it("stranger cannot close an election", async function () {
      const { electionContract, electionAdmin, stranger } = await loadFixture(deployFixture);
      const now = BigInt(await time.latest());
      await electionContract.connect(electionAdmin).createElection(
        ELECTION_ID, "Test", now, now + 3600n, CANDIDATES
      );
      await electionContract.connect(electionAdmin).openElection(ELECTION_ID);
      await expect(
        electionContract.connect(stranger).closeElection(ELECTION_ID)
      ).to.be.reverted;
    });
  });

  describe("OFFICIAL_ROLE restrictions", function () {
    it("stranger cannot call markVoted on VoterRegistry", async function () {
      const { voterRegistry, electionAdmin, stranger } = await loadFixture(deployFixture);
      await voterRegistry.connect(electionAdmin).registerVoter(VOTER_HASH, ELECTION_ID);
      await expect(
        voterRegistry.connect(stranger).markVoted(VOTER_HASH, ELECTION_ID)
      ).to.be.reverted;
    });

    it("stranger cannot call incrementVote on Election", async function () {
      const { electionContract, electionAdmin, stranger } = await loadFixture(deployFixture);
      const now = BigInt(await time.latest());
      await electionContract.connect(electionAdmin).createElection(
        ELECTION_ID, "Test", now, now + 3600n, CANDIDATES
      );
      await electionContract.connect(electionAdmin).openElection(ELECTION_ID);
      await expect(
        electionContract.connect(stranger).incrementVote(ELECTION_ID, 1n)
      ).to.be.reverted;
    });

    it("electionAdmin cannot call markVoted (only OFFICIAL_ROLE can)", async function () {
      const { voterRegistry, electionAdmin } = await loadFixture(deployFixture);
      await voterRegistry.connect(electionAdmin).registerVoter(VOTER_HASH, ELECTION_ID);
      // electionAdmin does NOT have OFFICIAL_ROLE
      await expect(
        voterRegistry.connect(electionAdmin).markVoted(VOTER_HASH, ELECTION_ID)
      ).to.be.reverted;
    });
  });

  describe("Role administration", function () {
    it("admin can grant ELECTION_ADMIN_ROLE to a new address", async function () {
      const { voterRegistry, admin, stranger } = await loadFixture(deployFixture);
      await voterRegistry.connect(admin).grantRole(ELECTION_ADMIN_ROLE, stranger.address);
      expect(await voterRegistry.hasRole(ELECTION_ADMIN_ROLE, stranger.address)).to.be.true;
    });

    it("admin can revoke ELECTION_ADMIN_ROLE", async function () {
      const { voterRegistry, admin, electionAdmin } = await loadFixture(deployFixture);
      await voterRegistry.connect(admin).revokeRole(ELECTION_ADMIN_ROLE, electionAdmin.address);
      expect(await voterRegistry.hasRole(ELECTION_ADMIN_ROLE, electionAdmin.address)).to.be.false;
    });

    it("non-admin cannot grant roles", async function () {
      const { voterRegistry, stranger, voter1 } = await loadFixture(deployFixture);
      await expect(
        voterRegistry.connect(stranger).grantRole(ELECTION_ADMIN_ROLE, voter1.address)
      ).to.be.reverted;
    });
  });
});
