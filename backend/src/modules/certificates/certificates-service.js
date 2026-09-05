const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const axios = require("axios");
const { ApiError } = require("../../utils");

const MOCK_IPFS_DIR = path.join(__dirname, "..", "..", "data", "mock-ipfs");

// Certificate metadata storage. When IPFS_API_URL points at a real Kubo/IPFS
// HTTP API, the metadata is pinned there for real. Otherwise (no API key /
// no local daemon available) it falls back to a local, content-addressed
// JSON store with the same "give me a cid, hand me back metadata by cid"
// interface, so the rest of the app (and the demo) works the same either
// way. Swapping to a real provider (web3.storage/Pinata) later only means
// setting IPFS_API_URL - no calling code changes.
const pinCertificateMetadata = async (metadata) => {
    if (process.env.IPFS_API_URL) {
        return pinToRealIpfs(metadata);
    }
    return pinToMockStore(metadata);
};

const getCertificateMetadata = async (cid) => {
    if (cid.startsWith("mock-")) {
        return readFromMockStore(cid);
    }
    return fetchFromRealIpfs(cid);
};

const pinToRealIpfs = async (metadata) => {
    try {
        const { data } = await axios.post(
            `${process.env.IPFS_API_URL}/api/v0/add?pin=true`,
            JSON.stringify(metadata),
            { headers: { "Content-Type": "application/json" } }
        );
        return { cid: data.Hash };
    } catch (error) {
        throw new ApiError(502, "Unable to pin certificate metadata to IPFS");
    }
};

const pinToMockStore = async (metadata) => {
    const content = JSON.stringify(metadata);
    const hash = crypto.createHash("sha256").update(content).digest("hex").slice(0, 46);
    const cid = `mock-${hash}`;

    await fs.mkdir(MOCK_IPFS_DIR, { recursive: true });
    await fs.writeFile(path.join(MOCK_IPFS_DIR, `${cid}.json`), content, "utf-8");

    return { cid };
};

const readFromMockStore = async (cid) => {
    try {
        const content = await fs.readFile(path.join(MOCK_IPFS_DIR, `${cid}.json`), "utf-8");
        return JSON.parse(content);
    } catch (error) {
        throw new ApiError(404, "Certificate metadata not found");
    }
};

const fetchFromRealIpfs = async (cid) => {
    try {
        const { data } = await axios.get(`https://ipfs.io/ipfs/${cid}`);
        return data;
    } catch (error) {
        throw new ApiError(404, "Certificate metadata not found");
    }
};

module.exports = {
    pinCertificateMetadata,
    getCertificateMetadata,
};
