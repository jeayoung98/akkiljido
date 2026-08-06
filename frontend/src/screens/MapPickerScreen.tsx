import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/common/button/Button';
import { IconButton } from '@/components/common/button/IconButton';
import BaseCard from '@/components/common/card/BaseCard';
import { SearchInput } from '@/components/common/input/SearchInput';
import { Scroll } from '@/components/common/Scroll';
import { KakaoMap, type KakaoMapHandle, type MapBounds } from '@/components/map/KakaoMap';
import { MapZoom } from '@/components/map/MapZoom';
import Colors from '@/constants/Colors';
import { useMapPickerStore } from '@/store/mapPickerStore';
import { reverseGeocode } from '@/utils/kakaoGeocode';
import { searchPlaces, type PlaceResult } from '@/utils/kakaoSearch';

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 };
const LIST_HEIGHT = 160;
// 오른쪽에 세로로 쌓이는 컨트롤들의 높이. 검색줄(44) 아래 내 위치 → 줌 → 로드뷰 순서로 배치하는 계산에 쓴다.
const LOCATE_BUTTON_HEIGHT = 44;
const ZOOM_CONTROL_HEIGHT = 89; // MapZoom 높이(버튼 44 x 2 + 구분선 1)

// 지도에서 장소를 선택하는 화면
export default function MapPickerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setPickedLocation = useMapPickerStore((state) => state.setPickedLocation);
  const initialLocation = useMapPickerStore((state) => state.initialLocation);
  const clearInitialLocation = useMapPickerStore((state) => state.clearInitialLocation);
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  // 지도를 직접 탭했을 때만 쓰인다. 검색 결과는 리스트에서 "선택" 누르면 바로 확정되고, 이 state를 거치지 않는다.
  // initialLocation이 있으면(추천 알림 등) 첫 렌더부터 그 위치로 선택된 상태로 시작해서, KakaoMap의
  // initialCenter(첫 렌더 값으로 고정됨)가 처음부터 그 좌표를 향하게 한다 — WebView가 늦게 준비되는
  // 문제 때문에 setCenter만으로는 항상 중앙에 오지 않는다.
  const [selected, setSelected] = useState<PlaceResult | null>(() =>
    initialLocation
      ? { name: initialLocation.address, address: initialLocation.address, lat: initialLocation.lat, lng: initialLocation.lng }
      : null,
  );
  // 검색 결과 리스트에서 카드(선택 버튼 제외)를 눌렀을 때, 지도만 미리 이동시키는 용도.
  const [previewCenter, setPreviewCenter] = useState<{ lat: number; lng: number } | null>(null);
  // 지도의 핀을 눌렀을 때, 리스트에서 그 핀에 해당하는 카드를 강조하기 위한 인덱스.
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  // 검색을 한 번이라도 실행했는지. results가 빈 배열일 때 "아직 검색 안 함"과 "검색했는데 결과 없음"을 구분하는 용도.
  const [hasSearched, setHasSearched] = useState(false);
  // 현재 위치. 권한 거부/실패 시 null로 남고, 그럴 땐 DEFAULT_CENTER를 대신 쓴다.
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  // 로드뷰 모드(도로 파란 선 표시)가 켜져 있는지. 켜져 있는 동안 지도 탭은 위치 선택 대신 로드뷰 열기로 동작한다.
  const [roadviewMode, setRoadviewMode] = useState(false);
  // 로드뷰(거리 사진)가 실제로 떠 있는지. WebView 쪽에서 열리고 닫힐 때 알려준다.
  const [roadviewOpen, setRoadviewOpen] = useState(false);

  const mapRef = useRef<KakaoMapHandle>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  // 각 카드가 리스트 안에서 세로로 몇 px 위치에 있는지 기록해뒀다가, 핀 클릭 시 그 위치로 스크롤한다.
  const cardOffsets = useRef<number[]>([]);
  // 지금 화면에 보이는 지도의 중심 좌표. 검색을 "여기서 가까운 순"으로 정렬하는 기준으로 쓴다.
  // 지도를 드래그/확대할 때마다 갱신되지만 화면을 다시 그릴 필요는 없어서 state 대신 ref에 담는다.
  const mapCenterRef = useRef<{ lat: number; lng: number } | null>(null);

  // 지도 이동·확대·축소가 끝날 때마다 화면 경계를 받아, 그 한가운데를 현재 중심으로 기록한다.
  // (KakaoMap이 중심 좌표를 따로 알려주지 않아 경계값의 중점으로 계산한다.)
  const handleBoundsChange = (bounds: MapBounds) => {
    mapCenterRef.current = {
      lat: (bounds.south + bounds.north) / 2,
      lng: (bounds.west + bounds.east) / 2,
    };
  };

  // 좌표를 "선택된 상태"로 즉시 반영한다 — 주소는 "주소 확인 중..."으로 먼저 보여주고,
  // reverseGeocode가 끝나면 실제 주소로 교체한다(패널 자체는 좌표만 있어도 바로 뜨게 하기 위함).
  const selectLocation = async (coords: { lat: number; lng: number }) => {
    setSelected({ name: '주소 확인 중...', address: '주소 확인 중...', lat: coords.lat, lng: coords.lng });
    const address = await reverseGeocode(coords);
    setSelected({
      name: address ?? '주소를 찾을 수 없습니다',
      address: address ?? '주소를 찾을 수 없습니다',
      lat: coords.lat,
      lng: coords.lng,
    });
  };

  // 현재 위치 권한을 요청하고, 허용되면 위치를 가져와 currentLocation에 저장한다.
  // 화면 진입 시 한 번, 그리고 "현재 위치" 버튼을 눌렀을 때도 다시 호출된다.
  const handleLocate = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return;
    }

    // 권한이 있어도 기기 위치 서비스 자체가 꺼져 있으면 위치 조회가 멈출 수 있어 먼저 확인한다.
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      return;
    }

    setPreviewCenter(null);

    // 기기에 저장된 마지막 위치를 먼저 빠르게 보여주고(체감 속도 개선), 그동안 정확한 위치를 뒤에서 갱신한다.
    const lastKnown = await Location.getLastKnownPositionAsync();
    if (lastKnown) {
      const coords = { lat: lastKnown.coords.latitude, lng: lastKnown.coords.longitude };
      setCurrentLocation(coords);
      selectLocation(coords);
      // 좌표값이 이전과 같으면 initialCenter가 안 바뀌어서 지도가 재로딩 안 될 수 있으니,
      // 명령형으로 직접 지도 중심을 옮겨서 항상 확실히 이동시킨다.
      mapRef.current?.setCenter(coords);
    }

    try {
      const position = await Location.getCurrentPositionAsync({});
      const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
      setCurrentLocation(coords);
      selectLocation(coords);
      mapRef.current?.setCenter(coords);
    } catch {
      // 실패해도 위에서 lastKnown으로 이미 뭔가 떴다면 그대로 둔다. 둘 다 없으면 DEFAULT_CENTER로 대체된다.
    }
  };

  useEffect(() => {
    if (initialLocation) {
      // 이미 정해진 위치(추천 알림 등)를 갖고 들어온 경우, 현재 위치로 옮기지 않고 그 위치를 그대로 보여준다.
      return;
    }
    handleLocate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 이전 화면(예: 추천 알림)이 미리 넘겨준 위치가 있으면(selected는 이미 위에서 이 값으로 시작함),
  // WebView가 늦게 준비돼 initialCenter가 못 먹혔을 경우를 대비해 setCenter로 한 번 더 확실히 옮긴다.
  useEffect(() => {
    if (!initialLocation) {
      return;
    }
    mapRef.current?.setCenter({ lat: initialLocation.lat, lng: initialLocation.lng });
    clearInitialLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 검색창에서 검색을 실행했을 때 호출되는 함수.
  // 지금 보고 있는 지도 중심을 기준 좌표로 함께 넘겨서, 결과가 "여기서 가까운 순"으로 정렬되게 한다
  // (그러지 않으면 강남을 보면서 "스타벅스"를 검색해도 경주·제주 지점이 먼저 나온다).
  // 지도 준비 전이라 중심을 아직 못 받았다면 내 위치 → 기본 좌표(서울시청) 순으로 대신 쓴다.
  const handleSearch = async (query: string) => {
    const searchCenter = mapCenterRef.current ?? currentLocation ?? DEFAULT_CENTER;
    let places;
    try {
      places = await searchPlaces(query, searchCenter);
    } catch {
      Alert.alert('검색에 실패했어요', '잠시 후 다시 시도해주세요.');
      return;
    }
    setResults(places);
    setHasSearched(true);
    setSelected(null);
    setHighlightedIndex(null);
    if (places.length > 0) {
      const coords = { lat: places[0].lat, lng: places[0].lng };
      setPreviewCenter(coords);
      mapRef.current?.setCenter(coords);
    } else {
      setPreviewCenter(null);
    }
  };

  // 결과 카드에서 선택 버튼 제외한 부분을 눌렀을 때. 지도만 그 위치로 옮기고, 그 카드를 강조 표시한다.
  const handlePreviewResult = (place: PlaceResult, index: number) => {
    const coords = { lat: place.lat, lng: place.lng };
    setPreviewCenter(coords);
    setHighlightedIndex(index);
    mapRef.current?.setCenter(coords);
  };

  // 결과 카드의 "선택" 버튼을 눌렀을 때. 중간 확인 단계 없이 바로 이 위치를 확정하고 이전 화면으로 돌아간다.
  const handleSelectResult = (place: PlaceResult) => {
    setPickedLocation(place);
    router.back();
  };

  // 지도의 검색 결과 핀을 눌렀을 때. 지도 탭으로 떠있던 확인 패널을 닫아 리스트가 다시 보이게 하고,
  // 그 핀에 해당하는 카드로 리스트를 스크롤하고 강조 표시한다.
  const handlePinPress = (index: number) => {
    setSelected(null);
    setHighlightedIndex(index);
    const offset = cardOffsets.current[index] ?? 0;
    scrollViewRef.current?.scrollTo({ y: offset, animated: true });
  };

  // 지도를 탭했을 때 호출되는 함수. 탭한 좌표를 selected로 반영한다.
  // (검색과 달리 리스트에서 고르는 게 아니라 좌표 하나뿐이라, 확정 전에 주소를 보여주고 확인받는 단계가 필요하다.)
  // 로드뷰 모드 중에는 WebView 쪽에서 탭을 로드뷰 열기로 가로채기 때문에 이 함수는 호출되지 않는다.
  const handleMapTap = (coords: { lat: number; lng: number }) => {
    selectLocation(coords);
  };

  const handleToggleRoadview = () => {
    const next = !roadviewMode;
    setRoadviewMode(next);
    mapRef.current?.setRoadviewMode(next);
  };

  // 지도 탭으로 뜬 확인 카드의 "선택" 버튼을 눌렀을 때 호출되는 함수. 고른 위치를 전역 store에 저장하고 이전 화면으로 돌아간다.
  const handleConfirm = () => {
    if (!selected) {
      return;
    }
    setPickedLocation(selected);
    router.back();
  };

  const center = selected
    ? { lat: selected.lat, lng: selected.lng }
    : (previewCenter ?? currentLocation ?? DEFAULT_CENTER);

  return (
    <View style={{ flex: 1 }}>
      <KakaoMap
        ref={mapRef}
        initialCenter={center}
        myLocation={currentLocation ?? undefined}
        pins={results.map((place) => ({ lat: place.lat, lng: place.lng }))}
        selectedPin={selected ? { lat: selected.lat, lng: selected.lng } : undefined}
        onSelectLocation={handleMapTap}
        onPinPress={handlePinPress}
        onBoundsChange={handleBoundsChange}
        onRoadviewChange={setRoadviewOpen}
        onRoadviewUnavailable={() =>
          Alert.alert('로드뷰가 없는 지점이에요', '파란 선이 표시된 도로 근처를 눌러주세요.')
        }
        style={{ flex: 1 }}
      />

      {/* 로드뷰(거리 사진)가 떠 있는 동안엔 검색 대신 닫기 버튼만 보여준다.
          다만 지도는 아래쪽 1/3에 그대로 보이니, 그 지도를 조작할 줌 컨트롤은 그 위에 계속 띄워둔다. */}
      {roadviewOpen ? (
        <>
          <IconButton
            name="close"
            color={Colors.light.primary}
            onPress={() => mapRef.current?.closeRoadview()}
            style={{
              position: 'absolute',
              top: insets.top + 16,
              right: 16,
              backgroundColor: '#fff',
              borderRadius: 999,
              padding: 10,
            }}
          />
          <MapZoom
            onZoomIn={() => mapRef.current?.zoomIn()}
            onZoomOut={() => mapRef.current?.zoomOut()}
            style={{
              position: 'absolute',
              bottom: insets.bottom + 16,
              right: 16,
            }}
          />
        </>
      ) : (
        <>
          <SearchInput
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={() => handleSearch(searchText)}
            onSearchPress={() => handleSearch(searchText)}
            containerStyle={{ position: 'absolute', top: insets.top + 16, left: 16, right: 16 }}
          />

          <IconButton
            name="locate"
            color={Colors.light.primary}
            onPress={handleLocate}
            style={{
              position: 'absolute',
              top: insets.top + 16 + 44 + 16,
              right: 16,
              backgroundColor: '#fff',
              borderRadius: 999,
              padding: 10,
            }}
          />

          {/* 줌 컨트롤. 지도 탭과 달리 단계 점프 없이 한 레벨씩 확대/축소한다. */}
          <MapZoom
            onZoomIn={() => mapRef.current?.zoomIn()}
            onZoomOut={() => mapRef.current?.zoomOut()}
            style={{
              position: 'absolute',
              top: insets.top + 16 + 44 + 16 + LOCATE_BUTTON_HEIGHT + 12,
              right: 16,
            }}
          />

          {/* 로드뷰 모드 토글. 켜면 초록 배경으로 바뀌고, 지도 탭이 위치 선택 대신 로드뷰 열기로 동작한다. */}
          <IconButton
            name="roadview"
            color={roadviewMode ? '#fff' : Colors.light.primary}
            onPress={handleToggleRoadview}
            style={{
              position: 'absolute',
              top: insets.top + 16 + 44 + 16 + LOCATE_BUTTON_HEIGHT + 12 + ZOOM_CONTROL_HEIGHT + 12,
              right: 16,
              backgroundColor: roadviewMode ? Colors.light.primary : '#fff',
              borderRadius: 999,
              padding: 10,
            }}
          />
        </>
      )}

      {hasSearched && !selected && (
        results.length > 0 ? (
          <View
            style={{
              position: 'absolute',
              bottom: 16,
              left: 16,
              right: 16,
              backgroundColor: '#E4EFE1',
              borderRadius: 16,
              padding: 12,
              maxHeight: 220,
            }}>
            {/* 정렬 기준을 적어두면 "왜 이 순서인지"가 바로 보인다. */}
            <Text style={{ alignSelf: 'flex-end', color: Colors.light.textSecondary, marginBottom: 8 }}>
              가까운 순 · 검색 결과 {results.length}개
            </Text>

            <Scroll ref={scrollViewRef} height={LIST_HEIGHT}>
              {results.map((place, index) => (
                <View
                  key={`${place.lat}-${place.lng}`}
                  style={{ marginBottom: 8 }}
                  onLayout={(event) => {
                    cardOffsets.current[index] = event.nativeEvent.layout.y;
                  }}>
                  <BaseCard
                    style={[
                      { flexDirection: 'row', alignItems: 'center', gap: 8 },
                      highlightedIndex === index && { borderWidth: 2, borderColor: Colors.light.primary },
                    ]}>
                    <Pressable
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                      onPress={() => handlePreviewResult(place, index)}>
                      <View style={{ flex: 1 }}>
                        <Text>{place.name}</Text>
                        <Text style={{ color: Colors.light.textSecondary }}>{place.address}</Text>
                      </View>
                      <View
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 999,
                          backgroundColor: Colors.light.primary,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                        <Ionicons name="location" size={16} color="#fff" />
                      </View>
                    </Pressable>
                    <Button
                      variant="green"
                      style={{ height: 36, paddingHorizontal: 16 }}
                      onPress={() => handleSelectResult(place)}>
                      선택
                    </Button>
                  </BaseCard>
                </View>
              ))}
            </Scroll>
          </View>
        ) : (
          <BaseCard style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
            <Text>검색 결과가 없습니다</Text>
          </BaseCard>
        )
      )}

      {selected && (
        <BaseCard style={{ position: 'absolute', bottom: 16, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ flex: 1 }}>{selected.address}</Text>
          <Button
            variant="green"
            style={{ height: 36, paddingHorizontal: 16 }}
            onPress={handleConfirm}>
            선택
          </Button>
        </BaseCard>
      )}
    </View>
  );
}
