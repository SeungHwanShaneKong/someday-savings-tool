// [CL-QUALITY-ERRBOUND-20260621] 앱 전역 Error Boundary.
//
// 문제: 렌더 단계 예외(손상 localStorage JSON.parse, 기형 페이로드, 청크 reject 등)가 경계 없이
//   루트까지 전파되면 전체 언마운트 → 빈 div#root 화이트스크린(새로고침 외 복구 0).
// 해결: getDerivedStateFromError 로 렌더 예외를 포착해 한국어 복구 UI(홈/새로고침) 표시. 셸은 경계 밖이라 생존.
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    // 디버깅 보존(향후 Sentry 등 원격 로깅 훅 지점)
    console.error('[AppErrorBoundary]', error, info?.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center"
        >
          <div className="text-5xl mb-4" aria-hidden="true">😢</div>
          <h1 className="text-xl font-semibold text-foreground mb-2">문제가 발생했어요</h1>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">
            일시적인 오류로 화면을 불러오지 못했어요. 새로고침하면 대부분 해결돼요.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => window.location.assign('/')}
              className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted/50 transition-colors"
            >
              홈으로
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              새로고침
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
