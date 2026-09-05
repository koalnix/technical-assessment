// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title CertificateRegistry
/// @notice Issues and verifies student achievement certificates on-chain.
/// The certificate content itself lives off-chain (IPFS); this contract only
/// anchors a hash of that content plus its IPFS CID, so anyone can prove a
/// given certificate was issued by the school and has not been tampered with.
contract CertificateRegistry {
    struct Certificate {
        address student;
        string ipfsCid;
        uint256 issuedAt;
        address issuedBy;
        bool exists;
    }

    address public owner;

    // certHash => certificate record
    mapping(bytes32 => Certificate) private certificates;

    event CertificateIssued(
        bytes32 indexed certHash,
        address indexed student,
        string ipfsCid,
        uint256 issuedAt
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "CertificateRegistry: caller is not the owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Issue a new certificate. Only the registry owner (the school) may call this.
    /// @param student The wallet address of the student the certificate belongs to.
    /// @param certHash A unique hash identifying the certificate (e.g. keccak256 of its content).
    /// @param ipfsCid The IPFS CID where the full certificate metadata/document is stored.
    function issueCertificate(
        address student,
        bytes32 certHash,
        string calldata ipfsCid
    ) external onlyOwner {
        require(student != address(0), "CertificateRegistry: invalid student address");
        require(certHash != bytes32(0), "CertificateRegistry: invalid cert hash");
        require(!certificates[certHash].exists, "CertificateRegistry: certificate already issued");

        certificates[certHash] = Certificate({
            student: student,
            ipfsCid: ipfsCid,
            issuedAt: block.timestamp,
            issuedBy: msg.sender,
            exists: true
        });

        emit CertificateIssued(certHash, student, ipfsCid, block.timestamp);
    }

    /// @notice Verify a certificate by its hash.
    /// @return isValid Whether a certificate with this hash was ever issued.
    /// @return student The student the certificate was issued to.
    /// @return ipfsCid Where the certificate's full metadata lives on IPFS.
    /// @return issuedAt The block timestamp the certificate was issued at.
    function verifyCertificate(bytes32 certHash)
        external
        view
        returns (bool isValid, address student, string memory ipfsCid, uint256 issuedAt)
    {
        Certificate storage cert = certificates[certHash];
        return (cert.exists, cert.student, cert.ipfsCid, cert.issuedAt);
    }
}
