'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Icon, type IconName } from '@/components/Icons';

type ToastFn = (message: string, icon?: IconName) => void;
const ToastContext = createContext<ToastFn>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ message: string; icon: IconName; visible: boolean }>({ message: '', icon: 'check', visible: false });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const toast = useCallback<ToastFn>((message, icon = 'check') => {
    setState({ message, icon, visible: true });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState(s => ({ ...s, visible: false })), 2200);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className={`toast ${state.visible ? 'is-visible' : ''}`} role="status" aria-live="polite">
        {state.message && <><Icon name={state.icon} /><span>{state.message}</span></>}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
