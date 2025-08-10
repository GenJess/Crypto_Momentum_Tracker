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
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import {
  TrendingUp,
  TrendingDown,
  Search,
  Plus,
  X,
  RotateCcw,
  Flag,
  Pause,
  Activity,
  Clock,
  Trophy,
  Zap,
  MoreHorizontal,
  LineChart,
  LayoutList,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

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

// Mock data (kept for demo)
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

// Brand logo
function Brand() {
  return (
    <div className="flex items-center gap-2">
      <div className="purp-brand">
        {/* Chain-like logo */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M8 8L12 4L16 8L12 12L8 8Z" opacity="0.8"></path>
          <path d="M8 16L12 12L16 16L12 20L8 16Z" opacity="0.6"></path>
          <path d="M4 12L8 8L12 12L8 16L4 12Z" opacity="0.4"></path>
          <path d="M12 12L16 8L20 12L16 16L12 12Z" opacity="0.4"></path>
        </svg>
      </div>
      <div className="leading-tight">
        <div className="text-lg font-semibold tracking-tight bg-gradient-to-br from-[var(--text-primary)] to-[var(--purple-primary)] bg-clip-text text-transparent">
          PurpDex
        </div>
        <div className="text-[11px] text-[color:var(--text-secondary)]">ROC Crypto Momentum</div>
      </div>
    </div>
  )
}

// Utilities
const generateCoinId = (symbol: string) => `${symbol}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

const calculateChangesSinceStart = (currentPrice: number, startPrice: number): number => {
  if (!startPrice) return 0
  return ((currentPrice - startPrice) / startPrice) * 100
}

const calculateRateOfChange = (priceHistory: Array<{ price: number; timestamp: number }>): number => {
  if (priceHistory.length < 2) return 0
  const now = Date.now()
  const recent = priceHistory.filter((p) => now - p.timestamp <= 60_000)
  if (recent.length < 2) return 0
  const timeSpan = recent[recent.length - 1].timestamp - recent[0].timestamp
  const priceChange = recent[recent.length - 1].price - recent[0].price
  const startPrice = recent[0].price
  if (timeSpan === 0 || startPrice === 0) return 0
  return ((priceChange / startPrice) * 100 * 60_000) / timeSpan
}

const formatPrice = (price: number): string => {
  if (price < 0.001) return price.toFixed(8)
  if (price < 1) return price.toFixed(4)
  if (price < 100) return price.toFixed(2)
  return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const formatPercentage = (pct: number): string => `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`

// WebSocket-ish mock stream
const useWebSocket = (symbols: string[], timeFrame: TimeFrame) => {
  const [data, setData] = useState<Map<string, number>>(new Map())
  const intervalRef = useRef<NodeJS.Timeout>()
  const lastUpdateRef = useRef<Map<string, number>>(new Map())

  const getUpdateInterval = (tf: TimeFrame) => {
    switch (tf) {
      case "1min":
        return 800
      case "5min":
        return 1400
      case "15min":
        return 2000
      case "1h":
        return 3500
      case "1d":
        return 8000
      default:
        return 1000
    }
  }

  useEffect(() => {
    if (symbols.length === 0) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }

    // init new symbols
    const newSymbols = symbols.filter((s) => !lastUpdateRef.current.has(s))
    if (newSymbols.length) {
      const next = new Map(data)
      newSymbols.forEach((symbol) => {
        const mock = MOCK_COINS.find((c) => c.symbol === symbol)
        if (mock) {
          lastUpdateRef.current.set(symbol, mock.basePrice)
          next.set(symbol, mock.basePrice)
        }
      })
      setData(next)
    }

    if (intervalRef.current) clearInterval(intervalRef.current)
    const interval = getUpdateInterval(timeFrame)
    intervalRef.current = setInterval(() => {
      const next = new Map<string, number>()
      symbols.forEach((symbol) => {
        const mock = MOCK_COINS.find((c) => c.symbol === symbol)
        if (!mock) return
        const volatility = symbol.includes("DOGE") ? 0.005 : symbol.includes("BTC") ? 0.001 : 0.003
        const change = (Math.random() - 0.5) * volatility
        const curr = lastUpdateRef.current.get(symbol) ?? mock.basePrice
        const price = Math.max(curr * (1 + change), mock.basePrice * 0.9)
        lastUpdateRef.current.set(symbol, price)
        next.set(symbol, price)
      })
      setData(next)
    }, interval)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbols.join(","), timeFrame])

  return data
}

// Chart
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
    const w = rect.width - padding * 2
    const h = rect.height - padding * 2

    const all = coins.flatMap((c) =>
      c.priceHistory.filter((p) => p.timestamp >= startTime).map((p) => p.changesSinceStart || 0),
    )
    if (!all.length) return

    const min = Math.min(...all, -1)
    const max = Math.max(...all, 1)
    const range = Math.max(max - min, 2)

    // grid
    ctx.strokeStyle = "#334155"
    ctx.lineWidth = 0.5
    ctx.setLineDash([3, 3])
    for (let i = 0; i <= 5; i++) {
      const y = padding + (i / 5) * h
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(padding + w, y)
      ctx.stroke()
      const v = max - (i / 5) * range
      ctx.fillStyle = "#94a3b8"
      ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace"
      ctx.textAlign = "right"
      ctx.fillText(`${v.toFixed(1)}%`, padding - 6, y + 3)
    }

    // zero-line
    const zeroY = padding + ((max - 0) / range) * h
    ctx.setLineDash([])
    ctx.strokeStyle = "#64748b"
    ctx.lineWidth = 1.25
    ctx.beginPath()
    ctx.moveTo(padding, zeroY)
    ctx.lineTo(padding + w, zeroY)
    ctx.stroke()

    // series
    coins.forEach((coin, idx) => {
      const series = coin.priceHistory.filter((p) => p.timestamp >= startTime)
      if (series.length < 2) return
      const color = COIN_COLORS[idx % COIN_COLORS.length]
      ctx.strokeStyle = color
      ctx.lineWidth = 2

      ctx.beginPath()
      series.forEach((pt, i) => {
        const x = padding + (i / (series.length - 1)) * w
        const y = padding + ((max - (pt.changesSinceStart || 0)) / range) * h
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()

      // end dot + label
      const last = series[series.length - 1]
      const x = padding + w
      const y = padding + ((max - (last.changesSinceStart || 0)) / range) * h
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(x, y, 3.5, 0, 2 * Math.PI)
      ctx.fill()
      ctx.fillStyle = "#e2e8f0"
      ctx.font = "12px ui-sans-serif, system-ui"
      ctx.textAlign = "left"
      ctx.fillText(`${coin.symbol}`, x + 8, y + 4)
    })
  }, [coins, startTime, timeFrame])

  if (!startTime || coins.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400">
        <div className="text-center">
          <Flag className="h-10 w-10 mx-auto mb-3 opacity-60" />
          <p className="text-sm">Start a race to see the momentum chart</p>
        </div>
      </div>
    )
  }
  return <canvas ref={canvasRef} className="w-full h-full" />
}

// Typeahead Add
function AddCoinTypeahead({
  value,
  onValueChange,
  existingSymbols,
  onSelectCoin,
  onAddFirstMatch,
}: {
  value: string
  onValueChange: (v: string) => void
  existingSymbols: string[]
  onSelectCoin: (coin: (typeof MOCK_COINS)[number]) => void
  onAddFirstMatch: () => void
}) {
  const [open, setOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase()
    if (!q) return []
    return MOCK_COINS.filter(
      (c) =>
        !existingSymbols.includes(c.symbol) && (c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)),
    ).slice(0, 8)
  }, [value, existingSymbols])

  useEffect(() => {
    setOpen(Boolean(value) && filtered.length > 0)
  }, [value, filtered.length])

  return (
    <div className="relative w-[26rem] max-w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
        <Input
          aria-label="Search coins"
          placeholder="Search coins (e.g., BTC, ETH) — press Enter to add"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              onAddFirstMatch()
            } else if (e.key === "Escape") {
              onValueChange("")
              setOpen(false)
            }
          }}
          className="purp-input pl-9 placeholder:text-[color:var(--text-muted)]"
        />
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <span className="sr-only">Toggle suggestions</span>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[26rem] p-0 bg-[var(--bg-secondary)] border-[var(--border-primary)]">
          <Command shouldFilter={false} className="bg-transparent">
            <CommandInput
              value={value}
              onValueChange={(v) => onValueChange(v)}
              placeholder="Filter coins..."
              className="hidden"
            />
            <CommandList className="max-h-64">
              {filtered.length === 0 ? (
                <CommandEmpty>No coins found</CommandEmpty>
              ) : (
                <CommandGroup heading="Matches">
                  {filtered.map((coin) => (
                    <CommandItem
                      key={coin.symbol}
                      value={coin.symbol}
                      onSelect={() => {
                        onSelectCoin(coin)
                        onValueChange("")
                        setOpen(false)
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-6 rounded-full bg-slate-700 text-white text-xs font-semibold grid place-items-center">
                          {coin.symbol.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-100">{coin.symbol}</span>
                          <span className="text-[11px] text-slate-400">{coin.name}</span>
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export default function MomentumTracker() {
  const { toast } = useToast()

  const [watchlistData, setWatchlistData] = useState<WatchlistData>({ startTime: null, coins: [] })
  const [isTracking, setIsTracking] = useState(false)
  const [isRaceMode, setIsRaceMode] = useState(false)
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("1min")
  const [activeTab, setActiveTab] = useState<"table" | "chart">("table")

  const [query, setQuery] = useState("")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  const symbols = useMemo(() => watchlistData.coins.map((c) => c.symbol), [watchlistData.coins])
  const priceData = useWebSocket(symbols, timeFrame)

  const updateCoins = useCallback(
    (newPrices: Map<string, number>) => {
      setWatchlistData((prev) => {
        const coins = prev.coins.map((coin) => {
          const nextPrice = newPrices.get(coin.symbol)
          if (!nextPrice || nextPrice === coin.currentPrice) return coin
          const now = Date.now()
          const change = calculateChangesSinceStart(nextPrice, coin.startPrice)
          const normalized = isRaceMode ? change : coin.normalizedPrice
          const history = [
            ...coin.priceHistory.slice(-100),
            { price: nextPrice, timestamp: now, changesSinceStart: change },
          ]
          return {
            ...coin,
            currentPrice: nextPrice,
            changesSinceStart: change,
            normalizedPrice: normalized,
            rateOfChange: calculateRateOfChange(history),
            lastUpdated: now,
            priceHistory: history,
          }
        })
        return { ...prev, coins }
      })
    },
    [isRaceMode],
  )

  useEffect(() => {
    if (priceData.size > 0) updateCoins(priceData)
  }, [priceData, updateCoins])

  const addCoin = useCallback(
    (coinInfo: (typeof MOCK_COINS)[number]) => {
      if (watchlistData.coins.some((c) => c.symbol === coinInfo.symbol)) {
        toast({ title: "Already added", description: `${coinInfo.symbol} is already in your watchlist.` })
        return
      }
      const currentPrice = priceData.get(coinInfo.symbol) ?? coinInfo.basePrice
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
      setWatchlistData((prev) => ({ ...prev, coins: [...prev.coins, newCoin] }))
      toast({ title: "Coin added", description: `${coinInfo.symbol} added to watchlist.` })
    },
    [priceData, watchlistData.startTime, watchlistData.coins, toast],
  )

  const addFirstMatch = useCallback(() => {
    const q = query.trim().toLowerCase()
    if (!q) {
      setIsAddModalOpen(true)
      return
    }
    const match = MOCK_COINS.find(
      (c) =>
        !watchlistData.coins.some((x) => x.symbol === c.symbol) &&
        (c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)),
    )
    if (match) {
      addCoin(match)
      setQuery("")
    } else {
      toast({ title: "No match found", description: "Try a different symbol or name." })
    }
  }, [query, watchlistData.coins, addCoin, toast])

  const removeCoin = useCallback(
    (id: string) => {
      const removed = watchlistData.coins.find((c) => c.id === id)
      setWatchlistData((prev) => ({ ...prev, coins: prev.coins.filter((c) => c.id !== id) }))
      if (removed) toast({ title: "Removed", description: `${removed.symbol} removed from watchlist.` })
    },
    [watchlistData.coins, toast],
  )

  const startRace = useCallback(() => {
    const now = Date.now()
    setWatchlistData((prev) => ({
      startTime: now,
      coins: prev.coins.map((c) => ({
        ...c,
        startPrice: c.currentPrice,
        changesSinceStart: 0,
        normalizedPrice: 0,
        priceHistory: [{ price: c.currentPrice, timestamp: now, changesSinceStart: 0 }],
        racePosition: 1,
        previousPosition: 1,
      })),
    }))
    setIsTracking(true)
    setIsRaceMode(true)
    setActiveTab("chart")
    toast({ title: "Race started", description: "All coins normalized to 0%." })
  }, [toast])

  const stopRace = useCallback(() => {
    setIsRaceMode(false)
    toast({ title: "Race stopped" })
  }, [toast])

  const resetTracking = useCallback(() => {
    setWatchlistData((prev) => ({
      ...prev,
      startTime: null,
      coins: prev.coins.map((c) => ({
        ...c,
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
    toast({ title: "Tracking reset", description: "Start a new race when ready." })
  }, [toast])

  // Derived
  const filteredCoins = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return watchlistData.coins
    return watchlistData.coins.filter((c) => c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
  }, [watchlistData.coins, query])

  const sortedCoins = useMemo(() => {
    return [...filteredCoins].sort((a, b) => b.changesSinceStart - a.changesSinceStart)
  }, [filteredCoins])

  const bestPerformer = useMemo(() => sortedCoins[0], [sortedCoins])
  const fastestMover = useMemo(
    () => [...sortedCoins].sort((a, b) => Math.abs(b.rateOfChange) - Math.abs(a.rateOfChange))[0],
    [sortedCoins],
  )

  // Visual accents: remove heavy drop-shadows; use subtle ring accents
  const accentRing = isRaceMode ? "ring-1 ring-amber-400/30" : isTracking ? "ring-1 ring-emerald-400/30" : "ring-0"

  return (
    <div className="purpdex min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Top Bar */}
      <div className="sticky top-0 z-40 border-b border-[var(--border-primary)] bg-[color:var(--bg-secondary)]/90 backdrop-blur supports-[backdrop-filter]:bg-[color:var(--bg-secondary)]/60">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <Brand />
              <div className="hidden md:flex items-center gap-2">
                <div
                  className={`size-2 rounded-full ${isTracking ? "bg-[var(--accent-success)] shadow-[var(--shadow-glow-success)]" : "bg-[var(--text-muted)]"}`}
                />
                <Badge
                  variant={isRaceMode ? "default" : isTracking ? "secondary" : "outline"}
                  className={
                    isRaceMode
                      ? "bg-[var(--accent-warning)]/20 text-[var(--accent-warning)] border border-[var(--border-primary)]"
                      : isTracking
                        ? "bg-[var(--accent-success)]/20 text-[var(--accent-success)] border border-[var(--border-primary)]"
                        : "text-[color:var(--text-secondary)] border border-[var(--border-primary)]"
                  }
                >
                  {isRaceMode ? "Race Active" : isTracking ? "Tracking" : "Ready"}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg p-1">
                <Button
                  size="sm"
                  variant={activeTab === "table" ? "default" : "ghost"}
                  onClick={() => setActiveTab("table")}
                  className={
                    activeTab === "table"
                      ? "bg-[var(--purple-primary)] text-white"
                      : "text-[color:var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }
                  aria-pressed={activeTab === "table"}
                >
                  <span className="mr-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path d="M3 10h18M3 6h18M3 14h18M3 18h18" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </span>
                  Table
                </Button>
                <Button
                  size="sm"
                  variant={activeTab === "chart" ? "default" : "ghost"}
                  onClick={() => setActiveTab("chart")}
                  className={
                    activeTab === "chart"
                      ? "bg-[var(--purple-primary)] text-white"
                      : "text-[color:var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }
                  aria-pressed={activeTab === "chart"}
                >
                  <span className="mr-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        d="M3 3v18M21 21H3M7 16v-4M11 21V8M15 21V12M19 21V6"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                  Chart
                </Button>
              </div>

              {!isRaceMode ? (
                <Button
                  onClick={startRace}
                  disabled={watchlistData.coins.length === 0}
                  className="purp-btn purp-btn-success"
                >
                  <Flag className="mr-2 h-4 w-4" />
                  Start Race
                </Button>
              ) : (
                <Button onClick={stopRace} className="purp-btn purp-btn-hot">
                  <Pause className="mr-2 h-4 w-4" />
                  Stop Race
                </Button>
              )}

              <Button
                variant="outline"
                onClick={resetTracking}
                disabled={!isTracking}
                className="purp-btn purp-btn-primary bg-[color:var(--bg-tertiary)] text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-hover)] border border-[var(--border-primary)]"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Stats */}
        <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 ${accentRing} rounded-xl`}>
          <Card className="bg-[var(--bg-secondary)] border-[var(--border-primary)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-xs font-medium text-[color:var(--text-secondary)]">Watchlist Size</CardTitle>
              <Activity className="h-4 w-4 text-[color:var(--text-secondary)]" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xl font-semibold">{watchlistData.coins.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-[var(--bg-secondary)] border-[var(--border-primary)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-xs font-medium text-[color:var(--text-secondary)]">
                {isRaceMode ? "Race Started" : "Tracking Since"}
              </CardTitle>
              <Clock className="h-4 w-4 text-[color:var(--text-secondary)]" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xl font-semibold">
                {watchlistData.startTime
                  ? new Date(watchlistData.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "Not Started"}
              </div>
              {watchlistData.startTime && (
                <div className="text-xs text-slate-400">
                  {Math.floor((Date.now() - watchlistData.startTime) / 60000)}m elapsed
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-[var(--bg-secondary)] border-[var(--border-primary)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-xs font-medium text-[color:var(--text-secondary)]">
                {isRaceMode ? "Race Leader" : "Best Performer"}
              </CardTitle>
              {isRaceMode ? (
                <Trophy className="h-4 w-4 text-[color:var(--text-secondary)]" />
              ) : (
                <TrendingUp className="h-4 w-4 text-[color:var(--text-secondary)]" />
              )}
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xl font-semibold">{bestPerformer?.symbol || "N/A"}</div>
              {bestPerformer && (
                <div className="text-xs text-[color:var(--accent-success)]">
                  {formatPercentage(bestPerformer.changesSinceStart)}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-[var(--bg-secondary)] border-[var(--border-primary)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-xs font-medium text-[color:var(--text-secondary)]">Fastest Mover</CardTitle>
              <Zap className="h-4 w-4 text-[color:var(--text-secondary)]" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xl font-semibold">{fastestMover?.symbol || "N/A"}</div>
              {fastestMover && (
                <div className="text-xs text-[color:var(--text-secondary)]">
                  {fastestMover.rateOfChange.toFixed(2)}%/min
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "table" | "chart")} className="space-y-4">
          <TabsContent value="table">
            <Card className="bg-[var(--bg-secondary)] border-[var(--border-primary)]">
              <CardHeader className="border-b border-[var(--border-primary)]">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  {/* View toggle */}
                  <TabsList className="bg-[var(--bg-primary)] border border-[var(--border-primary)]">
                    <TabsTrigger
                      value="table"
                      className="data-[state=active]:bg-[var(--bg-tertiary)] data-[state=active]:text-[var(--text-primary)] text-[color:var(--text-secondary)]"
                    >
                      <LayoutList className="mr-2 h-4 w-4" />
                      Table
                    </TabsTrigger>
                    <TabsTrigger
                      value="chart"
                      onClick={() => setActiveTab("chart")}
                      className="data-[state=active]:bg-[var(--bg-tertiary)] data-[state=active]:text-[var(--text-primary)] text-[color:var(--text-secondary)]"
                    >
                      <LineChart className="mr-2 h-4 w-4" />
                      Chart
                    </TabsTrigger>
                  </TabsList>

                  {/* Search + Add */}
                  <div className="flex items-center gap-2">
                    <AddCoinTypeahead
                      value={query}
                      onValueChange={setQuery}
                      existingSymbols={watchlistData.coins.map((c) => c.symbol)}
                      onSelectCoin={(coin) => addCoin(coin)}
                      onAddFirstMatch={addFirstMatch}
                    />
                    <Button onClick={addFirstMatch} className="purp-btn purp-btn-primary">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Coin
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {sortedCoins.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-[var(--bg-tertiary)] z-10">
                        <TableRow className="border-[var(--border-primary)]">
                          <TableHead className="text-[color:var(--text-secondary)]">Asset</TableHead>
                          <TableHead className="text-right text-[color:var(--text-secondary)]">Current Price</TableHead>
                          <TableHead className="text-right text-[color:var(--text-secondary)]">
                            {isRaceMode ? "Race %" : "% Since Start"}
                          </TableHead>
                          <TableHead className="text-right text-[color:var(--text-secondary)]">
                            Rate of Change
                          </TableHead>
                          <TableHead className="text-right text-[color:var(--text-secondary)]">Daily %</TableHead>
                          <TableHead className="text-center text-[color:var(--text-secondary)]">Momentum</TableHead>
                          <TableHead className="text-center text-[color:var(--text-secondary)]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedCoins.map((coin, index) => (
                          <TableRow key={coin.id} className="border-[var(--border-primary)] tr-hover">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div
                                  className="size-8 rounded-full grid place-items-center text-white text-sm font-semibold"
                                  style={{ backgroundColor: COIN_COLORS[index % COIN_COLORS.length] }}
                                  aria-hidden="true"
                                >
                                  {coin.symbol.charAt(0)}
                                </div>
                                <div>
                                  <div className="font-semibold">{coin.symbol}</div>
                                  <div className="text-xs text-slate-400">{coin.name}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono">${formatPrice(coin.currentPrice)}</TableCell>
                            <TableCell className="text-right">
                              <span
                                className={`font-semibold ${
                                  coin.changesSinceStart > 0
                                    ? "text-[color:var(--accent-success)]"
                                    : coin.changesSinceStart < 0
                                      ? "text-[#ff4757]"
                                      : "text-[color:var(--text-secondary)]"
                                }`}
                              >
                                {watchlistData.startTime ? formatPercentage(coin.changesSinceStart) : "—"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="inline-flex items-center gap-1">
                                {Math.abs(coin.rateOfChange) > 0.1 &&
                                  (coin.rateOfChange > 0 ? (
                                    <TrendingUp
                                      className="h-3 w-3 text-[color:var(--accent-success)]"
                                      aria-hidden="true"
                                    />
                                  ) : (
                                    <TrendingDown className="h-3 w-3 text-[#ff4757]" aria-hidden="true" />
                                  ))}
                                <span
                                  className={`text-sm ${
                                    Math.abs(coin.rateOfChange) > 0.5
                                      ? coin.rateOfChange > 0
                                        ? "text-[color:var(--accent-success)]"
                                        : "text-[#ff4757]"
                                      : "text-[color:var(--text-secondary)]"
                                  }`}
                                >
                                  {coin.rateOfChange.toFixed(2)}%/min
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <span
                                className={
                                  coin.dailyChange > 0 ? "text-[color:var(--accent-success)]" : "text-[#ff4757]"
                                }
                              >
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
                                <DropdownMenuContent className="bg-slate-900 border-slate-700">
                                  <DropdownMenuItem
                                    onClick={() => removeCoin(coin.id)}
                                    className="text-red-400 focus:text-red-400 focus:bg-slate-800"
                                  >
                                    <X className="mr-2 h-4 w-4" />
                                    Remove
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="py-16 text-center">
                    <div className="mx-auto size-16 rounded-full bg-slate-800 grid place-items-center mb-4">
                      <Plus className="h-7 w-7 text-slate-400" />
                    </div>
                    <div className="text-lg font-medium">Start Building Your Watchlist</div>
                    <div className="text-slate-400 text-sm mt-1">Search and add coins to get started.</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chart">
            <Card className="bg-[var(--bg-secondary)] border-[var(--border-primary)]">
              <CardHeader className="border-b border-[var(--border-primary)]">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      onClick={() => setActiveTab("table")}
                      className="text-slate-300 hover:text-slate-100"
                    >
                      ← Back to Table
                    </Button>
                    <div>
                      <CardTitle className="text-base">Momentum Chart</CardTitle>
                      <CardDescription>Normalized performance since start</CardDescription>
                    </div>
                  </div>

                  {/* Timeframe moved to chart header (top-right on desktop, natural flow on mobile) */}
                  <div className="flex items-center gap-1 border border-[var(--border-primary)] rounded-lg p-1 bg-[var(--bg-primary)]">
                    {(["1min", "5min", "15min", "1h", "1d"] as TimeFrame[]).map((tf) => (
                      <Button
                        key={tf}
                        size="sm"
                        variant={timeFrame === tf ? "default" : "ghost"}
                        onClick={() => setTimeFrame(tf)}
                        className={
                          timeFrame === tf
                            ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                            : "text-[color:var(--text-secondary)] hover:text-[var(--text-primary)]"
                        }
                        aria-pressed={timeFrame === tf}
                      >
                        {tf}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-[28rem] p-0">
                <div className="h-full">
                  <RaceChart coins={sortedCoins} startTime={watchlistData.startTime} timeFrame={timeFrame} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Fallback Add Dialog (optional selector when no query) */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle>Add Coin to Watchlist</DialogTitle>
            <DialogDescription>Pick from popular assets.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-64">
            <div className="grid grid-cols-1 gap-2">
              {MOCK_COINS.filter((c) => !symbols.includes(c.symbol)).map((coin) => (
                <Button
                  key={coin.symbol}
                  variant="ghost"
                  className="justify-start h-auto py-3"
                  onClick={() => {
                    addCoin(coin)
                    setIsAddModalOpen(false)
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-slate-700 text-white text-sm font-semibold grid place-items-center">
                      {coin.symbol.charAt(0)}
                    </div>
                    <div className="text-left">
                      <div className="font-medium">{coin.symbol}</div>
                      <div className="text-xs text-slate-400">{coin.name}</div>
                    </div>
                  </div>
                </Button>
              ))}
              {MOCK_COINS.filter((c) => !symbols.includes(c.symbol)).length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm">All demo coins added</div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Mini sparkline
function MiniSparkline({ data, isPositive }: { data: number[]; isPositive: boolean }) {
  if (data.length < 2) return <div className="w-16 h-6" />
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * 60
      const y = 20 - ((v - min) / range) * 16
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
        opacity="0.9"
      />
    </svg>
  )
}
