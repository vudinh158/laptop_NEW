// client/app/components/SpecsTable.jsx
export default function SpecsTable({ specs = {}, dense = false }) {
  // specs ví dụ:
  // { "CPU":"i5-1235U","RAM":"16GB","SSD":"512GB","GPU":"RTX 3050","Màn hình":"15.6\" FHD" }
  const rows = Object.entries(specs || {});
  if (!rows.length) return <p className="text-gray-500">Chưa có thông số kỹ thuật.</p>;

  return (
    <table className={`w-full text-sm ${dense ? "" : "text-base"} border border-gray-200 rounded-lg overflow-hidden`}>
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k} className="odd:bg-white even:bg-gray-50">
            <th className="w-1/3 text-gray-600 font-medium p-3 align-top border-b border-gray-200">{k}</th>
            <td className="p-3 text-gray-900 border-b border-gray-200">{String(v)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
