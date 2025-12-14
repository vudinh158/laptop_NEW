import { useState } from "react";
import { useParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useProduct, useRecommendedByVariation } from "../hooks/useProducts";
import { addItem } from "../store/slices/cartSlice";
import ProductCard from "../components/ProductCard";
import LoadingSpinner from "../components/LoadingSpinner";
import { Star, ShoppingCart, Truck, Shield, RefreshCw } from "lucide-react";
import { formatPrice } from "../utils/formatters";
import SpecsModal from "../components/SpecsModal";
import SpecsTable from "../components/SpecsTable";
import { addCompare } from "../store/slices/compareSlice";
import { useSelector } from "react-redux";
import CompareBar from "../components/CompareBar";
import CompareModal from "../components/CompareModal";
import ProductRecommendations from "../components/ProductRecommendations";
import { Reply, MessageSquare, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

export default function ProductDetailPage() {


  const { id } = useParams(); // ID này là product_id hoặc slug
  const dispatch = useDispatch();

  const [cmpOpen, setCmpOpen] = useState(false);
  const compareItems = useSelector((s) => s.compare?.items ?? []);

  const ATTRS = [
    "processor",
    "ram",
    "storage",
    "graphics_card",
    "screen_size",
    "color",
  ];
  // state chọn cấu hình (không phụ thuộc product)
  const [sel, setSel] = useState(
    ATTRS.reduce((o, k) => ({ ...o, [k]: "" }), {})
  );
  const { data: productData, isLoading, error } = useProduct(id); // Lấy productData
  // Use stable route id so hook order doesn't change between renders
  const [selectedVariation, setSelectedVariation] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [specOpen, setSpecOpen] = useState(false);

  const { data: recommendations } = useRecommendedByVariation(selectedVariation?.variation_id);

  const product = productData?.product || 0; // Trích xuất object product

  // const handleAddToCart = () => {
  //   if (!selectedVariation || !product) return;

  //   dispatch(
  //     addItem({
  //       // FIX: Sử dụng product_id và variation_id
  //       product_id: product.product_id,
  //       variation_id: selectedVariation.variation_id,
  //       quantity,
  //       product: {
  //         ...product,
  //         variation: selectedVariation,
  //       },
  //     })
  //   );
  // };
  // FIX: Sử dụng thuộc tính product_id, product_name
  const currentVariation = selectedVariation || product.variations?.[0];
  const discount = Number(product.discount_percentage || 0);
  const price = Number(currentVariation?.price) || 0;
  const finalPrice = price * (1 - discount / 100);
  const productName = product.product_name; // Lấy tên sản phẩm

  const currentVariationId = selectedVariation?.variation_id || product?.variations?.[0]?.variation_id;
  // unique options lấy từ variations của sản phẩm hiện tại
  const uniqueOptions = ATTRS.reduce((acc, key) => {
    const set = new Set(
      (product.variations || []).map((v) => v[key]).filter(Boolean)
    );
    acc[key] = [...set];
    return acc;
  }, {});

  const matchVariation = (v, s) =>
    ATTRS.every((k) => !s[k] || String(v[k]) === String(s[k]));

  const matched = (product.variations || []).find((v) =>
    matchVariation(v, sel)
  );

  const toggleSelect = (k, val) => {
    setSel((prev) => {
      const next = { ...prev, [k]: prev[k] === val ? "" : val };
      const m = (product.variations || []).find((v) => matchVariation(v, next));
      setSelectedVariation(m || null);
      return next;
    });
  };

  const isDisabled = (k, val) => {
    const s = { ...sel, [k]: val };
    return !(product.variations || []).some((v) => matchVariation(v, s));
  };

  // Giá hiển thị: yêu cầu chọn đủ => dùng matched; chưa chọn => dùng base_price
  const shownPrice = matched
    ? Number(matched.price) *
      (1 - (Number(product.discount_percentage) || 0) / 100)
    : Number(product.base_price) *
      (1 - (Number(product.discount_percentage) || 0) / 100);

  const normalizeSpecs = (specs) => {
    if (!specs) return {};
    const out = {};
    const title = (s) =>
      String(s)
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

    const toText = (val) => {
      if (val == null) return "";
      if (Array.isArray(val)) return val.map(toText).filter(Boolean).join(", ");
      if (typeof val === "object") {
        // hay gặp: {key, value} hoặc {name, value} …
        return (
          val.value ?? val.name ?? val.label ?? Object.values(val).join(" ")
        );
      }
      return String(val);
    };

    Object.entries(specs).forEach(([section, entries]) => {
      if (Array.isArray(entries)) {
        // Ví dụ: audio: [{key:'Loa', value:'Stereo'}, ...]
        entries.forEach((item, i) => {
          const k =
            item.key ?? item.name ?? item.label ?? `${title(section)} ${i + 1}`;
          out[k] = toText(item.value ?? item);
        });
      } else if (typeof entries === "object") {
        // Ví dụ: display: { size:'15.6"', tech:'IPS' }
        Object.entries(entries).forEach(([k, v]) => {
          out[`${title(section)} - ${title(k)}`] = toText(v);
        });
      } else {
        out[title(section)] = toText(entries);
      }
    });

    return out;
  };

  const flatSpecs = normalizeSpecs(product.specs);
  const briefSpecs = Object.fromEntries(Object.entries(flatSpecs).slice(0, 6));

  const [questionText, setQuestionText] = useState("");
  const [answerDrafts, setAnswerDrafts] = useState({}); // { [question_id]: text }

  const token = localStorage.getItem("token"); // token JWT từ khi đăng nhập
  const isAuthed = !!token;
  const fmt = (s) => new Date(s).toLocaleString();

  const roles = JSON.parse(localStorage.getItem("roles") || "[]");
  const canAnswer = roles.includes("admin") || roles.includes("staff");

  const postQuestion = async () => {
    if (!questionText.trim()) return;
    try {
      const resp = await fetch(`/api/products/${id}/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question_text: questionText.trim() }),
      });
      if (!resp.ok) throw new Error("Create question failed");
      setQuestionText("");
      // Cách đơn giản: tải lại để thấy dữ liệu mới
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert("Gửi câu hỏi thất bại");
    }
  };

  const postAnswer = async (question_id) => {
    const answer_text = (answerDrafts[question_id] || "").trim();
    if (!answer_text) return;
    try {
      const resp = await fetch(
        `/api/products/questions/${question_id}/answers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ answer_text }),
        }
      );
      if (!resp.ok) throw new Error("Create answer failed");
      setAnswerDrafts((s) => ({ ...s, [question_id]: "" }));
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert("Gửi trả lời thất bại");
    }
  };
