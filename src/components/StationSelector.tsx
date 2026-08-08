import React from 'react';
import { STATIONS } from '../types/weather';
import { MapPin } from 'lucide-react';

interface StationSelectorProps {
  selectedStation: string;
  onStationChange: (stationCode: string) => void;
  isMarineMode?: boolean;
  onMarineModeChange?: (isMarine: boolean) => void;
}

// 定数
const MARINE_MODE_VALUE = 'marine' as const;

export const StationSelector: React.FC<StationSelectorProps> = ({
  selectedStation,
  onStationChange,
  isMarineMode = false,
  onMarineModeChange
}) => {
  const selectStation = (stationCode: string) => {
    onMarineModeChange?.(false);
    onStationChange(stationCode);
  };

  return (
    <section className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="station-selector-heading">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <MapPin className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <h3 id="station-selector-heading" className="font-semibold text-slate-900">観測地点選択</h3>
          <p className="mt-0.5 text-xs text-slate-500">対象にする地点を選択</p>
        </div>
      </div>

      <fieldset>
        <legend className="sr-only">観測地点</legend>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          <label className={`flex min-h-12 cursor-pointer items-center rounded-lg border px-3.5 py-3 transition-colors ${
            selectedStation === '' && !isMarineMode
              ? 'border-blue-300 bg-blue-50 text-blue-900'
              : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
          }`}>
            <input
              type="radio"
              name="station"
              value=""
              checked={selectedStation === '' && !isMarineMode}
              onChange={() => selectStation('')}
              className="mr-3 h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-600"
            />
            <span className="text-sm font-medium">全地点</span>
          </label>

          {STATIONS.map((station) => {
            const isSelected = selectedStation === station.code && !isMarineMode;

            return (
              <label
                key={station.code}
                className={`flex min-h-12 cursor-pointer items-center rounded-lg border px-3.5 py-3 transition-colors ${
                  isSelected
                    ? 'border-blue-300 bg-blue-50 text-blue-900'
                    : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="station"
                  value={station.code}
                  checked={isSelected}
                  onChange={() => selectStation(station.code)}
                  className="mr-3 h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-600"
                />
                <span className="text-sm font-medium">{station.name}</span>
              </label>
            );
          })}

          {onMarineModeChange && (
            <label className={`col-span-full flex min-h-12 cursor-pointer items-center rounded-lg border px-3.5 py-3 transition-colors ${
              isMarineMode
                ? 'border-blue-300 bg-blue-50 text-blue-900'
                : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
            }`}>
              <input
                type="radio"
                name="station"
                value={MARINE_MODE_VALUE}
                checked={isMarineMode}
                onChange={() => {
                  onMarineModeChange(true);
                  onStationChange('');
                }}
                className="mr-3 h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-600"
              />
              <span>
                <span className="block text-sm font-medium">湾内乗下船用</span>
                <span className="mt-0.5 block text-xs text-slate-500">3箇所のデータを横並びで出力</span>
              </span>
            </label>
          )}
        </div>
      </fieldset>
    </section>
  );
};
