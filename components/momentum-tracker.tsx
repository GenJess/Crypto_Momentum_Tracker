"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { SearchIcon, Plus, X, RotateCcw, Flag, Pause, MoreHorizontal, LineChart, LayoutList } from "lucide-react"
import { Inter } from "next/font/google"

const inter = Inter({ subsets: ["latin"] })

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

const COIN_COLORS = ["#8b5cf6", "#00d9ff", "#00ff88", "#ff007f", "#ffaa00", "#9d4edd", "#ec4899", "#06b6d4"]

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

// Chart (kept; styles rely on container background)
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
    ctx.strokeStyle = "#3a3d4a"
    ctx.lineWidth = 0.6
    ctx.setLineDash([3, 3])
    for (let i = 0; i <= 5; i++) {
      const y = padding + (i / 5) * h
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(padding + w, y)
      ctx.stroke()
      const v = max - (i / 5) * range
      ctx.fillStyle = "#a3a3a3"
      ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace"
      ctx.textAlign = "right"
      ctx.fillText(`${v.toFixed(1)}%`, padding - 6, y + 3)
    }

    // zero-line
    const zeroY = padding + ((max - 0) / range) * h
    ctx.setLineDash([])
    ctx.strokeStyle = "#6b7280"
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
      ctx.fillStyle = "#f8f8f2"
      ctx.font = "12px ui-sans-serif, system-ui"
      ctx.textAlign = "left"
      ctx.fillText(`${coin.symbol}`, x + 8, y + 4)
    })
  }, [coins, startTime, timeFrame])

  if (!startTime || coins.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--text-secondary)]">
        <div className="text-center">
          <Flag className="h-10 w-10 mx-auto mb-3 opacity-60" />
          <p className="text-sm">Start a race to see the momentum chart</p>
        </div>
      </div>
    )
  }
  return <canvas ref={canvasRef} className="w-full h-full" />
}

