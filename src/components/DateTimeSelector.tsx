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
  // UTC文字列を日本時間の表示用文字列に変換
  const utcToJSTDisplay = (utcString: string): string => {
    if (!utcString) return '';
    
    try {
      const utcDate = new Date(utcString);
      // 日本時間に変換（UTC+9時間）
      const jstDate = new Date(utcDate.getTime() + 9 * 60 * 60 * 1000);
      
      // YYYY-MM-DD HH:mm形式に変換
      const year = jstDate.getUTCFullYear();
      const month = String(jstDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(jstDate.getUTCDate()).padStart(2, '0');
      const hours = String(jstDate.getUTCHours()).padStart(2, '0');
      const minutes = String(jstDate.getUTCMinutes()).padStart(2, '0');
      
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    } catch (error) {
      console.error('Error converting UTC to JST display:', error);
      return '';
    }
  };

  // 日本時間の表示用文字列をUTC文字列に変換
  const jstDisplayToUTC = (jstDisplayString: string): string => {
    if (!jstDisplayString) return '';
    
    try {
      // YYYY-MM-DD HH:mm形式をパース
      const match = jstDisplayString.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/);
      if (!match) return '';
      
      const [, year, month, day, hours, minutes] = match;
      
      // 日本時間として日付を作成
      const jstDate = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hours),
        parseInt(minutes)
      );
      
      // UTCに変換（-9時間）
      const utcDate = new Date(jstDate.getTime() - 9 * 60 * 60 * 1000);
      
      return utcDate.toISOString().slice(0, 19);
    } catch (error) {
      console.error('Error converting JST display to UTC:', error);
      return '';
    }
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      const utcValue = jstDisplayToUTC(value);
      if (utcValue) {
        onStartDateChange(utcValue);
      }
    }
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      const utcValue = jstDisplayToUTC(value);
      if (utcValue) {
        onEndDateChange(utcValue);
      }
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 flex items-center gap-2">
        <Calendar className="w-5 h-5" />
        期間選択（日本時間）
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
            <Clock className="w-4 h-4 inline mr-1" />
            開始日時（JST）
          </label>
          <input
            type="text"
            id="startDate"
            value={utcToJSTDisplay(startDate)}
            onChange={handleStartDateChange}
            placeholder="2025-01-15 14:30"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="text-xs text-gray-500 mt-1">
            形式: YYYY-MM-DD HH:mm
          </div>
        </div>
        
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
            <Clock className="w-4 h-4 inline mr-1" />
            終了日時（JST）
          </label>
          <input
            type="text"
            id="endDate"
            value={utcToJSTDisplay(endDate)}
            onChange={handleEndDateChange}
            placeholder="2025-01-15 15:30"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="text-xs text-gray-500 mt-1">
            形式: YYYY-MM-DD HH:mm
          </div>
        </div>
      </div>
      
      <div className="mt-4 text-sm text-gray-500">
        ※ 入力された時刻は日本標準時（JST）として処理されます
      </div>
    </div>
  );
};