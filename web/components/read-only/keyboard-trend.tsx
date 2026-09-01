'use client';

import { useEffect, useState } from 'react';
import { ReadOnlyTrendChart } from './trend-chart';
import type { DashboardStatistics, SampleTechnique, TrendRange, TrendSeries } from '../../lib/samples/types';

const ranges: TrendRange[] = ['today', 'week', 'month'];
const labels: Record<TrendRange, string> = { today: '今日', week: '7 日', month: '30 日' };

export function KeyboardTrend({ technique, values, statistics }: { technique: SampleTechnique; values: TrendSeries; statistics: DashboardStatistics }) {
  const [range, setRange] = useState<TrendRange>('today');

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
        const nextPort = event.code === 'Digit1' ? '1002' : '1001';
        if (window.location.port !== nextPort) {
          window.location.assign(`${window.location.protocol}//${window.location.hostname}:${nextPort}${window.location.pathname}${window.location.search}${window.location.hash}`);
        }
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, []);

  const current = statistics[range];
  const completionRate = current.submitted ? Math.round(current.completed / current.submitted * 100) : 0;

  return <><header className="readonly-panel-header"><div><span className={`readonly-kicker ${technique}`}>{technique.toUpperCase()}</span><h1>测试趋势</h1></div></header><div className="trend-range-status" aria-label="趋势范围"><div className="trend-range-tabs"><span className={range === 'today' ? 'active' : ''}>今日</span><span className={range === 'week' ? 'active' : ''}>7 日</span><span className={range === 'month' ? 'active' : ''}>30 日</span></div></div><div className="trend-stat-strip"><div><span>提交样品</span><strong>{current.submitted}</strong><small>{labels[range]}总量</small></div><div><span>已完成</span><strong>{current.completed}</strong><small>{completionRate}% 完成率</small></div><div><span>待测试</span><strong>{current.pending}</strong><small>排队等待</small></div><div><span>测试中</span><strong>{current.running}</strong><small>实时任务</small></div></div><ReadOnlyTrendChart values={values[range]} technique={technique} metric="samples" range={range} rangeLabel={labels[range]} /></>;
}
