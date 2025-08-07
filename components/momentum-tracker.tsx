"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { TrendingUp, TrendingDown, Search, Plus, X, RotateCcw, Flag, Pause, Activity, Clock, Trophy, Zap, MoreHorizontal } from 'lucide-react'

// Types
interface CoinData {
  id: string
  symbol: string
  name: string
  currentPrice: number
  startPrice: number
  changesSinceStart: number
  normalizedPrice?: number
  dailyChange: number
  rateOfChange: number
  lastUpdated: number
  priceHistory: Array<{ price: number; timestamp: number; changesSinceStart?: number }>
  racePosition?: number
  previousPosition?: number
}

interface WatchlistData {
  startTime: number | null
  coins: CoinData[]
}

type TimeFrame = "1min" | "5min" | "15min" | "1h" | "1d"

// Mock data
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

const COIN_COLORS = ["#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#f97316", "#ec4899", "#06b6d4"]

// WebSocket Hook with fixed dependencies
const useWebSocket = (symbols: string[], timeFrame: TimeFrame) => {
  const [data, setData] = useState<Map<string, number>>(new Map())
  const intervalRef = useRef<NodeJS.Timeout>()
  const lastUpdateRef = useRef<Map<string, number>>(new Map())

  const getUpdateInterval = (tf: TimeFrame): number => {
    switch (tf) {
      case "1min":
        return 1000
      case "5min":
        return 2000
      case "15min":
        return 3000
      case "1h":
        return 5000
      case "1d":
        return 10000
      default:
        return 1000
    }
  }

  useEffect(() => {
    if (symbols.length === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      return
    }

    // Initialize prices for new symbols only
    const newSymbols = symbols.filter((symbol) => !lastUpdateRef.current.has(symbol))
    if (newSymbols.length > 0) {
      const newData = new Map(data)
      newSymbols.forEach((symbol) => {
        const mockCoin = MOCK_COINS.find((c) => c.symbol === symbol)
        if (mockCoin) {
          lastUpdateRef.current.set(symbol, mockCoin.basePrice)
          newData.set(symbol, mockCoin.basePrice)
        }
      })
      if (newSymbols.length > 0) {
        setData(newData)
      }
    }

    const updateInterval = getUpdateInterval(timeFrame)

    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Start new interval
    intervalRef.current = setInterval(() => {
      const newData = new Map()
      symbols.forEach((symbol) => {
        const mockCoin = MOCK_COINS.find((c) => c.symbol === symbol)
        if (mockCoin) {
          const volatility = symbol.includes("DOGE") ? 0.005 : symbol.includes("BTC") ? 0.001 : 0.003
          const change = (Math.random() - 0.5) * volatility
          const currentPrice = lastUpdateRef.current.get(symbol) || mockCoin.basePrice
          const newPrice = Math.max(currentPrice * (1 + change), mockCoin.basePrice * 0.9)

          lastUpdateRef.current.set(symbol, newPrice)
          newData.set(symbol, newPrice)
        }
      })
      setData(newData)
    }, updateInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [symbols.join(","), timeFrame]) // Fixed dependency array

  return data
}

// Utility functions
const calculateChangesSinceStart = (currentPrice: number, startPrice: number): number => {
  if (!startPrice) return 0
  return ((currentPrice - startPrice) / startPrice) * 100
}

const calculateRateOfChange = (priceHistory: Array<{ price: number; timestamp: number }>): number => {
  if (priceHistory.length < 2) return 0

  const now = Date.now()
  const recentHistory = priceHistory.filter((p) => now - p.timestamp <= 60000)

  if (recentHistory.length < 2) return 0

  const timeSpan = recentHistory[recentHistory.length - 1].timestamp - recentHistory[0].timestamp
  const priceChange = recentHistory[recentHistory.length - 1].price - recentHistory[0].price
  const startPrice = recentHistory[0].price

  if (timeSpan === 0 || startPrice === 0) return 0

  return ((priceChange / startPrice) * 100 * 60000) / timeSpan
}

const formatPrice = (price: number): string => {
  if (price < 0.001) return price.toFixed(8)
  if (price < 1) return price.toFixed(4)
  if (price < 100) return price.toFixed(2)
  return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const formatPercentage = (pct: number): string => {
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`
}

const generateCoinId = (symbol: string) => `${symbol}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// Add Coin Dialog Component
function AddCoinDialog({
  open,
  onOpenChange,
  onAdd,
  existingSymbols,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle>Add Coin to Watchlist</DialogTitle>
          <DialogDescription>Search and select a cryptocurrency to add to your momentum tracker.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search coins..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {filteredCoins.map((coin) => (
                <Button
                  key={coin.symbol}
                  variant="ghost"
                  className="w-full justify-start h-auto p-3"
                  onClick={() => {
                    onAdd(coin)
                    onOpenChange(false)
                    setSearchTerm("")
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-semibold">
                      {coin.symbol.charAt(0)}
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">{coin.symbol}</div>
                      <div className="text-sm text-muted-foreground">{coin.name}</div>
                    </div>
                  </div>
                </Button>
              ))}
              {filteredCoins.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  {existingSymbols.length === MOCK_COINS.length ? "All coins already added" : "No coins found"}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Race Chart Component
function RaceChart({
  coins,
  startTime,
  timeFrame,
}: { coins: CoinData[]; startTime: number | null; timeFrame: TimeFrame }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !startTime || coins.length === 0) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, rect.width, rect.height)

    const padding = 40
    const chartWidth = rect.width - padding * 2
    const chartHeight = rect.height - padding * 2

    const allNormalizedPrices = coins.flatMap((coin) =>
      coin.priceHistory.filter((p) => p.timestamp >= startTime).map((p) => p.changesSinceStart || 0),
    )

    if (allNormalizedPrices.length === 0) return

    const minChange = Math.min(...allNormalizedPrices, -1)
    const maxChange = Math.max(...allNormalizedPrices, 1)
    const changeRange = Math.max(maxChange - minChange, 2)

    // Draw grid
    ctx.strokeStyle = "#374151"
    ctx.lineWidth = 0.5
    ctx.setLineDash([2, 2])

    for (let i = 0; i <= 5; i++) {
      const y = padding + (i / 5) * chartHeight
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(padding + chartWidth, y)
      ctx.stroke()

      const changeValue = maxChange - (i / 5) * changeRange
      ctx.fillStyle = "#9ca3af"
      ctx.font = "12px monospace"
      ctx.textAlign = "right"
      ctx.fillText(`${changeValue.toFixed(1)}%`, padding - 5, y + 4)
    }

    // Draw zero line
    const zeroY = padding + ((maxChange - 0) / changeRange) * chartHeight
    ctx.setLineDash([])
    ctx.strokeStyle = "#6b7280"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(padding, zeroY)
    ctx.lineTo(padding + chartWidth, zeroY)
    ctx.stroke()

    // Draw lines for each coin
    coins.forEach((coin, index) => {
      const chartData = coin.priceHistory.filter((p) => p.timestamp >= startTime)
      if (chartData.length < 2) return

      const color = COIN_COLORS[index % COIN_COLORS.length]
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.setLineDash([])

      ctx.beginPath()
      chartData.forEach((point, pointIndex) => {
        const x = padding + (pointIndex / (chartData.length - 1)) * chartWidth
        const y = padding + ((maxChange - (point.changesSinceStart || 0)) / changeRange) * chartHeight

        if (pointIndex === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })
      ctx.stroke()

      // Draw current position dot
      if (chartData.length > 0) {
        const lastPoint = chartData[chartData.length - 1]
        const x = padding + chartWidth
        const y = padding + ((maxChange - (lastPoint.changesSinceStart || 0)) / changeRange) * chartHeight

        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, 2 * Math.PI)
        ctx.fill()

        ctx.fillStyle = "#ffffff"
        ctx.font = "12px sans-serif"
        ctx.textAlign = "left"
        ctx.fillText(coin.symbol, x + 8, y + 4)
      }
    })
  }, [coins, startTime, timeFrame])

  if (!startTime || coins.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Flag className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Start a race to see the momentum chart</p>
        </div>
      </div>
    )
  }

  return <canvas ref={canvasRef} className="w-full h-full" />
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

export default function MomentumTracker() {
  const [watchlistData, setWatchlistData] = useState<WatchlistData>({
    startTime: null,
    coins: [],
  })
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isTracking, setIsTracking] = useState(false)
  const [isRaceMode, setIsRaceMode] = useState(false)
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("1min")
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("table")

  const symbols = useMemo(() => watchlistData.coins.map((coin) => coin.symbol), [watchlistData.coins])
  const priceData = useWebSocket(symbols, timeFrame)

  // Update coin data when new price data arrives - fixed with proper dependencies
  const updateCoins = useCallback(
    (newPriceData: Map<string, number>) => {
      setWatchlistData((prevData) => {
        const updatedCoins = prevData.coins.map((coin) => {
          const newPrice = newPriceData.get(coin.symbol)
          if (!newPrice || newPrice === coin.currentPrice) return coin

          const now = Date.now()
          const changesSinceStart = calculateChangesSinceStart(newPrice, coin.startPrice)
          const normalizedPrice = isRaceMode ? changesSinceStart : coin.normalizedPrice

          const newPriceHistory = [
            ...coin.priceHistory.slice(-100),
            { price: newPrice, timestamp: now, changesSinceStart },
          ]

          return {
            ...coin,
            currentPrice: newPrice,
            changesSinceStart,
            normalizedPrice,
            rateOfChange: calculateRateOfChange(newPriceHistory),
            lastUpdated: now,
            priceHistory: newPriceHistory,
          }
        })

        // Only update if there are actual changes
        const hasChanges = updatedCoins.some((coin, index) => coin.currentPrice !== prevData.coins[index]?.currentPrice)

        if (!hasChanges) return prevData

        return {
          ...prevData,
          coins: updatedCoins,
        }
      })
    },
    [isRaceMode],
  )

  // Use effect to update coins when price data changes
  useEffect(() => {
    if (priceData.size > 0) {
      updateCoins(priceData)
    }
  }, [priceData, updateCoins])

  const startRace = useCallback(() => {
    const now = Date.now()
    setWatchlistData((prev) => ({
      startTime: now,
      coins: prev.coins.map((coin) => ({
        ...coin,
        startPrice: coin.currentPrice,
        changesSinceStart: 0,
        normalizedPrice: 0,
        priceHistory: [{ price: coin.currentPrice, timestamp: now, changesSinceStart: 0 }],
        racePosition: 1,
        previousPosition: 1,
      })),
    }))
    setIsTracking(true)
    setIsRaceMode(true)
    setActiveTab("chart")
  }, [])

  const stopRace = useCallback(() => {
    setIsRaceMode(false)
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
        normalizedPrice: 0,
        dailyChange: (Math.random() - 0.5) * 10,
        rateOfChange: 0,
        lastUpdated: now,
        priceHistory: [{ price: currentPrice, timestamp: now, changesSinceStart: 0 }],
        racePosition: 1,
        previousPosition: 1,
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
  }, [])

  const resetTracking = useCallback(() => {
    setWatchlistData((prev) => ({
      ...prev,
      startTime: null,
      coins: prev.coins.map((coin) => ({
        ...coin,
        startPrice: 0,
        changesSinceStart: 0,
        normalizedPrice: 0,
        priceHistory: [],
        racePosition: 1,
        previousPosition: 1,
      })),
    }))
    setIsTracking(false)
    setIsRaceMode(false)
  }, [])

  const filteredCoins = useMemo(() => {
    if (!searchTerm) return watchlistData.coins
    return watchlistData.coins.filter(
      (coin) =>
        coin.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        coin.name.toLowerCase().includes(searchTerm.toLowerCase()),
    )
  }, [watchlistData.coins, searchTerm])

  const sortedCoins = useMemo(() => {
    return [...filteredCoins].sort((a, b) => b.changesSinceStart - a.changesSinceStart)
  }, [filteredCoins])

  const bestPerformer = useMemo(() => {
    return sortedCoins.find((coin) => coin.changesSinceStart > 0) || sortedCoins[0]
  }, [sortedCoins])

  const fastestMover = useMemo(() => {
    return [...sortedCoins].sort((a, b) => Math.abs(b.rateOfChange) - Math.abs(a.rateOfChange))[0]
  }, [sortedCoins])

  const getGlowStyles = () => {
    if (isRaceMode) {
      return "shadow-2xl shadow-amber-400/30 before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-r before:from-amber-500/10 before:to-orange-500/10 before:-z-10 before:blur-xl relative"
    } else if (isTracking) {
      return "shadow-2xl shadow-emerald-400/30 before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-r before:from-emerald-500/10 before:to-green-500/10 before:-z-10 before:blur-xl relative"
    }
    return ""
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="border-b border-slate-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
                  <Zap className="h-5 w-5 text-slate-300" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-100">Momentum Tracker</h1>
                  <p className="text-sm text-slate-400">Real-time crypto momentum tracking</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isTracking ? "bg-emerald-400" : "bg-slate-500"}`} />
                <Badge 
                  variant={isRaceMode ? "default" : isTracking ? "secondary" : "outline"}
                  className={isRaceMode ? "bg-amber-600 text-amber-50" : isTracking ? "bg-emerald-600 text-emerald-50" : ""}
                >
                  {isRaceMode ? "Race Active" : isTracking ? "Tracking" : "Ready"}
                </Badge>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 border border-slate-700 rounded-lg p-1">
                {(["1min", "5min", "15min", "1h", "1d"] as TimeFrame[]).map((tf) => (
                  <Button
                    key={tf}
                    variant={timeFrame === tf ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setTimeFrame(tf)}
                    className={timeFrame === tf ? "bg-slate-600 text-slate-100" : "text-slate-400 hover:text-slate-100"}
                  >
                    {tf}
                  </Button>
                ))}
              </div>

              {!isRaceMode ? (
                <Button
                  onClick={startRace}
                  disabled={watchlistData.coins.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 text-emerald-50"
                >
                  <Flag className="h-4 w-4 mr-2" />
                  Start Race
                </Button>
              ) : (
                <Button onClick={stopRace} className="bg-red-600 hover:bg-red-700 text-red-50">
                  <Pause className="h-4 w-4 mr-2" />
                  Stop Race
                </Button>
              )}

              <Button 
                variant="outline" 
                onClick={resetTracking} 
                disabled={!isTracking}
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>

              <Button 
                onClick={() => setIsAddModalOpen(true)}
                className="bg-slate-700 hover:bg-slate-600 text-slate-100"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Coin
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards - Made shorter */}
      <div className="container mx-auto px-4 py-3">
        <div className={`grid grid-cols-1 md:grid-cols-4 gap-3 mb-3 transition-all duration-500 ${getGlowStyles()}`}>
          <Card className="bg-slate-900/90 border-slate-700 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0 pt-3">
              <CardTitle className="text-xs font-medium text-slate-400">Watchlist Size</CardTitle>
              <Activity className="h-3 w-3 text-slate-500" />
            </CardHeader>
            <CardContent className="pt-1 pb-3">
              <div className="text-lg font-bold text-slate-100">{watchlistData.coins.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/90 border-slate-700 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0 pt-3">
              <CardTitle className="text-xs font-medium text-slate-400">{isRaceMode ? "Race Started" : "Tracking Since"}</CardTitle>
              <Clock className="h-3 w-3 text-slate-500" />
            </CardHeader>
            <CardContent className="pt-1 pb-3">
              <div className="text-lg font-bold text-slate-100">
                {watchlistData.startTime
                  ? new Date(watchlistData.startTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Not Started"}
              </div>
              {watchlistData.startTime && (
                <p className="text-xs text-slate-400">
                  {Math.floor((Date.now() - watchlistData.startTime) / 60000)}m elapsed
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900/90 border-slate-700 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0 pt-3">
              <CardTitle className="text-xs font-medium text-slate-400">{isRaceMode ? "Race Leader" : "Best Performer"}</CardTitle>
              {isRaceMode ? (
                <Trophy className="h-3 w-3 text-slate-500" />
              ) : (
                <TrendingUp className="h-3 w-3 text-slate-500" />
              )}
            </CardHeader>
            <CardContent className="pt-1 pb-3">
              <div className="text-lg font-bold text-slate-100">{bestPerformer?.symbol || "N/A"}</div>
              {bestPerformer && (
                <p className="text-xs text-emerald-400">{formatPercentage(bestPerformer.changesSinceStart)}</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900/90 border-slate-700 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0 pt-3">
              <CardTitle className="text-xs font-medium text-slate-400">Fastest Mover</CardTitle>
              <Zap className="h-3 w-3 text-slate-500" />
            </CardHeader>
            <CardContent className="pt-1 pb-3">
              <div className="text-lg font-bold text-slate-100">{fastestMover?.symbol || "N/A"}</div>
              {fastestMover && (
                <p className="text-xs text-slate-400">{fastestMover.rateOfChange.toFixed(2)}%/min</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="mb-4">
            {/* TabsList will be moved inside each tab content */}
          </div>

          <TabsContent value="table">
            {watchlistData.coins.length > 0 ? (
              <Card className="bg-slate-900 border-slate-700">
                <CardContent className="p-0">
                  {/* Table Controls */}
                  <div className="p-4 border-b border-slate-700 flex items-center justify-center space-x-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search coins..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64 bg-slate-800 border-slate-600 text-slate-100 placeholder-slate-400"
                      />
                    </div>
                    
                    <TabsList className="bg-slate-800 border-slate-700">
                      <TabsTrigger value="table" className="data-[state=active]:bg-slate-600 text-slate-300">Table</TabsTrigger>
                      <TabsTrigger value="chart" className="data-[state=active]:bg-slate-600 text-slate-300">Chart</TabsTrigger>
                    </TabsList>
                  </div>
                  
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700">
                        <TableHead className="text-slate-300">Asset</TableHead>
                        <TableHead className="text-right text-slate-300">Current Price</TableHead>
                        <TableHead className="text-right text-slate-300">{isRaceMode ? "Race %" : "% Since Start"}</TableHead>
                        <TableHead className="text-right text-slate-300">Rate of Change</TableHead>
                        <TableHead className="text-right text-slate-300">Daily %</TableHead>
                        <TableHead className="text-center text-slate-300">Momentum</TableHead>
                        <TableHead className="text-center text-slate-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCoins.map((coin, index) => {
                        // Ensure racePosition is initialized to 1 if it's undefined
                        const currentRacePosition = coin.racePosition !== undefined ? coin.racePosition : 1;

                        return (
                          <TableRow 
                            key={coin.id} 
                            className={`border-slate-800 hover:bg-slate-800/50 transition-all duration-300 ${
                              isRaceMode && currentRacePosition <= 3 ? 'bg-gradient-to-r from-amber-500/10 to-transparent' : ''
                            }`}
                            style={{
                              transform: coin.previousPosition && coin.previousPosition !== currentRacePosition
                                ? `translateY(${(coin.previousPosition - currentRacePosition) * 2}px)` 
                                : 'translateY(0)',
                              transition: 'transform 0.5s ease-out, background-color 0.3s ease-out'
                            }}
                          >
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                                  style={{ backgroundColor: COIN_COLORS[index % COIN_COLORS.length] }}
                                >
                                  {coin.symbol.charAt(0)}
                                </div>
                                <div>
                                  <div className="font-semibold text-slate-100">{coin.symbol}</div>
                                  <div className="text-sm text-slate-400">{coin.name}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono text-slate-100">${formatPrice(coin.currentPrice)}</TableCell>
                            <TableCell className="text-right">
                              <span
                                className={`font-semibold ${
                                  coin.changesSinceStart > 0
                                    ? "text-emerald-400"
                                    : coin.changesSinceStart < 0
                                      ? "text-red-400"
                                      : "text-slate-400"
                                }`}
                              >
                                {watchlistData.startTime ? formatPercentage(coin.changesSinceStart) : "—"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end space-x-1">
                                {Math.abs(coin.rateOfChange) > 0.1 && (
                                  <>
                                    {coin.rateOfChange > 0 ? (
                                      <TrendingUp className="h-3 w-3 text-emerald-400" />
                                    ) : (
                                      <TrendingDown className="h-3 w-3 text-red-400" />
                                    )}
                                  </>
                                )}
                                <span
                                  className={`text-sm ${
                                    Math.abs(coin.rateOfChange) > 0.5
                                      ? coin.rateOfChange > 0
                                        ? "text-emerald-400"
                                        : "text-red-400"
                                      : "text-slate-400"
                                  }`}
                                >
                                  {coin.rateOfChange.toFixed(2)}%/min
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={`${coin.dailyChange > 0 ? "text-emerald-400" : "text-red-400"}`}>
                                {formatPercentage(coin.dailyChange)}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <MiniSparkline
                                data={coin.priceHistory.slice(-20).map((p) => p.price)}
                                isPositive={coin.changesSinceStart > 0}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-100">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-slate-800 border-slate-600">
                                  <DropdownMenuItem 
                                    onClick={() => removeCoin(coin.id)} 
                                    className="text-red-400 hover:bg-slate-700"
                                  >
                                    <X className="h-4 w-4 mr-2" />
                                    Remove
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-slate-900 border-slate-700">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                    <Plus className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-slate-100">Start Building Your Watchlist</h3>
                  <p className="text-slate-400 text-center mb-6 max-w-md">
                    Add coins to track their momentum from a specific start time and monitor their performance in
                    real-time.
                  </p>
                  <Button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-slate-700 hover:bg-slate-600 text-slate-100"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Coin
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="chart">
            <Card className="bg-slate-900 border-slate-700">
              <CardContent>
                <div className="h-96">
                  <RaceChart coins={sortedCoins} startTime={watchlistData.startTime} timeFrame={timeFrame} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Coin Dialog */}
      <AddCoinDialog
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onAdd={addCoin}
        existingSymbols={watchlistData.coins.map((c) => c.symbol)}
      />
    </div>
  )
}
