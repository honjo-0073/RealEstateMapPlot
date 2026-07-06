'use client';

import Link from 'next/link';
import { Save } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { Property } from '@/lib/database.types';

export function PropertyEditForm({ propertyId }: { propertyId: string }) {
  const [property, setProperty] = useState<Property | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    fetch(`/api/properties/${propertyId}`)
      .then((response) => response.json())
      .then((payload) => setProperty(payload.data))
      .catch(() => setError('物件を読み込めませんでした。'));
  }, [propertyId]);

  function update<K extends keyof Property>(key: K, value: Property[K]) {
    setProperty((current) => (current ? { ...current, [key]: value } : current));
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!property) return;
    setPending(true);
    setMessage('');
    setError('');

    const payload = {
      name: property.name,
      business_item_registrant_name: property.business_item_registrant_name,
      asset_type: property.asset_type,
      address: property.address,
      price_amount_yen: property.price_amount_yen,
      price_raw_text: property.price_raw_text,
      land_area_sqm: property.land_area_sqm,
      floor_area_sqm: property.floor_area_sqm,
      zoning: property.zoning,
      coverage_ratio_raw: property.coverage_ratio_raw,
      road_access: property.road_access,
      transaction_type: property.transaction_type,
      latitude: property.latitude,
      longitude: property.longitude,
      notes: property.notes,
      visibility: property.visibility
    };

    try {
      const response = await fetch(`/api/properties/${propertyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? '保存に失敗しました。');
      setProperty(result.data);
      setMessage('保存しました。');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '保存に失敗しました。');
    } finally {
      setPending(false);
    }
  }

  if (!property) {
    return <div className="form-panel"><p>{error || '読み込み中です。'}</p><Link href="/app" className="secondary-action">マップへ戻る</Link></div>;
  }

  return (
    <div className="form-panel">
      <h1>物件編集</h1>
      <p>物件情報を更新すると監査ログに変更履歴が残ります。</p>
      <form className="form-grid" onSubmit={save}>
        <label>物件名<input value={property.name} onChange={(event) => update('name', event.target.value)} required /></label>
        <label>業務項目の登録者名<input value={property.business_item_registrant_name ?? ''} onChange={(event) => update('business_item_registrant_name', event.target.value || null)} /></label>
        <label>住所<input value={property.address} onChange={(event) => update('address', event.target.value)} required /></label>
        <label>種別<input value={property.asset_type ?? ''} onChange={(event) => update('asset_type', event.target.value || null)} /></label>
        <label>価格<input type="number" value={property.price_amount_yen ?? ''} onChange={(event) => update('price_amount_yen', event.target.value ? Number(event.target.value) : null)} /></label>
        <label>用途地域<input value={property.zoning ?? ''} onChange={(event) => update('zoning', event.target.value || null)} /></label>
        <label>接道<input value={property.road_access ?? ''} onChange={(event) => update('road_access', event.target.value || null)} /></label>
        <label>公開範囲
          <select value={property.visibility} onChange={(event) => update('visibility', event.target.value as Property['visibility'])}>
            <option value="internal">社内限定</option>
            <option value="external">社外表示可</option>
          </select>
        </label>
        <label>備考<textarea value={property.notes ?? ''} onChange={(event) => update('notes', event.target.value || null)} /></label>
        <button className="primary-button" type="submit" disabled={pending}><Save size={18} />{pending ? '保存中' : '保存する'}</button>
      </form>
      {message ? <p className="message">{message}</p> : null}
      {error ? <p className="message error-message">{error}</p> : null}
      <div className="detail-actions"><Link href="/app" className="secondary-action">マップへ戻る</Link></div>
    </div>
  );
}
