import { Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { ShoppingCart, Star } from "lucide-react";

import { useRecommendedByVariation } from "../hooks/useProducts";
import { addItem } from "../store/slices/cartSlice";
import { formatPrice } from "../utils/formatters";

function RecoSkeleton() {
  return (
    <div className="animate-pulse bg-white rounded-lg border border-gray-200 p-3">
      <div className="aspect-square bg-gray-200 rounded mb-3" />
      <div className="h-4 bg-gray-200 rounded w-4/5 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-2/5 mb-3" />
      <div className="h-9 bg-gray-200 rounded" />
    </div>
  );
}

export default function ProductRecommendations({
  variationId,
  title = "Gợi ý cho cấu hình đang chọn",
  limit = 5,
}) {
  const { data, isLoading, isFetching } = useRecommendedByVariation(variationId);
  const items = (data?.products ?? []).slice(0, limit);

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xl font-semibold">{title}</h3>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: limit }).map((_, i) => <RecoSkeleton key={i} />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-gray-500 text-sm">Chưa có gợi ý phù hợp.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {items.map((p) => (
            <RecoCard key={`${p.id}-${p.variation_id || "pv"}`} item={p} />
          ))}
        </div>
      )}
    </section>
  );
}

/** Card gợi ý: style & bố cục như ProductCard nhưng
 *  - link theo slug/id + ?v=variation_id
 *  - giá lấy theo variation (item.price)
 */
function RecoCard({ item }) {
  const dispatch = useDispatch();

  const slugOrId = item.slug || item.id;
  const variationQuery = item.variation_id ? `?v=${item.variation_id}` : "";
  const href = `/products/${slugOrId}${variationQuery}`;

  // Giá theo variation từ BE gợi ý
  const price = Number(item.price || 0);
  const discount = Number(item.discount_percentage || 0); // nếu BE có, không thì 0
  const finalPrice = price * (1 - discount / 100);

  // Ảnh & rating (nếu có)
  const imageUrl = item.image || "/placeholder.svg";
  const average_rating = Number(item.rating_average || 0);
  const review_count = Number(item.review_count || 0);

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!item.id || !item.variation_id) return;

    // Tạo payload tối thiểu để giỏ hàng hoạt động
    dispatch(addItem({
      product_id: item.id,
      variation_id: item.variation_id,
      quantity: 1,
      product: {
        product_id: item.id,
        product_name: item.name,
        slug: item.slug,
        images: [{ image_url: imageUrl }],
        // cung cấp variation tương ứng để màn hình giỏ có giá
        variations: [{ variation_id: item.variation_id, price }],
      },
    }));
  };

  return (
    <Link to={href} className="group">
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          <img
            src={imageUrl}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {discount > 0 && (
            <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded-md text-sm font-semibold">
              Giảm {Math.round(discount)}%
            </div>
          )}
        </div>

        <div className="p-4">
          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600">
            {item.name}
          </h3>

          <div className="flex items-center gap-1 mb-2">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.floor(average_rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-gray-600">({review_count})</span>
          </div>

          <div className="mb-3">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-blue-600">{formatPrice(finalPrice)}</span>
              {discount > 0 && (
                <span className="text-sm text-gray-400 line-through">{formatPrice(price)}</span>
              )}
            </div>
          </div>

          <button
            onClick={handleAddToCart}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Thêm vào giỏ</span>
          </button>
        </div>
      </div>
    </Link>
  );
}
