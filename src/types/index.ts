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
