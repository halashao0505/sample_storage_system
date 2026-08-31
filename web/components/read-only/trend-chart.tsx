import type { SampleTechnique, TrendMetric, TrendRange } from '../../lib/samples/types';

type ReadOnlyTrendChartProps = {
  values: number[];
  technique: SampleTechnique;
  metric: TrendMetric;
  range: TrendRange;
  rangeLabel: string;
};

export function ReadOnlyTrendChart({ values, technique, metric, range, rangeLabel }: ReadOnlyTrendChartProps) {
  const width = 1000; const height = 260; const left = 58; const right = 38; const top = 24; const bottom = 36;
  const chartMaximum = Math.max(100, Math.ceil(Math.max(...values, 0) / 25) * 25);
  const x = (index: number) => left + index * ((width - left - right) / Math.max(1, values.length - 1));
  const y = (value: number) => top + (chartMaximum - value) * ((height - top - bottom) / chartMaximum);
  const points = values.map((value, index) => `${x(index)},${y(value)}`).join(' ');
  const baseline = values.map((value, index) => `${x(index)},${y(Math.max(8, Math.round(value * .87)))}`).join(' ');
  const area = `${left},${height - bottom} ${points} ${width - right},${height - bottom}`;
  const accent = technique === 'xafs' ? '#7654cf' : '#238ba3';
  const metricLabels: Record<TrendMetric, string> = { samples: '样品数', tests: '测试次数', duration: '测试时长' };
  const labelIndexes = [...new Set([0, Math.round((values.length - 1) / 3), Math.round((values.length - 1) * 2 / 3), values.length - 1])];
  const axisLabel = (index: number) => {
    const slot = Math.max(0, labelIndexes.indexOf(index));
    if (range === 'today') return ['8:00', '12:00', '16:00', '21:00'][slot];
    if (range === 'week') return ['7 日前', '5 日前', '3 日前', '今日'][slot];
    return ['30 日前', '20 日前', '10 日前', '今日'][slot];
  };

  return <div className="readonly-chart-wrap">
    <div className="readonly-chart-meta"><span>{metricLabels[metric]} · {rangeLabel}</span><strong className="wave-value">{values.at(-1) ?? 0}</strong></div>
    <svg className="readonly-line-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={`${technique.toUpperCase()} ${metricLabels[metric]}趋势图`}>
      <defs><linearGradient id={`area-${technique}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={accent} stopOpacity=".24" /><stop offset="100%" stopColor={accent} stopOpacity="0" /></linearGradient><linearGradient id={`wave-${technique}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="190" y2="0"><stop offset="0%" stopColor={accent} stopOpacity="0" /><stop offset="35%" stopColor={accent} stopOpacity="0" /><stop offset="49%" stopColor="#f7fbff" stopOpacity=".98" /><stop offset="54%" stopColor={technique === 'xafs' ? '#d9cfff' : '#c6f2f7'} stopOpacity=".98" /><stop offset="68%" stopColor={accent} stopOpacity="0" /><stop offset="100%" stopColor={accent} stopOpacity="0" /><animateTransform attributeName="gradientTransform" type="translate" from="-190 0" to="1000 0" dur="3.8s" repeatCount="indefinite" /></linearGradient></defs>
      {[0, .25, .5, .75, 1].map((ratio) => { const tick = chartMaximum * ratio; return <g key={ratio}><line className="chart-grid-line" x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} /><text className="chart-axis-label" x={left - 9} y={y(tick) + 3} textAnchor="end">{tick}</text></g>; })}
      <polygon points={area} fill={`url(#area-${technique})`} />
      <polyline className="baseline-line" points={baseline} />
      <polyline className="readonly-trend-line" vectorEffect="non-scaling-stroke" style={{ stroke: accent }} points={points} />
      <polyline className="readonly-trend-wave" vectorEffect="non-scaling-stroke" style={{ stroke: `url(#wave-${technique})` }} points={points} />
      {values.map((value, index) => <g key={`${value}-${index}`}><text className="readonly-point-value" x={x(index)} y={y(value) - 12} textAnchor="middle" style={{ fill: accent }}>{value}</text><circle className="readonly-trend-point" vectorEffect="non-scaling-stroke" cx={x(index)} cy={y(value)} r="4.5" style={{ stroke: accent }} />{labelIndexes.includes(index) && <text className="chart-axis-label" x={x(index)} y={height - 9} textAnchor={index === 0 ? 'start' : index === values.length - 1 ? 'end' : 'middle'}>{axisLabel(index)}</text>}</g>)}
    </svg>
    <div className="readonly-chart-legend"><span><i style={{ background: accent }} />当前趋势</span><span><i className="legend-baseline" />{range === 'today' ? '昨日基线' : '上周期基线'}</span></div>
  </div>;
}
