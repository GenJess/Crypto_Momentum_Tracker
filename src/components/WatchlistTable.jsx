import React from 'react';

const WatchlistTable = ({ watchlistData, allCoins, onRemoveCoin, isLoading }) => {
  const getCoinDetails = (coinId) => {
    return allCoins?.find(coin => coin.id === coinId);
  };

  const coinIds = Object.keys(watchlistData || {});

  if (isLoading) {
    return <div className="text-center">Loading watchlist data...</div>;
  }

  if (!watchlistData || coinIds.length === 0) {
    return <div className="text-center">Your watchlist is empty. Add coins using the search bar above.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-gray-800 border border-gray-700">
        <thead>
          <tr className="bg-gray-700">
            <th className="p-2 text-left">Name</th>
            <th className="p-2 text-right">Price (USD)</th>
            <th className="p-2 text-right">24h Change (%)</th>
            <th className="p-2 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {coinIds.map(coinId => {
            const coinDetails = getCoinDetails(coinId);
            const data = watchlistData[coinId];
            const price = data?.usd;
            const change = data?.usd_24h_change;

            return (
              <tr key={coinId} className="border-t border-gray-700 hover:bg-gray-700/50">
                <td className="p-2 flex items-center">
                  <img src={coinDetails?.image} alt={coinDetails?.name} className="w-6 h-6 mr-3" />
                  <div>
                    <div>{coinDetails?.name}</div>
                    <div className="text-sm text-gray-400">{coinDetails?.symbol.toUpperCase()}</div>
                  </div>
                </td>
                <td className="p-2 text-right font-mono">${price?.toLocaleString()}</td>
                <td className={`p-2 text-right font-mono ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {change?.toFixed(2)}%
                </td>
                <td className="p-2 text-center">
                  <button
                    onClick={() => onRemoveCoin(coinId)}
                    className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 rounded"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default WatchlistTable;
