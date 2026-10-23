# orbix.nft - Ocean NFT Marketplace on Aptos

> Submitted for Hack On Hills 7.0 by Team Photon
> Track: Build on Aptos
> Live Demo / Test Link: https://orbix-nft.vercel.app/

A decentralized Web3 ocean artifact marketplace and auction platform powered by Aptos Move smart contracts and a modern frontend stack built with React 19, TanStack Start (SSR), Vite 8, Tailwind CSS v4, and Nitro.

---

## Hackathon Submission

- Event: Hack On Hills 7.0
- Team: Team Photon
- Applied Track: Build on Aptos
- Devfolio Project: https://devfolio.co/projects/nft-digital-assets-marketplace-5e7c
- Live Test Link: https://orbix-nft.vercel.app/
- GitHub Repository: https://github.com/vismaygawai/orbix.nft
- Network: Aptos Devnet
- Smart Contract Module: NFTMarketplace.move (Address: 0x4bee16faf06f7ffb1968c3b7baad06a651a80de4e5a620be45aa45853d23f6fb)

---

## Overview

orbix.nft provides a complete, production-grade interface for minting, listing, bidding, purchasing, and managing digital collectibles on the Aptos blockchain. The application connects directly to verified Move smart contracts without intermediary centralized database dependencies.

Key highlights:

- Blockchain: Aptos Devnet (NFTMarketplace Move module deployed at 0x4bee16faf06f7ffb1968c3b7baad06a651a80de4e5a620be45aa45853d23f6fb)
- Wallet Authentication: Web3 social logins ("Continue with Google" via Aptos Connect / Keyless) and browser extension wallets (Petra, Pontem, Nightly, Martian)
- Frontend Framework: TanStack Start + Vite 8.1.5 + React 19.3.1 + TypeScript
- Styling: Tailwind CSS v4 with custom glassmorphism design tokens (liquid-glass, dark abyssal space palette, Anton typography, and Condiment script accents)
- Server & Deployment: Nitro multi-preset deployment engine (node-server for local/Docker hosting, native Vercel Build Output API v3 for Vercel deployment)

---

## Wallet Integration & Authentication

Orbix supports two distinct onboarding paths to ensure accessibility for both crypto-native users and newcomers:

1. Instant Social Login (Keyless):
   - Users can click "Continue with Google" to authenticate immediately via Aptos Connect.
   - Generates a secure, keyless Aptos account linked to their Google credentials without requiring seed phrase backups or browser extensions.
   - Supports transaction signing (minting, buying, bidding) directly in-app.

2. Browser Extension Wallets:
   - Native support for Petra Wallet (official Aptos wallet).
   - Dynamic AIP-62 wallet detection for Pontem, Nightly, and Martian extensions.
   - If an extension is not detected in the user's browser, the connection modal provides a direct installation link.

---

## Smart Contract Architecture (NFTMarketplace.move)

The Move smart contract operates directly on Aptos Devnet. All marketplace state (listings, auctions, offers, royalties) resides on-chain.

### Entry Functions (State Modifying)

| Function            | Description                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| mint_nft            | Registers a new ocean artifact with title, description, media URI, and rarity tier (1 to 4).     |
| list_for_sale       | Places an owned NFT up for direct purchase at a fixed price in Octas.                            |
| set_price           | Updates the asking price for an active direct listing.                                           |
| purchase_nft        | Settles purchase, deducting a 2% platform fee and creator royalty before transferring ownership. |
| create_auction      | Initializes an on-chain auction with starting price and expiration duration.                     |
| place_bid           | Submits an increased bid and automatically returns funds to the prior highest bidder.            |
| make_offer          | Submits a direct buyer offer with an expiration timestamp.                                       |
| accept_offer        | Seller accepts an active buyer offer, settling transfer and payment on-chain.                    |
| set_creator_royalty | Allows creators to define secondary sales royalty percentages (0% to 30%).                       |

### View Functions (Read Only)

