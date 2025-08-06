import React from 'react';
import { Anchor, Waves, Home, Download, BarChart3 } from 'lucide-react';

interface NavigationProps {
  currentPage: 'dashboard' | 'download' | 'history';
  onPageChange: (page: 'dashboard' | 'download' | 'history') => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentPage, onPageChange }) => {
  const navItems = [
    { id: 'dashboard' as const, label: 'ダッシュボード', icon: Home },
    { id: 'download' as const, label: 'データダウンロード', icon: Download },
    { id: 'history' as const, label: 'データ履歴', icon: BarChart3 }
  ];

  return (
    <header className="bg-gradient-to-r from-blue-600 to-teal-600 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Anchor className="w-8 h-8 text-white" />
              <Waves className="w-6 h-6 text-blue-200" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">伊勢湾気象データ管理システム</h1>
              <p className="text-blue-100 mt-1">Isewan Weather Data Management System</p>
            </div>
          </div>
        </div>
        
        <nav className="pb-4">
          <div className="flex space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onPageChange(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentPage === item.id
                      ? 'bg-blue-700 text-white'
                      : 'text-blue-100 hover:bg-blue-700 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </header>
  );
};