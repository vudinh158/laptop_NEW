// components/MapPicker.jsx
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// sửa icon mặc định của Leaflet khi dùng bundler
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Mỗi khi value đổi -> đưa marker vào giữa khung
function RecenterOnLocation({ value, zoom = 17 }) {
  const map = useMap();
  useEffect(() => {
    if (!value || !map) return;
    map.setView([value.lat, value.lng], zoom, { animate: true });
    setTimeout(() => map.invalidateSize(), 200); // đề phòng map trong tab/accordion
  }, [value, zoom, map]);
  return null;
}

// Cho phép click map để đặt marker
function ClickToSetMarker({ onPick }) {
  useMapEvents({
    click(e) {
      onPick?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function MapPicker({ value, onChange, onConfirm }) {
  const center = value ? [value.lat, value.lng] : [10.776, 106.7];

  return (
    <div>
      <MapContainer
        center={center}
        zoom={15}
        style={{ height: 260, width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <RecenterOnLocation value={value} />
        <ClickToSetMarker onPick={(latlng) => onChange?.(latlng)} />
        {value && (
          <Marker
            position={[value.lat, value.lng]}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const p = e.target.getLatLng();
                onChange?.({ lat: p.lat, lng: p.lng });
              },
            }}
          />
        )}
      </MapContainer>

      <div className="mt-2">
        <button
          type="button"
          onClick={() => value && onConfirm?.(value)}
          disabled={!value}
          className="px-3 py-2 rounded bg-blue-600 text-white text-sm shadow
                     hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Xác nhận vị trí
        </button>
      </div>
    </div>
  );
}
