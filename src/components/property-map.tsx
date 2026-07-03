'use client';

import L from 'leaflet';
import { useEffect } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';

import type { Property } from '@/lib/database.types';
import { formatPrice } from '@/lib/property-filters';

const defaultCenter: [number, number] = [34.705, 135.505];

function FlyToProperty({ property }: { property: Property | null }) {
  const map = useMap();

  useEffect(() => {
    if (property?.latitude !== null && property?.latitude !== undefined && property.longitude !== null && property.longitude !== undefined) {
      map.flyTo([property.latitude, property.longitude], 14, { duration: 0.6 });
    }
  }, [map, property]);

  return null;
}

function createMarkerIcon(selected: boolean) {
  return L.divIcon({
    className: selected ? 'property-marker property-marker-selected' : 'property-marker',
    html: '<span></span>',
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });
}

export function PropertyMap({
  properties,
  selectedProperty,
  onSelect
}: {
  properties: Property[];
  selectedProperty: Property | null;
  onSelect: (property: Property) => void;
}) {
  return (
    <MapContainer center={defaultCenter} zoom={10} scrollWheelZoom className="map-canvas">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyToProperty property={selectedProperty} />
      {properties.map((property) => {
        if (property.latitude === null || property.longitude === null) return null;
        const selected = selectedProperty?.id === property.id;
        return (
          <Marker
            key={property.id}
            position={[property.latitude, property.longitude]}
            icon={createMarkerIcon(selected)}
            eventHandlers={{ click: () => onSelect(property) }}
          >
            <Popup>
              <strong>{property.name}</strong>
              <span>{formatPrice(property.price_amount_yen)}</span>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
