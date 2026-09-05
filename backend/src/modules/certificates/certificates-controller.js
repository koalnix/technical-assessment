const asyncHandler = require("express-async-handler");
const { pinCertificateMetadata, getCertificateMetadata } = require("./certificates-service");

const handlePinCertificateMetadata = asyncHandler(async (req, res) => {
    const metadata = req.body;
    const result = await pinCertificateMetadata(metadata);
    res.json(result);
});

const handleGetCertificateMetadata = asyncHandler(async (req, res) => {
    const { cid } = req.params;
    const metadata = await getCertificateMetadata(cid);
    res.json(metadata);
});

module.exports = {
    handlePinCertificateMetadata,
    handleGetCertificateMetadata,
};
