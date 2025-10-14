"use client"

import { useEffect, useState } from "react"
import { ProductCard } from "./product-card"

export function ProductGrid() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mock data for demonstration
    // In production, fetch from your Express API: fetch('http://localhost:5000/products')
    const mockProductsS = [
      {
        id: 1,
        name: "Dell XPS 15 9530",
        slug: "dell-xps-15-9530",
        thumbnailUrl: "/dell-xps-15-laptop-silver.jpg",
        defaultPrice: 45990000,
        salePrice: 44990000,
        ratingAverage: 4.8,
        reviewCount: 25,
      },
      {
        id: 2,
        name: "MacBook Pro 14 M3 Pro",
        slug: "macbook-pro-14-m3-pro",
        thumbnailUrl: "/macbook-pro-14-space-gray.jpg",
        defaultPrice: 52990000,
        salePrice: null,
        ratingAverage: 4.9,
        reviewCount: 42,
      },
      {
        id: 3,
        name: "ASUS ROG Zephyrus G14",
        slug: "asus-rog-zephyrus-g14",
        thumbnailUrl: "/asus-rog-gaming-laptop.jpg",
        defaultPrice: 42990000,
        salePrice: 39990000,
        ratingAverage: 4.7,
        reviewCount: 38,
      },
      {
        id: 4,
        name: "Lenovo ThinkPad X1 Carbon",
        slug: "lenovo-thinkpad-x1-carbon",
        thumbnailUrl: "/lenovo-thinkpad-business-laptop.jpg",
        defaultPrice: 38990000,
        salePrice: null,
        ratingAverage: 4.6,
        reviewCount: 31,
      },
      {
        id: 5,
        name: "HP Spectre x360 16",
        slug: "hp-spectre-x360-16",
        thumbnailUrl: "/hp-spectre-convertible-laptop.jpg",
        defaultPrice: 43500000,
        salePrice: 41990000,
        ratingAverage: 4.7,
        reviewCount: 28,
      },
      {
        id: 6,
        name: "Acer Predator Helios 300",
        slug: "acer-predator-helios-300",
        thumbnailUrl: "/acer-predator-gaming-laptop.jpg",
        defaultPrice: 35990000,
        salePrice: null,
        ratingAverage: 4.5,
        reviewCount: 45,
      },
    ]

    setTimeout(() => {
      setProducts(mockProducts)
      setLoading(false)
    }, 500)
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-96 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
