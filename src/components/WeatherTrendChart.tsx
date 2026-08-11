import React from 'react';
import { TrendingUp, Wind } from 'lucide-react';
import { WeatherData } from '../types/weather';
import { parseJstTimestamp } from '../utils/datetime';

interface WeatherTrendChartProps {
  data: WeatherData[];
  stationName: string;
  periodLabel?: string;
  aggregateSummary?: {
    total_records: number;
    latest_wind_speed: number | null;
    average_wind_speed: number | null;
    max_wind_speed: number | null;
    weak_wind_count: number;
    is_sampled: boolean;
  };
}

const CHART_WIDTH = 720;
const CHART_HEIGHT = 240;
const PADDING = { top: 24, right: 24, bottom: 40, left: 52 };
const GRID_LINES = 4;
const MAX_TIME_LABELS = 5;

export const WeatherTrendChart: React.FC<WeatherTrendChartProps> = ({
  data,
  stationName,
  periodLabel = '過去3時間',
  aggregateSummary,
}) => {
  const observations = data
    .slice()
    .sort((left, right) => left.timestamp.localeCompare(right.timestamp));
  const measurements = observations.filter(
    (item): item is WeatherData & { wind_speed: number } =>
      typeof item.wind_speed === 'number'
  );
  const weakWindObservations = observations.filter(
    item => item.wind_status === 'weak'
  );

  if (measurements.length === 0 && weakWindObservations.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <Wind className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
        <p className="mt-3 text-sm font-medium text-slate-700">
          グラフ表示できる風速データがありません
        </p>
      </section>
    );
  }

  const speeds = measurements.map(item => item.wind_speed);
  const latestSpeed = aggregateSummary
    ? aggregateSummary.latest_wind_speed ?? undefined
    : speeds[speeds.length - 1];
  const maxSpeed = aggregateSummary
    ? aggregateSummary.max_wind_speed ?? undefined
    : speeds.length > 0
      ? Math.max(...speeds)
      : undefined;
  const averageSpeed =
    aggregateSummary?.average_wind_speed ??
    (speeds.length > 0
      ? speeds.reduce((sum, value) => sum + value, 0) / speeds.length
      : undefined);
  const weakWindCount =
    aggregateSummary?.weak_wind_count ?? weakWindObservations.length;
  const yMax = Math.max(1, Math.ceil((maxSpeed ?? 0) * 1.2));
  const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const parseTimestamp = (timestamp: string) =>
    parseJstTimestamp(timestamp).getTime();
  const firstTimestamp = parseTimestamp(observations[0].timestamp);
  const lastTimestamp = parseTimestamp(
    observations[observations.length - 1].timestamp
  );

  const getX = (index: number) => {
    if (
      observations.length === 1 ||
      !Number.isFinite(firstTimestamp) ||
      !Number.isFinite(lastTimestamp) ||
      firstTimestamp === lastTimestamp
    ) {
      return PADDING.left + plotWidth / 2;
    }
    const timestamp = parseTimestamp(observations[index].timestamp);
    return (
      PADDING.left +
      ((timestamp - firstTimestamp) / (lastTimestamp - firstTimestamp)) * plotWidth
    );
  };
  const getY = (speed: number) =>
    PADDING.top + plotHeight - (speed / yMax) * plotHeight;
  const spansMultipleDays =
    observations[0].timestamp.slice(0, 10) !==
    observations[observations.length - 1].timestamp.slice(0, 10);
  const formatTime = (timestamp: string) => {
    const date = parseJstTimestamp(timestamp);
    return spansMultipleDays
      ? date.toLocaleString('ja-JP', {
          month: 'numeric',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : date.toLocaleTimeString('ja-JP', {
          hour: '2-digit',
          minute: '2-digit',
        });
  };

  const lineSegments: Array<Array<{ item: WeatherData & { wind_speed: number }; index: number }>> = [];
  let currentSegment: Array<{
    item: WeatherData & { wind_speed: number };
    index: number;
  }> = [];

  observations.forEach((item, index) => {
    if (typeof item.wind_speed === 'number') {
      currentSegment.push({
        item: item as WeatherData & { wind_speed: number },
        index,
      });
      return;
    }

    if (currentSegment.length > 0) lineSegments.push(currentSegment);
    currentSegment = [];
  });
  if (currentSegment.length > 0) lineSegments.push(currentSegment);

  const summary = [
    {
      label: '最新',
      value: latestSpeed === undefined ? '-' : latestSpeed.toFixed(1),
      unit: latestSpeed === undefined ? '' : 'm/s',
    },
    {
      label: '平均',
      value: averageSpeed === undefined ? '-' : averageSpeed.toFixed(1),
      unit: averageSpeed === undefined ? '' : 'm/s',
    },
    {
      label: '最大',
      value: maxSpeed === undefined ? '-' : maxSpeed.toFixed(1),
      unit: maxSpeed === undefined ? '' : 'm/s',
    },
    {
      label: '弱風',
      value: weakWindCount.toString(),
      unit: '回',
    },
  ];
  const timeLabelCount = Math.min(MAX_TIME_LABELS, observations.length);
  const timeLabelIndexes = Array.from({ length: timeLabelCount }, (_, index) => {
    if (timeLabelCount === 1) return 0;
    return Math.round((index / (timeLabelCount - 1)) * (observations.length - 1));
  }).filter((value, index, values) => values.indexOf(value) === index);

  return (
    <section
      className="h-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      aria-labelledby="wind-trend-heading"
    >
      <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <TrendingUp className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h2 id="wind-trend-heading" className="font-semibold text-slate-900">
              風速トレンド
            </h2>
            <p className="mt-0.5 break-words text-xs text-slate-500">
              {stationName}・{periodLabel}
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-4 gap-4 text-right sm:gap-6">
          {summary.map(item => (
            <div key={item.label}>
              <dt className="text-xs text-slate-500">{item.label}</dt>
              <dd className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">
                {item.value}
                {item.unit && (
                  <span className="ml-1 text-xs font-normal text-slate-400">
                    {item.unit}
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="px-3 py-5 sm:px-6">
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="h-auto w-full"
          role="img"
          aria-label={`${stationName}の${periodLabel}の風速推移`}
        >
          <title>{stationName}の{periodLabel}の風速推移</title>

          {Array.from({ length: GRID_LINES + 1 }, (_, index) => {
            const ratio = index / GRID_LINES;
            const y = PADDING.top + ratio * plotHeight;
            const value = yMax * (1 - ratio);

            return (
              <g key={index}>
                <line
                  x1={PADDING.left}
                  y1={y}
                  x2={CHART_WIDTH - PADDING.right}
                  y2={y}
                  stroke="rgb(226 232 240)"
                  strokeWidth="1"
                />
                <text
                  x={PADDING.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="rgb(100 116 139)"
                >
                  {value.toFixed(1)}
                </text>
              </g>
            );
          })}

          {timeLabelIndexes.map((observationIndex, labelIndex) => {
            const x = getX(observationIndex);
            const isFirst = labelIndex === 0;
            const isLast = labelIndex === timeLabelIndexes.length - 1;

            return (
              <g key={observationIndex}>
                <line
                  x1={x}
                  y1={PADDING.top}
                  x2={x}
                  y2={PADDING.top + plotHeight}
                  stroke="rgb(226 232 240)"
                  strokeWidth="1"
                  strokeDasharray="3 4"
                />
                <text
                  x={x}
                  y={CHART_HEIGHT - 10}
                  textAnchor={isFirst ? 'start' : isLast ? 'end' : 'middle'}
                  fontSize="11"
                  fill="rgb(100 116 139)"
                >
                  {formatTime(observations[observationIndex].timestamp)}
                </text>
              </g>
            );
          })}

          {lineSegments.map((segment, index) => (
            <polyline
              key={index}
              points={segment
                .map(({ item, index: observationIndex }) =>
                  `${getX(observationIndex)},${getY(item.wind_speed)}`
                )
                .join(' ')}
              fill="none"
              stroke="rgb(37 99 235)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {observations.map((item, index) => {
            if (typeof item.wind_speed === 'number') {
              return (
                <circle
                  key={`${item.station_code}-${item.timestamp}`}
                  cx={getX(index)}
                  cy={getY(item.wind_speed)}
                  r="3"
                  fill="white"
                  stroke="rgb(37 99 235)"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                >
                  <title>
                    {formatTime(item.timestamp)}・{item.wind_speed.toFixed(1)} m/s
                  </title>
                </circle>
              );
            }

            if (item.wind_status === 'weak') {
              const x = getX(index);
              const y = PADDING.top + plotHeight;
              return (
                <polygon
                  key={`${item.station_code}-${item.timestamp}`}
                  points={`${x},${y - 5} ${x + 5},${y} ${x},${y + 5} ${x - 5},${y}`}
                  fill="white"
                  stroke="rgb(71 85 105)"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                >
                  <title>{formatTime(item.timestamp)}・風弱く（数値なし）</title>
                </polygon>
              );
            }

            return null;
          })}

        </svg>

        <div className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-slate-500">
          <span className="flex items-center gap-2">
            <span className="h-0.5 w-5 bg-blue-600" aria-hidden="true" />
            数値観測
          </span>
          <span className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rotate-45 border-2 border-slate-600 bg-white"
              aria-hidden="true"
            />
            風弱く（数値なし）
          </span>
        </div>

        {aggregateSummary?.is_sampled && (
          <p className="mt-3 text-center text-xs text-slate-400">
            {aggregateSummary.total_records.toLocaleString('ja-JP')}
            件から最大500点を抽出して描画しています。集計値は全件を使用しています。
          </p>
        )}
      </div>
    </section>
  );
};
