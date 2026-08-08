import React, { useCallback, useEffect, useState } from 'react';
import { Activity, X } from 'lucide-react';
import { DataTable } from '../components/DataTable';
import { LatestDataGrid } from '../components/LatestDataGrid';
import { WeatherTrendChart } from '../components/WeatherTrendChart';
import { WindDirectionRadar } from '../components/WindDirectionRadar';
import { SYSTEM_INFO, TIME_CONSTANTS } from '../constants/app';
import { apiService } from '../services/api';
import { STATIONS, WeatherData } from '../types/weather';

const DEFAULT_STATION_CODE = 'nagoyako_bw';

const formatLocalDateTime = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

export const Dashboard: React.FC = () => {
  const [latestData, setLatestData] = useState<WeatherData[]>([]);
  const [recentData, setRecentData] = useState<WeatherData[]>([]);
  const [selectedStation, setSelectedStation] = useState(DEFAULT_STATION_CODE);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [lastScraped, setLastScraped] = useState<Date | null>(null);

  const loadLatestData = useCallback(async () => {
    try {
      const data = await apiService.getLatestData();
      setLatestData(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading latest data:', error);
    }
  }, []);

  const loadRecentData = useCallback(async (stationCode: string) => {
    try {
      const threeHoursAgo = new Date(Date.now() - TIME_CONSTANTS.THREE_HOURS);
      const data = await apiService.getWeatherData(
        formatLocalDateTime(threeHoursAgo),
        undefined,
        stationCode || undefined,
        TIME_CONSTANTS.RECENT_DATA_LIMIT
      );
      setRecentData(data);
    } catch (error) {
      console.error('Error loading recent data:', error);
    }
  }, []);

  const loadLastScrapedTime = useCallback(async () => {
    try {
      const response = await apiService.getLastScrapedTime();
      if (response.last_scraped) setLastScraped(new Date(response.last_scraped));
    } catch (error) {
      console.error('Error loading last scraped time:', error);
    }
  }, []);

  useEffect(() => {
    void loadLatestData();
    void loadRecentData(selectedStation);
    void loadLastScrapedTime();

    const interval = window.setInterval(() => {
      void loadLatestData();
      void loadRecentData(selectedStation);
      void loadLastScrapedTime();
    }, TIME_CONSTANTS.REFRESH_INTERVAL);

    return () => window.clearInterval(interval);
  }, [loadLastScrapedTime, loadLatestData, loadRecentData, selectedStation]);

  const selectedStationName = selectedStation
    ? latestData.find(data => data.station_code === selectedStation)?.station_name ??
      STATIONS.find(station => station.code === selectedStation)?.name ??
      selectedStation
    : '全地点';

  return (
    <div className="space-y-10">
      <LatestDataGrid
        data={latestData}
        onStationClick={setSelectedStation}
        lastUpdated={lastUpdated}
      />

      {selectedStation && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(360px,2fr)]">
          <WeatherTrendChart data={recentData} stationName={selectedStationName} />
          <WindDirectionRadar data={recentData} stationName={selectedStationName} />
        </div>
      )}

      <section className="space-y-4" aria-labelledby="recent-data-heading">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
              Recent
            </p>
            <h2
              id="recent-data-heading"
              className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl"
            >
              最近のデータ
              <span className="ml-2 text-sm font-normal text-slate-500">過去3時間</span>
            </h2>
            <p className="mt-1.5 text-sm text-slate-500">
              {selectedStationName}を表示中
            </p>
          </div>

          {selectedStation && (
            <button
              type="button"
              onClick={() => setSelectedStation('')}
              className="flex w-fit items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              全地点を表示
            </button>
          )}
        </div>

        <DataTable data={recentData} title={`${selectedStationName}の観測データ`} />
      </section>

      <section
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        aria-labelledby="system-info-heading"
      >
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Activity className="h-4 w-4" aria-hidden="true" />
          </span>
          <h3 id="system-info-heading" className="font-semibold text-slate-900">
            システム情報
          </h3>
        </div>
        <dl className="grid grid-cols-2 gap-px bg-slate-200 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ['観測地点', `${SYSTEM_INFO.STATION_COUNT}箇所`],
            ['データ項目', SYSTEM_INFO.DATA_ITEMS.join('・')],
            ['自動更新', SYSTEM_INFO.UPDATE_INTERVAL],
            ['時間精度', SYSTEM_INFO.TIME_PRECISION],
            ['データ形式', SYSTEM_INFO.DATA_FORMAT],
            ['履歴保存', SYSTEM_INFO.HISTORY_TYPE],
          ].map(([label, value]) => (
            <div key={label} className="bg-white px-5 py-4">
              <dt className="text-xs font-medium text-slate-500">{label}</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-800">{value}</dd>
            </div>
          ))}
        </dl>
        {lastScraped && (
          <div className="border-t border-slate-200 px-5 py-3 sm:px-6">
            <p className="text-xs text-slate-500">
              最終スクレイピング: {lastScraped.toLocaleString('ja-JP')}
            </p>
          </div>
        )}
      </section>
    </div>
  );
};
