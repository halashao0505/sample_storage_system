'use client';

import { useMemo, useState } from 'react';

type Scope = 'all' | 'xafs' | 'xrd';
type Metric = 'samples' | 'tests' | 'duration';
type Range = 'today' | 'week' | 'month';

const navItems = [
  ['概览', 'Overview', '01'],
  ['排队列表', 'Queue', '02'],
  ['样品档案', 'Samples', '03'],
  ['测试记录', 'History', '04'],
  ['数据统计', 'Analytics', '05'],
];

const kpiSets = {
  all: [
    ['今日样品', '38', '+12.5%', '较昨日'],
    ['今日完成', '26', '68.4%', '完成率'],
    ['测试次数', '52', '1.4 次', '每个样品'],
    ['累计测试', '7h 32m', '76.2%', '综合利用率'],
    ['待测试', '11', '16:45', '预计全部完成'],
  ],
  xafs: [
    ['今日样品', '14', '+7.7%', '较昨日'],
    ['今日完成', '9', '64.3%', '完成率'],
    ['测试次数', '18', '1.3 次', '每个样品'],
    ['累计测试', '3h 18m', '72.8%', '设备利用率'],
    ['待测试', '4', '14:20', '预计全部完成'],
  ],
  xrd: [
    ['今日样品', '24', '+15.2%', '较昨日'],
    ['今日完成', '17', '70.8%', '完成率'],
    ['测试次数', '34', '1.4 次', '每个样品'],
    ['累计测试', '4h 14m', '79.6%', '设备利用率'],
    ['待测试', '7', '16:45', '预计全部完成'],
  ],
};

const chartSets: Record<Scope, Record<Metric, number[]>> = {
  all: {
    samples: [26, 34, 31, 47, 42, 58, 51, 66, 61, 73, 64, 80, 76, 69],
    tests: [31, 42, 39, 55, 52, 68, 62, 77, 69, 86, 78, 92, 88, 84],
    duration: [18, 27, 24, 39, 36, 48, 44, 58, 54, 71, 63, 79, 72, 67],
  },
  xafs: {
    samples: [20, 25, 22, 35, 31, 43, 39, 50, 44, 57, 48, 62, 58, 51],
    tests: [24, 31, 28, 41, 38, 49, 45, 57, 52, 66, 59, 71, 68, 62],
    duration: [22, 29, 27, 38, 34, 46, 42, 55, 49, 65, 58, 73, 69, 64],
  },
  xrd: {
    samples: [30, 41, 37, 53, 47, 62, 56, 70, 65, 79, 71, 86, 82, 76],
    tests: [34, 47, 43, 61, 55, 72, 66, 81, 75, 91, 83, 96, 92, 88],
    duration: [16, 25, 21, 36, 32, 45, 39, 54, 49, 67, 59, 76, 70, 65],
  },
};

const metricMeta = {
  samples: ['样品数', '38', '个样品'],
  tests: ['测试次数', '52', '次测试'],
  duration: ['测试时长', '7.5', '小时'],
};

const records = [
  ['ZJUT-260828-016', 'Fe₂O₃ 标准样', '李四', 'XRD', 'D9-XRD-01', '08:52', '18m 12s', '已完成'],
  ['ZJUT-260828-015', 'Ni foil', '王五', 'XAFS', 'XAFS-01', '08:30', '14m 06s', '已完成'],
  ['ZJUT-260828-014', 'Si Powder', '赵敏', 'XRD', 'D9-XRD-01', '08:05', '21m 48s', '已完成'],
  ['ZJUT-260828-013', 'Alloy-A3', '陈晨', 'XAFS', 'XAFS-01', '07:42', '16m 20s', '失败'],
];

const queues = {
  xafs: [
    ['01', 'ZJUT-260828-019', 'Cu foil', '09:52', '18 min'],
    ['02', 'ZJUT-260828-022', 'ZnO powder', '10:10', '24 min'],
    ['03', 'ZJUT-260828-025', 'NiO-03', '10:34', '16 min'],
  ],
  xrd: [
    ['01', 'ZJUT-260828-018', 'Polymer film', '09:40', '12 min'],
    ['02', 'ZJUT-260828-020', 'Si wafer', '09:52', '8 min'],
    ['03', 'ZJUT-260828-021', 'Fe powder', '10:00', '22 min'],
  ],
};

