import { headers } from 'next/headers';
import { DashboardBoard } from '../components/read-only/dashboard-board';
import { dashboardSnapshot } from '../lib/samples/mock-sample-repository';
import type { SampleTechnique, TechniqueSnapshot } from '../lib/samples/types';

export default async function Home() {
  const requestHeaders = await headers();
  const technique: SampleTechnique = requestHeaders.get('host')?.endsWith(':1002') ? 'xafs' : 'xrd';
  const instrument = dashboardSnapshot.instruments.find((item) => item.technique === technique);
  if (!instrument) return null;

  // 首屏使用模拟快照避免空白；接口首帧到达后由客户端替换。
  const today = dashboardSnapshot.trends[technique].samples;
  const initialSnapshot: TechniqueSnapshot = {
    schema_version: 1,
    technique,
    source_instance_id: 'initial-mock',
    source_event_id: 'initial-mock',
    observed_at: new Date(0).toISOString(),
    instrument,
    records: dashboardSnapshot.samples.filter((item) => item.technique === technique),
    queue: dashboardSnapshot.queues.filter((item) => item.technique === technique),
    trends: {
      today,
      week: today.map((value) => Math.round(value * .92)),
      month: today.map((value) => Math.round(value * .84)),
    },
    statistics: technique === 'xafs' ? {
      today: { submitted: 51, completed: 36, pending: 11, running: 1, failed: 3 },
      week: { submitted: 286, completed: 251, pending: 22, running: 1, failed: 12 },
      month: { submitted: 1128, completed: 1015, pending: 72, running: 1, failed: 40 },
    } : {
      today: { submitted: 76, completed: 61, pending: 12, running: 1, failed: 2 },
      week: { submitted: 412, completed: 372, pending: 25, running: 1, failed: 14 },
      month: { submitted: 1684, completed: 1536, pending: 96, running: 1, failed: 51 },
    },
  };

  return <DashboardBoard technique={technique} initialSnapshot={initialSnapshot} />;
}
