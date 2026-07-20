import { create } from 'zustand'

interface AppState {
  isInitialized: boolean
}

export const useAppStore = create<AppState>(() => ({
  isInitialized: true,
}))
