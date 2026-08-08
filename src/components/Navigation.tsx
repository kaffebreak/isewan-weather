import React from 'react';
import { Anchor, Home, Search } from 'lucide-react';

interface NavigationProps {
  currentPage: 'dashboard' | 'download';
  onPageChange: (page: 'dashboard' | 'download') => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentPage, onPageChange }) => {
  const navItems = [
    { id: 'dashboard' as const, label: 'ダッシュボード', icon: Home },
    { id: 'download' as const, label: 'データ検索・ダウンロード', icon: Search }
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 shadow-sm shadow-blue-600/20">
            <Anchor className="h-5 w-5 text-white" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight text-slate-950 sm:text-lg">
              伊勢湾気象データ管理システム
            </h1>
            <p className="mt-0.5 hidden text-xs text-slate-500 sm:block">
              Isewan Weather Data Management System
            </p>
          </div>
        </div>

        <nav aria-label="メインナビゲーション" className="-mx-1 overflow-x-auto px-1">
          <div className="flex min-w-max items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onPageChange(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
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
