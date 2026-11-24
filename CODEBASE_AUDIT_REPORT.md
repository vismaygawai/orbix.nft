# ORBIX.NFT — Codebase Audit & Security Remediation Report

- **Project:** ORBIX.NFT
- **Repository:** https://github.com/vismaygawai/orbix.nft
- **Working Branch:** `security/professional-codebase-audit`
- **Sole Author & Maintainer:** Vismay
- **Audit Date:** November 25, 2026

---

## 1. Executive Summary

A full-stack security audit, architectural review, remediation, and documentation overhaul was completed on **ORBIX.NFT** on branch `security/professional-codebase-audit`.

ORBIX.NFT is a decentralized Aptos NFT marketplace and auction application built with React 19, TanStack Start (SSR), Vite 8, Tailwind CSS v4, Nitro, and an Aptos Move smart contract (`contracts/sources/NFTMarketplace.move`). There is no standalone backend database; marketplace state and escrow reside on-chain in Move resources, supplemented by a local curated hero showcase (`Orby`, `Orix`, `Orbix`) persisted in browser `localStorage`.

Key outcomes of this engagement:
- **Critical & High Findings Remediated:** Fixed a media URI scheme bypass in `resolveMediaUrl`, enforced strict network-mismatch transaction blocking in `useMarketplaceTx`, prevented off-chain curated showcase IDs from colliding with on-chain Move contract calls in `NFTCard`, added strict hex validation to `normalizeAddress`, added `localStorage` schema validation in `curatedNFTs.ts`, and hardened `NFTMarketplace.move` with missing `offer` bounds checks and duration caps.
- **Security Headers & Build Toolchain:** Removed the third-party `@lovable.dev/vite-tanstack-config` build wrapper in favor of official Vite, TanStack Start, and Nitro plugins; added `Content-Security-Policy` and `Strict-Transport-Security` headers across both `src/server.ts` and `vercel.json`.
- **Dependencies & Vulnerabilities:** Pruned 4 unused dependencies (`zod`, `@hookform/resolvers`, `date-fns`, `@tanstack/router-plugin`) and patched `vite` (`8.1.5` -> `8.1.7`), reducing `pnpm audit` findings from **9 (3 high, 5 moderate, 1 low)** to **3 transitive advisories (1 high, 2 moderate, 0 low)**.
- **Tests & Build:** Fixed the Vitest `localStorage` test failure under Node 26 + `jsdom` 20, expanded unit test coverage to **23/23 passing tests** across 4 test files, and verified `pnpm lint`, `npx tsc --noEmit`, and `pnpm build` all succeed.
- **Authorship & Documentation:** Standardized project authorship and maintenance attribution to **Vismay** and rewrote `README.md` against the verified codebase.

---

## 2. Repository Structure

```text
orbix.nft/
├── .github/workflows/ci.yml
├── bin/
│   ├── README.md
│   └── routes-README.md
├── contracts/
│   ├── Move.toml
│   └── sources/NFTMarketplace.move
├── public/
│   ├── Aptos_Primary_WHT.png
│   ├── favicon.ico
│   ├── robots.txt
│   └── videos/ (*.mp4, *_poster.webp)
├── src/
│   ├── components/
│   │   ├── marketplace/ (AuctionCard, CreateAuctionModal, LazyMedia, ListNFTModal, MakeOfferModal, MintNFTModal, NFTCard, OffersModal, TransferNFTModal)
│   │   ├── ui/ (Radix UI + Tailwind primitives)
│   │   ├── wallet/ (AptosWalletProvider, WalletButton)
│   │   ├── Footer.tsx
│   │   └── NavBar.tsx
│   ├── hooks/ (useMarketplaceTx, use-mobile)
│   ├── lib/ (aptosClient, curatedNFTs, error-capture, error-page, utils)
│   ├── routes/ (__root, index, market, my-nfts, analytics, royalties)
│   ├── test/ (setup, app-routing.test, aptosClient.test, curatedNFTs.test, useMarketplaceTx.test)
│   ├── types/marketplace.ts
│   ├── routeTree.gen.ts (auto-generated)
│   ├── router.tsx
│   ├── server.ts
│   ├── start.ts
│   └── styles.css
├── .env.example
├── .gitignore
├── .prettierignore
├── .prettierrc
├── components.json
├── eslint.config.js
├── package.json
├── pnpm-lock.yaml
├── README.md
├── tsconfig.json
├── vercel.json
├── vite.config.ts
└── vitest.config.ts
```

