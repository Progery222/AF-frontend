import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/orchestrator'
import {
  defaultElementConfig,
  ELEMENTS_STORAGE_ID,
  elementConfigScenarioFiles,
  parseElementConfig,
  type PhoneElementConfig,
} from '@/lib/scenarioElements'

async function loadConfig(serial: string): Promise<PhoneElementConfig> {
  try {
    const files = await api.getScenario(serial, ELEMENTS_STORAGE_ID)
    const jsonPart = files.variables_yaml?.split('# element-config\n')[1]
    return parseElementConfig(jsonPart ?? files.variables_yaml)
  } catch {
    return defaultElementConfig()
  }
}

export function usePhoneElementConfigs(serials: string[]) {
  const qc = useQueryClient()
  const [drafts, setDrafts] = useState<Record<string, PhoneElementConfig>>({})
  const [saving, setSaving] = useState(false)

  const queries = useQueries({
    queries: serials.map((serial) => ({
      queryKey: ['element-config', serial],
      queryFn: () => loadConfig(serial),
      enabled: !!serial,
    })),
  })

  useEffect(() => {
    const next: Record<string, PhoneElementConfig> = {}
    serials.forEach((serial, i) => {
      if (queries[i]?.data) next[serial] = queries[i].data!
    })
    if (Object.keys(next).length > 0) {
      setDrafts((prev) => ({ ...next, ...prev }))
    }
  }, [serials, queries.map((q) => q.dataUpdatedAt).join(',')])

  const getConfig = useCallback(
    (serial: string): PhoneElementConfig => drafts[serial] ?? defaultElementConfig(),
    [drafts],
  )

  const patchConfig = useCallback((serial: string, patch: Partial<PhoneElementConfig>) => {
    setDrafts((prev) => ({
      ...prev,
      [serial]: {
        ...defaultElementConfig(),
        ...prev[serial],
        ...patch,
        scroll: { ...defaultElementConfig().scroll, ...prev[serial]?.scroll, ...patch.scroll },
        search: { ...defaultElementConfig().search, ...prev[serial]?.search, ...patch.search },
      },
    }))
  }, [])

  const isLoading = queries.some((q) => q.isLoading)

  const saveAll = useCallback(async () => {
    setSaving(true)
    try {
      await Promise.all(
        serials.map(async (serial) => {
          const config = getConfig(serial)
          const files = elementConfigScenarioFiles(serial, config)
          await api.putScenario(serial, ELEMENTS_STORAGE_ID, files)
        }),
      )
      for (const serial of serials) {
        qc.invalidateQueries({ queryKey: ['element-config', serial] })
        qc.invalidateQueries({ queryKey: ['scenarios', serial] })
      }
    } finally {
      setSaving(false)
    }
  }, [serials, getConfig, qc])

  const applyNetworkToAll = useCallback(
    (network: PhoneElementConfig['network']) => {
      setDrafts((prev) => {
        const next = { ...prev }
        for (const serial of serials) {
          next[serial] = { ...getConfig(serial), network }
        }
        return next
      })
    },
    [serials, getConfig],
  )

  const dirty = useMemo(() => serials.some((s) => drafts[s] != null), [serials, drafts])

  return {
    getConfig,
    patchConfig,
    saveAll,
    applyNetworkToAll,
    isLoading,
    saving,
    dirty,
  }
}
