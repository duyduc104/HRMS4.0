import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { useToastStore, type ToastVariant } from '../../../stores/useToastStore';

const variantConfig: Record<ToastVariant, { icon: React.ElementType; classes: string }> = {
  success: { icon: CheckCircle, classes: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800/50 dark:text-green-400' },
  error: { icon: AlertCircle, classes: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800/50 dark:text-red-400' },
  warning: { icon: AlertTriangle, classes: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800/50 dark:text-yellow-400' },
  info: { icon: Info, classes: 'bg-brand-50 border-brand-200 text-brand-800 dark:bg-brand-900/20 dark:border-brand-800/50 dark:text-brand-400' },
};

export function ToastProvider() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      {toasts.map((toast) => {
        const { icon: Icon, classes } = variantConfig[toast.variant];

        return (
          <div
            key={toast.id}
            className={clsx(
              'pointer-events-auto flex items-start p-4 rounded-lg border shadow-lg animate-slide-up backdrop-blur-md',
              classes
            )}
            role="alert"
          >
            <Icon className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="ml-3 flex-1">
              <h4 className="text-sm font-semibold">{toast.title}</h4>
              {toast.description && (
                <p className="text-sm mt-1 opacity-90">{toast.description}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-4 shrink-0 opacity-70 hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
