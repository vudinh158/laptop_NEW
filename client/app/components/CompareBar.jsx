// client/app/components/CompareBar.jsx
import { useSelector, useDispatch } from "react-redux";
import { removeCompare, clearCompare } from "../store/slices/compareSlice";

export default function CompareBar({ onOpen }) {
  const { items } = useSelector(s => s.compare);
  const dispatch = useDispatch();
  if (!items.length) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[900] bg-white/90 backdrop-blur border shadow-lg rounded-2xl p-3">
      <div className="flex items-center gap-3">
        <div className="flex -space-x-2">
          {items.map(p => (
            <img key={p.product_id} src={p.thumbnail_url} alt={p.product_name}
                 className="w-10 h-10 rounded-lg border object-cover" />
          ))}
        </div>
        <div className="text-sm text-gray-700">{items.length} sản phẩm đã chọn</div>
        <button
          className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-50"
          disabled={items.length < 2}
          onClick={onOpen}
        >
          So sánh
        </button>
        <button className="text-xs text-gray-500 hover:text-gray-700" onClick={() => dispatch(clearCompare())}>
          Xoá tất cả
        </button>
      </div>
    </div>
  );
}
