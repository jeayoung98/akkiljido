import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BottomSheet from '@/components/common/BottomSheet';
import { Button } from '@/components/common/button/Button';
import { IconButton } from '@/components/common/button/IconButton';
import AccordionCard from '@/components/common/card/AccordionCard';
import InfoListItem from '@/components/common/card/InfoListItem';
import { Chip } from '@/components/common/chip/Chip';
import { DateInput } from '@/components/common/input/DateInput';
import { SearchInput } from '@/components/common/input/SearchInput';
import { KakaoMap, type KakaoMapHandle, type LatLng, type MapMarker } from '@/components/map/KakaoMap';
import { MapZoom } from '@/components/map/MapZoom';
import Colors from '@/constants/Colors';
import { MY_PLACES, toMapDepthResponse, toMapPlaceListResponse, toMyPlaceDetailResponse } from '@/mocks/transactions';
import { searchPlaces, type PlaceResult } from '@/utils/kakaoSearch';
import { getZoomStage, STAGE_TARGET_LEVEL } from '@/utils/kakaoZoomStage';

const INITIAL_LEVEL = 4;

// 김하은(더미 페르소나)의 생활권인 강남역 부근을 기본값으로 삼아서, GPS 권한이 없어도 더미 마커가 바로 보이게 한다.
const DEFAULT_CENTER: LatLng = { lat: 37.4979, lng: 127.0276 };
const SEARCH_BAR_HEIGHT = 52;
const LOCATE_BUTTON_HEIGHT = 44;

type Period = 'week' | 'month' | '3months' | 'custom';

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'week', label: '이번 주' },
  { value: 'month', label: '이번 달' },
  { value: '3months', label: '최근 3개월' },
  { value: 'custom', label: '직접 선택' },
];

// 백엔드 categoryId(1~11) 기준. Colors.category 색상표와 같은 순서를 쓴다.
const CATEGORY_OPTIONS = [
  { id: 1, label: '음식점' },
  { id: 2, label: '카페·간식' },
  { id: 3, label: '편의점·마트' },
  { id: 4, label: '쇼핑' },
  { id: 5, label: '여가' },
  { id: 6, label: '교통' },
  { id: 7, label: '건강·의료' },
  { id: 8, label: '생활' },
  { id: 9, label: '미용' },
  { id: 10, label: '교육' },
  { id: 11, label: '기타' },
];

// 내 장소별 아이콘. MY_PLACES에 아이콘 정보가 없어서 placeId 기준으로 화면에서 따로 매핑한다.
const PLACE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  home: 'home',
  workcafe: 'briefcase',
  client: 'business',
};

function formatWon(amount: number) {
  return amount.toLocaleString('ko-KR');
}

function formatManwon(amount: number) {
  if (amount <= 0) {
    return '';
  }
  return `${Math.round(amount / 10000)}만원`;
}

