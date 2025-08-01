import React, { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { Dashboard } from './pages/Dashboard';
import { DownloadPage } from './pages/DownloadPage';
import { HistoryPage } from './pages/HistoryPage';

function App() {
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'download' | 'history'>('dashboard');

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'download':
        return <DownloadPage />;
      case 'history':
        return <HistoryPage />;
      default:
        return <Dashboard />;
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50">
      <Navigation currentPage={currentPage} onPageChange={setCurrentPage} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderCurrentPage()}
      </main>
    </div>
  );
}

export default App;