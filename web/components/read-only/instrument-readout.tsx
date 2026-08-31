import type { CSSProperties } from 'react';
import type { CommunicationStatus, InstrumentStatus, RangeStatistics, SampleRecord } from '../../lib/samples/types';

export function InstrumentReadout({ instrument, sample, statistics, communication }: { instrument: InstrumentStatus; sample?: SampleRecord; statistics: RangeStatistics; communication: CommunicationStatus }) {
  const currentLabel = instrument.technique === 'xafs' ? '当前能量' : '当前 2Theta';
  const connected = communication.state === 'connected' && instrument.connection === 'online';
  const statusLabel = communication.state === 'waiting' ? '等待连接' : connected ? '测试中' : communication.state === 'disconnected' ? '数据暂停' : '设备离线';
  const total = Math.max(1, statistics.submitted);
  const completedEnd = statistics.completed / total * 100;
  const runningEnd = completedEnd + statistics.running / total * 100;
  const pendingEnd = runningEnd + statistics.pending / total * 100;
  const donutStyle = { '--done': `${completedEnd}%`, '--running': `${runningEnd}%`, '--pending': `${pendingEnd}%` } as CSSProperties;
  return <section className={`system-readout ${instrument.technique}`}>
    <div className="system-device-live">
    <div className="readonly-instrument-head"><div><span className="instrument-type">{instrument.technique.toUpperCase()}</span><strong>{instrument.name}</strong></div><span className={`live-status ${connected ? 'online' : 'offline'}`}><i />{statusLabel}</span></div>
    <div className="readonly-sample"><strong>{sample?.id ?? '等待下一任务'}</strong><span>{sample ? `${sample.name} · ${sample.applicant}` : '暂无正在执行的样品'}</span></div>
    <div className="progress-label"><span>测试进度</span><strong>{instrument.scanProgress}%</strong></div>
    <div className={`progress-track ${connected ? 'active' : 'paused'}`}><i style={{ width: `${instrument.scanProgress}%` }} /></div>
    <div className="readonly-instrument-details"><div><span>{currentLabel}</span><strong>{instrument.currentValue}</strong></div><div><span>扫描点</span><strong>{instrument.scannedPoints} / {instrument.totalPoints}</strong></div><div><span>预计剩余</span><strong>{instrument.remaining}</strong></div></div>
    <div className={`runtime-pulse ${connected ? 'online' : 'offline'}`} aria-label="采集脉冲状态"><span className="runtime-pulse-track" aria-hidden="true"><i /></span><div><strong>{connected ? '扫描点采集脉冲' : '实时数据已暂停'}</strong><span>{connected ? '数据流稳定接收中' : '保留最后一次可信数据'}</span></div><em>{connected ? 'LIVE' : 'OFFLINE'}</em></div>
    </div>
    <div className="system-daily-summary">
      <div className="summary-heading"><div><span>今日样品状态</span><strong>完成进度</strong></div><em>{statistics.submitted ? Math.round(statistics.completed / statistics.submitted * 100) : 0}%</em></div>
      <div className="summary-visual"><div className="sample-donut" style={donutStyle}><div><strong>{statistics.submitted}</strong><span>今日总样品</span></div></div><div className="summary-legend"><span className="done"><i />已完成 <strong>{statistics.completed}</strong></span><span className="running"><i />测试中 <strong>{statistics.running}</strong></span><span className="pending"><i />待测试 <strong>{statistics.pending}</strong></span><span className="failed"><i />异常 <strong>{statistics.failed}</strong></span></div></div>
    </div>
  </section>;
}
