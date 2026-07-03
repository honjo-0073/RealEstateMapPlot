# 運用手順

## GitHub運用

- `main` は本番相当の安定ブランチにします。
- 機能追加や修正は `feature/*` ブランチで行い、Pull Requestで確認してからmergeします。
- GitHub Actionsの `typecheck` と `build` が通ってからmergeします。

## Vercelデプロイ

1. Vercelで `honjo-0073/RealEstateMapPlot` をImportします。
2. Framework Presetは Next.js を選択します。
3. Production / Preview のEnvironment Variablesに `.env.example` と同じキーを設定します。
4. `main` へのmergeでProduction Deploy、PRでPreview Deployにします。

## Supabase運用

1. SQL Editorで `supabase/migrations/202607030001_initial_schema.sql` を実行します。
2. Authentication > Providers で Email を有効化します。
3. Authentication > SMTP Settings に独自SMTPを設定します。
4. Storageに `property-documents` bucket が作成されていることを確認します。
5. 最初の管理者はSupabaseのSQL Editorで `profiles.role = 'admin'` に更新します。

```sql
update public.profiles
set role = 'admin'
where email = '管理者メールアドレス';
```

## 初期データ投入

管理者としてログイン後、以下を実行します。

```bash
curl -X POST https://YOUR_DOMAIN/api/imports/google-sheet \
  -H "Cookie: SupabaseログインCookie"
```

通常はブラウザログイン後に管理UIを追加して実行する想定です。初期版ではAPIのみ提供しています。

## セキュリティ

- `SUPABASE_SERVICE_ROLE_KEY` はサーバー側の環境変数だけに置きます。
- GitHub Actions / Vercel / Supabaseに設定するシークレットは公開しません。
- 社外ユーザーは初期状態で `external_viewer` になり、`visibility = external` の物件だけ参照できます。
- PDF削除とユーザー権限変更は `admin` のみに限定します。
