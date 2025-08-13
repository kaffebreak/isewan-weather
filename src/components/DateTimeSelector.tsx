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
  // 時間のオプション生成（0-23時）
  const generateHourOptions = () => {
    const options = [];
    for (let i = 0; i < 24; i++) {
      const value = i.toString().padStart(2, '0');
      options.push(
        <option key={value} value={value}>
          {value}時
        </option>
      );
    }
    return options;
  };

  // 分のオプション生成（5分刻み）
  const generateMinuteOptions = () => {
    const options = [];
    for (let i = 0; i < 60; i += 5) {
      const value = i.toString().padStart(2, '0');
      options.push(
        <option key={value} value={value}>
          {value}分
        </option>
      );
    }
    return options;
  };

  // 日付文字列から各コンポーネントを抽出
  const parseDateTime = (dateTimeStr: string) => {
    if (!dateTimeStr) {
      return { dateStr: '', hour: '00', minute: '00' };
    }
    
    try {
      const date = new Date(dateTimeStr);
      // 日本時間に変換
      const jstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
      
      const year = jstDate.getUTCFullYear();
      const month = (jstDate.getUTCMonth() + 1).toString().padStart(2, '0');
      const day = jstDate.getUTCDate().toString().padStart(2, '0');
      const hour = jstDate.getUTCHours().toString().padStart(2, '0');
      const minute = jstDate.getUTCMinutes().toString().padStart(2, '0');
      
      return {
        dateStr: `${year}${month}${day}`,
        hour,
        minute
      };
    } catch {
      return { dateStr: '', hour: '00', minute: '00' };
    }
  };

  // 各コンポーネントからISO文字列を作成
  const createDateTime = (dateStr: string, hour: string, minute: string): string => {
    if (!dateStr || dateStr.length !== 8) return '';
    
    try {
      const year = parseInt(dateStr.substring(0, 4));
      const month = parseInt(dateStr.substring(4, 6));
      const day = parseInt(dateStr.substring(6, 8));
      const hourNum = parseInt(hour);
      const minuteNum = parseInt(minute);
      
      // 日本時間として作成
      const jstDate = new Date(year, month - 1, day, hourNum, minuteNum);
      // UTCに変換
      const utcDate = new Date(jstDate.getTime() - 9 * 60 * 60 * 1000);
      
      return utcDate.toISOString().slice(0, 19);
    } catch {
      return '';
    }
  };

  const startComponents = parseDateTime(startDate);
  const endComponents = parseDateTime(endDate);

  // 開始日時の変更ハンドラー
  const handleStartDateChange = (value: string) => {
    const newDateTime = createDateTime(value, startComponents.hour, startComponents.minute);
    onStartDateChange(newDateTime);
  };

  const handleStartHourChange = (value: string) => {
    const newDateTime = createDateTime(startComponents.dateStr, value, startComponents.minute);
    onStartDateChange(newDateTime);
  };

  const handleStartMinuteChange = (value: string) => {
    const newDateTime = createDateTime(startComponents.dateStr, startComponents.hour, value);
    onStartDateChange(newDateTime);
  };

  // 終了日時の変更ハンドラー
  const handleEndDateChange = (value: string) => {
    const newDateTime = createDateTime(value, endComponents.hour, endComponents.minute);
    onEndDateChange(newDateTime);
  };

  const handleEndHourChange = (value: string) => {
    const newDateTime = createDateTime(endComponents.dateStr, value, endComponents.minute);
    onEndDateChange(newDateTime);
  };

  const handleEndMinuteChange = (value: string) => {
    const newDateTime = createDateTime(endComponents.dateStr, endComponents.hour, value);
    onEndDateChange(newDateTime);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 flex items-center gap-2">
        <Calendar className="w-5 h-5" />
        期間選択（日本時間）
      </h3>
      
      <div className="space-y-6">
        {/* 開始日時 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <Clock className="w-4 h-4 inline mr-1" />
            開始日時
          </label>
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <input
                type="text"
                value={startComponents.dateStr}
                onChange={(e) => handleStartDateChange(e.target.value)}
                placeholder="20250115"
                maxLength={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="text-xs text-gray-500 mt-1">年月日（YYYYMMDD）</div>
            </div>
            <div className="flex gap-2">
              <select
                value={startComponents.hour}
                onChange={(e) => handleStartHourChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                {generateHourOptions()}
              </select>
              <select
                value={startComponents.minute}
                onChange={(e) => handleStartMinuteChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                {generateMinuteOptions()}
              </select>
            </div>
          </div>
        </div>

        {/* 終了日時 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <Clock className="w-4 h-4 inline mr-1" />
            終了日時
          </label>
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <input
                type="text"
                value={endComponents.dateStr}
                onChange={(e) => handleEndDateChange(e.target.value)}
                placeholder="20250115"
                maxLength={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="text-xs text-gray-500 mt-1">年月日（YYYYMMDD）</div>
            </div>
            <div className="flex gap-2">
              <select
                value={endComponents.hour}
                onChange={(e) => handleEndHourChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                {generateHourOptions()}
              </select>
              <select
                value={endComponents.minute}
                onChange={(e) => handleEndMinuteChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                {generateMinuteOptions()}
              </select>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-4 text-sm text-gray-500">
        ※ 年月日は8桁で入力（例：20250115）、時分はプルダウンで選択してください
      </div>
    </div>
  );
};