import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/common/button/Button';
import { IconButton } from '@/components/common/button/IconButton';
import BaseCard from '@/components/common/card/BaseCard';
import { SearchInput } from '@/components/common/input/SearchInput';
import { Scroll } from '@/components/common/Scroll';
import { KakaoMap } from '@/components/map/KakaoMap';
import Colors from '@/constants/Colors';
import { useMapPickerStore } from '@/store/mapPickerStore';
import { reverseGeocode } from '@/utils/kakaoGeocode';
import { searchPlaces, type PlaceResult } from '@/utils/kakaoSearch';

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 };
const LIST_HEIGHT = 160;

// 지도에서 장소를 선택하는 화면
export default function MapPickerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setPickedLocation = useMapPickerStore((state) => state.setPickedLocation);
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  // 지도를 직접 탭했을 때만 쓰인다. 검색 결과는 리스트에서 "선택" 누르면 바로 확정되고, 이 state를 거치지 않는다.
  const [selected, setSelected] = useState<PlaceResult | null>(null);
  // 검색 결과 리스트에서 카드(선택 버튼 제외)를 눌렀을 때, 지도만 미리 이동시키는 용도.
  const [previewCenter, setPreviewCenter] = useState<{ lat: number; lng: number } | null>(null);
  // 지도의 핀을 눌렀을 때, 리스트에서 그 핀에 해당하는 카드를 강조하기 위한 인덱스.
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  // 검색을 한 번이라도 실행했는지. results가 빈 배열일 때 "아직 검색 안 함"과 "검색했는데 결과 없음"을 구분하는 용도.
  const [hasSearched, setHasSearched] = useState(false);
  // 현재 위치. 권한 거부/실패 시 null로 남고, 그럴 땐 DEFAULT_CENTER를 대신 쓴다.
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  // 각 카드가 리스트 안에서 세로로 몇 px 위치에 있는지 기록해뒀다가, 핀 클릭 시 그 위치로 스크롤한다.
  const cardOffsets = useRef<number[]>([]);

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
    }

    try {
      const position = await Location.getCurrentPositionAsync({});
      const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
      setCurrentLocation(coords);
      selectLocation(coords);
    } catch {
      // 실패해도 위에서 lastKnown으로 이미 뭔가 떴다면 그대로 둔다. 둘 다 없으면 DEFAULT_CENTER로 대체된다.
    }
  };

  useEffect(() => {
    handleLocate();
  }, []);

  // 검색창에서 검색을 실행했을 때 호출되는 함수. 결과를 저장하고, 지도는 첫 번째 결과 위치로 옮긴다.
  const handleSearch = async (query: string) => {
    const places = await searchPlaces(query);
    setResults(places);
    setHasSearched(true);
    setSelected(null);
    setHighlightedIndex(null);
    setPreviewCenter(places.length > 0 ? { lat: places[0].lat, lng: places[0].lng } : null);
  };

  // 결과 카드에서 선택 버튼 제외한 부분을 눌렀을 때. 지도만 그 위치로 옮기고, 그 카드를 강조 표시한다.
  const handlePreviewResult = (place: PlaceResult, index: number) => {
    setPreviewCenter({ lat: place.lat, lng: place.lng });
    setHighlightedIndex(index);
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
  const handleMapTap = (coords: { lat: number; lng: number }) => {
    selectLocation(coords);
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
        initialCenter={center}
        myLocation={currentLocation ?? undefined}
        pins={results.map((place) => ({ lat: place.lat, lng: place.lng }))}
        selectedPin={selected ? { lat: selected.lat, lng: selected.lng } : undefined}
        onSelectLocation={handleMapTap}
        onPinPress={handlePinPress}
        style={{ flex: 1 }}
      />

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
            <Text style={{ alignSelf: 'flex-end', color: Colors.light.textSecondary, marginBottom: 8 }}>
              검색 결과: {results.length}개
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
