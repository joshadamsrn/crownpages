# Wallet Setup

The web save sheet now supports:

- Google Wallet save URL generation through `POST /api/wallet`
- Apple Wallet `.pkpass` generation through `POST /api/wallet`

Both flows are environment-driven. No credentials are committed in this repo.

## Env Vars

Copy the relevant values from `.env.wallet.example` into `.env.local`.

### Google Wallet

Required:

- `GOOGLE_WALLET_ISSUER_ID`
- `GOOGLE_WALLET_CLASS_ID`
- `GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_WALLET_SERVICE_ACCOUNT_PRIVATE_KEY`

Notes:

- The private key must preserve line breaks. In `.env.local`, use `\n` escaped newlines.
- `GOOGLE_WALLET_CLASS_ID` should be the full class id expected by Google Wallet.

### Apple Wallet

Required:

- `APPLE_WALLET_TEAM_IDENTIFIER`
- `APPLE_WALLET_PASS_TYPE_IDENTIFIER`
- `APPLE_WALLET_ORGANIZATION_NAME`
- `APPLE_WALLET_WWDR_CERT`
- `APPLE_WALLET_SIGNER_CERT`
- `APPLE_WALLET_SIGNER_KEY`

Optional:

- `APPLE_WALLET_SIGNER_KEY_PASSPHRASE`

Notes:

- The current implementation builds the pass package dynamically in [app/api/wallet/route.ts](../app/api/wallet/route.ts).
- Default icon/logo assets come from `public/lightlogo.png`.
- If the page logo or hero image is a PNG, the route will use it in the pass when possible.
- Cert and key values can be stored directly in env with `\n` escaped newlines.

## Current Behavior

### Android

If Google Wallet env vars are present:

- the save sheet calls `/api/wallet`
- the route returns a real Google Wallet save URL
- the browser is redirected into the Google Wallet flow

If env vars are missing:

- the UI falls back to the existing Crown Pages app wallet deep link

### iOS

If Apple Wallet env vars are present:

- the save sheet calls `/api/wallet`
- the route returns a signed `.pkpass`
- the browser opens the Apple Wallet add flow

If env vars are missing:

- the UI falls back to the existing Crown Pages app wallet deep link

## Testing

1. Add the wallet env vars to `.env.local`
2. Restart `npm run dev`
3. Open a public page on mobile or in the simulator
4. Tap `Save`
5. Tap the wallet row

## Important Limitation

This repo now contains the wallet plumbing, but it cannot generate live passes until real issuer credentials and Apple signing material are provided locally or in deployment env.
