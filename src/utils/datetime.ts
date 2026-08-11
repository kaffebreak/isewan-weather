// バックエンドが返すタイムスタンプ（例: "2024-01-15 14:00:00" や
// "2024-01-15T14:05:00.123456"）はタイムゾーン情報を含まない日本時間の
// 文字列。`new Date(timestamp)` に直接渡すと、閲覧者のブラウザのローカル
// タイムゾーンで解釈されてしまい、JST以外の環境では時刻がずれる。
// 常にJSTとして明示的に解釈するためのヘルパー。
export function parseJstTimestamp(timestamp: string): Date {
  return new Date(`${timestamp.replace(' ', 'T')}+09:00`);
}
