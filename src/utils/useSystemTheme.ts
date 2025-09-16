import { useSyncExternalStore } from 'react'

type Theme = 'light' | 'dark'

export default function useSystemTheme(defaultTheme: Theme = 'light'): Theme {
  const getSnapshot = (): boolean => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return defaultTheme === 'dark'
  }

  const subscribe = (callback: () => void) => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => callback()
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }

  const isDark = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => defaultTheme === 'dark'
  )

  return isDark ? 'dark' : 'light'
}
