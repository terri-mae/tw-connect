import React, { createContext, useContext, useState, useCallback, useId } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback(({ title, description, variant = 'default', duration = 4000 }) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, title, description, variant }]);
    setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

function ToastContainer({ toasts, dismiss }) {
  if (!toasts.length) return null;
  return (
    <div
      style={{
        position: 'fixed', bottom: '1.5rem', right: '1.5rem',
        zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.5rem',
        alignItems: 'flex-end',
      }}
    >
      {toasts.map(t => (
        <div
          key={t.id}
          onClick={() => dismiss(t.id)}
          style={{
            background: t.variant === 'destructive' ? '#7f1d1d' : '#18181b',
            border: `1px solid ${t.variant === 'destructive' ? '#991b1b' : '#3f3f46'}`,
            borderRadius: '10px',
            padding: '0.75rem 1rem',
            minWidth: '280px',
            maxWidth: '360px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            cursor: 'pointer',
            animation: 'slideInRight 0.2s ease',
          }}
        >
          {t.title && (
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f4f4f5', marginBottom: t.description ? '2px' : 0 }}>
              {t.title}
            </p>
          )}
          {t.description && (
            <p style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>{t.description}</p>
          )}
        </div>
      ))}
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
