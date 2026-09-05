# Blockchain (Problem 3) — Certificate verification

A self-contained Hardhat project implementing on-chain certificate issuance/verification
(`contracts/CertificateRegistry.sol`), separate from the main app's dependencies.

## Run it self-hosted (recommended — this is what `docker-compose up` does)

```bash
docker compose up blockchain
```

This runs `entrypoint.sh`, which starts a local Hardhat chain (JSON-RPC on `:8545`) and
deploys `CertificateRegistry` to it automatically. The deployed address is
**deterministic** — the deploy script is always the first transaction (nonce 0) from
Hardhat's fixed default account #0 on a fresh chain — so it's always
`0x5FbDB2315678afecb367f032d93F642f64180aa3`, already set as
`VITE_CERTIFICATE_CONTRACT_ADDRESS` in the frontend's Docker env and `.env.example`.

The frontend's Certificates page (`/certificates`) talks to this chain directly. If a
wallet extension (MetaMask) is installed and pointed at `http://localhost:8545`, it's used
to sign transactions; otherwise the page falls back to Hardhat's well-known local dev
account (private key `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
— publicly documented as test-only, zero value on any real network), so issuing and
verifying both work without installing a wallet.

## Run it manually instead

```bash
npm install
npx hardhat node                                  # terminal 1 - keep running
npx hardhat run scripts/deploy.js --network localhost   # terminal 2
```

## Tests

```bash
npx hardhat test
```

Covers: issue + verify round-trip, unissued hashes report as invalid, non-owner issue
reverts, duplicate hash issue reverts.

## IPFS metadata

Certificate metadata (student name, achievement, description) is "pinned" via the
backend's `/api/v1/certificates/metadata` endpoint. With no real IPFS API key available,
it defaults to a local mock CID store (`backend/src/data/mock-ipfs/`) behind the same
interface a real provider would use — set `IPFS_API_URL` on the backend to point at a real
Kubo/IPFS HTTP API instead, no frontend changes needed.
