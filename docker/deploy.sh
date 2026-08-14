#!/bin/bash

# 伊勢湾気象データ管理システム Docker デプロイスクリプト

set -e

echo "=== 伊勢湾気象データ管理システム Docker デプロイ開始 ==="

# 変数設定
PROJECT_DIR="/opt/isewan-weather"
DOMAIN="10.10.10.11"  # 固定IPアドレス
ENV_FILE=".env"

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

# 4. 環境変数ファイルとデータディレクトリ作成
echo "4. 環境変数ファイルとデータディレクトリを作成中..."
if [ ! -f "$ENV_FILE" ]; then
    echo "環境変数ファイルが見つかりません。env.exampleをコピーします..."
    cp env.example "$ENV_FILE"
fi

mkdir -p data
chmod 755 data
chmod 644 "$ENV_FILE"

# 5. Nginx設定でドメイン名を更新
echo "5. Nginx設定を更新中..."
sed -i "s/10.10.10.11/$DOMAIN/g" docker/nginx.conf

# 6. 船舶管制システム(nagoya-control, irago-schedule)と共有する外部ネットワークを用意
echo "6. 共有ネットワーク(isewan-edge)を確認中..."
if ! docker network inspect isewan-edge > /dev/null 2>&1; then
    docker network create isewan-edge
fi

COMPOSE_FILE="docker-compose.prod.yml"

# 7. Docker イメージをビルド
echo "7. Dockerイメージをビルド中..."
docker-compose -f "$COMPOSE_FILE" build

# 8. コンテナを起動
echo "8. コンテナを起動中..."
docker-compose -f "$COMPOSE_FILE" up -d

# 9. ヘルスチェック
echo "9. サービスの起動を確認中..."
sleep 15

# 複数のエンドポイントでヘルスチェック
echo "ヘルスチェック実行中..."
if curl -f http://localhost:8000/api/weather/stats > /dev/null 2>&1; then
    echo "✅ バックエンドAPIが正常に応答しています"
else
    echo "❌ バックエンドAPIの起動に失敗しました"
    docker-compose -f "$COMPOSE_FILE" logs isewan-weather
    exit 1
fi

if curl -f http://$DOMAIN/health > /dev/null 2>&1; then
    echo "✅ Nginxが正常に応答しています"
else
    echo "❌ Nginxの起動に失敗しました"
    docker-compose -f "$COMPOSE_FILE" logs nginx
    exit 1
fi

echo "✅ 全てのサービスが正常に起動しました"

echo "=== デプロイ完了 ==="
echo ""
echo "サービス確認:"
echo "  docker-compose -f $COMPOSE_FILE ps"
echo "  docker-compose -f $COMPOSE_FILE logs -f"
echo ""
echo "アクセス: http://$DOMAIN"
echo ""
echo "自動データ取得: 5分間隔で実行中(アプリ内蔵のバックグラウンドスレッド)"
echo "ログ確認: docker-compose -f $COMPOSE_FILE logs -f isewan-weather"