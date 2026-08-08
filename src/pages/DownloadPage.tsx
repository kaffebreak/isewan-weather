import React, { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  FileDown,
  Info,
  Search,
} from 'lucide-react';
import { DataTable } from '../components/DataTable';
import { DateTimeSelector } from '../components/DateTimeSelector';
import { StationSelector } from '../components/StationSelector';
import { WeatherTrendChart } from '../components/WeatherTrendChart';
import { WindDirectionRadar } from '../components/WindDirectionRadar';
import { apiService } from '../services/api';
import { STATIONS, WeatherData, WindChartData } from '../types/weather';
import { exportToCSV, exportToCSVForMarine } from '../utils/csvExport';

const HOURS_24 = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 50;
const MAX_VISIBLE_PAGES = 5;
const MAX_BROWSER_EXPORT_RECORDS = 10_000;

interface SearchFilters {
  startDate: string;
  endDate: string;
  stationCode?: string;
  marineMode: boolean;
}

const formatForDateTimeLocal = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const generateFilename = (prefix: string) => {
  const timestamp = formatForDateTimeLocal(new Date())
    .replace(/-/g, '')
    .replace(':', '')
    .replace('T', '_');
  return `${prefix}_${timestamp}.csv`;
};

const formatPeriodDateTime = (value: string) =>
  value.replace('T', ' ').replace(/-/g, '/');

