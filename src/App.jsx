import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Watchlist from './Watchlist';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-900 text-white">
        <header className="bg-gray-800 p-4">
          <h1 className="text-2xl font-bold text-center">Crypto Watchlist</h1>
        </header>
        <main className="container mx-auto p-4">
          <Watchlist />
        </main>
      </div>
    </QueryClientProvider>
  );
}

export default App;
