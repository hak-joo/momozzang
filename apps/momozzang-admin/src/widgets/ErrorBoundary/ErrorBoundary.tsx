import { Component, type ErrorInfo, type ReactNode } from 'react';
import styles from './ErrorBoundary.module.css';

interface Props {
  children: ReactNode;
  /** fallback에 노출할 영역 이름 (예: "이 영역"). */
  label?: string;
}

interface State {
  hasError: boolean;
  message: string;
}

/**
 * 폼 패널 등 일부 영역의 렌더 예외가 admin 앱 전체를 화이트스크린하지 않도록 격리하는 안전망.
 * - 단일 위젯의 throw를 잡아 해당 영역에만 fallback UI를 그린다(좌측 미리보기·스텝퍼는 유지).
 * - React 19 호환을 위해 클래스 컴포넌트 + getDerivedStateFromError/componentDidCatch로 구현.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    // 개발 중 원인 파악을 돕기 위해 콘솔에 남긴다(앱은 죽지 않음).
    console.error('[ErrorBoundary] 영역 렌더 중 예외 격리:', error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (this.state.hasError) {
      const label = this.props.label ?? '이 영역';
      return (
        <div className={styles.fallback} role="alert">
          <p className={styles.title}>{label}을(를) 표시할 수 없습니다.</p>
          {this.state.message && <p className={styles.detail}>{this.state.message}</p>}
          <button type="button" className={styles.retry} onClick={this.handleRetry}>
            다시 시도
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
