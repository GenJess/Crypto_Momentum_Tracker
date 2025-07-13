"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import {
  RotateCcw,
  Plus,
  X,
  Search,
  TrendingUp,
  TrendingDown,
  Zap,
  Clock,
  Target,
  Activity,
  BarChart3,
  List,
  ArrowLeft,
  ChevronUp,
  ChevronDown,
} from "lucide-react"

// Types
interface CoinData {
  id: string // Unique identifier
  symbol: string
  name: string
  currentPrice: number
  startPrice: number
  changesSinceStart: number
  dailyChange: number
  change5min: number
  rateOfChange: number
  lastUpdated: number
  priceHistory: Array<{ price: number; timestamp: number; changesSinceStart: number }>
}

interface WatchlistData {
  startTime: number | null
  coins: CoinData[]
}

type SortField = "changesSinceStart" | "rateOfChange" | "dailyChange" | "currentPrice"
type SortDirection = "asc" | "desc"

// Mock WebSocket data for preview
const MOCK_COINS = [
  { symbol: "BTCUSDT", name: "Bitcoin", basePrice: 67234.56 },
  { symbol: "ETHUSDT", name: "Ethereum", basePrice: 3456.78 },
  { symbol: "SOLUSDT", name: "Solana", basePrice: 189.45 },
  { symbol: "ADAUSDT", name: "Cardano", basePrice: 0.4567 },
  { symbol: "DOGEUSDT", name: "Dogecoin", basePrice: 0.0847 },
  { symbol: "AVAXUSDT", name: "Avalanche", basePrice: 34.56 },
  { symbol: "UNIUSDT", name: "Uniswap", basePrice: 8.42 },
  { symbol: "LINKUSDT", name: "Chainlink", basePrice: 14.23 },
]

// Generate unique ID for coins
const generateCoinId = (symbol: string) => `${symbol}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// Enhanced WebSocket Hook with proper connection management
const useWebSocket = (symbols: string[]) => {
  const [data, setData] = useState<Map<string, number>>(new Map())
  const intervalRef = useRef<NodeJS.Timeout>()
  const lastUpdateRef = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    if (symbols.length === 0) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }

    // Initialize prices for new symbols
    symbols.forEach((symbol) => {
      if (!lastUpdateRef.current.has(symbol)) {
        const mockCoin = MOCK_COINS.find((c) => c.symbol === symbol)
        if (mockCoin) {
          lastUpdateRef.current.set(symbol, mockCoin.basePrice)
          setData((prev) => new Map(prev.set(symbol, mockCoin.basePrice)))
        }
      }
    })

    // Mock WebSocket with realistic price movements
    intervalRef.current = setInterval(() => {
      const newData = new Map()
      symbols.forEach((symbol) => {
        const mockCoin = MOCK_COINS.find((c) => c.symbol === symbol)
        if (mockCoin) {
          // Generate realistic price movement
          const volatility = symbol.includes("DOGE") ? 0.02 : symbol.includes("BTC") ? 0.005 : 0.01
          const change = (Math.random() - 0.5) * volatility
          const currentPrice = lastUpdateRef.current.get(symbol) || mockCoin.basePrice
          const newPrice = Math.max(currentPrice * (1 + change), mockCoin.basePrice * 0.8)

          lastUpdateRef.current.set(symbol, newPrice)
          newData.set(symbol, newPrice)
        }
      })
      setData(newData)
    }, 250)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [symbols.join(",")]) // Re-run when symbols change

  return data
}

// Utility functions
const calculateChangesSinceStart = (currentPrice: number, startPrice: number): number => {
  if (!startPrice) return 0
  return ((currentPrice - startPrice) / startPrice) * 100
}

const calculateRateOfChange = (priceHistory: Array<{ price: number; timestamp: number }>): number => {
  if (priceHistory.length < 2) return 0

  // Calculate slope of recent price changes (last 60 seconds)
  const now = Date.now()
  const recentHistory = priceHistory.filter((p) => now - p.timestamp <= 60000)

  if (recentHistory.length < 2) return 0

  const timeSpan = recentHistory[recentHistory.length - 1].timestamp - recentHistory[0].timestamp
  const priceChange = recentHistory[recentHistory.length - 1].price - recentHistory[0].price
  const startPrice = recentHistory[0].price

  if (timeSpan === 0 || startPrice === 0) return 0

  // Rate of change as % per minute
  return ((priceChange / startPrice) * 100 * 60000) / timeSpan
}

const formatPrice = (price: number): string => {
  if (price < 0.001) return price.toFixed(8)
  if (price < 1) return price.toFixed(4)
  if (price < 100) return price.toFixed(2)
  return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const formatPercentage = (pct: number): string => {
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(3)}%`
}

