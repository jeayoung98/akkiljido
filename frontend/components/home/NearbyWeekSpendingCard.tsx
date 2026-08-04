import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { KakaoMap, type KakaoMapHandle, type LatLng, type MapMarker } from '@/components/map/KakaoMap';
import Colors from '@/constants/Colors';
import type { NearbyExpensePlace } from '@/mocks/home';

// 카드 안 미니 지도가 첫 화면부터 내 주변 2km 정도로 좁게 보이는 줌 레벨.
const MAP_LEVEL = 6;
const DEFAULT_CENTER: LatLng = { lat: 37.4979, lng: 127.0276 };

// 목데이터 장소 좌표는 강남역 기준 고정값이라, 실제 GPS 위치로 지도가 옮겨가면(테스트하는 사람 위치에 따라)
// 현재 위치 점이랑 마커들 사이 상대 위치가 어긋나서 한쪽에 몰려 보일 수 있다.
// 그래서 마커는 목데이터의 절대 좌표 대신, 현재 위치 기준 상대 오프셋(왼쪽 2개·오른쪽 2개)으로 계산한다.
const MARKER_OFFSETS: LatLng[] = [
  { lat: 0.004, lng: -0.006 },
  { lat: 0.004, lng: 0.006 },
  { lat: -0.004, lng: -0.006 },
  { lat: -0.004, lng: 0.006 },
];

type NearbyWeekSpendingCardProps = {
  totalAmount: number;
  places: NearbyExpensePlace[];
};

/**
 * 홈 화면의 "내 주변 7일간 지출" 섹션. 현재 위치(파란 점) + 장소별 말풍선(이름+금액)을 보여준다.
 * 반경 원은 안 그린다(장소 상세 화면과 달리 카드가 작아서 원까지 그리면 답답해 보임).
 * 미리보기 용도라 이동·확대·축소를 전부 막아서 항상 내 위치 기준 2km만 고정으로 보여준다.
 */
export function NearbyWeekSpendingCard({ totalAmount, places }: NearbyWeekSpendingCardProps) {
  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
  // WebView 안의 카카오맵 SDK가 실제로 준비되기 전에 setCenter를 부르면 조용히 무시된다.
  // GPS 위치를 지도 준비보다 먼저 받아오는 경우가 많아서, 준비 신호를 따로 기다린다.
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<KakaoMapHandle>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      setCurrentLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
    })();
  }, []);

  // 지도는 initialCenter를 최초 1회만 HTML에 굽기 때문에(리로드 방지), 위치를 늦게 받아온 경우
  // 지도 중심이 DEFAULT_CENTER에 그대로 남아있는다. 지도가 준비되고 위치도 확보된 뒤에
  // (둘 중 어느 게 먼저 끝나든) setCenter로 명시적으로 옮겨준다.
  useEffect(() => {
    if (mapReady && currentLocation) {
      mapRef.current?.setCenter(currentLocation);
    }
  }, [mapReady, currentLocation]);

  const center = currentLocation ?? DEFAULT_CENTER;

  const markers: MapMarker[] = places.map((place, index) => {
    const offset = MARKER_OFFSETS[index % MARKER_OFFSETS.length];
    return {
      id: place.name,
      lat: center.lat + offset.lat,
      lng: center.lng + offset.lng,
      label: place.name,
      amount: place.amount,
      color: Colors.light.primary,
    };
  });

  return (
    <View style={styles.section}>
      <Text style={styles.title}>내 주변 7일간 지출</Text>
      <Text style={styles.subtitle}>현위치 기준 2km 반경 · 총 {totalAmount.toLocaleString('ko-KR')}원</Text>

      <View style={styles.mapCard}>
        <KakaoMap
          ref={mapRef}
          draggable={false}
          initialCenter={center}
          initialLevel={MAP_LEVEL}
          markers={markers}
          myPlaceDot={center}
          onReady={() => setMapReady(true)}
          style={styles.map}
          zoomable={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: Colors.light.cardBackground,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  title: {
    color: Colors.light.cardTitle,
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: -8,
    color: Colors.light.cardDescription,
    fontSize: 12,
  },
  mapCard: {
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.light.cardMutedBackground,
  },
  map: {
    flex: 1,
  },
});