| Function               | Description                                                                                        |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| get_all_nfts_for_sale  | Returns all fixed-price marketplace listings with pagination.                                      |
| get_nft_details        | Returns complete token metadata (owner, name, description, URI, price, rarity, status).            |
| get_active_auctions    | Returns all ongoing auctions with live expiration timestamps and leading bids.                     |
| get_all_nfts_for_owner | Queries all NFT IDs registered to a specific Aptos account address.                                |
| get_marketplace_stats  | Retrieves aggregate metrics including total volume in Octas, total sales count, and sales history. |
| get_sales_by_rarity    | Queries distribution of sales metrics segmented across the 4 rarity tiers.                         |

---

## Project Structure

```text
orbix.nft/
├── contracts/                        # Aptos Move smart contracts
│   ├── Move.toml                     # Move package manifest & named address bindings
│   └── sources/
│       └── NFTMarketplace.move       # Move contract implementation
├── public/                           # Static assets served at root
│   ├── videos/                       # Ocean video backgrounds & showcase media
│   │   ├── hero_video.mp4            # Hero landing section background
│   │   ├── about_video.mp4           # About section background
│   │   ├── CTA_video.mp4             # Footer call-to-action background
│   │   ├── nft1.mp4                  # Featured showcase card 1
│   │   ├── nft2.mp4                  # Featured showcase card 2
│   │   └── nft3.mp4                  # Featured showcase card 3
│   └── favicon.ico                   # Application favicon
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.tsx            # Navigation header with mint trigger & wallet button
│   │   │   └── Footer.tsx            # Footer with legal dialogs, Aptoscan link, and contract address
│   │   ├── marketplace/              # Marketplace interface modals & cards
│   │   │   ├── AuctionCard.tsx       # Live auction card with countdown timer & bid submission
│   │   │   ├── CreateAuctionModal.tsx# Form to initialize on-chain auctions
│   │   │   ├── ListNFTModal.tsx      # Listing form to list owned tokens for sale
│   │   │   ├── MakeOfferModal.tsx    # Modal to submit direct buyer offers
│   │   │   ├── MintNFTModal.tsx      # Modal to mint new ocean artifacts on Aptos
│   │   │   ├── NFTCard.tsx           # Standard NFT card with media preview, rarity, and actions
│   │   │   └── OffersModal.tsx       # Modal to review incoming offers and accept sales
│   │   ├── wallet/
│   │   │   ├── AptosWalletProvider.tsx # Client-side hydration boundary for Aptos wallet adapters
│   │   │   └── WalletButton.tsx      # Connect button, Google Keyless login, and account dropdown
│   │   └── ui/                       # Radix UI primitives styled with Tailwind CSS
│   ├── lib/
│   │   ├── aptosClient.ts            # AptosClient RPC instance, payload builders, and unit converters
│   │   └── utils.ts                  # Classnames merging helper (clsx + tailwind-merge)
│   ├── routes/                       # TanStack Router file-based pages
│   │   ├── __root.tsx                # App shell, theme providers, toaster, navigation, and footer
│   │   ├── index.tsx                 # Landing page with video hero, showcase, and call-to-action
│   │   ├── market.tsx                # Marketplace browse page for direct listings and live auctions
│   │   ├── my-nfts.tsx               # Portfolio page displaying user-owned ocean artifacts
│   │   ├── analytics.tsx             # Analytics dashboard with Recharts volume and rarity graphs
│   │   └── royalties.tsx             # Creator royalty configuration interface
│   ├── test/                         # Vitest unit and routing test suite
│   ├── types/
│   │   └── marketplace.ts            # TypeScript interfaces for NFTs, auctions, and contracts
│   ├── router.tsx                    # TanStack Router initialization
│   └── styles.css                    # Tailwind CSS v4 styling rules and glassmorphism tokens
├── .env.example                      # Environment variables reference file
├── .gitignore                        # Git ignore rules for node_modules, build outputs, and secrets
├── package.json                      # Project dependencies and operational scripts
├── tsconfig.json                     # TypeScript compiler configuration
├── vercel.json                       # Vercel deployment configuration
└── vite.config.ts                    # Vite build configuration with dynamic Nitro preset switching
```

---

## Environment Variables and Configuration