---

## 3. Files Inspected

| File Path | Purpose | Inspection | Issues Found | Remediation | Verification |
|---|---|---|---|---|---|
| `contracts/Move.toml` | Move package manifest & address binding | Reviewed | None (uses Aptos git main rev) | Preserved | Not compiled (`aptos` CLI absent) |
| `contracts/sources/NFTMarketplace.move` | On-chain NFT marketplace, auctions, offers, royalties | Reviewed | Unbounded auction/offer duration; missing `table::contains` / bounds checks in `cancel_offer` & `reject_offer`; linear vector scans | Added `MAX_AUCTION_DURATION`, `MAX_OFFER_DURATION`, missing assertions, and unit tests; vector architecture documented | `NOT EXECUTED` (`aptos` CLI absent) |
| `src/lib/aptosClient.ts` | Aptos RPC client, unit math, URI/address helpers, Move error map | Reviewed | `resolveMediaUrl` returned unsafe schemes verbatim; `normalizeAddress` accepted non-hex; unvalidated env vars; duplicate `PETRA_SELLER_WALLET` | Enforced strict URL/IPFS/path sanitization, hex address validation, env validation, `aptToOctas` safe int cap | `PASSED` (`aptosClient.test.ts`, `tsc`, `lint`) |
| `src/lib/curatedNFTs.ts` | Curated hero NFT registry & localStorage persistence | Reviewed | Unvalidated `localStorage` JSON casts; Node 26 `localStorage` crash; duplicate seller constant | Added `getSafeStorage`, strict schema validation, `getValidatedSalesHistory`, `onChain: false` tag | `PASSED` (`curatedNFTs.test.ts`, `tsc`, `lint`) |
| `src/lib/error-capture.ts` | Server error capture for Nitro/h3 SSR | Reviewed | None | Preserved | `PASSED` (`tsc`, `build`) |
| `src/lib/error-page.ts` | Fallback 500 HTML page | Reviewed | Off-brand light theme styling | Updated to Orbix dark theme | `PASSED` (`tsc`, `build`) |
| `src/lib/utils.ts` | `cn()` Tailwind class helper | Reviewed | None | Preserved | `PASSED` (`tsc`, `lint`) |
| `src/hooks/useMarketplaceTx.ts` | Wallet transaction submission & confirmation hook | Reviewed | Network mismatch only logged `console.warn` instead of blocking tx | Enforced network mismatch blocking & payload function check | `PASSED` (`useMarketplaceTx.test.tsx`, `tsc`, `lint`) |
| `src/hooks/use-mobile.tsx` | Mobile viewport media query hook | Reviewed | None | Preserved | `PASSED` (`tsc`, `lint`) |
| `src/components/wallet/AptosWalletProvider.tsx` | SSR-safe wallet adapter provider | Reviewed | None | Preserved | `PASSED` (`tsc`, `lint`) |
| `src/components/wallet/WalletButton.tsx` | Wallet connect modal, Google Keyless, account dropdown | Reviewed | `wallet.url` opened without `https:` validation; `rel="noreferrer"` | Validated `https:` protocol before `window.open`; updated to `rel="noopener noreferrer"` | `PASSED` (`tsc`, `lint`) |
| `src/components/NavBar.tsx` | Header navigation & mint trigger | Reviewed | None | Preserved | `PASSED` (`tsc`, `lint`) |
| `src/components/Footer.tsx` | Footer, contract copy, legal modals | Reviewed | `ORBIX STUDIO` / Devfolio links instead of Vismay & repo | Standardized authorship to Vismay, linked GitHub repo, `noopener noreferrer` | `PASSED` (`tsc`, `lint`) |
| `src/components/marketplace/NFTCard.tsx` | NFT display card & purchase/action triggers | Reviewed | Curated off-chain IDs could trigger on-chain `purchase_nft`/modals; duplicate `LazyCardMedia` + Unsplash fallback; double event dispatch | Gated on-chain actions on `nft.onChain !== false`, canonical curated price validation, extracted `LazyMedia`, removed double event | `PASSED` (`tsc`, `lint`) |
| `src/components/marketplace/AuctionCard.tsx` | Live auction card & bidding form | Reviewed | Floating-point `minBidApt` rounding edge case; duplicate media component; double event dispatch | Switched to `BigInt` Octas bid validation, shared `LazyMedia`, removed double event | `PASSED` (`tsc`, `lint`) |
| `src/components/marketplace/CreateAuctionModal.tsx` | Auction creation modal | Reviewed | None | Preserved | `PASSED` (`tsc`, `lint`) |
| `src/components/marketplace/ListNFTModal.tsx` | Listing / delisting modal | Reviewed | None | Preserved | `PASSED` (`tsc`, `lint`) |
| `src/components/marketplace/MakeOfferModal.tsx` | Escrowed offer submission modal | Reviewed | None | Preserved | `PASSED` (`tsc`, `lint`) |
| `src/components/marketplace/MintNFTModal.tsx` | Minting modal | Reviewed | Redundant `orbix:nft-updated` dispatch | Removed redundant dispatch | `PASSED` (`tsc`, `lint`) |
| `src/components/marketplace/OffersModal.tsx` | Offer review / accept / reject / cancel modal | Reviewed | None | Preserved | `PASSED` (`tsc`, `lint`) |
| `src/components/marketplace/TransferNFTModal.tsx` | Direct NFT transfer modal | Reviewed | Redundant `orbix:nft-updated` dispatch | Removed redundant dispatch | `PASSED` (`tsc`, `lint`) |
| `src/routes/__root.tsx` | Root HTML shell, providers, error boundary | Reviewed | `syncLedgerTime()` never invoked; missing author meta | Added `syncLedgerTime()` mount effect and `<meta name="author" content="Vismay">` | `PASSED` (`app-routing.test.tsx`, `build`) |
| `src/routes/index.tsx` | Landing page | Reviewed | `rel="noreferrer"` on social links | Updated to `rel="noopener noreferrer"` | `PASSED` (`tsc`, `lint`) |
| `src/routes/market.tsx` | Marketplace & auction discovery | Reviewed | Missing `onChain: true` tag on RPC-loaded NFTs | Added `onChain: true` tagging | `PASSED` (`tsc`, `lint`) |
| `src/routes/my-nfts.tsx` | Portfolio, incoming & outgoing offers | Reviewed | Queried on-chain offers for off-chain curated items; missing `onChain: true` tag | Filtered offer queries to `onChain !== false` and tagged `onChain: true` | `PASSED` (`tsc`, `lint`) |
| `src/routes/analytics.tsx` | Analytics KPIs & Recharts charts | Reviewed | Rarity sales inflated from unsold curated items; swallowed RPC errors masked offline state; unvalidated `localStorage` | Fixed rarity aggregation, tracked RPC failures, used `getValidatedSalesHistory()` | `PASSED` (`tsc`, `lint`) |
| `src/routes/royalties.tsx` | Creator royalty rate configuration | Reviewed | None | Preserved | `PASSED` (`tsc`, `lint`) |
| `src/server.ts` & `src/start.ts` | SSR entry & CSRF/error middleware | Reviewed | Missing HTTP security headers in Nitro SSR responses | Added `withSecurityHeaders` (`CSP`, `HSTS`, `X-Frame-Options`, etc.) in `src/server.ts` | `PASSED` (`tsc`, `build`) |
| `src/types/marketplace.ts` | Domain TypeScript interfaces | Reviewed | Needed `onChain?: boolean` discriminator | Added `onChain?: boolean \| undefined` | `PASSED` (`tsc`, `lint`) |
| `src/components/ui/*` | Radix/shadcn UI primitives (`chart.tsx` scanned) | Reviewed | `chart.tsx` is unused and uses standard `<style dangerouslySetInnerHTML>` for theme vars | Left standard UI primitives intact; noted unused `chart.tsx` | `PASSED` (`tsc`, `lint`) |
| `vite.config.ts`, `vercel.json`, `package.json` | Build, deploy headers, dependencies | Reviewed | Lovable config wrapper, 9 dependency advisories, missing CSP/HSTS, missing author metadata | Replaced wrapper with native plugins, upgraded Vite (`8.1.7`), pruned unused deps, added CSP/HSTS, set author to Vismay | `PASSED` (`build`, `pnpm audit`) |
| `README.md`, `.env.example`, `.github/workflows/ci.yml`, `vitest.config.ts`, `tsconfig.json`, `eslint.config.js` | Documentation, CI, tooling configs | Reviewed | Outdated hackathon/team attribution in `README.md` | Rewrote `README.md` accurately under Vismay | `PASSED` (validated against source) |

