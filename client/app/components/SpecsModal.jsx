// client/app/components/SpecsModal.jsx
import { X } from "lucide-react";
import SpecsTable from "./SpecsTable";

export default function SpecsModal({ open, onClose, specs }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1000]">
      {/* backdrop blur */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-auto my-8 w-full max-w-3xl bg-white rounded-2xl shadow-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Thông số kỹ thuật</h3>
          <button onClick={onClose} className="p-2 rounded hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 max-h-[75vh] overflow-auto">
          <SpecsTable specs={specs} />
        </div>
      </div>
    </div>
  );
}
