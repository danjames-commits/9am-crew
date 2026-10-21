// Supabase's public signing key, so checking a sign-in needs no network call
// on a cold start. Public by design (it only verifies). If the key is ever
// rotated, Supabase's client fetches the new one by itself.
export const SUPABASE_JWKS = {
  keys: [
    {
      alg: 'ES256',
      crv: 'P-256',
      ext: true,
      key_ops: ['verify'],
      kid: 'ea094d71-2551-4da7-b38b-bc47a62a0008',
      kty: 'EC',
      use: 'sig',
      x: '03phV2K8eg1tUoX1y7XXKZB-qk3nfpPMGqzDFYuV1lw',
      y: 'BYNjfSUk-LnIUKhHdGBvBHTJaN2MnaNV8macVpDPWj4',
    },
  ],
};
