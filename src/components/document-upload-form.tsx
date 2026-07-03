'use client';

import Link from 'next/link';
import { FileUp } from 'lucide-react';
import { useState } from 'react';

export function DocumentUploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');
    if (!file) {
      setError('PDFを選択してください。');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    setPending(true);

    try {
      const response = await fetch('/api/documents', { method: 'POST', body: formData });
      const payload = await response.json();
      if (!response.ok && !payload.data) throw new Error(payload.error ?? 'アップロードに失敗しました。');
      if (payload.data?.id) {
        window.location.href = `/analysis-jobs/${payload.data.id}`;
        return;
      }
      setMessage('アップロードを受け付けました。');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'アップロードに失敗しました。');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="form-panel">
      <h1>PDFアップロード</h1>
      <p>物件概要PDFをSupabase Storageへ保存し、Geminiで抽出した内容をレビュー画面へ送ります。</p>
      <form className="form-grid" onSubmit={handleSubmit}>
        <label>
          物件概要PDF
          <input type="file" accept="application/pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        </label>
        <button className="primary-button" type="submit" disabled={pending}>
          <FileUp size={18} />{pending ? '解析中' : 'アップロードして解析'}
        </button>
      </form>
      {message ? <p className="message">{message}</p> : null}
      {error ? <p className="message error-message">{error}</p> : null}
      <div className="detail-actions">
        <Link href="/app" className="secondary-action">マップへ戻る</Link>
      </div>
    </div>
  );
}
