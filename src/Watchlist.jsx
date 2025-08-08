import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

import CoinSearch from './components/CoinSearch';
import WatchlistTable from './components/WatchlistTable';

const Watchlist = () => {
  const [watchlist, setWatchlist] = useState(['bitcoin', 'ethereum', 'solana', 'cardano', 'ripple']); // Default coins

  // Fetch all available coins for the search functionality
  const { data: allCoins, isLoading: isLoadingAllCoins } = useQuery({
    queryKey: ['allCoins'],
    queryFn: async () => {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/coins/markets`, {
        params: {
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: 100,
          page: 1,
        },
      });
      return response.data;
    },
     staleTime: Infinity, // This data doesn't change often, so we can cache it for a long time
  });

  // Fetch prices for the coins in the watchlist
  const { data: watchlistData, isLoading: isLoadingWatchlist, error } = useQuery({
    queryKey: ['watchlistPrices', watchlist],
    queryFn: async () => {
      if (watchlist.length === 0) {
        return {};
      }
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/simple/price`, {
        params: {
          ids: watchlist.join(','),
          vs_currencies: 'usd',
          include_24hr_change: true,
        },
      });
      return response.data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    enabled: watchlist.length > 0, // Only run this query if the watchlist is not empty
  });

  const handleAddCoin = (coinId) => {
    if (!watchlist.includes(coinId)) {
      setWatchlist([...watchlist, coinId]);
    }
  };

  const handleRemoveCoin = (coinId) => {
    setWatchlist(watchlist.filter((id) => id !== coinId));
  };

  if (error) {
    return <div className="text-center text-red-500">Error fetching data. Please try again later.</div>;
  }


  return (
    <div>
      <CoinSearch allCoins={allCoins} onAddCoin={handleAddCoin} isLoading={isLoadingAllCoins} />
      <div className="mt-8">
        <WatchlistTable
          watchlistData={watchlistData}
          allCoins={allCoins}
          onRemoveCoin={handleRemoveCoin}
          isLoading={isLoadingWatchlist && watchlist.length > 0}
        />
      </div>
    </div>
  );
};

export default Watchlist;