export const DownloadPage: React.FC = () => {
  const [previewData, setPreviewData] = useState<WeatherData[]>([]);
  const [windChartData, setWindChartData] = useState<WindChartData | null>(null);
  const [selectedStation, setSelectedStation] = useState('');
  const [isMarineMode, setIsMarineMode] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<SearchFilters | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const now = new Date();
    setStartDate(formatForDateTimeLocal(new Date(now.getTime() - HOURS_24)));
    setEndDate(formatForDateTimeLocal(now));
  }, []);

  const loadPreview = async (
    filters: SearchFilters,
    page: number,
    refreshCount: boolean
  ) => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const offset = (page - 1) * PAGE_SIZE;
      const dataPromise = apiService.getWeatherData(
        filters.startDate,
        filters.endDate,
        filters.stationCode,
        PAGE_SIZE,
        offset
      );
      const statsPromise = refreshCount
        ? apiService.getStats(
            filters.startDate,
            filters.endDate,
            filters.stationCode
          )
        : Promise.resolve(null);
      const chartPromise =
        refreshCount && filters.stationCode
          ? apiService.getWindChartData(
              filters.startDate,
              filters.endDate,
              filters.stationCode
            )
          : Promise.resolve(null);
      const [data, stats, chartData] = await Promise.all([
        dataPromise,
        statsPromise,
        chartPromise,
      ]);

      setPreviewData(data);
      if (stats) setTotalRecords(stats.total_records);
      if (refreshCount) setWindChartData(chartData);
      setAppliedFilters(filters);
      setCurrentPage(page);
      setHasSearched(true);
    } catch (error) {
      console.error('Error loading data:', error);
      setErrorMessage('データを取得できませんでした。時間をおいて再度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!startDate || !endDate) {
      setErrorMessage('開始日時と終了日時を指定してください。');
      return;
    }
    if (startDate > endDate) {
      setErrorMessage('開始日時は終了日時より前にしてください。');
      return;
    }

    void loadPreview(
      {
        startDate,
        endDate,
        stationCode: selectedStation || undefined,
        marineMode: isMarineMode,
      },
      1,
      true
    );
  };

  const handlePageChange = (page: number) => {
    if (!appliedFilters || page === currentPage || isLoading) return;
    void loadPreview(appliedFilters, page, false);
  };

  const handleDownload = async () => {
    if (!appliedFilters || totalRecords === 0) return;
    if (totalRecords > MAX_BROWSER_EXPORT_RECORDS) {
      setErrorMessage(
        `CSV出力は${MAX_BROWSER_EXPORT_RECORDS.toLocaleString('ja-JP')}件までです。期間または地点を絞り込んでください。`
      );
      return;
    }

    setIsExporting(true);
    setErrorMessage('');
    try {
      const data = await apiService.getWeatherData(
        appliedFilters.startDate,
        appliedFilters.endDate,
        appliedFilters.stationCode
      );

      if (appliedFilters.marineMode) {
        exportToCSVForMarine(data, generateFilename('isewan_marine'));
      } else {
        const stationSuffix = appliedFilters.stationCode
          ? `_${appliedFilters.stationCode}`
          : '_all_stations';
        exportToCSV(
          data,
          generateFilename(`isewan_weather${stationSuffix}`)
        );
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      setErrorMessage('CSV用データを取得できませんでした。');
    } finally {
      setIsExporting(false);
    }
  };

  const handleStationChange = (stationCode: string) => {
    setSelectedStation(stationCode);
    if (stationCode) setIsMarineMode(false);
  };

  const handleMarineModeChange = (marineMode: boolean) => {
    setIsMarineMode(marineMode);
    if (marineMode) setSelectedStation('');
  };

  const totalPages = Math.ceil(totalRecords / PAGE_SIZE);
  const appliedStationName = appliedFilters?.marineMode
    ? '湾内乗下船用'
    : appliedFilters?.stationCode
      ? STATIONS.find(station => station.code === appliedFilters.stationCode)?.name
      : '全地点';
  const filtersChanged = Boolean(
    appliedFilters &&
      (appliedFilters.startDate !== startDate ||
        appliedFilters.endDate !== endDate ||
        appliedFilters.stationCode !== (selectedStation || undefined) ||
        appliedFilters.marineMode !== isMarineMode)
  );
  const graphPeriodLabel = appliedFilters
    ? `${formatPeriodDateTime(appliedFilters.startDate)}〜${formatPeriodDateTime(appliedFilters.endDate)}`
    : '指定期間';

  const getPaginationRange = () => {
    let start = Math.max(1, currentPage - Math.floor(MAX_VISIBLE_PAGES / 2));
    const end = Math.min(totalPages, start + MAX_VISIBLE_PAGES - 1);
    if (end - start + 1 < MAX_VISIBLE_PAGES) {
      start = Math.max(1, end - MAX_VISIBLE_PAGES + 1);
    }
    return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
  };

  return (
    <div className="space-y-6">
      <section
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        aria-labelledby="download-heading"
      >
        <div className="flex items-start gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <FileDown className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
              Search & Export
            </p>
            <h2
              id="download-heading"
              className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl"
            >
              データ検索・ダウンロード
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              条件に合う履歴を50件ずつ確認し、必要なデータだけをCSVで出力できます。
            </p>
          </div>
        </div>
      </section>

      <form onSubmit={handleSearch} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <DateTimeSelector
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />
          <StationSelector
            selectedStation={selectedStation}
            onStationChange={handleStationChange}
            isMarineMode={isMarineMode}
            onMarineModeChange={handleMarineModeChange}
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <Database className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs text-slate-500">
                  {hasSearched ? `${appliedStationName}の検索結果` : '検索結果'}
                </p>
                <p className="font-semibold tabular-nums text-slate-900">
                  {hasSearched
                    ? `${totalRecords.toLocaleString('ja-JP')}件`
                    : '条件を指定してください'}
                </p>
                {filtersChanged && (
                  <p className="mt-1 text-xs text-blue-600">
                    条件が変更されています。再度検索してください。
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="submit"
                disabled={isLoading || !startDate || !endDate}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              >
                <Search className="h-4 w-4" aria-hidden="true" />
                {isLoading ? '検索中…' : '検索・表示'}
              </button>
              <button
                type="button"
                onClick={() => void handleDownload()}
                disabled={
                  !hasSearched ||
                  totalRecords === 0 ||
                  isLoading ||
                  isExporting ||
                  filtersChanged
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                {isExporting ? 'CSV作成中…' : 'CSVダウンロード'}
              </button>
            </div>
          </div>

          {errorMessage && (
            <p role="alert" className="mt-3 text-sm text-red-600">
              {errorMessage}
            </p>
          )}
        </div>
      </form>

      {hasSearched ? (
        <>
          {isLoading ? (
            <div className="flex min-h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white">
              <div className="text-center">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-700" />
                <p className="text-sm text-slate-500">データを読み込んでいます</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {appliedFilters?.stationCode && windChartData ? (
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(360px,2fr)]">
                  <WeatherTrendChart
                    data={windChartData.trend_data}
                    stationName={appliedStationName ?? appliedFilters.stationCode}
                    periodLabel={graphPeriodLabel}
                    aggregateSummary={windChartData.summary}
                  />
                  <WindDirectionRadar
                    data={windChartData.trend_data}
                    stationName={appliedStationName ?? appliedFilters.stationCode}
                    periodLabel={graphPeriodLabel}
                    aggregateCounts={windChartData.direction_counts}
                    aggregateWeakWindCount={windChartData.summary.weak_wind_count}
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                  風速トレンドと風配図を表示するには、地点を1つ選択して検索してください。
                </div>
              )}

              <DataTable
                data={previewData}
                title={`${appliedStationName}の検索結果`}
              />
            </div>
          )}

          {totalPages > 1 && !isLoading && (
            <nav
              aria-label="検索結果ページ"
              className="flex flex-wrap items-center justify-center gap-2"
            >
              <button
                type="button"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="inline-flex h-10 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                前へ
              </button>

              {getPaginationRange().map(page => (
                <button
                  type="button"
                  key={page}
                  onClick={() => handlePageChange(page)}
                  aria-current={currentPage === page ? 'page' : undefined}
                  className={`h-10 min-w-10 rounded-lg px-3 text-sm font-medium transition ${
                    currentPage === page
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="inline-flex h-10 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                次へ
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </nav>
          )}

          {totalRecords > MAX_BROWSER_EXPORT_RECORDS && (
            <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-900">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" aria-hidden="true" />
              <p className="text-sm leading-6">
                CSV出力は{MAX_BROWSER_EXPORT_RECORDS.toLocaleString('ja-JP')}件までです。
                期間または地点を絞り込んでください。
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-14 text-center">
          <Search className="mx-auto h-9 w-9 text-slate-300" aria-hidden="true" />
          <p className="mt-4 text-sm font-medium text-slate-700">
            条件を指定して「検索・表示」を押してください
          </p>
          <p className="mt-1 text-sm text-slate-500">
            検索するまでは履歴データを読み込みません。
          </p>
        </div>
      )}
    </div>
  );
};
