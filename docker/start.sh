#!/bin/bash

# エラー時に終了
set -e

echo "=== 伊勢湾気象データ管理システム 起動中 ==="

# データ/ログディレクトリの作成と権限調整（コンテナ内で完結）
mkdir -p /app/data /app/logs
chmod 777 /app/data /app/logs

# Cronデーモンを起動
echo "🕐 Cronデーモンを起動中..."
service cron start

# 起動待機
echo "⏳ アプリケーション起動待機中..."
sleep 5

# Pythonアプリケーションを起動
echo "🚀 Pythonアプリケーションを起動中..."
exec python app.py