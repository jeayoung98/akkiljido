import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { KakaoMap, type KakaoMapHandle, type LatLng, type MapMarker } from '@/components/map/KakaoMap';
import Colors from '@/constants/Colors';
import type { NearbyExpensePlace } from '@/mocks/home';
import { getDistanceMeters } from '@/utils/notificationTrigger';

// 카드 안 미니 지도가 첫 화면부터 내 주변 2km 정도로 좁게 보이는 줌 레벨.
const MAP_LEVEL = 6;
const DEFAULT_CENTER: LatLng = { lat: 37.4979, lng: 127.0276 };
// 이 거리(m) 안에 있는 장소들은 이 줌 레벨(2km 반경)에서는 말풍선이 서로 겹쳐 하나만 보이므로,
// 아예 하나로 묶어서 보여준다. 어차피 미리보기 지도를 탭하면 전체 지도로 이동해 각각 확대해서
// 볼 수 있어서, 여기서는 넉넉하게 500m 이내를 "같은 자리"로 본다.
const OVERLAP_DISTANCE_METERS = 500;

/** 가까운 장소끼리 묶는다. 이미 만들어진 그룹 중 하나와 겹치면 그 그룹에 합류시킨다. */
function groupNearbyPlaces(places: NearbyExpensePlace[]): NearbyExpensePlace[][] {
  const groups: NearbyExpensePlace[][] = [];

  for (const place of places) {
    const existingGroup = groups.find(
      (group) => getDistanceMeters(group[0], place) <= OVERLAP_DISTANCE_METERS,
    );
    if (existingGroup) {
      existingGroup.push(place);
    } else {
      groups.push([place]);
    }
  }

  return groups;
}

type NearbyWeekSpendingCardProps = {
  totalAmount: number;
  places: NearbyExpensePlace[];
  // 위치 권한 요청·GPS 조회는 HomeScreen이 API 호출용으로 이미 한 번 하기 때문에, 카드가 따로
  // 다시 조회하지 않고 그 결과를 그대로 받아 쓴다(권한 팝업 중복, API와 지도 중심 위치가
  // 어긋나는 것 방지).
  currentLocation: LatLng | null;
  locationUnavailable: boolean;
};

/**
 * 홈 화면의 "내 주변 7일간 지출" 섹션. 현재 위치(파란 점) + 장소별 말풍선(이름+금액)을 보여준다.
 * 반경 원은 안 그린다(장소 상세 화면과 달리 카드가 작아서 원까지 그리면 답답해 보임).
 * 미리보기 용도라 이동·확대·축소를 전부 막아서 항상 내 위치 기준 2km만 고정으로 보여준다.
 */
export function NearbyWeekSpendingCard({
  totalAmount,
  places,
  currentLocation,
  locationUnavailable,
}: NearbyWeekSpendingCardProps) {
  // WebView 안의 카카오맵 SDK가 실제로 준비되기 전에 setCenter를 부르면 조용히 무시된다.
  // GPS 위치를 지도 준비보다 먼저 받아오는 경우가 많아서, 준비 신호를 따로 기다린다.
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<KakaoMapHandle>(null);

  // 지도는 initialCenter를 최초 1회만 HTML에 굽기 때문에(리로드 방지), 위치를 늦게 받아온 경우
  // 지도 중심이 DEFAULT_CENTER에 그대로 남아있는다. 지도가 준비되고 위치도 확보된 뒤에
  // (둘 중 어느 게 먼저 끝나든) setCenter로 명시적으로 옮겨준다.
  useEffect(() => {
    if (mapReady && currentLocation) {
      mapRef.current?.setCenter(currentLocation);
    }
  }, [mapReady, currentLocation]);

  const center = currentLocation ?? DEFAULT_CENTER;

  // 겹치는 장소는 그룹으로 묶어서, 그 안에서 가장 큰 금액 하나만 말풍선에 보여주고 나머지는
  // "+N"으로 표시한다(전체 지도에서 확대해서 각각 보는 건 미리보기 탭 이동으로 이미 가능하다).
  const markers: MapMarker[] = groupNearbyPlaces(places).map((group) => {
    const topPlace = group.reduce((max, place) => (place.amount > max.amount ? place : max));
    const extraCount = group.length - 1;

    return {
      // place.name은 같은 이름의 다른 지점이 있을 수 있어 고유하지 않다. 좌표 조합을 id로 쓴다
      // (MapScreen의 일반 가게 마커도 같은 방식을 쓴다).
      id: `${topPlace.latitude},${topPlace.longitude}`,
      lat: topPlace.latitude,
      lng: topPlace.longitude,
      label: extraCount > 0 ? `${topPlace.name} +${extraCount}` : topPlace.name,
      amount: topPlace.amount,
      color: Colors.light.primary,
    };
  });

  return (
    <View style={styles.section}>
      <Text style={styles.title}>내 주변 7일간 지출</Text>
      <Text style={styles.subtitle}>
        {locationUnavailable
          ? '현재 위치를 가져올 수 없어 기본 위치 기준으로 보여드려요'
          : `현위치 기준 2km 반경 · 총 ${totalAmount.toLocaleString('ko-KR')}원`}
      </Text>

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
        {/* 미리보기 지도는 자체 터치(드래그/확대)가 막혀 있으니, 탭하면 지도 탭으로 이동시킨다.
            WebView 위에 얹어서 지도 내부 터치가 아니라 이 Pressable이 먼저 터치를 받게 한다. */}
        <Pressable onPress={() => router.push('/map')} style={StyleSheet.absoluteFill} />
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
