import * as React from 'react';
import { Alert, Box, Button, Divider, Grid2, Paper, TextField, Typography } from '@mui/material';
import { VerifiedOutlined } from '@mui/icons-material';
import { BrowserProvider, Contract, JsonRpcProvider, Wallet, keccak256, toUtf8Bytes } from 'ethers';
import { toast } from 'react-toastify';

import { PageContentHeader } from '@/components/page-content-header';
import {
  CERTIFICATE_CONTRACT_ADDRESS,
  CERTIFICATE_REGISTRY_ABI,
  LOCAL_CHAIN_RPC_URL,
  LOCAL_DEV_PRIVATE_KEY
} from '../contract';
import { usePinCertificateMetadataMutation, useLazyGetCertificateMetadataQuery } from '../api/certificates-api';
import { CertificateMetadata, VerifyCertificateResult } from '../types/certificate-type';

const getInjectedProvider = () => (window as unknown as { ethereum?: unknown }).ethereum;

// Prefers a real wallet extension when one's installed; otherwise falls back
// to signing with the local chain's well-known dev account (see contract.ts)
// so the whole flow still works against the self-hosted Hardhat node.
const getSigner = async () => {
  const injected = getInjectedProvider();
  if (injected) {
    const provider = new BrowserProvider(injected as never);
    await provider.send('eth_requestAccounts', []);
    return provider.getSigner();
  }
  const provider = new JsonRpcProvider(LOCAL_CHAIN_RPC_URL);
  return new Wallet(LOCAL_DEV_PRIVATE_KEY, provider);
};

const getReadProvider = () => {
  const injected = getInjectedProvider();
  return injected ? new BrowserProvider(injected as never) : new JsonRpcProvider(LOCAL_CHAIN_RPC_URL);
};

const issueFormInitialState: CertificateMetadata = {
  studentName: '',
  studentAddress: '',
  title: '',
  description: '',
  issueDate: ''
};

