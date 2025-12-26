"use client"

import { Link } from "react-router-dom"
import { formatPrice } from "../utils/formatters"

export default function ProductCard({ product }) {
  const normalizeText = (val) => {
    if (val == null) return ""
    if (Array.isArray(val)) return val.map(normalizeText).filter(Boolean).join(", ")
    if (typeof val === "object") {
      return normalizeText(val.value ?? val.name ?? val.label ?? "")
    }
    return String(val)
  }

  const flattenSpecs = (input) => {
    const out = {}
    const walk = (node) => {
      if (!node) return
      if (Array.isArray(node)) {
        node.forEach((x) => walk(x))
        return
      }
      if (typeof node !== "object") return
      Object.entries(node).forEach(([k, v]) => {
        if (v == null) return
        if (typeof v === "object") {
          if ("value" in v && (typeof v.value !== "object" || v.value == null)) {
            const t = normalizeText(v.value)
            if (t) out[String(k).toLowerCase()] = t
          }
          walk(v)
          return
        }
        const t = normalizeText(v)
        if (t) out[String(k).toLowerCase()] = t
      })
    }
    walk(input)
    return out
  }

  const pickSpec = (flat, keys) => {
    for (const k of keys) {
      const v = flat[String(k).toLowerCase()]
      if (v) return v
    }
    return ""
  }

  const shortCpu = (text) => {
    const s = String(text || "").replace(/\s+/g, " ").trim()
    if (!s) return ""
    const core = s.match(/Core\s+i\d/i)
    if (core) return core[0].replace(/\s+/g, " ")
    const ryzen = s.match(/Ryzen\s+\d+/i)
    if (ryzen) return ryzen[0].replace(/\s+/g, " ")
    const apple = s.match(/\bM\d\b/i)
    if (apple) return apple[0]
    return s.split(" ").slice(0, 2).join(" ")
  }

  const productId = product.product_id;
  const productName = product.product_name;

  const variations = Array.isArray(product.variations) ? product.variations : []

  // Tìm variation primary (is_primary = true)
  const primaryVariation = variations.find(v => v.is_primary === true)

  // Xác định variation để hiển thị
  let displayVariation
  if (primaryVariation) {
    displayVariation = primaryVariation
  } else {
    // Fallback: variation có giá thấp nhất
    displayVariation = variations.reduce((min, current) => {
      const currentPrice = Number(current.price || 0)
      const minPrice = Number(min.price || 0)
      return currentPrice < minPrice ? current : min
    }, variations[0])
  }

  // Ưu tiên primary variation cho link
  const initialVariationId =
  displayVariation?.variation_id ??
  product.primaryVariationId ??
  undefined;

  // Link ưu tiên slug, fallback id
  const slugOrId = product.slug || productId;

  // Query ?v=<variation_id> để mở đúng cấu hình
  const variationQuery = initialVariationId ? `?v=${initialVariationId}` : "";

  let imageUrl = product.thumbnail_url;

  if (!imageUrl && product.images && product.images.length > 0) {
      const primaryImage = product.images.find(img => img.is_primary);
      imageUrl = primaryImage ? primaryImage.image_url : product.images[0].image_url;
  }

  if (!imageUrl) {
      imageUrl = "/placeholder.svg";
  }

  // Lấy giá từ displayVariation
  const basePrice = Number(displayVariation?.price || product.base_price || 0)

  const discount = Number(product.discount_percentage || 0);
  const finalPrice = basePrice * (1 - discount / 100);

  const brandName =
    product?.Brand?.brand_name ||
    product?.brand?.brand_name ||
    product?.brand_name ||
    product?.brand?.name ||
    ""

  // Lấy spec từ displayVariation thay vì product.specs
  const specData = {
    cpu: displayVariation?.processor,
    ram: displayVariation?.ram,
    storage: displayVariation?.storage,
    graphics_card: displayVariation?.graphics_card,
    screen_size: displayVariation?.screen_size
  }

  const flat = flattenSpecs(specData)
  const cpu = shortCpu(pickSpec(flat, ["cpu", "processor", "cpu_model", "chip", "chipset"]))
  const ram = pickSpec(flat, ["ram", "memory"])
  const storage = pickSpec(flat, ["storage", "ssd", "hard_drive", "rom"])
  const screen = pickSpec(flat, ["screen", "screen_size", "display"])

  const specChips = [
    cpu ? { k: "cpu", label: `CPU: ${cpu}`, v: cpu } : null,
    ram ? { k: "ram", label: `RAM: ${ram}`, v: ram } : null,
    storage ? { k: "storage", label: `SSD: ${storage}`, v: storage } : null,
    screen ? { k: "screen", label: `Màn hình: ${screen}`, v: screen } : null,
  ].filter(Boolean)


  return (
    <Link to={`/products/${slugOrId}${variationQuery}`} className="group"> 
      <div className="rounded-xl border border-gray-300/70 bg-gray-50 overflow-hidden shadow-sm transition-shadow hover:shadow-md hover:bg-gray-100">
        <div className="relative aspect-[4/3] overflow-hidden bg-gray-50">
          <img
            src={imageUrl} 
            alt={productName}
            className="w-full h-full object-contain p-3 group-hover:scale-[1.02] transition-transform duration-300"
            // Thêm xử lý lỗi ảnh
            onError={(e) => { e.currentTarget.src = "/placeholder.svg"; e.currentTarget.onerror = null; }}
          />

          {discount > 0 && (
            <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded-lg text-xs font-bold">
              Giảm {Math.round(discount)}%
            </div>
          )}
        </div>

        <div className="p-4">
          {!!brandName && (
            <div className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
              {brandName}
            </div>
          )}

          {/* FIX HIỂN THỊ TÊN SẢN PHẨM */}
          <h3 className="mt-1 font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600" title={productName}>{productName}</h3> 

          <div className="mt-3 flex flex-wrap gap-2">
            {specChips.map((c) => (
              <span
                key={c.k}
                className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold"
                title={c.v}
              >
                {c.label}
              </span>
            ))}
          </div>

          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-extrabold text-emerald-600">{formatPrice(finalPrice)}</span>
              {discount > 0 && (
                <span className="text-sm text-gray-400 line-through">{formatPrice(basePrice)}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}