// Enhanced Chart Component
function MomentumChart({ coin, startTime }: { coin: CoinData; startTime: number | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !coin || !startTime) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set proper scaling for retina displays
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height)

    // Filter data since start time
    const chartData = coin.priceHistory.filter((p) => p.timestamp >= startTime)
    if (chartData.length < 2) return

    const padding = 40
    const chartWidth = rect.width - padding * 2
    const chartHeight = rect.height - padding * 2

    // Calculate bounds
    const minChange = Math.min(...chartData.map((d) => d.changesSinceStart))
    const maxChange = Math.max(...chartData.map((d) => d.changesSinceStart))
    const changeRange = Math.max(maxChange - minChange, 0.1) // Minimum range

    const timeRange = chartData[chartData.length - 1].timestamp - chartData[0].timestamp

    // Draw grid lines
    ctx.strokeStyle = "#374151"
    ctx.lineWidth = 0.5
    ctx.setLineDash([2, 2])

    // Horizontal grid lines (percentage levels)
    const gridLevels = 5
    for (let i = 0; i <= gridLevels; i++) {
      const y = padding + (i / gridLevels) * chartHeight
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(padding + chartWidth, y)
      ctx.stroke()

      // Y-axis labels
      const changeValue = maxChange - (i / gridLevels) * changeRange
      ctx.fillStyle = "#9ca3af"
      ctx.font = "10px monospace"
      ctx.textAlign = "right"
      ctx.fillText(`${changeValue.toFixed(2)}%`, padding - 5, y + 3)
    }

    // Vertical grid lines (time)
    const timeGridLines = 4
    for (let i = 0; i <= timeGridLines; i++) {
      const x = padding + (i / timeGridLines) * chartWidth
      ctx.beginPath()
      ctx.moveTo(x, padding)
      ctx.lineTo(x, padding + chartHeight)
      ctx.stroke()

      // X-axis labels
      const timeValue = chartData[0].timestamp + (i / timeGridLines) * timeRange
      const timeLabel = new Date(timeValue).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      ctx.fillStyle = "#9ca3af"
      ctx.font = "10px monospace"
      ctx.textAlign = "center"
      ctx.fillText(timeLabel, x, padding + chartHeight + 15)
    }

    // Draw zero line
    const zeroY = padding + ((maxChange - 0) / changeRange) * chartHeight
    ctx.setLineDash([])
    ctx.strokeStyle = "#6b7280"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(padding, zeroY)
    ctx.lineTo(padding + chartWidth, zeroY)
    ctx.stroke()

    // Draw price line
    ctx.setLineDash([])
    ctx.strokeStyle = coin.changesSinceStart >= 0 ? "#10b981" : "#ef4444"
    ctx.lineWidth = 2
    ctx.beginPath()

    chartData.forEach((point, index) => {
      const x = padding + (index / (chartData.length - 1)) * chartWidth
      const y = padding + ((maxChange - point.changesSinceStart) / changeRange) * chartHeight

      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })

    ctx.stroke()

    // Add glow effect
    ctx.shadowColor = coin.changesSinceStart >= 0 ? "#10b981" : "#ef4444"
    ctx.shadowBlur = 4
    ctx.stroke()
    ctx.shadowBlur = 0

    // Draw area fill
    ctx.globalAlpha = 0.1
    ctx.fillStyle = coin.changesSinceStart >= 0 ? "#10b981" : "#ef4444"
    ctx.beginPath()
    chartData.forEach((point, index) => {
      const x = padding + (index / (chartData.length - 1)) * chartWidth
      const y = padding + ((maxChange - point.changesSinceStart) / changeRange) * chartHeight

      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.lineTo(padding + chartWidth, zeroY)
    ctx.lineTo(padding, zeroY)
    ctx.closePath()
    ctx.fill()
    ctx.globalAlpha = 1
  }, [coin, startTime])

  if (!coin || !startTime) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Select a coin to view momentum chart</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full">
      <canvas ref={canvasRef} className="w-full h-full" style={{ width: "100%", height: "100%" }} />
    </div>
  )
}