export const CertificatesPage = () => {
  const [walletAddress, setWalletAddress] = React.useState<string>('');
  const [issueForm, setIssueForm] = React.useState<CertificateMetadata>(issueFormInitialState);
  const [lastIssuedHash, setLastIssuedHash] = React.useState<string>('');
  const [verifyHash, setVerifyHash] = React.useState<string>('');
  const [verifyResult, setVerifyResult] = React.useState<VerifyCertificateResult | null>(null);
  const [verifyMetadata, setVerifyMetadata] = React.useState<CertificateMetadata | null>(null);

  const [pinMetadata, { isLoading: isPinning }] = usePinCertificateMetadataMutation();
  const [fetchMetadata] = useLazyGetCertificateMetadataQuery();

  const connectWallet = async () => {
    const signer = await getSigner();
    setWalletAddress(await signer.getAddress());
  };

  const handleIssue = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!CERTIFICATE_CONTRACT_ADDRESS) {
      toast.error('VITE_CERTIFICATE_CONTRACT_ADDRESS is not set. Deploy the contract first.');
      return;
    }

    try {
      const { cid } = await pinMetadata(issueForm).unwrap();
      const certHash = keccak256(toUtf8Bytes(JSON.stringify(issueForm)));

      const signer = await getSigner();
      const contract = new Contract(CERTIFICATE_CONTRACT_ADDRESS, CERTIFICATE_REGISTRY_ABI, signer);

      const tx = await contract.issueCertificate(issueForm.studentAddress, certHash, cid);
      await tx.wait();

      setLastIssuedHash(certHash);
      toast.success('Certificate issued on-chain.');
      setIssueForm(issueFormInitialState);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to issue certificate.');
    }
  };

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    setVerifyResult(null);
    setVerifyMetadata(null);

    if (!CERTIFICATE_CONTRACT_ADDRESS) {
      toast.error('VITE_CERTIFICATE_CONTRACT_ADDRESS is not set. Deploy the contract first.');
      return;
    }

    try {
      // Read-only, so no signer needed - just a provider pointed at the chain.
      const provider = getReadProvider();
      const contract = new Contract(CERTIFICATE_CONTRACT_ADDRESS, CERTIFICATE_REGISTRY_ABI, provider);

      const [isValid, student, ipfsCid, issuedAt] = await contract.verifyCertificate(verifyHash);
      setVerifyResult({ isValid, student, ipfsCid, issuedAt });

      if (isValid && ipfsCid) {
        const metadata = await fetchMetadata(ipfsCid).unwrap();
        setVerifyMetadata(metadata);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to verify certificate.');
    }
  };

  return (
    <>
      <PageContentHeader icon={<VerifiedOutlined sx={{ mr: 1 }} />} heading='Certificates' />

      <Alert severity='info' sx={{ mb: 2 }}>
        Backed by a self-hosted local Hardhat chain (see <code>blockchain/</code>, brought up by{' '}
        <code>docker-compose</code>). If a wallet extension (MetaMask) is installed and connected to
        that chain, it's used to sign; otherwise this falls back to the chain's well-known local dev
        account, so issuing and verifying both work without installing one.
      </Alert>

      <Box sx={{ mb: 2 }}>
        <Button variant='outlined' onClick={connectWallet}>
          {walletAddress ? `Signer: ${walletAddress}` : 'Connect Wallet / Use Local Dev Account'}
        </Button>
      </Box>

      <Grid2 container spacing={2}>
        <Grid2 size={{ xs: 12, md: 6 }}>
          <Box component={Paper} sx={{ p: 2 }}>
            <Typography variant='h6' gutterBottom>
              Issue Certificate
            </Typography>
            <form onSubmit={handleIssue}>
              <TextField
                label='Student Name'
                fullWidth
                size='small'
                sx={{ mb: 2 }}
                value={issueForm.studentName}
                onChange={(e) => setIssueForm({ ...issueForm, studentName: e.target.value })}
                required
              />
              <TextField
                label='Student Wallet Address'
                fullWidth
                size='small'
                sx={{ mb: 2 }}
                value={issueForm.studentAddress}
                onChange={(e) => setIssueForm({ ...issueForm, studentAddress: e.target.value })}
                required
              />
              <TextField
                label='Achievement Title'
                fullWidth
                size='small'
                sx={{ mb: 2 }}
                value={issueForm.title}
                onChange={(e) => setIssueForm({ ...issueForm, title: e.target.value })}
                required
              />
              <TextField
                label='Description'
                fullWidth
                size='small'
                multiline
                minRows={2}
                sx={{ mb: 2 }}
                value={issueForm.description}
                onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })}
              />
              <TextField
                label='Issue Date'
                type='date'
                fullWidth
                size='small'
                sx={{ mb: 2 }}
                InputLabelProps={{ shrink: true }}
                value={issueForm.issueDate}
                onChange={(e) => setIssueForm({ ...issueForm, issueDate: e.target.value })}
                required
              />
              <Button type='submit' variant='contained' disabled={isPinning}>
                Issue Certificate
              </Button>
            </form>
            {lastIssuedHash && (
              <Alert severity='success' sx={{ mt: 2, wordBreak: 'break-all' }}>
                Issued. Certificate hash: {lastIssuedHash}
              </Alert>
            )}
          </Box>
        </Grid2>

        <Grid2 size={{ xs: 12, md: 6 }}>
          <Box component={Paper} sx={{ p: 2 }}>
            <Typography variant='h6' gutterBottom>
              Verify Certificate
            </Typography>
            <form onSubmit={handleVerify}>
              <TextField
                label='Certificate Hash'
                fullWidth
                size='small'
                sx={{ mb: 2 }}
                value={verifyHash}
                onChange={(e) => setVerifyHash(e.target.value)}
                required
              />
              <Button type='submit' variant='contained'>
                Verify
              </Button>
            </form>

            {verifyResult && (
              <Box sx={{ mt: 2 }}>
                <Divider sx={{ mb: 2 }} />
                <Alert severity={verifyResult.isValid ? 'success' : 'warning'} sx={{ mb: 2 }}>
                  {verifyResult.isValid ? 'Valid certificate.' : 'No certificate found for this hash.'}
                </Alert>
                {verifyResult.isValid && (
                  <>
                    <Typography variant='body2'>Student: {verifyResult.student}</Typography>
                    <Typography variant='body2'>IPFS CID: {verifyResult.ipfsCid}</Typography>
                    <Typography variant='body2'>
                      Issued At: {new Date(Number(verifyResult.issuedAt) * 1000).toLocaleString()}
                    </Typography>
                    {verifyMetadata && (
                      <>
                        <Typography variant='body2' sx={{ mt: 1 }}>
                          Title: {verifyMetadata.title}
                        </Typography>
                        <Typography variant='body2'>Description: {verifyMetadata.description}</Typography>
                      </>
                    )}
                  </>
                )}
              </Box>
            )}
          </Box>
        </Grid2>
      </Grid2>
    </>
  );
};

export default CertificatesPage;
