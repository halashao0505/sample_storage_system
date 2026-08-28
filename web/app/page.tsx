'use client';

import { useMemo, useState, type DragEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';

type Scope = 'all' | 'xafs' | 'xrd';
type Metric = 'samples' | 'tests' | 'duration';
type Range = 'today' | 'week' | 'month';
type PanelId = 'trend' | 'devices' | 'records' | 'queue';
type ResizeDirection = 'n' | 'e' | 's' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
type PanelSize = { width: number; height: number };

const resizeDirections: ResizeDirection[] = ['n', 'e', 's', 'w', 'ne', 'nw', 'se', 'sw'];
const defaultPanelSizes: Record<PanelId, PanelSize> = {
  trend: { width: 800, height: 420 },
  devices: { width: 460, height: 548 },
  records: { width: 800, height: 360 },
  queue: { width: 460, height: 360 },
};

const kpiSets = {
  all: [['今日样品', '38', '+12.5%', '较昨日'], ['今日完成', '26', '68.4%', '完成率'], ['测试次数', '52', '1.4 次', '每个样品'], ['累计测试', '7h 32m', '76.2%', '综合利用率'], ['待测试', '11', '16:45', '预计完成']],
  xafs: [['今日样品', '14', '+7.7%', '较昨日'], ['今日完成', '9', '64.3%', '完成率'], ['测试次数', '18', '1.3 次', '每个样品'], ['累计测试', '3h 18m', '72.8%', '设备利用率'], ['待测试', '4', '14:20', '预计完成']],
  xrd: [['今日样品', '24', '+15.2%', '较昨日'], ['今日完成', '17', '70.8%', '完成率'], ['测试次数', '34', '1.4 次', '每个样品'], ['累计测试', '4h 14m', '79.6%', '设备利用率'], ['待测试', '7', '16:45', '预计完成']],
};

const chartSets: Record<Scope, Record<Metric, number[]>> = {
  all: { samples: [26, 34, 31, 47, 42, 58, 51, 66, 61, 73, 64, 80, 76, 69], tests: [31, 42, 39, 55, 52, 68, 62, 77, 69, 86, 78, 92, 88, 84], duration: [18, 27, 24, 39, 36, 48, 44, 58, 54, 71, 63, 79, 72, 67] },
  xafs: { samples: [20, 25, 22, 35, 31, 43, 39, 50, 44, 57, 48, 62, 58, 51], tests: [24, 31, 28, 41, 38, 49, 45, 57, 52, 66, 59, 71, 68, 62], duration: [22, 29, 27, 38, 34, 46, 42, 55, 49, 65, 58, 73, 69, 64] },
  xrd: { samples: [30, 41, 37, 53, 47, 62, 56, 70, 65, 79, 71, 86, 82, 76], tests: [34, 47, 43, 61, 55, 72, 66, 81, 75, 91, 83, 96, 92, 88], duration: [16, 25, 21, 36, 32, 45, 39, 54, 49, 67, 59, 76, 70, 65] },
};

const metricMeta = { samples: ['样品数', '38', '个样品'], tests: ['测试次数', '52', '次测试'], duration: ['测试时长', '7.5', '小时'] } as const;
const records = [
  ['ZJUT-260828-016', 'Fe₂O₃ 标准样', '李四', 'XRD', 'D9-XRD-01', '08:52', '18m 12s', '已完成'],
  ['ZJUT-260828-015', 'Ni foil', '王五', 'XAFS', 'XAFS-01', '08:30', '14m 06s', '已完成'],
  ['ZJUT-260828-014', 'Si Powder', '赵敏', 'XRD', 'D9-XRD-01', '08:05', '21m 48s', '已完成'],
  ['ZJUT-260828-013', 'Alloy-A3', '陈晨', 'XAFS', 'XAFS-01', '07:42', '16m 20s', '失败'],
];
const queues = {
  xafs: [['01', 'ZJUT-260828-019', 'Cu foil', '09:52', '18 min'], ['02', 'ZJUT-260828-022', 'ZnO powder', '10:10', '24 min'], ['03', 'ZJUT-260828-025', 'NiO-03', '10:34', '16 min']],
  xrd: [['01', 'ZJUT-260828-018', 'Polymer film', '09:40', '12 min'], ['02', 'ZJUT-260828-020', 'Si wafer', '09:52', '8 min'], ['03', 'ZJUT-260828-021', 'Fe powder', '10:00', '22 min']],
};

function ScopeMark({ scope }: { scope: Scope }) { return <span className={`scope-mark ${scope}`}>{scope === 'all' ? 'ALL' : scope.toUpperCase()}</span>; }

function WorkspacePanel({ id, title, subtitle, className = '', children, draggingId, size, onDragStart, onDragEnd, onDragOver, onDrop, onResizeStart }: {
  id: PanelId; title: string; subtitle: string; className?: string; children: ReactNode; draggingId: PanelId | null;
  size: PanelSize;
  onDragStart: (event: DragEvent<HTMLElement>, id: PanelId) => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>, id: PanelId) => void;
  onResizeStart: (event: ReactPointerEvent<HTMLSpanElement>, id: PanelId, direction: ResizeDirection) => void;
}) {
  return <article className={`workspace-panel ${className} ${draggingId === id ? 'is-dragging' : ''}`} style={{ width: size.width, height: size.height }} onDragOver={onDragOver} onDrop={(event) => onDrop(event, id)}>
    <header className="panel-bar" draggable onDragStart={(event) => onDragStart(event, id)} onDragEnd={onDragEnd}><span className="panel-grip" aria-hidden="true">⠿</span><div><h2>{title}</h2><p>{subtitle}</p></div><span className="panel-resize-note">拖动排序 · 四边和四角调大小</span></header>
    <div className="panel-body">{children}</div>
    {resizeDirections.map((direction) => <span key={direction} className={`resize-handle resize-${direction}`} onPointerDown={(event) => onResizeStart(event, id, direction)} />)}
  </article>;
}

