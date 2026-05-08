import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react'
import {
  ToastContext,
  type Toast,
  type ToastContextValue,
} from './toastContext'

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast: ToastContextValue['showToast'] = useCallback((message, options) => {
    const id = nextId.current++
    const variant = options?.variant ?? 'info'
    const action = options?.action
    const durationMs = options?.durationMs ?? 5000
    setToasts((current) => [...current, { id, message, variant, action }])
    timers.current.set(
      id,
      setTimeout(() => dismiss(id), durationMs),
    )
  }, [dismiss])

  useEffect(() => {
    const activeTimers = timers.current
    return () => {
      for (const timer of activeTimers.values()) {
        clearTimeout(timer)
      }
      activeTimers.clear()
    }
  }, [])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="toast-stack"
        role="region"
        aria-label="Notifications"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast--${toast.variant}`}
            role="status"
          >
            <span className="toast__message">{toast.message}</span>
            {toast.action ? (
              <button
                className="toast__action button-secondary"
                type="button"
                onClick={() => {
                  toast.action?.onAction()
                  dismiss(toast.id)
                }}
              >
                {toast.action.label}
              </button>
            ) : null}
            <button
              className="toast__dismiss"
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismiss(toast.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
