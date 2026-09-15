// scripts/deploy.js
// Deploys VoterRegistry → Election → Ballot, wires roles, creates a sample
// election, and exports addresses + ABIs to the web layer.

const hre = require("hardhat");
const ethers = hre.ethers;
const path = require("path");
const fs = require("fs");

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolve the path to the web/contracts directory, creating it if needed.
 * Resolves relative to this script: <repo-root>/web/contracts/
 */
function webContractsDir() {
  const dir = path.resolve(__dirname, "../../web/contracts");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Copy an ABI JSON from Hardhat artifacts to the web layer.
 */
function copyAbi(contractName, abiDir) {
  const artifactPath = path.join(
    __dirname,
    `../artifacts/contracts/${contractName}.sol/${contractName}.json`
  );
  if (!fs.existsSync(artifactPath)) {
    console.warn(`  [warn] Artifact not found: ${artifactPath}`);
    return;
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const destPath = path.join(abiDir, `${contractName}.json`);
  fs.writeFileSync(destPath, JSON.stringify(artifact.abi, null, 2), "utf8");
  console.log(`  ABI exported → ${destPath}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("\n=== Smart Voting System — Deployment ===");
  console.log(`Network  : ${hre.network.name}`);
  console.log(`Deployer : ${deployer.address}`);
  console.log(`Balance  : ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH\n`);

  // ── 1. Deploy VoterRegistry ──────────────────────────────────────────────
  console.log("1/3  Deploying VoterRegistry...");
  const VoterRegistry = await ethers.getContractFactory("VoterRegistry");
  const voterRegistry = await VoterRegistry.deploy(deployer.address);
  await voterRegistry.waitForDeployment();
  const voterRegistryAddr = await voterRegistry.getAddress();
  console.log(`     VoterRegistry → ${voterRegistryAddr}`);

  // ── 2. Deploy Election ───────────────────────────────────────────────────
  console.log("2/3  Deploying Election...");
  const ElectionFactory = await ethers.getContractFactory("Election");
  const electionContract = await ElectionFactory.deploy(deployer.address);
  await electionContract.waitForDeployment();
  const electionAddr = await electionContract.getAddress();
  console.log(`     Election       → ${electionAddr}`);

  // ── 3. Deploy Ballot ─────────────────────────────────────────────────────
  console.log("3/3  Deploying Ballot...");
  const BallotFactory = await ethers.getContractFactory("Ballot");
  const ballot = await BallotFactory.deploy(deployer.address, voterRegistryAddr, electionAddr);
  await ballot.waitForDeployment();
  const ballotAddr = await ballot.getAddress();
  console.log(`     Ballot         → ${ballotAddr}\n`);

  // ── 4. Wire roles ────────────────────────────────────────────────────────
  console.log("Granting OFFICIAL_ROLE to Ballot on VoterRegistry and Election...");
  const OFFICIAL_ROLE = ethers.keccak256(ethers.toUtf8Bytes("OFFICIAL_ROLE"));

  let tx = await voterRegistry.grantRole(OFFICIAL_ROLE, ballotAddr);
  await tx.wait();
  console.log("  VoterRegistry: OFFICIAL_ROLE → Ballot ✓");

  tx = await electionContract.grantRole(OFFICIAL_ROLE, ballotAddr);
  await tx.wait();
  console.log("  Election:      OFFICIAL_ROLE → Ballot ✓\n");

  // Confirm deployer already holds ELECTION_ADMIN_ROLE (granted in constructors)
  const ELECTION_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ELECTION_ADMIN_ROLE"));
  const hasAdminRole = await electionContract.hasRole(ELECTION_ADMIN_ROLE, deployer.address);
  console.log(`Deployer has ELECTION_ADMIN_ROLE on Election: ${hasAdminRole}`);

  // ── 5. Create sample election ────────────────────────────────────────────
  console.log("\nCreating sample election...");
  const electionId = ethers.keccak256(ethers.toUtf8Bytes("election-2024"));
  const now = BigInt(Math.floor(Date.now() / 1000));
  const startTime = now;                           // starts immediately
  const endTime = now + BigInt(7 * 24 * 60 * 60); // 7 days from now
  const candidates = ["Aromal", "Irshad", "Manikandan"];
  const electionTitle = "CM Election 2026";

  tx = await electionContract.createElection(
    electionId,
    electionTitle,
    startTime,
    endTime,
    candidates
  );
  await tx.wait();
  console.log(`  Election created  : "${electionTitle}"`);
  console.log(`  Election ID       : ${electionId}`);
  console.log(`  Candidates        : ${candidates.join(", ")}`);
  console.log(`  Start             : ${new Date(Number(startTime) * 1000).toISOString()}`);
  console.log(`  End               : ${new Date(Number(endTime) * 1000).toISOString()}`);

  // Open the election immediately (startTime == now so the check passes)
  tx = await electionContract.openElection(electionId);
  await tx.wait();
  console.log("  Election opened ✓\n");

  // ── 6. Export addresses ──────────────────────────────────────────────────
  const webDir = webContractsDir();
  const abiDir = path.join(webDir, "abis");
  fs.mkdirSync(abiDir, { recursive: true });

  const addresses = {
    network: hre.network.name,
    chainId: 31337,
    deployedAt: new Date().toISOString(),
    VoterRegistry: voterRegistryAddr,
    Election: electionAddr,
    Ballot: ballotAddr,
    sampleElection: {
      id: electionId,
      title: electionTitle,
      candidates,
      startTime: startTime.toString(),
      endTime: endTime.toString(),
    },
  };

  const addrFile = path.join(webDir, "deployed-addresses.json");
  fs.writeFileSync(addrFile, JSON.stringify(addresses, null, 2), "utf8");
  console.log(`Addresses saved → ${addrFile}`);

  // ── 7. Export ABIs ───────────────────────────────────────────────────────
  console.log("Exporting ABIs...");
  copyAbi("VoterRegistry", abiDir);
  copyAbi("Election", abiDir);
  copyAbi("Ballot", abiDir);

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log("\n=== Deployment Complete ===");
  console.log(`  VoterRegistry : ${voterRegistryAddr}`);
  console.log(`  Election      : ${electionAddr}`);
  console.log(`  Ballot        : ${ballotAddr}`);
  console.log("===========================\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
