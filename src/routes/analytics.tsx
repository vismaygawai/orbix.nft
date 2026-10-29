import { createFileRoute } from "@tanstack/react-router";
import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  aptosClient,
  MARKETPLACE_CONTRACT_ADDRESS,
  octasToApt,
  RARITY_MAP,
  APTOS_NETWORK,
} from "@/lib/aptosClient";
import {
  TrendingUp,
  Activity,
  Layers,
  RefreshCw,
  Loader2,
  BarChart3,
  AlertCircle,
} from "lucide-react";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Marketplace Analytics — orbix.nft" },
      {
        name: "description",
        content: "On-chain sales metrics, volume, and rarity breakdown on Aptos.",
      },
    ],
  }),
  component: AnalyticsPage,
});

interface StatsData {
  totalSales: number;
  totalVolumeApt: number;
  activeListings: number;
  salesHistory: Array<{ date: string; sales: number; volume: number }>;
  salesByRarity: Array<{ name: string; sales: number; volume: number }>;
}

function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [stats, setStats] = useState<StatsData>({
    totalSales: 0,
    totalVolumeApt: 0,
    activeListings: 0,
    salesHistory: [],
    salesByRarity: [],
  });

  const fetchAnalytics = async () => {
    setLoading(true);
    setHasError(false);
    try {
      // Parallelize queries across basic stats, rarity sales, and active listings
      const [basicStats, rarityStats, forSaleRes]: [any, any, any] = await Promise.all([
        aptosClient
          .view({
            function: `${MARKETPLACE_CONTRACT_ADDRESS}::NFTMarketplace::get_marketplace_stats`,
            arguments: [MARKETPLACE_CONTRACT_ADDRESS],
            type_arguments: [],
          })
          .catch(() => [0, 0, 0, []]),
        aptosClient
          .view({
            function: `${MARKETPLACE_CONTRACT_ADDRESS}::NFTMarketplace::get_sales_by_rarity`,
            arguments: [MARKETPLACE_CONTRACT_ADDRESS],
            type_arguments: [],
          })
          .catch(() => [[]]),
        aptosClient
          .view({
            function: `${MARKETPLACE_CONTRACT_ADDRESS}::NFTMarketplace::get_all_nfts_for_sale`,
            type_arguments: [],
            arguments: [MARKETPLACE_CONTRACT_ADDRESS, "100", "0"],
          })
          .catch(() => [[]]),
      ]);

      let liveActiveListings = Number(basicStats?.[2] || 0);
      if (Array.isArray(forSaleRes?.[0])) {
        liveActiveListings = Math.max(liveActiveListings, forSaleRes[0].length);
      }

      // Aggregate history entries by day
      const rawHistory = Array.isArray(basicStats?.[3]) ? (basicStats[3] as any[]) : [];
      const dayMap = new Map<string, { date: string; sales: number; dayVolume: number }>();

      for (const item of rawHistory) {
        const itemSecs = Number(item.date);
        const dateKey = new Date(itemSecs * 1000).toLocaleDateString([], {
          month: "short",
          day: "numeric",
        });
        const current = dayMap.get(dateKey) || { date: dateKey, sales: 0, dayVolume: 0 };
        current.sales += Number(item.sales);
        current.dayVolume += octasToApt(item.volume);
        dayMap.set(dateKey, current);
      }

      let runningVolume = 0;
      const aggregatedHistory = Array.from(dayMap.values()).map((entry) => {
        runningVolume = Number((runningVolume + entry.dayVolume).toFixed(4));
        return {
          date: entry.date,
          sales: entry.sales,
          volume: runningVolume,
        };
      });

      // Parse rarity
      const rawRarity = Array.isArray(rarityStats?.[0]) ? rarityStats[0] : [];
      const parsedRarity = [1, 2, 3, 4].map((tier) => {
        const found = rawRarity.find((r: any) => Number(r.rarity) === tier);
        return {
          name: RARITY_MAP[tier]?.label || `Tier ${tier}`,
          sales: found ? Number(found.sales) : 0,
          volume: found ? octasToApt(found.volume) : 0,
        };
      });

      setStats({
        totalSales: Number(basicStats?.[0] || 0),
        totalVolumeApt: octasToApt(basicStats?.[1] || 0),
        activeListings: liveActiveListings,
        salesHistory: aggregatedHistory,
        salesByRarity: parsedRarity,
      });
    } catch (err) {
      console.error("Error fetching analytics:", err);
      setHasError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return (
    <div className="max-w-[1831px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16 py-10 space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/10">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-neon">
            On-Chain Insights
          </span>
          <h1 className="font-grotesk uppercase text-4xl sm:text-5xl md:text-6xl text-cream tracking-wide mt-1">
            Marketplace Analytics
          </h1>
          <p className="text-xs font-mono text-cream/60 mt-1">
            Real-time transaction volume and sales distributions pulled straight from Aptos Move
            storage.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={fetchAnalytics}
          disabled={loading}
          className="liquid-glass text-cream border-white/20 hover:bg-white/10 font-mono text-xs flex items-center gap-2 rounded-xl cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Metrics</span>
        </Button>
      </div>

      {hasError ? (
        <div className="py-20 liquid-glass rounded-3xl border border-rose-500/30 text-center space-y-4 p-8 max-w-md mx-auto">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
          <h3 className="font-grotesk uppercase text-2xl text-cream">Analytics Unavailable</h3>
          <p className="text-xs font-mono text-cream/60 leading-relaxed">
            Could not retrieve marketplace contract stats from the Aptos ledger. Please check
            network connectivity.
          </p>
          <Button
            onClick={fetchAnalytics}
            className="orb-button text-cream font-mono text-xs px-6 py-2 rounded-xl uppercase cursor-pointer"
          >
            Retry
          </Button>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="liquid-glass p-5 sm:p-6 rounded-3xl border border-white/10 relative overflow-hidden group">
              <div className="flex items-center justify-between text-xs font-mono text-cream/60 mb-2">
                <span>Total Volume</span>
                <TrendingUp className="w-4 h-4 text-neon" />
              </div>
              <div className="font-grotesk text-3xl sm:text-4xl text-cream">
                {stats.totalVolumeApt} <span className="text-neon text-xl">APT</span>
              </div>
              <p className="text-[11px] font-mono text-cream/40 mt-2">
                Aggregated gross value traded on Orbix
              </p>
            </div>

            <div className="liquid-glass p-5 sm:p-6 rounded-3xl border border-white/10 relative overflow-hidden group">
              <div className="flex items-center justify-between text-xs font-mono text-cream/60 mb-2">
                <span>Total Sales Completed</span>
                <Activity className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="font-grotesk text-3xl sm:text-4xl text-cream">{stats.totalSales}</div>
              <p className="text-[11px] font-mono text-cream/40 mt-2">
                Direct marketplace sales & settled auctions
              </p>
            </div>

            <div className="liquid-glass p-5 sm:p-6 rounded-3xl border border-white/10 relative overflow-hidden group">
              <div className="flex items-center justify-between text-xs font-mono text-cream/60 mb-2">
                <span>Active Listings</span>
                <Layers className="w-4 h-4 text-blue-400" />
              </div>
              <div className="font-grotesk text-3xl sm:text-4xl text-cream">
                {stats.activeListings}
              </div>
              <p className="text-[11px] font-mono text-cream/40 mt-2">
                Objects currently available for purchase
              </p>
            </div>
          </div>

          {/* Charts Section */}
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-cream/50 font-mono text-sm">
              <Loader2 className="w-8 h-8 animate-spin text-neon" />
              <span>Crunching on-chain metrics...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              {/* Sales by Rarity Chart */}
              <div className="liquid-glass p-4 sm:p-8 rounded-3xl border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-grotesk uppercase text-xl sm:text-2xl text-cream">
                      Sales by Rarity
                    </h3>
                    <p className="text-xs font-mono text-cream/60">
                      Volume (APT) distribution per tier
                    </p>
                  </div>
                  <BarChart3 className="w-5 h-5 text-neon" />
                </div>

                <div className="h-72 w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.salesByRarity}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" stroke="#ec4899" fontSize={11} fontFamily="monospace" />
                      <YAxis stroke="#ec4899" fontSize={11} fontFamily="monospace" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(10, 10, 24, 0.95)",
                          borderColor: "rgba(255, 255, 255, 0.15)",
                          borderRadius: "16px",
                          color: "#fff",
                          fontFamily: "monospace",
                          fontSize: "12px",
                        }}
                      />
                      <Bar
                        dataKey="volume"
                        name="Volume (APT)"
                        fill="#ec4899"
                        radius={[8, 8, 0, 0]}
                      />
                      <Bar
                        dataKey="sales"
                        name="Sales Count"
                        fill="#3b82f6"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Sales History Line Chart */}
              <div className="liquid-glass p-4 sm:p-8 rounded-3xl border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-grotesk uppercase text-xl sm:text-2xl text-cream">
                      Historical Volume
                    </h3>
                    <p className="text-xs font-mono text-cream/60">Cumulative volume over time</p>
                  </div>
                  <TrendingUp className="w-5 h-5 text-neon" />
                </div>

                <div className="h-72 w-full pt-4">
                  {stats.salesHistory.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-cream/40 font-mono text-xs">
                      <TrendingUp className="w-8 h-8 mb-2 opacity-30" />
                      <span>
                        No historical time-series entries recorded yet on{" "}
                        {APTOS_NETWORK.toUpperCase()}.
                      </span>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={stats.salesHistory}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                          dataKey="date"
                          stroke="#ec4899"
                          fontSize={11}
                          fontFamily="monospace"
                        />
                        <YAxis stroke="#ec4899" fontSize={11} fontFamily="monospace" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(10, 10, 24, 0.95)",
                            borderColor: "rgba(255, 255, 255, 0.15)",
                            borderRadius: "16px",
                            color: "#fff",
                            fontFamily: "monospace",
                            fontSize: "12px",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="volume"
                          name="Volume (APT)"
                          stroke="#ec4899"
                          strokeWidth={3}
                          dot={{ fill: "#ec4899", r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
