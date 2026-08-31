import type { DashboardApiResponse, SampleTechnique } from './types';

/**
 * 浏览器始终读取与当前页面同一台主机上的 3200 端口。
 * XAFS(3101) 与 XRD(3102) 因此共用一个状态服务，但查询各自独立路径。
 */
export async function loadDashboardFrame(technique: SampleTechnique, signal: AbortSignal): Promise<DashboardApiResponse> {
  const apiAddress = `${window.location.protocol}//${window.location.hostname}:3200`;
  const response = await fetch(`${apiAddress}/api/v1/dashboard/${technique}`, { cache: 'no-store', signal });
  if (!response.ok) throw new Error(`状态接口返回 HTTP ${response.status}`);
  const value = await response.json() as DashboardApiResponse;
  if (!value.communication || value.schema_version !== 1) throw new Error('状态接口返回格式不正确');
  return value;
}
