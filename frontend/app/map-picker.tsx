import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/common/button/Button';
import { IconButton } from '@/components/common/button/IconButton';
import BaseCard from '@/components/common/card/BaseCard';
import { SearchBar } from '@/components/common/input/SearchBar';
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
  // 커스텀 스크롤바 계산용: 리스트 전체 내용 높이, 지금 스크롤된 위치.
  const [contentHeight, setContentHeight] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  const scrollViewRef = useRef<ScrollView>(null);
  // 각 카드가 리스트 안에서 세로로 몇 px 위치에 있는지 기록해뒀다가, 핀 클릭 시 그 위치로 스크롤한다.
  const cardOffsets = useRef<number[]>([]);

  // 현재 위치 권한을 요청하고, 허용되면 위치를 가져와 currentLocation에 저장한다.
  // 화면 진입 시 한 번, 그리고 "현재 위치" 버튼을 눌렀을 때도 다시 호출된다.
  const handleLocate = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return;
    }

    // 권한이 있어도 기기 위치 서비스 자체가 꺼져 있으면 getCurrentPositionAsync가 멈출 수 있어 먼저 확인한다.
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      return;
    }

    try {
      const position = await Location.getCurrentPositionAsync({});
      setCurrentLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
      // 선택/미리보기 중이던 위치가 있으면 지도가 그쪽으로 가있으니, 내 위치로 돌아가려면 둘 다 비워야 한다.
      setSelected(null);
      setPreviewCenter(null);
    } catch {
      // 실패하면 currentLocation은 null로 남고, DEFAULT_CENTER로 대체된다.
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

  // 지도를 탭했을 때 호출되는 함수. 탭한 좌표를 주소로 변환해서 selected에 저장한다.
  // (검색과 달리 리스트에서 고르는 게 아니라 좌표 하나뿐이라, 확정 전에 주소를 보여주고 확인받는 단계가 필요하다.)
  const handleMapTap = async (coords: { lat: number; lng: number }) => {
    const address = await reverseGeocode(coords);
    setSelected({
      name: address ?? '주소를 찾을 수 없습니다',
      address: address ?? '주소를 찾을 수 없습니다',
      lat: coords.lat,
      lng: coords.lng,
    });
  };

  // 지도 탭으로 뜬 확인 카드의 "선택" 버튼을 눌렀을 때 호출되는 함수. 고른 위치를 전역 store에 저장하고 이전 화면으로 돌아간다.
  const handleConfirm = () => {
    if (!selected) {
      return;
    }
    setPickedLocation(selected);
    router.back();
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollY(event.nativeEvent.contentOffset.y);
  };

  const center = selected
    ? { lat: selected.lat, lng: selected.lng }
    : (previewCenter ?? currentLocation ?? DEFAULT_CENTER);

  // 스크롤 가능한 만큼만(실제 내용이 더 길 때만) 커스텀 스크롤바를 보여준다.
  const showScrollbar = contentHeight > LIST_HEIGHT;
  const thumbHeight = showScrollbar ? Math.max((LIST_HEIGHT / contentHeight) * LIST_HEIGHT, 24) : 0;
  const thumbTop = showScrollbar
    ? (scrollY / (contentHeight - LIST_HEIGHT)) * (LIST_HEIGHT - thumbHeight)
    : 0;

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

      <SearchBar
        onSearch={handleSearch}
        style={{ position: 'absolute', top: insets.top + 16, left: 16, right: 16 }}
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

            <View style={{ flexDirection: 'row' }}>
              <ScrollView
                ref={scrollViewRef}
                style={{ maxHeight: LIST_HEIGHT, flex: 1 }}
                showsVerticalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                onContentSizeChange={(_, height) => setContentHeight(height)}>
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
                      <Pressable style={{ flex: 1 }} onPress={() => handlePreviewResult(place, index)}>
                        <Text>{place.name}</Text>
                        <Text style={{ color: Colors.light.textSecondary }}>{place.address}</Text>
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
              </ScrollView>

              {showScrollbar && (
                <View style={{ width: 4, height: LIST_HEIGHT, marginLeft: 8, backgroundColor: '#fff', borderRadius: 2 }}>
                  <View
                    style={{
                      position: 'absolute',
                      top: thumbTop,
                      width: 4,
                      height: thumbHeight,
                      backgroundColor: Colors.light.primary,
                      borderRadius: 2,
                    }}
                  />
                </View>
              )}
            </View>
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
