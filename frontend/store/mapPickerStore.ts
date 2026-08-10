import { create } from 'zustand';

// map-picker 화면에서 사용자가 지도로 고른 위치를, 그 화면을 연 원래 화면(MapInput 등)에
// 전달하기 위해 잠깐 담아두는 전역 store. map-picker가 값을 써넣고,
// 원래 화면이 그 값을 읽어서 자기 상태에 반영한 뒤 비운다.

type PickedLocation = {
  address: string;
  lat: number;
  lng: number;
};

type MapPickerStore = {
  // 선택한 위치
  pickedLocation: PickedLocation | null;
  // 위치 저장
  setPickedLocation: (location: PickedLocation) => void;
  // 위치 제거
  clearPickedLocation: () => void;
  // map-picker를 열기 전, 이미 정해진 위치(예: 추천 알림의 주소)를 미리 보여주고 싶을 때 쓰는 값.
  // pickedLocation과 반대 방향(원래 화면 → map-picker)으로 흐른다.
  initialLocation: PickedLocation | null;
  setInitialLocation: (location: PickedLocation) => void;
  clearInitialLocation: () => void;
};

export const useMapPickerStore = create<MapPickerStore>((set) => ({
  pickedLocation: null,
  setPickedLocation: (location) => set({ pickedLocation: location }),
  clearPickedLocation: () => set({ pickedLocation: null }),
  initialLocation: null,
  setInitialLocation: (location) => set({ initialLocation: location }),
  clearInitialLocation: () => set({ initialLocation: null }),
}));
