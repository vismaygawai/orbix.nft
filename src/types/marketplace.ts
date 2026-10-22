export interface NFT {
  id: number;
  owner: string;
  name: string;
  description: string;
  uri: string;
  price: number; // in octas
  for_sale: boolean;
  rarity: number; // 1: Common, 2: Uncommon, 3: Rare, 4: Epic
}

export interface ListedNFT {
  id: number;
  price: number;
  rarity: number;
}

export interface Auction {
  nft_id: number;
  start_price: number;
  current_bid: number;
  highest_bidder: string;
  end_time: number; // unix timestamp in seconds
  active: boolean;
}

export interface Offer {
  nft_id: number;
  buyer: string;
  price: number;
  expiration: number;
  status: number; // 0: pending, 1: accepted, 2: rejected, 3: expired
}

export interface SalesHistory {
  date: number;
  sales: number;
  volume: number;
}

export interface RaritySales {
  rarity: number;
  sales: number;
  volume: number;
}

export interface MarketplaceStats {
  total_sales: number;
  total_volume: number;
  active_listings: number;
  sales_history: SalesHistory[];
  sales_by_rarity: RaritySales[];
}
