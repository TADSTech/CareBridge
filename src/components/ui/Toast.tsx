import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col space-y-2 pointer-events-none"
      role="region"
      aria-label="Notifications"
    >
      <div aria-live="polite" aria-atomic="false" className="contents">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              role={toast.type === 'error' ? 'alert' : 'status'}
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-card border bg-cloud-white shadow-card"
            >
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-iris-pulse shrink-0" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-iris-pulse shrink-0" />}

              <span className="text-sm font-medium text-deep-iris pr-2">{toast.text}</span>

              <button
                onClick={() => onDismiss(toast.id)}
                aria-label="Dismiss notification"
                className="text-fog hover:text-deep-iris transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
