import type { CommunicationStatus, InstrumentStatus, SampleRecord } from '../../lib/samples/types';

export function InstrumentReadout({ instrument, sample, communication }: { instrument: InstrumentStatus; sample?: SampleRecord; communication: CommunicationStatus }) {
  const currentLabel = instrument.technique === 'xafs' ? '当前能量' : '当前 2Theta';
  const connected = communication.state === 'connected' && instrument.connection === 'online';
  const statusLabel = communication.state === 'waiting' ? '等待连接' : connected ? '测试中' : communication.state === 'disconnected' ? '通讯中断' : '设备离线';
  return <section className={`readonly-instrument ${instrument.technique}`}>
    <div className="readonly-instrument-head"><div><span className="instrument-type">{instrument.technique.toUpperCase()}</span><strong>{instrument.name}</strong></div><span className={`live-status ${connected ? 'online' : 'offline'}`}><i />{statusLabel}</span></div>
    <div className="readonly-sample"><strong>{sample?.id ?? '等待下一任务'}</strong><span>{sample ? `${sample.name} · ${sample.applicant}` : '暂无正在执行的样品'}</span></div>
    <div className="progress-label"><span>测试进度</span><strong>{instrument.scanProgress}%</strong></div>
    <div className={`progress-track ${connected ? 'active' : 'paused'}`}><i style={{ width: `${instrument.scanProgress}%` }} /></div>
    <div className="readonly-instrument-details"><div><span>{currentLabel}</span><strong>{instrument.currentValue}</strong></div><div><span>扫描点</span><strong>{instrument.scannedPoints} / {instrument.totalPoints}</strong></div><div><span>预计剩余</span><strong>{instrument.remaining}</strong></div></div>
    <div className={`runtime-pulse ${connected ? 'online' : 'offline'}`} aria-label="采集脉冲状态"><span className="runtime-pulse-track" aria-hidden="true"><i /></span><div><strong>{connected ? '扫描点采集脉冲' : '实时数据已暂停'}</strong><span>{connected ? '数据流稳定接收中' : '保留最后一次可信数据'}</span></div><em>{connected ? 'LIVE' : 'OFFLINE'}</em></div>
  </section>;
}
