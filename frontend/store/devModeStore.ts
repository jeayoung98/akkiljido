import { create } from 'zustand';

// 설정 화면의 "개발자 모드" 스위치 상태. 리포트 표시 등 여러 화면에서 참조할 수 있도록 전역으로 둔다.
type DevModeStore = {
  isDevMode: boolean;
  setDevMode: (value: boolean) => void;
};

export const useDevModeStore = create<DevModeStore>((set) => ({
  isDevMode: false,
  setDevMode: (value) => set({ isDevMode: value }),
}));
