# ARCHECO Blog CMS

AI搭載ブログ記事生成CMS。Google Driveの共有フォルダに保存された議事録・トランスクリプト・写真を分析し、ブログ記事を自動生成してmicroCMSに投稿します。

## 機能

1. **Google Drive連携** - 共有フォルダ内のブログ記事別フォルダを一覧表示
2. **AI分析** - 議事録・トランスクリプト・写真をGPT-4oで分析
3. **記事生成** - ターゲット・テイスト・文字数を指定してブログ記事を自動生成
4. **画像最適化** - アイキャッチ画像(1200x630)と挿入画像(800x600)をWebP形式で最適化
5. **プレビュー** - 生成された記事をプレビュー表示
6. **microCMS投稿** - ワンクリックでmicroCMSに投稿

## セットアップ

```bash
cd cms-app
cp .env.example .env.local  # 環境変数を設定
npm install
npm run dev
```

## 環境変数

| 変数名 | 説明 |
|--------|------|
| `GOOGLE_CLIENT_ID` | Google OAuth クライアントID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth クライアントシークレット |
| `GOOGLE_DRIVE_FOLDER_ID` | 共有フォルダID |
| `OPENAI_API_KEY` | OpenAI APIキー |
| `MICROCMS_SERVICE_DOMAIN` | microCMSサービスドメイン |
| `MICROCMS_API_KEY` | microCMS APIキー |
| `NEXTAUTH_SECRET` | NextAuth シークレット |
| `NEXTAUTH_URL` | アプリURL |

## 技術スタック

- Next.js 14 (App Router)
- TypeScript / Tailwind CSS
- Google Drive API v3
- OpenAI API (GPT-4o / Vision)
- Sharp (画像最適化)
- microCMS SDK
- NextAuth (Google OAuth)
