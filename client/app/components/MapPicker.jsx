// client/src/components/MapPicker.jsx
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { useEffect, useState } from "react";
import L from "leaflet";

// icon mặc định
const DefaultIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) { onPick(e.latlng); }
  });
  return null;
}

export default function MapPicker({ value, onChange, onConfirm }) {
  const [pos, setPos] = useState(value || { lat: 10.776, lng: 106.700 }); // default HCM
  const [confirmed, setConfirmed] = useState(false);

  // nếu parent truyền value mới
  useEffect(() => {
    if (value?.lat && value?.lng) setPos(value);
  }, [value]);

  const handlePick = (latlng) => {
    setPos(latlng);
    setConfirmed(false);
    onChange?.(latlng);
  };

  const handleConfirm = () => {
    setConfirmed(true);
    onConfirm?.(pos); // báo cho parent “đã xác nhận”
  };

  return (
    <div className="space-y-2">
      <div className="text-sm">
        <div>Toạ độ: <b>{pos.lat.toFixed(6)}</b>, <b>{pos.lng.toFixed(6)}</b></div>
        <div className={confirmed ? "text-green-600" : "text-amber-600"}>
          {confirmed ? "ĐÃ XÁC NHẬN VỊ TRÍ" : "Chưa xác nhận vị trí"}
        </div>
      </div>

      <MapContainer center={[pos.lat, pos.lng]} zoom={15} style={{ height: 320, width: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                   attribution="&copy; OpenStreetMap contributors"/>
        <ClickHandler onPick={handlePick}/>
        <Marker position={[pos.lat, pos.lng]} />
      </MapContainer>

      <button type="button"
              onClick={handleConfirm}
              className="px-3 py-2 rounded bg-blue-600 text-white">
        Xác nhận vị trí
      </button>
    </div>
  );
}
