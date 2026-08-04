import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { KakaoMap, type LatLng, type MapMarker } from '@/components/map/KakaoMap';
import Colors from '@/constants/Colors';
import type { NearbyExpensePlace } from '@/mocks/home';

// 카드 안 미니 지도에서 반경 2km 원이 대략 다 들어와 보이는 줌 레벨.
// MapScreen의 내 장소 상세(레벨 6)는 전체 화면 기준이라, 카드처럼 훨씬 작은 영역에서는
// 그보다 더 축소해야 같은 물리적 반경이 다 보인다.
const MAP_LEVEL = 8;
const DEFAULT_CENTER: LatLng = { lat: 37.4979, lng: 127.0276 };

type NearbyWeekSpendingCardProps = {
  totalAmount: number;
  places: NearbyExpensePlace[];
};

/**
 * 홈 화면의 "내 주변 7일간 지출" 섹션. 현재 위치 기준 2km 반경 원 + 장소별 말풍선(이름+금액)을 보여준다.
 * 지도는 확인용 미리보기라 손가락으로 만져도 움직이지 않게, 지도 위에 터치를 가로채는 투명 레이어를 덮는다.
 */
export function NearbyWeekSpendingCard({ totalAmount, places }: NearbyWeekSpendingCardProps) {
  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);

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

  const center = currentLocation ?? DEFAULT_CENTER;

  const markers: MapMarker[] = places.map((place) => ({
    id: place.name,
    lat: place.latitude,
    lng: place.longitude,
    label: place.name,
    amount: place.amount,
    color: Colors.light.primary,
  }));

  return (
    <View style={styles.section}>
      <Text style={styles.title}>내 주변 7일간 지출</Text>
      <Text style={styles.subtitle}>현위치 기준 2km 반경 · 총 {totalAmount.toLocaleString('ko-KR')}원</Text>

      <View style={styles.mapCard}>
        <KakaoMap
          initialCenter={center}
          initialLevel={MAP_LEVEL}
          markers={markers}
          myPlaceCircle={center}
          style={styles.map}
        />
        {/* 미리보기 지도라 손을 대도 안 움직이게, 지도 위 터치를 여기서 가로채고 아래로 넘기지 않는다. */}
        <View style={StyleSheet.absoluteFill} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
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
    backgroundColor: Colors.light.cardBackground,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  map: {
    flex: 1,
  },
});