*(Vendor/generated artifacts `node_modules/`, `pnpm-lock.yaml`, `src/routeTree.gen.ts`, `.output/`, and static media in `public/videos/` were classified appropriately and not manually edited except regenerating `pnpm-lock.yaml` via `pnpm install`.)*

---

## 4. Files Modified & Created

**Modified (26 files):**
- `contracts/sources/NFTMarketplace.move`
- `src/lib/aptosClient.ts`
- `src/lib/curatedNFTs.ts`
- `src/lib/error-page.ts`
- `src/hooks/useMarketplaceTx.ts`
- `src/types/marketplace.ts`
- `src/components/Footer.tsx`
- `src/components/wallet/WalletButton.tsx`
- `src/components/marketplace/NFTCard.tsx`
- `src/components/marketplace/AuctionCard.tsx`
- `src/components/marketplace/MintNFTModal.tsx`
- `src/components/marketplace/TransferNFTModal.tsx`
- `src/routes/__root.tsx`
- `src/routes/index.tsx`
- `src/routes/market.tsx`
- `src/routes/my-nfts.tsx`
- `src/routes/analytics.tsx`
- `src/server.ts`
- `src/test/setup.ts`
- `src/test/aptosClient.test.ts`
- `src/test/curatedNFTs.test.ts`
- `vite.config.ts`
- `vercel.json`
- `package.json`
- `pnpm-lock.yaml`
- `README.md`

