'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  // FIX: Loại bỏ import type ThemeProviderProps
} from 'next-themes'

// FIX: Loại bỏ type annotations và type extensions
export function ThemeProvider({ children, ...props }) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}