// components/Toast.tsx
'use client';
import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';
type ToastAction = { label: string; onClick: () => void };
type ToastOptions = { action?: ToastAction; duration?: number };
type ToastItem = { id: number; type: ToastType; message: string; action?: ToastAction };

type ToastApi = {
  success: (message: string, opts?: ToastOptions) => void;
  error: (message: string, opts?: ToastOptions) => void;
  info: (message: string, opts?: ToastOptions) => void;
};

const noop: ToastApi = { success: () => {}, error: () => {}, info: () => {} };
const ToastContext = createContext<ToastApi>(noop);

export const useToast = () => useContext(ToastContext);

let counter = 0;

const STYLES: Record<ToastType, { ring: string; icon: ReactNode }> = {
  success: {
    ring: 'border-green-200',
    icon: (
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600 pop-in">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path className="draw-check" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </span>
    ),
  },
  error: {
    ring: 'border-red-200',
    icon: (
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 pop-in">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </span>
    ),
  },
  info: {
    ring: 'border-blue-200',
    icon: (
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 pop-in">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </span>
    ),
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((type: ToastType, message: string, opts?: ToastOptions) => {
    const id = ++counter;
    setToasts((list) => [...list, { id, type, message, action: opts?.action }]);
    setTimeout(() => remove(id), opts?.duration ?? (opts?.action ? 5500 : 3800));
  }, [remove]);

  const api = useMemo<ToastApi>(() => ({
    success: (m, o) => push('success', m, o),
    error: (m, o) => push('error', m, o),
    info: (m, o) => push('info', m, o),
  }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed z-[100] bottom-4 inset-x-4 sm:inset-x-auto sm:right-6 sm:left-auto flex flex-col items-center sm:items-end gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`toast-in pointer-events-auto flex items-center gap-3 w-full sm:w-auto sm:max-w-sm bg-white border ${STYLES[t.type].ring} shadow-lg shadow-slate-900/10 rounded-xl px-4 py-3`}
          >
            {STYLES[t.type].icon}
            <p className="text-sm text-slate-700 flex-1">{t.message}</p>
            {t.action && (
              <button
                onClick={() => { t.action!.onClick(); remove(t.id); }}
                className="flex-shrink-0 text-sm font-semibold text-blue-600 hover:text-blue-700 px-2 py-1 rounded-md hover:bg-blue-50"
              >
                {t.action.label}
              </button>
            )}
            <button onClick={() => remove(t.id)} className="text-slate-300 hover:text-slate-500 flex-shrink-0" aria-label="Fermer">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
