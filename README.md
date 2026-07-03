# RealEstateMapPlot

不動産仕入マップを、Google Apps Script中心の運用から Next.js + Supabase + Gemini API のWebアプリへ移行するプロジェクトです。

## 実装範囲

- メールアドレス + パスワード認証
- Supabase Postgres + PostGIS を正本DBとして利用
- 物件一覧、検索、価格帯フィルター、地図プロット、詳細表示
- PDFアップロード、Supabase Storage保存、Gemini解析
- AI抽出結果のレビュー承認、物件登録
- Google Sheets「データシート」由来の既存14件インポートAPI
- 物件更新と解析承認の監査ログ
- GitHub Actionsによる型チェックとビルド検査

## 技術スタック

- App: Next.js / React / TypeScript
- Auth: Supabase Auth
- Database: Supabase Postgres + PostGIS
- Storage: Supabase Storage
- Map: Leaflet / OpenStreetMap
- AI: Gemini API
- Hosting: Vercel想定
- CI: GitHub Actions

## 初期セットアップ

1. Supabaseプロジェクトを作成します。
2. `supabase/migrations/202607030001_initial_schema.sql` をSupabase SQL EditorまたはSupabase CLIで適用します。
3. Supabase Authで Email provider を有効化します。
4. 本番運用ではSupabase AuthのSMTPを独自SMTPに変更します。
5. `.env.example` を参考に `.env.local` を作成します。
6. VercelにGitHubリポジトリを連携し、同じ環境変数を設定します。

## 必要な環境変数

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-1.5-flash
GEMINI_MIN_REQUEST_INTERVAL_MS=15000
GEMINI_MAX_RETRIES=3
```

## 開発コマンド

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

## 既存データ移行

管理者ユーザーでログイン後、次のAPIをPOSTします。

```http
POST /api/imports/google-sheet
```

このAPIは、確認済みのGoogle Sheets「データシート」14件をSupabaseへ取り込み、既存Drive PDFを `property_documents` に紐づけます。`price=0` は価格不明として `price_amount_yen = null` になります。

## 権限

- `admin`: 全操作、ユーザー権限管理、インポート、削除
- `editor`: 物件作成、編集、PDFアップロード、解析承認
- `viewer`: 社内物件を含む閲覧
- `external_viewer`: `visibility = external` の物件のみ閲覧

Supabase Authで新規登録したユーザーは、初期状態では `external_viewer` です。管理者が `profiles.role` を変更して権限を付与します。

## 運用メモ

- GitHubの `main` は本番反映対象、機能追加はPRで進めます。
- Vercel側のProduction環境変数にSupabaseとGeminiのキーを設定します。
- Gemini APIは共通ラッパーで直列化、待機、リトライを行います。
- Google Sheetsは初期移行元であり、初期版ではSheetsへの常時同期は行いません。
