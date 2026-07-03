'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Building2, ExternalLink, FileUp, Filter, LockKeyhole, MapPin, Search, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type { Property } from '@/lib/database.types';
import { formatPrice } from '@/lib/property-filters';

const PropertyMap = dynamic(() => import('@/components/property-map').then((mod) => mod.PropertyMap), {
  ssr: false,
  loading: () => <div className="map-loading">地図を読み込んでいます</div>
});

type PropertyResponse = {
  data: Property[];
  source: 'seed' | 'supabase' | 'unconfigured';
};

export function PropertyDashboard() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [query, setQuery] = useState('');
  const [price, setPrice] = useState('all');
  const [source, setSource] = useState<PropertyResponse['source']>('seed');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (price !== 'all') params.set('price', price);

    setLoading(true);
    fetch(`/api/properties?${params.toString()}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((payload: PropertyResponse) => {
        setProperties(payload.data);
        setSource(payload.source);
        setSelectedProperty((current) => payload.data.find((item) => item.id === current?.id) ?? payload.data[0] ?? null);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [query, price]);

  const summary = useMemo(() => {
    const priced = properties.filter((property) => property.price_amount_yen !== null);
    const total = priced.reduce((sum, property) => sum + (property.price_amount_yen ?? 0), 0);
    return {
      count: properties.length,
      pricedCount: priced.length,
      total
    };
  }, [properties]);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand-icon"><MapPin size={22} /></div>
          <div>
            <h1>不動産仕入マップ</h1>
            <p>Supabase 正本 / PDF解析レビュー</p>
          </div>
        </div>

        <div className="status-strip">
          <span className={source === 'supabase' ? 'status-dot live' : 'status-dot'} />
          <span>{source === 'supabase' ? 'Supabase接続中' : 'デモデータ表示中'}</span>
          <Link href="/login" className="login-link"><LockKeyhole size={15} />ログイン</Link>
        </div>

        <section className="toolbar" aria-label="物件検索">
          <label className="search-field">
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="物件名・住所・備考で検索" />
          </label>
          <label className="select-field">
            <Filter size={17} />
            <select value={price} onChange={(event) => setPrice(event.target.value)}>
              <option value="all">価格帯すべて</option>
              <option value="under-100m">1億円未満</option>
              <option value="100m-200m">1億〜2億円</option>
              <option value="over-200m">2億円以上</option>
              <option value="unknown">価格相談・不明</option>
            </select>
          </label>
        </section>

        <section className="summary-grid" aria-label="集計">
          <div>
            <span>表示物件</span>
            <strong>{summary.count}</strong>
          </div>
          <div>
            <span>価格入力</span>
            <strong>{summary.pricedCount}</strong>
          </div>
          <div>
            <span>総額</span>
            <strong>{formatPrice(summary.total || null)}</strong>
          </div>
        </section>

        <section className="property-list" aria-label="物件一覧">
          {loading ? <div className="empty-state">読み込み中です</div> : null}
          {!loading && properties.length === 0 ? <div className="empty-state">条件に合う物件がありません</div> : null}
          {properties.map((property) => (
            <button
              type="button"
              key={property.id}
              className={selectedProperty?.id === property.id ? 'property-row selected' : 'property-row'}
              onClick={() => setSelectedProperty(property)}
            >
              <span className="row-title">{property.name}</span>
              <span className="row-meta"><Building2 size={14} />{property.address}</span>
              <span className="row-footer">
                <strong>{formatPrice(property.price_amount_yen)}</strong>
                <em>{property.transaction_type ?? '未設定'}</em>
              </span>
            </button>
          ))}
        </section>
      </aside>

      <section className="map-area">
        <PropertyMap properties={properties} selectedProperty={selectedProperty} onSelect={setSelectedProperty} />
        <Link href="/documents/new" className="upload-action"><FileUp size={18} />PDF追加</Link>
      </section>

      <aside className="detail-panel" aria-label="物件詳細">
        {selectedProperty ? <PropertyDetail property={selectedProperty} /> : <div className="empty-state">物件を選択してください</div>}
      </aside>
    </main>
  );
}

function PropertyDetail({ property }: { property: Property }) {
  return (
    <div className="detail-content">
      <div className="detail-heading">
        <div>
          <span className="eyebrow">{property.asset_type ?? '種別未設定'}</span>
          <h2>{property.name}</h2>
        </div>
        <span className={property.visibility === 'external' ? 'visibility external' : 'visibility'}>
          <ShieldCheck size={14} />{property.visibility === 'external' ? '社外可' : '社内限定'}
        </span>
      </div>

      <dl className="detail-list">
        <div><dt>住所</dt><dd>{property.address}</dd></div>
        <div><dt>価格</dt><dd>{formatPrice(property.price_amount_yen)}</dd></div>
        <div><dt>土地面積</dt><dd>{property.land_area_sqm ? `${property.land_area_sqm.toLocaleString('ja-JP')}㎡` : '未設定'}</dd></div>
        <div><dt>延床面積</dt><dd>{property.floor_area_sqm ? `${property.floor_area_sqm.toLocaleString('ja-JP')}㎡` : '未設定'}</dd></div>
        <div><dt>用途地域</dt><dd>{property.zoning ?? '未設定'}</dd></div>
        <div><dt>建ぺい/容積</dt><dd>{property.coverage_ratio_raw ?? '未設定'}</dd></div>
        <div><dt>接道</dt><dd>{property.road_access ?? '未設定'}</dd></div>
        <div><dt>取引態様</dt><dd>{property.transaction_type ?? '未設定'}</dd></div>
      </dl>

      <section className="notes-block">
        <h3>備考</h3>
        <p>{property.notes ?? '備考はありません'}</p>
      </section>

      <div className="detail-actions">
        <Link href={`/properties/${property.id}`} className="secondary-action">詳細編集</Link>
        <a href={`https://www.google.com/maps?q=${property.latitude},${property.longitude}`} target="_blank" rel="noreferrer" className="secondary-action">
          <ExternalLink size={16} />地図で開く
        </a>
      </div>
    </div>
  );
}
