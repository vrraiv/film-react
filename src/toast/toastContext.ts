import { createContext, type ReactNode } from 'react'

export type ToastVariant = 'info' | 'success' | 'error'

export type ToastAction = { label: string; onAction: () => void }

export type Toast = {
  id: number
  message: ReactNode
  variant: ToastVariant
  action?: ToastAction
}

export type ShowToastOptions = {
  variant?: ToastVariant
  durationMs?: number
  action?: ToastAction
}

export type ToastContextValue = {
  showToast: (message: ReactNode, options?: ShowToastOptions) => void
}

export const ToastContext = createContext<ToastContextValue | undefined>(undefined)
