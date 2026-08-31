'use client';

import { useEffect, useMemo, useState } from 'react';
import { ReadOnlyTrendChart } from './trend-chart';
import type { SampleTechnique } from '../../lib/samples/types';

type TrendRange = 'today' | 'week' | 'month';
const ranges: TrendRange[] = ['today', 'week', 'month'];
const labels: Record<TrendRange, string> = { today: '今日测量', week: '近 7 日', month: '近 30 日' };

export function KeyboardTrend({ technique, values, syncedAt }: { technique: SampleTechnique; values: number[]; syncedAt: string }) {
  const [range, setRange] = useState<TrendRange>('today');
  const displayedValues = useMemo(() => values.map((value) => Math.round(value * (range === 'today' ? 1 : range === 'week' ? .92 : .84))), [range, values]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.altKey) return;
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        setRange((current) => {
          const step = event.key === 'ArrowUp' ? -1 : 1;
          return ranges[(ranges.indexOf(current) + step + ranges.length) % ranges.length];
        });
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        const nextPort = event.key === 'ArrowLeft' ? '3101' : '3102';
        if (window.location.port !== nextPort) {
          const nextUrl = new URL(window.location.href);
          nextUrl.port = nextPort;
          window.location.assign(nextUrl);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return <><header className="readonly-panel-header"><div><span className={`readonly-kicker ${technique}`}>{technique.toUpperCase()}</span><h1>测试趋势</h1></div><span className="readonly-update">{labels[range]} · 数据同步 {syncedAt}</span></header><ReadOnlyTrendChart values={displayedValues} technique={technique} metric="samples" rangeLabel={labels[range]} /><p className="keyboard-hint">Alt + ↑ / ↓ 切换趋势范围　·　Alt + ← / → 切换 XAFS / XRD</p></>;
}