function ScopeMark({ scope }: { scope: Scope }) {
  return <span className={`scope-mark ${scope}`}>{scope === 'all' ? 'ALL' : scope.toUpperCase()}</span>;
}

function InstrumentCard({
  kind,
  name,
  sampleCode,
  sampleName,
  progress,
  status,
  details,
}: {
  kind: 'xafs' | 'xrd';
  name: string;
  sampleCode: string;
  sampleName: string;
  progress: number;
  status: string;
  details: [string, string][];
}) {
  return (
    <article className={`instrument-card ${kind}`}>
      <div className="instrument-head">
        <div>
          <span className="instrument-type">{kind.toUpperCase()}</span>
          <strong>{name}</strong>
        </div>
        <span className="live-status"><i />{status}</span>
      </div>
      <div className="sample-identity">
        <strong>{sampleCode}</strong>
        <span>{sampleName}</span>
      </div>
      <div className="progress-label"><span>测试进度</span><strong>{progress}%</strong></div>
      <div className="progress-track"><i style={{ width: `${progress}%` }} /></div>
      <div className="instrument-details">
        {details.map(([label, value]) => (
          <div key={label}><span>{label}</span><strong>{value}</strong></div>
        ))}
      </div>
      <button className="ghost-link" type="button">查看执行详情 <span>→</span></button>
    </article>
  );
}

