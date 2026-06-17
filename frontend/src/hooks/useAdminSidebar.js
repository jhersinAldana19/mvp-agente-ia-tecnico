import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'tecport-admin-sidebar-collapsed'

function readCollapsedPreference() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

/** Desktop collapse + mobile overlay state for the admin shell. */
export function useAdminSidebar() {
  const [desktopCollapsed, setDesktopCollapsed] = useState(readCollapsedPreference)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(desktopCollapsed))
    } catch {
      /* private browsing / blocked storage */
    }
  }, [desktopCollapsed])

  return {
    desktopCollapsed,
    mobileOpen,
    collapseDesktop: useCallback(() => setDesktopCollapsed(true), []),
    expandDesktop: useCallback(() => setDesktopCollapsed(false), []),
    openMobile: useCallback(() => setMobileOpen(true), []),
    closeMobile: useCallback(() => setMobileOpen(false), []),
  }
}
