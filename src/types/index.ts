export interface Phone {
  serial: string
  state: string
  model?: string
  android_version?: string
  screen_res_x?: number
  screen_res_y?: number
  stand_seq_number?: number | null
  ip?: string
  last_heartbeat?: string
  heartbeat_count?: number
  error?: string
  last_error_hash?: string
  recovery_in_progress?: boolean
  uptime_hours?: number
}

export interface FarmStats {
  Total: number
  Working: number
  Paused: number
  Error: number
  SettingUp: number
}

export interface PhonesResponse {
  phones: Phone[]
  total: number
  stats: {
    working: number
    paused: number
    error: number
    setting_up: number
  }
}

export interface ReadyResponse {
  status: string
  observer?: string
  recovery?: string
  executor?: string
  connector?: string
  provisioner?: string
  content?: string
  contacts?: string
  video?: string
}

export interface ScreenResult {
  serial: string
  minio_key?: string
  screenshot_url?: string
  package_name?: string
  xml_dump?: string
  resolution?: { width: number; height: number }
}

export interface ContentItem {
  content_id: string
  object_key: string
  filename: string
  status: string
  device_path?: string
}

export interface ContentListResponse {
  serial: string
  items: ContentItem[]
}

export interface ContentDownloadResponse {
  serial: string
  content_id?: string
  object_key?: string
  status: string
  message?: string
}

export interface VideoJob {
  id: string
  status: string
  output_key?: string
  error?: string
  progress?: number
}

export interface ProvStatus {
  serial: string
  status: string
  steps?: Record<string, unknown>
  error?: string
  duration_sec?: number
}

export interface ScenarioSummary {
  id: string
  yaml_id?: string
  name: string
  serial: string
  valid_from?: string
  valid_until?: string
  is_active?: boolean
}

export interface ScenarioListResponse {
  serial: string
  active_scenario_id?: string
  items: ScenarioSummary[]
}

export interface ScenarioFiles {
  scenario_yaml: string
  variables_yaml: string
}

export interface ScenarioStatus {
  serial: string
  scenario_id: string
  active: boolean
  current_step?: string
  next_step?: string
  steps_done_today?: string[]
  checked_at: string
  timezone?: string
}

export interface ScenarioStepIssue {
  step_id: string
  action?: string
  level: 'error' | 'warning'
  message: string
}

export interface ScenarioValidateResponse {
  valid: boolean
  errors?: string[]
  warnings?: string[]
  step_issues?: ScenarioStepIssue[]
  normalized_scenario_yaml?: string
  steps_count?: number
  runnable_by_scheduler?: boolean
}

export interface ScenarioGenerateResponse extends ScenarioFiles {
  normalized_scenario_yaml?: string
  warnings?: string[]
  errors?: string[]
  step_issues?: ScenarioStepIssue[]
  valid?: boolean
  runnable_by_scheduler?: boolean
  steps_count?: number
}

export interface ScenarioLogsResponse {
  logs: string
}

export interface PhoneApp {
  id: string
  name: string
  package: string
}

export interface PhoneAppsResponse {
  serial: string
  apps: PhoneApp[]
}

export interface PhoneAppActionResponse {
  serial: string
  package: string
  status: 'opened' | 'closed'
}
