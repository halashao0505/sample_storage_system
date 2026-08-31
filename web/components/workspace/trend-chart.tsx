'use client';

import { useMemo, useState } from 'react';
import type { InstrumentScope, TrendMetric } from '../../lib/samples/types';

type TrendChartProps = {
  values: number[];
  metric: TrendMetric;
  scope: InstrumentScope;
};

const metricUnit: Record<TrendMetric, string> = { samples: '个样品', tests: '次测试', duration: '小时' };

export function TrendChart({ values, metric, scope }: TrendChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const chart = useMemo(() => {
    const width = 760; const height = 238; const left = 36; const right = 18; const top = 16; const bottom = 30;
    const x = (index: number) => left + index * ((width - left - right) / (values.length - 1));
    const y = (value: number) => top + (100 - value) * ((height - top - bottom) / 100);
    const points = values.map((value, index) => `${x(index)},${y(value)}`).join(' ');
    const baseline = values.map((value, index) => `${x(index)},${y(Math.max(8, Math.round(value * .87)))}`).join(' ');
    return { width, height, left, right, bottom, x, y, points, baseline, area: `${left},${height - bottom} ${points} ${width - right},${height - bottom}` };
  }, [values]);
  const accent = scope === 'xafs' ? '#7654cf' : scope === 'xrd' ? '#238ba3' : '#356ae6';
  const visibleIndex = activeIndex ?? values.length - 1;

  return <div className="trend-chart-wrap">
    <svg className="line-chart" viewBox={`0 0 ${chart.width} ${chart.height}`} role="img" aria-label={`${metric} 折线趋势图`} onMouseLeave={() => setActiveIndex(null)} onMouseMove={(event) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const relative = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      setActiveIndex(Math.round(relative * (values.length - 1)));
    }}>
      <defs><linearGradient id="trendArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={accent} stopOpacity=".24" /><stop offset="100%" stopColor={accent} stopOpacity="0" /></linearGradient></defs>
      {[0, 25, 50, 75, 100].map((tick) => <g key={tick}><line className="chart-grid-line" x1={chart.left} x2={chart.width - chart.right} y1={chart.y(tick)} y2={chart.y(tick)} /><text className="chart-axis-label" x={chart.left - 9} y={chart.y(tick) + 3} textAnchor="end">{tick}</text></g>)}
      <polygon className="trend-area" points={chart.area} />
      <polyline className="baseline-line" points={chart.baseline} />
      <polyline className="trend-line" style={{ stroke: accent }} points={chart.points} />
      {activeIndex !== null && <line className="chart-hover-line" x1={chart.x(activeIndex)} x2={chart.x(activeIndex)} y1={16} y2={chart.height - chart.bottom} />}
      {values.map((value, index) => <g className={`trend-point ${visibleIndex === index ? 'is-active' : ''}`} key={`${value}-${index}`}><circle cx={chart.x(index)} cy={chart.y(value)} r={visibleIndex === index ? '5' : '4'} style={{ stroke: accent }} />{[0, 4, 8, 13].includes(index) && <text className="chart-axis-label" x={chart.x(index)} y={chart.height - 8} textAnchor={index === 0 ? 'start' : index === 13 ? 'end' : 'middle'}>{`${8 + index}:00`}</text>}</g>)}
      {activeIndex !== null && <g className="chart-tooltip" transform={`translate(${Math.min(chart.width - 72, Math.max(chart.left, chart.x(activeIndex) - 32))},${Math.max(4, chart.y(values[activeIndex]) - 38)})`}><rect width="66" height="27" rx="5" /><text x="33" y="12" textAnchor="middle">{`${8 + activeIndex}:00`}</text><text x="33" y="22" textAnchor="middle">{`${values[activeIndex]} ${metricUnit[metric]}`}</text></g>}
    </svg>
    <div className="chart-legend"><span><i className="legend-all" style={{ background: accent }} />当前范围</span><span><i className="legend-baseline" />昨日基线</span></div>
  </div>;
}
