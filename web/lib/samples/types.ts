export type InstrumentScope = 'all' | 'xafs' | 'xrd';
export type SampleTechnique = Exclude<InstrumentScope, 'all'>;
export type SampleState = 'queued' | 'running' | 'completed' | 'failed';
export type DataSourceKind = 'mock' | 'json' | 'database';

export type SampleRecord = {
  id: string;
  name: string;
  applicant: string;
  group: string;
  technique: SampleTechnique;
  instrument: string;
  state: SampleState;
  startedAt: string;
  duration: string;
  progress?: number;
  measuredAt?: string;
  tags: string[];
};

export type InstrumentStatus = {
  id: string;
  name: string;
  technique: SampleTechnique;
  connection: 'online' | 'offline';
  activeSampleId?: string;
  currentValue: string;
  scanProgress: number;
  totalPoints: number;
  scannedPoints: number;
  remaining: string;
};

export type QueueItem = {
  position: number;
  sampleId: string;
  sampleName: string;
  technique: SampleTechnique;
  scheduledAt: string;
  estimate: string;
};

export type TrendMetric = 'samples' | 'tests' | 'duration';
export type TrendRange = 'today' | 'week' | 'month';

export type DashboardSnapshot = {
  source: DataSourceKind;
  syncedAt: string;
  samples: SampleRecord[];
  instruments: InstrumentStatus[];
  queues: QueueItem[];
  trends: Record<InstrumentScope, Record<TrendMetric, number[]>>;
};