// avatar tròn chữ cái đầu
const Avatar = ({ name }) => {
  const ch = (name || "").trim()[0]?.toUpperCase() || "U";
  return (
    <div className="h-9 w-9 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center font-semibold">
      {ch}
    </div>
  );
};

// badge quản trị viên
const AdminBadge = () => (
  <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200">
    QTV
  </span>
);

// time-ago đơn giản
const timeAgo = (d) => {
  const diff = Math.max(1, Math.floor((Date.now() - new Date(d).getTime()) / 1000));
  const units = [
    ["năm", 31536000],
    ["tháng", 2592000],
    ["tuần", 604800],
    ["ngày", 86400],
    ["giờ", 3600],
    ["phút", 60],
    ["giây", 1],
  ];
  for (const [label, sec] of units) {
    if (diff >= sec) return `${Math.floor(diff / sec)} ${label} trước`;
  }
  return "vừa xong";
};

  const navigate = useNavigate();
  useEffect(() => {
  if (!selectedVariation && product?.variations?.length) {
    setSelectedVariation(product.variations[0]);
  }
}, [product?.variations]); // chỉ chạy khi variations đổi
const handleAddToCart = () => {
  if (!product) return;
  const variation = selectedVariation || product.variations?.[0];
  if (!variation) return; // phòng trường hợp sản phẩm không có biến thể

  dispatch(
    addItem({
      product_id: product.product_id,
      variation_id: variation.variation_id,
      quantity: Math.max(1, Number(quantity) || 1), // +1 (hoặc theo ô số lượng)
      product: { ...product, variation },
    })
  );
};

