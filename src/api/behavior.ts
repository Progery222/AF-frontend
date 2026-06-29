import { behavior } from './client'

export type SocialNetwork = 'instagram' | 'tiktok' | 'youtube'

export type SocialAction =
  | 'launch'
  | 'open-tab'
  | 'feed'
  | 'search-feed'
  | 'chat'
  | 'comment'
  | 'scrape-profile'

export type JobStatus = 'pending' | 'running' | 'done' | 'failed'

export interface BehaviorJob {
  id: string
  network: SocialNetwork
  action: string
  serial: string
  status: JobStatus
  result?: Record<string, unknown>
  error?: string
  created_at?: string
  updated_at?: string
}

export interface SocialActionRequest {
  serial: string
  tab?: string
  query?: string
  count?: number
  like_probability?: number
  target?: string
  persona?: string
  mode?: string
  max_turns?: number
  prompt?: string
  use_context?: boolean
}

function socialPath(network: SocialNetwork, action: SocialAction) {
  return `/social/${network}/${action}`
}

export const behaviorApi = {
  launch: (network: SocialNetwork, serial: string) =>
    behavior.post<BehaviorJob>(socialPath(network, 'launch'), { serial }),

  openTab: (network: SocialNetwork, body: SocialActionRequest) =>
    behavior.post<BehaviorJob>(socialPath(network, 'open-tab'), body),

  feed: (network: SocialNetwork, body: SocialActionRequest) =>
    behavior.post<BehaviorJob>(socialPath(network, 'feed'), body),

  searchFeed: (network: SocialNetwork, body: SocialActionRequest) =>
    behavior.post<BehaviorJob>(socialPath(network, 'search-feed'), body),

  chat: (network: SocialNetwork, body: SocialActionRequest) =>
    behavior.post<BehaviorJob>(socialPath(network, 'chat'), body),

  comment: (network: SocialNetwork, body: SocialActionRequest) =>
    behavior.post<BehaviorJob>(socialPath(network, 'comment'), body),

  getJob: (id: string) => behavior.get<BehaviorJob>(`/jobs/${encodeURIComponent(id)}`),
}
