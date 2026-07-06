import type { ExtractedPropertyPayload } from '@/lib/gemini';

export type GeocodeResult = {
  latitude: number;
  longitude: number;
  provider: 'gsi';
  matchedAddress: string | null;
};

type GsiFeature = {
  geometry?: {
    coordinates?: unknown;
  };
  properties?: {
    title?: string;
  };
};

function isValidCoordinate(longitude: number, latitude: number) {
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

function appendGeocodingNote(notes: string | null, result: GeocodeResult) {
  const note = `住所から緯度経度を自動補完しました（provider=${result.provider}${result.matchedAddress ? `, matched=${result.matchedAddress}` : ''}）。`;
  return [notes, note].filter(Boolean).join('\n');
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const normalizedAddress = address.trim();
  if (!normalizedAddress) return null;

  const endpoint = new URL('https://msearch.gsi.go.jp/address-search/AddressSearch');
  endpoint.searchParams.set('q', normalizedAddress);

  let features: GsiFeature[];
  try {
    const response = await fetch(endpoint, {
      headers: {
        'User-Agent': 'RealEstateMapPlot/1.0'
      }
    });

    if (!response.ok) return null;
    features = (await response.json()) as GsiFeature[];
  } catch {
    return null;
  }

  const first = Array.isArray(features) ? features[0] : null;
  const coordinates = first?.geometry?.coordinates;

  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;

  const [longitude, latitude] = coordinates;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
  if (!isValidCoordinate(longitude, latitude)) return null;

  return {
    latitude,
    longitude,
    provider: 'gsi',
    matchedAddress: first?.properties?.title ?? null
  };
}

export async function fillCoordinatesIfMissing(payload: ExtractedPropertyPayload): Promise<ExtractedPropertyPayload> {
  if (payload.latitude !== null && payload.longitude !== null) return payload;
  if (!payload.address) return payload;

  const result = await geocodeAddress(payload.address);
  if (!result) return payload;

  return {
    ...payload,
    latitude: result.latitude,
    longitude: result.longitude,
    notes: appendGeocodingNote(payload.notes, result)
  };
}
