'use client';

import Link from 'next/link';
import { useState } from 'react';

import { isSupabaseConfigured } from '@/lib/env';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type Mode = 'sign-in' | 'sign-up' | 'reset';

export function AuthForm() {
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');

    if (!isSupabaseConfigured()) {
      setError('Supabase環境変数が未設定です。.env.local を設定してください。');
      return;
    }

    setPending(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (mode === 'sign-in') {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        window.location.href = '/app';
        return;
      }

      if (mode === 'sign-up') {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/app` }
        });
        if (signUpError) throw signUpError;
        setMessage('確認メールを送信しました。メール内のリンクから登録を完了してください。');
      }

      if (mode === 'reset') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login`
        });
        if (resetError) throw resetError;
        setMessage('パスワード再設定メールを送信しました。');
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '認証処理に失敗しました。');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="form-panel">
      <h1>{mode === 'sign-in' ? 'ログイン' : mode === 'sign-up' ? 'ユーザー登録' : 'パスワード再設定'}</h1>
      <p>社内外の利用者をメールアドレスとパスワードで管理します。</p>

      <form className="form-grid" onSubmit={handleSubmit}>
        <label>
          メールアドレス
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
        </label>
        {mode !== 'reset' ? (
          <label>
            パスワード
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} />
          </label>
        ) : null}
        <button className="primary-button" type="submit" disabled={pending}>
          {pending ? '処理中' : mode === 'sign-in' ? 'ログイン' : mode === 'sign-up' ? '登録する' : '再設定メールを送る'}
        </button>
      </form>

      {message ? <p className="message">{message}</p> : null}
      {error ? <p className="message error-message">{error}</p> : null}

      <div className="detail-actions">
        <button className="secondary-action" type="button" onClick={() => setMode('sign-in')}>ログイン</button>
        <button className="secondary-action" type="button" onClick={() => setMode('sign-up')}>新規登録</button>
        <button className="secondary-action" type="button" onClick={() => setMode('reset')}>再設定</button>
        <Link href="/app" className="secondary-action">マップへ戻る</Link>
      </div>
    </div>
  );
}
