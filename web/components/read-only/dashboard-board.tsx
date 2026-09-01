'use client';

import { useEffect, useMemo, useState } from 'react';
import { loadDashboardFrame } from '../../lib/samples/api';
import type { CommunicationStatus, DashboardStatistics, RangeStatistics, SampleTechnique, TechniqueSnapshot } from '../../lib/samples/types';
import { InstrumentReadout } from './instrument-readout';
import { KeyboardTrend } from './keyboard-trend';

const initialCommunication: CommunicationStatus = {
  state: 'waiting', message: '正在连接状态接口', last_received_at: null, age_seconds: null, timeout_seconds: 10,
};

function statusText(status: CommunicationStatus) {
  if (status.state === 'connected') return '通讯正常 · 3 秒刷新';
  if (status.state === 'waiting') return status.message;
  return status.age_seconds === null ? status.message : `通讯中断 · ${Math.round(status.age_seconds)} 秒未收到数据`;
}

function statisticsFromRecords(snapshot: TechniqueSnapshot): DashboardStatistics {
  const summary: RangeStatistics = {
    submitted: snapshot.records.length,
    completed: snapshot.records.filter((item) => item.state === 'completed').length,
    pending: snapshot.records.filter((item) => item.state === 'queued').length,
    running: snapshot.records.filter((item) => item.state === 'running').length,
    failed: snapshot.records.filter((item) => item.state === 'failed').length,
  };
  return { today: summary, week: summary, month: summary };
}

export function DashboardBoard({ technique, initialSnapshot }: { technique: SampleTechnique; initialSnapshot: TechniqueSnapshot }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [communication, setCommunication] = useState(initialCommunication);

  useEffect(() => {
    let active = true;
    let controller: AbortController | null = null;

    const refresh = async () => {
      controller?.abort();
      controller = new AbortController();
      try {
        const response = await loadDashboardFrame(technique, controller.signal);
        if (!active) return;
        setCommunication(response.communication);
        if (response.snapshot) setSnapshot(response.snapshot);
      } catch (error) {
        if (!active || (error instanceof DOMException && error.name === 'AbortError')) return;
        setCommunication({
          state: 'disconnected',
          message: error instanceof Error ? `接口服务不可访问：${error.message}` : '接口服务不可访问',
          last_received_at: null,
          age_seconds: null,
          timeout_seconds: 10,
        });
      }
    };

    void refresh();
    const timer = window.setInterval(() => void refresh(), 3000);
    return () => { active = false; window.clearInterval(timer); controller?.abort(); };
  }, [technique]);

  const instrument = useMemo(() => ({
    ...snapshot.instrument,
    connection: communication.state === 'connected' && snapshot.instrument.connection === 'online' ? 'online' as const : 'offline' as const,
  }), [communication.state, snapshot.instrument]);
  const activeSample = snapshot.records.find((item) => item.id === snapshot.instrument.activeSampleId);
  const statistics = snapshot.statistics ?? statisticsFromRecords(snapshot);
  const label = technique.toUpperCase();
  const platformTitle = `${label}测试平台`;
  const platformSubtitle = `${label} Testing Platform`;
  // 历史由接口按最新优先提供；队列则必须按即将测试的顺序展示。
  const visibleRecords = snapshot.records.slice(0, 5);
  const visibleQueue = [...snapshot.queue].sort((left, right) => left.position - right.position).slice(0, 5);

  return <main className={`readonly-board communication-${communication.state}`} data-instrument={technique}>
    <header className="readonly-brand"><span className="readonly-brand-symbol"><img src="/gk-logo" alt="GK" width={30} height={30} /></span><div><strong>{platformTitle}</strong><span>{platformSubtitle}</span></div><span className={`board-connection ${communication.state}`}><i />{statusText(communication)}</span></header>
    <section className="readonly-grid" aria-label={`${label} 样品测试阅览`}>
      <article className={`readonly-panel readonly-trend-panel ${technique}`}><KeyboardTrend technique={technique} values={snapshot.trends} statistics={statistics} /></article>
      <article className={`readonly-panel readonly-device-panel ${technique}`}><header className="readonly-panel-header"><h2>系统状态</h2></header><InstrumentReadout instrument={instrument} sample={activeSample} statistics={statistics.today} communication={communication} /></article>
      <article className="readonly-panel readonly-records-panel"><header className="readonly-panel-header"><h2>样品记录</h2><span className="readonly-count">{snapshot.records.length} 条</span></header><div className="table-scroll"><table><thead><tr><th>样品</th><th>申请人</th><th>设备</th><th>开始</th><th>耗时</th><th>状态</th></tr></thead><tbody>{visibleRecords.map((sample) => <tr key={sample.id}><td><strong>{sample.id}</strong><span>{sample.name}</span></td><td>{sample.applicant}</td><td>{sample.instrument}</td><td>{sample.startedAt}</td><td>{sample.duration}</td><td><span className={`state-tag ${sample.state}`}>{sample.state === 'running' ? '测试中' : sample.state === 'queued' ? '待测试' : sample.state === 'completed' ? '已完成' : '需复测'}</span></td></tr>)}</tbody></table></div></article>
      <article className="readonly-panel readonly-queue-panel"><header className="readonly-panel-header"><h2>待测试队列</h2></header><ol className="readonly-queue-list">{visibleQueue.map((item) => <li key={item.sampleId}><span className="queue-index">{String(item.position).padStart(2, '0')}</span><div><strong>{item.sampleId}</strong><small>{item.sampleName} · 预计 {item.scheduledAt}</small></div><span className="queue-duration">{item.estimate}</span></li>)}</ol></article>
    </section>
  </main>;
}
