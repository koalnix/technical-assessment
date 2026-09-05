const { expect } = require("chai");
const { ethers } = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("CertificateRegistry", function () {
  async function deployFixture() {
    const [owner, student, other] = await ethers.getSigners();
    const CertificateRegistry = await ethers.getContractFactory("CertificateRegistry");
    const registry = await CertificateRegistry.deploy();
    await registry.waitForDeployment();
    return { registry, owner, student, other };
  }

  const certHash = ethers.keccak256(ethers.toUtf8Bytes("student-1-diploma-2026"));
  const ipfsCid = "bafybeigdyrztest examplecid";

  it("issues a certificate and lets anyone verify it", async function () {
    const { registry, student } = await deployFixture();

    await expect(registry.issueCertificate(student.address, certHash, ipfsCid))
      .to.emit(registry, "CertificateIssued")
      .withArgs(certHash, student.address, ipfsCid, anyValue);

    const [isValid, certStudent, cid] = await registry.verifyCertificate(certHash);
    expect(isValid).to.equal(true);
    expect(certStudent).to.equal(student.address);
    expect(cid).to.equal(ipfsCid);
  });

  it("reports unissued certificates as invalid", async function () {
    const { registry } = await deployFixture();
    const unknownHash = ethers.keccak256(ethers.toUtf8Bytes("never-issued"));

    const [isValid, certStudent] = await registry.verifyCertificate(unknownHash);
    expect(isValid).to.equal(false);
    expect(certStudent).to.equal(ethers.ZeroAddress);
  });

  it("reverts when a non-owner tries to issue a certificate", async function () {
    const { registry, student, other } = await deployFixture();

    await expect(
      registry.connect(other).issueCertificate(student.address, certHash, ipfsCid)
    ).to.be.revertedWith("CertificateRegistry: caller is not the owner");
  });

  it("reverts on duplicate certificate hashes", async function () {
    const { registry, student } = await deployFixture();

    await registry.issueCertificate(student.address, certHash, ipfsCid);

    await expect(
      registry.issueCertificate(student.address, certHash, ipfsCid)
    ).to.be.revertedWith("CertificateRegistry: certificate already issued");
  });
});
