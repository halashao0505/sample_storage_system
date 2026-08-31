'use client';

import { useEffect, useMemo, useState } from 'react';
import { ReadOnlyTrendChart } from './trend-chart';
import type { SampleTechnique } from '../../lib/samples/types';

type TrendRange = 'today' | 'week' | 'month';
const ranges: TrendRange[] = ['today', 'week', 'month'];
const labels: Record<TrendRange, string> = { today: '今日', week: '7 日', month: '30 日' };

export function KeyboardTrend({ technique, values, syncedAt }: { technique: SampleTechnique; values: number[]; syncedAt: string }) {
  const [range, setRange] = useState<TrendRange>('today');
  const displayedValues = useMemo(() => values.map((value) => Math.round(value * (range === 'today' ? 1 : range === 'week' ? .92 : .84))), [range, values]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.altKey) return;
      if (event.code === 'ArrowUp' || event.code === 'ArrowDown') {
        event.preventDefault();
        event.stopImmediatePropagation();
        setRange((current) => {
          const step = event.code === 'ArrowUp' ? -1 : 1;
          return ranges[(ranges.indexOf(current) + step + ranges.length) % ranges.length];
        });
      }
      if (event.code === 'Digit1' || event.code === 'Digit2') {
        event.preventDefault();
        event.stopImmediatePropagation();
        const nextPort = event.code === 'Digit1' ? '3101' : '3102';
        if (window.location.port !== nextPort) {
          window.location.assign(`${window.location.protocol}//${window.location.hostname}:${nextPort}${window.location.pathname}${window.location.search}${window.location.hash}`);
        }
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, []);

  return <><header className="readonly-panel-header"><div><span className={`readonly-kicker ${technique}`}>{technique.toUpperCase()}</span><h1>测试趋势</h1></div><span className="readonly-update">数据同步 · {syncedAt}</span></header><div className="trend-range-status" aria-label="趋势范围"><span className={range === 'today' ? 'active' : ''}>今日</span><i>Alt + ↑ / ↓</i><span className={range === 'week' ? 'active' : ''}>7 日</span><span className={range === 'month' ? 'active' : ''}>30 日</span></div><ReadOnlyTrendChart values={displayedValues} technique={technique} metric="samples" rangeLabel={labels[range]} /><p className="keyboard-hint">Alt + 1：XAFS　·　Alt + 2：XRD</p></>;
}
