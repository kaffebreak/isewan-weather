#!/bin/bash

# 伊勢湾気象データ管理システム Docker デプロイスクリプト

set -e

echo "=== 伊勢湾気象データ管理システム Docker デプロイ開始 ==="

# 変数設定
PROJECT_DIR="/opt/isewan-weather"
DOMAIN="10.10.10.11"  # 固定IPアドレス

# 1. Docker と Docker Compose のインストール確認
echo "1. Docker環境を確認中..."
if ! command -v docker &> /dev/null; then
    echo "Dockerをインストール中..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
fi

if ! command -v docker-compose &> /dev/null; then
    echo "Docker Composeをインストール中..."
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# 2. プロジェクトディレクトリ作成
echo "2. プロジェクトディレクトリを作成中..."
sudo mkdir -p $PROJECT_DIR
sudo chown -R $USER:$USER $PROJECT_DIR

# 3. プロジェクトファイルをコピー
echo "3. プロジェクトファイルをコピー中..."
cp -r . $PROJECT_DIR/
cd $PROJECT_DIR

# 4. データディレクトリ作成
echo "4. データディレクトリを作成中..."
mkdir -p data logs ssl

# 5. Nginx設定でドメイン名を更新
echo "5. Nginx設定を更新中..."
sed -i "s/10.10.10.11/$DOMAIN/g" docker/nginx.conf

# 6. Docker イメージをビルド
echo "6. Dockerイメージをビルド中..."
docker-compose build

# 7. コンテナを起動
echo "7. コンテナを起動中..."
docker-compose up -d

# 8. ヘルスチェック
echo "8. サービスの起動を確認中..."
sleep 10
if curl -f http://localhost:8000/api/weather/stats > /dev/null 2>&1; then
    echo "✅ サービスが正常に起動しました"
else
    echo "❌ サービスの起動に失敗しました"
    docker-compose logs
    exit 1
fi

echo "=== デプロイ完了 ==="
echo ""
echo "サービス確認:"
echo "  docker-compose ps"
echo "  docker-compose logs -f"
echo ""
echo "アクセス: http://$DOMAIN"
echo ""
echo "自動データ取得: 5分間隔で実行中"
echo "ログ確認: docker-compose exec isewan-weather tail -f /app/logs/cron.log"