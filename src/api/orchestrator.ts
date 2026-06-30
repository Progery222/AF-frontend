import type {
  ContentDownloadResponse,
  ContentListResponse,
  FarmStats,
  Phone,
  PhoneAppActionResponse,
  PhoneAppsResponse,
  PhonesResponse,
  ProvStatus,
  ReadyResponse,
  ScenarioFiles,
  ScenarioGenerateResponse,
  ScenarioListResponse,
  ScenarioLogsResponse,
  ScenarioRunNowResponse,
  ScenarioStatus,
  ScenarioValidateResponse,
  ScreenResult,
  VideoJob,
} from '@/types'
import { orch, phonePath, prov } from './client'

export const api = {
  getPhones: () => orch.get<PhonesResponse>('/phones'),

  getStats: () => orch.get<FarmStats>('/stats'),

  getReady: () => orch.get<ReadyResponse>('/ready'),

  getPhone: (serial: string) => orch.get<Phone>(phonePath(serial)),

  setStandSeqNumber: (serial: string, standSeqNumber: number | null) =>
    orch.patch<Phone>(phonePath(serial, '/stand-seq'), { stand_seq_number: standSeqNumber }),

  observe: (serial: string) =>
    orch.get<ScreenResult>(phonePath(serial, '/observe?timeout_sec=30'), 45_000),

  screenshot: (serial: string) =>
    orch.get<ScreenResult>(phonePath(serial, '/screen?timeout_sec=30'), 45_000),

  uiDump: (serial: string) =>
    orch.get<ScreenResult>(phonePath(serial, '/ui?timeout_sec=30'), 45_000),

  listContent: (serial: string) =>
    orch.get<ContentListResponse>(phonePath(serial, '/content')),

  downloadContent: (
    serial: string,
    body: { content_id?: string; object_key?: string },
  ) =>
    orch.post<ContentDownloadResponse>(phonePath(serial, '/content/download'), body),

  videoFromScreenshots: (
    serial: string,
    screenshotKeys: string[],
    profile: { width: number; height: number; frame_sec: number },
  ) =>
    orch.post<VideoJob>(phonePath(serial, '/video/screenshots'), {
      screenshot_keys: screenshotKeys,
      profile,
    }),

  videoAI: (
    serial: string,
    prompt: string,
    profile: { width: number; height: number },
    durationSec = 8,
  ) =>
    orch.post<VideoJob>(phonePath(serial, '/video/ai'), {
      prompt,
      duration_sec: durationSec,
      profile,
    }),

  videoJobStatus: (serial: string, jobId: string) =>
    orch.get<VideoJob>(phonePath(serial, `/video/jobs/${jobId}`)),

  getProvStatus: (serial: string) =>
    prov.get<ProvStatus>(`/status?serial=${encodeURIComponent(serial)}`),

  listScenarios: (serial: string) =>
    orch.get<ScenarioListResponse>(phonePath(serial, '/scenarios')),

  setActiveScenario: (serial: string, scenarioId: string) =>
    orch.put<{ message: string; active_scenario_id: string }>(
      phonePath(serial, '/scenarios/active'),
      { scenario_id: scenarioId },
    ),

  getScenario: (serial: string, scenarioId: string) =>
    orch.get<ScenarioFiles>(phonePath(serial, `/scenarios/${encodeURIComponent(scenarioId)}`)),

  putScenario: (serial: string, scenarioId: string, files: ScenarioFiles) =>
    orch.put<{ message: string }>(phonePath(serial, `/scenarios/${encodeURIComponent(scenarioId)}`), files),

  deleteScenario: (serial: string, scenarioId: string) =>
    orch.delete<{ message: string }>(phonePath(serial, `/scenarios/${encodeURIComponent(scenarioId)}`)),

  getScenarioStatus: (serial: string, scenarioId: string) =>
    orch.get<ScenarioStatus>(phonePath(serial, `/scenarios/${encodeURIComponent(scenarioId)}/status`)),

  getScenarioLogs: (serial: string, scenarioId: string, date?: string) => {
    const q = date ? `?date=${encodeURIComponent(date)}` : ''
    return orch.get<ScenarioLogsResponse>(
      phonePath(serial, `/scenarios/${encodeURIComponent(scenarioId)}/logs${q}`),
    )
  },

  generateScenario: (serial: string, prompt: string) =>
    orch.post<ScenarioGenerateResponse>(phonePath(serial, '/scenarios/generate'), { prompt }),

  validateScenario: (serial: string, scenarioYaml: string, variablesYaml: string, normalize = true) =>
    orch.post<ScenarioValidateResponse>(phonePath(serial, '/scenarios/validate'), {
      scenario_yaml: scenarioYaml,
      variables_yaml: variablesYaml,
      normalize,
    }),

  runScenarioStep: (
    serial: string,
    body: {
      scenario_id: string
      step_id: string
      action?: string
      params?: Record<string, string>
      uses?: string
      scenario_yaml?: string
      variables_yaml?: string
    },
  ) =>
    orch.post<{ message: string; result?: Record<string, unknown> }>(
      phonePath(serial, '/scenarios/run-step'),
      body,
    ),

  runScenariosNow: (serial: string, scenarioIds: string[]) =>
    orch.post<ScenarioRunNowResponse>(
      phonePath(serial, '/scenarios/run-now'),
      { scenario_ids: scenarioIds },
      45 * 60 * 1000,
    ),

  listApps: (serial: string) =>
    orch.get<PhoneAppsResponse>(phonePath(serial, '/apps')),

  openApp: (serial: string, pkg: string) =>
    orch.post<PhoneAppActionResponse>(phonePath(serial, '/apps/open'), { package: pkg }),

  closeApp: (serial: string, pkg: string) =>
    orch.post<PhoneAppActionResponse>(phonePath(serial, '/apps/close'), { package: pkg }),
}

export function videoJobReady(status: string): boolean {
  const s = status.toLowerCase()
  return s === 'ready' || s === 'job_status_ready' || s.includes('ready')
}
