"use client"

import { useState } from "react"
import { X, Search } from "lucide-react"

interface AddCoinModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (coin: any) => void
  existingSymbols: string[]
}

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

export function AddCoinModal({ isOpen, onClose, onAdd, existingSymbols }: AddCoinModalProps) {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredCoins = MOCK_COINS.filter(
    (coin) =>
      !existingSymbols.includes(coin.symbol) &&
      (coin.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        coin.name.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-md max-h-96">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Add Coin to Watchlist</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search coins..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
              autoFocus
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
                className="w-full flex items-center space-x-3 p-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-left"
              >
                <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                  {coin.symbol.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white truncate">{coin.symbol}</div>
                  <div className="text-sm text-gray-400 truncate">{coin.name}</div>
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
    </div>
  )
}
