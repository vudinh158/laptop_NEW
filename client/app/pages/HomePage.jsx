"use client";

import { useEffect, useMemo, useRef, useState } from "react";
// THÊM: useSearchParams để đọc URL query string
import { useSearchParams } from "react-router-dom"; 
import {
  useProducts,
  useProductsV2,
  useProductFacets,
  customerUseBrandsFull,
  customerUseCategoriesFull,
} from "../hooks/useProducts"
import ProductCard from "../components/ProductCard";
import ProductFilter from "../components/ProductFilter";
import LoadingSpinner from "../components/LoadingSpinner";
import { ChevronDown, ChevronLeft, ChevronRight, Filter, Send, Store, User, X } from "lucide-react";

export default function HomePage() {

  // BƯỚC 1: Đọc tham số search từ URL
  const [searchParams] = useSearchParams();
  const urlSearchQuery = searchParams.get("search") || "";

  // BƯỚC 2: Khởi tạo/Cập nhật filters dựa trên URL và state
  const [localFilters, setLocalFilters] = useState({
    brand_id: [],
    category_id: [],
    minPrice: "",
    maxPrice: "",
    page: 1,
    limit: 30,
  });

  const [specFilters, setSpecFilters] = useState({
    processor: [],
    ram: [],
    storage: [],
    graphics_card: [],
    screen_size: [],
    minWeight: "",
    maxWeight: "",
  });

  const [sortBy, setSortBy] = useState("");
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const [qaText, setQaText] = useState("");
  const [qaItems, setQaItems] = useState([]);
  const [qaOffset, setQaOffset] = useState(0);
  const [qaHasMore, setQaHasMore] = useState(true);
  const [qaLoading, setQaLoading] = useState(false);
  const [qaPosting, setQaPosting] = useState(false);
  const [openQaReplies, setOpenQaReplies] = useState({});

  const token = localStorage.getItem("token");
  const isAuthed = !!token;

  const timeAgo = (input) => {
    const t = new Date(input).getTime();
    if (!t) return "";
    const diff = Date.now() - t;
    const sec = Math.floor(diff / 1000);
    const min = Math.floor(sec / 60);
    const hr = Math.floor(min / 60);
    const day = Math.floor(hr / 24);
    if (sec < 60) return "vừa xong";
    if (min < 60) return `${min} phút trước`;
    if (hr < 24) return `${hr} giờ trước`;
    if (day < 7) return `${day} ngày trước`;
    const week = Math.floor(day / 7);
    if (week < 5) return `${week} tuần trước`;
    return new Date(input).toLocaleDateString();
  };

  const avatarColor = (name) => {
    const colors = [
      "bg-purple-600",
      "bg-blue-600",
      "bg-emerald-600",
      "bg-pink-600",
      "bg-orange-600",
    ];
    const s = String(name || "?");
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return colors[h % colors.length];
  };

  const fetchGlobalQuestions = async ({ offset, limit, append }) => {
    setQaLoading(true);
    try {
      const resp = await fetch(`/api/products/questions?offset=${offset}&limit=${limit}`);
      if (!resp.ok) throw new Error("Fetch questions failed");
      const payload = await resp.json().catch((err) => {
        console.error("JSON parse error:", err);
        return {};
      });
      const rows = Array.isArray(payload?.questions) ? payload.questions : [];
      setQaItems((prev) => (append ? [...prev, ...rows] : rows));
      const total = Number(payload?.total ?? 0);
      const nextOffset = offset + rows.length;
      setQaOffset(nextOffset);
      setQaHasMore(nextOffset < total);
    } catch (e) {
      console.error("fetchGlobalQuestions error:", e);
      setQaHasMore(false);
    } finally {
      setQaLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalQuestions({ offset: 0, limit: 3, append: false });
    setQaOffset(0);
  }, []);

  const loadMoreQuestions = async () => {
    if (qaLoading || !qaHasMore) return;
    await fetchGlobalQuestions({ offset: qaOffset, limit: 2, append: true });
  };

  const postGlobalQuestion = async () => {
    const text = (qaText || "").trim();
    if (!text) return;
    if (!isAuthed) return;
    setQaPosting(true);
    try {
      const resp = await fetch(`/api/products/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question_text: text }),
      });
      if (!resp.ok) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e?.message || "Gửi câu hỏi thất bại");
      }
      setQaText("");
      setOpenQaReplies({});
      await fetchGlobalQuestions({ offset: 0, limit: 3, append: false });
      setQaOffset(0);
    } catch (e) {
      alert(e.message);
    } finally {
      setQaPosting(false);
    }
  };

  // Gộp filters: localFilters luôn có ưu tiên cao hơn, nhưng urlSearchQuery
  // được dùng để khởi tạo và đồng bộ với Header search.
  const filters = useMemo(() => ({
    ...localFilters,
    search: urlSearchQuery,
  }), [localFilters, urlSearchQuery]);

  const v2Filters = useMemo(
    () => ({
      ...filters,
      sortBy,
      processor: specFilters.processor,
      ram: specFilters.ram,
      storage: specFilters.storage,
      graphics_card: specFilters.graphics_card,
      screen_size: specFilters.screen_size,
      minWeight: specFilters.minWeight,
      maxWeight: specFilters.maxWeight,
      // Thêm version để force refresh cache sau khi sửa backend hiển thị inactive products
      _version: 'inactive_enabled',
    }),
    [filters, sortBy, specFilters]
  );

  const { data: brandsFullData } = customerUseBrandsFull();
  const { data: categoriesFullData } = customerUseCategoriesFull();

  const featuredFilters = useMemo(
    () => ({
      page: 1,
      limit: 12,
      sortBy: "best_selling",
      // Thêm version để force refresh cache cho featured products
      _version: 'inactive_enabled'
    }),
    []
  );

  // Gọi API với filters đã được đồng bộ
  const { data, isLoading, error } = useProductsV2(v2Filters);
  const { data: facetsData } = useProductFacets();
  const { data: featuredData, isLoading: isFeaturedLoading } = useProductsV2(featuredFilters);

  const toggleInList = (list, value) => {
    if (!value) return list;
    return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
  };

  const toggleNumberInList = (list, value) => {
    const v = Number(value);
    if (!v) return list;
    return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
  };

  const handleFilterChange = (newFilters) => {
    // SỬA: Đảm bảo chỉ cập nhật các giá trị đã thay đổi và reset page
    setLocalFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handleClearFilters = () => {
    // Để giữ lại URL search query, chỉ reset các localFilters
    setLocalFilters({
      brand_id: [],
      category_id: [],
      minPrice: "",
      maxPrice: "",
      page: 1,
      limit: 30,
    });
    setSpecFilters({
      processor: [],
      ram: [],
      storage: [],
      graphics_card: [],
      screen_size: [],
      minWeight: "",
      maxWeight: "",
    });
    setSortBy("");
    // LƯU Ý: Nếu muốn xóa luôn thanh search URL, cần dùng setSearchParams
    // navigate("/", { replace: true });
  };

  const handlePageChange = (newPage) => {
    setLocalFilters({ ...localFilters, page: newPage });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const products = data?.products ?? [];
  const total = data?.total ?? products.length;
  const totalPages =
    data?.totalPages ?? Math.max(1, Math.ceil(total / (filters.limit || 30)));

  const facets = facetsData?.facets ?? {};
  const processors = facets.processor ?? [];
  const rams = facets.ram ?? [];
  const storages = facets.storage ?? [];
  const gpus = facets.graphics_card ?? [];
  const screens = facets.screen_size ?? [];

  const brandsFull = Array.isArray(brandsFullData) ? brandsFullData : [];
  const categoriesFull = Array.isArray(categoriesFullData) ? categoriesFullData : [];
  const brandsSimple = useMemo(
    () =>
      brandsFull.map((b) => ({
        id: Number(b?.brand_id ?? b?.id),
        name: b?.brand_name ?? b?.name ?? "",
      })),
    [brandsFull]
  );
  const categoriesSimple = useMemo(
    () =>
      categoriesFull.map((c) => ({
        id: Number(c?.category_id ?? c?.id),
        name: c?.category_name ?? c?.name ?? "",
      })),
    [categoriesFull]
  );

  const brandNameById = useMemo(() => {
    const m = new Map();
    brandsFull.forEach((b) => {
      const id = Number(b?.brand_id ?? b?.id);
      if (!id) return;
      m.set(id, b?.brand_name ?? b?.name ?? "");
    });
    return m;
  }, [brandsFull]);

  const categoryNameById = useMemo(() => {
    const m = new Map();
    categoriesFull.forEach((c) => {
      const id = Number(c?.category_id ?? c?.id);
      if (!id) return;
      m.set(id, c?.category_name ?? c?.name ?? "");
    });
    return m;
  }, [categoriesFull]);

  const categoriesNeedList = useMemo(() => {
    const desired = [
      "Văn phòng",
      "Gaming",
      "Mỏng nhẹ",
      "Đồ họa - kỹ thuật",
      "Sinh viên",
      "Cảm ứng",
      "Laptop AI",
    ];

    const normalize = (s) => String(s || "").trim().toLowerCase();
    const desiredNorm = desired.map(normalize);

    const list = Array.isArray(categoriesFull) ? categoriesFull : [];
    const matched = [];
    const used = new Set();

    list.forEach((c) => {
      const name = c?.category_name ?? c?.name ?? "";
      const n = normalize(name);
      const idx = desiredNorm.findIndex((d) => d === n);
      if (idx >= 0) {
        matched[idx] = c;
        used.add(c);
      }
    });

    const compactMatched = matched.filter(Boolean);
    if (compactMatched.length) return compactMatched;
    return list.slice(0, 10);
  }, [categoriesFull]);

  const sortChoices = useMemo(
    () => [
      { label: "Phổ biến", value: "" },
      { label: "Khuyến mãi HOT", value: "best_selling" },
      { label: "Giá Thấp - Cao", value: "price_asc" },
      { label: "Giá Cao - Thấp", value: "price_desc" },
    ],
    []
  );

  const appliedChips = useMemo(() => {
    const chips = [];

    (localFilters.brand_id || []).forEach((id) => {
      const name = brandNameById.get(Number(id)) || `Hãng #${id}`;
      chips.push({
        key: `brand_${id}`,
        label: name,
        onRemove: () =>
          handleFilterChange({
            brand_id: (localFilters.brand_id || []).filter((x) => Number(x) !== Number(id)),
          }),
      });
    });

    (localFilters.category_id || []).forEach((id) => {
      const name = categoryNameById.get(Number(id)) || `Danh mục #${id}`;
      chips.push({
        key: `category_${id}`,
        label: name,
        onRemove: () =>
          handleFilterChange({
            category_id: (localFilters.category_id || []).filter((x) => Number(x) !== Number(id)),
          }),
      });
    });

    if (localFilters.minPrice || localFilters.maxPrice) {
      chips.push({
        key: "price",
        label: `Giá: ${localFilters.minPrice || "0"} - ${localFilters.maxPrice || "∞"}`,
        onRemove: () => handleFilterChange({ minPrice: "", maxPrice: "" }),
      });
    }

    (specFilters.processor || []).forEach((v) =>
      chips.push({
        key: `cpu_${v}`,
        label: `CPU: ${v}`,
        onRemove: () =>
          setSpecFilters((prev) => ({
            ...prev,
            processor: prev.processor.filter((x) => x !== v),
          })),
      })
    );
    (specFilters.ram || []).forEach((v) =>
      chips.push({
        key: `ram_${v}`,
        label: `RAM: ${v}`,
        onRemove: () =>
          setSpecFilters((prev) => ({
            ...prev,
            ram: prev.ram.filter((x) => x !== v),
          })),
      })
    );
    (specFilters.storage || []).forEach((v) =>
      chips.push({
        key: `ssd_${v}`,
        label: `SSD: ${v}`,
        onRemove: () =>
          setSpecFilters((prev) => ({
            ...prev,
            storage: prev.storage.filter((x) => x !== v),
          })),
      })
    );
    (specFilters.graphics_card || []).forEach((v) =>
      chips.push({
        key: `gpu_${v}`,
        label: `GPU: ${v}`,
        onRemove: () =>
          setSpecFilters((prev) => ({
            ...prev,
            graphics_card: prev.graphics_card.filter((x) => x !== v),
          })),
      })
    );
    (specFilters.screen_size || []).forEach((v) =>
      chips.push({
        key: `screen_${v}`,
        label: `Màn hình: ${v}`,
        onRemove: () =>
          setSpecFilters((prev) => ({
            ...prev,
            screen_size: prev.screen_size.filter((x) => x !== v),
          })),
      })
    );

    if (specFilters.minWeight || specFilters.maxWeight) {
      chips.push({
        key: "weight",
        label: `Weight: ${specFilters.minWeight || "0"} - ${specFilters.maxWeight || "∞"} kg`,
        onRemove: () => setSpecFilters((prev) => ({ ...prev, minWeight: "", maxWeight: "" })),
      });
    }

    return chips;
  }, [
    brandNameById,
    categoryNameById,
    handleFilterChange,
    localFilters.brand_id,
    localFilters.category_id,
    localFilters.maxPrice,
    localFilters.minPrice,
    specFilters.graphics_card,
    specFilters.maxWeight,
    specFilters.minWeight,
    specFilters.processor,
    specFilters.ram,
    specFilters.screen_size,
    specFilters.storage,
  ]);

  const featuredProducts = featuredData?.products ?? [];

  const featuredRef = useRef(null);
  const featuredItemRef = useRef(null);
  const featuredIndexRef = useRef(0);
  const featuredTimerRef = useRef(null);

  const scrollFeaturedToIndex = (index) => {
    const el = featuredRef.current;
    if (!el) return;
    const itemW = featuredItemRef.current?.offsetWidth || 0;
    if (!itemW) return;
    const gap = 16;
    el.scrollTo({ left: index * (itemW + gap), behavior: "smooth" });
  };

  const featuredNext = () => {
    const count = featuredProducts.length;
    if (!count) return;
    featuredIndexRef.current = (featuredIndexRef.current + 1) % count;
    scrollFeaturedToIndex(featuredIndexRef.current);
  };

  const featuredPrev = () => {
    const count = featuredProducts.length;
    if (!count) return;
    featuredIndexRef.current = (featuredIndexRef.current - 1 + count) % count;
    scrollFeaturedToIndex(featuredIndexRef.current);
  };

  const stopFeaturedTimer = () => {
    if (featuredTimerRef.current) {
      clearInterval(featuredTimerRef.current);
      featuredTimerRef.current = null;
    }
  };

  const startFeaturedTimer = () => {
    stopFeaturedTimer();
    if (!featuredProducts.length) return;
    featuredTimerRef.current = setInterval(() => {
      featuredNext();
    }, 1000);
  };

  useEffect(() => {
    featuredIndexRef.current = 0;
    requestAnimationFrame(() => scrollFeaturedToIndex(0));
    startFeaturedTimer();
    return () => {
      stopFeaturedTimer();
    };
  }, [featuredProducts.length]);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div
        className="relative text-white py-16 overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #0B2B6B 0%, #071A3F 45%, #04112B 100%)",
        }}
      >
        {/* Dragon Pattern Overlay */}
        <div
          className="absolute inset-0 opacity-8"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='80'%20height='80'%20viewBox='0%200%2080%2080'%3E%3Cg%20fill='none'%20stroke='%23FFFFFF'%20stroke-width='1'%20stroke-opacity='0.15'%3E%3Cpath%20d='M20%2050c5-5%2010-15%2015-10s5%2010%2010%205%208-12%2012-8%206%2014%2010%2010'/%3E%3Cpath%20d='M35%2035c3-2%208-8%2010-4s2%206%206%204%207-9%209-5%204%2011%207%208'/%3E%3Ccircle%20cx='25'%20cy='25'%20r='2'/%3E%3Ccircle%20cx='55'%20cy='55'%20r='2'/%3E%3Cpath%20d='M45%2020l5%205-3%208%208%203-5%205-8-3-3-8z'/%3E%3Cpath%20d='M15%2060l4-4%206%202-2%206-6-2%204-4z'/%3E%3C/g%3E%3C/svg%3E\")",
            backgroundRepeat: "repeat",
            backgroundSize: "80px 80px",
          }}
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-balance text-white drop-shadow-lg">
            Laptop LÊ SƠN
          </h1>
          <p className="text-xl text-blue-100 text-pretty drop-shadow-md">
            Tìm chiếc laptop hoàn hảo cho công việc và giải trí của bạn
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <section
          className="relative rounded-3xl overflow-hidden border border-blue-900/40 shadow-lg"
          style={{
            background:
              "linear-gradient(135deg, #0B2B6B 0%, #071A3F 45%, #04112B 100%)",
          }}
        >
          <div
            className="absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='220'%20height='220'%20viewBox='0%200%20220%20220'%3E%3Cg%20fill='none'%20stroke='%23FFFFFF'%20stroke-opacity='0.7'%20stroke-width='2'%3E%3Cpath%20d='M18%2040h74v54h54V70h56'/%3E%3Ccircle%20cx='92'%20cy='40'%20r='4'/%3E%3Ccircle%20cx='146'%20cy='94'%20r='4'/%3E%3Ccircle%20cx='202'%20cy='70'%20r='4'/%3E%3Cpath%20d='M24%20178h66v-44h44v54h62'/%3E%3Ccircle%20cx='90'%20cy='178'%20r='4'/%3E%3Ccircle%20cx='134'%20cy='134'%20r='4'/%3E%3Ccircle%20cx='196'%20cy='188'%20r='4'/%3E%3Cpath%20d='M170%2018v54h-44v44h54v74'/%3E%3Ccircle%20cx='170'%20cy='72'%20r='4'/%3E%3Ccircle%20cx='126'%20cy='116'%20r='4'/%3E%3Ccircle%20cx='180'%20cy='190'%20r='4'/%3E%3C/g%3E%3C/svg%3E\")",
              backgroundRepeat: "repeat",
              backgroundSize: "220px 220px",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/0 to-black/25" />

          <div className="relative p-5 sm:p-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-white/10 border border-white/15">
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-wide text-yellow-200">
                  🔥 SẢN PHẨM NỔI BẬT
                </h2>
              </div>
            </div>

            <div className="relative mt-5">
              <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#04112B] to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#04112B] to-transparent" />

              <button
                type="button"
                onClick={featuredPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 flex items-center justify-center"
                aria-label="Previous featured products"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              <button
                type="button"
                onClick={featuredNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 flex items-center justify-center"
                aria-label="Next featured products"
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>

              <div
                ref={featuredRef}
                onMouseEnter={stopFeaturedTimer}
                onMouseLeave={startFeaturedTimer}
                className="flex gap-4 overflow-x-auto scroll-smooth px-12 pb-2"
              >
                {isFeaturedLoading ? (
                  Array.from({ length: 6 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="shrink-0 min-w-[240px] max-w-[240px] sm:min-w-[260px] sm:max-w-[260px] rounded-xl bg-white/10 border border-white/10 animate-pulse"
                      style={{ height: 340 }}
                    />
                  ))
                ) : featuredProducts.length ? (
                  featuredProducts.map((p, i) => (
                    <div
                      key={p.product_id ?? p.id ?? p.slug ?? i}
                      ref={i === 0 ? featuredItemRef : null}
                      className="shrink-0 min-w-[240px] max-w-[240px] sm:min-w-[260px] sm:max-w-[260px]"
                    >
                      <ProductCard product={p} />
                    </div>
                  ))
                ) : (
                  <div className="text-white/80 py-10">Chưa có sản phẩm nổi bật.</div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 gap-6">
          <aside className="lg:col-span-1">
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h2 className="text-lg font-bold text-gray-900">Máy tính laptop</h2>
                <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
                  {brandsFull.map((b) => {
                    const id = Number(b?.brand_id ?? b?.id);
                    if (!id) return null;
                    const name = b?.brand_name ?? b?.name ?? "";
                    const logo = b?.logo_url;
                    const selected = (localFilters.brand_id || []).includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() =>
                          handleFilterChange({
                            brand_id: toggleNumberInList(localFilters.brand_id || [], id),
                          })
                        }
                        className={`flex items-center justify-center min-w-[96px] h-14 px-3 rounded-lg border transition-colors ${
                          selected
                            ? "border-blue-600 bg-blue-50"
                            : "border-gray-200 bg-gray-50 hover:bg-gray-100"
                        }`}
                        title={name}
                      >
                        {logo ? (
                          <img
                            src={logo}
                            alt={name}
                            className="h-8 w-auto object-contain"
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-sm font-medium text-gray-800 truncate">{name}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h2 className="text-lg font-bold text-gray-900">Chọn theo nhu cầu</h2>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                  {categoriesNeedList.map((c) => {
                    const id = Number(c?.category_id ?? c?.id);
                    if (!id) return null;
                    const name = c?.category_name ?? c?.name ?? "";
                    const icon = c?.icon_url;
                    const selected = (localFilters.category_id || []).includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() =>
                          handleFilterChange({
                            category_id: toggleNumberInList(localFilters.category_id || [], id),
                          })
                        }
                        className={`rounded-2xl border p-3 shadow-sm transition-colors text-left ${
                          selected
                            ? "border-blue-600 bg-blue-50"
                            : "border-gray-200 bg-white hover:bg-gray-50"
                        }`}
                        title={name}
                      >
                        <div className="w-full aspect-square rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden">
                          {icon ? (
                            <img
                              src={icon}
                              alt={name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="text-xs text-gray-500 px-2 text-center">{name}</div>
                          )}
                        </div>
                        <div className="mt-2 text-sm font-semibold text-gray-900 line-clamp-2">
                          {name}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-bold text-gray-900">Chọn theo tiêu chí</h2>
                  <button
                    type="button"
                    onClick={() => setShowFilterPanel((v) => !v)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-red-200 bg-red-50 text-red-700 font-semibold hover:bg-red-100"
                  >
                    <Filter className="w-4 h-4 text-red-600" />
                    Bộ lọc
                  </button>
                </div>

                {appliedChips.length > 0 && (
                  <div className="mt-3">
                    <div className="text-sm font-semibold text-gray-900">Đang lọc theo</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {appliedChips.map((chip) => (
                        <button
                          key={chip.key}
                          type="button"
                          onClick={() => {
                            chip.onRemove?.();
                            setLocalFilters((prev) => ({ ...prev, page: 1 }));
                          }}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 text-gray-800 text-sm hover:bg-gray-100"
                        >
                          <span className="max-w-[220px] truncate">{chip.label}</span>
                          <X className="w-4 h-4 text-gray-500" />
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={handleClearFilters}
                        className="text-sm font-semibold text-blue-600 hover:underline"
                      >
                        Bỏ chọn tất cả
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <details className="relative">
                    <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white hover:bg-gray-50">
                      Khoảng giá
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    </summary>
                    <div className="absolute z-30 mt-2 w-72 rounded-xl border border-gray-200 bg-white shadow-lg p-3">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={localFilters.minPrice}
                          onChange={(e) =>
                            handleFilterChange({
                              minPrice: e.target.value,
                            })
                          }
                          placeholder="Min"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          value={localFilters.maxPrice}
                          onChange={(e) =>
                            handleFilterChange({
                              maxPrice: e.target.value,
                            })
                          }
                          placeholder="Max"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => handleFilterChange({ minPrice: "", maxPrice: "" })}
                          className="text-sm font-semibold text-gray-600 hover:underline"
                        >
                          Bỏ
                        </button>
                        <div className="text-xs text-gray-500">Nhập giá rồi đóng menu</div>
                      </div>
                    </div>
                  </details>

                  <details className="relative">
                    <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white hover:bg-gray-50">
                      CPU
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    </summary>
                    <div className="absolute z-30 mt-2 w-72 rounded-xl border border-gray-200 bg-white shadow-lg p-3">
                      <div className="max-h-56 overflow-auto space-y-2">
                        {processors.map((v) => (
                          <label key={v} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={specFilters.processor.includes(v)}
                              onChange={() => {
                                setSpecFilters((prev) => ({
                                  ...prev,
                                  processor: toggleInList(prev.processor, v),
                                }));
                                setLocalFilters((prev) => ({ ...prev, page: 1 }));
                              }}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{v}</span>
                          </label>
                        ))}
                        {!processors.length && <div className="text-sm text-gray-500">Chưa có dữ liệu.</div>}
                      </div>
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSpecFilters((prev) => ({ ...prev, processor: [] }));
                            setLocalFilters((prev) => ({ ...prev, page: 1 }));
                          }}
                          className="text-sm font-semibold text-gray-600 hover:underline"
                        >
                          Bỏ
                        </button>
                      </div>
                    </div>
                  </details>

                  <details className="relative">
                    <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white hover:bg-gray-50">
                      RAM
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    </summary>
                    <div className="absolute z-30 mt-2 w-72 rounded-xl border border-gray-200 bg-white shadow-lg p-3">
                      <div className="max-h-56 overflow-auto space-y-2">
                        {rams.map((v) => (
                          <label key={v} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={specFilters.ram.includes(v)}
                              onChange={() => {
                                setSpecFilters((prev) => ({
                                  ...prev,
                                  ram: toggleInList(prev.ram, v),
                                }));
                                setLocalFilters((prev) => ({ ...prev, page: 1 }));
                              }}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{v}</span>
                          </label>
                        ))}
                        {!rams.length && <div className="text-sm text-gray-500">Chưa có dữ liệu.</div>}
                      </div>
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSpecFilters((prev) => ({ ...prev, ram: [] }));
                            setLocalFilters((prev) => ({ ...prev, page: 1 }));
                          }}
                          className="text-sm font-semibold text-gray-600 hover:underline"
                        >
                          Bỏ
                        </button>
                      </div>
                    </div>
                  </details>

                  <details className="relative">
                    <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white hover:bg-gray-50">
                      SSD
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    </summary>
                    <div className="absolute z-30 mt-2 w-72 rounded-xl border border-gray-200 bg-white shadow-lg p-3">
                      <div className="max-h-56 overflow-auto space-y-2">
                        {storages.map((v) => (
                          <label key={v} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={specFilters.storage.includes(v)}
                              onChange={() => {
                                setSpecFilters((prev) => ({
                                  ...prev,
                                  storage: toggleInList(prev.storage, v),
                                }));
                                setLocalFilters((prev) => ({ ...prev, page: 1 }));
                              }}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{v}</span>
                          </label>
                        ))}
                        {!storages.length && <div className="text-sm text-gray-500">Chưa có dữ liệu.</div>}
                      </div>
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSpecFilters((prev) => ({ ...prev, storage: [] }));
                            setLocalFilters((prev) => ({ ...prev, page: 1 }));
                          }}
                          className="text-sm font-semibold text-gray-600 hover:underline"
                        >
                          Bỏ
                        </button>
                      </div>
                    </div>
                  </details>

                  <details className="relative">
                    <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white hover:bg-gray-50">
                      GPU
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    </summary>
                    <div className="absolute z-30 mt-2 w-72 rounded-xl border border-gray-200 bg-white shadow-lg p-3">
                      <div className="max-h-56 overflow-auto space-y-2">
                        {gpus.map((v) => (
                          <label key={v} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={specFilters.graphics_card.includes(v)}
                              onChange={() => {
                                setSpecFilters((prev) => ({
                                  ...prev,
                                  graphics_card: toggleInList(prev.graphics_card, v),
                                }));
                                setLocalFilters((prev) => ({ ...prev, page: 1 }));
                              }}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{v}</span>
                          </label>
                        ))}
                        {!gpus.length && <div className="text-sm text-gray-500">Chưa có dữ liệu.</div>}
                      </div>
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSpecFilters((prev) => ({ ...prev, graphics_card: [] }));
                            setLocalFilters((prev) => ({ ...prev, page: 1 }));
                          }}
                          className="text-sm font-semibold text-gray-600 hover:underline"
                        >
                          Bỏ
                        </button>
                      </div>
                    </div>
                  </details>

                  <details className="relative">
                    <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white hover:bg-gray-50">
                      Màn hình
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    </summary>
                    <div className="absolute z-30 mt-2 w-72 rounded-xl border border-gray-200 bg-white shadow-lg p-3">
                      <div className="max-h-56 overflow-auto space-y-2">
                        {screens.map((v) => (
                          <label key={v} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={specFilters.screen_size.includes(v)}
                              onChange={() => {
                                setSpecFilters((prev) => ({
                                  ...prev,
                                  screen_size: toggleInList(prev.screen_size, v),
                                }));
                                setLocalFilters((prev) => ({ ...prev, page: 1 }));
                              }}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{v}</span>
                          </label>
                        ))}
                        {!screens.length && <div className="text-sm text-gray-500">Chưa có dữ liệu.</div>}
                      </div>
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSpecFilters((prev) => ({ ...prev, screen_size: [] }));
                            setLocalFilters((prev) => ({ ...prev, page: 1 }));
                          }}
                          className="text-sm font-semibold text-gray-600 hover:underline"
                        >
                          Bỏ
                        </button>
                      </div>
                    </div>
                  </details>

                  <details className="relative">
                    <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white hover:bg-gray-50">
                      Trọng lượng
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    </summary>
                    <div className="absolute z-30 mt-2 w-72 rounded-xl border border-gray-200 bg-white shadow-lg p-3">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={specFilters.minWeight}
                          onChange={(e) => {
                            setSpecFilters((prev) => ({ ...prev, minWeight: e.target.value }));
                            setLocalFilters((prev) => ({ ...prev, page: 1 }));
                          }}
                          placeholder="Min (kg)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          value={specFilters.maxWeight}
                          onChange={(e) => {
                            setSpecFilters((prev) => ({ ...prev, maxWeight: e.target.value }));
                            setLocalFilters((prev) => ({ ...prev, page: 1 }));
                          }}
                          placeholder="Max (kg)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSpecFilters((prev) => ({ ...prev, minWeight: "", maxWeight: "" }));
                            setLocalFilters((prev) => ({ ...prev, page: 1 }));
                          }}
                          className="text-sm font-semibold text-gray-600 hover:underline"
                        >
                          Bỏ
                        </button>
                      </div>
                    </div>
                  </details>
                </div>

                <div className="mt-4">
                  <div className="text-sm font-semibold text-gray-900 mb-2">Sắp xếp</div>
                  <div className="flex flex-wrap gap-2">
                    {sortChoices.map((opt) => {
                      const selected = sortBy === opt.value;
                      return (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => {
                            setSortBy(opt.value);
                            setLocalFilters((prev) => ({ ...prev, page: 1 }));
                          }}
                          className={`px-4 py-2 rounded-full border text-sm font-semibold transition-colors ${
                            selected
                              ? "border-blue-200 bg-blue-100 text-blue-700"
                              : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                    {sortBy && (
                      <button
                        type="button"
                        onClick={() => {
                          setSortBy("");
                          setLocalFilters((prev) => ({ ...prev, page: 1 }));
                        }}
                        className="px-4 py-2 rounded-full border border-gray-200 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50"
                      >
                        Bỏ
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className={showFilterPanel ? "mt-6" : "hidden"}>
              <ProductFilter
                brands={brandsSimple}
                categories={categoriesSimple}
                filters={{
                  brands: localFilters.brand_id,
                  categories: localFilters.category_id,
                  price: { min: localFilters.minPrice, max: localFilters.maxPrice },
                  // Luôn hiển thị search query đang hoạt động
                  search: urlSearchQuery, 
                }}
                onFilterChange={(f) =>
                  handleFilterChange({
                    brand_id: f.brands,
                    category_id: f.categories,
                    minPrice: f.price?.min ?? "",
                    maxPrice: f.price?.max ?? "",
                    // KHÔNG THAY ĐỔI URL search query TỪ BỘ LỌC
                    // search: f.search ?? "", 
                  })
                }
                onClearFilters={handleClearFilters}
              />

              <div className="bg-white rounded-lg border border-gray-200 p-4 mt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Cấu hình</h3>

                <div className="space-y-4">
                  <div>
                    <div className="font-medium text-gray-900 mb-2">CPU</div>
                    <div className="space-y-2 max-h-40 overflow-auto">
                      {processors.map((v) => (
                        <label key={v} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={specFilters.processor.includes(v)}
                            onChange={() => {
                              setSpecFilters((prev) => ({
                                ...prev,
                                processor: toggleInList(prev.processor, v),
                              }));
                              setLocalFilters((prev) => ({ ...prev, page: 1 }));
                            }}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{v}</span>
                        </label>
                      ))}
                      {!processors.length && <div className="text-sm text-gray-500">Chưa có dữ liệu.</div>}
                    </div>
                  </div>

                  <div>
                    <div className="font-medium text-gray-900 mb-2">RAM</div>
                    <div className="space-y-2 max-h-40 overflow-auto">
                      {rams.map((v) => (
                        <label key={v} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={specFilters.ram.includes(v)}
                            onChange={() => {
                              setSpecFilters((prev) => ({
                                ...prev,
                                ram: toggleInList(prev.ram, v),
                              }));
                              setLocalFilters((prev) => ({ ...prev, page: 1 }));
                            }}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{v}</span>
                        </label>
                      ))}
                      {!rams.length && <div className="text-sm text-gray-500">Chưa có dữ liệu.</div>}
                    </div>
                  </div>

                  <div>
                    <div className="font-medium text-gray-900 mb-2">SSD</div>
                    <div className="space-y-2 max-h-40 overflow-auto">
                      {storages.map((v) => (
                        <label key={v} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={specFilters.storage.includes(v)}
                            onChange={() => {
                              setSpecFilters((prev) => ({
                                ...prev,
                                storage: toggleInList(prev.storage, v),
                              }));
                              setLocalFilters((prev) => ({ ...prev, page: 1 }));
                            }}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{v}</span>
                        </label>
                      ))}
                      {!storages.length && <div className="text-sm text-gray-500">Chưa có dữ liệu.</div>}
                    </div>
                  </div>

                  <div>
                    <div className="font-medium text-gray-900 mb-2">GPU</div>
                    <div className="space-y-2 max-h-40 overflow-auto">
                      {gpus.map((v) => (
                        <label key={v} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={specFilters.graphics_card.includes(v)}
                            onChange={() => {
                              setSpecFilters((prev) => ({
                                ...prev,
                                graphics_card: toggleInList(prev.graphics_card, v),
                              }));
                              setLocalFilters((prev) => ({ ...prev, page: 1 }));
                            }}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{v}</span>
                        </label>
                      ))}
                      {!gpus.length && <div className="text-sm text-gray-500">Chưa có dữ liệu.</div>}
                    </div>
                  </div>

                  <div>
                    <div className="font-medium text-gray-900 mb-2">Màn hình</div>
                    <div className="space-y-2 max-h-40 overflow-auto">
                      {screens.map((v) => (
                        <label key={v} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={specFilters.screen_size.includes(v)}
                            onChange={() => {
                              setSpecFilters((prev) => ({
                                ...prev,
                                screen_size: toggleInList(prev.screen_size, v),
                              }));
                              setLocalFilters((prev) => ({ ...prev, page: 1 }));
                            }}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{v}</span>
                        </label>
                      ))}
                      {!screens.length && <div className="text-sm text-gray-500">Chưa có dữ liệu.</div>}
                    </div>
                  </div>

                  <div>
                    <div className="font-medium text-gray-900 mb-2">Weight (kg)</div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={specFilters.minWeight}
                        onChange={(e) => {
                          setSpecFilters((prev) => ({ ...prev, minWeight: e.target.value }));
                          setLocalFilters((prev) => ({ ...prev, page: 1 }));
                        }}
                        placeholder="Min"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        value={specFilters.maxWeight}
                        onChange={(e) => {
                          setSpecFilters((prev) => ({ ...prev, maxWeight: e.target.value }));
                          setLocalFilters((prev) => ({ ...prev, page: 1 }));
                        }}
                        placeholder="Max"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <main className="lg:col-span-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Tất cả sản phẩm
                    {urlSearchQuery && <span className="text-blue-600 ml-2">({urlSearchQuery})</span>}
                  </h2>
                  <div className="flex items-center gap-3">
                    <p className="text-gray-600">{data?.products.length || 0} sản phẩm</p>
                  </div>
                </div>

                {data?.products?.length === 0 ? (
                  <div className="text-center py-20">
                    <p className="text-gray-600 text-lg">
                      Không tìm thấy sản phẩm nào phù hợp
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {products.map((p) => (
                        // ✅ key ổn định (fallback sang id/slug nếu cần)
                        <ProductCard
                          key={p.product_id ?? p.id ?? p.slug}
                          product={p}
                        />
                      ))}
                    </div>

                    {data?.totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-8">
                        <button
                          onClick={() => handlePageChange(filters.page - 1)}
                          disabled={filters.page === 1}
                          className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>

                        {[...Array(data.totalPages)].map((_, i) => (
                          <button
                            key={i + 1}
                            onClick={() => handlePageChange(i + 1)}
                            className={`px-4 py-2 rounded-lg ${
                              filters.page === i + 1
                                ? "bg-blue-600 text-white"
                                : "border border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            {i + 1}
                          </button>
                        ))}

                        <button
                          onClick={() => handlePageChange(filters.page + 1)}
                          disabled={filters.page === data.totalPages}
                          className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="rounded-2xl bg-white shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-5 sm:p-6">
            <div className="flex flex-col md:flex-row gap-4 md:items-start">
              <div className="shrink-0">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 border border-blue-200 flex items-center justify-center">
                  <div className="text-4xl">🤖</div>
                </div>
              </div>
              <div className="flex-1">
                <div className="text-xl font-bold text-gray-900">Hãy đặt câu hỏi cho chúng tôi</div>
                <div className="text-sm text-gray-600 mt-1">Phản hồi trong vòng 1 giờ</div>

                <div className="mt-3 flex flex-col sm:flex-row gap-3">
                  <textarea
                    value={qaText}
                    onChange={(e) => setQaText(e.target.value)}
                    rows={2}
                    placeholder="Nhập câu hỏi của bạn..."
                    className="flex-1 resize-none px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={postGlobalQuestion}
                    disabled={!isAuthed || !(qaText || "").trim() || qaPosting}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={!isAuthed ? "Đăng nhập để gửi câu hỏi" : "Gửi câu hỏi"}
                  >
                    Gửi câu hỏi
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                {!isAuthed && (
                  <div className="text-xs text-gray-500 mt-2">Bạn cần đăng nhập để gửi câu hỏi.</div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 bg-gray-50">
            <div className="p-5 sm:p-6">
              <div className="text-lg font-bold text-gray-900">Hỏi & đáp</div>
              <div className="mt-4 space-y-4">
                {!qaItems.length && !qaLoading && (
                  <div className="text-gray-600">Chưa có câu hỏi nào.</div>
                )}

                {qaItems.map((q) => {
                  const asker = q?.user?.full_name || q?.user?.username || "Khách hàng";
                  const firstChar = String(asker || "K").trim().charAt(0).toUpperCase();
                  const answers = Array.isArray(q?.answers) ? q.answers : [];
                  const opened = !!openQaReplies[q.question_id];
                  const productName = q?.Product?.product_name;
                  return (
                    <div key={q.question_id} className="rounded-xl border border-gray-200 bg-white p-4">
                      <div className="flex gap-3">
                        <div className={`relative w-10 h-10 rounded-full ${avatarColor(asker)} text-white font-bold flex items-center justify-center`}>
                          {firstChar}
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                            <User className="w-3 h-3 text-white" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center flex-wrap gap-x-2">
                            <span className="font-semibold text-gray-900">{asker}</span>
                            <span className="text-xs text-gray-500">• {timeAgo(q.created_at)}</span>
                          </div>
                          {!!q?.product_id && productName && (
                            <div className="text-sm text-gray-600 mt-0.5">{productName}</div>
                          )}
                          <div className="mt-2 text-gray-800 whitespace-pre-wrap">{q.question_text}</div>

                          <div className="mt-3">
                            {answers.length ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenQaReplies((prev) => ({
                                    ...prev,
                                    [q.question_id]: !prev[q.question_id],
                                  }))
                                }
                                className="text-sm font-semibold text-blue-600 hover:underline"
                              >
                                {opened ? "Thu gọn phản hồi" : "Xem phản hồi"}
                              </button>
                            ) : (
                              <div className="text-sm text-gray-500">Chưa có phản hồi.</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {answers.length > 0 && (
                        <div className={`mt-3 overflow-hidden transition-all ${opened ? "max-h-[2000px]" : "max-h-0"}`}>
                          <div className="pl-12 space-y-3">
                            {answers.map((a) => {
                              const replier = a?.user?.full_name || a?.user?.username || "Quản trị viên";
                              return (
                                <div key={a.answer_id} className="bg-white border border-gray-200 rounded-xl p-3">
                                  <div className="flex items-start gap-2">
                                    <div className="w-9 h-9 rounded-full bg-red-600 text-white font-extrabold flex items-center justify-center">
                                      <Store className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-gray-900">{replier}</span>
                                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                                          QTV
                                        </span>
                                        <span className="text-xs text-gray-500">• {timeAgo(a.created_at)}</span>
                                      </div>
                                      <div className="mt-1 text-gray-800 whitespace-pre-wrap">{a.answer_text}</div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="pt-2">
                  {qaLoading ? (
                    <div className="text-sm text-gray-500">Đang tải...</div>
                  ) : qaHasMore ? (
                    <button
                      type="button"
                      onClick={loadMoreQuestions}
                      className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 rounded-xl border border-gray-300 bg-white text-gray-800 font-semibold hover:bg-gray-50"
                    >
                      Xem thêm câu hỏi
                    </button>
                  ) : (
                    <div className="text-sm text-gray-500">Đã hết câu hỏi</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}