// "2026-07-17 09:20:00+09" -> "7월 17일 · 09:20"
function formatDateShort(datetime: string) {
  const [datePart, timePart] = datetime.split(' ');
  const [, month, day] = datePart.split('-');
  const [hour, minute] = timePart.split(':');
  return `${Number(month)}월 ${Number(day)}일 · ${hour}:${minute}`;
}

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

  const [filterVisible, setFilterVisible] = useState(false);

  // 시트 안에서 만지는 동안만 쓰이는 임시 값(초안). "적용하기"를 눌러야만 아래 appliedFilter로 반영된다.
  const [period, setPeriod] = useState<Period>('week');
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>(
    CATEGORY_OPTIONS.map((category) => category.id)
  );

  // 실제로 적용된 필터 값. 화면(지도 마커 등)은 이 값을 기준으로 동작해야 한다.
  const [appliedFilter, setAppliedFilter] = useState({
    period: 'week' as Period,
    categoryIds: CATEGORY_OPTIONS.map((category) => category.id),
    customStartDate: undefined as Date | undefined,
    customEndDate: undefined as Date | undefined,
  });

  const toggleCategory = (id: number) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((categoryId) => categoryId !== id) : [...prev, id]
    );
  };

  // 필터 아이콘을 눌렀을 때. 마지막으로 적용된 값을 초안으로 다시 불러와서 보여준다.
  const handleOpenFilter = () => {
    setPeriod(appliedFilter.period);
    setSelectedCategoryIds(appliedFilter.categoryIds);
    setCustomStartDate(appliedFilter.customStartDate);
    setCustomEndDate(appliedFilter.customEndDate);
    setFilterVisible(true);
  };

  const handleResetFilter = () => {
    setPeriod('week');
    setSelectedCategoryIds(CATEGORY_OPTIONS.map((category) => category.id));
    setCustomStartDate(undefined);
    setCustomEndDate(undefined);
  };

  // "적용하기"를 눌렀을 때만 초안을 실제 값으로 반영하고 닫는다.
  const handleApplyFilter = () => {
    setAppliedFilter({ period, categoryIds: selectedCategoryIds, customStartDate, customEndDate });
    setFilterVisible(false);
  };

  // X, 배경 탭, 드래그로 닫힐 때는 초안을 반영하지 않고 그냥 닫기만 한다.
  const handleCloseFilterWithoutApplying = () => {
    setFilterVisible(false);
  };

  // 시작일이 종료일보다 늦어지면 종료일을 다시 고르게 비운다.
  const handleCustomStartChange = (date: Date) => {
    setCustomStartDate(date);
    if (customEndDate && date > customEndDate) {
      setCustomEndDate(undefined);
    }
  };

  // 종료일은 시작일보다 이른 날짜를 아예 선택하지 못하게 막는다.
  const handleCustomEndChange = (date: Date) => {
    if (customStartDate && date < customStartDate) {
      return;
    }
    setCustomEndDate(date);
  };

  // null이면 "내 장소" 리스트, placeId가 있으면 그 장소의 가맹점별 상세를 보여준다.
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const selectedPlace = MY_PLACES.find((place) => place.placeId === selectedPlaceId) ?? null;
  const placeDetail = useMemo(
    () => (selectedPlaceId ? toMyPlaceDetailResponse(selectedPlaceId) : null),
    [selectedPlaceId]
  );
  const placeMerchants = placeDetail?.success ? placeDetail.data.transactionList : [];
  const placeTotal = placeMerchants.reduce((sum, merchant) => sum + merchant.amount, 0);

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

  // 4단계(개별)면 가게별 말풍선(테두리=카테고리 지정색), 1~3단계면 구역별 말풍선(테두리=브랜드 그린 고정)을 그린다.
  const markers: MapMarker[] = useMemo(() => {
    if (currentStage === 4) {
      const { data } = toMapPlaceListResponse();
      return data.placeList.map((place) => ({
        id: `${place.latitude},${place.longitude}`,
        lat: place.latitude!,
        lng: place.longitude!,
        label: place.name,
        amount: place.amount,
        color: Colors.category[place.transactionList[0]?.categoryId ?? 11],
      }));
    }

    const { data } = toMapDepthResponse(currentStage as 1 | 2 | 3);
    return data.transactionList.map((region) => ({
      id: region.depthName,
      lat: region.latitude,
      lng: region.longitude,
      label: region.depthName,
      amount: region.amount,
      color: Colors.light.primary,
    }));
  }, [currentStage]);

  return (
    <View style={{ flex: 1 }}>
      <KakaoMap
        ref={mapRef}
        initialCenter={center}
        initialLevel={INITIAL_LEVEL}
        myLocation={currentLocation ?? undefined}
        markers={markers}
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
          onPress={handleOpenFilter}
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
        {selectedPlace ? (
          <>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingHorizontal: 8,
                paddingBottom: 8,
              }}>
              <IconButton name="back" onPress={() => setSelectedPlaceId(null)} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.light.cardTitle }}>
                  {selectedPlace.name}
                </Text>
                <Text style={{ fontSize: 12, color: Colors.light.cardDescription }}>{selectedPlace.address}</Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.light.cardTitle }}>
                {formatWon(placeTotal)}원
              </Text>
            </View>

            <ScrollView style={{ paddingHorizontal: 16 }} contentContainerStyle={{ gap: 12 }}>
              {placeMerchants.map((merchant) => (
                <AccordionCard
                  key={merchant.name}
                  header={
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.light.cardTitle }}>
                          {merchant.name}
                        </Text>
                        <Text style={{ fontSize: 12, color: Colors.light.cardDescription }}>
                          {merchant.categoryName}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.light.cardTitle }}>
                        {formatWon(merchant.amount)}원
                      </Text>
                    </View>
                  }>
                  <View style={{ gap: 12 }}>
                    <Text style={{ fontSize: 12, color: Colors.light.cardAccent, fontWeight: '600' }}>
                      이 가게에서 사용한 내역
                    </Text>
                    {merchant.dateList.map((tx) => (
                      <View key={tx.transactionId} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <View>
                          <Text style={{ fontSize: 14, color: Colors.light.cardBodyText }}>
                            {merchant.categoryName} 결제
                          </Text>
                          <Text style={{ fontSize: 12, color: Colors.light.cardDescription }}>
                            {formatDateShort(tx.datetime)}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.light.cardTitle }}>
                          -{formatWon(tx.amount)}원
                        </Text>
                      </View>
                    ))}
                  </View>
                </AccordionCard>
              ))}
            </ScrollView>
          </>
        ) : (
          <>
            <Text
              style={{
                textAlign: 'center',
                paddingBottom: 8,
                color: Colors.light.cardTitle,
                fontSize: 15,
                fontWeight: '700',
              }}>
              내 장소 {MY_PLACES.length}개
            </Text>
            <View style={{ paddingHorizontal: 16 }}>
              {MY_PLACES.map((place) => {
                const detail = toMyPlaceDetailResponse(place.placeId);
                const total = detail.success
                  ? detail.data.transactionList.reduce((sum, merchant) => sum + merchant.amount, 0)
                  : 0;

                return (
                  <InfoListItem
                    key={place.placeId}
                    leading={
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: Colors.light.inputBackground,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                        <Ionicons name={PLACE_ICONS[place.placeId] ?? 'location'} size={20} color={Colors.light.primary} />
                      </View>
                    }
                    title={place.name}
                    description={place.address}
                    trailing={
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        {total > 0 ? (
                          <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.light.cardTitle }}>
                            {formatManwon(total)}
                          </Text>
                        ) : null}
                        <Ionicons name="chevron-forward" size={18} color={Colors.light.cardDescription} />
                      </View>
                    }
                    onPress={() => setSelectedPlaceId(place.placeId)}
                  />
                );
              })}
            </View>
          </>
        )}
      </BottomSheet>

      {/* 필터 시트. 배경 딤 처리 + 뒤 화면 조작 불가(modal). X, 배경 탭, 빠르게 아래로 드래그 중 어떤 방식으로도 닫힌다. */}
      <BottomSheet
        visible={filterVisible}
        onClose={handleCloseFilterWithoutApplying}
        modal
        minHeight={0.92}
        maxHeight={0.92}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingBottom: 12,
          }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.light.cardTitle }}>필터</Text>
          <IconButton name="close" onPress={handleCloseFilterWithoutApplying} />
        </View>

        <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 24 }}>
          <View style={{ gap: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.light.cardTitle }}>기간 선택</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {PERIOD_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  indicator="radio"
                  selected={period === option.value}
                  onPress={() => setPeriod(option.value)}
                  style={{ width: '47%' }}
                />
              ))}
            </View>

            {period === 'custom' && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <DateInput
                  label="시작일"
                  value={customStartDate}
                  onChange={handleCustomStartChange}
                  style={{ width: '47%' }}
                />
                <DateInput
                  label="종료일"
                  value={customEndDate}
                  onChange={handleCustomEndChange}
                  style={{ width: '47%' }}
                />
              </View>
            )}
          </View>

          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.light.cardTitle }}>카테고리 선택</Text>
              <Text style={{ color: Colors.light.cardDescription }} onPress={() => setSelectedCategoryIds([])}>
                전체 해제
              </Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {CATEGORY_OPTIONS.map((category) => (
                <Chip
                  key={category.id}
                  label={category.label}
                  indicator="check"
                  selected={selectedCategoryIds.includes(category.id)}
                  onPress={() => toggleCategory(category.id)}
                  style={{ width: '47%' }}
                />
              ))}
            </View>
          </View>
        </ScrollView>

        <View
          style={{
            flexDirection: 'row',
            gap: 8,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: insets.bottom + 12,
          }}>
          <Button variant="white" onPress={handleResetFilter} style={{ width: '47%', height: 50 }}>
            초기화
          </Button>
          <Button variant="green" onPress={handleApplyFilter} style={{ width: '47%', height: 50 }}>
            적용하기
          </Button>
        </View>
      </BottomSheet>
    </View>
  );
}
