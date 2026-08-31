'use client';

import type { SampleRecord } from '../../lib/samples/types';

const stateLabels = { queued: '待测试', running: '测试中', completed: '已完成', failed: '需复测' } as const;

export function SampleDrawer({ sample, onClose }: { sample: SampleRecord | null; onClose: () => void }) {
  if (!sample) return null;

  return <div className="sample-drawer-backdrop" role="presentation" onMouseDown={onClose}>
    <aside className="sample-drawer" role="dialog" aria-modal="true" aria-labelledby="sample-drawer-title" onMouseDown={(event) => event.stopPropagation()}>
      <header><div><span className={`tech-tag ${sample.technique}`}>{sample.technique.toUpperCase()}</span><h2 id="sample-drawer-title">样品详情</h2></div><button type="button" className="drawer-close" aria-label="关闭样品详情" onClick={onClose}>×</button></header>
      <section className="drawer-identity"><strong>{sample.id}</strong><span>{sample.name}</span><p>{sample.group} · 申请人 {sample.applicant}</p></section>
      <dl className="drawer-grid"><div><dt>当前状态</dt><dd><span className={`state-tag ${sample.state}`}>{stateLabels[sample.state]}</span></dd></div><div><dt>测试设备</dt><dd>{sample.instrument}</dd></div><div><dt>开始时间</dt><dd>{sample.startedAt}</dd></div><div><dt>测试时长</dt><dd>{sample.duration}</dd></div></dl>
      {sample.progress !== undefined && <section className="drawer-progress"><div><span>当前测试进度</span><strong>{sample.progress}%</strong></div><div className="progress-track"><i style={{ width: `${sample.progress}%` }} /></div></section>}
      <section className="drawer-section"><h3>样品标签</h3><div className="tag-list">{sample.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></section>
      <section className="drawer-section drawer-data-note"><h3>原始数据</h3><p>数据文件、数据库索引与 JSON 读取规则将在数据格式确认后接入；当前界面已保留统一样品标识。</p></section>
    </aside>
  </div>;
}