**Created (3 files):**
- `src/components/marketplace/LazyMedia.tsx`
- `src/test/useMarketplaceTx.test.tsx`
- `CODEBASE_AUDIT_REPORT.md`

---

## 5. Security Methodology

The audit combined manual line-by-line static review, threat modeling across Web2 and Web3 boundaries, dependency vulnerability scanning (`pnpm audit`), static type/lint verification (`tsc --noEmit`, `eslint`), and automated unit/hook testing (`vitest`):
1. **OWASP Top 10 / ASVS Controls:** Input validation, XSS/scheme injection, CSRF protection, clickjacking, HTTP security headers, open redirect / tabnabbing, and secret scanning.
2. **Aptos & Web3 Security:** Wallet network alignment, address canonicalization, Octas integer precision, Move arithmetic/overflow/access control/escrow accounting, and off-chain vs. on-chain state separation.
3. **Supply Chain & Build Hygiene:** Dependency pruning, lockfile verification, and removal of non-standard third-party build proxies.

---

## 6. Security Vulnerabilities Discovered & Severity Classification

| ID | Severity | Finding | Location | Status |
|---|---|---|---|---|
| SEC-01 | **HIGH** | `resolveMediaUrl` returned unrecognized/dangerous URI schemes (e.g. `javascript:`, `data:`) verbatim instead of stripping them, creating an XSS vector from on-chain metadata. | `src/lib/aptosClient.ts` | **FIXED** |
| SEC-02 | **HIGH** | `useMarketplaceTx` only logged a console warning on wallet network mismatch (e.g. Mainnet wallet vs. Devnet app), allowing accidental real-funds signing. | `src/hooks/useMarketplaceTx.ts` | **FIXED** |
| SEC-03 | **HIGH** | Off-chain curated showcase NFTs shared numeric IDs (`1`, `2`, `3`) with potential on-chain tokens without an `onChain` discriminator, risking unintended `purchase_nft` or modal calls against unrelated on-chain NFTs. | `src/components/marketplace/NFTCard.tsx`, `market.tsx`, `my-nfts.tsx` | **FIXED** |
| SEC-04 | **HIGH** | Unvalidated `localStorage` JSON parsing in `curatedNFTs.ts` and `analytics.tsx` allowed tampered prices, invalid addresses, or malicious URIs to flow into UI/transactions. | `src/lib/curatedNFTs.ts`, `src/routes/analytics.tsx` | **FIXED** |
| SEC-05 | **HIGH** | Dependency vulnerabilities in `vite` (<=8.1.5), `zod` (<4.6.6), and transitive `follow-redirects` (<=1.16.1). | `package.json`, `pnpm-lock.yaml` | **PARTIALLY FIXED** (`vite` & `zod` resolved; transitive `follow-redirects` remains in Aptos Connect SDK) |
| SEC-06 | **MEDIUM** | `NFTMarketplace.move` lacked upper bounds on auction/offer duration (allowing near-permanent NFT lockup) and lacked `ENFT_NOT_FOUND` / `EOFFER_NOT_FOUND` assertions before table/vector indexing in `cancel_offer` and `reject_offer`. | `contracts/sources/NFTMarketplace.move` | **FIXED** (source updated; Move compilation unverified locally) |
| SEC-07 | **MEDIUM** | `normalizeAddress` accepted arbitrary non-hex strings (e.g. `"[object Object]"`), producing corrupt padded strings instead of rejecting invalid addresses. | `src/lib/aptosClient.ts` | **FIXED** |
| SEC-08 | **MEDIUM** | Missing `Content-Security-Policy` and `Strict-Transport-Security` headers in `vercel.json`, and no HTTP security headers applied by `src/server.ts` for Node/Nitro deployments. | `src/server.ts`, `vercel.json` | **FIXED** |
| SEC-09 | **MEDIUM** | `WalletButton` opened `wallet.url` without verifying `https:` scheme, and external links used `rel="noreferrer"` without explicit `noopener`. | `src/components/wallet/WalletButton.tsx`, `Footer.tsx`, `index.tsx` | **FIXED** |
| SEC-10 | **MEDIUM** | `syncLedgerTime()` was implemented in `aptosClient.ts` but never invoked on app mount, leaving auction/offer expiration checks vulnerable to local client clock drift. | `src/routes/__root.tsx` | **FIXED** |
| SEC-11 | **LOW** | `AuctionCard` computed `minBidApt` using `toFixed(4)` float arithmetic, which could round below 8-decimal Octas bids; analytics rarity breakdown inflated unsold curated items as sales. | `src/components/marketplace/AuctionCard.tsx`, `src/routes/analytics.tsx` | **FIXED** |
| SEC-12 | **INFORMATIONAL** | Unbounded `vector` growth in `NFTMarketplace.move` (`nfts`, `auctions`, `sales_history`) and `coin::transfer` requiring `CoinStore<AptosCoin>` registration on recipients. | `contracts/sources/NFTMarketplace.move` | **DOCUMENTED** (preserving ABI/storage layout) |