// Typeahead Add (PurpDex input styling)
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
    <div className="pd-search w-full">
      <input
        aria-label="Search coins"
        placeholder="Search crypto assets — press Enter to add"
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
      />
      <span className="icon">
        <SearchIcon className="h-4 w-4" />
      </span>
      {value && (
        <button
          aria-label="Clear search"
          className="clear"
          onClick={() => {
            onValueChange("")
            setOpen(false)
          }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      <Command
        shouldFilter={false}
        className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg mt-2"
      >
        <CommandInput value={value} onValueChange={onValueChange} placeholder="Filter..." className="hidden" />
        <CommandList className="max-h-64">
          {filtered.length === 0 ? (
            <CommandEmpty className="p-3 text-[var(--text-secondary)]">No coins found</CommandEmpty>
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
                    <div className="size-6 rounded-full bg-[color:var(--bg-tertiary)] text-white text-xs font-semibold grid place-items-center">
                      {coin.symbol.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">{coin.symbol}</span>
                      <span className="text-[11px] text-[var(--text-secondary)]">{coin.name}</span>
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
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

  return (
    <div className={`purpdex-theme ${inter.className}`}>
      <div className="pd-container">
        {/* Header */}
        <header className="pd-header">
          <div className="pd-brand">
            <div className="pd-brand-logo">
              {/* chain-like logo */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 8L12 4L16 8L12 12L8 8Z" opacity="0.8" />
                <path d="M8 16L12 12L16 16L12 20L8 16Z" opacity="0.6" />
                <path d="M4 12L8 8L12 12L8 16L4 12Z" opacity="0.4" />
                <path d="M12 12L16 8L20 12L16 16L12 12Z" opacity="0.4" />
              </svg>
            </div>
            <div>
              <div className="pd-brand-title">PurpDex</div>
              <div className="pd-brand-sub">Rate of Change (ROC) Tracker • Ink Chain</div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <div className="pd-live" style={{ display: isTracking ? "inline-flex" : "none" }}>
              <span className="pd-live-dot" />
              TRACKING
            </div>
            <Badge
              variant="outline"
              className={
                isRaceMode
                  ? "border-0 bg-[var(--purple-primary)] text-white"
                  : isTracking
                    ? "border-0 bg-[var(--accent-success)] text-[#061d12]"
                    : "border border-[var(--border-primary)] text-[var(--text-secondary)]"
              }
            >
              {isRaceMode ? "Race Active" : isTracking ? "Tracking" : "Ready"}
            </Badge>
          </div>
        </header>

        {/* Stats */}
        <div className="roc-stats">
          <div className="roc-card largest-mover">
            <div className="roc-card-title">{isRaceMode ? "Race Leader" : "Best Performer"}</div>
            <div className="roc-card-value">
              {bestPerformer?.symbol || "N/A"}{" "}
              {bestPerformer && (
                <span className={bestPerformer.changesSinceStart >= 0 ? "momentum-positive" : "momentum-negative"}>
                  {` ${formatPercentage(bestPerformer.changesSinceStart)}`}
                </span>
              )}
            </div>
            <div className="roc-card-subtitle">{bestPerformer ? "Top performer since start" : "Add coins & start"}</div>
          </div>
          <div className="roc-card most-active">
            <div className="roc-card-title">Most Active</div>
            <div className="roc-card-value">
              {fastestMover?.symbol || "N/A"}{" "}
              {fastestMover && (
                <span className="momentum-active">{`${fastestMover.rateOfChange.toFixed(2)}%/min`}</span>
              )}
            </div>
            <div className="roc-card-subtitle">Fastest % change/min</div>
          </div>
          <div className="roc-card live-tracking">
            <div className="roc-card-title">{isRaceMode ? "Race Started" : "Tracking Since"}</div>
            <div className="roc-card-value">
              {watchlistData.startTime
                ? new Date(watchlistData.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "Not Started"}
            </div>
            <div className="roc-card-subtitle">
              {watchlistData.startTime ? `${Math.floor((Date.now() - watchlistData.startTime) / 60000)}m elapsed` : ""}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="controls-row">
          <AddCoinTypeahead
            value={query}
            onValueChange={setQuery}
            existingSymbols={watchlistData.coins.map((c) => c.symbol)}
            onSelectCoin={(coin) => addCoin(coin)}
            onAddFirstMatch={addFirstMatch}
          />
          {!isRaceMode ? (
            <button
              onClick={startRace}
              disabled={watchlistData.coins.length === 0}
              className="pd-btn pd-btn-start"
              aria-label="Start Race"
            >
              <Flag className="h-4 w-4" />
              Start ROC
            </button>
          ) : (
            <button onClick={stopRace} className="pd-btn pd-btn-reset" aria-label="Stop Race">
              <Pause className="h-4 w-4" />
              Stop Race
            </button>
          )}
          <button
            onClick={resetTracking}
            disabled={!isTracking}
            className="pd-btn pd-btn-reset"
            aria-label="Reset Tracking"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        </div>

        {/* Table/Card wrapper header */}
        <div className="pd-table-wrap">
          <div className="pd-table-head">
            <h3 className="pd-table-title">Assets</h3>

            <div className="flex items-center gap-4">
              {/* Timeframe segmented (top-right on desktop for chart; here for overall filter look) */}
              <div className="pd-timeframe hidden md:flex">
                {(["1min", "5min", "15min", "1h", "1d"] as TimeFrame[]).map((tf) => (
                  <button
                    key={tf}
                    className={`pd-time-btn ${timeFrame === tf ? "active" : ""}`}
                    onClick={() => setTimeFrame(tf)}
                    aria-pressed={timeFrame === tf}
                  >
                    {tf}
                  </button>
                ))}
              </div>

              <div className="pd-view-toggle">
                <button
                  className={`pd-view-btn ${activeTab === "table" ? "active" : ""}`}
                  onClick={() => setActiveTab("table")}
                >
                  <LayoutList className="h-4 w-4" />
                  Table
                </button>
                <button
                  className={`pd-view-btn ${activeTab === "chart" ? "active" : ""}`}
                  onClick={() => setActiveTab("chart")}
                >
                  <LineChart className="h-4 w-4" />
                  Chart
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          {activeTab === "chart" ? (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <button
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  onClick={() => setActiveTab("table")}
                >
                  ← Back to Table
                </button>
                <div className="pd-timeframe md:hidden">
                  {(["1min", "5min", "15min", "1h", "1d"] as TimeFrame[]).map((tf) => (
                    <button
                      key={tf}
                      className={`pd-time-btn ${timeFrame === tf ? "active" : ""}`}
                      onClick={() => setTimeFrame(tf)}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>
              <div
                className="rounded-xl border border-[var(--border-primary)]"
                style={{
                  background: "linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary))",
                  height: "28rem",
                }}
              >
                <RaceChart coins={sortedCoins} startTime={watchlistData.startTime} timeFrame={timeFrame} />
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {sortedCoins.length > 0 ? (
                <table className="pd-table">
                  <thead>
                    <tr>
                      <th>Asset</th>
                      <th className="text-right">Current Price</th>
                      <th className="text-right" title="Price change since ROC start">
                        ROC Since Start
                      </th>
                      <th className="text-right" title="Current rate of change per minute">
                        Current ROC Rate
                      </th>
                      <th className="text-right" title="24 hour price change">
                        24h Change
                      </th>
                      <th className="text-center" title="Momentum">
                        Status
                      </th>
                      <th className="text-center">Chart</th>
                      <th className="text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedCoins.map((coin, index) => (
                      <tr key={coin.id}>
                        <td>
                          <div className="pd-asset">
                            <div
                              className="pd-asset-icon"
                              style={{
                                background: `linear-gradient(135deg, ${COIN_COLORS[index % COIN_COLORS.length]}, #2f323f)`,
                              }}
                            >
                              {coin.symbol.charAt(0)}
                            </div>
                            <div>
                              <div className="pd-asset-name">{coin.symbol}</div>
                              <div className="pd-asset-sub">{coin.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-right">
                          <span className="pd-price">${formatPrice(coin.currentPrice)}</span>
                        </td>
                        <td className="text-right">
                          <span
                            className={
                              watchlistData.startTime
                                ? `font-extrabold ${coin.changesSinceStart > 0 ? "momentum-positive" : coin.changesSinceStart < 0 ? "momentum-negative" : "momentum-neutral"}`
                                : "momentum-neutral"
                            }
                          >
                            {watchlistData.startTime ? formatPercentage(coin.changesSinceStart) : "—"}
                          </span>
                        </td>
                        <td className="text-right">
                          <span
                            className={`font-semibold ${
                              Math.abs(coin.rateOfChange) > 0.5
                                ? coin.rateOfChange > 0
                                  ? "momentum-positive"
                                  : "momentum-negative"
                                : "momentum-neutral"
                            }`}
                          >
                            {coin.rateOfChange.toFixed(2)}%/min
                          </span>
                        </td>
                        <td className="text-right">
                          <span className={coin.dailyChange >= 0 ? "momentum-positive" : "momentum-negative"}>
                            {formatPercentage(coin.dailyChange)}
                          </span>
                        </td>
                        <td className="text-center">
                          <span
                            className={`momentum-badge ${
                              Math.abs(coin.changesSinceStart) > 5
                                ? "badge-hot"
                                : Math.abs(coin.changesSinceStart) > 2
                                  ? "badge-active"
                                  : Math.abs(coin.changesSinceStart) > 0.5
                                    ? "badge-positive"
                                    : "badge-moderate"
                            }`}
                          >
                            {Math.abs(coin.changesSinceStart) > 5
                              ? "HOT"
                              : Math.abs(coin.changesSinceStart) > 2
                                ? "ACTIVE"
                                : Math.abs(coin.changesSinceStart) > 0.5
                                  ? "RISING"
                                  : "STABLE"}
                          </span>
                        </td>
                        <td className="text-center">
                          {/* Mini sparkline */}
                          <svg width="60" height="20" viewBox="0 0 60 20" fill="none">
                            {(() => {
                              const data = coin.priceHistory.slice(-20).map((p) => p.price)
                              if (data.length < 2) return <></>
                              const min = Math.min(...data)
                              const max = Math.max(...data)
                              const range = max - min || 1
                              const pts = data
                                .map((v, i) => {
                                  const x = (i / (data.length - 1)) * 60
                                  const y = 18 - ((v - min) / range) * 14
                                  return `${x},${y}`
                                })
                                .join(" ")
                              const color =
                                coin.changesSinceStart > 5
                                  ? "var(--accent-hot)"
                                  : coin.changesSinceStart > 2
                                    ? "var(--accent-cyan)"
                                    : coin.changesSinceStart > 0
                                      ? "var(--accent-success)"
                                      : "var(--text-muted)"
                              return (
                                <>
                                  <polyline points={pts} stroke={color} strokeWidth="1.5" fill="none" />
                                  <circle
                                    cx="60"
                                    cy={18 - ((data[data.length - 1] - min) / range) * 14}
                                    r="1.5"
                                    fill={color}
                                  />
                                </>
                              )
                            })()}
                          </svg>
                        </td>
                        <td className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="pd-btn pd-btn-primary">
                                <MoreHorizontal className="h-4 w-4" />
                                Actions
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-[var(--bg-secondary)] border-[color:var(--border-primary)]">
                              <DropdownMenuItem
                                onClick={() => removeCoin(coin.id)}
                                className="focus:bg-[var(--bg-hover)] focus:text-white"
                              >
                                <X className="mr-2 h-4 w-4" />
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-16 text-center">
                  <div className="mx-auto size-16 rounded-full bg-[var(--bg-tertiary)] grid place-items-center mb-4">
                    <Plus className="h-7 w-7 text-[var(--text-secondary)]" />
                  </div>
                  <div className="text-lg font-medium">Start Building Your Watchlist</div>
                  <div className="text-[var(--text-secondary)] text-sm mt-1">Search and add coins to get started.</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fallback Add Dialog */}
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="sm:max-w-md bg-[var(--bg-secondary)] border-[color:var(--border-primary)]">
            <DialogHeader>
              <DialogTitle className="text-[var(--text-primary)]">Add Coin to Watchlist</DialogTitle>
              <DialogDescription className="text-[var(--text-secondary)]">Pick from popular assets.</DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-64">
              <div className="grid grid-cols-1 gap-2">
                {MOCK_COINS.filter((c) => !symbols.includes(c.symbol)).map((coin) => (
                  <button
                    key={coin.symbol}
                    className="text-left p-3 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] transition-colors"
                    onClick={() => {
                      addCoin(coin)
                      setIsAddModalOpen(false)
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-[var(--bg-hover)] text-white text-sm font-semibold grid place-items-center">
                        {coin.symbol.charAt(0)}
                      </div>
                      <div className="text-left">
                        <div className="font-semibold">{coin.symbol}</div>
                        <div className="text-xs text-[var(--text-secondary)]">{coin.name}</div>
                      </div>
                    </div>
                  </button>
                ))}
                {MOCK_COINS.filter((c) => !symbols.includes(c.symbol)).length === 0 && (
                  <div className="text-center py-8 text-[var(--text-secondary)] text-sm">All demo coins added</div>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
