import type { DashboardSnapshot, DataSourceKind } from './types';

/**
 * 前端只依赖这个统一快照；未来切换 JSON 文件或数据库时，工作台组件无需修改。
 * 数据字段尚未定稿，所以解析职责保留在各自的数据源中，避免现在固化错误格式。
 */
export interface SampleRepository {
  readonly source: DataSourceKind;
  loadDashboard(): Promise<DashboardSnapshot>;
}

export type JsonLoader = () => Promise<DashboardSnapshot>;
export type DatabaseLoader = () => Promise<DashboardSnapshot>;

export class JsonSampleRepository implements SampleRepository {
  readonly source = 'json' as const;

  constructor(private readonly load: JsonLoader) {}

  loadDashboard() {
    return this.load();
  }
}

export class DatabaseSampleRepository implements SampleRepository {
  readonly source = 'database' as const;

  constructor(private readonly load: DatabaseLoader) {}

  loadDashboard() {
    return this.load();
  }
}