// Mini Sparkline Component
function MiniSparkline({ data, isPositive }: { data: number[]; isPositive: boolean }) {
  if (data.length < 2) return <div className="w-16 h-6" />

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 60
      const y = 20 - ((value - min) / range) * 16
      return `${x},${y}`
    })
    .join(" ")

  return (
    <svg width="60" height="20" className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke={isPositive ? "#10b981" : "#ef4444"}
        strokeWidth="1.5"
        opacity="0.8"
      />
    </svg>
  )
}

// Add Coin Modal Component
function AddCoinModal({
  isOpen,
  onClose,
  onAdd,
  existingSymbols,
}: {
  isOpen: boolean
  onClose: () => void
  onAdd: (coin: any) => void
  existingSymbols: string[]
}) {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredCoins = MOCK_COINS.filter(
    (coin) =>
      !existingSymbols.includes(coin.symbol) &&
      (coin.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        coin.name.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-gradient-to-br from-[#1e1f2a] to-[#252631] rounded-xl border border-gray-700/50 p-6 w-96 max-h-96">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Add Coin to Watchlist</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search coins..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#2a2d3a] border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto">
          {filteredCoins.map((coin) => (
            <button
              key={coin.symbol}
              onClick={() => {
                onAdd(coin)
                onClose()
                setSearchTerm("")
              }}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-[#2a2d3a] hover:bg-[#3a3d4a] transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-semibold">
                {coin.symbol.charAt(0)}
              </div>
              <div>
                <div className="font-medium text-white">{coin.symbol}</div>
                <div className="text-sm text-gray-400">{coin.name}</div>
              </div>
            </button>
          ))}
          {filteredCoins.length === 0 && (
            <div className="text-center py-4 text-gray-400">
              {existingSymbols.length === MOCK_COINS.length ? "All coins already added" : "No coins found"}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Reset Confirmation Modal
function ResetConfirmModal({
  isOpen,
  onClose,
  onConfirm,
}: { isOpen: boolean; onClose: () => void; onConfirm: () => void }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-gradient-to-br from-[#1e1f2a] to-[#252631] rounded-xl border border-gray-700/50 p-6 w-96">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center mx-auto mb-4">
            <RotateCcw className="h-6 w-6 text-orange-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Reset Momentum Tracking?</h3>
          <p className="text-gray-400 mb-6">
            This will reset all "% Since Start" calculations to 0% and clear the marked start time. Your watchlist will
            remain intact.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-[#2a2d3a] border border-gray-700 hover:bg-[#3a3d4a] text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm()
                onClose()
              }}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg transition-all"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MomentumTracker() {
  const [watchlistData, setWatchlistData] = useState<WatchlistData>({
    startTime: null,
    coins: [],
  })
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isResetModalOpen, setIsResetModalOpen] = useState(false)
  const [sortBy, setSortBy] = useState<SortField>("changesSinceStart")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [isTracking, setIsTracking] = useState(false)
  const [viewMode, setViewMode] = useState<"table" | "chart">("table")
  const [selectedCoin, setSelectedCoin] = useState<CoinData | null>(null)

  // Get symbols for WebSocket subscription
  const symbols = watchlistData.coins.map((coin) => coin.symbol)
  const priceData = useWebSocket(symbols)

  // Update coin data when new price data arrives
  useEffect(() => {
    if (priceData.size === 0) return

    setWatchlistData((prev) => ({
      ...prev,
      coins: prev.coins.map((coin) => {
        const newPrice = priceData.get(coin.symbol)
        if (!newPrice) return coin

        const now = Date.now()
        const changesSinceStart = calculateChangesSinceStart(newPrice, coin.startPrice)

        const newPriceHistory = [
          ...coin.priceHistory.slice(-100), // Keep last 100 points
          { price: newPrice, timestamp: now, changesSinceStart },
        ]

        return {
          ...coin,
          currentPrice: newPrice,
          changesSinceStart,
          rateOfChange: calculateRateOfChange(newPriceHistory),
          lastUpdated: now,
          priceHistory: newPriceHistory,
        }
      }),
    }))
  }, [priceData])

  const markStartTime = useCallback(() => {
    const now = Date.now()
    setWatchlistData((prev) => ({
      startTime: now,
      coins: prev.coins.map((coin) => ({
        ...coin,
        startPrice: coin.currentPrice,
        changesSinceStart: 0,
        priceHistory: [{ price: coin.currentPrice, timestamp: now, changesSinceStart: 0 }],
      })),
    }))
    setIsTracking(true)
  }, [])

  const addCoin = useCallback(
    (coinInfo: any) => {
      const currentPrice = priceData.get(coinInfo.symbol) || coinInfo.basePrice
      const now = Date.now()

      const newCoin: CoinData = {
        id: generateCoinId(coinInfo.symbol),
        symbol: coinInfo.symbol,
        name: coinInfo.name,
        currentPrice,
        startPrice: watchlistData.startTime ? currentPrice : 0,
        changesSinceStart: 0,
        dailyChange: (Math.random() - 0.5) * 10, // Mock daily change
        change5min: (Math.random() - 0.5) * 2, // Mock 5min change
        rateOfChange: 0,
        lastUpdated: now,
        priceHistory: [{ price: currentPrice, timestamp: now, changesSinceStart: 0 }],
      }

      setWatchlistData((prev) => ({
        ...prev,
        coins: [...prev.coins, newCoin],
      }))
    },
    [priceData, watchlistData.startTime],
  )

  const removeCoin = useCallback((id: string) => {
    setWatchlistData((prev) => ({
      ...prev,
      coins: prev.coins.filter((coin) => coin.id !== id),
    }))
    // Clear selection if removed coin was selected
    setSelectedCoin((prev) => (prev?.id === id ? null : prev))
  }, [])

  const resetTracking = useCallback(() => {
    setWatchlistData((prev) => ({
      ...prev,
      startTime: null,
      coins: prev.coins.map((coin) => ({
        ...coin,
        startPrice: 0,
        changesSinceStart: 0,
        priceHistory: [],
      })),
    }))
    setIsTracking(false)
    setSelectedCoin(null)
  }, [])

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortBy === field) {
        setSortDirection(sortDirection === "asc" ? "desc" : "asc")
      } else {
        setSortBy(field)
        setSortDirection("desc")
      }
    },
    [sortBy, sortDirection],
  )

  // Sort coins
  const sortedCoins = useMemo(() => {
    return [...watchlistData.coins].sort((a, b) => {
      let aValue: number, bValue: number

      switch (sortBy) {
        case "changesSinceStart":
          aValue = a.changesSinceStart
          bValue = b.changesSinceStart
          break
        case "rateOfChange":
          aValue = Math.abs(a.rateOfChange)
          bValue = Math.abs(b.rateOfChange)
          break
        case "dailyChange":
          aValue = a.dailyChange
          bValue = b.dailyChange
          break
        case "currentPrice":
          aValue = a.currentPrice
          bValue = b.currentPrice
          break
        default:
          return 0
      }

      return sortDirection === "desc" ? bValue - aValue : aValue - bValue
    })
  }, [watchlistData.coins, sortBy, sortDirection])

  const bestPerformer = sortedCoins.find((coin) => coin.changesSinceStart > 0) || sortedCoins[0]
  const fastestMover = [...sortedCoins].sort((a, b) => Math.abs(b.rateOfChange) - Math.abs(a.rateOfChange))[0]

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
    >
      {children}
      {sortBy === field &&
        (sortDirection === "desc" ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />)}
    </button>
  )

  if (viewMode === "chart") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1b23] via-[#1e1f2a] to-[#1a1b23] flex flex-col">
        {/* Header */}
        <div className="bg-[#21222d]/80 backdrop-blur-xl border-b border-gray-800/50">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <button
                  onClick={() => setViewMode("table")}
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Table
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                    <BarChart3 className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-white">Chart View</h1>
                    <p className="text-xs text-gray-400">Momentum visualization</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={markStartTime}
                  disabled={watchlistData.coins.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-lg transition-all disabled:cursor-not-allowed"
                >
                  <Target className="h-4 w-4" />
                  Mark Start Time
                </button>
                <button
                  onClick={() => setIsResetModalOpen(true)}
                  disabled={!isTracking}
                  className="flex items-center gap-2 px-4 py-2 bg-[#2a2d3a] border border-gray-700 hover:bg-[#3a3d4a] disabled:opacity-50 text-white rounded-lg transition-all disabled:cursor-not-allowed"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-sm rounded-xl p-4 border border-blue-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Watchlist Size</p>
                  <p className="text-2xl font-bold text-white">{watchlistData.coins.length}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-400" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-xl p-4 border border-green-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Tracking Since</p>
                  <p className="text-lg font-bold text-white">
                    {watchlistData.startTime ? new Date(watchlistData.startTime).toLocaleTimeString() : "Not Started"}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-green-400" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-xl p-4 border border-purple-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Best Performer</p>
                  <p className="text-lg font-bold text-white">{bestPerformer?.symbol || "N/A"}</p>
                  {bestPerformer && (
                    <p className="text-sm text-green-400">{formatPercentage(bestPerformer.changesSinceStart)}</p>
                  )}
                </div>
                <TrendingUp className="h-8 w-8 text-purple-400" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500/20 to-yellow-500/20 backdrop-blur-sm rounded-xl p-4 border border-orange-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Fastest Mover</p>
                  <p className="text-lg font-bold text-white">{fastestMover?.symbol || "N/A"}</p>
                </div>
                <Zap className="h-8 w-8 text-orange-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Chart Layout */}
        <div className="flex-1 flex px-6 pb-6 gap-6">
          {/* Left Sidebar - Condensed Watchlist */}
          <div className="w-80 bg-gradient-to-br from-[#1e1f2a] to-[#252631] rounded-xl border border-gray-700/50 flex flex-col">
            <div className="p-4 border-b border-gray-700/50 flex items-center justify-between">
              <h3 className="font-semibold text-white">Watchlist</h3>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="p-1 rounded bg-purple-500/20 border border-purple-500/30 hover:bg-purple-500/30 transition-colors"
              >
                <Plus className="h-4 w-4 text-purple-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {sortedCoins.length > 0 ? (
                <div className="space-y-1 p-2">
                  {sortedCoins.map((coin) => (
                    <div
                      key={coin.id}
                      onClick={() => setSelectedCoin(coin)}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
                        selectedCoin?.id === coin.id
                          ? "bg-purple-500/20 border border-purple-500/30"
                          : "hover:bg-gray-800/30"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-semibold">
                            {coin.symbol.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-white text-sm">{coin.symbol}</div>
                            <div className="text-xs text-gray-400">{coin.name}</div>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeCoin(coin.id)
                          }}
                          className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Price</span>
                          <span className="text-white font-mono">${formatPrice(coin.currentPrice)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Since Start</span>
                          <span
                            className={`font-medium ${
                              coin.changesSinceStart > 0
                                ? "text-green-400"
                                : coin.changesSinceStart < 0
                                  ? "text-red-400"
                                  : "text-gray-400"
                            }`}
                          >
                            {watchlistData.startTime ? formatPercentage(coin.changesSinceStart) : "—"}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Rate</span>
                          <span
                            className={`text-xs ${
                              Math.abs(coin.rateOfChange) > 0.5
                                ? coin.rateOfChange > 0
                                  ? "text-green-400"
                                  : "text-red-400"
                                : "text-gray-400"
                            }`}
                          >
                            {coin.rateOfChange.toFixed(2)}%/min
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center p-6">
                  <div className="text-center">
                    <Plus className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">Add coins to watchlist</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Chart Area */}
          <div className="flex-1 bg-gradient-to-br from-[#1e1f2a] to-[#252631] rounded-xl border border-gray-700/50">
            <div className="h-full p-6">
              {selectedCoin && watchlistData.startTime ? (
                <div className="h-full flex flex-col">
                  <div className="mb-4">
                    <h2 className="text-2xl font-bold text-white mb-1">{selectedCoin.symbol}/USD</h2>
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-mono text-white">${formatPrice(selectedCoin.currentPrice)}</span>
                      <span
                        className={`font-medium ${
                          selectedCoin.changesSinceStart > 0
                            ? "text-green-400"
                            : selectedCoin.changesSinceStart < 0
                              ? "text-red-400"
                              : "text-gray-400"
                        }`}
                      >
                        {formatPercentage(selectedCoin.changesSinceStart)} since start
                      </span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <MomentumChart coin={selectedCoin} startTime={watchlistData.startTime} />
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="mb-2">
                      {!watchlistData.startTime
                        ? "Mark a start time to begin tracking"
                        : "Select a coin from the watchlist to view its momentum chart"}
                    </p>
                    {!watchlistData.startTime && watchlistData.coins.length > 0 && (
                      <button
                        onClick={markStartTime}
                        className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg transition-all"
                      >
                        Mark Start Time
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modals */}
        <AddCoinModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAdd={addCoin}
          existingSymbols={watchlistData.coins.map((c) => c.symbol)}
        />
        <ResetConfirmModal
          isOpen={isResetModalOpen}
          onClose={() => setIsResetModalOpen(false)}
          onConfirm={resetTracking}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1b23] via-[#1e1f2a] to-[#1a1b23]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#21222d]/80 backdrop-blur-xl border-b border-gray-800/50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Momentum Tracker</h1>
                  <p className="text-xs text-gray-400">Real-time leverage trading momentum</p>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isTracking ? "bg-green-400" : "bg-gray-500"}`} />
                <span className="text-sm text-gray-400">{isTracking ? "Tracking Active" : "Ready to Track"}</span>
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-[#2a2d3a] rounded-lg p-1">
                <button
                  onClick={() => setViewMode("table")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all ${
                    viewMode === "table" ? "bg-purple-500 text-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  <List className="h-4 w-4" />
                  Table
                </button>
                <button
                  onClick={() => setViewMode("chart")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all ${
                    viewMode === "chart" ? "bg-purple-500 text-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  <BarChart3 className="h-4 w-4" />
                  Chart
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Control Buttons */}
              <button
                onClick={markStartTime}
                disabled={watchlistData.coins.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-lg transition-all disabled:cursor-not-allowed"
              >
                <Target className="h-4 w-4" />
                Mark Start Time
              </button>

              <button
                onClick={() => setIsResetModalOpen(true)}
                disabled={!isTracking}
                className="flex items-center gap-2 px-4 py-2 bg-[#2a2d3a] border border-gray-700 hover:bg-[#3a3d4a] disabled:opacity-50 text-white rounded-lg transition-all disabled:cursor-not-allowed"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>

              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg transition-all"
              >
                <Plus className="h-4 w-4" />
                Add Coin
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-sm rounded-xl p-4 border border-blue-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Watchlist Size</p>
                <p className="text-2xl font-bold text-white">{watchlistData.coins.length}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-xl p-4 border border-green-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Tracking Since</p>
                <p className="text-lg font-bold text-white">
                  {watchlistData.startTime ? new Date(watchlistData.startTime).toLocaleTimeString() : "Not Started"}
                </p>
              </div>
              <Clock className="h-8 w-8 text-green-400" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-xl p-4 border border-purple-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Best Performer</p>
                <p className="text-lg font-bold text-white">{bestPerformer?.symbol || "N/A"}</p>
                {bestPerformer && (
                  <p className="text-sm text-green-400">{formatPercentage(bestPerformer.changesSinceStart)}</p>
                )}
              </div>
              <TrendingUp className="h-8 w-8 text-purple-400" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500/20 to-yellow-500/20 backdrop-blur-sm rounded-xl p-4 border border-orange-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Fastest Mover</p>
                <p className="text-lg font-bold text-white">{fastestMover?.symbol || "N/A"}</p>
              </div>
              <Zap className="h-8 w-8 text-orange-400" />
            </div>
          </div>
        </div>

        {/* Watchlist Table */}
        {watchlistData.coins.length > 0 ? (
          <div className="bg-gradient-to-br from-[#1e1f2a] to-[#252631] rounded-xl border border-gray-700/50 overflow-hidden">
            {/* Table Controls */}
            <div className="p-4 border-b border-gray-700/50 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Momentum Watchlist</h2>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700/50">
                    <th className="text-left p-4 text-sm font-medium">
                      <span className="text-gray-400">Asset</span>
                    </th>
                    <th className="text-right p-4 text-sm font-medium">
                      <SortButton field="currentPrice">Current Price</SortButton>
                    </th>
                    <th className="text-right p-4 text-sm font-medium">
                      <SortButton field="changesSinceStart">% Since Start</SortButton>
                    </th>
                    <th className="text-right p-4 text-sm font-medium">
                      <SortButton field="rateOfChange">Rate of Change</SortButton>
                    </th>
                    <th className="text-right p-4 text-sm font-medium">
                      <SortButton field="dailyChange">Daily %</SortButton>
                    </th>
                    <th className="text-center p-4 text-sm font-medium text-gray-400">Momentum</th>
                    <th className="text-center p-4 text-sm font-medium text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCoins.map((coin) => (
                    <tr key={coin.id} className="border-b border-gray-700/30 hover:bg-gray-800/20 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-semibold">
                            {coin.symbol.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-white text-sm">{coin.symbol}</div>
                            <div className="text-xs text-gray-400">{coin.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="text-white font-mono">${formatPrice(coin.currentPrice)}</div>
                      </td>
                      <td className="p-4 text-right">
                        <div
                          className={`font-bold ${
                            coin.changesSinceStart > 0
                              ? "text-green-400"
                              : coin.changesSinceStart < 0
                                ? "text-red-400"
                                : "text-gray-400"
                          }`}
                        >
                          {watchlistData.startTime ? formatPercentage(coin.changesSinceStart) : "—"}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {Math.abs(coin.rateOfChange) > 0.1 && (
                            <>
                              {coin.rateOfChange > 0 ? (
                                <TrendingUp className="h-3 w-3 text-green-400" />
                              ) : (
                                <TrendingDown className="h-3 w-3 text-red-400" />
                              )}
                            </>
                          )}
                          <span
                            className={`text-sm ${
                              Math.abs(coin.rateOfChange) > 0.5
                                ? coin.rateOfChange > 0
                                  ? "text-green-400"
                                  : "text-red-400"
                                : "text-gray-400"
                            }`}
                          >
                            {coin.rateOfChange.toFixed(2)}%/min
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <span className={`text-sm ${coin.dailyChange > 0 ? "text-green-400" : "text-red-400"}`}>
                          {formatPercentage(coin.dailyChange)}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <MiniSparkline
                          data={coin.priceHistory.slice(-20).map((p) => p.price)}
                          isPositive={coin.changesSinceStart > 0}
                        />
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => removeCoin(coin.id)}
                          className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-[#1e1f2a] to-[#252631] rounded-xl border border-gray-700/50 p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center mx-auto mb-4">
              <Plus className="h-8 w-8 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Start Building Your Watchlist</h3>
            <p className="text-gray-400 mb-6">Add coins to track their momentum from a specific start time</p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg transition-all"
            >
              Add Your First Coin
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddCoinModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={addCoin}
        existingSymbols={watchlistData.coins.map((c) => c.symbol)}
      />
      <ResetConfirmModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={resetTracking}
      />
    </div>
  )
}
