#!/bin/bash

# エラー時に終了
set -e

echo "=== 伊勢湾気象データ管理システム 起動中 ==="

# データディレクトリの権限確認
if [ ! -w /app/data ]; then
    echo "❌ データディレクトリに書き込み権限がありません: /app/data"
    exit 1
fi

if [ ! -w /app/logs ]; then
    echo "❌ ログディレクトリに書き込み権限がありません: /app/logs"
    exit 1
fi

# Cronデーモンを起動
echo "🕐 Cronデーモンを起動中..."
service cron start

# 起動待機
echo "⏳ アプリケーション起動待機中..."
sleep 5

# Pythonアプリケーションを起動
echo "🚀 Pythonアプリケーションを起動中..."
exec python app.py