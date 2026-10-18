"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type ToastTone = "success" | "error" | "info";
type ToastItem = { id: number; message: string; tone: ToastTone };

const ToastContext = createContext<(message: string, tone?: ToastTone) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((message: string, tone: ToastTone = "success") => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev.slice(-2), { id, message, tone }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3800);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-[90] flex flex-col items-center gap-2 px-4 md:bottom-8"
      >
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-auto flex max-w-md items-center gap-3 rounded-full bg-ink px-5 py-3 text-sm text-paper shadow-[var(--shadow-float)]"
              role={t.tone === "error" ? "alert" : "status"}
            >
              {t.tone === "success" ? (
                <CheckCircle2 className="h-4 w-4 text-[#b9d3c1]" aria-hidden />
              ) : t.tone === "error" ? (
                <AlertCircle className="h-4 w-4 text-[#f0b4ad]" aria-hidden />
              ) : (
                <Info className="h-4 w-4 text-nude" aria-hidden />
              )}
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