The application uses standard Vite environment variables prefixed with `VITE_`. Default fallbacks are included in `src/lib/aptosClient.ts` for instant zero-configuration testing.

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

| Variable                            | Description                                        | Default Fallback                                                     |
| ----------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------- |
| `VITE_APTOS_NODE_URL`               | Aptos fullnode RPC endpoint                        | `https://fullnode.devnet.aptoslabs.com/v1`                           |
| `VITE_APTOS_NETWORK`                | Target Aptos network (devnet, testnet, or mainnet) | `devnet`                                                             |
| `VITE_MARKETPLACE_CONTRACT_ADDRESS` | Deployed Move module address                       | `0x4bee16faf06f7ffb1968c3b7baad06a651a80de4e5a620be45aa45853d23f6fb` |

### Hardcoded vs Configurable Values

- Smart Contract Address: Configurable via `VITE_MARKETPLACE_CONTRACT_ADDRESS`. Falls back to the verified Devnet address.
- Network Identifier: Configurable via `VITE_APTOS_NETWORK`. Controls explorer links and wallet network matching.
- RPC Node URL: Configurable via `VITE_APTOS_NODE_URL`.
- Platform Fee: Fixed at 2% within `NFTMarketplace.move` on-chain logic.
- Showcase Media: High-definition MP4 ocean videos stored locally in `public/videos/`.

---

## Local Development

### Prerequisites

- Node.js: version 18.0.0 or higher (Node 22 or 24 recommended)
- Package Manager: pnpm v10+ (or npm / yarn)
- Browser Wallet: Petra Wallet extension (optional if using Google Keyless login)

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Start Development Server

```bash
pnpm dev
```

The application will be available at `http://localhost:5173`.

### 3. Run Unit and Routing Tests

```bash
pnpm test
```

Executes Vitest test suites covering Aptos client serialization, Octas conversion, and route rendering.

### 4. Type Check

```bash
npx tsc --noEmit
```

### 5. Production Build

```bash
pnpm build
```

Generates client assets and SSR server bundles via Vite 8 and Nitro.

### 6. Preview Production Build Locally

```bash
pnpm preview
```

---

## Deployment to Vercel

Orbix is pre-configured for automated continuous deployment on Vercel via GitHub integration.

### Method 1: Deploy via Vercel Dashboard

1. Push your repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "feat: initial commit of orbix.nft"
   git remote add origin https://github.com/vismaygawai/orbix.nft.git
   git push -u origin main
   ```
2. Navigate to [vercel.com](https://vercel.com) and click "Add New" > "Project".
3. Select your GitHub repository.
4. In Project Settings:
   - Framework Preset: Select "Other" or leave as detected.
   - Build Command: `pnpm build`
   - Output Directory: `.vercel/output` (automatically populated by Nitro when `VERCEL=1` is detected).
   - Install Command: `pnpm install`
5. Under "Environment Variables", optionally add:
   - `VITE_APTOS_NODE_URL`: `https://fullnode.devnet.aptoslabs.com/v1`
   - `VITE_APTOS_NETWORK`: `devnet`
   - `VITE_MARKETPLACE_CONTRACT_ADDRESS`: `0x4bee16faf06f7ffb1968c3b7baad06a651a80de4e5a620be45aa45853d23f6fb`
6. Click "Deploy".

### Method 2: Deploy via Vercel CLI

```bash
npx vercel
```

For production deployment:

```bash
npx vercel --prod
```

---

## Technical Notes

- SSR Hydration Safety: TanStack Start renders pages on the server. Wallet extension adapters requiring `window` or `chrome` browser APIs are isolated behind `AptosWalletProvider` to prevent server-side hydration mismatches.
- Move Contract Precision: Financial values on Aptos are processed in Octas (1 APT = 10^8 Octas). All frontend conversions utilize `octasToApt` and `aptToOctas` with strict rounding to avoid floating-point errors.
- Rarity Mapping: Rarity tiers are mapped to numeric values (1 = Common, 2 = Uncommon, 3 = Rare, 4 = Epic) matching `NFTMarketplace.move` enum definitions.
