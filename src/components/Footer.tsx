import { Link } from 'react-router-dom';
import { FeatureRequestButton } from '@/components/FeatureRequestButton';
import { EXTERNAL_URLS } from '@/lib/external-links'; // [CL-HONEYMOON-EXTERNAL-20260416-221500]

export default function Footer() {
  return (
    <footer className="border-t border-border/50 bg-secondary/30 py-10 px-6">
      <div className="max-w-lg mx-auto">
        {/* Service Links */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <h3 className="text-xs font-semibold text-foreground mb-3 tracking-wider uppercase">
              서비스
            </h3>
            <nav aria-label="서비스 메뉴">
              <ul className="space-y-2">
                <li>
                  <Link
                    to="/budget"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    예산 시뮬레이터
                  </Link>
                </li>
                <li>
                  <Link
                    to="/checklist"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    D-day 체크리스트 AI
                  </Link>
                </li>
                {/* [CL-HONEYMOON-EXTERNAL-20260416-221500] 외부 사이트로 이동 */}
                <li>
                  <a
                    href={EXTERNAL_URLS.honeymoon}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    AI 허니문 큐레이션
                  </a>
                </li>
                <li>
                  <Link
                    to="/chat"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    AI Q&A 챗봇
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-foreground mb-3 tracking-wider uppercase">
              가이드
            </h3>
            <nav aria-label="가이드 메뉴">
              <ul className="space-y-2">
                <li>
                  {/* [CL-QA100-BTN-20260531] 프리렌더 라우트는 trailing-slash로 (301 hop 방지) */}
                  <Link
                    to="/guide/"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    결혼 예산 가이드
                  </Link>
                </li>
                <li>
                  <Link
                    to="/faq/"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    자주 묻는 질문
                  </Link>
                </li>
                {/* [CL-IMPROVE-7TASKS-20260330] 의견 수집 */}
                <li>
                  <FeatureRequestButton />
                </li>
              </ul>
            </nav>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border/50 pt-6">
          {/* [CL-ADSENSE-20260619-234411] 법적 고지 링크 (AdSense 필수) */}
          <nav aria-label="정책 및 정보" className="flex flex-wrap justify-center gap-x-4 gap-y-2 mb-5">
            <Link to="/privacy/" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              개인정보처리방침
            </Link>
            <Link to="/terms/" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              이용약관
            </Link>
            <Link to="/about/" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              소개
            </Link>
            <Link to="/contact/" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              문의
            </Link>
            {/* [CL-ADSENSE-CONTENT-20260630] 편집·제작 원칙(E-E-A-T) */}
            <Link to="/editorial/" className="text-xs text-muted-foreground hover:text-primary transition-colors">
              편집·제작 원칙
            </Link>
          </nav>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">웨딩셈</span>
              <span className="text-xs text-muted-foreground">
                AI 기반 결혼 준비 플랫폼
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground/60">
              &copy; {new Date().getFullYear()} WeddingSem. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
