import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CachedScreenSize {
  width: number
  height: number
}

interface PhoneState {
  selectedSerials: string[]
  selectAll: boolean
  livePreviewEnabled: boolean
  livePreviewThumbHeight: number
  screenSizeBySerial: Record<string, CachedScreenSize>
  toggleSerial: (serial: string, allSerials?: string[]) => void
  setSelectAll: (value: boolean) => void
  clearSelection: () => void
  setLivePreviewEnabled: (value: boolean) => void
  setLivePreviewThumbHeight: (value: number) => void
  setScreenSize: (serial: string, width: number, height: number) => void
  isSelected: (serial: string) => boolean
  pruneSelectedSerials: (validSerials: string[]) => void
}

export const usePhoneStore = create<PhoneState>()(
  persist(
    (set, get) => ({
      selectedSerials: [],
      selectAll: false,
      livePreviewEnabled: false,
      livePreviewThumbHeight: 400,
      screenSizeBySerial: {},

      toggleSerial: (serial, allSerials) =>
        set((state) => {
          if (state.selectAll) {
            if (!allSerials?.length) {
              return { selectAll: false, selectedSerials: [] }
            }
            return {
              selectAll: false,
              selectedSerials: allSerials.filter((s) => s !== serial),
            }
          }
          const exists = state.selectedSerials.includes(serial)
          return {
            selectedSerials: exists
              ? state.selectedSerials.filter((s) => s !== serial)
              : [...state.selectedSerials, serial],
          }
        }),

      setSelectAll: (value) =>
        set(value ? { selectAll: true, selectedSerials: [] } : { selectAll: false }),

      clearSelection: () => set({ selectedSerials: [], selectAll: false }),

      setLivePreviewEnabled: (value) => set({ livePreviewEnabled: value }),

      setLivePreviewThumbHeight: (value) =>
        set({ livePreviewThumbHeight: Math.min(560, Math.max(280, value)) }),

      setScreenSize: (serial, width, height) => {
        if (width <= 0 || height <= 0) return
        set((state) => ({
          screenSizeBySerial: {
            ...state.screenSizeBySerial,
            [serial]: { width, height },
          },
        }))
      },

      pruneSelectedSerials: (validSerials) => {
        const valid = new Set(validSerials)
        set((state) => {
          if (state.selectAll) return state
          const pruned = state.selectedSerials.filter((s) => valid.has(s))
          if (pruned.length === state.selectedSerials.length) return state
          return { selectedSerials: pruned }
        })
      },

      isSelected: (serial) => {
        const state = get()
        return state.selectAll || state.selectedSerials.includes(serial)
      },
    }),
    {
      name: 'af-selected-phone',
      version: 4,
      migrate: (persisted, fromVersion) => {
        const state = persisted as Record<string, unknown>
        if (fromVersion < 4 && state.screenSizeBySerial == null) {
          state.screenSizeBySerial = {}
        }
        if (fromVersion < 1) {
          if (Array.isArray(state.selectedSerials)) return persisted
          const legacy = state.selectedSerial as string | null | undefined
          return {
            ...state,
            selectedSerials: legacy ? [legacy] : [],
            selectedSerial: undefined,
          }
        }
        let thumb =
          typeof state.livePreviewThumbHeight === 'number'
            ? state.livePreviewThumbHeight
            : 400
        if (fromVersion < 3) {
          thumb = 400
        }
        thumb = Math.min(560, Math.max(280, thumb))
        return {
          ...state,
          livePreviewThumbHeight: thumb,
        }
      },
    },
  ),
)

interface QueueEntry {
  minioKey: string
  screenshotUrl?: string
  addedAt: number
}

interface ScreenshotQueueState {
  queues: Record<string, QueueEntry[]>
  addScreenshot: (serial: string, minioKey: string, screenshotUrl?: string) => void
  snapshot: (serial: string) => string[]
  takeAll: (serial: string) => string[]
  clear: (serial: string) => void
  count: (serial: string) => number
}

export const useScreenshotQueue = create<ScreenshotQueueState>()(
  persist(
    (set, get) => ({
      queues: {},

      addScreenshot: (serial, minioKey, screenshotUrl) => {
        if (!minioKey) return
        set((state) => {
          const existing = state.queues[serial] ?? []
          if (existing.some((e) => e.minioKey === minioKey)) return state
          return {
            queues: {
              ...state.queues,
              [serial]: [...existing, { minioKey, screenshotUrl, addedAt: Date.now() }],
            },
          }
        })
      },

      snapshot: (serial) => {
        const items = get().queues[serial] ?? []
        return items.map((e) => e.minioKey)
      },

      takeAll: (serial) => {
        const keys = get().snapshot(serial)
        get().clear(serial)
        return keys
      },

      clear: (serial) => {
        set((state) => {
          const { [serial]: _, ...rest } = state.queues
          return { queues: rest }
        })
      },

      count: (serial) => (get().queues[serial] ?? []).length,
    }),
    { name: 'af-screenshot-queue' },
  ),
)

interface JobState {
  lastJobId: string | null
  setLastJobId: (id: string | null) => void
}

export const useJobStore = create<JobState>()(
  persist(
    (set) => ({
      lastJobId: null,
      setLastJobId: (id) => set({ lastJobId: id }),
    }),
    { name: 'af-last-video-job' },
  ),
)
