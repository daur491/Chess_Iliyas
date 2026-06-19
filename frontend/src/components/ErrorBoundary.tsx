import { Component } from 'react';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message };
  }

  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary] caught:', error);
  }

  handleReload = () => {
    this.setState({ hasError: false, message: undefined });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-error">
          <p>Что-то пошло не так</p>
          {this.state.message && <p className="app-error-msg">{this.state.message}</p>}
          <button className="app-error-btn" onClick={this.handleReload}>
            На главную
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
