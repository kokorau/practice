FROM mcr.microsoft.com/playwright:v1.49.1-noble

WORKDIR /app

# pnpmをインストール
RUN npm install -g pnpm

# 依存関係ファイルをコピー
COPY package.json ./

# ソースコードをコピー
COPY . .

# 依存関係をインストール
RUN pnpm install

# Cloud Runはポート8080を期待
ENV PORT=8080

EXPOSE 8080

# tsxで直接実行
CMD ["npx", "tsx", "src/index.ts"]
