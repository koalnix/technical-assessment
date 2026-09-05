export const CERTIFICATE_REGISTRY_ABI = [
  'function issueCertificate(address student, bytes32 certHash, string calldata ipfsCid) external',
  'function verifyCertificate(bytes32 certHash) external view returns (bool isValid, address student, string memory ipfsCid, uint256 issuedAt)',
  'event CertificateIssued(bytes32 indexed certHash, address indexed student, string ipfsCid, uint256 issuedAt)'
];

// Set by `docker-compose.yml` (or after running `blockchain/scripts/deploy.js`
// yourself). It's deterministic: the deploy script is always the first
// transaction (nonce 0) sent from Hardhat's fixed default account #0 on a
// fresh chain, so this address is the same on every run.
export const CERTIFICATE_CONTRACT_ADDRESS = import.meta.env.VITE_CERTIFICATE_CONTRACT_ADDRESS as
  | string
  | undefined;

export const LOCAL_CHAIN_RPC_URL =
  (import.meta.env.VITE_LOCAL_CHAIN_RPC_URL as string | undefined) || 'http://127.0.0.1:8545';

// Hardhat's default account #0 - a well-known, publicly documented test-only
// private key with zero value on any real network (Hardhat prints a warning
// about this on every `hardhat node` start). It's also the account the
// deploy script issues certificates from, so it's the registry's owner.
// Used only as a fallback signer against the local self-hosted chain when no
// wallet extension (MetaMask) is installed, so issuing/verifying can still be
// demoed end-to-end without one.
export const LOCAL_DEV_PRIVATE_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