function InstrumentCard({ kind, name, sampleCode, sampleName, progress, details }: { kind: 'xafs' | 'xrd'; name: string; sampleCode: string; sampleName: string; progress: number; details: [string, string][] }) {
  return <section className={`instrument-card ${kind}`}><div className="instrument-head"><div><span className="instrument-type">{kind.toUpperCase()}</span><strong>{name}</strong></div><span className="live-status"><i />测试中</span></div><div className="sample-identity"><strong>{sampleCode}</strong><span>{sampleName}</span></div><div className="progress-label"><span>测试进度</span><strong>{progress}%</strong></div><div className="progress-track"><i style={{ width: `${progress}%` }} /></div><div className="instrument-details">{details.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></section>;
}

export default function Home() {
  const [scope, setScope] = useState<Scope>('all');
  const [metric, setMetric] = useState<Metric>('samples');
  const [range, setRange] = useState<Range>('today');
  const [queueKind, setQueueKind] = useState<'xafs' | 'xrd'>('xrd');
  const [panelOrder, setPanelOrder] = useState<PanelId[]>(['trend', 'devices', 'records', 'queue']);
  const [panelSizes, setPanelSizes] = useState<Record<PanelId, PanelSize>>(defaultPanelSizes);
  const [draggingId, setDraggingId] = useState<PanelId | null>(null);
  const trend = useMemo(() => {
    const factor = range === 'today' ? 1 : range === 'week' ? .92 : .84;
    const values = chartSets[scope][metric].map((value) => Math.round(value * factor));
    const width = 760; const height = 238; const left = 36; const right = 18; const top = 16; const bottom = 30;
    const x = (index: number) => left + index * ((width - left - right) / (values.length - 1));
    const y = (value: number) => top + (100 - value) * ((height - top - bottom) / 100);
    const points = values.map((value, index) => `${x(index)},${y(value)}`).join(' ');
    const baseline = values.map((value, index) => `${x(index)},${y(Math.max(8, Math.round(value * .87)))}`).join(' ');
    return { values, points, baseline, area: `${left},${height - bottom} ${points} ${width - right},${height - bottom}`, width, height, left, right, bottom, x, y };
  }, [scope, metric, range]);
  const operation = { all: { completed: 26, running: 2, waiting: 11, completion: 67 }, xafs: { completed: 9, running: 1, waiting: 4, completion: 64 }, xrd: { completed: 17, running: 1, waiting: 7, completion: 68 } }[scope];
  const dragStart = (event: DragEvent<HTMLElement>, id: PanelId) => { setDraggingId(id); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', id); };
  const dragOver = (event: DragEvent<HTMLElement>) => event.preventDefault();
  const drop = (event: DragEvent<HTMLElement>, target: PanelId) => { event.preventDefault(); const source = event.dataTransfer.getData('text/plain') as PanelId; if (panelOrder.includes(source) && source !== target) setPanelOrder((current) => { const next = current.filter((id) => id !== source); next.splice(next.indexOf(target), 0, source); return next; }); setDraggingId(null); };
  const startResize = (event: ReactPointerEvent<HTMLSpanElement>, id: PanelId, direction: ResizeDirection) => {
    event.preventDefault(); event.stopPropagation();
    const start = panelSizes[id]; const startX = event.clientX; const startY = event.clientY;
    const horizontal = direction.includes('e') ? 1 : direction.includes('w') ? -1 : 0;
    const vertical = direction.includes('s') ? 1 : direction.includes('n') ? -1 : 0;
    const move = (moveEvent: PointerEvent) => setPanelSizes((current) => ({ ...current, [id]: { width: Math.max(360, start.width + (moveEvent.clientX - startX) * horizontal), height: Math.max(260, start.height + (moveEvent.clientY - startY) * vertical) } }));
    const stop = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', stop); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', stop);
  };
  const shared = { draggingId, onDragStart: dragStart, onDragEnd: () => setDraggingId(null), onDragOver: dragOver, onDrop: drop, onResizeStart: startResize };

  const renderPanel = (id: PanelId) => {
    if (id === 'trend') return <WorkspacePanel key={id} id={id} size={panelSizes[id]} {...shared} className="panel-trend" title="数据统计与趋势" subtitle="样品、测试次数和测试时长统一查看"><div className="panel-actions"><div className="mini-tabs">{(Object.keys(metricMeta) as Metric[]).map((item) => <button key={item} type="button" className={metric === item ? 'active' : ''} onClick={() => setMetric(item)}>{metricMeta[item][0]}</button>)}</div><div className="mini-tabs">{([['today', '今日'], ['week', '7天'], ['month', '30天']] as [Range, string][]).map(([item, label]) => <button key={item} type="button" className={range === item ? 'active' : ''} onClick={() => setRange(item)}>{label}</button>)}</div></div><div className="chart-summary"><strong>{scope === 'all' ? metricMeta[metric][1] : metric === 'samples' ? scope === 'xafs' ? '14' : '24' : metricMeta[metric][1]}</strong><span>{metricMeta[metric][2]}</span><em>↗ 12.5%</em></div><svg className="line-chart" viewBox={`0 0 ${trend.width} ${trend.height}`} role="img" aria-label={`${metricMeta[metric][0]}折线趋势图`}><defs><linearGradient id="trendArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--brand)" stopOpacity=".24" /><stop offset="100%" stopColor="var(--brand)" stopOpacity="0" /></linearGradient></defs>{[0, 25, 50, 75, 100].map((tick) => <g key={tick}><line className="chart-grid-line" x1={trend.left} x2={trend.width - trend.right} y1={trend.y(tick)} y2={trend.y(tick)} /><text className="chart-axis-label" x={trend.left - 9} y={trend.y(tick) + 3} textAnchor="end">{tick}</text></g>)}<polygon className="trend-area" points={trend.area} /><polyline className="baseline-line" points={trend.baseline} /><polyline className="trend-line" points={trend.points} />{trend.values.map((value, index) => <g className="trend-point" key={`${value}-${index}`}><circle cx={trend.x(index)} cy={trend.y(value)} r="4" />{[0, 4, 8, 13].includes(index) && <text className="chart-axis-label" x={trend.x(index)} y={trend.height - 8} textAnchor={index === 0 ? 'start' : index === 13 ? 'end' : 'middle'}>{`${8 + index}:00`}</text>}</g>)}</svg><div className="chart-legend"><span><i className="legend-all" />当前范围</span><span><i className="legend-baseline" />昨日基线</span></div></WorkspacePanel>;
    if (id === 'devices') return <WorkspacePanel key={id} id={id} size={panelSizes[id]} {...shared} className="panel-devices" title="设备状态与并行执行" subtitle="每台谱仪独立显示当前任务，不混合排队"><div className="operation-strip"><div className="completion-ring" style={{ background: `conic-gradient(var(--brand) 0 ${operation.completion}%, #eaf0f7 ${operation.completion}% 100%)` }}><div><strong>{operation.completion}%</strong><span>完成度</span></div></div><div><strong>{operation.completed}</strong><span>今日完成</span></div><div><strong>{operation.running}</strong><span>并行执行</span></div><div><strong>{operation.waiting}</strong><span>待测试</span></div></div><div className="device-stack"><InstrumentCard kind="xafs" name="XAFS-01" sampleCode="ZJUT-260828-017" sampleName="Ni foil · 王五" progress={72} details={[["当前能量", "7125.4 eV"], ["扫描点", "726 / 1000"], ["预计剩余", "03:21"]]} /><InstrumentCard kind="xrd" name="D9-XRD-01" sampleCode="ZJUT-260828-018" sampleName="Polymer film · 张三" progress={46} details={[["当前 2Theta", "35.27°"], ["扫描点", "462 / 1000"], ["预计剩余", "06:42"]]} /></div></WorkspacePanel>;
    if (id === 'records') return <WorkspacePanel key={id} id={id} size={panelSizes[id]} {...shared} className="panel-records" title="样品档案与测试记录" subtitle="当前页面先汇总展示样品、设备、测试时长和结果"><div className="table-scroll"><table><thead><tr><th>样品</th><th>申请人</th><th>技术</th><th>设备</th><th>开始</th><th>耗时</th><th>状态</th></tr></thead><tbody>{records.map((row) => <tr key={row[0]}><td><strong>{row[0]}</strong><span>{row[1]}</span></td><td>{row[2]}</td><td><span className={`tech-tag ${row[3].toLowerCase()}`}>{row[3]}</span></td><td>{row[4]}</td><td>{row[5]}</td><td>{row[6]}</td><td><span className={`state-tag ${row[7] === '失败' ? 'failed' : 'done'}`}>{row[7]}</span></td></tr>)}</tbody></table></div></WorkspacePanel>;
    return <WorkspacePanel key={id} id={id} size={panelSizes[id]} {...shared} className="panel-queue" title="待测试队列" subtitle="按设备独立排程，拖动标题栏可将此模块移动到更靠前位置"><div className="queue-tabs"><button type="button" className={queueKind === 'xafs' ? 'active' : ''} onClick={() => setQueueKind('xafs')}>XAFS <span>4</span></button><button type="button" className={queueKind === 'xrd' ? 'active' : ''} onClick={() => setQueueKind('xrd')}>XRD <span>7</span></button></div><ol className="queue-list">{queues[queueKind].map(([index, code, name, start, duration]) => <li key={code}><span className="queue-index">{index}</span><div><strong>{code}</strong><small>{name} · 预计 {start}</small></div><span className="queue-duration">{duration}</span></li>)}</ol><div className="queue-finish"><span>预计队列完成</span><strong>{queueKind === 'xrd' ? '今天 16:45' : '今天 14:20'}</strong></div></WorkspacePanel>;
  };

  return <div className="workspace-shell"><header className="workspace-topbar"><div className="brand-block"><span className="brand-symbol">Z</span><div><strong>ZJUT</strong><span>Sample Platform</span></div></div><label className="search-box"><span aria-hidden="true">⌕</span><input aria-label="搜索样品" placeholder="搜索样品编号、名称、申请人或课题组" /><kbd>Ctrl K</kbd></label><div className="topbar-status"><span className="online-dot" />数据同步 · 10 秒前</div><button className="profile" type="button"><span>徐</span><div><strong>管理员</strong><small>平台主管</small></div></button></header><main className="workspace-content"><section className="page-heading"><div><p>LAB OPERATIONS · ONE PAGE WORKSPACE</p><h1>样品测试运营工作台</h1><span>概览、设备状态、样品档案、记录、队列和统计全部集中在这一页。</span></div><div className="scope-switch" aria-label="谱仪范围">{(['all', 'xafs', 'xrd'] as Scope[]).map((item) => <button key={item} className={scope === item ? 'active' : ''} type="button" onClick={() => setScope(item)}><ScopeMark scope={item} /> {item === 'all' ? '全部谱仪' : item.toUpperCase()}</button>)}</div></section><section className="system-strip" aria-label="平台状态"><span><i className="online-dot" />平台运行正常</span><span>双谱仪已连接</span><span>工作日 · 2026年8月28日</span><strong>模块可拖动交换位置，四边和四角均可拉伸</strong></section><section className="kpi-grid" aria-label="今日关键指标">{kpiSets[scope].map(([label, value, note, caption], index) => <article className="kpi-card" key={label}><div className="kpi-label"><span>{label}</span><i>{String(index + 1).padStart(2, '0')}</i></div><strong>{value}</strong><p><em>{note}</em><span>{caption}</span></p></article>)}</section><section className="workspace-grid" aria-label="运营模块">{panelOrder.map(renderPanel)}</section></main></div>;
}
