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
3. Authentication > Providers で公開サインアップを無効化し、招待メールで追加されたユーザーだけがログインできる状態にします。
4. Authentication > SMTP Settings に独自SMTPを設定します。
5. Storageに `property-documents` bucket が作成されていることを確認します。
6. 最初の管理者はSupabaseのSQL Editorで `profiles.role = 'admin'` に更新します。

```sql
update public.profiles
set role = 'admin'
where email = '管理者メールアドレス';
```

## ユーザー招待とロール付与

1. Supabase Dashboardの Authentication > Users から Invite user を実行します。
2. 招待されたユーザーが初回ログインしたことを確認します。
3. 管理者が `profiles.role` を必要最小限のロールへ更新します。招待直後は `external_viewer` です。

```sql
update public.profiles
set role = 'viewer'
where email = '招待ユーザーメールアドレス';
```

ロールの使い分けは以下を標準にします。

- `admin`: 運用管理者だけに付与します。ユーザー権限変更、初期インポート、削除、監査ログ確認が必要な人向けです。
- `editor`: 物件登録/編集、PDFアップロード、AI解析、解析承認を行う仕入担当者に付与します。
- `viewer`: 社内閲覧中心の招待済みメンバーに付与します。
- `external_viewer`: 外部関係者など、社外共有対象を運用確認したうえで招待するユーザー向けの表示ラベルとして付与します。

RLSは招待制を前提に、ログイン済みユーザーの閲覧、PDF/解析フロー、物件登録/編集に必要なアクセスを許可する構成です。外部関係者を招待する場合は、`external_viewer` を付与し、`properties.visibility` が「社外可」のデータだけを共有対象にする運用確認を行ってください。

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
- 公開サインアップは無効化し、招待済みユーザーだけを有効アカウントにします。
- 招待直後のユーザーは `external_viewer` です。必要な最小ロールへ変更し、不要になったアカウントはSupabase Authで無効化または削除します。
- RLSは招待制前提で緩和済みです。`properties.visibility` は社外共有可否の運用ラベルとして扱い、外部関係者への共有前に対象データを確認します。
- PDF削除とユーザー権限変更は `admin` のみに限定します。
