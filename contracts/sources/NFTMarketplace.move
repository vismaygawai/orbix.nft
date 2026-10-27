address 0x4bee16faf06f7ffb1968c3b7baad06a651a80de4e5a620be45aa45853d23f6fb {

    module NFTMarketplace {
        use std::signer;
        use std::vector;
        use aptos_framework::coin::{Self, Coin};
        use aptos_framework::aptos_coin::AptosCoin;
        use aptos_framework::timestamp;
        use aptos_framework::account;
        use aptos_framework::event;
        use aptos_std::table::{Self, Table};

        const MODULE_ADDRESS: address = @0x4bee16faf06f7ffb1968c3b7baad06a651a80de4e5a620be45aa45853d23f6fb;
        const MARKETPLACE_FEE_PERCENT: u64 = 2; // 2% fee
        const MIN_AUCTION_DURATION: u64 = 3600; // 1 hour in seconds

        // Error codes
        const ENOT_OWNER: u64 = 100;
        const EALREADY_LISTED: u64 = 101;
        const EINVALID_PRICE: u64 = 102;
        const EINVALID_RARITY: u64 = 103;
        const ENOT_FOR_SALE: u64 = 400;
        const EINSUFFICIENT_PAYMENT: u64 = 401;
        const ECANNOT_BUY_OWN_NFT: u64 = 402;
        const ENFT_IN_AUCTION: u64 = 403;
        const ESAME_OWNER: u64 = 301;
        const ENFT_NOT_FOUND: u64 = 1000;
        const EINVALID_DURATION: u64 = 1001;
        const EMAX_ROYALTY_EXCEEDED: u64 = 1005;
        const EINVALID_EXPIRATION: u64 = 1006;
        const EOFFER_EXPIRED: u64 = 1008;
        const EOFFER_NOT_PENDING: u64 = 1010;
        const EALREADY_INITIALIZED: u64 = 1011;
        const EAUCTION_ALREADY_EXISTS: u64 = 1012;
        const EAUCTION_NOT_ENDED: u64 = 1013;
        const EAUCTION_HAS_BIDS: u64 = 1014;
        const EALREADY_HIGHEST_BIDDER: u64 = 0x3ed;
        const EBID_TOO_LOW: u64 = 0x3ee;
        const EAUCTION_NOT_ACTIVE: u64 = 0x3ef;
        const EAUCTION_EXPIRED: u64 = 0x3f0;

        struct NFT has store, key {
            id: u64,
            owner: address,
            creator: address,
            name: vector<u8>,
            description: vector<u8>,
            uri: vector<u8>,
            price: u64,
            for_sale: bool,
            rarity: u8 // 1: Common, 2: Uncommon, 3: Rare, 4: Epic
        }

        struct ListedNFT has copy, drop {
            id: u64,
            price: u64,
            rarity: u8
        }

        struct Auction has store, copy, drop {
            nft_id: u64,
            seller: address,
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
            status: u8 // 0: pending, 1: accepted, 2: rejected, 3: expired/cancelled
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
            new_status: u8
        }

        struct BidPlacedEvent has drop, store {
            nft_id: u64,
            bidder: address,
            bid_amount: u64,
            timestamp: u64
        }

        struct MarketplaceStats has store {
            total_sales: u64,
            total_volume: u64,
            active_listings: u64,
            sales_history: vector<SalesHistory>,
            sales_by_rarity: vector<RaritySales>
        }

        struct SalesHistory has store, drop, copy {
            date: u64,
            sales: u64,
            volume: u64
        }

        struct RaritySales has store, drop, copy {
            rarity: u8,
            sales: u64,
            volume: u64
        }

        struct Marketplace has key {
            nfts: vector<NFT>,
            auctions: vector<Auction>,
            auction_escrow: Table<u64, Coin<AptosCoin>>,
            offers: Table<u64, vector<Offer>>,
            offer_escrow: Table<u64, Table<u64, Coin<AptosCoin>>>,
            creator_royalties: Table<address, u64>,
            stats: MarketplaceStats,
            bid_events: event::EventHandle<BidPlacedEvent>,
            offer_events: event::EventHandle<OfferCreatedEvent>,
            offer_status_events: event::EventHandle<OfferStatusChangedEvent>
        }

        public entry fun initialize(account: &signer) {
            let addr = signer::address_of(account);
            assert!(!exists<Marketplace>(addr), EALREADY_INITIALIZED);

            let initial_rarity_sales = vector::empty<RaritySales>();
            let r = 1;
            while (r <= 4) {
                vector::push_back(&mut initial_rarity_sales, RaritySales {
                    rarity: r,
                    sales: 0,
                    volume: 0
                });
                r = r + 1;
            };

            let marketplace = Marketplace {
                nfts: vector::empty<NFT>(),
                auctions: vector::empty<Auction>(),
                auction_escrow: table::new<u64, Coin<AptosCoin>>(),
                offers: table::new<u64, vector<Offer>>(),
                offer_escrow: table::new<u64, Table<u64, Coin<AptosCoin>>>(),
                creator_royalties: table::new<address, u64>(),
                stats: MarketplaceStats {
                    total_sales: 0,
                    total_volume: 0,
                    active_listings: 0,
                    sales_history: vector::empty<SalesHistory>(),
                    sales_by_rarity: initial_rarity_sales
                },
                bid_events: account::new_event_handle<BidPlacedEvent>(account),
                offer_events: account::new_event_handle<OfferCreatedEvent>(account),
                offer_status_events: account::new_event_handle<OfferStatusChangedEvent>(account)
            };
            move_to(account, marketplace);
        }

        #[view]
        public fun is_marketplace_initialized(marketplace_addr: address): bool {
            exists<Marketplace>(marketplace_addr)
        }

        // Fixed: Uses MODULE_ADDRESS if initialized there so any user can mint into the global marketplace
        public entry fun mint_nft(
            account: &signer,
            name: vector<u8>,
            description: vector<u8>,
            uri: vector<u8>,
            rarity: u8
        ) acquires Marketplace {
            assert!(rarity >= 1 && rarity <= 4, EINVALID_RARITY);
            let sender = signer::address_of(account);
            let target_addr = if (exists<Marketplace>(MODULE_ADDRESS)) {
                MODULE_ADDRESS
            } else {
                sender
            };

            let marketplace = borrow_global_mut<Marketplace>(target_addr);
            let nft_id = vector::length(&marketplace.nfts);

            let new_nft = NFT {
                id: nft_id,
                owner: sender,
                creator: sender,
                name,
                description,
                uri,
                price: 0,
                for_sale: false,
                rarity
            };

            vector::push_back(&mut marketplace.nfts, new_nft);
        }

        #[view]
        public fun get_nft_details(
            marketplace_addr: address,
            nft_id: u64
        ): (u64, address, vector<u8>, vector<u8>, vector<u8>, u64, bool, u8) acquires Marketplace {
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            assert!(nft_id < vector::length(&marketplace.nfts), ENFT_NOT_FOUND);
            let nft = vector::borrow(&marketplace.nfts, nft_id);

            (nft.id, nft.owner, nft.name, nft.description, nft.uri, nft.price, nft.for_sale, nft.rarity)
        }

        fun has_active_auction(auctions: &vector<Auction>, nft_id: u64): bool {
            let len = vector::length(auctions);
            let i = 0;
            while (i < len) {
                let a = vector::borrow(auctions, i);
                if (a.nft_id == nft_id && a.active && a.end_time > timestamp::now_seconds()) {
                    return true
                };
                i = i + 1;
            };
            false
        }

        fun record_sale_stats(stats: &mut MarketplaceStats, price: u64, rarity: u8, was_listed: bool) {
            stats.total_sales = stats.total_sales + 1;
            stats.total_volume = stats.total_volume + price;
            if (was_listed && stats.active_listings > 0) {
                stats.active_listings = stats.active_listings - 1;
            };

            vector::push_back(&mut stats.sales_history, SalesHistory {
                date: timestamp::now_seconds(),
                sales: 1,
                volume: price
            });

            let r_len = vector::length(&stats.sales_by_rarity);
            let i = 0;
            let updated = false;
            while (i < r_len) {
                let r_stat = vector::borrow_mut(&mut stats.sales_by_rarity, i);
                if (r_stat.rarity == rarity) {
                    r_stat.sales = r_stat.sales + 1;
                    r_stat.volume = r_stat.volume + price;
                    updated = true;
                    break
                };
                i = i + 1;
            };
            if (!updated) {
                vector::push_back(&mut stats.sales_by_rarity, RaritySales {
                    rarity,
                    sales: 1,
                    volume: price
                });
            };
        }

        public entry fun list_for_sale(
            account: &signer,
            marketplace_addr: address,
            nft_id: u64,
            price: u64
        ) acquires Marketplace {
            let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
            assert!(nft_id < vector::length(&marketplace.nfts), ENFT_NOT_FOUND);
            assert!(!has_active_auction(&marketplace.auctions, nft_id), ENFT_IN_AUCTION);

            let nft_ref = vector::borrow_mut(&mut marketplace.nfts, nft_id);
            assert!(nft_ref.owner == signer::address_of(account), ENOT_OWNER);
            assert!(!nft_ref.for_sale, EALREADY_LISTED);
            assert!(price > 0, EINVALID_PRICE);

            nft_ref.for_sale = true;
            nft_ref.price = price;
            marketplace.stats.active_listings = marketplace.stats.active_listings + 1;
        }

        public entry fun cancel_listing(
            account: &signer,
            marketplace_addr: address,
            nft_id: u64
        ) acquires Marketplace {
            let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
            assert!(nft_id < vector::length(&marketplace.nfts), ENFT_NOT_FOUND);
            let nft_ref = vector::borrow_mut(&mut marketplace.nfts, nft_id);

            assert!(nft_ref.owner == signer::address_of(account), ENOT_OWNER);
            assert!(nft_ref.for_sale, ENOT_FOR_SALE);

            nft_ref.for_sale = false;
            nft_ref.price = 0;
            if (marketplace.stats.active_listings > 0) {
                marketplace.stats.active_listings = marketplace.stats.active_listings - 1;
            };
        }

        public entry fun set_price(
            account: &signer,
            marketplace_addr: address,
            nft_id: u64,
            price: u64
        ) acquires Marketplace {
            let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
            assert!(nft_id < vector::length(&marketplace.nfts), ENFT_NOT_FOUND);
            let nft_ref = vector::borrow_mut(&mut marketplace.nfts, nft_id);

            assert!(nft_ref.owner == signer::address_of(account), 200);
            assert!(price > 0, 201);

            nft_ref.price = price;
        }

        public entry fun purchase_nft(
            account: &signer,
            marketplace_addr: address,
            nft_id: u64,
            payment: u64
        ) acquires Marketplace {
            let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
            assert!(nft_id < vector::length(&marketplace.nfts), ENFT_NOT_FOUND);
            let nft_ref = vector::borrow_mut(&mut marketplace.nfts, nft_id);
            let buyer_addr = signer::address_of(account);
            let seller_addr = nft_ref.owner;
            let creator_addr = nft_ref.creator;
            let rarity = nft_ref.rarity;

            assert!(nft_ref.for_sale, ENOT_FOR_SALE);
            assert!(payment >= nft_ref.price, EINSUFFICIENT_PAYMENT);
            assert!(buyer_addr != seller_addr, ECANNOT_BUY_OWN_NFT);

            let price = nft_ref.price;
            let marketplace_fee = (((price as u128) * (MARKETPLACE_FEE_PERCENT as u128)) / 100 as u64);
            let seller_revenue = price - marketplace_fee;

            // Fixed: Check creator_royalties for nft_ref.creator, not current owner
            if (table::contains(&marketplace.creator_royalties, creator_addr)) {
                let creator_royalty = *table::borrow(&marketplace.creator_royalties, creator_addr);
                let royalty_amount = (((price as u128) * (creator_royalty as u128)) / 100 as u64);
                if (royalty_amount > 0 && creator_addr != seller_addr) {
                    seller_revenue = seller_revenue - royalty_amount;
                    coin::transfer<AptosCoin>(account, creator_addr, royalty_amount);
                };
            };

            coin::transfer<AptosCoin>(account, seller_addr, seller_revenue);
            if (marketplace_fee > 0) {
                coin::transfer<AptosCoin>(account, marketplace_addr, marketplace_fee);
            };

            nft_ref.owner = buyer_addr;
            nft_ref.for_sale = false;
            nft_ref.price = 0;

            record_sale_stats(&mut marketplace.stats, price, rarity, true);
        }

        #[view]
        public fun is_nft_for_sale(marketplace_addr: address, nft_id: u64): bool acquires Marketplace {
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            assert!(nft_id < vector::length(&marketplace.nfts), ENFT_NOT_FOUND);
            let nft = vector::borrow(&marketplace.nfts, nft_id);
            nft.for_sale
        }

        #[view]
        public fun get_nft_price(marketplace_addr: address, nft_id: u64): u64 acquires Marketplace {
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            assert!(nft_id < vector::length(&marketplace.nfts), ENFT_NOT_FOUND);
            let nft = vector::borrow(&marketplace.nfts, nft_id);
            nft.price
        }

        public entry fun transfer_ownership(
            account: &signer,
            marketplace_addr: address,
            nft_id: u64,
            new_owner: address
        ) acquires Marketplace {
            let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
            assert!(nft_id < vector::length(&marketplace.nfts), ENFT_NOT_FOUND);
            assert!(!has_active_auction(&marketplace.auctions, nft_id), ENFT_IN_AUCTION);

            let nft_ref = vector::borrow_mut(&mut marketplace.nfts, nft_id);
            assert!(nft_ref.owner == signer::address_of(account), 300);
            assert!(nft_ref.owner != new_owner, ESAME_OWNER);

            let was_for_sale = nft_ref.for_sale;
            nft_ref.owner = new_owner;
            nft_ref.for_sale = false;
            nft_ref.price = 0;

            if (was_for_sale && marketplace.stats.active_listings > 0) {
                marketplace.stats.active_listings = marketplace.stats.active_listings - 1;
            };
        }

        #[view]
        public fun get_owner(marketplace_addr: address, nft_id: u64): address acquires Marketplace {
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            assert!(nft_id < vector::length(&marketplace.nfts), ENFT_NOT_FOUND);
            let nft = vector::borrow(&marketplace.nfts, nft_id);
            nft.owner
        }

        #[view]
        public fun get_all_nfts_for_owner(
            marketplace_addr: address,
            owner_addr: address,
            limit: u64,
            offset: u64
        ): vector<u64> acquires Marketplace {
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            let nft_ids = vector::empty<u64>();
            let nfts_len = vector::length(&marketplace.nfts);
            if (offset >= nfts_len) {
                return nft_ids
            };

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

        #[view]
        public fun get_all_nfts_for_sale(
            marketplace_addr: address,
            limit: u64,
            offset: u64
        ): vector<ListedNFT> acquires Marketplace {
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            let nfts_for_sale = vector::empty<ListedNFT>();
            let nfts_len = vector::length(&marketplace.nfts);
            if (offset >= nfts_len) {
                return nfts_for_sale
            };

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

        public fun min(a: u64, b: u64): u64 {
            if (a < b) { a } else { b }
        }

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

        public entry fun create_auction(
            account: &signer,
            marketplace_addr: address,
            nft_id: u64,
            start_price: u64,
            duration: u64
        ) acquires Marketplace {
            let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
            let seller = signer::address_of(account);

            assert!(nft_id < vector::length(&marketplace.nfts), ENFT_NOT_FOUND);
            assert!(!has_active_auction(&marketplace.auctions, nft_id), EAUCTION_ALREADY_EXISTS);

            let nft = vector::borrow_mut(&mut marketplace.nfts, nft_id);
            assert!(nft.owner == seller, ENOT_OWNER);
            assert!(start_price > 0, EINVALID_PRICE);
            assert!(duration >= MIN_AUCTION_DURATION, EINVALID_DURATION);

            // Delist from fixed-price sale if currently listed
            if (nft.for_sale) {
                nft.for_sale = false;
                nft.price = 0;
                if (marketplace.stats.active_listings > 0) {
                    marketplace.stats.active_listings = marketplace.stats.active_listings - 1;
                };
            };

            let auction = Auction {
                nft_id,
                seller,
                start_price,
                current_bid: start_price,
                highest_bidder: @0x0,
                end_time: timestamp::now_seconds() + duration,
                active: true
            };

            vector::push_back(&mut marketplace.auctions, auction);
        }

        // Fixed: Escrows bid in `auction_escrow` and refunds previous bidder from escrow, NOT from new bidder!
        public entry fun place_bid(
            account: &signer,
            marketplace_addr: address,
            nft_id: u64,
            bid_amount: u64
        ) acquires Marketplace {
            let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
            let buyer_addr = signer::address_of(account);

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

            let auction = vector::borrow_mut(&mut marketplace.auctions, auction_index);
            assert!(auction.active, EAUCTION_NOT_ACTIVE);
            assert!(timestamp::now_seconds() < auction.end_time, EAUCTION_EXPIRED);
            assert!(buyer_addr != auction.seller, ECANNOT_BUY_OWN_NFT);
            assert!(buyer_addr != auction.highest_bidder, EALREADY_HIGHEST_BIDDER);

            if (auction.highest_bidder == @0x0) {
                assert!(bid_amount >= auction.start_price, EBID_TOO_LOW);
            } else {
                assert!(bid_amount > auction.current_bid, EBID_TOO_LOW);
                // Refund previous highest bidder from the contract's auction_escrow!
                let prev_coin = table::remove(&mut marketplace.auction_escrow, nft_id);
                coin::deposit<AptosCoin>(auction.highest_bidder, prev_coin);
            };

            // Withdraw new bid from bidder and lock in auction_escrow
            let new_bid_coin = coin::withdraw<AptosCoin>(account, bid_amount);
            table::add(&mut marketplace.auction_escrow, nft_id, new_bid_coin);

            auction.current_bid = bid_amount;
            auction.highest_bidder = buyer_addr;

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

        // Added: Finalize an expired auction, transferring NFT and settling escrowed funds
        public entry fun finalize_auction(
            _account: &signer,
            marketplace_addr: address,
            nft_id: u64
        ) acquires Marketplace {
            let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
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

            let auction = vector::borrow_mut(&mut marketplace.auctions, auction_index);
            assert!(timestamp::now_seconds() >= auction.end_time, EAUCTION_NOT_ENDED);
            auction.active = false;

            if (auction.highest_bidder != @0x0 && table::contains(&marketplace.auction_escrow, nft_id)) {
                let escrow_coin = table::remove(&mut marketplace.auction_escrow, nft_id);
                let total_amount = coin::value(&escrow_coin);
                let nft_ref = vector::borrow_mut(&mut marketplace.nfts, nft_id);
                let seller_addr = nft_ref.owner;
                let creator_addr = nft_ref.creator;
                let rarity = nft_ref.rarity;

                let fee_amount = (((total_amount as u128) * (MARKETPLACE_FEE_PERCENT as u128)) / 100 as u64);
                if (fee_amount > 0) {
                    let fee_coin = coin::extract(&mut escrow_coin, fee_amount);
                    coin::deposit<AptosCoin>(marketplace_addr, fee_coin);
                };

                if (table::contains(&marketplace.creator_royalties, creator_addr)) {
                    let creator_royalty = *table::borrow(&marketplace.creator_royalties, creator_addr);
                    let royalty_amount = (((total_amount as u128) * (creator_royalty as u128)) / 100 as u64);
                    if (royalty_amount > 0 && creator_addr != seller_addr) {
                        let royalty_coin = coin::extract(&mut escrow_coin, royalty_amount);
                        coin::deposit<AptosCoin>(creator_addr, royalty_coin);
                    };
                };

                coin::deposit<AptosCoin>(seller_addr, escrow_coin);
                nft_ref.owner = auction.highest_bidder;
                nft_ref.for_sale = false;
                nft_ref.price = 0;

                record_sale_stats(&mut marketplace.stats, total_amount, rarity, false);
            };
        }

        public entry fun set_creator_royalty(
            account: &signer,
            marketplace_addr: address,
            royalty_percentage: u64
        ) acquires Marketplace {
            let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
            assert!(royalty_percentage <= 30, EMAX_ROYALTY_EXCEEDED);
            table::upsert(&mut marketplace.creator_royalties, signer::address_of(account), royalty_percentage);
        }

        // Fixed: Escrows the buyer's offer amount so `accept_offer` actually pays the seller from the buyer's funds
        public entry fun make_offer(
            account: &signer,
            marketplace_addr: address,
            nft_id: u64,
            offer_price: u64,
            expiration: u64
        ) acquires Marketplace {
            let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
            let buyer_addr = signer::address_of(account);

            assert!(nft_id < vector::length(&marketplace.nfts), ENFT_NOT_FOUND);
            let nft = vector::borrow(&marketplace.nfts, nft_id);
            assert!(nft.owner != buyer_addr, ECANNOT_BUY_OWN_NFT);
            assert!(offer_price > 0, EINVALID_PRICE);
            assert!(expiration > timestamp::now_seconds(), EINVALID_EXPIRATION);

            if (!table::contains(&marketplace.offers, nft_id)) {
                table::add(&mut marketplace.offers, nft_id, vector::empty<Offer>());
            };
            if (!table::contains(&marketplace.offer_escrow, nft_id)) {
                table::add(&mut marketplace.offer_escrow, nft_id, table::new<u64, Coin<AptosCoin>>());
            };

            let offers = table::borrow_mut(&mut marketplace.offers, nft_id);
            let offer_index = vector::length(offers);

            let escrowed_payment = coin::withdraw<AptosCoin>(account, offer_price);
            let nft_escrow_table = table::borrow_mut(&mut marketplace.offer_escrow, nft_id);
            table::add(nft_escrow_table, offer_index, escrowed_payment);

            let offer = Offer {
                nft_id,
                buyer: buyer_addr,
                price: offer_price,
                expiration,
                status: 0
            };
            vector::push_back(offers, offer);

            event::emit_event(&mut marketplace.offer_events, OfferCreatedEvent {
                nft_id,
                buyer: buyer_addr,
                price: offer_price,
                expiration
            });
        }

        // Fixed: Disburses the buyer's escrowed offer coins to the seller, creator, and marketplace!
        public entry fun accept_offer(
            account: &signer,
            marketplace_addr: address,
            nft_id: u64,
            offer_index: u64
        ) acquires Marketplace {
            let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
            assert!(nft_id < vector::length(&marketplace.nfts), ENFT_NOT_FOUND);
            assert!(!has_active_auction(&marketplace.auctions, nft_id), ENFT_IN_AUCTION);

            let nft_ref = vector::borrow_mut(&mut marketplace.nfts, nft_id);
            let seller_addr = signer::address_of(account);
            assert!(nft_ref.owner == seller_addr, 1007);

            let offers = table::borrow_mut(&mut marketplace.offers, nft_id);
            let offer = vector::borrow_mut(offers, offer_index);
            assert!(offer.expiration > timestamp::now_seconds(), EOFFER_EXPIRED);
            assert!(offer.status == 0, EOFFER_NOT_PENDING);

            offer.status = 1;

            let nft_escrow_table = table::borrow_mut(&mut marketplace.offer_escrow, nft_id);
            let payment_coin = table::remove(nft_escrow_table, offer_index);
            let total_price = coin::value(&payment_coin);

            let marketplace_fee = (((total_price as u128) * (MARKETPLACE_FEE_PERCENT as u128)) / 100 as u64);
            if (marketplace_fee > 0) {
                let fee_coin = coin::extract(&mut payment_coin, marketplace_fee);
                coin::deposit<AptosCoin>(marketplace_addr, fee_coin);
            };

            let creator_addr = nft_ref.creator;
            if (table::contains(&marketplace.creator_royalties, creator_addr)) {
                let creator_royalty = *table::borrow(&marketplace.creator_royalties, creator_addr);
                let royalty_amount = (((total_price as u128) * (creator_royalty as u128)) / 100 as u64);
                if (royalty_amount > 0 && creator_addr != seller_addr) {
                    let royalty_coin = coin::extract(&mut payment_coin, royalty_amount);
                    coin::deposit<AptosCoin>(creator_addr, royalty_coin);
                };
            };

            // Deposit remaining proceeds to seller
            coin::deposit<AptosCoin>(seller_addr, payment_coin);

            let was_listed = nft_ref.for_sale;
            let rarity = nft_ref.rarity;
            nft_ref.owner = offer.buyer;
            nft_ref.for_sale = false;
            nft_ref.price = 0;

            record_sale_stats(&mut marketplace.stats, total_price, rarity, was_listed);

            event::emit_event(&mut marketplace.offer_status_events, OfferStatusChangedEvent {
                nft_id,
                buyer: offer.buyer,
                price: offer.price,
                new_status: 1
            });
        }

        // Added: Allows buyer to cancel their pending/expired offer and reclaim escrowed APT
        public entry fun cancel_offer(
            account: &signer,
            marketplace_addr: address,
            nft_id: u64,
            offer_index: u64
        ) acquires Marketplace {
            let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
            let caller = signer::address_of(account);
            let offers = table::borrow_mut(&mut marketplace.offers, nft_id);
            let offer = vector::borrow_mut(offers, offer_index);

            assert!(offer.buyer == caller, ENOT_OWNER);
            assert!(offer.status == 0, EOFFER_NOT_PENDING);

            offer.status = 3; // cancelled/expired

            let nft_escrow_table = table::borrow_mut(&mut marketplace.offer_escrow, nft_id);
            let refund_coin = table::remove(nft_escrow_table, offer_index);
            coin::deposit<AptosCoin>(offer.buyer, refund_coin);

            event::emit_event(&mut marketplace.offer_status_events, OfferStatusChangedEvent {
                nft_id,
                buyer: offer.buyer,
                price: offer.price,
                new_status: 3
            });
        }

        #[view]
        public fun get_marketplace_stats(
            marketplace_addr: address
        ): (u64, u64, u64, vector<SalesHistory>) acquires Marketplace {
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

        #[view]
        public fun get_active_auctions(marketplace_addr: address): vector<Auction> acquires Marketplace {
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            let active_auctions = vector::empty<Auction>();

            let auctions_len = vector::length(&marketplace.auctions);
            let mut_i = 0;
            while (mut_i < auctions_len) {
                let auction = vector::borrow(&marketplace.auctions, mut_i);
                if (auction.active) {
                    vector::push_back(&mut active_auctions, *auction);
                };
                mut_i = mut_i + 1;
            };

            active_auctions
        }

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
