import { InstrumentReadout } from '../components/read-only/instrument-readout';
import { KeyboardTrend } from '../components/read-only/keyboard-trend';
import { dashboardSnapshot } from '../lib/samples/mock-sample-repository';
import type { SampleTechnique } from '../lib/samples/types';
import { headers } from 'next/headers';

export default async function Home() {
  const requestHeaders = await headers();
  const technique: SampleTechnique = requestHeaders.get('host')?.endsWith(':3101') ? 'xafs' : 'xrd';
  const techniqueLabel = technique.toUpperCase();
  const instrument = dashboardSnapshot.instruments.find((item) => item.technique === technique);
  const activeSample = dashboardSnapshot.samples.find((item) => item.id === instrument?.activeSampleId);
  const records = dashboardSnapshot.samples.filter((item) => item.technique === technique);
  const queue = dashboardSnapshot.queues.filter((item) => item.technique === technique);
  const trend = dashboardSnapshot.trends[technique].samples;

  if (!instrument) return null;

  return <main className="readonly-board" data-instrument={technique}>
    <header className="readonly-brand"><span className="readonly-brand-symbol">Z</span><div><strong>样品测试平台</strong><span>Sample Testing Platform</span></div></header>
    <section className="readonly-grid" aria-label={`${techniqueLabel} 样品测试阅览`}>
      <article className="readonly-panel readonly-trend-panel"><KeyboardTrend technique={technique} values={trend} syncedAt={dashboardSnapshot.syncedAt} /></article>
      <article className="readonly-panel readonly-device-panel"><header className="readonly-panel-header"><div><span className={`readonly-kicker ${technique}`}>{techniqueLabel}</span><h2>设备状态</h2></div></header><InstrumentReadout instrument={instrument} sample={activeSample} /></article>
      <article className="readonly-panel readonly-records-panel"><header className="readonly-panel-header"><div><span className={`readonly-kicker ${technique}`}>{techniqueLabel}</span><h2>样品记录</h2></div><span className="readonly-count">{records.length} 条</span></header><div className="table-scroll"><table><thead><tr><th>样品</th><th>申请人</th><th>设备</th><th>开始</th><th>耗时</th><th>状态</th></tr></thead><tbody>{records.map((sample) => <tr key={sample.id}><td><strong>{sample.id}</strong><span>{sample.name}</span></td><td>{sample.applicant}</td><td>{sample.instrument}</td><td>{sample.startedAt}</td><td>{sample.duration}</td><td><span className={`state-tag ${sample.state}`}>{sample.state === 'running' ? '测试中' : sample.state === 'queued' ? '待测试' : sample.state === 'completed' ? '已完成' : '需复测'}</span></td></tr>)}</tbody></table></div></article>
      <article className="readonly-panel readonly-queue-panel"><header className="readonly-panel-header"><div><span className={`readonly-kicker ${technique}`}>{techniqueLabel}</span><h2>待测试队列</h2></div><span className="readonly-count">{queue.length} 项</span></header><ol className="readonly-queue-list">{queue.map((item) => <li key={item.sampleId}><span className="queue-index">{String(item.position).padStart(2, '0')}</span><div><strong>{item.sampleId}</strong><small>{item.sampleName} · 预计 {item.scheduledAt}</small></div><span className="queue-duration">{item.estimate}</span></li>)}</ol><div className="queue-finish"><span>预计队列完成</span><strong>{technique === 'xrd' ? '今天 16:45' : '今天 14:20'}</strong></div></article>
    </section>
  </main>;
}
