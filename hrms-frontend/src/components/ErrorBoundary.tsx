import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from './ui/Button/Button';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-h3 font-bold mb-2">Đã xảy ra lỗi không mong muốn</h2>
          <p className="text-text-sec max-w-md mb-6">
            Rất xin lỗi vì sự bất tiện này. Chúng tôi đã ghi nhận lỗi và sẽ khắc phục sớm nhất có thể.
          </p>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => window.location.reload()}>
              Tải lại trang
            </Button>
            <Button variant="primary" onClick={() => window.location.href = '/'}>
              Về trang chủ
            </Button>
          </div>
          {import.meta.env.DEV && this.state.error && (
            <pre className="mt-8 p-4 bg-surface-alt rounded-lg text-left text-xs font-mono text-red-600 max-w-2xl overflow-auto w-full">
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
