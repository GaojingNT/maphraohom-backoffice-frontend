"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Check, Info, X } from "lucide-react";

// Three variants so success and failure never look the same (spec §7 #9).
export type ToastKind = "success" | "error" | "info";

interface ToastContextValue {
  showToast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const TOAST_DURATION_MS = 2600;

const ICONS = { success: Check, error: X, info: Info } as const;

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{
    message: string;
    kind: ToastKind;
    id: number;
  } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showToast = useCallback(
    (message: string, kind: ToastKind = "success") => {
      clearTimeout(timerRef.current);
      setToast({ message, kind, id: Date.now() });
      timerRef.current = setTimeout(() => setToast(null), TOAST_DURATION_MS);
    },
    [],
  );

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const Icon = toast ? ICONS[toast.kind] : null;

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && Icon && (
        <div className="mk">
          <div
            key={toast.id}
            role={toast.kind === "error" ? "alert" : "status"}
            className={`mk-toast mk-toast--${toast.kind} fixed! bottom-[calc(86px+env(safe-area-inset-bottom))] z-[90]`}
          >
            <span className="mk-toast__ic">
              <Icon strokeWidth={3} />
            </span>
            {toast.message}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}
