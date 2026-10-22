// TODO# 1: Define Module and Marketplace Address
address 0x4bee16faf06f7ffb1968c3b7baad06a651a80de4e5a620be45aa45853d23f6fb {

    module NFTMarketplace {
        use std::signer;
        use std::vector;
        use aptos_framework::coin;
        use aptos_framework::aptos_coin;
        use aptos_framework::timestamp;
        use aptos_framework::account;
        use aptos_framework::event;
        use aptos_std::table::{Self, Table};

        // TODO# 2: Define NFT Structure
        struct NFT has store, key {
            id: u64,
            owner: address,
            name: vector<u8>,
            description: vector<u8>,
            uri: vector<u8>,
            price: u64,
            for_sale: bool,
            rarity: u8  // 1 for common, 2 for rare, 3 for epic, etc.
        }

        // TODO# 3: Define Marketplace Structure
        struct Marketplace has key {
            nfts: vector<NFT>,
            auctions: vector<Auction>,
            offers: Table<u64, vector<Offer>>,
            creator_royalties: Table<address, u64>,
            stats: MarketplaceStats,
            bid_events: event::EventHandle<BidPlacedEvent>,
            offer_events: event::EventHandle<OfferCreatedEvent>,
            offer_status_events: event::EventHandle<OfferStatusChangedEvent>
        }
        
        // TODO# 4: Define ListedNFT Structure
        struct ListedNFT has copy, drop {
            id: u64,
            price: u64,
            rarity: u8
        }

        // TODO# 5: Set Marketplace Fee
        const MARKETPLACE_FEE_PERCENT: u64 = 2; // 2% fee

        // TODO# 6: Initialize Marketplace        
                public entry fun initialize(account: &signer) {
            let marketplace = Marketplace {
                nfts: vector::empty<NFT>(),
                auctions: vector::empty<Auction>(),
                offers: table::new<u64, vector<Offer>>(),
                creator_royalties: table::new<address, u64>(),
                stats: MarketplaceStats {
                    total_sales: 0,
                    total_volume: 0,
                    active_listings: 0,
                    sales_history: vector::empty(),
                    sales_by_rarity: vector::empty()
                },
                bid_events: account::new_event_handle<BidPlacedEvent>(account),
                offer_events: account::new_event_handle<OfferCreatedEvent>(account),
                offer_status_events: account::new_event_handle<OfferStatusChangedEvent>(account)
            };
            move_to(account, marketplace);
        }

        // TODO# 7: Check Marketplace Initialization
        #[view]
        public fun is_marketplace_initialized(marketplace_addr: address): bool {
            exists<Marketplace>(marketplace_addr)
        }

        // TODO# 8: Mint New NFT
        public entry fun mint_nft(account: &signer, name: vector<u8>, description: vector<u8>, uri: vector<u8>, rarity: u8) acquires Marketplace {
            let marketplace = borrow_global_mut<Marketplace>(signer::address_of(account));
            let nft_id = vector::length(&marketplace.nfts);

            let new_nft = NFT {
                id: nft_id,
                owner: signer::address_of(account),
                name,
                description,
                uri,
                price: 0,
                for_sale: false,
                rarity
            };

            vector::push_back(&mut marketplace.nfts, new_nft);
        }

        // TODO# 9: View NFT Details
        #[view]
        public fun get_nft_details(marketplace_addr: address, nft_id: u64): (u64, address, vector<u8>, vector<u8>, vector<u8>, u64, bool, u8) acquires Marketplace {
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            let nft = vector::borrow(&marketplace.nfts, nft_id);

            (nft.id, nft.owner, nft.name, nft.description, nft.uri, nft.price, nft.for_sale, nft.rarity)
        }
        
        // TODO# 10: List NFT for Sale
        public entry fun list_for_sale(account: &signer, marketplace_addr: address, nft_id: u64, price: u64) acquires Marketplace {
            let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
            let nft_ref = vector::borrow_mut(&mut marketplace.nfts, nft_id);

            assert!(nft_ref.owner == signer::address_of(account), 100); // Caller is not the owner
            assert!(!nft_ref.for_sale, 101); // NFT is already listed
            assert!(price > 0, 102); // Invalid price

            nft_ref.for_sale = true;
            nft_ref.price = price;
        }

        // TODO# 11: Update NFT Price
         public entry fun set_price(account: &signer, marketplace_addr: address, nft_id: u64, price: u64) acquires Marketplace {
            let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
            let nft_ref = vector::borrow_mut(&mut marketplace.nfts, nft_id);

            assert!(nft_ref.owner == signer::address_of(account), 200); // Caller is not the owner
            assert!(price > 0, 201); // Invalid price

            nft_ref.price = price;
        }

        // TODO# 12: Purchase NFT
        public entry fun purchase_nft(
            account: &signer,
            marketplace_addr: address,
            nft_id: u64,
            payment: u64
        ) acquires Marketplace {
            let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
            let nft_ref = vector::borrow_mut(&mut marketplace.nfts, nft_id);
            let buyer_addr = signer::address_of(account);
            
            assert!(nft_ref.for_sale, 400);
            assert!(payment >= nft_ref.price, 401);
            
            // Calculate fees without requiring creator royalties
            let marketplace_fee = (payment * MARKETPLACE_FEE_PERCENT) / 100;
            let seller_revenue = payment - marketplace_fee;
            
            // Only apply royalties if they exist for the seller
            if (table::contains(&marketplace.creator_royalties, nft_ref.owner)) {
                let creator_royalty = *table::borrow(&marketplace.creator_royalties, nft_ref.owner);
                let royalty_amount = (payment * creator_royalty) / 100;
                seller_revenue = seller_revenue - royalty_amount;
                // Transfer royalty to creator
                coin::transfer<aptos_coin::AptosCoin>(account, nft_ref.owner, royalty_amount);
            };
            
            // Transfer payments
            coin::transfer<aptos_coin::AptosCoin>(account, nft_ref.owner, seller_revenue);
            coin::transfer<aptos_coin::AptosCoin>(account, marketplace_addr, marketplace_fee);
            
            // Update NFT ownership
            nft_ref.owner = buyer_addr;
            nft_ref.for_sale = false;
            nft_ref.price = 0;
            
            // Update marketplace stats
            let stats = &mut marketplace.stats;
            stats.total_sales = stats.total_sales + 1;
            stats.total_volume = stats.total_volume + payment;
        }

        // TODO# 13: Check if NFT is for Sale
        #[view]
        public fun is_nft_for_sale(marketplace_addr: address, nft_id: u64): bool acquires Marketplace {
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            let nft = vector::borrow(&marketplace.nfts, nft_id);
            nft.for_sale
        }

        // TODO# 14: Get NFT Price
        #[view]
        public fun get_nft_price(marketplace_addr: address, nft_id: u64): u64 acquires Marketplace {
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            let nft = vector::borrow(&marketplace.nfts, nft_id);
            nft.price
        }

        // TODO# 15: Transfer Ownership
        public entry fun transfer_ownership(account: &signer, marketplace_addr: address, nft_id: u64, new_owner: address) acquires Marketplace {
            let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
            let nft_ref = vector::borrow_mut(&mut marketplace.nfts, nft_id);

            assert!(nft_ref.owner == signer::address_of(account), 300); // Caller is not the owner
            assert!(nft_ref.owner != new_owner, 301); // Prevent transfer to the same owner

            // Update NFT ownership and reset its for_sale status and price
            nft_ref.owner = new_owner;
            nft_ref.for_sale = false;
            nft_ref.price = 0;
        }

        // TODO# 16: Retrieve NFT Owner
        #[view]
        public fun get_owner(marketplace_addr: address, nft_id: u64): address acquires Marketplace {
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            let nft = vector::borrow(&marketplace.nfts, nft_id);
            nft.owner
        }

        // TODO# 17: Retrieve NFTs for Sale
        #[view]
        public fun get_all_nfts_for_owner(marketplace_addr: address, owner_addr: address, limit: u64, offset: u64): vector<u64> acquires Marketplace {
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            let nft_ids = vector::empty<u64>();

            let nfts_len = vector::length(&marketplace.nfts);
            let end = min(offset + limit, nfts_len);
            let mut_i = offset;
            while (mut_i < end) {
                let nft = vector::borrow(&marketplace.nfts, mut_i);
                if (nft.owner == owner_addr) {
                    vector::push_back(&mut nft_ids, nft.id);
                };
                mut_i = mut_i + 1;
            };

            nft_ids
        }

        // TODO# 18: Retrieve NFTs for Sale
        #[view]
        public fun get_all_nfts_for_sale(marketplace_addr: address, limit: u64, offset: u64): vector<ListedNFT> acquires Marketplace {
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            let nfts_for_sale = vector::empty<ListedNFT>();

            let nfts_len = vector::length(&marketplace.nfts);
            let end = min(offset + limit, nfts_len);
            let mut_i = offset;
            while (mut_i < end) {
                let nft = vector::borrow(&marketplace.nfts, mut_i);
                if (nft.for_sale) {
                    let listed_nft = ListedNFT { id: nft.id, price: nft.price, rarity: nft.rarity };
                    vector::push_back(&mut nfts_for_sale, listed_nft);
                };
                mut_i = mut_i + 1;
            };

            nfts_for_sale
        }

        // TODO# 19: Define Helper Function for Minimum Value
        // Helper function to find the minimum of two u64 numbers
        public fun min(a: u64, b: u64): u64 {
            if (a < b) { a } else { b }
        }

        // TODO# 20: Retrieve NFTs by Rarity
        // New function to retrieve NFTs by rarity
        #[view]
        public fun get_nfts_by_rarity(marketplace_addr: address, rarity: u8): vector<u64> acquires Marketplace {
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            let nft_ids = vector::empty<u64>();

            let nfts_len = vector::length(&marketplace.nfts);
            let mut_i = 0;
            while (mut_i < nfts_len) {
                let nft = vector::borrow(&marketplace.nfts, mut_i);
                if (nft.rarity == rarity) {
                    vector::push_back(&mut nft_ids, nft.id);
                };
                mut_i = mut_i + 1;
            };

            nft_ids
        }

        // New structures for auctions and offers
        struct Auction has store, copy {
            nft_id: u64,
            start_price: u64,
            current_bid: u64,
            highest_bidder: address,
            end_time: u64,
            active: bool
        }

        struct Offer has store, drop, copy {
            nft_id: u64,
            buyer: address,
            price: u64,
            expiration: u64,
            status: u8  // 0: pending, 1: accepted, 2: rejected, 3: expired
        }

        struct OfferCreatedEvent has drop, store {
            nft_id: u64,
            buyer: address,
            price: u64,
            expiration: u64
        }

        struct OfferStatusChangedEvent has drop, store {
            nft_id: u64,
            buyer: address,
            price: u64,
            new_status: u8  // 0: pending, 1: accepted, 2: rejected, 3: expired
        }

        // Constants
        const ROYALTY_PERCENTAGE: u64 = 5; // 5% royalty for creators
        const MIN_AUCTION_DURATION: u64 = 3600; // 1 hour in seconds
        
        // Create auction
        public entry fun create_auction(
            account: &signer,
            marketplace_addr: address,
            nft_id: u64,
            start_price: u64,
            duration: u64
        ) acquires Marketplace {
            let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
            
            // Verify NFT exists and caller is owner
            assert!(nft_id < vector::length(&marketplace.nfts), 1010);
            let nft = vector::borrow(&marketplace.nfts, nft_id);
            assert!(nft.owner == signer::address_of(account), 1000);
            assert!(duration >= MIN_AUCTION_DURATION, 1001);
            
            let auction = Auction {
                nft_id,
                start_price,
                current_bid: start_price,
                highest_bidder: @0x0,
                end_time: timestamp::now_seconds() + duration,
                active: true
            };
            
            vector::push_back(&mut marketplace.auctions, auction);
        }

        // Add these error constants at the top of the module
        const ENFT_NOT_FOUND: u64 = 1000;
        const EAUCTION_NOT_ACTIVE: u64 = 0x3ef;
        const EAUCTION_EXPIRED: u64 = 0x3f0;
        const EBID_TOO_LOW: u64 = 0x3ee;
        const EALREADY_HIGHEST_BIDDER: u64 = 0x3ed;
        const EINSUFFICIENT_BALANCE: u64 = 0x3f1;

        // Update the place_bid function with better error handling
        public entry fun place_bid(
            account: &signer,
            marketplace_addr: address,
            nft_id: u64,
            bid_amount: u64
        ) acquires Marketplace {
            let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
            let buyer_addr = signer::address_of(account);
            
            // Find the auction first
            let auctions_len = vector::length(&marketplace.auctions);
            let mut_i = 0;
            let found = false;
            let auction_index = 0;
            
            while (mut_i < auctions_len) {
                let auction = vector::borrow(&marketplace.auctions, mut_i);
                if (auction.nft_id == nft_id && auction.active) {
                    found = true;
                    auction_index = mut_i;
                    break
                };
                mut_i = mut_i + 1;
            };
            
            assert!(found, ENFT_NOT_FOUND);
            
            // Get a mutable reference to the auction
            let auction = vector::borrow_mut(&mut marketplace.auctions, auction_index);
            
            // Validations using the mutable reference
            assert!(auction.active, EAUCTION_NOT_ACTIVE);
            assert!(timestamp::now_seconds() < auction.end_time, EAUCTION_EXPIRED);
            assert!(bid_amount > auction.current_bid, EBID_TOO_LOW);
            assert!(buyer_addr != auction.highest_bidder, EALREADY_HIGHEST_BIDDER);
            
            // Return previous bid to previous bidder if exists
            if (auction.highest_bidder != @0x0) {
                coin::transfer<aptos_coin::AptosCoin>(
                    account,
                    auction.highest_bidder,
                    auction.current_bid
                );
            };
            
            // Transfer the new bid
            coin::transfer<aptos_coin::AptosCoin>(
                account,
                marketplace_addr,
                bid_amount
            );
            
            // Update auction state using the mutable reference
            auction.current_bid = bid_amount;
            auction.highest_bidder = buyer_addr;
            
            // Emit bid placed event
            event::emit_event(
                &mut marketplace.bid_events,
                BidPlacedEvent {
                    nft_id,
                    bidder: buyer_addr,
                    bid_amount,
                    timestamp: timestamp::now_seconds(),
                }
            );
        }

        // Add these functions for royalty management
        public entry fun set_creator_royalty(
            account: &signer,
            marketplace_addr: address,
            royalty_percentage: u64
        ) acquires Marketplace {
            let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
            assert!(royalty_percentage <= 30, 1005); // Max 30% royalty
            table::upsert(&mut marketplace.creator_royalties, signer::address_of(account), royalty_percentage);
        }

        // Add these functions for offer management
        public entry fun make_offer(
            account: &signer,
            marketplace_addr: address,
            nft_id: u64,
            offer_price: u64,
            expiration: u64
        ) acquires Marketplace {
            let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
            let buyer_addr = signer::address_of(account);
            
            // Verify NFT exists and expiration is valid
            assert!(nft_id < vector::length(&marketplace.nfts), 1009);
            assert!(expiration > timestamp::now_seconds(), 1006);
            
            let offer = Offer {
                nft_id,
                buyer: buyer_addr,
                price: offer_price,
                expiration,
                status: 0
            };
            
            // Initialize offers vector if it doesn't exist
            if (!table::contains(&marketplace.offers, nft_id)) {
                table::add(&mut marketplace.offers, nft_id, vector::empty<Offer>());
            };
            
            let offers = table::borrow_mut(&mut marketplace.offers, nft_id);
            vector::push_back(offers, offer);

            // Emit offer created event
            event::emit_event(&mut marketplace.offer_events, OfferCreatedEvent {
                nft_id,
                buyer: buyer_addr,
                price: offer_price,
                expiration
            });
        }

        public entry fun accept_offer(
            account: &signer,
            marketplace_addr: address,
            nft_id: u64,
            offer_index: u64
        ) acquires Marketplace {
            let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
            let nft_ref = vector::borrow_mut(&mut marketplace.nfts, nft_id);
            assert!(nft_ref.owner == signer::address_of(account), 1007);
            
            let offers = table::borrow_mut(&mut marketplace.offers, nft_id);
            let offer = vector::borrow_mut(offers, offer_index);
            assert!(offer.expiration > timestamp::now_seconds(), 1008);
            assert!(offer.status == 0, 1010); // Ensure offer is still pending
            
            // Update offer status to accepted
            offer.status = 1;
            
            // Calculate fees and process payment
            let marketplace_fee = (offer.price * MARKETPLACE_FEE_PERCENT) / 100;
            let seller_revenue = offer.price - marketplace_fee;
            
            // Apply creator royalties if they exist
            if (table::contains(&marketplace.creator_royalties, nft_ref.owner)) {
                let creator_royalty = *table::borrow(&marketplace.creator_royalties, nft_ref.owner);
                let royalty_amount = (offer.price * creator_royalty) / 100;
                seller_revenue = seller_revenue - royalty_amount;
                
                // Transfer royalty to creator
                coin::transfer<aptos_coin::AptosCoin>(account, nft_ref.owner, royalty_amount);
            };
            
            // Transfer payments
            coin::transfer<aptos_coin::AptosCoin>(account, nft_ref.owner, seller_revenue);
            coin::transfer<aptos_coin::AptosCoin>(account, marketplace_addr, marketplace_fee);
            
            // Update NFT ownership
            nft_ref.owner = offer.buyer;
            nft_ref.for_sale = false;
            nft_ref.price = 0;
            
            // Emit offer status changed event
            event::emit_event(&mut marketplace.offer_status_events, OfferStatusChangedEvent {
                nft_id,
                buyer: offer.buyer,
                price: offer.price,
                new_status: 1
            });
        }

        // Add analytics structures
        struct MarketplaceStats has store {
            total_sales: u64,
            total_volume: u64,
            active_listings: u64,
            sales_history: vector<SalesHistory>,
            sales_by_rarity: vector<RaritySales>
        }

        struct SalesHistory has store, drop, copy {
            date: u64,  // Unix timestamp
            sales: u64,
            volume: u64
        }

        struct RaritySales has store, drop, copy {
            rarity: u8,
            sales: u64,
            volume: u64
        }

        // Add these view functions before the last closing brace
        #[view]
        public fun get_marketplace_stats(marketplace_addr: address): (u64, u64, u64, vector<SalesHistory>) acquires Marketplace {
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            let stats = &marketplace.stats;
            
            (
                stats.total_sales,
                stats.total_volume,
                stats.active_listings,
                stats.sales_history
            )
        }

        #[view]
        public fun get_sales_by_rarity(marketplace_addr: address): vector<RaritySales> acquires Marketplace {
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            let mut_stats = marketplace.stats.sales_by_rarity;
            
            if (vector::is_empty(&mut_stats)) {
                let i = 1;
                while (i <= 4) {
                    let rarity_stats = RaritySales {
                        rarity: i,
                        sales: 0,
                        volume: 0
                    };
                    vector::push_back(&mut mut_stats, rarity_stats);
                    i = i + 1;
                };
            };
            
            mut_stats
        }

        // Add this view function to fetch active auctions
        #[view]
        public fun get_active_auctions(marketplace_addr: address): vector<Auction> acquires Marketplace {
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            let active_auctions = vector::empty<Auction>();
            
            let auctions_len = vector::length(&marketplace.auctions);
            let mut_i = 0;
            while (mut_i < auctions_len) {
                let auction = vector::borrow(&marketplace.auctions, mut_i);
                if (auction.active && auction.end_time > timestamp::now_seconds()) {
                    vector::push_back(&mut active_auctions, *auction);
                };
                mut_i = mut_i + 1;
            };
            
            active_auctions
        }

        // Add this struct to your contract
        struct BidPlacedEvent has drop, store {
            nft_id: u64,
            bidder: address,
            bid_amount: u64,
            timestamp: u64,
        }

        // Add view function to get offers for an NFT
        #[view]
        public fun get_offers_for_nft(marketplace_addr: address, nft_id: u64): vector<Offer> acquires Marketplace {
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            
            if (!table::contains(&marketplace.offers, nft_id)) {
                vector::empty<Offer>()
            } else {
                let offers = table::borrow(&marketplace.offers, nft_id);
                *offers
            }
        }

        // Add view function to get user's offers
        #[view]
        public fun get_user_offers(marketplace_addr: address, user_addr: address): vector<Offer> acquires Marketplace {
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            let user_offers = vector::empty<Offer>();
            
            let nft_count = vector::length(&marketplace.nfts);
            let i = 0;
            while (i < nft_count) {
                if (table::contains(&marketplace.offers, i)) {
                    let nft_offers = table::borrow(&marketplace.offers, i);
                    let j = 0;
                    while (j < vector::length(nft_offers)) {
                        let offer = vector::borrow(nft_offers, j);
                        if (offer.buyer == user_addr && offer.status == 0) {
                            vector::push_back(&mut user_offers, *offer);
                        };
                        j = j + 1;
                    };
                };
                i = i + 1;
            };
            
            user_offers
        }
    }
}
