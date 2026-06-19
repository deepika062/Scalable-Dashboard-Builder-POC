import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * Catches render-time errors thrown by a single widget (e.g. a chart choking on
 * unexpected data) so a bad widget shows an inline error instead of taking down
 * the whole dashboard. Resets when its `resetKey` changes (after a refetch).
 */
interface Props {
  children: ReactNode;
  resetKey: unknown;
  onError?: (error: Error) => void;
}
interface State {
  hasError: boolean;
  message?: string;
}

export class WidgetErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, message: undefined });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error);
    // eslint-disable-next-line no-console
    console.error('[widget] render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="widget__state widget__state--error">
          <strong>Widget failed to render</strong>
          <span>{this.state.message}</span>
        </div>
      );
    }
    return this.props.children;
  }
}
