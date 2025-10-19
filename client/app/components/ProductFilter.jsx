"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";

export default function ProductFilter({
  brands = [],
  categories = [],
  filters,
  onFilterChange,
  onClearFilters,
}) {
  const [expandedSections, setExpandedSections] = useState({
    brands: true,
    categories: true,
    price: true,
    specs: false,
  });

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleBrandChange = (brandId) => {
    const exists = filters.brands.includes(brandId);
    const newBrands = exists
      ? filters.brands.filter((id) => id !== brandId)
      : [...filters.brands, brandId];
    onFilterChange({ ...filters, brands: newBrands });
  };

  const handleCategoryChange = (categoryId) => {
    const exists = filters.categories.includes(categoryId);
    const newCategories = exists
      ? filters.categories.filter((id) => id !== categoryId)
      : [...filters.categories, categoryId];
    onFilterChange({ ...filters, categories: newCategories });
  };

  // --- đặt phía trên cùng của component ---
  const fmtVND = (n) =>
    n === "" || n == null
      ? ""
      : new Intl.NumberFormat("vi-VN").format(Number(n));

  const unfmt = (s) => {
    if (s == null) return "";
    const onlyDigits = String(s).replace(/[^\d]/g, "");
    return onlyDigits === "" ? "" : Number(onlyDigits);
  };

  // giữ state hiển thị (đã có dấu chấm)
  const [priceInput, setPriceInput] = useState({
    min: filters.price?.min ? fmtVND(filters.price.min) : "",
    max: filters.price?.max ? fmtVND(filters.price.max) : "",
  });

  // format ngay khi gõ + giữ caret
  const handlePriceChange = (e) => {
    const { name } = e.target;
    const raw = e.target.value;
    const start = e.target.selectionStart;

    // bỏ mọi ký tự non-digit, lấy số thuần
    const numeric = unfmt(raw);

    // render lại có dấu chấm
    const pretty = numeric === "" ? "" : fmtVND(numeric);

    setPriceInput((p) => ({ ...p, [name]: pretty }));

    // đẩy số thuần cho FE cha (để query API)
    onFilterChange({
      ...filters,
      price: { ...filters.price, [name]: numeric === "" ? "" : numeric },
    });

    // sửa caret để không nhảy lung tung khi thêm dấu chấm
    requestAnimationFrame(() => {
      const el = e.target;
      const delta = pretty.length - raw.length;
      const nextPos = Math.max(0, (start ?? pretty.length) + delta);
      el.setSelectionRange(nextPos, nextPos);
    });
  };

  // OPTIONAL: đảm bảo chỉ cho nhập số và phím điều hướng
  const handlePriceKeyDown = (e) => {
    const allowed = [
      "Backspace",
      "Delete",
      "ArrowLeft",
      "ArrowRight",
      "Home",
      "End",
      "Tab",
    ];
    if (allowed.includes(e.key)) return;
    if (!/^\d$/.test(e.key)) e.preventDefault();
  };

  const hasActiveFilters =
    (filters.brands?.length || 0) > 0 ||
    (filters.categories?.length || 0) > 0 ||
    !!filters.price?.min ||
    !!filters.price?.max;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Bộ lọc</h2>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
          >
            <X className="w-4 h-4" />
            <span>Xóa bộ lọc</span>
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div className="border-b border-gray-200 pb-4">
          <button
            onClick={() => toggleSection("brands")}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="font-medium text-gray-900">Thương hiệu</span>
            {expandedSections.brands ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>
          {expandedSections.brands && (
            <div className="mt-3 space-y-2">
              {(Array.isArray(brands) ? brands : []).map((brand) => (
                <label
                  key={brand.id}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={(filters?.brands || []).includes(brand.id)}
                    onChange={() => handleBrandChange(brand.id)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{brand.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="border-b border-gray-200 pb-4">
          <button
            onClick={() => toggleSection("categories")}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="font-medium text-gray-900">Danh mục</span>
            {expandedSections.categories ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>
          {expandedSections.categories && (
            <div className="mt-3 space-y-2">
              {(Array.isArray(categories) ? categories : []).map((category) => (
                <label
                  key={category.id}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={(filters?.categories || []).includes(category.id)}
                    onChange={() => handleCategoryChange(category.id)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{category.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="pb-4">
          <button
            onClick={() => toggleSection("price")}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="font-medium text-gray-900">Khoảng giá</span>
            {expandedSections.price ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>
          {expandedSections.price && (
            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Từ (VNĐ)
                </label>
                <input
                  inputMode="numeric"
                  pattern="\d*"
                  name="min"
                  value={priceInput.min}
                  onChange={handlePriceChange}
                  onKeyDown={handlePriceKeyDown}
                  placeholder="VD: 10.000.000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Đến (VNĐ)
                </label>
                <input
                  inputMode="numeric"
                  pattern="\d*"
                  name="max"
                  value={priceInput.max}
                  onChange={handlePriceChange}
                  onKeyDown={handlePriceKeyDown}
                  placeholder="VD: 40.000.000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
