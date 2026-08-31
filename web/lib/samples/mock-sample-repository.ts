import type { SampleRepository } from './repository';
import type { DashboardSnapshot } from './types';

export const dashboardSnapshot: DashboardSnapshot = {
  source: 'mock',
  syncedAt: '10 秒前',
  samples: [
    { id: 'ZJUT-260831-028', name: 'Ni foil', applicant: '王五', group: '材料表征组', technique: 'xafs', instrument: 'XAFS-01', state: 'running', startedAt: '09:26', duration: '14m 06s', progress: 72, tags: ['金属标准样', 'K-edge'] },
    { id: 'ZJUT-260831-027', name: 'Polymer film', applicant: '张三', group: '高分子组', technique: 'xrd', instrument: 'D9-XRD-01', state: 'running', startedAt: '09:18', duration: '12m 40s', progress: 46, tags: ['薄膜', '广角衍射'] },
    { id: 'ZJUT-260831-026', name: 'Fe₂O₃ 标准样', applicant: '李四', group: '催化组', technique: 'xrd', instrument: 'D9-XRD-01', state: 'completed', startedAt: '08:52', duration: '18m 12s', measuredAt: '09:10', tags: ['标准样', '氧化物'] },
    { id: 'ZJUT-260831-025', name: 'Si Powder', applicant: '赵敏', group: '结构材料组', technique: 'xrd', instrument: 'D9-XRD-01', state: 'completed', startedAt: '08:05', duration: '21m 48s', measuredAt: '08:27', tags: ['粉末', '标定'] },
    { id: 'ZJUT-260831-024', name: 'Alloy-A3', applicant: '陈晨', group: '合金组', technique: 'xafs', instrument: 'XAFS-01', state: 'failed', startedAt: '07:42', duration: '16m 20s', measuredAt: '07:58', tags: ['合金', '需复测'] },
    { id: 'ZJUT-260831-023', name: 'Cu foil', applicant: '刘洋', group: '材料表征组', technique: 'xafs', instrument: 'XAFS-01', state: 'queued', startedAt: '10:06', duration: '—', tags: ['金属标准样'] },
    { id: 'ZJUT-260831-022', name: 'ZnO powder', applicant: '周倩', group: '催化组', technique: 'xafs', instrument: 'XAFS-01', state: 'queued', startedAt: '10:28', duration: '—', tags: ['粉末', '氧化物'] },
    { id: 'ZJUT-260831-021', name: 'Si wafer', applicant: '林浩', group: '半导体组', technique: 'xrd', instrument: 'D9-XRD-01', state: 'queued', startedAt: '10:00', duration: '—', tags: ['单晶硅', '薄片'] },
  ],
  instruments: [
    { id: 'xafs-01', name: 'XAFS-01', technique: 'xafs', connection: 'online', activeSampleId: 'ZJUT-260831-028', currentValue: '7125.4 eV', scanProgress: 72, totalPoints: 1000, scannedPoints: 726, remaining: '03:21' },
    { id: 'd9-xrd-01', name: 'D9-XRD-01', technique: 'xrd', connection: 'online', activeSampleId: 'ZJUT-260831-027', currentValue: '35.27°', scanProgress: 46, totalPoints: 1000, scannedPoints: 462, remaining: '06:42' },
  ],
  queues: [
    { position: 1, sampleId: 'ZJUT-260831-023', sampleName: 'Cu foil', technique: 'xafs', scheduledAt: '10:06', estimate: '18 min' },
    { position: 2, sampleId: 'ZJUT-260831-022', sampleName: 'ZnO powder', technique: 'xafs', scheduledAt: '10:28', estimate: '24 min' },
    { position: 1, sampleId: 'ZJUT-260831-021', sampleName: 'Si wafer', technique: 'xrd', scheduledAt: '10:00', estimate: '8 min' },
    { position: 2, sampleId: 'ZJUT-260831-020', sampleName: 'Fe powder', technique: 'xrd', scheduledAt: '10:18', estimate: '22 min' },
  ],
  trends: {
    all: { samples: [26, 34, 31, 47, 42, 58, 51, 66, 61, 73, 64, 80, 76, 69], tests: [31, 42, 39, 55, 52, 68, 62, 77, 69, 86, 78, 92, 88, 84], duration: [18, 27, 24, 39, 36, 48, 44, 58, 54, 71, 63, 79, 72, 67] },
    xafs: { samples: [20, 25, 22, 35, 31, 43, 39, 50, 44, 57, 48, 62, 58, 51], tests: [24, 31, 28, 41, 38, 49, 45, 57, 52, 66, 59, 71, 68, 62], duration: [22, 29, 27, 38, 34, 46, 42, 55, 49, 65, 58, 73, 69, 64] },
    xrd: { samples: [30, 41, 37, 53, 47, 62, 56, 70, 65, 79, 71, 86, 82, 76], tests: [34, 47, 43, 61, 55, 72, 66, 81, 75, 91, 83, 96, 92, 88], duration: [16, 25, 21, 36, 32, 45, 39, 54, 49, 67, 59, 76, 70, 65] },
  },
};

export class MockSampleRepository implements SampleRepository {
  readonly source = 'mock' as const;

  async loadDashboard() {
    return dashboardSnapshot;
  }
}
