import React, { useState, useEffect } from 'react';
import { WeatherData } from '../types/weather';
import { dbService } from '../services/database';
import { DataTable } from '../components/DataTable';
import { StationSelector } from '../components/StationSelector';
import { ChevronLeft, ChevronRight, BarChart3 } from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const [allData, setAllData] = useState<WeatherData[]>([]);
  const [displayData, setDisplayData] = useState<WeatherData[]>([]);
  const [selectedStation, setSelectedStation] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  
  const itemsPerPage = 50;

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    filterAndPaginateData();
  }, [allData, selectedStation, currentPage]);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const data = await dbService.getWeatherData();
      setAllData(data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndPaginateData = () => {
    let filtered = allData;
    
    if (selectedStation) {
      filtered = allData.filter(d => d.station_code === selectedStation);
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setDisplayData(filtered.slice(startIndex, endIndex));
  };

  const getFilteredDataLength = (): number => {
    if (selectedStation) {
      return allData.filter(d => d.station_code === selectedStation).length;
    }
    return allData.length;
  };

  const getTotalPages = (): number => {
    return Math.ceil(getFilteredDataLength() / itemsPerPage);
  };

  const handleStationChange = (stationCode: string) => {
    setSelectedStation(stationCode);
    setCurrentPage(1); // Reset to first page when changing station
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getPaginationRange = (): number[] => {
    const totalPages = getTotalPages();
    const range: number[] = [];
    const maxVisible = 5;
    
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      range.push(i);
    }
    
    return range;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">データを読み込み中...</p>
        </div>
      </div>
    );
  }

  const totalPages = getTotalPages();
  const filteredLength = getFilteredDataLength();

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-6 h-6" />
          データ履歴
        </h2>
        <p className="text-gray-600">
          保存されている全ての観測データを閲覧できます。観測地点を選択してフィルタリングすることも可能です。
        </p>
      </div>

      {/* Station Filter */}
      <StationSelector
        selectedStation={selectedStation}
        onStationChange={handleStationChange}
      />

      {/* Data Summary */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            総データ数: {filteredLength}件
            {selectedStation && (
              <span className="ml-2 text-blue-600">
                (フィルタ適用中)
              </span>
            )}
          </div>
          <div className="text-sm text-gray-600">
            ページ {currentPage} / {totalPages}
          </div>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        data={displayData}
        title={`データ履歴 ${selectedStation ? `- ${selectedStation}` : '- 全地点'}`}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white p-4 rounded-lg shadow-md">
          <div className="flex items-center justify-center space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              前へ
            </button>

            {getPaginationRange().map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-3 py-2 text-sm rounded-md ${
                  currentPage === page
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              次へ
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};