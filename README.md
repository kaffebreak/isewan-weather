# 海洋気象データ管理システム

海上保安庁の気象観測データを自動収集・保存・表示するWebアプリケーションです。

## 機能

### データ収集
- 5箇所の海洋気象観測地点からデータを自動取得
  - 伊良湖岬 (基準時間軸)
  - 伊勢湾2番ブイ
  - 大王埼灯台
  - 高潮防波堤
  - 四日市防波堤信号所

### データ項目
- 風向
- 風速 (m/s)
- 波高 (m) ※観測地点により異なる

### 主要機能
- リアルタイムデータスクレイピング
- 履歴データの継続保存
- 期間指定によるデータ検索
- CSVファイルでのデータエクスポート
- レスポンシブWebインターフェース

## 使用方法

### 0. Pythonサーバーの起動
```bash
# バックエンドサーバーを起動
cd backend
python app.py

# または npm script を使用
npm run python-server
```

### 1. データ取得
「データ取得」ボタンをクリックして最新の気象データを収集します。

### 2. データ検索
- 期間選択: 開始日時と終了日時を指定
- 観測地点選択: 特定の地点または全地点を選択

### 3. データダウンロード
「CSVダウンロード」ボタンでデータをCSVファイルとして保存できます。

## 定期実行設定

### Cronを使用した自動実行例
```bash
# 毎時00分にデータを取得
0 * * * * cd /path/to/project/backend && /usr/bin/python scraper_cron.py

# 30分間隔でデータを取得
0,30 * * * * cd /path/to/project/backend && /usr/bin/python scraper_cron.py
```

### Pythonスクリプト例
```python
# backend/scraper_cron.py を直接実行
python backend/scraper_cron.py
```

## 技術仕様

### フロントエンド
- React 18 + TypeScript
- Tailwind CSS
- Lucide React (アイコン)

### バックエンド
- Python 3.x
- urllib (HTTP クライアント)
- html.parser (HTML パース)
- SQLite (データベース)

### データベース
- SQLite (weather_data.db)
- 自動的にプロジェクトディレクトリに作成されます

## データ形式

### CSV出力形式
```csv
観測地点,地点コード,日時,風向,風速(m/s),波高(m),登録日時
"伊良湖岬",iragomisaki_vtss,2024-01-15 14:00:00,北東,5.2,1.8,2024-01-15 14:05:00
```

## 注意事項

1. **時間軸の統一**: 全データは伊良湖岬の観測時間に合わせて整列されます
2. **欠損データ**: 30分毎の観測データが無い場合は空欄で記録されます
3. **波高データ**: 観測地点により波高データが無い場合があります
4. **アクセス制限**: 海上保安庁サイトへの過度なアクセスを避けるため、適切な間隔を空けてください

## 開発・カスタマイズ

### サーバー起動
1. Pythonバックエンドサーバーを起動: `python backend/app.py`
2. フロントエンド開発サーバーを起動: `npm run dev`

### 新しい観測地点の追加
`backend/app.py` の `WeatherScraper.stations` 配列に新しい地点を追加してください。

### APIエンドポイント
- `GET /api/weather/latest` - 最新データ取得
- `GET /api/weather/data` - 期間指定データ取得
- `POST /api/weather/scrape` - データスクレイピング実行
- `GET /api/stations` - 観測地点情報取得
- `GET /api/weather/stats` - データベース統計情報

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。