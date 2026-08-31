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

export type TrendSeries = Record<TrendRange, number[]>;
export type RangeStatistics = {
  submitted: number;
  completed: number;
  pending: number;
  running: number;
  failed: number;
};
export type DashboardStatistics = Record<TrendRange, RangeStatistics>;
export type CommunicationState = 'connected' | 'disconnected' | 'waiting';

export type CommunicationStatus = {
  state: CommunicationState;
  message: string;
  last_received_at: string | null;
  age_seconds: number | null;
  timeout_seconds: number;
};

/** XAFS/XRD 控制程序每次通过 SDK 上报的一帧完整只读数据。 */
export type TechniqueSnapshot = {
  schema_version: 1;
  technique: SampleTechnique;
  source_instance_id: string;
  source_event_id: string;
  observed_at: string;
  instrument: InstrumentStatus;
  records: SampleRecord[];
  queue: QueueItem[];
  trends: TrendSeries;
  /** 平台按周期汇总的业务统计；未提供时网页会从当前 records 做保守统计。 */
  statistics?: DashboardStatistics;
  technique_payload?: Record<string, unknown>;
};

export type DashboardApiResponse = {
  schema_version: 1;
  request_id: string;
  server_time: string;
  communication: CommunicationStatus;
  snapshot: TechniqueSnapshot | null;
};

export type DashboardSnapshot = {
  source: DataSourceKind;
  syncedAt: string;
  samples: SampleRecord[];
  instruments: InstrumentStatus[];
  queues: QueueItem[];
  trends: Record<InstrumentScope, Record<TrendMetric, number[]>>;
};
