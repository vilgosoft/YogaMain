import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { HiCheckCircle, HiXCircle, HiExclamationTriangle, HiXMark } from 'react-icons/hi2';
import { ToastContext, type ToastType } from './ToastContext';
import styles from './Toast.module.scss';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className={styles.container}>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const icons = {
    success: <HiCheckCircle />,
    error: <HiXCircle />,
    warning: <HiExclamationTriangle />,
    info: <HiCheckCircle />,
  };

  return (
    <div className={`${styles.toast} ${styles[`toast--${toast.type}`]}`}>
      <span className={styles.icon}>{icons[toast.type]}</span>
      <span className={styles.message}>{toast.message}</span>
      <button className={styles.close} onClick={() => onRemove(toast.id)}>
        <HiXMark />
      </button>
    </div>
  );
}
