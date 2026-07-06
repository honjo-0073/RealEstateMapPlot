'use client';

import Link from 'next/link';
import { Save } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { AnalysisJob } from '@/lib/database.types';
import type { ExtractedPropertyPayload } from '@/lib/gemini';

type FormState = ExtractedPropertyPayload;

const emptyState: FormState = {
  name: '',
  business_item_registrant_name: null,
  asset_type: '戸建/ビル',
  address: '',
  price_amount_yen: null,
  price_raw_text: null,
  land_area_sqm: null,
  floor_area_sqm: null,
  zoning: null,
  coverage_ratio_raw: null,
  road_access: null,
  transaction_type: null,
  latitude: null,
  longitude: null,
  notes: null,
  visibility: 'internal'
};

export function AnalysisReviewForm({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<AnalysisJob | null>(null);
  const [form, setForm] = useState<FormState>(emptyState);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/analysis-jobs/${jobId}`)
      .then((response) => response.json())
      .then((payload) => {
        setJob(payload.data);
        if (payload.data?.extracted_payload) {
          setForm({ ...emptyState, ...payload.data.extracted_payload });
        }
      })
      .catch(() => setError('解析ジョブを読み込めませんでした。'));
  }, [jobId]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function approve(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch(`/api/analysis-jobs/${jobId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? '承認に失敗しました。');
      setMessage('物件を登録しました。マップへ反映されています。');
      window.setTimeout(() => { window.location.href = `/app`; }, 900);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '承認に失敗しました。');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="form-panel">
      <h1>解析結果レビュー</h1>
      <p>AI抽出結果を確認し、必要な修正をしてから物件として登録します。</p>
      {job ? <p>ジョブ状態: <strong>{job.status}</strong></p> : null}
      {job?.error_message ? <p className="message error-message">{job.error_message}</p> : null}

      <form className="form-grid" onSubmit={approve}>
        <label>物件名<input value={form.name} onChange={(event) => update('name', event.target.value)} required /></label>
        <label>業務項目の登録者名<input value={form.business_item_registrant_name ?? ''} onChange={(event) => update('business_item_registrant_name', event.target.value || null)} /></label>
        <label>住所<input value={form.address} onChange={(event) => update('address', event.target.value)} required /></label>
        <label>種別<input value={form.asset_type ?? ''} onChange={(event) => update('asset_type', event.target.value || null)} /></label>
        <label>価格<input type="number" value={form.price_amount_yen ?? ''} onChange={(event) => update('price_amount_yen', event.target.value ? Number(event.target.value) : null)} /></label>
        <label>価格元表記<input value={form.price_raw_text ?? ''} onChange={(event) => update('price_raw_text', event.target.value || null)} /></label>
        <label>土地面積(㎡)<input type="number" step="0.01" value={form.land_area_sqm ?? ''} onChange={(event) => update('land_area_sqm', event.target.value ? Number(event.target.value) : null)} /></label>
        <label>延床面積(㎡)<input type="number" step="0.01" value={form.floor_area_sqm ?? ''} onChange={(event) => update('floor_area_sqm', event.target.value ? Number(event.target.value) : null)} /></label>
        <label>用途地域<input value={form.zoning ?? ''} onChange={(event) => update('zoning', event.target.value || null)} /></label>
        <label>建ぺい/容積<input value={form.coverage_ratio_raw ?? ''} onChange={(event) => update('coverage_ratio_raw', event.target.value || null)} /></label>
        <label>接道<input value={form.road_access ?? ''} onChange={(event) => update('road_access', event.target.value || null)} /></label>
        <label>取引態様<input value={form.transaction_type ?? ''} onChange={(event) => update('transaction_type', event.target.value || null)} /></label>
        <label>緯度<input type="number" step="0.000001" value={form.latitude ?? ''} onChange={(event) => update('latitude', event.target.value ? Number(event.target.value) : null)} /></label>
        <label>経度<input type="number" step="0.000001" value={form.longitude ?? ''} onChange={(event) => update('longitude', event.target.value ? Number(event.target.value) : null)} /></label>
        <label>公開範囲
          <select value={form.visibility} onChange={(event) => update('visibility', event.target.value as FormState['visibility'])}>
            <option value="internal">社内限定</option>
            <option value="external">社外表示可</option>
          </select>
        </label>
        <label>備考<textarea value={form.notes ?? ''} onChange={(event) => update('notes', event.target.value || null)} /></label>
        <button className="primary-button" type="submit" disabled={pending || job?.status !== 'review_required'}>
          <Save size={18} />{pending ? '登録中' : '承認して登録'}
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
