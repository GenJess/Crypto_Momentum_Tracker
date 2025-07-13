"use client"

import type React from "react"

import { useState } from "react"
import {
  TrendingUp,
  TrendingDown,
  Search,
  Settings,
  Bell,
  User,
  Activity,
  DollarSign,
  Zap,
  Brain,
  Grid3X3,
  List,
  ArrowLeft,
  BarChart3,
} from "lucide-react"
import { Sparkline } from "./sparkline"
import { cryptoMarketData } from "./marketData"

const categoryIcons = {
  defi: <Zap className="h-4 w-4" />,
  meme: <TrendingUp className="h-4 w-4" />,
  layer1: <DollarSign className="h-4 w-4" />,
  ai: <Brain className="h-4 w-4" />,
}

const categoryColors = {
  defi: "from-purple-500/20 to-pink-500/20 border-purple-500/30",
  meme: "from-orange-500/20 to-yellow-500/20 border-orange-500/30",
  layer1: "from-blue-500/20 to-cyan-500/20 border-blue-500/30",
  ai: "from-green-500/20 to-emerald-500/20 border-green-500/30",
}

const timeframes = [
  { label: "1H", value: "1h" },
  { label: "4H", value: "4h" },
  { label: "1D", value: "1d" },
  { label: "1W", value: "1w" },
  { label: "1M", value: "1m" },
  { label: "3M", value: "3m" },
  { label: "1Y", value: "1y" },
]

