import type { Property } from '@/lib/database.types';

export type PropertyFilters = {
  q?: string | null;
  price?: string | null;
  transactionType?: string | null;
  assetType?: string | null;
  north?: number | null;
  south?: number | null;
  east?: number | null;
  west?: number | null;
};

export function formatPrice(value: number | null) {
  if (value === null) return '価格相談';
  if (value >= 100000000) return `${(value / 100000000).toFixed(value % 100000000 === 0 ? 0 : 1)}億円`;
  if (value >= 10000) return `${Math.round(value / 10000).toLocaleString('ja-JP')}万円`;
  return `${value.toLocaleString('ja-JP')}円`;
}

export function priceRangeToBounds(price?: string | null) {
  switch (price) {
    case 'under-100m':
      return { minPrice: null, maxPrice: 99999999 };
    case '100m-200m':
      return { minPrice: 100000000, maxPrice: 199999999 };
    case 'over-200m':
      return { minPrice: 200000000, maxPrice: null };
    case 'unknown':
      return { minPrice: null, maxPrice: null, unknownOnly: true };
    default:
      return { minPrice: null, maxPrice: null };
  }
}

export function filterSeedProperties(properties: Property[], filters: PropertyFilters) {
  const query = filters.q?.trim().toLowerCase();
  const bounds = priceRangeToBounds(filters.price);

  return properties.filter((property) => {
    if (query) {
      const haystack = `${property.name} ${property.address} ${property.notes ?? ''}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    if (bounds.unknownOnly && property.price_amount_yen !== null) return false;
    if (bounds.minPrice !== null && property.price_amount_yen !== null && property.price_amount_yen < bounds.minPrice) return false;
    if (bounds.maxPrice !== null && property.price_amount_yen !== null && property.price_amount_yen > bounds.maxPrice) return false;
    if (filters.transactionType && property.transaction_type !== filters.transactionType) return false;
    if (filters.assetType && property.asset_type !== filters.assetType) return false;

    if (
      filters.north !== null && filters.north !== undefined &&
      filters.south !== null && filters.south !== undefined &&
      filters.east !== null && filters.east !== undefined &&
      filters.west !== null && filters.west !== undefined
    ) {
      if (property.latitude === null || property.longitude === null) return false;
      if (property.latitude > filters.north || property.latitude < filters.south) return false;
      if (property.longitude > filters.east || property.longitude < filters.west) return false;
    }

    return true;
  });
}

export function toNumber(value: string | null) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
