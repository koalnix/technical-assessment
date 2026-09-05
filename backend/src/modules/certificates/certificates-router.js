const express = require("express");
const router = express.Router();
const certificatesController = require("./certificates-controller");

router.post("/metadata", certificatesController.handlePinCertificateMetadata);
router.get("/metadata/:cid", certificatesController.handleGetCertificateMetadata);

module.exports = { certificatesRoutes: router };
