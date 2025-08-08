import React, { useState } from 'react';

const CoinSearch = ({ allCoins, onAddCoin, isLoading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCoins, setFilteredCoins] = useState([]);

  const handleSearch = (e) => {
    const term = e.target.value;
    setSearchTerm(term);

    if (term.length > 1) {
      const filtered = allCoins.filter(coin =>
        coin.name.toLowerCase().includes(term.toLowerCase()) ||
        coin.symbol.toLowerCase().includes(term.toLowerCase())
      );
      setFilteredCoins(filtered.slice(0, 5)); // Show top 5 matches
    } else {
      setFilteredCoins([]);
    }
  };

  const handleAdd = (coin) => {
    onAddCoin(coin.id);
    setSearchTerm('');
    setFilteredCoins([]);
  };

  return (
    <div className="relative">
      <input
        type="text"
        placeholder={isLoading ? "Loading coins..." : "Search to add coins..."}
        value={searchTerm}
        onChange={handleSearch}
        disabled={isLoading}
        className="w-full p-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {filteredCoins.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg">
          {filteredCoins.map(coin => (
            <li
              key={coin.id}
              onClick={() => handleAdd(coin)}
              className="p-2 cursor-pointer hover:bg-gray-700 flex items-center"
            >
              <img src={coin.image} alt={coin.name} className="w-6 h-6 mr-2" />
              <span>{coin.name} ({coin.symbol.toUpperCase()})</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CoinSearch;
