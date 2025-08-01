import React from 'react';
import { Download, RefreshCw, Database } from 'lucide-react';
import { WeatherData } from '../types/weather';
import { exportToCSV, formatDateTimeForFilename } from '../utils/csvExport';

interface ActionButtonsProps {
  data: WeatherData[];
  onScrapeData: () => void;
  isLoading: boolean;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  data,
  onScrapeData,
  isLoading
}) => {
  const handleDownload = () => {
    if (data.length === 0) {
      alert('ダウンロードするデータがありません');
      return;
    }
    
    const filename = `marine_weather_${formatDateTimeForFilename()}.csv`;
    exportToCSV(data, filename);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">アクション</h3>
      
      <div className="flex flex-wrap gap-4">
        <button
          onClick={onScrapeData}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'データ取得中...' : 'データ取得'}
        </button>
        
        <button
          onClick={handleDownload}
          disabled={data.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Download className="w-4 h-4" />
          CSVダウンロード ({data.length}件)
        </button>
        
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg">
          <Database className="w-4 h-4" />
          データベース: {data.length}件
        </div>
      </div>
    </div>
  );
};