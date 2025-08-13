import React from 'react';
import { Calendar, Clock, AlertCircle } from 'lucide-react';

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
  // UTC文字列を日本時間の年月日（YYYYMMDD）と時分に分解
  const parseUTCToJSTComponents = (utcString: string): { dateStr: string; hour: string; minute: string } => {
    if (!utcString) {
      return {
        dateStr: '00000000', // ブランク状態を示すマーカー
        hour: '00',
        minute: '00'
      };
    }
    
    try {
      const utcDate = new Date(utcString);
      // 日本時間に変換（UTC+9時間）
      const jstDate = new Date(utcDate.getTime() + 9 * 60 * 60 * 1000);
      
      return {
        dateStr: jstDate.getUTCFullYear().toString() + 
                (jstDate.getUTCMonth() + 1).toString().padStart(2, '0') + 
                jstDate.getUTCDate().toString().padStart(2, '0'),
        hour: jstDate.getUTCHours().toString().padStart(2, '0'),
        minute: jstDate.getUTCMinutes().toString().padStart(2, '0')
      };
    } catch (error) {
      console.error('Error parsing UTC to JST components:', error);
      const now = new Date();
      return {
        dateStr: now.getFullYear().toString() + 
                (now.getMonth() + 1).toString().padStart(2, '0') + 
                now.getDate().toString().padStart(2, '0'),
        hour: now.getHours().toString().padStart(2, '0'),
        minute: now.getMinutes().toString().padStart(2, '0')
      };
    }
  };

  // 年月日文字列（YYYYMMDD）と時分からUTC文字列を作成
  const componentsToUTC = (dateStr: string, hour: string, minute: string): string => {
    try {
      // YYYYMMDD形式をパース
      if (dateStr.length !== 8) return '';
      
      const year = parseInt(dateStr.substring(0, 4));
      const month = parseInt(dateStr.substring(4, 6));
      const day = parseInt(dateStr.substring(6, 8));
      const hourNum = parseInt(hour);
      const minuteNum = parseInt(minute);
      
      // 入力値の検証
      if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hourNum) || isNaN(minuteNum)) {
        return '';
      }
      
      if (year < 2020 || year > 2030 || month < 1 || month > 12 || day < 1 || day > 31 || 
          hourNum < 0 || hourNum > 23 || minuteNum < 0 || minuteNum > 59) {
        return '';
      }
      
      // 日本時間として日付を作成
      const jstDate = new Date(year, month - 1, day, hourNum, minuteNum);
      
      // UTCに変換（-9時間）
      const utcDate = new Date(jstDate.getTime() - 9 * 60 * 60 * 1000);
      
      return utcDate.toISOString().slice(0, 19);
    } catch (error) {
      console.error('Error converting components to UTC:', error);
      return '';
    }
  };

  const startComponents = parseUTCToJSTComponents(startDate);
  const endComponents = parseUTCToJSTComponents(endDate);

  // バリデーション：開始時間が終了時間より未来かチェック
  const validateDateRange = (): string | null => {
    if (!startDate || !endDate) return null;
    
    try {
      const startTime = new Date(startDate).getTime();
      const endTime = new Date(endDate).getTime();
      
      if (startTime >= endTime) {
        return '開始時間は終了時間より前に設定してください';
      }
      
      return null;
    } catch (error) {
      return '日時の形式が正しくありません';
    }
  };

  const validationError = validateDateRange();

  // 年月日の入力値検証
  const validateDateString = (dateStr: string): boolean => {
    if (dateStr.length !== 8) return false;
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6));
    const day = parseInt(dateStr.substring(6, 8));
    
    return year >= 2020 && year <= 2030 && month >= 1 && month <= 12 && day >= 1 && day <= 31;
  };

  const handleStartDateChange = (dateStr: string) => {
    if (validateDateString(dateStr)) {
      const utcString = componentsToUTC(dateStr, startComponents.hour, startComponents.minute);
      if (utcString) {
        onStartDateChange(utcString);
      }
    }
  };

  const handleStartTimeChange = (field: 'hour' | 'minute', value: string) => {
    const utcString = componentsToUTC(
      startComponents.dateStr, 
      field === 'hour' ? value : startComponents.hour,
      field === 'minute' ? value : startComponents.minute
    );
    if (utcString) {
      onStartDateChange(utcString);
    }
  };

  const handleEndDateChange = (dateStr: string) => {
    if (validateDateString(dateStr)) {
      const utcString = componentsToUTC(dateStr, endComponents.hour, endComponents.minute);
      if (utcString) {
        onEndDateChange(utcString);
      }
    }
  };

  const handleEndTimeChange = (field: 'hour' | 'minute', value: string) => {
    const utcString = componentsToUTC(
      endComponents.dateStr, 
      field === 'hour' ? value : endComponents.hour,
      field === 'minute' ? value : endComponents.minute
    );
    if (utcString) {
      onEndDateChange(utcString);
    }
  };

  // 時間のオプション生成
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

  // 分のオプション生成
  const generateMinuteOptions = () => {
    const options = [];
    for (let i = 0; i < 60; i += 5) { // 5分刻み
      const value = i.toString().padStart(2, '0');
      options.push(
        <option key={value} value={value}>
          {value}分
        </option>
      );
    }
    return options;
  };

  const inputClassName = "px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
  const selectClassName = "px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white";

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 flex items-center gap-2">
        <Calendar className="w-5 h-5" />
        期間選択（日本時間）
      </h3>
      
      <div className="space-y-6">
        {/* 開始日時 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Clock className="w-4 h-4 inline mr-1" />
            開始日時（JST）
          </label>
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <input
                type="text"
                value={startComponents.dateStr}
                onChange={(e) => handleStartDateChange(e.target.value)}
                placeholder="20250115"
                maxLength={8}
                className={`${inputClassName} w-full text-center`}
              />
              <div className="text-xs text-gray-400 text-center mt-1">年月日（YYYYMMDD）</div>
            </div>
            <div className="flex gap-2">
              <select
                value={startComponents.hour}
                onChange={(e) => handleStartTimeChange('hour', e.target.value)}
                className={selectClassName}
              >
                {generateHourOptions()}
              </select>
              <select
                value={startComponents.minute}
                onChange={(e) => handleStartTimeChange('minute', e.target.value)}
                className={selectClassName}
              >
                {generateMinuteOptions()}
              </select>
            </div>
          </div>
        </div>

        {/* 終了日時 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Clock className="w-4 h-4 inline mr-1" />
            終了日時（JST）
          </label>
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <input
                type="text"
                value={endComponents.dateStr}
                onChange={(e) => handleEndDateChange(e.target.value)}
                placeholder="20250115"
                maxLength={8}
                className={`${inputClassName} w-full text-center`}
              />
              <div className="text-xs text-gray-400 text-center mt-1">年月日（YYYYMMDD）</div>
            </div>
            <div className="flex gap-2">
              <select
                value={endComponents.hour}
                onChange={(e) => handleEndTimeChange('hour', e.target.value)}
                className={selectClassName}
              >
                {generateHourOptions()}
              </select>
              <select
                value={endComponents.minute}
                onChange={(e) => handleEndTimeChange('minute', e.target.value)}
                className={selectClassName}
              >
                {generateMinuteOptions()}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* バリデーションエラー表示 */}
      {validationError && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{validationError}</span>
          </div>
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-500">
        ※ 年月日は8桁で入力（例：20250115）、時分はプルダウンで選択
      </div>
    </div>
  );
};