export type ApiVisibility = 'public' | 'private'

export interface ApiRoute {
  visibility: ApiVisibility
  transport: string
  method: string
  path: string
  name: string
  handler: string
  description: string
}

export const publicApiRoutes: ApiRoute[] = [
  {
    visibility: 'public',
    transport: 'http-proxy',
    method: 'ANY',
    path: '/api/orch/*',
    name: 'proxy.orchestrator',
    handler: 'nginx/vite proxy',
    description: 'Browser-facing proxy to phone-orchestrator; prefix is stripped.',
  },
  {
    visibility: 'public',
    transport: 'http-proxy',
    method: 'ANY',
    path: '/api/prov/*',
    name: 'proxy.provisioner',
    handler: 'nginx/vite proxy',
    description: 'Browser-facing proxy to phone-provisioner; prefix is stripped.',
  },
  {
    visibility: 'public',
    transport: 'http-proxy',
    method: 'ANY',
    path: '/api/campaigns/*',
    name: 'proxy.campaign_manager',
    handler: 'nginx/vite proxy',
    description: 'Browser-facing proxy to campaign-manager; /api/campaigns maps to /campaigns.',
  },
  {
    visibility: 'public',
    transport: 'http-proxy',
    method: 'ANY',
    path: '/api/behavior/*',
    name: 'proxy.behavior_engine',
    handler: 'nginx/vite proxy',
    description: 'Browser-facing proxy to behavior-engine social scenarios; prefix is stripped.',
  },
  {
    visibility: 'public',
    transport: 'http-proxy',
    method: 'ANY',
    path: '/api/minio/*',
    name: 'proxy.minio',
    handler: 'nginx/vite proxy',
    description: 'Browser-facing proxy to MinIO media objects.',
  },
  {
    visibility: 'public',
    transport: 'http',
    method: 'POST',
    path: '/api/bulk/orch',
    name: 'bulk.orchestrator',
    handler: 'bulk-proxy / vite dev plugin',
    description: 'Run one orchestrator action or a list of steps on many phones.',
  },
  {
    visibility: 'public',
    transport: 'http',
    method: 'GET',
    path: '/api/bulk/preview/{serial}',
    name: 'bulk.preview',
    handler: 'bulk-proxy',
    description: 'Fetch latest phone screenshot through orchestrator and MinIO.',
  },
  {
    visibility: 'public',
    transport: 'spa',
    method: 'GET',
    path: '/login',
    name: 'ui.login',
    handler: 'Login.tsx',
    description: 'Local Basic Auth login screen for the admin UI.',
  },
]

export const privateApiRoutes: ApiRoute[] = [
  {
    visibility: 'private',
    transport: 'http-out',
    method: 'GET/POST/DELETE',
    path: 'phone-orchestrator:/phones...',
    name: 'orchestrator.client',
    handler: 'src/api/orchestrator.ts',
    description: 'Typed frontend client for phone actions, screen, content, and video.',
  },
  {
    visibility: 'private',
    transport: 'http-out',
    method: 'GET',
    path: 'phone-provisioner:/status?serial=...',
    name: 'provisioner.client',
    handler: 'src/api/orchestrator.ts',
    description: 'Typed frontend client for provision status.',
  },
  {
    visibility: 'private',
    transport: 'http-out',
    method: 'GET/POST',
    path: 'campaign-manager:/campaigns...',
    name: 'campaign.client',
    handler: 'src/api/client.ts',
    description: 'Campaign draft, validation, capacity, approval, start/stop, and reports.',
  },
  {
    visibility: 'private',
    transport: 'http-out',
    method: 'POST/GET',
    path: 'behavior-engine:/social/... and /jobs/{id}',
    name: 'behavior.client',
    handler: 'src/api/behavior.ts',
    description: 'Typed frontend client for social jobs and job polling.',
  },
  {
    visibility: 'private',
    transport: 'browser-storage',
    method: 'READ/WRITE',
    path: 'localStorage',
    name: 'auth.storage',
    handler: 'src/lib/auth.ts',
    description: 'Stores local Basic Auth credentials for /api/* requests.',
  },
]

export const allApiRoutes: ApiRoute[] = [...publicApiRoutes, ...privateApiRoutes]
