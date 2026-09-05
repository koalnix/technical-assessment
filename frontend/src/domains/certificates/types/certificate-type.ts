export type CertificateMetadata = {
  studentName: string;
  studentAddress: string;
  title: string;
  description: string;
  issueDate: string;
};

export type PinMetadataResponse = {
  cid: string;
};

export type VerifyCertificateResult = {
  isValid: boolean;
  student: string;
  ipfsCid: string;
  issuedAt: bigint;
};
