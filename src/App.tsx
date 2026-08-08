import { useState } from 'react';
import { Navigation } from './components/Navigation';
import { Dashboard } from './pages/Dashboard';
import { DownloadPage } from './pages/DownloadPage';

function App() {
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'download'>('dashboard');

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'download':
        return <DownloadPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navigation currentPage={currentPage} onPageChange={setCurrentPage} />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        {renderCurrentPage()}
      </main>
    </div>
  );
}

export default App;
