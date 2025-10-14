// laptop-ecommerce/client/components/ui/sonner.jsx (Đã sửa lỗi TypeScript)
'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner } from 'sonner' // FIX: Loại bỏ import ToasterProps

// FIX: Loại bỏ type extensions và type casting
const Toaster = ({ ...props }) => {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme} // FIX: Loại bỏ type casting 'as ToasterProps['theme']'
      className="toaster group"
      // FIX: Loại bỏ type casting 'as React.CSSProperties'
      style={{ 
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
      }}
      {...props}
    />
  )
}

export { Toaster }