"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, X } from "lucide-react"

export default function ProductFilter({ filters, onFilterChange, onClearFilters }) {
  const [expandedSections, setExpandedSections] = useState({
    brands: true,
    categories: true,
    price: true,
    specs: true,
  })

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const handleBrandChange = (brandId) => {
    const newBrands = filters.brands.includes(brandId)
      ? filters.brands.filter((id) => id !== brandId)
      : [...filters.brands, brandId]
    onFilterChange({ ...filters, brands: newBrands })
  }

  const handleCategoryChange = (categoryId) => {
    const newCategories = filters.categories.includes(categoryId)
      ? filters.categories.filter((id) => id !== categoryId)
      : [...filters.categories, categoryId]
    onFilterChange({ ...filters, categories: newCategories })
  }

  const handlePriceChange = (e) => {
    const { name, value } = e.target
    onFilterChange({
      ...filters,
      price: { ...filters.price, [name]: value },
    })
  }

  const brands = [
    { id: 1, name: "Dell" },
    { id: 2, name: "HP" },
    { id: 3, name: "Lenovo" },
    { id: 4, name: "Asus" },
    { id: 5, name: "Acer" },
    { id: 6, name: "MSI" },
  ]

  const categories = [
    { id: 1, name: "Gaming" },
    { id: 2, name: "Văn phòng" },
    { id: 3, name: "Đồ họa" },
    { id: 4, name: "Sinh viên" },
  ]

  const hasActiveFilters =
    filters.brands.length > 0 || filters.categories.length > 0 || filters.price.min || filters.price.max

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
              {brands.map((brand) => (
                <label key={brand.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.brands.includes(brand.id)}
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
              {categories.map((category) => (
                <label key={category.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.categories.includes(category.id)}
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
          <button onClick={() => toggleSection("price")} className="flex items-center justify-between w-full text-left">
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
                <label className="block text-sm text-gray-700 mb-1">Từ (VNĐ)</label>
                <input
                  type="number"
                  name="min"
                  value={filters.price.min}
                  onChange={handlePriceChange}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Đến (VNĐ)</label>
                <input
                  type="number"
                  name="max"
                  value={filters.price.max}
                  onChange={handlePriceChange}
                  placeholder="100000000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
