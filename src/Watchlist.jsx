import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import WatchlistTable from './components/WatchlistTable';
import WatchlistCards from './components/WatchlistCards'; // Will create this next

const Watchlist = ({ watchlist, allCoins, onRemoveCoin }) => {
  const [view, setView] = useState('table'); // 'table' or 'cards'

  const { data: watchlistData, isLoading: isLoadingWatchlist, error } = useQuery({
    queryKey: ['watchlistPrices', watchlist],
    queryFn: async () => {
      if (watchlist.length === 0) return {};
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/simple/price`, {
        params: { ids: watchlist.join(','), vs_currencies: 'usd', include_24hr_change: true },
      });
      return response.data;
    },
    refetchInterval: 30000,
    enabled: watchlist.length > 0,
  });

  if (error) {
    return <div className="text-center text-red-500">Error fetching data. Please try again later.</div>;
  }

  const isLoading = isLoadingWatchlist && watchlist.length > 0;

  return (
    <div className="bg-bg-secondary border border-border-primary rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between p-6 border-b border-border-primary bg-gradient-to-r from-bg-secondary to-bg-tertiary">
        <h2 className="text-xl font-semibold text-text-primary flex items-center gap-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14H12L11 22L21 10H12L13 2Z"/></svg>
          Live Watchlist
        </h2>
        <div className="flex gap-1 bg-bg-tertiary p-1 rounded-xl border border-border-primary">
          <button onClick={() => setView('table')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === 'table' ? 'bg-purple-primary text-white shadow-glow-purple' : 'text-text-secondary hover:bg-bg-hover'}`}>Table</button>
          <button onClick={() => setView('cards')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === 'cards' ? 'bg-purple-primary text-white shadow-glow-purple' : 'text-text-secondary hover:bg-bg-hover'}`}>Cards</button>
        </div>
      </div>

      <div>
        {view === 'table' ? (
          <WatchlistTable
            watchlistData={watchlistData}
            allCoins={allCoins}
            onRemoveCoin={onRemoveCoin}
            isLoading={isLoading}
          />
        ) : (
          <WatchlistCards
            watchlistData={watchlistData}
            allCoins={allCoins}
            onRemoveCoin={onRemoveCoin}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
};

export default Watchlist;