const handleBuyNow = () => {
  handleAddToCart();          // thêm vào giỏ
  navigate("/checkout");      // điều hướng đến trang thanh toán
  // nếu dự án bạn dùng đường dẫn khác: "/cart/checkout" thì đổi ở đây
};

const [openReplies, setOpenReplies] = useState({});
const toggleReplies = (qid) =>
  setOpenReplies((s) => ({ ...s, [qid]: !s[qid] }));
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center text-red-600">Không tìm thấy sản phẩm</div>
      </div>
    );
  }



  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <CompareBar onOpen={() => setCmpOpen(true)} />
          <CompareModal
            open={cmpOpen}
            onClose={() => setCmpOpen(false)}
            products={compareItems}
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4">
                <img
                  // FIX: Truy cập images và thumbnail_url
                  src={
                    product.images?.[selectedImage]?.image_url ||
                    product.thumbnail_url ||
                    "/placeholder.svg"
                  }
                  alt={productName}
                  className="w-full h-full object-cover"
                />
              </div>

              {product.images?.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {product.images.map((image, index) => (
                    <button
                      key={image.image_id} // FIX: Sử dụng image_id làm key
                      onClick={() => setSelectedImage(index)}
                      className={`aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 ${
                        selectedImage === index
                          ? "border-blue-600"
                          : "border-transparent"
                      }`}
                    >
                      <img
                        src={image.image_url || "/placeholder.svg"}
                        alt={`${productName} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4 text-balance">
                {productName}
              </h1>{" "}
              {/* FIX: Hiển thị productName */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.floor(product.rating_average || 0) // FIX: Dùng rating_average
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-gray-600">
                  ({product.review_count || 0} đánh giá)
                </span>
                <button
                  onClick={() =>
                    dispatch(
                      addCompare({
                        product_id: product.product_id,
                        product_name: product.product_name,
                        thumbnail_url: product.thumbnail_url,
                        specs: product.specs, // rất quan trọng để có bảng
                      })
                    )
                  }
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  + Thêm vào so sánh
                </button>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-3 mb-2">
                  {/* <span className="text-4xl font-bold text-blue-600">
                    {formatPrice(finalPrice)}
                  </span> */}
                  {discount > 0 && (
                    <>
                      {/* Giá gốc hiển thị base_price */}
                      <span className="text-xl text-gray-400 line-through">
                        {formatPrice(price)}
                      </span>
                      <span className="px-2 py-1 bg-orange-500 text-white rounded-md text-sm font-semibold">
                        -{discount}%
                      </span>
                    </>
                  )}
                </div>
              </div>
              {/* ---- THAY block variations cũ bằng UI lựa chọn như ảnh demo ---- */}
              {product.variations?.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-baseline gap-3 mb-3">
                    <span className="text-4xl font-bold text-blue-600">
                      {formatPrice(shownPrice)}
                    </span>
                    {product.discount_percentage > 0 && (
                      <span className="px-2 py-1 bg-orange-500 text-white rounded-md text-sm font-semibold">
                        -{product.discount_percentage}%
                      </span>
                    )}
                  </div>

                  <div className="space-y-4 rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">
                        Lựa chọn cấu hình tuỳ chỉnh
                      </h3>
                      <button
                        className="text-sm text-blue-600 hover:underline"
                        onClick={() => {
                          setSel(
                            ATTRS.reduce((o, k) => ({ ...o, [k]: "" }), {})
                          );
                          setSelectedVariation(null);
                        }}
                      >
                        Thiết lập lại
                      </button>
                    </div>

                    {ATTRS.map((k) =>
                      uniqueOptions[k]?.length ? (
                        <div key={k}>
                          <div className="text-xs font-medium text-gray-500 mb-2 uppercase">
                            {{
                              processor: "Bộ vi xử lý",
                              ram: "RAM",
                              storage: "Ổ cứng",
                              graphics_card: "Card đồ hoạ",
                              screen_size: "Màn hình",
                              color: "Màu sắc",
                            }[k] || k}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {uniqueOptions[k].map((val) => {
                              const active = sel[k] === val;
                              const disabled = isDisabled(k, val);
                              return (
                                <button
                                  key={val}
                                  onClick={() =>
                                    !disabled && toggleSelect(k, val)
                                  }
                                  className={[
                                    "px-3 py-2 rounded-lg border text-sm",
                                    active
                                      ? "border-red-500 text-red-600 bg-red-50"
                                      : "border-gray-300 hover:bg-gray-50",
                                    disabled &&
                                      "opacity-40 cursor-not-allowed hover:bg-transparent",
                                  ].join(" ")}
                                  aria-pressed={active}
                                  disabled={disabled}
                                  title={
                                    disabled ? "Kết hợp này không có sẵn" : ""
                                  }
                                >
                                  {String(val)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : null
                    )}
                  </div>
                </div>
              )}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Số lượng:</h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(
                        Math.max(1, Number.parseInt(e.target.value) || 1)
                      )
                    }
                    className="w-20 h-10 text-center border border-gray-300 rounded-lg"
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
  <button
    onClick={handleAddToCart}
    disabled={!product?.variations?.length}
    className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    title={!product?.variations?.length ? "Sản phẩm chưa có cấu hình" : ""}
  >
    <ShoppingCart className="w-5 h-5" />
    <span className="font-semibold">Thêm vào giỏ</span>
  </button>

  <button
    onClick={handleBuyNow}
    disabled={!product?.variations?.length}
    className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-4 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    title={!product?.variations?.length ? "Sản phẩm chưa có cấu hình" : ""}
  >
    <span className="font-semibold">Mua ngay</span>
  </button>
</div>

              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-200">
                <div className="flex flex-col items-center text-center">
                  <Truck className="w-8 h-8 text-blue-600 mb-2" />
                  <span className="text-sm text-gray-600">
                    Miễn phí vận chuyển
                  </span>
                </div>
                <div className="flex flex-col items-center text-center">
                  <Shield className="w-8 h-8 text-blue-600 mb-2" />
                  <span className="text-sm text-gray-600">
                    Bảo hành 12 tháng
                  </span>
                </div>
                <div className="flex flex-col items-center text-center">
                  <RefreshCw className="w-8 h-8 text-blue-600 mb-2" />
                  <span className="text-sm text-gray-600">Đổi trả 7 ngày</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Thông số kỹ thuật</h3>
              <button
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                onClick={() => setSpecOpen(true)}
              >
                Xem tất cả
              </button>
            </div>
            <SpecsTable specs={briefSpecs} dense />
          </div>
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Mô tả sản phẩm
            </h2>
            <div
              className="prose prose-lg max-w-none text-gray-700 product-desc"
              dangerouslySetInnerHTML={{ __html: product.description || "" }}
            />
          </div>

          <SpecsModal
            open={specOpen}
            onClose={() => setSpecOpen(false)}
            specs={flatSpecs}
          />
        </div>
        {/* HỎI & ĐÁP */}
<div className="mt-10">
  <h2 className="text-2xl font-bold text-gray-900 mb-4">Hỏi & Đáp</h2>

  {/* Ô đặt câu hỏi nổi bật */}
  <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5 mb-6">
    <div className="flex gap-4 items-start">
      <div className="hidden sm:block">
        <img src="/mascot.svg" onError={({currentTarget})=>{currentTarget.style.display='none'}} alt="" className="w-16 h-16 object-contain" />
      </div>
      <div className="flex-1">
        <p className="text-gray-800 font-semibold mb-1">Hãy đặt câu hỏi cho chúng tôi</p>
        <p className="text-sm text-gray-500 mb-3">
          Thông tin có thể thay đổi theo thời gian, vui lòng đặt câu hỏi để nhận được cập nhật mới nhất!
        </p>

        <div className="flex gap-2">
          <textarea
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            rows={1}
            placeholder="Viết câu hỏi của bạn tại đây…"
            className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={postQuestion}
            disabled={!isAuthed || !questionText.trim()}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50"
            title={!isAuthed ? "Đăng nhập để gửi câu hỏi" : "Gửi câu hỏi"}
          >
            <MessageSquare className="w-4 h-4" />
            Gửi câu hỏi
          </button>
        </div>
        {!isAuthed && (
          <div className="text-xs text-gray-500 mt-1">Bạn cần đăng nhập để gửi câu hỏi.</div>
        )}
      </div>
    </div>
  </div>

  {/* Danh sách Q&A */}
  <div className="space-y-5">
    {(product.questions || []).length === 0 && (
      <div className="text-gray-500">Chưa có câu hỏi nào.</div>
    )}

    {(product.questions || []).map((q) => {
      const asker = q.user?.full_name || q.user?.username || "Người dùng";
      const answers = q.answers || [];
      const opened = !!openReplies[q.question_id];

      return (
        <div key={q.question_id} className="rounded-xl border border-gray-200 bg-white p-4">
          {/* HÀNG CÂU HỎI */}
          <div className="flex gap-3">
            <Avatar name={asker} />
            <div className="flex-1">
              <div className="flex items-center flex-wrap gap-x-2">
                <span className="font-semibold text-gray-900">{asker}</span>
                <span className="text-xs text-gray-500">• {timeAgo(q.created_at)}</span>
              </div>
              <div className="mt-1 text-gray-800">{q.question_text}</div>

              <div className="mt-2">
                <button
                  onClick={() => toggleReplies(q.question_id)}
                  className="text-sm text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                >
                  <Reply className="w-4 h-4" />
                  Phản hồi
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${opened ? "rotate-180" : ""}`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* KHỐI TRẢ LỜI */}
          <div className={`mt-3 overflow-hidden transition-all ${opened ? "max-h-[2000px]" : "max-h-0"}`}>
            <div className="pl-12 space-y-3">
              {answers.map((a) => {
                const replier = a.user?.full_name || a.user?.username || "Nhân viên";
                const isAdmin = roles.includes("admin") || roles.includes("staff") || /quản trị|admin|staff/i.test(replier);
                return (
                  <div key={a.answer_id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Avatar name={replier} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{replier}</span>
                          {isAdmin && <AdminBadge />}
                          <span className="text-xs text-gray-500">• {timeAgo(a.created_at)}</span>
                        </div>
                        <div className="mt-1 text-gray-800 whitespace-pre-wrap">{a.answer_text}</div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Form trả lời (chỉ hiển thị nếu có quyền) */}
              {canAnswer && (
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <textarea
                    value={answerDrafts[q.question_id] || ""}
                    onChange={(e) =>
                      setAnswerDrafts((s) => ({ ...s, [q.question_id]: e.target.value }))
                    }
                    rows={2}
                    placeholder="Nhập câu trả lời…"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <div className="mt-2 text-right">
                    <button
                      onClick={() => postAnswer(q.question_id)}
                      disabled={!(answerDrafts[q.question_id] || "").trim()}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <Reply className="w-4 h-4" />
                      Gửi trả lời
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    })}
  </div>
</div>


       {/* Phần hiển thị gợi ý */}
       <ProductRecommendations variationId={currentVariationId}/>
     
      </div>
    </div>
  );
}
