// [ZERO-COST-PIPELINE-2026-03-07] 인터랙티브 비교 테이블 컴포넌트
// RAG 응답의 마크다운 테이블을 파싱하여 정렬 가능한 표로 렌더링

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { formatKoreanWon } from '@/lib/budget-categories';

interface ComparisonTableProps {
  markdown: string;
  className?: string;
}

interface TableData {
  headers: string[];
  rows: string[][];
}

type SortDirection = 'asc' | 'desc' | null;

/**
 * 마크다운 테이블 텍스트를 감지
 */
export function containsMarkdownTable(text: string): boolean {
  const lines = text.split('\n');
  let headerLine = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      if (headerLine) return true; // separator line found after header
      headerLine = true;
    } else if (headerLine && /^\|[\s-:|]+\|$/.test(trimmed)) {
      return true; // separator line
    } else {
      headerLine = false;
    }
  }

  return false;
}

/**
 * 마크다운 테이블 파싱
 */
function parseMarkdownTable(markdown: string): TableData | null {
  const lines = markdown
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|') && l.endsWith('|'));

  if (lines.length < 3) return null; // header + separator + at least 1 row

  // 구분선 찾기
  const separatorIdx = lines.findIndex((l) =>
    /^\|[\s-:|]+\|$/.test(l)
  );
  if (separatorIdx < 1) return null;

  const parseLine = (line: string): string[] =>
    line
      .split('|')
      .slice(1, -1) // Remove first and last empty elements
      .map((cell) => cell.trim());

  const headers = parseLine(lines[separatorIdx - 1]);
  const rows = lines
    .slice(separatorIdx + 1)
    .map(parseLine)
    .filter((row) => row.length === headers.length);

  if (rows.length === 0) return null;

  return { headers, rows };
}

/**
 * 셀 값이 가격(원)인지 감지
 */
function isKoreanPrice(value: string): boolean {
  return /^\d[\d,]*\s*만?\s*원?$/.test(value.replace(/\s/g, ''));
}

/**
 * 가격 문자열을 숫자로 변환
 */
function parsePriceValue(value: string): number {
  const cleaned = value.replace(/[^\d만]/g, '');
  if (cleaned.includes('만')) {
    const num = parseFloat(cleaned.replace('만', ''));
    return num * 10000;
  }
  return parseFloat(cleaned.replace(/,/g, '')) || 0;
}

/**
 * 셀 값 포맷 (가격이면 formatKoreanWon 적용)
 */
function formatCellValue(value: string, isPriceColumn: boolean): string {
  if (isPriceColumn && isKoreanPrice(value)) {
    const numValue = parsePriceValue(value);
    if (numValue > 0) return formatKoreanWon(numValue);
  }
  return value;
}

export function ComparisonTable({ markdown, className }: ComparisonTableProps) {
  const tableData = useMemo(() => parseMarkdownTable(markdown), [markdown]);
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);

  if (!tableData) return null;

  const { headers, rows } = tableData;

  // 가격 컬럼 감지
  const priceColumns = headers.map((_, colIdx) =>
    rows.some((row) => isKoreanPrice(row[colIdx] || ''))
  );

  // 정렬 적용
  const sortedRows = useMemo(() => {
    if (sortCol === null || sortDir === null) return rows;

    return [...rows].sort((a, b) => {
      const aVal = a[sortCol] || '';
      const bVal = b[sortCol] || '';

      // 가격 컬럼이면 숫자 비교
      if (priceColumns[sortCol]) {
        const aNum = parsePriceValue(aVal);
        const bNum = parsePriceValue(bVal);
        return sortDir === 'asc' ? aNum - bNum : bNum - aNum;
      }

      // 문자열 비교
      return sortDir === 'asc'
        ? aVal.localeCompare(bVal, 'ko')
        : bVal.localeCompare(aVal, 'ko');
    });
  }, [rows, sortCol, sortDir, priceColumns]);

  const handleSort = (colIdx: number) => {
    if (sortCol === colIdx) {
      // 같은 컬럼 클릭: asc → desc → null
      if (sortDir === 'asc') setSortDir('desc');
      else if (sortDir === 'desc') {
        setSortCol(null);
        setSortDir(null);
      }
    } else {
      setSortCol(colIdx);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ colIdx }: { colIdx: number }) => {
    if (sortCol !== colIdx)
      return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    if (sortDir === 'asc')
      return <ArrowUp className="w-3 h-3" />;
    return <ArrowDown className="w-3 h-3" />;
  };

  return (
    <div
      className={cn(
        'mt-2 rounded-lg border border-border overflow-hidden',
        className
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50">
              {headers.map((header, i) => (
                <th
                  key={i}
                  className={cn(
                    'px-3 py-2 text-left font-semibold text-foreground',
                    'cursor-pointer hover:bg-muted/80 transition-colors',
                    'select-none whitespace-nowrap'
                  )}
                  onClick={() => handleSort(i)}
                >
                  <div className="flex items-center gap-1">
                    <span>{header}</span>
                    <SortIcon colIdx={i} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={cn(
                  'border-t border-border/50',
                  rowIdx % 2 === 0
                    ? 'bg-background'
                    : 'bg-muted/20'
                )}
              >
                {row.map((cell, cellIdx) => (
                  <td
                    key={cellIdx}
                    className={cn(
                      'px-3 py-2 text-foreground whitespace-nowrap',
                      priceColumns[cellIdx] && 'text-right font-medium tabular-nums'
                    )}
                  >
                    {formatCellValue(cell, priceColumns[cellIdx])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 표 하단 정보 */}
      <div className="px-3 py-1.5 bg-muted/30 border-t border-border/50 text-[10px] text-muted-foreground">
        {sortedRows.length}개 항목 · 열 클릭으로 정렬
      </div>
    </div>
  );
}
