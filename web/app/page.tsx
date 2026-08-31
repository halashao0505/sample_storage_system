'use client';

import { useEffect, useMemo, useRef, useState, type DragEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { SampleDrawer } from '../components/workspace/sample-drawer';
import { TrendChart } from '../components/workspace/trend-chart';
import { WorkspacePanel, type PanelId, type PanelSize, type ResizeDirection } from '../components/workspace/workspace-panel';
import { dashboardSnapshot } from '../lib/samples/mock-sample-repository';
import type { InstrumentScope, SampleRecord, SampleTechnique, TrendMetric, TrendRange } from '../lib/samples/types';

const layoutStorageKey = 'zjut-sample-workspace-layout-v1';
const defaultPanelOrder: PanelId[] = ['trend', 'devices', 'records', 'queue'];
const defaultPanelSizes: Record<PanelId, PanelSize> = {
  trend: { width: 800, height: 420 }, devices: { width: 460, height: 548 }, records: { width: 800, height: 370 }, queue: { width: 460, height: 370 },
};
const metricMeta: Record<TrendMetric, { label: string; unit: string }> = {
  samples: { label: '样品数', unit: '个样品' }, tests: { label: '测试次数', unit: '次测试' }, duration: { label: '测试时长', unit: '小时' },
};
const stateLabels = { queued: '待测试', running: '测试中', completed: '已完成', failed: '需复测' } as const;

function ScopeMark({ scope }: { scope: InstrumentScope }) {
  return <span className={`scope-mark ${scope}`}>{scope === 'all' ? 'ALL' : scope.toUpperCase()}</span>;
}

function isInScope<T extends { technique: SampleTechnique }>(item: T, scope: InstrumentScope) {
  return scope === 'all' || item.technique === scope;
}

function InstrumentCard({ instrument, sample, onSelect }: { instrument: typeof dashboardSnapshot.instruments[number]; sample?: SampleRecord; onSelect: (sample: SampleRecord) => void }) {
  const currentLabel = instrument.technique === 'xafs' ? '当前能量' : '当前 2Theta';
  return <section className={`instrument-card ${instrument.technique}`}>
    <div className="instrument-head"><div><span className="instrument-type">{instrument.technique.toUpperCase()}</span><strong>{instrument.name}</strong></div><span className={`live-status ${instrument.connection}`}><i />{instrument.connection === 'online' ? '测试中' : '已离线'}</span></div>
    <button type="button" className="instrument-sample" aria-label={`查看 ${sample?.id ?? '当前样品'} 详情`} onClick={() => sample && onSelect(sample)} disabled={!sample}>
      <strong>{sample?.id ?? '等待下一任务'}</strong><span>{sample ? `${sample.name} · ${sample.applicant}` : '暂无正在执行的样品'}</span>
    </button>
    <div className="progress-label"><span>测试进度</span><strong>{instrument.scanProgress}%</strong></div>
    <div className="progress-track active"><i style={{ width: `${instrument.scanProgress}%` }} /></div>
    <div className="instrument-details"><div><span>{currentLabel}</span><strong>{instrument.currentValue}</strong></div><div><span>扫描点</span><strong>{instrument.scannedPoints} / {instrument.totalPoints}</strong></div><div><span>预计剩余</span><strong>{instrument.remaining}</strong></div></div>
  </section>;
}

export default function Home() {
  const [scope, setScope] = useState<InstrumentScope>('all');
  const [metric, setMetric] = useState<TrendMetric>('samples');
  const [range, setRange] = useState<TrendRange>('today');
  const [queueKind, setQueueKind] = useState<SampleTechnique>('xrd');
  const [query, setQuery] = useState('');
  const [selectedSample, setSelectedSample] = useState<SampleRecord | null>(null);
  const [panelOrder, setPanelOrder] = useState<PanelId[]>(defaultPanelOrder);
  const [panelSizes, setPanelSizes] = useState<Record<PanelId, PanelSize>>(defaultPanelSizes);
  const [draggingId, setDraggingId] = useState<PanelId | null>(null);
  const [layoutLoaded, setLayoutLoaded] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = window.localStorage.getItem(layoutStorageKey);
        if (saved) {
          const layout = JSON.parse(saved) as { order?: PanelId[]; sizes?: Record<PanelId, PanelSize> };
          if (layout.order?.length === defaultPanelOrder.length && layout.order.every((id) => defaultPanelOrder.includes(id))) setPanelOrder(layout.order);
          if (layout.sizes && defaultPanelOrder.every((id) => Number.isFinite(layout.sizes[id]?.width) && Number.isFinite(layout.sizes[id]?.height))) setPanelSizes(layout.sizes);
        }
      } catch { window.localStorage.removeItem(layoutStorageKey); }
      setLayoutLoaded(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); searchInput.current?.focus(); } };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, []);

  useEffect(() => {
    if (layoutLoaded) window.localStorage.setItem(layoutStorageKey, JSON.stringify({ order: panelOrder, sizes: panelSizes }));
  }, [layoutLoaded, panelOrder, panelSizes]);

  const visibleSamples = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return dashboardSnapshot.samples.filter((sample) => isInScope(sample, scope) && (!normalizedQuery || [sample.id, sample.name, sample.applicant, sample.group, sample.instrument, sample.technique].some((value) => value.toLowerCase().includes(normalizedQuery))));
  }, [query, scope]);
  const visibleInstruments = dashboardSnapshot.instruments.filter((instrument) => isInScope(instrument, scope));
  const activeQueueKind = scope === 'all' ? queueKind : scope;
  const visibleQueues = dashboardSnapshot.queues.filter((item) => item.technique === activeQueueKind);
  const running = visibleSamples.filter((sample) => sample.state === 'running').length;
  const completed = visibleSamples.filter((sample) => sample.state === 'completed').length;
  const queued = visibleSamples.filter((sample) => sample.state === 'queued').length;
  const lastTrendValue = dashboardSnapshot.trends[scope][metric].at(-1) ?? 0;
  const values = dashboardSnapshot.trends[scope][metric].map((value) => Math.round(value * (range === 'today' ? 1 : range === 'week' ? .92 : .84)));
  const completion = visibleSamples.length ? Math.round((completed / Math.max(1, completed + running + queued)) * 100) : 0;

  const dragStart = (event: DragEvent<HTMLElement>, id: PanelId) => { setDraggingId(id); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', id); };
  const dragOver = (event: DragEvent<HTMLElement>) => event.preventDefault();
  const drop = (event: DragEvent<HTMLElement>, target: PanelId) => {
    event.preventDefault(); const source = event.dataTransfer.getData('text/plain') as PanelId;
    if (panelOrder.includes(source) && source !== target) setPanelOrder((current) => { const next = current.filter((id) => id !== source); next.splice(next.indexOf(target), 0, source); return next; });
    setDraggingId(null);
  };
  const startResize = (event: ReactPointerEvent<HTMLSpanElement>, id: PanelId, direction: ResizeDirection) => {
    event.preventDefault(); event.stopPropagation();
    const start = panelSizes[id]; const startX = event.clientX; const startY = event.clientY;
    const horizontal = direction.includes('e') ? 1 : direction.includes('w') ? -1 : 0;
    const vertical = direction.includes('s') ? 1 : direction.includes('n') ? -1 : 0;
    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
    const move = (moveEvent: PointerEvent) => setPanelSizes((current) => ({ ...current, [id]: { width: horizontal ? clamp(start.width + (moveEvent.clientX - startX) * horizontal, 360, 1200) : current[id].width, height: vertical ? clamp(start.height + (moveEvent.clientY - startY) * vertical, 260, 900) : current[id].height } }));
    const stop = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', stop); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', stop);
  };
  const resetSize = (id: PanelId) => setPanelSizes((current) => ({ ...current, [id]: defaultPanelSizes[id] }));
  const panelProps = { isDragging: false, onDragStart: dragStart, onDragEnd: () => setDraggingId(null), onDragOver: dragOver, onDrop: drop, onResizeStart: startResize, onResetSize: resetSize };

  const renderPanel = (id: PanelId) => {
    const props = { ...panelProps, id, size: panelSizes[id], isDragging: draggingId === id };
    if (id === 'trend') return <WorkspacePanel key={id} {...props} title="数据统计与趋势" subtitle="随范围和指标变化的运营趋势">
      <div className="panel-actions"><div className="mini-tabs">{(Object.keys(metricMeta) as TrendMetric[]).map((item) => <button key={item} type="button" className={metric === item ? 'active' : ''} onClick={() => setMetric(item)}>{metricMeta[item].label}</button>)}</div><div className="mini-tabs">{([['today', '今日'], ['week', '7天'], ['month', '30天']] as [TrendRange, string][]).map(([item, label]) => <button key={item} type="button" className={range === item ? 'active' : ''} onClick={() => setRange(item)}>{label}</button>)}</div></div>
      <div className="chart-summary"><strong>{lastTrendValue}</strong><span>{metricMeta[metric].unit}</span><em>↗ 12.5%</em></div><TrendChart values={values} metric={metric} scope={scope} />
    </WorkspacePanel>;
    if (id === 'devices') return <WorkspacePanel key={id} {...props} title="设备状态与并行执行" subtitle="每台谱仪独立显示当前任务，不混合排队">
      <div className="operation-strip"><div className="completion-ring" style={{ background: `conic-gradient(var(--brand) 0 ${completion}%, #eaf0f7 ${completion}% 100%)` }}><div><strong>{completion}%</strong><span>完成度</span></div></div><div><strong>{completed}</strong><span>已完成</span></div><div><strong>{running}</strong><span>并行执行</span></div><div><strong>{queued}</strong><span>待测试</span></div></div>
      <div className="device-stack">{visibleInstruments.map((instrument) => <InstrumentCard key={instrument.id} instrument={instrument} sample={dashboardSnapshot.samples.find((sample) => sample.id === instrument.activeSampleId)} onSelect={setSelectedSample} />)}</div>
    </WorkspacePanel>;
    if (id === 'records') return <WorkspacePanel key={id} {...props} title="样品档案与测试记录" subtitle={query ? `已匹配 ${visibleSamples.length} 条样品记录` : '点击任意记录查看样品详情与数据入口'}>
      <div className="table-scroll"><table><thead><tr><th>样品</th><th>申请人</th><th>技术</th><th>设备</th><th>开始</th><th>耗时</th><th>状态</th></tr></thead><tbody>{visibleSamples.map((sample) => <tr key={sample.id} tabIndex={0} onClick={() => setSelectedSample(sample)} onKeyDown={(event) => { if (event.key === 'Enter') setSelectedSample(sample); }}><td><strong>{sample.id}</strong><span>{sample.name}</span></td><td>{sample.applicant}</td><td><span className={`tech-tag ${sample.technique}`}>{sample.technique.toUpperCase()}</span></td><td>{sample.instrument}</td><td>{sample.startedAt}</td><td>{sample.duration}</td><td><span className={`state-tag ${sample.state}`}>{stateLabels[sample.state]}</span></td></tr>)}{visibleSamples.length === 0 && <tr><td className="empty-table" colSpan={7}>没有匹配的样品记录</td></tr>}</tbody></table></div>
    </WorkspacePanel>;
    return <WorkspacePanel key={id} {...props} title="待测试队列" subtitle="按设备独立排程，完成时间随筛选范围变化">
      <div className="queue-tabs">{(['xafs', 'xrd'] as SampleTechnique[]).map((technique) => <button key={technique} type="button" className={activeQueueKind === technique ? 'active' : ''} onClick={() => setQueueKind(technique)} disabled={scope !== 'all' && technique !== scope}>{technique.toUpperCase()} <span>{dashboardSnapshot.queues.filter((item) => item.technique === technique).length}</span></button>)}</div>
      <ol className="queue-list">{visibleQueues.map((item) => <li key={item.sampleId}><span className="queue-index">{String(item.position).padStart(2, '0')}</span><button type="button" onClick={() => setSelectedSample(dashboardSnapshot.samples.find((sample) => sample.id === item.sampleId) ?? null)}><strong>{item.sampleId}</strong><small>{item.sampleName} · 预计 {item.scheduledAt}</small></button><span className="queue-duration">{item.estimate}</span></li>)}</ol>
      <div className="queue-finish"><span>预计队列完成</span><strong>{activeQueueKind === 'xrd' ? '今天 16:45' : '今天 14:20'}</strong></div>
    </WorkspacePanel>;
  };

  return <div className="workspace-shell">
    <header className="workspace-topbar"><div className="brand-block"><span className="brand-symbol">Z</span><div><strong>ZJUT</strong><span>Sample Platform</span></div></div><label className="search-box"><span aria-hidden="true">⌕</span><input ref={searchInput} value={query} onChange={(event) => setQuery(event.target.value)} aria-label="搜索样品" placeholder="搜索编号、名称、申请人、课题组或设备" /><kbd>Ctrl K</kbd></label><div className="topbar-status"><span className="online-dot" />数据同步 · {dashboardSnapshot.syncedAt}</div><button className="profile" type="button"><span>徐</span><div><strong>管理员</strong><small>平台主管</small></div></button></header>
    <main className="workspace-content"><section className="page-heading"><div><p>LAB OPERATIONS · ONE PAGE WORKSPACE</p><h1>样品测试运营工作台</h1><span>统一查看 XAFS、XRD 样品、设备、队列、记录与趋势。</span></div><div className="scope-switch" aria-label="谱仪范围">{(['all', 'xafs', 'xrd'] as InstrumentScope[]).map((item) => <button key={item} className={scope === item ? 'active' : ''} type="button" onClick={() => setScope(item)}><ScopeMark scope={item} /> {item === 'all' ? '全部' : item.toUpperCase()}</button>)}</div></section>
    <section className="system-strip" aria-label="平台状态"><span><i className="online-dot" />平台运行正常</span><span>2 台谱仪已连接</span><span>工作日 · 2026年8月31日</span><strong>当前为演示数据 · 已预留 JSON 与数据库接入边界</strong></section>
    <section className="kpi-grid" aria-label="当前关键指标"><article className="kpi-card"><div className="kpi-label"><span>样品档案</span><i>01</i></div><strong>{visibleSamples.length}</strong><p><em>{query ? '搜索结果' : '当前范围'}</em><span>条可见记录</span></p></article><article className="kpi-card"><div className="kpi-label"><span>并行测试</span><i>02</i></div><strong>{running}</strong><p><em>运行中</em><span>当前设备任务</span></p></article><article className="kpi-card"><div className="kpi-label"><span>已完成</span><i>03</i></div><strong>{completed}</strong><p><em>{completion}%</em><span>当前范围完成度</span></p></article><article className="kpi-card"><div className="kpi-label"><span>待测试</span><i>04</i></div><strong>{queued}</strong><p><em>{activeQueueKind.toUpperCase()}</em><span>设备独立队列</span></p></article><article className="kpi-card"><div className="kpi-label"><span>在线设备</span><i>05</i></div><strong>{visibleInstruments.filter((item) => item.connection === 'online').length}</strong><p><em>数据已同步</em><span>10 秒前更新</span></p></article></section>
    <section className="workspace-grid" aria-label="运营模块">{panelOrder.map(renderPanel)}</section></main>
    <SampleDrawer sample={selectedSample} onClose={() => setSelectedSample(null)} />
  </div>;
}
