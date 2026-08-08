import React from 'react';
import { Calendar, Clock } from 'lucide-react';

interface DateTimeSelectorProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

export const DateTimeSelector: React.FC<DateTimeSelectorProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange
}) => {
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onStartDateChange(value);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onEndDateChange(value);
  };

  return (
    <section className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="date-range-heading">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <Calendar className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <h3 id="date-range-heading" className="font-semibold text-slate-900">期間選択</h3>
          <p className="mt-0.5 text-xs text-slate-500">取得するデータの開始・終了日時</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="startDate" className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            開始時間
          </label>
          <input
            type="datetime-local"
            id="startDate"
            value={startDate}
            onChange={handleStartDateChange}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
          />
        </div>
        
        <div>
          <label htmlFor="endDate" className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            終了日時
          </label>
          <input
            type="datetime-local"
            id="endDate"
            value={endDate}
            onChange={handleEndDateChange}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
          />
        </div>
      </div>
    </section>
  );
};
