import { KakaoMap } from '@/components/map/KakaoMap';

export default function MapPickerScreen() {
  return (
    <KakaoMap
      initialCenter={{ lat: 37.5665, lng: 126.978 }}
      onSelectLocation={(coords) => console.log('selected', coords)}
      style={{ flex: 1 }}
    />
  );
}
