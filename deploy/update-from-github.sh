#!/bin/bash

# 伊勢湾気象データ管理システム GitHub更新スクリプト

set -e

PROJECT_DIR="/opt/isewan-weather"
GITHUB_REPO="https://github.com/your-username/isewan-weather.git"  # あなたのリポジトリURLに変更

echo "=== GitHub からシステム更新開始 ==="

# 1. 現在のサービスを停止
echo "1. サービスを停止中..."
cd $PROJECT_DIR
docker-compose down

# 2. データベースバックアップ
echo "2. データベースをバックアップ中..."
mkdir -p backup
cp data/weather_data.db backup/weather_data_$(date +%Y%m%d_%H%M%S).db

# 3. 最新コードを取得
echo "3. 最新コードを取得中..."
git pull origin main

# 4. 環境変数ファイルを確認
echo "4. 環境変数を確認中..."
if [ ! -f .env ]; then
    echo "VITE_API_URL=http://10.10.10.11:8000" > .env
    echo "環境変数ファイルを作成しました"
fi

# 5. イメージを再ビルド
echo "5. Dockerイメージを再ビルド中..."
docker-compose build --no-cache

# 6. サービスを再開
echo "6. サービスを再開中..."
docker-compose up -d

# 7. ヘルスチェック
echo "7. サービスの起動を確認中..."
sleep 15
if curl -f http://10.10.10.11:8000/api/weather/stats > /dev/null 2>&1; then
    echo "✅ 更新完了！サービスが正常に起動しました"
else
    echo "❌ サービスの起動に問題があります"
    docker-compose logs
    exit 1
fi

echo "=== 更新完了 ==="
echo ""
echo "確認コマンド:"
echo "  docker-compose ps"
echo "  docker-compose logs -f"
echo ""
echo "アクセス: http://10.10.10.11"