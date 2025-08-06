#!/bin/bash

# 海洋気象データ管理システム 更新スクリプト

set -e

PROJECT_DIR="/var/www/marine-weather"

echo "=== システム更新開始 ==="

cd $PROJECT_DIR

# 1. サービス停止
echo "1. サービスを停止中..."
sudo systemctl stop marine-weather

# 2. バックアップ作成
echo "2. データベースをバックアップ中..."
sudo cp /var/lib/marine-weather/weather_data.db /var/lib/marine-weather/weather_data.db.backup.$(date +%Y%m%d_%H%M%S)

# 3. コード更新（Gitを使用する場合）
echo "3. コードを更新中..."
# git pull origin main

# 4. 依存関係更新
echo "4. 依存関係を更新中..."
source venv/bin/activate
pip install -r backend/requirements.txt
npm install

# 5. フロントエンドビルド
echo "5. フロントエンドを再ビルド中..."
npm run build

# 6. サービス再開
echo "6. サービスを再開中..."
sudo systemctl start marine-weather
sudo systemctl restart nginx

echo "=== 更新完了 ==="
echo "サービス状態: $(sudo systemctl is-active marine-weather)"