---

## 7. Vulnerabilities Fixed (Summary)

- **SEC-01:** Rewrote `sanitizeMediaUri` and `resolveMediaUrl` in `src/lib/aptosClient.ts` to validate control characters, whitespace, `..` traversal, embedded URL credentials, `ipfs://` CIDs/paths, and `https://` protocol, returning `""` for anything else.
- **SEC-02:** Updated `useMarketplaceTx` to abort and display an error toast whenever `network?.name` does not match `APTOS_NETWORK`.
- **SEC-03 & SEC-04:** Added `onChain?: boolean` to `NFT`, tagged RPC results `onChain: true` and curated items `onChain: false`, validated `localStorage` schemas and canonical hero prices, and disabled contract-only modals for off-chain showcase items.
- **SEC-06:** Added `MAX_AUCTION_DURATION`, `MAX_OFFER_DURATION`, and explicit `ENFT_NOT_FOUND` / `EOFFER_NOT_FOUND` assertions in `cancel_offer` and `reject_offer`, plus unit tests in `NFTMarketplace.move`.
- **SEC-07:** Enforced `/^[0-9a-f]{1,64}$/` hex validation in `normalizeAddress` and added `isValidAptosAddress`.
- **SEC-08:** Added `CSP`, `HSTS`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy` to both `src/server.ts` and `vercel.json`.
- **SEC-09 & SEC-10:** Enforced `https:` URL validation in `WalletButton.tsx`, `noopener noreferrer` on external links, and `syncLedgerTime()` on mount in `src/routes/__root.tsx`.
- **SEC-11:** Switched `AuctionCard` min-bid checks to `aptToOctasBigInt` against `BigInt(current_bid) + 1n` and fixed `analytics.tsx` rarity aggregation.

---

## 8. Remaining Security Risks

1. **Transitive Dependencies (`pnpm audit`):**
   - **HIGH:** `follow-redirects` (`>=1.16.0 <=1.16.1`, GHSA-mrwp-f3q8-3g9p) via `@aptos-connect/wallet-adapter-plugin` -> `@aptos-labs/ts-sdk` -> `axios`.
   - **MODERATE:** `uuid` (`<11.1.1`, GHSA-w5hq-g745-h8pq) via `@aptos-connect/wallet-adapter-plugin` -> `@identity-connect/dapp-sdk`.
   - **MODERATE:** `minimatch` (`>=7.0.0 <11.0.1`, GHSA-g3hv-75wg-m249) via `typescript-eslint` (dev-only).
   Resolving the Aptos Connect transitive advisories requires upgrading `@aptos-labs/wallet-adapter-react` / `@aptos-connect/wallet-adapter-plugin` / `aptos` to the newer `@aptos-labs/ts-sdk` major line, which requires full wallet integration testing.
2. **CSP `'unsafe-inline'`:** `script-src 'self' 'unsafe-inline'` is currently required because TanStack Start SSR emits inline hydration/manifest scripts without per-request nonces.
3. **Uncompiled Move Changes:** Modifications to `contracts/sources/NFTMarketplace.move` have not been compiled or executed locally because the `aptos` CLI is not installed in this environment, and the live Devnet contract at `0x4bee16...` retains its previously deployed bytecode until explicitly redeployed by the maintainer.
4. **Move Vector Scaling & CoinStore Assumption:** Long-term on-chain growth of `Marketplace.nfts` and `Marketplace.auctions` increases gas cost for linear view/entry scans (`get_user_offers`, `has_active_auction`).

---

## 9. Blockchain, Smart Contract, Wallet & Marketplace Improvements

- **Blockchain & Contract (`NFTMarketplace.move`, `aptosClient.ts`):** Added 30-day upper bounds for auctions and offers, standardized missing offer assertions, validated `VITE_APTOS_*` environment configuration at startup, and enforced safe `Number.MAX_SAFE_INTEGER` boundaries in `aptToOctas`.
- **Wallet Security (`useMarketplaceTx.ts`, `WalletButton.tsx`):** Enforced strict network matching before wallet signature prompts, validated payload structure, and validated external wallet installer URLs.
- **Marketplace Logic (`NFTCard.tsx`, `AuctionCard.tsx`, `my-nfts.tsx`, `analytics.tsx`):** Separated on-chain tokens from off-chain curated showcase items, eliminated duplicate `orbix:nft-updated` event storms, and fixed auction precision and analytics rarity reporting.

---

## 10. Frontend, Backend & Performance Improvements

- **Frontend:** Extracted shared `src/components/marketplace/LazyMedia.tsx` to eliminate duplicate IntersectionObserver media code between `NFTCard` and `AuctionCard`, and replaced the external Unsplash fallback image with local `/videos/nft1_poster.webp`.
- **Backend / SSR (`src/server.ts`, `src/lib/error-page.ts`):** Added `withSecurityHeaders` for Nitro SSR responses and aligned the fallback 500 error page with the dark Orbix palette.
- **Performance:** Removed redundant `orbix:nft-updated` dispatches across 4 transaction components and skipped `get_offers_for_nft` RPC calls for off-chain showcase NFTs in `my-nfts.tsx`.

---

## 11. Dependency & Build Changes

- **Removed `@lovable.dev/vite-tanstack-config` (`2.26.5`):** Replaced with direct configuration of `@tanstack/react-start/plugin/vite`, `nitro/vite`, `@tailwindcss/vite`, `vite-tsconfig-paths`, and `@vitejs/plugin-react` in `vite.config.ts`.
- **Removed unused dependencies:** `zod`, `@hookform/resolvers`, `date-fns`, `@tanstack/router-plugin`.
- **Patched `vite`:** Updated `8.1.5` -> `8.1.7` (resolving 5 Vite advisories: 1 high, 3 moderate, 1 low).
- **Secrets Scan:** Verified no private keys, mnemonics, or API secrets are committed in source or `.env.example`.

---

## 12. README & Authorship Standardization

- Rewrote `README.md` completely to reflect actual verified routes, Move functions, scripts, environment variables, security practices, and known limitations.
- Standardized sole authorship and maintainer attribution to **Vismay** across `package.json`, `README.md`, `src/routes/__root.tsx`, and `src/components/Footer.tsx`, removing third-party template/hackathon/AI-builder references while preserving third-party open-source package licenses.

---

## 13. Tests Executed, Actual Results & Production Build Verification

| Check | Command | Status | Actual Observed Result |
|---|---|---|---|
| ESLint + Prettier | `pnpm lint` | **PASSED** | Exit code 0 across all `.ts`/`.tsx` files |
| TypeScript Typecheck | `npx tsc --noEmit` | **PASSED** | Exit code 0, zero type errors |
| Unit & Routing Tests | `pnpm test` (`vitest run`) | **PASSED** | 4 test files passed, **23/23 tests passed** (`aptosClient.test.ts`: 13, `curatedNFTs.test.ts`: 7, `useMarketplaceTx.test.tsx`: 2, `app-routing.test.tsx`: 1) |
| Production Build | `pnpm build` (`vite build`) | **PASSED** | Client built in 1.93s (3,032 modules); SSR & Nitro `node-server` output generated in `.output/server/index.mjs` |
| Dependency Audit | `pnpm audit --audit-level=low` | **PASSED (WITH RESIDUALS)** | Reduced from 9 advisories to 3 transitive advisories (1 high, 2 moderate) |
| Move Contract Tests | `aptos move test` | **NOT EXECUTED / BLOCKED** | `aptos` CLI is not installed in the workspace environment |
| Live On-Chain E2E Tx | Wallet signing on Devnet | **NOT EXECUTED** | Requires interactive browser wallet extension / Google Keyless login |

---

## 14. Recommended Next Steps

1. Run `cd contracts && aptos move test` in an environment with the Aptos CLI installed to verify the Move contract changes and new unit tests before any authorized redeployment.
2. Plan a controlled migration from legacy `aptos` (`v1.22.1`) and `@aptos-labs/wallet-adapter-react` (`v3.8.0`) to the current `@aptos-labs/ts-sdk` / wallet-adapter major release to eliminate the remaining transitive `follow-redirects` and `uuid` advisories.
3. Consider nonce-based CSP if TanStack Start SSR script nonces are introduced in future framework releases, and consider migrating `Marketplace.nfts` / `auctions` to `SmartTable` / `Table` in a future v2 Move module if collection scale grows substantially.
4. Review all changes on `security/professional-codebase-audit` before authorizing any merge into `main` or deployment.
