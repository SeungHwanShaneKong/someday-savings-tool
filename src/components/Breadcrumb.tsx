import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

const BASE_DOMAIN = 'https://wedsem.moderninsightspot.com';

/**
 * Breadcrumb 컴포넌트 — 시각적 breadcrumb + BreadcrumbList JSON-LD 생성
 * useSEO의 jsonLd 파라미터로 전달할 구조화 데이터를 반환하는 유틸도 포함
 */
export function getBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  const allItems = [{ label: '홈', href: '/' }, ...items];

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: allItems.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: `${BASE_DOMAIN}${item.href}` } : {}),
    })),
  };
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
        {/* Home */}
        <li className="flex items-center gap-1.5">
          <Link
            to="/"
            className="hover:text-primary transition-colors flex items-center gap-1"
          >
            <Home className="w-3.5 h-3.5" aria-hidden="true" />
            <span>홈</span>
          </Link>
        </li>

        {/* Items */}
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-1.5">
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" aria-hidden="true" />
            {item.href && index < items.length - 1 ? (
              <Link
                to={item.href}
                className="hover:text-primary transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground font-medium" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
