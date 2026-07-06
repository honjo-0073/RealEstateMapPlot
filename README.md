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
4. 招待制運用のため、Supabase Authの公開サインアップを無効化し、管理者が招待メールでユーザーを追加します。
5. 本番運用ではSupabase AuthのSMTPを独自SMTPに変更します。
6. `.env.example` を参考に `.env.local` を作成します。
7. VercelにGitHubリポジトリを連携し、同じ環境変数を設定します。

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

## 招待制運用と権限

このアプリは招待制の社内業務アプリとして運用します。Supabase Authの公開サインアップは本番環境で無効化し、管理者がSupabase DashboardまたはSQL Editorから招待したユーザーだけがログインできる前提です。

ロールは `profiles.role` で管理します。招待直後のユーザーは初期値の `external_viewer` になるため、管理者が業務に必要な最小権限へ変更します。

- `admin`: 全操作、ユーザー権限管理、初期インポート、物件/PDF削除、監査ログ確認
- `editor`: 物件作成・編集、PDFアップロード、AI解析依頼、解析結果レビュー/承認
- `viewer`: 社内物件を含む閲覧中心の招待済みメンバー
- `external_viewer`: 招待済み外部関係者向けの表示ラベル

RLSは招待制を前提に、ログイン済みユーザーが物件一覧、PDF参照、PDFアップロード、解析ジョブ作成、物件登録/編集に必要なデータへアクセスできるよう緩和済みです。社外共有可否は `properties.visibility` の表示/運用ラベルとして扱い、外部関係者を招待する場合は `external_viewer` を付与したうえで、共有対象データの扱いを運用で確認してください。

## 運用メモ

- GitHubの `main` は本番反映対象、機能追加はPRで進めます。
- Vercel側のProduction環境変数にSupabaseとGeminiのキーを設定します。
- Gemini APIは共通ラッパーで直列化、待機、リトライを行います。
- Google Sheetsは初期移行元であり、初期版ではSheetsへの常時同期は行いません。
