import React from 'react';
import { Compass } from 'lucide-react';
import { WeatherData } from '../types/weather';

interface WindDirectionRadarProps {
  data: WeatherData[];
  stationName: string;
  periodLabel?: string;
  aggregateCounts?: Record<string, number>;
  aggregateWeakWindCount?: number;
}

const DIRECTIONS = [
  '北',
  '北北東',
  '北東',
  '東北東',
  '東',
  '東南東',
  '南東',
  '南南東',
  '南',
  '南南西',
  '南西',
  '西南西',
  '西',
  '西北西',
  '北西',
  '北北西',
] as const;

type Direction = (typeof DIRECTIONS)[number];

const SIZE = 440;
const CENTER = SIZE / 2;
const RADIUS = 142;
const LABEL_RADIUS = 178;

const getPoint = (index: number, radius: number) => {
  const angle = (index / DIRECTIONS.length) * Math.PI * 2 - Math.PI / 2;
  return {
    x: CENTER + Math.cos(angle) * radius,
    y: CENTER + Math.sin(angle) * radius,
    cosine: Math.cos(angle),
  };
};

const getWindRoseSector = (index: number, radius: number) => {
  const innerRadius = 10;
  const centerAngle = (index / DIRECTIONS.length) * Math.PI * 2 - Math.PI / 2;
  const halfWidth = (Math.PI * 2 / DIRECTIONS.length) * 0.4;
  const startAngle = centerAngle - halfWidth;
  const endAngle = centerAngle + halfWidth;
  const point = (angle: number, distance: number) => ({
    x: CENTER + Math.cos(angle) * distance,
    y: CENTER + Math.sin(angle) * distance,
  });
  const innerStart = point(startAngle, innerRadius);
  const outerStart = point(startAngle, radius);
  const outerEnd = point(endAngle, radius);
  const innerEnd = point(endAngle, innerRadius);

  return [
    `M ${innerStart.x} ${innerStart.y}`,
    `L ${outerStart.x} ${outerStart.y}`,
    `A ${radius} ${radius} 0 0 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 0 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
};

export const WindDirectionRadar: React.FC<WindDirectionRadarProps> = ({
  data,
  stationName,
  periodLabel = '過去3時間',
  aggregateCounts,
  aggregateWeakWindCount,
}) => {
  const counts = Object.fromEntries(
    DIRECTIONS.map(direction => [direction, 0])
  ) as Record<Direction, number>;

  data.forEach(item => {
    if (
      item.wind_direction &&
      (DIRECTIONS as readonly string[]).includes(item.wind_direction)
    ) {
      counts[item.wind_direction as Direction] += 1;
    }
  });

  if (aggregateCounts) {
    DIRECTIONS.forEach(direction => {
      counts[direction] = aggregateCounts[direction] ?? 0;
    });
  }

  const totalDirections = Object.values(counts).reduce(
    (sum, count) => sum + count,
    0
  );
  const weakWindCount =
    aggregateWeakWindCount ??
    data.filter(item => item.wind_status === 'weak').length;
  const maxCount = Math.max(1, ...Object.values(counts));
  const dominantDirection = DIRECTIONS.reduce((current, direction) =>
    counts[direction] > counts[current] ? direction : current
  );

  return (
    <section
      className="h-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      aria-labelledby="wind-direction-heading"
    >
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Compass className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id="wind-direction-heading" className="font-semibold text-slate-900">
              風配図
            </h2>
            <p
              className="mt-0.5 truncate text-xs text-slate-600"
              title={`${stationName}・16方位`}
            >
              {stationName}・16方位
            </p>
            <p
              className="mt-0.5 truncate text-[11px] leading-4 text-slate-500"
              title={periodLabel}
            >
              {periodLabel}
            </p>
          </div>
        </div>

        <div className="min-w-14 shrink-0 text-right">
          <p className="whitespace-nowrap text-xs text-slate-500">最多風向</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-900">
            {totalDirections > 0 ? dominantDirection : '-'}
          </p>
        </div>
      </div>

      <div className="px-3 py-4 sm:px-5">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="mx-auto h-auto w-full max-w-[440px]"
          role="img"
          aria-label={`${stationName}の${periodLabel}の風配図`}
        >
          <title>{stationName}の{periodLabel}の風配図</title>

          {[0.25, 0.5, 0.75, 1].map(ratio => (
            <circle
              key={ratio}
              cx={CENTER}
              cy={CENTER}
              r={RADIUS * ratio}
              fill="none"
              stroke="rgb(226 232 240)"
              strokeWidth="1"
            />
          ))}

          {DIRECTIONS.map((direction, index) => {
            const axis = getPoint(index, RADIUS);
            const label = getPoint(index, LABEL_RADIUS);
            const textAnchor =
              label.cosine > 0.2
                ? 'start'
                : label.cosine < -0.2
                  ? 'end'
                  : 'middle';

            return (
              <g key={direction}>
                <line
                  x1={CENTER}
                  y1={CENTER}
                  x2={axis.x}
                  y2={axis.y}
                  stroke="rgb(226 232 240)"
                  strokeWidth="1"
                />
                <text
                  x={label.x}
                  y={label.y + 4}
                  textAnchor={textAnchor}
                  fontSize="11"
                  fontWeight={counts[direction] === maxCount ? '600' : '400'}
                  fill={
                    counts[direction] === maxCount
                      ? 'rgb(30 64 175)'
                      : 'rgb(71 85 105)'
                  }
                >
                  {direction}
                </text>
              </g>
            );
          })}

          {totalDirections > 0 &&
            DIRECTIONS.filter(direction => counts[direction] > 0).map((direction) => {
              const index = DIRECTIONS.indexOf(direction);
              return (
              <path
                key={direction}
                d={getWindRoseSector(
                  index,
                  Math.max(10, (counts[direction] / maxCount) * RADIUS)
                )}
                fill="rgb(147 197 253)"
                fillOpacity="0.78"
                stroke="rgb(37 99 235)"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              >
                <title>
                  {direction}：{counts[direction]}回（
                  {((counts[direction] / totalDirections) * 100).toFixed(1)}%）
                </title>
              </path>
              );
            })}
        </svg>

        <div className="-mt-2 flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-slate-500">
          <span>方位観測 {totalDirections}回</span>
          <span>風弱く {weakWindCount}回（方位集計外）</span>
        </div>
      </div>
    </section>
  );
};
