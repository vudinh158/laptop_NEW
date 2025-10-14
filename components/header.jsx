"use client"

import Link from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ShoppingCart, User, Search, Menu } from "lucide-react"
import { useState } from "react"

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">L</span>
            </div>
            <span className="font-bold text-xl hidden sm:inline-block">LaptopStore</span>
          </Link>

          {/* Search Bar - Desktop */}
          <div className="hidden md:flex flex-1 max-w-xl mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Tìm kiếm laptop..." className="pl-10 w-full" />
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden lg:flex items-center gap-6">
            <Link href="/products" className="text-sm font-medium hover:text-primary transition-colors">
              Sản phẩm
            </Link>
            <Link href="/brands" className="text-sm font-medium hover:text-primary transition-colors">
              Thương hiệu
            </Link>
            <Link href="/deals" className="text-sm font-medium hover:text-primary transition-colors">
              Khuyến mãi
            </Link>
            <Link href="/support" className="text-sm font-medium hover:text-primary transition-colors">
              Hỗ trợ
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-accent text-accent-foreground text-xs flex items-center justify-center">
                0
              </span>
            </Button>
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Tìm kiếm laptop..." className="pl-10 w-full" />
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="lg:hidden py-4 border-t">
            <div className="flex flex-col gap-4">
              <Link href="/products" className="text-sm font-medium hover:text-primary transition-colors">
                Sản phẩm
              </Link>
              <Link href="/brands" className="text-sm font-medium hover:text-primary transition-colors">
                Thương hiệu
              </Link>
              <Link href="/deals" className="text-sm font-medium hover:text-primary transition-colors">
                Khuyến mãi
              </Link>
              <Link href="/support" className="text-sm font-medium hover:text-primary transition-colors">
                Hỗ trợ
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
