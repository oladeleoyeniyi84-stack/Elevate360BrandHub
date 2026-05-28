import { Component, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
  /** Optional label used in the console summary, e.g. "home" or "section:offers". */
  scope?: string;
};

type State = { hasError: boolean };

/**
 * Production-safe error boundary. Catches render-time exceptions so a single
 * failing section/query cannot blank the whole page. Logs a summary only —
 * never raw user data or full stack traces beyond what React already emits in dev.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // Summary-only: message + scope. Avoid dumping full component stacks to the console.
    const where = this.props.scope ? `[${this.props.scope}] ` : "";
    console.error(`${where}render error: ${error.message}`);
  }

  handleReset = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div
        role="alert"
        data-testid="error-boundary-fallback"
        className="min-h-[40vh] flex items-center justify-center px-4"
        style={{ background: "hsl(220 50% 8%)" }}
      >
        <div className="text-center max-w-md">
          <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-white/50 text-sm mb-6">
            This section hit an unexpected error. Your data is safe — try reloading.
          </p>
          <button
            data-testid="button-error-reload"
            onClick={() => {
              this.handleReset();
              if (typeof window !== "undefined") window.location.reload();
            }}
            className="px-5 py-2.5 rounded-xl font-semibold text-sm"
            style={{ background: "#F4A62A", color: "#0d1a2e" }}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