// Enhanced Chart Component
function TradingChart({ crypto, timeframe }: { crypto: any; timeframe: string }) {
  // Generate sample chart data based on timeframe
  const generateChartData = () => {
    const points = timeframe === "1h" ? 60 : timeframe === "4h" ? 96 : timeframe === "1d" ? 144 : 200
    const basePrice = crypto.value
    const volatility = crypto.symbol === "BTC" ? 0.02 : crypto.symbol.includes("MEME") ? 0.08 : 0.05

    const data = []
    let currentPrice = basePrice * 0.95 // Start slightly lower

    for (let i = 0; i < points; i++) {
      const change = (Math.random() - 0.5) * volatility * basePrice
      currentPrice += change
      data.push({
        time: i,
        price: Math.max(currentPrice, basePrice * 0.8), // Prevent going too low
        volume: Math.random() * 1000000,
      })
    }

    // Ensure we end near the current price
    data[data.length - 1].price = basePrice
    return data
  }

  const chartData = generateChartData()
  const minPrice = Math.min(...chartData.map((d) => d.price))
  const maxPrice = Math.max(...chartData.map((d) => d.price))
  const priceRange = maxPrice - minPrice

  return (
    <div className="h-96 w-full bg-gradient-to-br from-[#1e1f2a] to-[#252631] rounded-xl border border-gray-700/50 p-6">
      <div className="h-full relative">
        <svg width="100%" height="100%" className="overflow-visible">
          <defs>
            <linearGradient id="priceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={crypto.change > 0 ? "#10b981" : "#ef4444"} stopOpacity="0.3" />
              <stop offset="100%" stopColor={crypto.change > 0 ? "#10b981" : "#ef4444"} stopOpacity="0.05" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <g key={i}>
              <line
                x1="0"
                y1={`${ratio * 100}%`}
                x2="100%"
                y2={`${ratio * 100}%`}
                stroke="#374151"
                strokeWidth="0.5"
                strokeDasharray="2,2"
                opacity="0.3"
              />
              <text x="10" y={`${ratio * 100}%`} dy="-5" fill="#9ca3af" fontSize="10" fontFamily="monospace">
                ${(maxPrice - ratio * priceRange).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </text>
            </g>
          ))}

          {/* Price line */}
          <path
            d={`M ${chartData
              .map((d, i) => `${(i / (chartData.length - 1)) * 100}% ${((maxPrice - d.price) / priceRange) * 100}%`)
              .join(" L ")}`}
            fill="none"
            stroke={crypto.change > 0 ? "#10b981" : "#ef4444"}
            strokeWidth="2"
            filter="url(#glow)"
          />

          {/* Area fill */}
          <path
            d={`M ${chartData
              .map((d, i) => `${(i / (chartData.length - 1)) * 100}% ${((maxPrice - d.price) / priceRange) * 100}%`)
              .join(" L ")} L 100% 100% L 0% 100% Z`}
            fill="url(#priceGradient)"
          />

          {/* Time axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <text
              key={i}
              x={`${ratio * 100}%`}
              y="100%"
              dy="15"
              fill="#9ca3af"
              fontSize="10"
              textAnchor="middle"
              fontFamily="monospace"
            >
              {timeframe === "1h"
                ? `${Math.floor(ratio * 60)}m`
                : timeframe === "4h"
                  ? `${Math.floor(ratio * 4)}h`
                  : timeframe === "1d"
                    ? `${Math.floor(ratio * 24)}h`
                    : `${Math.floor(ratio * 30)}d`}
            </text>
          ))}
        </svg>
      </div>
    </div>
  )
}

export default function CryptoTerminal() {
  const [data, setData] = useState(cryptoMarketData)
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards")
  const [selectedCrypto, setSelectedCrypto] = useState<any>(null)
  const [selectedTimeframe, setSelectedTimeframe] = useState("1d")

  const formatPrice = (price: number) => {
    if (price < 0.001) {
      return price.toFixed(8)
    } else if (price < 1) {
      return price.toFixed(4)
    } else if (price < 100) {
      return price.toFixed(2)
    } else {
      return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
  }

  const getAllCryptos = () => {
    return [
      ...data.layer1.map((c) => ({ ...c, category: "Layer 1", categoryKey: "layer1" })),
      ...data.defi.map((c) => ({ ...c, category: "DeFi", categoryKey: "defi" })),
      ...data.ai.map((c) => ({ ...c, category: "AI", categoryKey: "ai" })),
      ...data.meme.map((c) => ({ ...c, category: "Meme", categoryKey: "meme" })),
    ]
  }

  const renderCryptoCard = (crypto: any, categoryKey: string) => (
    <div
      key={crypto.id}
      onClick={() => setSelectedCrypto(crypto)}
      className={`bg-gradient-to-br ${categoryColors[categoryKey as keyof typeof categoryColors]} 
        backdrop-blur-sm rounded-xl p-4 border transition-all duration-200 hover:scale-[1.02] 
        hover:shadow-lg hover:shadow-purple-500/10 cursor-pointer group`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-semibold">
            {crypto.symbol.charAt(0)}
          </div>
          <div>
            <div className="font-semibold text-white text-sm">{crypto.symbol}</div>
            <div className="text-xs text-gray-400">{crypto.name}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-white font-mono text-sm">${formatPrice(crypto.value)}</div>
          <div className="text-xs text-gray-400">{crypto.time}</div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {crypto.change > 0 ? (
            <TrendingUp className="h-3 w-3 text-green-400" />
          ) : (
            <TrendingDown className="h-3 w-3 text-red-400" />
          )}
          <span className={`text-xs font-medium ${crypto.change > 0 ? "text-green-400" : "text-red-400"}`}>
            {crypto.change > 0 ? "+" : ""}
            {crypto.pctChange.toFixed(2)}%
          </span>
        </div>
        <div className="text-xs text-gray-400">Vol: {crypto.volume}</div>
      </div>

      <div className="flex items-center justify-between">
        <Sparkline
          data={Array.from({ length: 10 }, () => Math.random())}
          width={80}
          height={20}
          isPositive={crypto.change > 0}
        />
        <div className="text-xs text-gray-400">MCap: {crypto.marketCap}</div>
      </div>

      <div className="mt-2 pt-2 border-t border-gray-700/50">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 bg-gray-800/50 px-2 py-1 rounded-full">{crypto.category}</span>
          <div className={`text-xs font-medium ${crypto.change > 0 ? "text-green-400" : "text-red-400"}`}>
            {crypto.change > 0 ? "+" : ""}
            {formatPrice(crypto.change)}
          </div>
        </div>
      </div>
    </div>
  )

  const renderTableView = () => (
    <div className="bg-gradient-to-br from-[#1e1f2a] to-[#252631] rounded-xl border border-gray-700/50 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700/50">
              <th className="text-left p-4 text-sm font-medium text-gray-400">Asset</th>
              <th className="text-right p-4 text-sm font-medium text-gray-400">Price</th>
              <th className="text-right p-4 text-sm font-medium text-gray-400">24h Change</th>
              <th className="text-right p-4 text-sm font-medium text-gray-400">Volume</th>
              <th className="text-right p-4 text-sm font-medium text-gray-400">Market Cap</th>
              <th className="text-center p-4 text-sm font-medium text-gray-400">Chart</th>
              <th className="text-center p-4 text-sm font-medium text-gray-400">Category</th>
            </tr>
          </thead>
          <tbody>
            {getAllCryptos().map((crypto, index) => (
              <tr
                key={crypto.id}
                onClick={() => setSelectedCrypto(crypto)}
                className="border-b border-gray-700/30 hover:bg-gray-800/20 cursor-pointer transition-colors"
              >
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-semibold">
                      {crypto.symbol.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-white text-sm">{crypto.symbol}</div>
                      <div className="text-xs text-gray-400">{crypto.name}</div>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-right">
                  <div className="text-white font-mono">${formatPrice(crypto.value)}</div>
                </td>
                <td className="p-4 text-right">
                  <div
                    className={`flex items-center justify-end gap-1 ${crypto.change > 0 ? "text-green-400" : "text-red-400"}`}
                  >
                    {crypto.change > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    <span className="font-medium">
                      {crypto.change > 0 ? "+" : ""}
                      {crypto.pctChange.toFixed(2)}%
                    </span>
                  </div>
                </td>
                <td className="p-4 text-right text-gray-300">{crypto.volume}</td>
                <td className="p-4 text-right text-gray-300">{crypto.marketCap}</td>
                <td className="p-4 text-center">
                  <Sparkline
                    data={Array.from({ length: 10 }, () => Math.random())}
                    width={60}
                    height={20}
                    isPositive={crypto.change > 0}
                  />
                </td>
                <td className="p-4 text-center">
                  <span className="text-xs text-gray-500 bg-gray-800/50 px-2 py-1 rounded-full">{crypto.category}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderSection = (title: string, items: any[], categoryKey: string, icon: React.ReactNode) => (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/30">{icon}</div>
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <p className="text-sm text-gray-400">{items.length} assets</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {items.map((item) => renderCryptoCard(item, categoryKey))}
      </div>
    </div>
  )

  if (selectedCrypto) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1b23] via-[#1e1f2a] to-[#1a1b23] flex">
        {/* Sidebar */}
        <div className="w-80 bg-[#21222d]/80 backdrop-blur-xl border-r border-gray-800/50 flex flex-col">
          <div className="p-4 border-b border-gray-800/50">
            <button
              onClick={() => setSelectedCrypto(null)}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Markets
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                {selectedCrypto.symbol.charAt(0)}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">{selectedCrypto.symbol}</h2>
                <p className="text-sm text-gray-400">{selectedCrypto.name}</p>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-4">
            <div className="bg-gradient-to-br from-[#1e1f2a] to-[#252631] rounded-lg p-4 border border-gray-700/50">
              <div className="text-2xl font-bold text-white font-mono mb-1">${formatPrice(selectedCrypto.value)}</div>
              <div
                className={`flex items-center gap-2 ${selectedCrypto.change > 0 ? "text-green-400" : "text-red-400"}`}
              >
                {selectedCrypto.change > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                <span className="font-medium">
                  {selectedCrypto.change > 0 ? "+" : ""}
                  {selectedCrypto.pctChange.toFixed(2)}%
                </span>
                <span className="text-sm">
                  ({selectedCrypto.change > 0 ? "+" : ""}
                  {formatPrice(selectedCrypto.change)})
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Volume (24h)</span>
                <span className="text-white">{selectedCrypto.volume}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Market Cap</span>
                <span className="text-white">{selectedCrypto.marketCap}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Category</span>
                <span className="text-purple-400">{selectedCrypto.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Last Updated</span>
                <span className="text-white">{selectedCrypto.time}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Chart Area */}
        <div className="flex-1 flex flex-col">
          <div className="p-6 border-b border-gray-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold text-white">{selectedCrypto.symbol}/USD</h1>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-purple-400" />
                  <span className="text-gray-400">Trading Chart</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {timeframes.map((tf) => (
                  <button
                    key={tf.value}
                    onClick={() => setSelectedTimeframe(tf.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      selectedTimeframe === tf.value
                        ? "bg-purple-500 text-white"
                        : "bg-[#2a2d3a] text-gray-400 hover:text-white hover:bg-[#3a3d4a]"
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 p-6">
            <TradingChart crypto={selectedCrypto} timeframe={selectedTimeframe} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1b23] via-[#1e1f2a] to-[#1a1b23]">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#21222d]/80 backdrop-blur-xl border-b border-gray-800/50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">CryptoTerminal</h1>
                  <p className="text-xs text-gray-400">Real-time crypto markets</p>
                </div>
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-[#2a2d3a] rounded-lg p-1">
                <button
                  onClick={() => setViewMode("cards")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all ${
                    viewMode === "cards" ? "bg-purple-500 text-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  <Grid3X3 className="h-4 w-4" />
                  Cards
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all ${
                    viewMode === "table" ? "bg-purple-500 text-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  <List className="h-4 w-4" />
                  Table
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search assets..."
                  className="w-64 pl-10 pr-4 py-2 bg-[#2a2d3a] border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <button className="p-2 rounded-lg bg-[#2a2d3a] border border-gray-700 hover:bg-[#3a3d4a] transition-colors">
                <Bell className="h-4 w-4 text-gray-400" />
              </button>
              <button className="p-2 rounded-lg bg-[#2a2d3a] border border-gray-700 hover:bg-[#3a3d4a] transition-colors">
                <Settings className="h-4 w-4 text-gray-400" />
              </button>
              <button className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition-all">
                <User className="h-4 w-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Market Overview */}
      <div className="px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-xl p-4 border border-green-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Market Cap</p>
                <p className="text-2xl font-bold text-white">$2.1T</p>
                <p className="text-sm text-green-400">+2.4%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-400" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-sm rounded-xl p-4 border border-blue-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">24h Volume</p>
                <p className="text-2xl font-bold text-white">$89.2B</p>
                <p className="text-sm text-blue-400">+12.1%</p>
              </div>
              <Activity className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-xl p-4 border border-purple-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">BTC Dominance</p>
                <p className="text-2xl font-bold text-white">54.2%</p>
                <p className="text-sm text-purple-400">-0.8%</p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-400" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-orange-500/20 to-yellow-500/20 backdrop-blur-sm rounded-xl p-4 border border-orange-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Fear & Greed</p>
                <p className="text-2xl font-bold text-white">72</p>
                <p className="text-sm text-orange-400">Greed</p>
              </div>
              <Brain className="h-8 w-8 text-orange-400" />
            </div>
          </div>
        </div>

        {/* Main Content */}
        {viewMode === "table" ? (
          renderTableView()
        ) : (
          <>
            {renderSection("Layer 1 Blockchains", data.layer1, "layer1", categoryIcons.layer1)}
            {renderSection("DeFi Protocols", data.defi, "defi", categoryIcons.defi)}
            {renderSection("AI & Computing", data.ai, "ai", categoryIcons.ai)}
            {renderSection("Meme Coins", data.meme, "meme", categoryIcons.meme)}
          </>
        )}
      </div>
    </div>
  )
}
