import { ethers, Contract } from "ethers";

let provider: ethers.JsonRpcProvider | null = null;

/**
 * Returns a singleton JsonRpcProvider connected to the Hardhat local node.
 */
export function getProvider(): ethers.JsonRpcProvider {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(
      process.env.HARDHAT_RPC_URL || "http://localhost:8545"
    );
  }
  return provider;
}

/**
 * Returns a Wallet (signer) connected to the provider.
 * Uses DEPLOYER_PRIVATE_KEY env var if no key is supplied.
 */
export function getSigner(privateKey?: string): ethers.Wallet {
  // Hardhat Account #0 default dev private key
  const defaultDevKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  const pk = privateKey || process.env.DEPLOYER_PRIVATE_KEY || defaultDevKey;
  return new ethers.Wallet(pk, getProvider());
}

/**
 * Loads a deployed contract by name from the JSON artifacts.
 * deployed-addresses.json is populated by the Hardhat deploy script.
 */
export async function getContract(
  contractName: "VoterRegistry" | "Election" | "Ballot"
): Promise<Contract> {
  const addressesModule = await import("../contracts/deployed-addresses.json");
  const abiModule = await import(`../contracts/abis/${contractName}.json`);
  const addresses = (addressesModule.default || addressesModule) as Record<string, any>;
  const abi = abiModule.default || abiModule;
  const signer = getSigner();
  const address = addresses[contractName];
  if (!address) {
    throw new Error(
      `Contract address for "${contractName}" not found. Did you run the deploy script?`
    );
  }
  return new Contract(address, abi, signer);
}

export async function getBallotContract(): Promise<Contract> {
  return getContract("Ballot");
}

export async function getElectionContract(): Promise<Contract> {
  return getContract("Election");
}

export async function getVoterRegistryContract(): Promise<Contract> {
  return getContract("VoterRegistry");
}

/**
 * Computes a deterministic keccak256 hash of a voter ID + salt.
 * Used to link off-chain voter records to on-chain commitments without
 * exposing the raw voter ID.
 */
export function hashVoterId(voterId: string, salt: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(voterId + salt));
}

/**
 * Converts an election slug string to a bytes32-compatible keccak256 hash
 * for use as the on-chain election identifier.
 */
export function toElectionId(electionSlug: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(electionSlug));
}
