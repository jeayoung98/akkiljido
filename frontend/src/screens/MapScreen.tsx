import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BottomSheet from '@/components/common/BottomSheet';
import { IconButton } from '@/components/common/button/IconButton';
import InfoListItem from '@/components/common/card/InfoListItem';
import { SearchInput } from '@/components/common/input/SearchInput';
import { KakaoMap, type KakaoMapHandle, type LatLng } from '@/components/map/KakaoMap';
import { MapZoom } from '@/components/map/MapZoom';
import Colors from '@/constants/Colors';
import { searchPlaces, type PlaceResult } from '@/utils/kakaoSearch';
import { getZoomStage, STAGE_TARGET_LEVEL } from '@/utils/kakaoZoomStage';

const INITIAL_LEVEL = 4;

const DEFAULT_CENTER: LatLng = { lat: 37.5665, lng: 126.978 };
const SEARCH_BAR_HEIGHT = 52;
const LOCATE_BUTTON_HEIGHT = 44;

// "내 장소" 더미 목록. 실제 API 연동 전까지 임시로 쓴다.
const DUMMY_PLACES = [
  { name: '집', address: '서울 마포구 서교동 123-4' },
  { name: '회사', address: '서울 강남구 역삼동 456-7' },
  { name: '학교', address: '서울 서대문구 신촌동 789' },
];

// 지도 탭 화면. 검색·필터·내 위치·내 장소 목록을 잡아두고,
// 줌 컨트롤/마커 라벨/클러스터링은 이 화면이 자리 잡은 뒤에 이어서 붙인다.
export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<KakaoMapHandle>(null);
  const [searchText, setSearchText] = useState('');
  // 검색해서 찾은 장소. 있으면 지도 중심과 선택 핀으로 쓰인다.
  const [searchedPlace, setSearchedPlace] = useState<PlaceResult | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
  // 카카오맵의 현재 줌 레벨. 줌 버튼으로 바꾸든 손가락으로 핀치줌하든 onLevelChange로 여기 반영된다.
  const [currentLevel, setCurrentLevel] = useState(INITIAL_LEVEL);

  // MapPickerScreen과 같은 방식: 권한 허용 시 마지막 알려진 위치를 먼저 빠르게 보여주고, 정확한 위치로 뒤이어 갱신한다.
  // "내 위치" 버튼을 눌렀을 때도 이 함수를 다시 호출한다.
  const handleLocate = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return;
    }

    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      return;
    }

    setSearchedPlace(null);

    const lastKnown = await Location.getLastKnownPositionAsync();
    if (lastKnown) {
      const coords = { lat: lastKnown.coords.latitude, lng: lastKnown.coords.longitude };
      setCurrentLocation(coords);
      // 좌표값이 이전과 같으면 initialCenter가 안 바뀌어서 지도가 재로딩 안 될 수 있으니,
      // 명령형으로 직접 지도 중심을 옮겨서 항상 확실히 이동시킨다.
      mapRef.current?.setCenter(coords);
    }

    try {
      const position = await Location.getCurrentPositionAsync({});
      const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
      setCurrentLocation(coords);
      mapRef.current?.setCenter(coords);
    } catch {
      // 실패해도 lastKnown으로 이미 떴다면 그대로 두고, 둘 다 없으면 DEFAULT_CENTER로 대체된다.
    }
  };

  useEffect(() => {
    handleLocate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 검색어로 장소를 찾아 지도 중심을 그 위치로 옮긴다.
  const handleSearch = async () => {
    if (!searchText.trim()) {
      return;
    }
    const results = await searchPlaces(searchText);
    if (results.length > 0) {
      setSearchedPlace(results[0]);
    }
  };

  const center = searchedPlace
    ? { lat: searchedPlace.lat, lng: searchedPlace.lng }
    : (currentLocation ?? DEFAULT_CENTER);

  // 버튼 한 번 누를 때마다 레벨을 1씩 바꾸는 대신, 4단계(개별/읍면동/시군구/시도) 중 다음 단계로 바로 점프한다.
  const currentStage = getZoomStage(currentLevel);

  const handleZoomIn = () => {
    const nextStage = Math.min(currentStage + 1, 4) as 1 | 2 | 3 | 4;
    mapRef.current?.setLevel(STAGE_TARGET_LEVEL[nextStage]);
  };

  const handleZoomOut = () => {
    const nextStage = Math.max(currentStage - 1, 1) as 1 | 2 | 3 | 4;
    mapRef.current?.setLevel(STAGE_TARGET_LEVEL[nextStage]);
  };

  return (
    <View style={{ flex: 1 }}>
      <KakaoMap
        ref={mapRef}
        initialCenter={center}
        initialLevel={INITIAL_LEVEL}
        myLocation={currentLocation ?? undefined}
        selectedPin={searchedPlace ? { lat: searchedPlace.lat, lng: searchedPlace.lng } : undefined}
        onLevelChange={setCurrentLevel}
        style={{ flex: 1 }}
      />

      {/* 필터 기능은 아직 연동 전이라 자리만 잡아둔다 */}
      <View
        style={{
          position: 'absolute',
          top: insets.top + 16,
          left: 16,
          right: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}>
        <SearchInput
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={handleSearch}
          onSearchPress={handleSearch}
          placeholder="장소, 주소 검색"
          containerStyle={{ flex: 1 }}
        />
        <IconButton
          name="filter"
          color={Colors.light.primary}
          onPress={() => {}}
          style={{ backgroundColor: Colors.light.cardBackground, borderRadius: 999, padding: 10 }}
        />
      </View>

      {/* 내 위치 버튼. MapPickerScreen과 같은 위치(검색줄 바로 아래, 오른쪽 정렬)에 둔다. */}
      <IconButton
        name="locate"
        color={Colors.light.primary}
        onPress={handleLocate}
        style={{
          position: 'absolute',
          top: insets.top + 16 + SEARCH_BAR_HEIGHT + 12,
          right: 16,
          backgroundColor: Colors.light.cardBackground,
          borderRadius: 999,
          padding: 10,
        }}
      />

      {/* 줌 컨트롤. 내 위치 버튼 바로 아래. KakaoMap의 ref로 실제 레벨을 바꾼다(양방향 연결됨). */}
      <MapZoom
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        style={{
          position: 'absolute',
          top: insets.top + 16 + SEARCH_BAR_HEIGHT + 12 + LOCATE_BUTTON_HEIGHT + 12,
          right: 16,
        }}
      />

      {/* 내 장소 목록. 드래그로 높이를 바꿀 수 있고, 배경(지도)은 계속 조작 가능하다.
          "내 장소 N개"는 핸들 바로 아래, 접혔을 때(peek 상태)도 보이는 자리에 가운데 정렬로 둔다. */}
      <BottomSheet visible modal={false} minHeight={0.08} maxHeight={0.5} dismissOnDragDown={false}>
        <Text
          style={{
            textAlign: 'center',
            paddingBottom: 8,
            color: Colors.light.cardTitle,
            fontSize: 15,
            fontWeight: '700',
          }}>
          내 장소 {DUMMY_PLACES.length}개
        </Text>
        <View style={{ paddingHorizontal: 16 }}>
          {DUMMY_PLACES.map((place) => (
            <InfoListItem key={place.name} title={place.name} description={place.address} />
          ))}
        </View>
      </BottomSheet>
    </View>
  );
}
