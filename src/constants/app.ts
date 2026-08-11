// アプリケーション全体で使用する定数

// 時間関連
export const TIME_CONSTANTS = {
  REFRESH_INTERVAL: 5 * 60 * 1000, // 5分
  THREE_HOURS: 3 * 60 * 60 * 1000, // 3時間
  RECENT_DATA_LIMIT: 50, // 最近データの取得件数
} as const;

// システム情報
export const SYSTEM_INFO = {
  STATION_COUNT: 5,
  DATA_ITEMS: ['風向', '風速', '波高'],
  UPDATE_INTERVAL: '5分間隔',
  TIME_PRECISION: '時まで',
  DATA_FORMAT: 'CSV出力対応',
  HISTORY_TYPE: '継続蓄積型',
} as const;
