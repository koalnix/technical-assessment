import { api } from '@/api';
import { CertificateMetadata, PinMetadataResponse } from '../types/certificate-type';

export const certificatesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    pinCertificateMetadata: builder.mutation<PinMetadataResponse, CertificateMetadata>({
      query: (payload) => ({
        url: `/certificates/metadata`,
        method: 'POST',
        body: payload
      })
    }),
    getCertificateMetadata: builder.query<CertificateMetadata, string>({
      query: (cid) => `/certificates/metadata/${cid}`
    })
  })
});

export const { usePinCertificateMetadataMutation, useLazyGetCertificateMetadataQuery } =
  certificatesApi;