export default function Home() {
  const [scope, setScope] = useState<Scope>('all');
  const [metric, setMetric] = useState<Metric>('samples');
  const [range, setRange] = useState<Range>('today');
  const [queueKind, setQueueKind] = useState<'xafs' | 'xrd'>('xrd');
  const [mobileNav, setMobileNav] = useState(false);

  const trend = useMemo(() => {
    const factor = range === 'today' ? 1 : range === 'week' ? 0.92 : 0.84;
    const values = chartSets[scope][metric].map((value) => Math.round(value * factor));
    const width = 760;
    const height = 238;
    const left = 36;
    const right = 18;
    const top = 16;
    const bottom = 30;
    const x = (index: number) => left + index * ((width - left - right) / (values.length - 1));
    const y = (value: number) => top + (100 - value) * ((height - top - bottom) / 100);
    const points = values.map((value, index) => `${x(index)},${y(value)}`).join(' ');
    const baseline = values.map((value, index) => `${x(index)},${y(Math.max(8, Math.round(value * .87)))}`).join(' ');
    const area = `${left},${height - bottom} ${points} ${width - right},${height - bottom}`;
    return { values, points, baseline, area, width, height, left, right, top, bottom, x, y };
  }, [scope, metric, range]);

  const operationData = {
    all: { completed: 26, running: 2, waiting: 11, completion: 67 },
    xafs: { completed: 9, running: 1, waiting: 4, completion: 64 },
    xrd: { completed: 17, running: 1, waiting: 7, completion: 68 },
  }[scope];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
        <div className="brand-block">
          <span className="brand-symbol">Z</span>
          <div><strong>ZJUT</strong><span>Sample Platform</span></div>
        </div>

        <nav aria-label="主要导航">
          <p className="nav-caption">工作区</p>
          {navItems.map(([cn, en, number], index) => (
            <button className={`nav-item ${index === 0 ? 'active' : ''}`} type="button" key={en}>
              <span className="nav-number">{number}</span>
              <span><strong>{cn}</strong><small>{en}</small></span>
              {en === 'Queue' && <em>11</em>}
            </button>
          ))}
          <p className="nav-caption system-caption">系统</p>
          <button className="nav-item" type="button"><span className="nav-number">06</span><span><strong>设备状态</strong><small>Devices</small></span></button>
          <button className="nav-item" type="button"><span className="nav-number">07</span><span><strong>系统设置</strong><small>Settings</small></span></button>
        </nav>

        <div className="system-health">
          <span className="health-dot" />
          <div><strong>平台运行正常</strong><span>双谱仪已连接</span></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu" type="button" aria-label="打开导航" onClick={() => setMobileNav(!mobileNav)}>☰</button>
          <label className="search-box">
            <span aria-hidden="true">⌕</span>
            <input aria-label="搜索样品" placeholder="搜索样品编号、名称、申请人或课题组" />
            <kbd>Ctrl K</kbd>
          </label>
          <div className="topbar-right">
            <div className="sync-state"><i /><span><small>数据同步</small><strong>10 秒前</strong></span></div>
            <div className="today"><small>工作日</small><strong>2026年8月28日</strong></div>
            <button className="profile" type="button"><span>徐</span><div><strong>管理员</strong><small>平台主管</small></div></button>
          </div>
        </header>

        <div className="page-content">
          <section className="page-heading">
            <div>
              <p>LAB OPERATIONS</p>
              <h1>今日测试概览</h1>
              <span>实时掌握样品进度、等待队列与测试结果。</span>
            </div>
            <div className="scope-switch" aria-label="谱仪范围">
              {(['all', 'xafs', 'xrd'] as Scope[]).map((item) => (
                <button key={item} className={scope === item ? 'active' : ''} type="button" onClick={() => setScope(item)}>
                  <ScopeMark scope={item} /> {item === 'all' ? '全部谱仪' : item.toUpperCase()}
                </button>
              ))}
            </div>
          </section>

          <section className="kpi-grid" aria-label="今日关键指标">
            {kpiSets[scope].map(([label, value, note, caption], index) => (
              <article className="kpi-card" key={label}>
                <div className="kpi-label"><span>{label}</span><i>{String(index + 1).padStart(2, '0')}</i></div>
                <strong>{value}</strong>
                <p><em>{note}</em><span>{caption}</span></p>
              </article>
            ))}
          </section>

          <section className="dashboard-top">
            <article className="panel trend-panel">
              <div className="panel-header">
                <div><h2>测试趋势</h2><p>按统一统计口径查看多谱仪运行量</p></div>
                <div className="panel-controls">
                  <div className="mini-tabs">
                    {(Object.keys(metricMeta) as Metric[]).map((item) => (
                      <button key={item} type="button" className={metric === item ? 'active' : ''} onClick={() => setMetric(item)}>{metricMeta[item][0]}</button>
                    ))}
                  </div>
                  <div className="mini-tabs">
                    {([['today', '今日'], ['week', '7天'], ['month', '30天']] as [Range, string][]).map(([item, label]) => (
                      <button key={item} type="button" className={range === item ? 'active' : ''} onClick={() => setRange(item)}>{label}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="chart-summary">
                <strong>{scope === 'all' ? metricMeta[metric][1] : metric === 'samples' ? (scope === 'xafs' ? '14' : '24') : metricMeta[metric][1]}</strong>
                <span>{metricMeta[metric][2]}</span>
                <em>↗ 12.5%</em>
              </div>
              <div className="trend-visuals">
                <div className="line-chart-wrap">
                  <svg className="line-chart" viewBox={`0 0 ${trend.width} ${trend.height}`} role="img" aria-label={`${metricMeta[metric][0]}折线趋势图`}>
                    <title>{metricMeta[metric][0]}随时间变化趋势</title>
                    <defs>
                      <linearGradient id="trendArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--brand)" stopOpacity=".24" />
                        <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {[0, 25, 50, 75, 100].map((tick) => {
                      const tickY = trend.y(tick);
                      return (
                        <g key={tick}>
                          <line className="chart-grid-line" x1={trend.left} x2={trend.width - trend.right} y1={tickY} y2={tickY} />
                          <text className="chart-axis-label" x={trend.left - 9} y={tickY + 3} textAnchor="end">{tick}</text>
                        </g>
                      );
                    })}
                    <polygon className="trend-area" points={trend.area} />
                    <polyline className="baseline-line" points={trend.baseline} />
                    <polyline className="trend-line" points={trend.points} />
                    {trend.values.map((value, index) => (
                      <g className="trend-point" key={`${value}-${index}`}>
                        <circle cx={trend.x(index)} cy={trend.y(value)} r="4"><title>{`${8 + index}:00 · ${value}`}</title></circle>
                        {[0, 4, 8, 13].includes(index) && (
                          <text className="chart-axis-label x-label" x={trend.x(index)} y={trend.height - 8} textAnchor={index === 0 ? 'start' : index === 13 ? 'end' : 'middle'}>{`${8 + index}:00`}</text>
                        )}
                      </g>
                    ))}
                  </svg>
                  <div className="chart-legend"><span><i className="legend-all" />当前范围</span><span><i className="legend-baseline" />昨日基线</span></div>
                </div>
                <aside className="operation-chart" aria-label={`今日任务状态：已完成 ${operationData.completed}，执行中 ${operationData.running}，待测试 ${operationData.waiting}`}>
                  <div className="operation-title"><strong>今日运行节奏</strong><span>实时</span></div>
                  <div className="completion-overview">
                    <div className="completion-ring" style={{ background: `conic-gradient(var(--brand) 0 ${operationData.completion}%, #eaf0f7 ${operationData.completion}% 100%)` }}>
                      <div><strong>{operationData.completion}%</strong><span>完成度</span></div>
                    </div>
                    <p><strong>{operationData.completed}</strong><span>项已完成</span></p>
                  </div>
                  <div className="operation-list">
                    <div><i className="done-dot" /><span>已完成</span><strong>{operationData.completed}</strong></div>
                    <div><i className="running-dot" /><span>并行执行</span><strong>{operationData.running}</strong></div>
                    <div><i className="waiting-dot" /><span>待测试</span><strong>{operationData.waiting}</strong></div>
                  </div>
                </aside>
              </div>
            </article>

            <section className="instrument-board" aria-label="谱仪实时运行状态">
              <div className="board-heading"><div><h2>谱仪运行</h2><p>真实状态按设备独立展示</p></div><button type="button">查看全部</button></div>
              <InstrumentCard
                kind="xafs" name="XAFS-01" sampleCode="ZJUT-260828-017" sampleName="Ni foil · 王五"
                progress={72} status="测试中"
                details={[["当前能量", "7125.4 eV"], ["扫描点", "726 / 1000"], ["预计剩余", "03:21"]]}
              />
              <InstrumentCard
                kind="xrd" name="D9-XRD-01" sampleCode="ZJUT-260828-018" sampleName="Polymer film · 张三"
                progress={46} status="测试中"
                details={[["当前 2Theta", "35.27°"], ["扫描点", "462 / 1000"], ["预计剩余", "06:42"]]}
              />
            </section>
          </section>

          <section className="dashboard-bottom">
            <article className="panel records-panel">
              <div className="panel-header simple"><div><h2>最近测试记录</h2><p>最近完成或异常的样品测试</p></div><button className="text-link" type="button">查看全部 →</button></div>
              <div className="table-scroll">
                <table>
                  <thead><tr><th>样品</th><th>申请人</th><th>技术</th><th>设备</th><th>开始</th><th>耗时</th><th>状态</th></tr></thead>
                  <tbody>
                    {records.map((row) => (
                      <tr key={row[0]}>
                        <td><strong>{row[0]}</strong><span>{row[1]}</span></td><td>{row[2]}</td>
                        <td><span className={`tech-tag ${row[3].toLowerCase()}`}>{row[3]}</span></td><td>{row[4]}</td><td>{row[5]}</td><td>{row[6]}</td>
                        <td><span className={`state-tag ${row[7] === '失败' ? 'failed' : 'done'}`}>{row[7]}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="panel queue-panel">
              <div className="panel-header simple"><div><h2>待测试队列</h2><p>按设备独立排队</p></div><button className="text-link" type="button">管理队列 →</button></div>
              <div className="queue-tabs">
                <button type="button" className={queueKind === 'xafs' ? 'active' : ''} onClick={() => setQueueKind('xafs')}>XAFS <span>4</span></button>
                <button type="button" className={queueKind === 'xrd' ? 'active' : ''} onClick={() => setQueueKind('xrd')}>XRD <span>7</span></button>
              </div>
              <ol className="queue-list">
                {queues[queueKind].map(([index, code, name, start, duration]) => (
                  <li key={code}><span className="queue-index">{index}</span><div><strong>{code}</strong><small>{name} · 预计 {start}</small></div><span className="queue-duration">{duration}</span></li>
                ))}
              </ol>
              <div className="queue-finish"><span>预计队列完成</span><strong>{queueKind === 'xrd' ? '今天 16:45' : '今天 14:20'}</strong></div>
            </article>
          </section>
        </div>
      </main>
      {mobileNav && <button className="nav-backdrop" aria-label="关闭导航" type="button" onClick={() => setMobileNav(false)} />}
    </div>
  );
}
