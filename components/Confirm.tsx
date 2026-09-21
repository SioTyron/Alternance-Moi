// components/Confirm.tsx
'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};
type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(async () => false);
export const useConfirm = () => useContext(ConfirmContext);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setState(opts);
    });
  }, []);

  const close = useCallback((result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setState(null);
  }, []);

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
      if (e.key === 'Enter') close(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 fade-in" onClick={() => close(false)} />
          <div role="alertdialog" aria-modal="true" className="relative modal-in card w-full max-w-sm p-6 text-center">
            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${state.danger ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
              {state.danger ? (
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19h13.86a2 2 0 001.74-2.99l-6.93-12a2 2 0 00-3.48 0l-6.93 12A2 2 0 005.07 19z" />
                </svg>
              ) : (
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            {state.title && <h3 className="text-lg font-semibold text-slate-900 mb-1">{state.title}</h3>}
            <p className="text-slate-600 text-sm mb-6">{state.message}</p>
            <div className="flex gap-3">
              <button onClick={() => close(false)} className="btn flex-1 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-100">
                {state.cancelLabel ?? 'Annuler'}
              </button>
              <button
                autoFocus
                onClick={() => close(true)}
                className={`btn flex-1 py-2.5 text-white ${state.danger ? 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/25' : 'btn-primary'}`}
              >
                {state.confirmLabel ?? 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
