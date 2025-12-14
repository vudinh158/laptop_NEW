"use client";
import { useState, useEffect, useRef } from "react";
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
import { Reply, MessageSquare, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";


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
  const scrollRef = useRef(null);

  const product = productData?.product || 0; // Trích xuất object product

  const galleryImages = product.images || [];
  let allImages = [...galleryImages];

  if (product.thumbnail_url) {
    // Kiểm tra xem thumbnail có bị trùng với ảnh nào trong gallery không để tránh hiển thị 2 lần
    const isDuplicate = galleryImages.some(img => img.image_url === product.thumbnail_url);

    if (!isDuplicate) {
      // Thêm object thumbnail vào đầu mảng (unshift)
      allImages.unshift({
        image_id: 'thumb-main', // ID giả định duy nhất cho key React
        image_url: product.thumbnail_url,
        is_primary: true
      });
    }
  }

  const activeImage = allImages[selectedImage]?.image_url || product.thumbnail_url || "/placeholder.svg";
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

    const handleScroll = (direction) => {
    if (scrollRef.current) {
      const { current } = scrollRef;
      const scrollAmount = 200; 
      if (direction === "left") {
        current.scrollBy({ left: -scrollAmount, behavior: "smooth" });
      } else {
        current.scrollBy({ left: scrollAmount, behavior: "smooth" });
      }
    }
  };

  // FIX: Sử dụng thuộc tính product_id, product_name
  const currentVariation = selectedVariation || product.variations?.[0];
  const discount = Number(product.discount_percentage || 0);
  const price = Number(currentVariation?.price) || 0;
  const finalPrice = price * (1 - discount / 100);
  const productName = product.product_name; // Lấy tên sản phẩm

  const currentVariationId = selectedVariation?.variation_id || product?.variations?.[0]?.variation_id;
  const currentUser =
    useSelector((s) => s.auth?.user) ||
    (() => {
      try {
        return JSON.parse(localStorage.getItem("user") || "null");
      } catch {
        return null;
      }
    })();

  const currentUserId = currentUser?.user_id ?? null;

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

  const requiredKeys = ATTRS.filter((k) => (uniqueOptions[k] || []).length > 0);

  // Người dùng đã chọn đầy đủ các option cần thiết?
  const allSelected = requiredKeys.every((k) => !!sel[k]);

  // Sẵn sàng "Mua ngay" khi VỪA khớp 1 biến thể, VỪA chọn đủ option
  const isReady = Boolean(matched) && allSelected;
  const basePrice = Number(currentVariation?.price ?? product.base_price ?? 0);


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

  // // Giá hiển thị: yêu cầu chọn đủ => dùng matched; chưa chọn => dùng base_price
  // const shownPrice = matched
  //   ? Number(matched.price) *
  //     (1 - (Number(product.discount_percentage) || 0) / 100)
  //   : Number(product.base_price) *
  //     (1 - (Number(product.discount_percentage) || 0) / 100);

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

  const timeAgo = (d) => {
    const diff = Math.max(
      1,
      Math.floor((Date.now() - new Date(d).getTime()) / 1000)
    );
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
  const canShowFollowUp = (q) => {
    // Điều kiện:
    // - đã đăng nhập
    // - câu gốc đã được trả lời
    // - chưa có child
    // - chủ câu gốc là currentUser
    const noChild = (q.children?.length || 0) === 0;
    return (
      isAuthed && q.is_answered && noChild && q.user?.user_id === currentUserId
    );
  };
  const navigate = useNavigate();
  useEffect(() => {
    if (product?.variations?.length) {
      setSelectedImage(0);
      setSelectedVariation(product.variations[0]);
    }
  }, [product?.variations]);
  // const handleAddToCart = () => {
  //   if (!product) return;
  //   const variation = selectedVariation || product.variations?.[0];
  //   if (!variation) return; // phòng trường hợp sản phẩm không có biến thể


  //   dispatch(
  //     addItem({
  //       product_id: product.product_id,
  //       variation_id: variation.variation_id,
  //       quantity: Math.max(1, Number(quantity) || 1), // +1 (hoặc theo ô số lượng)
  //       product: { ...product, variation },
  //     })
  //   );
  // };

  const handleAddToCart = () => {
    const r = getValidationReason();
    if (r) {
      alert(reasonToMessage(r));
      return;
    }

    if (!product) return;
    // BẮT BUỘC: phải chọn đúng biến thể
    if (!isReady || !matched) {
      alert("Vui lòng chọn đầy đủ cấu hình trước khi thêm vào giỏ.");
      return; 
    }
    const variation = matched;

    const stock = Number(variation.stock_quantity) || 0;
    const qty = Math.max(1, Number(quantity) || 1);
    if (stock <= 0) {
      alert("Biến thể này đã hết hàng.");
      return;
    }
    if (qty > stock) {
      alert(`Chỉ còn ${stock} sản phẩm trong kho.`);
      setQuantity(stock);
      return;
    }
    if (!isAuthenticated) {
      navigate(`/login?redirect=/products/${id}`);
      return;
    }

    addToCart.mutate(
      { variation_id: variation.variation_id, quantity: qty },
      {
        onError: (err) => {
          // nếu token hết hạn hoặc thiếu → về login
          if (err?.response?.status === 401) {
            navigate(`/login?redirect=/products/${id}`);
          }
        },
      }
    );
  };

  const handleBuyNow = () => {
    const r = getValidationReason();
    if (r) {
      alert(reasonToMessage(r));
      return;
    }

    if (!isReady) return; // chưa chọn đủ cấu hình thì không cho mua

    const qty = Math.max(1, Number(quantity) || 1);

    // Không đụng giỏ. Điều hướng Checkout kèm "checkout intent"
    navigate("/checkout", {
      state: {
        mode: "buy_now",
        items: [
          {
            variation_id: matched.variation_id,
            quantity: qty,
            product: {
              // chỉ để HIỂN THỊ
              product_name: product.product_name,
              thumbnail_url: product.thumbnail_url,
              discount_percentage: product.discount_percentage,
              variation: { price: Number(matched.price) },
            },
          },
        ],
      },
    });
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



  // === VALIDATION HELPERS ===
  const productInactive = product?.is_active === false;

  // matched đã có từ code gốc
  const selectedVar = matched || null;
  const stockQty = Number(selectedVar?.stock_quantity ?? 0);
  const varAvailable = selectedVar
    ? selectedVar?.is_available !== false
    : false;
  const qty = Math.max(1, Number(quantity) || 1);

  // Lý do không thể tiếp tục (string) hoặc null nếu OK
  const getValidationReason = () => {
    if (productInactive) return "inactive"; // SP ngừng KD
    if (!isReady) return "choose-attrs"; // chưa chọn đủ
    if (!varAvailable) return "soldout"; // biến thể hết hàng
    if (qty > stockQty) return "exceed-stock"; // vượt tồn
    return null;
  };

  const validationReason = getValidationReason();
  const actionDisabled = !!validationReason;

  // UI message gọn theo reason
  const reasonToMessage = (r) => {
    switch (r) {
      case "inactive":
        return "Sản phẩm không còn kinh doanh.";
      case "choose-attrs":
        return "Chọn cấu hình để tiếp tục.";
      case "soldout":
        return "Sản phẩm đã hết hàng.";
      case "exceed-stock":
        return `Chỉ còn ${stockQty} máy.`;
      default:
        return "";
    }
  };
  const disabledByProduct = productInactive;
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
            {/* CỘT TRÁI: HÌNH ẢNH */}
            <div>
              {/* 1. Ảnh chính lớn */}
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4 border border-gray-200 relative">
                <img
                  src={activeImage} // Sử dụng activeImage đã tính toán ở trên
                  alt={productName}
                  className="w-full h-full object-contain"
                  onError={(e) => { e.currentTarget.src = "/placeholder.svg"; e.currentTarget.onerror = null; }}
                />
                {discount > 0 && (
                  <span className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded text-sm font-bold">
                    -{discount}%
                  </span>
                )}
              </div>

              {/* 2. Danh sách ảnh nhỏ (Thumbnails) */}
              {allImages.length > 0 && (
                <div className="relative group mt-4">
                  {/* Nút Mũi tên Trái (Chỉ hiện khi di chuột vào vùng ảnh) */}
                  {allImages.length > 5 && (
                    <button
                      onClick={() => handleScroll("left")}
                      className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 p-1.5 rounded-full shadow-md hover:bg-white text-gray-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      aria-label="Scroll left"
                    >
                      <ChevronLeft size={20} />
                    </button>
                  )}

                  {/* Container chứa ảnh - Dùng Flexbox để xếp ngang */}
                  <div
                    ref={scrollRef}
                    className="flex gap-3 overflow-x-auto scrollbar-hide py-1 snap-x scroll-smooth"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} // Ẩn thanh cuộn mặc định
                  >
                    {allImages.map((image, index) => (
                      <button
                        key={image.image_id || index}
                        onClick={() => setSelectedImage(index)}
                        // flex-shrink-0 để ảnh không bị co lại, w-20 h-20 là kích thước cố định
                        className={`flex-shrink-0 w-20 h-20 bg-gray-50 rounded-lg overflow-hidden border-2 transition-all snap-start ${
                          selectedImage === index
                            ? "border-blue-600 opacity-100 ring-2 ring-blue-100"
                            : "border-transparent opacity-60 hover:opacity-100 hover:border-gray-300"
                        }`}
                      >
                        <img
                          src={image.image_url}
                          alt={`Thumbnail ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      </button>
                    ))}
                  </div>

                  {/* Nút Mũi tên Phải */}
                  {allImages.length > 4 && (
                    <button
                      onClick={() => handleScroll("right")}
                      className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 p-1.5 rounded-full shadow-md hover:bg-white text-gray-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      aria-label="Scroll right"
                    >
                      <ChevronRight size={20} />
                    </button>
                  )}
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
                      <span className="text-xl text-gray-400 line-through">
                        {formatPrice(basePrice)}
                      </span>
                      <span className="px-2 py-1 bg-orange-500 text-white rounded-md text-sm font-semibold">
                        -{discount}%
                      </span>
                    </>
                  )}
                </div>
              </div>
              {productInactive && (
                <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-rose-700 text-sm">
                  Sản phẩm không còn kinh doanh.
                </div>
              )}
              {/* ---- THAY block variations cũ bằng UI lựa chọn như ảnh demo ---- */}
              {product.variations?.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-baseline gap-3 mb-3">
                    <span className="text-4xl font-bold text-blue-600">
                      {formatPrice(finalPrice)}
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
                                    !disabled &&
                                    !disabledByProduct &&
                                    toggleSelect(k, val)
                                  }
                                  className={[
                                    "px-3 py-2 rounded-lg border text-sm",
                                    active
                                      ? "border-red-500 text-red-600 bg-red-50"
                                      : "border-gray-300 hover:bg-gray-50",
                                    (disabled || disabledByProduct) &&
                                      "opacity-40 cursor-not-allowed hover:bg-transparent",
                                  ].join(" ")}
                                  aria-pressed={active}
                                  disabled={disabled || disabledByProduct}
                                  title={
                                    disabledByProduct
                                      ? "Sản phẩm không còn kinh doanh"
                                      : disabled
                                      ? "Kết hợp này không có sẵn"
                                      : ""
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
              {/* Banner cảnh báo chung theo validation */}
              {validationReason && (
                <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800 text-sm">
                  {reasonToMessage(validationReason)}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <button
                  onClick={() => {
                    if (actionDisabled) {
                      alert(reasonToMessage(validationReason));
                      return;
                    }
                    // ====== hành vi cũ thêm giỏ ======
                    handleAddToCart();
                  }}
                  disabled={actionDisabled}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={
                    actionDisabled ? reasonToMessage(validationReason) : ""
                  }
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span className="font-semibold">Thêm vào giỏ</span>
                </button>
                <button
                  onClick={() => {
                    if (actionDisabled) {
                      alert(reasonToMessage(validationReason));
                      return;
                    }
                    // ====== hành vi cũ mua ngay ======
                    handleBuyNow();
                  }}
                  disabled={actionDisabled}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-4 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={
                    actionDisabled ? reasonToMessage(validationReason) : ""
                  }
                >
                  <span className="font-semibold">Mua ngay</span>
                </button>
                {isReady && (
                  <div className="mt-2 text-sm">
                    {varAvailable ? (
                      <span className="text-gray-600">Còn {stockQty} máy</span>
                    ) : (
                      <span className="text-rose-600 font-medium">
                        Đã hết hàng
                      </span>
                    )}
                  </div>
                )}
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

                  {/* KHỐI TRẢ LỜI */}
                  <div
                    className={`mt-3 overflow-hidden transition-all ${
                      opened ? "max-h-[2000px]" : "max-h-0"
                    }`}
                  >
                    <div className="pl-12 space-y-3">
                      {answers.map((a) => {
                        const replier =
                          a.user?.full_name || a.user?.username || "Nhân viên";
                        const isAdmin =
                          roles.includes("admin") ||
                          roles.includes("staff") ||
                          /quản trị|admin|staff/i.test(replier);
                        return (
                          <div
                            key={a.answer_id}
                            className="bg-gray-50 border border-gray-200 rounded-lg p-3"
                          >
                            <div className="flex items-start gap-2">
                              <Avatar name={replier} />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-gray-900">
                                    {replier}
                                  </span>
                                  {isAdmin && <AdminBadge />}
                                  <span className="text-xs text-gray-500">
                                    • {timeAgo(a.created_at)}
                                  </span>
                                </div>
                                <div className="mt-1 text-gray-800 whitespace-pre-wrap">
                                  {a.answer_text}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {(q.children || []).map((c) => (
                        <div
                          key={c.question_id}
                          className="bg-white border border-gray-200 rounded-lg p-3"
                        >
                          <div className="flex items-start gap-2">
                            <Avatar
                              name={
                                c.user?.full_name || c.user?.username || "Bạn"
                              }
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900">
                                  {c.user?.full_name ||
                                    c.user?.username ||
                                    "Bạn"}
                                </span>
                                <span className="text-xs text-gray-500">
                                  • {timeAgo(c.created_at)}
                                </span>
                              </div>
                              <div className="mt-1 text-gray-800 whitespace-pre-wrap">
                                {c.question_text}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {canShowFollowUp(q) && (
                        <div className="bg-white border border-gray-200 rounded-lg p-3">
                          <textarea
                            value={answerDrafts[`fu_${q.question_id}`] || ""}
                            onChange={(e) =>
                              setAnswerDrafts((s) => ({
                                ...s,
                                [`fu_${q.question_id}`]: e.target.value,
                              }))
                            }
                            rows={2}
                            placeholder="Phản hồi thêm cho câu hỏi của bạn…"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <div className="mt-2 text-right">
                            <button
                              onClick={async () => {
                                const text = (
                                  answerDrafts[`fu_${q.question_id}`] || ""
                                ).trim();
                                if (!text) return;
                                try {
                                  const resp = await fetch(
                                    `/api/products/${id}/questions`,
                                    {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                        Authorization: `Bearer ${token}`,
                                      },
                                      body: JSON.stringify({
                                        question_text: text,
                                        parent_question_id: q.question_id, // ✅ follow-up 1 tầng
                                      }),
                                    }
                                  );
                                  if (!resp.ok) {
                                    const e = await resp
                                      .json()
                                      .catch(() => ({}));
                                    throw new Error(
                                      e?.message || "Follow-up failed"
                                    );
                                  }
                                  setAnswerDrafts((s) => ({
                                    ...s,
                                    [`fu_${q.question_id}`]: "",
                                  }));
                                  window.location.reload(); // có thể thay bằng refetch detail
                                } catch (e) {
                                  alert(e.message);
                                }
                              }}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
                            >
                              Gửi follow-up
                            </button>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            (Chỉ cho phép 1 follow-up; follow-up chỉ thực hiện
                            sau khi câu gốc đã được trả lời)
                          </div>
                        </div>
                      )}

                      {/* Form trả lời (chỉ hiển thị nếu có quyền) */}
                      {canAnswer && (
                        <div className="bg-white border border-gray-200 rounded-lg p-3">
                          <textarea
                            value={answerDrafts[q.question_id] || ""}
                            onChange={(e) =>
                              setAnswerDrafts((s) => ({
                                ...s,
                                [q.question_id]: e.target.value,
                              }))
                            }
                            rows={2}
                            placeholder="Nhập câu trả lời…"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          <div className="mt-2 text-right">
                            <button
                              onClick={() => postAnswer(q.question_id)}
                              disabled={
                                !(answerDrafts[q.question_id] || "").trim()
                              }
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
