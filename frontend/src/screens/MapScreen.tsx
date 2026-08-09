import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';
import { Text } from '@/components/common/typography/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BottomSheet from '@/components/common/BottomSheet';
import { Button } from '@/components/common/button/Button';
import { IconButton } from '@/components/common/button/IconButton';
import AccordionCard from '@/components/common/card/AccordionCard';
import BaseCard from '@/components/common/card/BaseCard';
import InfoListItem from '@/components/common/card/InfoListItem';
import { Chip } from '@/components/common/chip/Chip';
import { DateInput } from '@/components/common/input/DateInput';
import { SearchInput } from '@/components/common/input/SearchInput';
import { KakaoMap, type KakaoMapHandle, type LatLng, type MapMarker } from '@/components/map/KakaoMap';
import { Scroll } from '@/components/common/Scroll';
import { MapZoom } from '@/components/map/MapZoom';
import Colors from '@/constants/Colors';
import { getCategoryColorById, getCategoryIconKey } from '@/constants/categories';
import { getCategories, type Category } from '@/src/api/categoryApi';
import {
  getTransactionMyPlaceDetail,
  getTransactionMyPlaces,
  getTransactionPlaceMap,
  getTransactionRegionMap,
  groupMapTransactionsByDate,
  groupMapTransactionsByName,
  type MapPlace,
  type MapRegion,
  type MyPlaceMap,
  type MyPlaceTransactionList,
  type TransactionMapBounds,
} from '@/src/api/transactionMapApi';
import { searchPlaces, type PlaceResult } from '@/utils/kakaoSearch';
import { getZoomStage, STAGE_TARGET_LEVEL } from '@/utils/kakaoZoomStage';

const INITIAL_LEVEL = 4;

// 김하은(더미 페르소나)의 생활권인 강남역 부근을 기본값으로 삼아서, GPS 권한이 없어도 더미 마커가 바로 보이게 한다.
const DEFAULT_CENTER: LatLng = { lat: 37.4979, lng: 127.0276 };
const SEARCH_BAR_HEIGHT = 52;
const LOCATE_BUTTON_HEIGHT = 44;
// MapZoom 높이(버튼 44 x 2 + 구분선 1). 로드뷰 버튼을 줌 컨트롤 바로 아래에 붙이는 계산에 쓴다.
const ZOOM_CONTROL_HEIGHT = 89;
// 내 장소 상세 모드에서 이동할 줌 레벨. 반경 2km 원(지름 4km)이 폰 화면에 통째로 들어오는 최소 축소 레벨이다.
const PLACE_DETAIL_LEVEL = 6;
// 내 장소 시트에서 목록 위에 고정으로 자리 차지하는 영역(드래그 핸들 + "내 장소 N개" 제목)의 대략적인 높이.
// 시트의 보이는 높이에서 이만큼을 빼면 목록(Scroll)에 줄 수 있는 높이가 나온다.
const SHEET_HEADER_HEIGHT = 56;
// 내 장소 상세에서 아코디언 목록 위 영역(드래그 핸들 + 뒤로가기·장소명·누적 금액 헤더)의 대략적인 높이.
const DETAIL_HEADER_HEIGHT = 72;

type Period = 'week' | 'month' | '3months' | 'custom';

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'week', label: '이번 주' },
  { value: 'month', label: '이번 달' },
  { value: '3months', label: '최근 3개월' },
  { value: 'custom', label: '직접 선택' },
];

// 내 장소별 아이콘. API 응답에 아이콘 정보가 없어서 placeId(숫자) 기준으로 화면에서 따로 매핑한다.
const PLACE_ICONS: Record<number, keyof typeof Ionicons.glyphMap> = {
  1: 'home', // 집
  2: 'briefcase', // 직장
  3: 'business', // 클라이언트사
};

function formatWon(amount: number) {
  return amount.toLocaleString('ko-KR');
}

// Date -> 'YYYY-MM-DD' (기기 로컬 기준)
function toDateString(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 필터의 기간 옵션을 API 쿼리 형태(startDate/endDate)로 변환한다.
function periodToDateRange(
  period: Period,
  customStart?: Date,
  customEnd?: Date
): { startDate?: string; endDate?: string } {
  const today = new Date();

  if (period === 'week') {
    const day = today.getDay(); // 0=일요일
    const monday = new Date(today);
    monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
    return { startDate: toDateString(monday), endDate: toDateString(today) };
  }
  if (period === 'month') {
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    return { startDate: toDateString(firstOfMonth), endDate: toDateString(today) };
  }
  if (period === '3months') {
    const threeMonthsAgo = new Date(today);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    return { startDate: toDateString(threeMonthsAgo), endDate: toDateString(today) };
  }
  // custom: 두 날짜가 다 있어야만 적용하기가 눌리므로 보통 둘 다 있다.
  return {
    startDate: customStart ? toDateString(customStart) : undefined,
    endDate: customEnd ? toDateString(customEnd) : undefined,
  };
}

function formatManwon(amount: number) {
  if (amount <= 0) {
    return '';
  }
  return `${Math.round(amount / 10000)}만원`;
}

// "2026-07-17 09:20:00+09" -> "7월 17일 · 09:20"
function formatDateOnly(date: string) {
  const [, month, day] = date.split('-');
  return `${Number(month)}월 ${Number(day)}일`;
}

// 지도 탭 화면. 검색·필터·내 위치·내 장소 목록을 잡아두고,
// 줌 컨트롤/마커 라벨/클러스터링은 이 화면이 자리 잡은 뒤에 이어서 붙인다.
export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<KakaoMapHandle>(null);
  const [searchText, setSearchText] = useState('');
  // 검색해서 찾은 장소. 있으면 지도 중심과 선택 핀으로 쓰인다.
  const [searchedPlace, setSearchedPlace] = useState<PlaceResult | null>(null);
  // 검색 결과 목록. MapPickerScreen과 같은 방식(카드 목록 + 지도 핀)으로 보여준다.
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [hasSearchResults, setHasSearchResults] = useState(false);
  // 지도의 검색 핀을 눌렀을 때 그 핀에 해당하는 카드를 강조하기 위한 인덱스.
  const [highlightedResultIndex, setHighlightedResultIndex] = useState<number | null>(null);
  const searchScrollRef = useRef<ScrollView>(null);
  // 각 카드가 리스트 안에서 세로로 몇 px 위치에 있는지 기록해뒀다가, 핀 클릭 시 그 위치로 스크롤한다.
  const searchCardOffsets = useRef<number[]>([]);
  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
  // 카카오맵의 현재 줌 레벨. 줌 버튼으로 바꾸든 손가락으로 핀치줌하든 onLevelChange로 여기 반영된다.
  const [currentLevel, setCurrentLevel] = useState(INITIAL_LEVEL);

  // 로드뷰 모드(도로 파란 선 표시)가 켜져 있는지. 버튼 토글로만 바뀐다.
  const [roadviewMode, setRoadviewMode] = useState(false);
  // 로드뷰(거리 사진)가 실제로 화면에 떠 있는지. WebView 쪽에서 열리고 닫힐 때 알려준다.
  const [roadviewOpen, setRoadviewOpen] = useState(false);

  const handleToggleRoadview = () => {
    const next = !roadviewMode;
    setRoadviewMode(next);
    mapRef.current?.setRoadviewMode(next);
  };

  const [filterVisible, setFilterVisible] = useState(false);

  // 시트 안에서 만지는 동안만 쓰이는 임시 값(초안). "적용하기"를 눌러야만 아래 appliedFilter로 반영된다.
  const [period, setPeriod] = useState<Period>('week');
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();
  const [categoryOptions, setCategoryOptions] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);

  // 실제로 적용된 필터 값. 화면(지도 마커 등)은 이 값을 기준으로 동작해야 한다.
  const [appliedFilter, setAppliedFilter] = useState({
    period: 'week' as Period,
    categoryIds: [] as number[],
    customStartDate: undefined as Date | undefined,
    customEndDate: undefined as Date | undefined,
  });

  // 서버가 같은 이름의 카테고리를 id만 다르게 두 벌 내려줄 때가 있어서, 필터 칩은 이름 기준으로
  // 묶어서 하나만 보여준다. 칩 하나를 누르면 그 이름에 속한 id를 전부 같이 켜고/끄기 때문에,
  // 실제 필터링은 두 id 모두를 대상으로 정확히 걸린다(ListScreen.tsx 거래내역 필터와 동일한 방식).
  const categoryGroups = useMemo(() => {
    const groups = new Map<string, number[]>();
    categoryOptions.forEach((category) => {
      const ids = groups.get(category.name) ?? [];
      ids.push(category.id);
      groups.set(category.name, ids);
    });
    return Array.from(groups.entries()).map(([name, ids]) => ({ name, ids }));
  }, [categoryOptions]);

  const toggleCategoryGroup = (ids: number[]) => {
    const isFullySelected = ids.every((id) => selectedCategoryIds.includes(id));
    setSelectedCategoryIds((current) =>
      isFullySelected
        ? current.filter((id) => !ids.includes(id))
        : [...current, ...ids.filter((id) => !current.includes(id))],
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
    setSelectedCategoryIds(categoryOptions.map((category) => category.id));
    setCustomStartDate(undefined);
    setCustomEndDate(undefined);
  };

  // "적용하기"를 눌렀을 때만 초안을 실제 값으로 반영하고 닫는다.
  // 카테고리를 하나도 안 골랐으면("전체 해제") 말 그대로 표시할 카테고리가 없는 상태로 적용한다.
  const handleApplyFilter = () => {
    setAppliedFilter({ period, categoryIds: selectedCategoryIds, customStartDate, customEndDate });
    setFilterVisible(false);
  };

  // X, 배경 탭, 드래그로 닫힐 때는 초안을 반영하지 않고 그냥 닫기만 한다.
  const handleCloseFilterWithoutApplying = () => {
    setFilterVisible(false);
  };

  // 시작일↔종료일 순서 보장은 DateInput의 minDate/maxDate로 달력에서부터 막는다
  // (시작일 달력은 종료일 이후를, 종료일 달력은 시작일 이전을 아예 못 고른다).
  // "직접 선택"은 두 날짜가 모두 채워져야만 적용할 수 있다.
  const isCustomPeriodValid =
    period !== 'custom' ||
    (customStartDate != null && customEndDate != null && customStartDate <= customEndDate);

  // null이면 "내 장소" 리스트, placeId가 있으면 그 장소의 가맹점별 상세를 보여준다.
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null);
  // 4단계에서 "내 장소"가 아닌 일반 가게 마커를 눌렀을 때 그 가게 하나의 상세를 보여준다.
  const [selectedGeneralPlace, setSelectedGeneralPlace] = useState<{
    name: string;
    address: string;
    lat: number;
    lng: number;
  } | null>(null);
  // 1~3단계에서 지역(클러스터) 마커를 눌렀을 때 그 지역 안 가게들의 상세를 보여준다.
  const [selectedRegionName, setSelectedRegionName] = useState<string | null>(null);

  const [mapBounds, setMapBounds] = useState<TransactionMapBounds | null>(null);
  const [placeListData, setPlaceListData] = useState<MapPlace[]>([]);
  const [depthData, setDepthData] = useState<MapRegion[]>([]);
  const [myPlaces, setMyPlaces] = useState<MyPlaceMap[]>([]);
  const [placeDetail, setPlaceDetail] = useState<MyPlaceTransactionList | null>(null);
  const [mapDataLoading, setMapDataLoading] = useState(false);
  const [mapDataError, setMapDataError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // 세 상세 모드(내 장소/일반 가게/지역)는 동시에 하나만 열려야 한다. 하나를 열 때 나머지 둘은 닫는다.
  const closeAllDetails = () => {
    setSelectedPlaceId(null);
    setSelectedGeneralPlace(null);
    setSelectedRegionName(null);
    setHighlightedMerchant(null);
    setOpenMerchants(new Set());
  };

  // 내 장소 시트가 화면에 실제로 보이는 높이(px). 시트를 열 때/드래그를 놓을 때마다 갱신된다.
  // 목록(Scroll)의 높이를 여기에 맞춰서, 공간이 충분하면 스크롤 없이 다 보이고 부족할 때만 스크롤이 생긴다.
  const [sheetVisibleHeight, setSheetVisibleHeight] = useState(0);
  const placeListHeight = Math.max(sheetVisibleHeight - SHEET_HEADER_HEIGHT, 0);
  // 상세(가맹점 아코디언) 목록도 같은 원리로, 헤더 높이만 다르게 뺀다.
  const merchantListHeight = Math.max(sheetVisibleHeight - DETAIL_HEADER_HEIGHT, 0);

  // 내 장소를 선택하면 상세로 전환하면서, 지도 중심을 그 장소로 옮기고
  // 반경 2km 원 전체가 화면에 들어오는 레벨(6)로 축소한다.
  // 이 레벨은 원래 3단계(읍면동) 구간이지만, 내 장소 상세 모드에서는 아래 markers 계산에서
  // 클러스터 대신 이 장소 주변 가맹점 개별 마커를 보여주므로 단계 규칙과 충돌하지 않는다.
  const handleSelectPlace = (place: MyPlaceMap) => {
    userMovedMapRef.current = true;
    closeAllDetails();
    setSelectedPlaceId(place.placeId);
    mapRef.current?.setCenter({ lat: place.latitude, lng: place.longitude });
    mapRef.current?.setLevel(PLACE_DETAIL_LEVEL);
  };

  // 상세 모드에서 지도 마커를 눌렀을 때 강조할 가맹점 이름(마커 id로도 쓴다),
  // 그리고 그 카드로 스크롤하기 위한 ref들 (MapPickerScreen의 핀↔카드 연동과 같은 방식).
  const [highlightedMerchant, setHighlightedMerchant] = useState<string | null>(null);
  // 지금 펼쳐진 상태여야 하는 가맹점 이름들. 마커를 누르거나 카드를 직접 눌러서 열고 닫을 때마다
  // 여기에 넣고 빼서, AccordionCard를 key로 다시 마운트시켜 그 상태로 시작하게 한다
  // (AccordionCard가 펼침 상태를 자체적으로 들고 있어서, 밖에서 직접 열고 닫을 방법이 이것뿐이다).
  const [openMerchants, setOpenMerchants] = useState<Set<string>>(new Set());
  const merchantScrollRef = useRef<ScrollView>(null);
  const merchantCardOffsets = useRef<Record<string, number>>({});

  // 지도 마커를 누르면 모드에 따라 다르게 동작한다.
  const handleMarkerPress = (id: string) => {
    userMovedMapRef.current = true;
    // 1) 내 장소 상세: 가맹점 마커. 그 카드로 스크롤 + 테두리 강조 + 펼치거나(닫혀 있었다면) 접는다(펼쳐져 있었다면).
    if (selectedPlaceId != null) {
      const merchant = placeMerchants.find((m) => m.name === id);
      if (merchant?.latitude != null) {
        mapRef.current?.setCenter({ lat: merchant.latitude, lng: merchant.longitude! });
      }
      const willOpen = !openMerchants.has(id);
      setOpenMerchants((prev) => {
        const next = new Set(prev);
        if (willOpen) {
          next.add(id);
        } else {
          next.delete(id);
        }
        return next;
      });
      // 닫는 쪽이면 강조(테두리 굵기)도 같이 원래대로 돌려놓는다.
      setHighlightedMerchant(willOpen ? id : null);
      const offset = merchantCardOffsets.current[id] ?? 0;
      merchantScrollRef.current?.scrollTo({ y: offset, animated: true });
      return;
    }

    // 2) 4단계: 일반 가게 마커(내 장소 아님). 같은 마커를 다시 누르면 "내 장소" 리스트로 돌아간다.
    if (currentStage === 4) {
      if (selectedGeneralPlace && `${selectedGeneralPlace.lat},${selectedGeneralPlace.lng}` === id) {
        closeAllDetails();
        return;
      }
      const place = placeListData.find((p) => `${p.latitude},${p.longitude}` === id);
      if (!place || place.latitude == null || place.longitude == null) {
        return;
      }
      closeAllDetails();
      setSelectedGeneralPlace({ lat: place.latitude, lng: place.longitude, name: place.name, address: place.address ?? '' });
      mapRef.current?.setCenter({ lat: place.latitude, lng: place.longitude });
      return;
    }

    // 3) 1~3단계: 지역(클러스터) 마커. 같은 지역을 다시 누르면 "내 장소" 리스트로 돌아간다.
    if (selectedRegionName === id) {
      closeAllDetails();
      return;
    }
    const region = depthData.find((r) => r.depthName === id);
    if (!region) {
      return;
    }
    closeAllDetails();
    setSelectedRegionName(id);
    mapRef.current?.setCenter({ lat: region.latitude, lng: region.longitude });
  };

  // 적용된 필터를 API 쿼리 형태(startDate/endDate/categoryIds)로 변환한 값.
  // 지도 마커·내 장소 목록·내 장소 상세가 전부 이걸 기준으로 데이터를 가져온다.
  const mapFilter = useMemo(
    () => ({
      ...periodToDateRange(appliedFilter.period, appliedFilter.customStartDate, appliedFilter.customEndDate),
      // 전체 선택이면 categoryId를 생략한다. 서버의 기본 동작이 전체 조회이며,
      // 사용자별 카테고리 ID를 불필요하게 모두 검증하는 요청도 피할 수 있다.
      categoryIds:
        categoryOptions.length > 0 &&
        appliedFilter.categoryIds.length < categoryOptions.length
          ? appliedFilter.categoryIds
          : undefined,
    }),
    [appliedFilter, categoryOptions.length]
  );

  const selectedPlace = myPlaces.find((place) => place.placeId === selectedPlaceId) ?? null;
  const placeMerchants = placeDetail?.transactionList ?? [];
  const placeTotal = placeMerchants.reduce((sum, merchant) => sum + merchant.amount, 0);

  // 마운트 시 자동으로 위치를 잡는 동안(특히 정확한 GPS 조회는 몇 초 걸릴 수 있다) 사용자가 이미
  // 검색·내 장소 선택·마커 탭으로 지도를 다른 곳으로 옮겼다면, 뒤늦게 도착한 GPS 결과로 지도를
  // 도로 내 위치로 튕기지 않도록 막는 플래그. "내 위치" 버튼을 직접 누른 경우는 항상 이동시킨다.
  const userMovedMapRef = useRef(false);

  // MapPickerScreen과 같은 방식: 권한 허용 시 마지막 알려진 위치를 먼저 빠르게 보여주고, 정확한 위치로 뒤이어 갱신한다.
  // "내 위치" 버튼을 눌렀을 때도 이 함수를 다시 호출한다(이때는 silent가 아니므로 항상 이동시킨다).
  const handleLocate = async (options?: { silent?: boolean }) => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return;
    }

    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      return;
    }

    if (!options?.silent) {
      userMovedMapRef.current = false;
      setSearchedPlace(null);
    }

    const lastKnown = await Location.getLastKnownPositionAsync();
    if (lastKnown) {
      const coords = { lat: lastKnown.coords.latitude, lng: lastKnown.coords.longitude };
      setCurrentLocation(coords);
      // 좌표값이 이전과 같으면 initialCenter가 안 바뀌어서 지도가 재로딩 안 될 수 있으니,
      // 명령형으로 직접 지도 중심을 옮겨서 항상 확실히 이동시킨다.
      if (!options?.silent || !userMovedMapRef.current) {
        mapRef.current?.setCenter(coords);
      }
    }

    try {
      const position = await Location.getCurrentPositionAsync({});
      const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
      setCurrentLocation(coords);
      if (!options?.silent || !userMovedMapRef.current) {
        mapRef.current?.setCenter(coords);
      }
    } catch {
      // 실패해도 lastKnown으로 이미 떴다면 그대로 두고, 둘 다 없으면 DEFAULT_CENTER로 대체된다.
    }
  };

  useEffect(() => {
    handleLocate({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 검색어로 장소를 찾아 목록으로 보여준다. MapPickerScreen과 동일하게, 지금 보고 있는 지도
  // 중심을 기준 좌표로 넘겨서 결과가 "여기서 가까운 순"으로 정렬되게 한다.
  const handleSearch = async () => {
    if (!searchText.trim()) {
      return;
    }
    const searchCenter = mapBounds
      ? { lat: (mapBounds.south + mapBounds.north) / 2, lng: (mapBounds.west + mapBounds.east) / 2 }
      : (currentLocation ?? undefined);
    let places;
    try {
      places = await searchPlaces(searchText, searchCenter);
    } catch {
      Alert.alert('검색에 실패했어요', '잠시 후 다시 시도해주세요.');
      return;
    }
    setSearchResults(places);
    setHasSearchResults(true);
    setHighlightedResultIndex(null);
    setSearchedPlace(null);
    if (places.length > 0) {
      userMovedMapRef.current = true;
      // 좌표값이 이전과 같으면 initialCenter가 안 바뀌어 지도가 안 움직일 수 있으니,
      // 명령형으로 직접 지도 중심을 옮겨서 항상 확실히 이동시킨다("내 위치" 버튼과 같은 방식).
      mapRef.current?.setCenter({ lat: places[0].lat, lng: places[0].lng });
    }
  };

  // 결과 카드에서 선택 버튼 제외한 부분을 눌렀을 때. 지도만 그 위치로 옮기고, 그 카드를 강조 표시한다.
  const handlePreviewSearchResult = (place: PlaceResult, index: number) => {
    userMovedMapRef.current = true;
    setHighlightedResultIndex(index);
    mapRef.current?.setCenter({ lat: place.lat, lng: place.lng });
  };

  // 결과 카드의 "선택" 버튼을 눌렀을 때. 이 위치를 검색된 장소로 확정하고 목록을 닫는다.
  const handleSelectSearchResult = (place: PlaceResult) => {
    userMovedMapRef.current = true;
    setSearchedPlace(place);
    setSearchText(place.name);
    setHasSearchResults(false);
    setSearchResults([]);
    mapRef.current?.setCenter({ lat: place.lat, lng: place.lng });
  };

  // 지도의 검색 결과 핀을 눌렀을 때. 그 핀에 해당하는 카드로 리스트를 스크롤하고 강조 표시한다.
  const handleSearchPinPress = (index: number) => {
    setHighlightedResultIndex(index);
    const offset = searchCardOffsets.current[index] ?? 0;
    searchScrollRef.current?.scrollTo({ y: offset, animated: true });
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

  // 지도 이동·확대·축소가 끝난 뒤 현재 화면 경계를 기준으로 서버 데이터를 다시 조회한다.
  // 연속된 WebView 이벤트가 API 요청을 과도하게 만들지 않도록 짧게 debounce한다.
  useEffect(() => {
    if (!mapBounds) {
      return;
    }

    // 카테고리를 전부 해제한 상태는 "필터 없음"이 아니라 "보여줄 카테고리가 없음"이다.
    // categoryId를 아예 안 보내면 서버가 전체 결과를 돌려주므로, 요청하지 않고 바로 빈 목록으로 둔다.
    if (mapFilter.categoryIds && mapFilter.categoryIds.length === 0) {
      setPlaceListData([]);
      setDepthData([]);
      setMapDataLoading(false);
      setMapDataError(null);
      return;
    }

    let cancelled = false;

    const timer = setTimeout(() => {
      const loadMapData = async () => {
        try {
          setMapDataLoading(true);
          setMapDataError(null);

          if (currentStage === 4) {
            const response = await getTransactionPlaceMap(mapBounds, mapFilter);

            if (!cancelled) {
              setPlaceListData(response.placeList);
              setDepthData([]);

              console.info('[transaction-map] place map loaded', {
                count: response.placeList.length,
              });
            }
            return;
          }

          const response = await getTransactionRegionMap(
            currentStage as 1 | 2 | 3,
            mapBounds,
            mapFilter,
          );

          if (!cancelled) {
            setDepthData(response.transactionList);
            setPlaceListData([]);

            console.info('[transaction-map] region map loaded', {
              depth: currentStage,
              count: response.transactionList.length,
            });
          }
        } catch (error) {
          console.error('[transaction-map] map data load failed', error);

          if (!cancelled) {
            setMapDataError(
              error instanceof Error
                ? error.message
                : '지도 거래내역을 불러오지 못했습니다.',
            );
          }
        } finally {
          if (!cancelled) {
            setMapDataLoading(false);
          }
        }
      };

      void loadMapData();
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [currentStage, mapBounds, mapFilter, reloadKey]);

  // 카테고리 ID는 사용자마다 다르므로 서버에서 현재 사용자의 목록을 조회한다.
  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      try {
        const categories = await getCategories();

        if (cancelled) {
          return;
        }

        const categoryIds = categories.map((category) => category.id);

        setCategoryOptions(categories);
        setSelectedCategoryIds(categoryIds);
        setAppliedFilter((current) => ({
          ...current,
          categoryIds,
        }));

        console.info('[transaction-map] categories loaded', {
          count: categories.length,
        });
      } catch (error) {
        console.error('[transaction-map] categories load failed', error);

        if (!cancelled) {
          setMapDataError(
            error instanceof Error
              ? error.message
              : '카테고리를 불러오지 못했습니다.',
          );
        }
      }
    };

    void loadCategories();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // 내 장소 목록은 지도 경계와 무관하고 기간 필터만 적용한다.
  useEffect(() => {
    let cancelled = false;

    const loadMyPlaces = async () => {
      try {
        const response = await getTransactionMyPlaces(mapFilter);

        if (!cancelled) {
          setMyPlaces(response);

          console.info('[transaction-map] my places loaded', {
            count: response.length,
          });
        }
      } catch (error) {
        console.error('[transaction-map] my places load failed', error);

        if (!cancelled) {
          setMapDataError(
            error instanceof Error
              ? error.message
              : '내 장소를 불러오지 못했습니다.',
          );
        }
      }
    };

    void loadMyPlaces();

    return () => {
      cancelled = true;
    };
  }, [mapFilter, reloadKey]);

  // 내 장소를 선택한 경우에만 반경 2km 내 거래 상세를 조회한다.
  useEffect(() => {
    if (selectedPlaceId == null) {
      setPlaceDetail(null);
      return;
    }

    let cancelled = false;

    const loadPlaceDetail = async () => {
      try {
        const response = await getTransactionMyPlaceDetail(selectedPlaceId, mapFilter);

        if (!cancelled) {
          setPlaceDetail(response);

          console.info('[transaction-map] my place detail loaded', {
            placeId: selectedPlaceId,
            count: response.transactionList.length,
          });
        }
      } catch (error) {
        console.error('[transaction-map] my place detail load failed', error);

        if (!cancelled) {
          setMapDataError(
            error instanceof Error
              ? error.message
              : '내 장소 거래내역을 불러오지 못했습니다.',
          );
        }
      }
    };

    void loadPlaceDetail();

    return () => {
      cancelled = true;
    };
  }, [selectedPlaceId, mapFilter, reloadKey]);

  // 4단계에서 선택한 일반 가게(내 장소 아님)의 상세. 필터가 바뀌어도 항상 최신 데이터를 반영하도록
  // 좌표만 state에 두고 매번 placeListData에서 다시 찾는다.
  const generalPlaceDetail = selectedGeneralPlace
    ? (placeListData.find((p) => p.latitude === selectedGeneralPlace.lat && p.longitude === selectedGeneralPlace.lng) ??
      null)
    : null;

  // 1~3단계에서 선택한 지역의 상세. 그 지역 안 개별 거래(placeList)를 가게 이름별로 묶어서
  // 내 장소 상세와 같은 아코디언 리스트 모양으로 만든다.
  const selectedRegionData = selectedRegionName ? depthData.find((r) => r.depthName === selectedRegionName) : null;
  const regionMerchants = selectedRegionData
    ? groupMapTransactionsByName(selectedRegionData.placeList)
    : [];

  // 4단계(개별)면 가게별 말풍선(테두리=카테고리 지정색), 1~3단계면 구역별 말풍선(테두리=브랜드 그린 고정)을 그린다.
  // 단, 내 장소 상세 모드에서는 줌 단계와 무관하게 그 장소 주변 가맹점을 개별 마커로 보여준다
  // (bottom sheet의 가맹점별 목록과 지도가 같은 것을 가리키게 하기 위함).
  const markers: MapMarker[] = useMemo(() => {
    if (selectedPlaceId && placeDetail) {
      return placeDetail.transactionList.map((merchant) => ({
        // 가맹점 이름을 마커 id로 쓴다. 상세 응답이 이름별로 묶여 있어 유일하고,
        // 마커를 눌렀을 때 이 id로 bottom sheet의 해당 카드를 찾아간다.
        id: merchant.name,
        lat: merchant.latitude!,
        lng: merchant.longitude!,
        label: merchant.name,
        amount: merchant.amount,
        color: getCategoryColorById(merchant.categoryId, merchant.categoryName),
        iconKey: getCategoryIconKey(merchant.categoryName, merchant.categoryId),
        selected: merchant.name === highlightedMerchant,
      }));
    }

    if (currentStage === 4) {
      return placeListData.map((place) => {
        const id = `${place.latitude},${place.longitude}`;
        const topMerchant = place.transactionList[0];
        return {
          id,
          lat: place.latitude!,
          lng: place.longitude!,
          label: place.name,
          amount: place.amount,
          color: topMerchant
            ? getCategoryColorById(topMerchant.categoryId, topMerchant.categoryName)
            : Colors.light.primary,
          iconKey: topMerchant
            ? getCategoryIconKey(topMerchant.categoryName, topMerchant.categoryId)
            : undefined,
          selected: selectedGeneralPlace != null && id === `${selectedGeneralPlace.lat},${selectedGeneralPlace.lng}`,
        };
      });
    }

    // 1~3단계(구역 클러스터)는 여러 가게·카테고리가 섞인 합계라 카테고리 아이콘을 하나로 못 정해서 생략한다.
    return depthData.map((region) => ({
      id: region.depthName,
      lat: region.latitude,
      lng: region.longitude,
      label: region.depthName,
      amount: region.amount,
      color: Colors.light.primary,
      selected: region.depthName === selectedRegionName,
    }));
  }, [
    currentStage,
    selectedPlaceId,
    placeDetail,
    placeListData,
    depthData,
    highlightedMerchant,
    selectedGeneralPlace,
    selectedRegionName,
  ]);

  return (
    <View style={{ flex: 1 }}>
      <KakaoMap
        ref={mapRef}
        initialCenter={center}
        initialLevel={INITIAL_LEVEL}
        myLocation={currentLocation ?? undefined}
        myPlaceCircle={selectedPlace ? { lat: selectedPlace.latitude, lng: selectedPlace.longitude } : undefined}
        markers={markers}
        pins={searchResults.map((place) => ({ lat: place.lat, lng: place.lng }))}
        selectedPin={searchedPlace ? { lat: searchedPlace.lat, lng: searchedPlace.lng } : undefined}
        onBoundsChange={setMapBounds}
        onLevelChange={setCurrentLevel}
        onMarkerPress={handleMarkerPress}
        onPinPress={handleSearchPinPress}
        onRoadviewChange={setRoadviewOpen}
        onRoadviewUnavailable={() =>
          Alert.alert('로드뷰가 없는 지점이에요', '파란 선이 표시된 도로 근처를 눌러주세요.')
        }
        style={{ flex: 1 }}
      />

      {mapDataLoading ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: insets.top + 82,
            alignSelf: 'center',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            borderRadius: 999,
            paddingHorizontal: 14,
            paddingVertical: 9,
            backgroundColor: 'rgba(255,255,255,0.94)',
          }}>
          <ActivityIndicator color={Colors.light.primary} size="small" />
          <Text style={{ color: Colors.light.cardTitle, fontSize: 13, fontWeight: '600' }}>
            지도 내역 불러오는 중
          </Text>
        </View>
      ) : null}

      {mapDataError ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setReloadKey((current) => current + 1)}
          style={{
            position: 'absolute',
            top: insets.top + 82,
            alignSelf: 'center',
            maxWidth: '82%',
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 10,
            backgroundColor: 'rgba(32,45,37,0.92)',
          }}>
          <Text style={{ color: Colors.onboarding.inverseText, fontSize: 13, textAlign: 'center' }}>
            {mapDataError} · 눌러서 다시 시도
          </Text>
        </Pressable>
      ) : null}

      {/* 로드뷰(거리 사진)가 떠 있는 동안엔 검색·필터·내 위치 대신 닫기 버튼만 보여준다.
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
              backgroundColor: Colors.light.cardBackground,
              borderRadius: 999,
              padding: 10,
            }}
          />
          <MapZoom
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            style={{
              position: 'absolute',
              bottom: insets.bottom + 16,
              right: 16,
            }}
          />
        </>
      ) : (
        <>
          {/* 검색줄 + 필터 버튼. 필터에서 적용한 값은 mapFilter로 변환되어 지도 마커·내 장소 데이터에 반영된다. */}
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

          {/* 로드뷰 모드 토글. 켜져 있는 동안엔 버튼이 초록 배경으로 바뀌고,
              지도에 로드뷰 가능한 도로가 파란 선으로 표시되며 지도를 탭하면 그 지점 로드뷰가 열린다. */}
          <IconButton
            name="roadview"
            color={roadviewMode ? Colors.onboarding.inverseText : Colors.light.primary}
            onPress={handleToggleRoadview}
            style={{
              position: 'absolute',
              top: insets.top + 16 + SEARCH_BAR_HEIGHT + 12 + LOCATE_BUTTON_HEIGHT + 12 + ZOOM_CONTROL_HEIGHT + 12,
              right: 16,
              backgroundColor: roadviewMode ? Colors.light.primary : Colors.light.cardBackground,
              borderRadius: 999,
              padding: 10,
            }}
          />
        </>
      )}

      {/* 검색 결과 목록. MapPickerScreen과 같은 구성(카드 목록 + 지도 핀)이다. 아래 "내 장소" 시트를
          가리지 않도록 그 시트의 현재 보이는 높이(sheetVisibleHeight)만큼 위로 띄운다. */}
      {hasSearchResults && (
        searchResults.length > 0 ? (
          <View
            style={{
              position: 'absolute',
              bottom: insets.bottom + sheetVisibleHeight + 16,
              left: 16,
              right: 16,
              backgroundColor: Colors.light.cardMutedBackground,
              borderRadius: 16,
              padding: 12,
              maxHeight: 220,
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: Colors.light.textSecondary }}>
                가까운 순 · 검색 결과 {searchResults.length}개
              </Text>
              <IconButton
                name="close"
                onPress={() => {
                  setHasSearchResults(false);
                  setSearchResults([]);
                }}
              />
            </View>

            <Scroll ref={searchScrollRef} height={160}>
              {searchResults.map((place, index) => (
                <View
                  key={`${place.lat}-${place.lng}`}
                  style={{ marginBottom: 8 }}
                  onLayout={(event) => {
                    searchCardOffsets.current[index] = event.nativeEvent.layout.y;
                  }}>
                  <BaseCard
                    style={[
                      { flexDirection: 'row', alignItems: 'center', gap: 8 },
                      highlightedResultIndex === index && { borderWidth: 2, borderColor: Colors.light.primary },
                    ]}>
                    <Pressable
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                      onPress={() => handlePreviewSearchResult(place, index)}>
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
                      onPress={() => handleSelectSearchResult(place)}>
                      선택
                    </Button>
                  </BaseCard>
                </View>
              ))}
            </Scroll>
          </View>
        ) : (
          <View
            style={{
              position: 'absolute',
              bottom: insets.bottom + sheetVisibleHeight + 16,
              left: 16,
              right: 16,
              backgroundColor: Colors.light.cardMutedBackground,
              borderRadius: 16,
              padding: 16,
            }}>
            <Text style={{ textAlign: 'center', color: Colors.light.textSecondary }}>검색 결과가 없어요.</Text>
          </View>
        )
      )}

      {/* 내 장소 목록. 드래그로 높이를 바꿀 수 있고, 배경(지도)은 계속 조작 가능하다.
          "내 장소 N개"는 핸들 바로 아래, 접혔을 때(peek 상태)도 보이는 자리에 가운데 정렬로 둔다.
          로드뷰가 떠 있는 동안엔 아래쪽 1/3 지도가 시트에 가리지 않도록 숨긴다. */}
      <BottomSheet
        visible={!roadviewOpen}
        modal={false}
        minHeight={0.08}
        maxHeight={0.5}
        dismissOnDragDown={false}
        onVisibleHeightChange={setSheetVisibleHeight}
        header={
          !selectedPlace && !generalPlaceDetail && !selectedRegionData ? (
            <Text
              style={{
                textAlign: 'center',
                paddingBottom: 8,
                color: Colors.light.cardTitle,
                fontSize: 15,
                fontWeight: '700',
              }}>
              내 장소 {myPlaces.length}개
            </Text>
          ) : undefined
        }>
        {selectedPlace ? (
          <>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingLeft: 8,
                // 누적 금액의 오른쪽 끝을 아래 아코디언 카드들의 오른쪽 끝(패딩 16)과 맞춘다.
                paddingRight: 16,
                paddingBottom: 8,
              }}>
              <IconButton name="back" onPress={closeAllDetails} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.light.cardTitle }}>
                  {selectedPlace.myPlaceName}
                </Text>
                <Text style={{ fontSize: 12, color: Colors.light.cardDescription }}>{selectedPlace.address}</Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.light.cardTitle }}>
                {formatWon(placeTotal)}원
              </Text>
            </View>

            <Scroll ref={merchantScrollRef} height={merchantListHeight} style={{ paddingHorizontal: 16 }}>
              {/* Scroll은 contentContainerStyle을 안 받아서, 카드 사이 간격(gap)은 View로 한 번 감싸서 준다. */}
              <View style={{ gap: 12 }}>
              {placeMerchants.map((merchant) => (
                <View
                  key={merchant.name}
                  // 각 카드의 세로 위치를 기록해뒀다가, 지도에서 이 가맹점 마커를 누르면 그 위치로 스크롤한다.
                  onLayout={(event) => {
                    merchantCardOffsets.current[merchant.name] = event.nativeEvent.layout.y;
                  }}>
                <AccordionCard
                  // 마커를 눌러서 열고 닫은 카드는 key를 바꿔 다시 마운트시켜서 그 상태로 시작하게 한다.
                  // (AccordionCard가 펼침 상태를 자체적으로 들고 있어서, 밖에서 직접 열고 닫을 방법이 없다)
                  key={merchant.name + (openMerchants.has(merchant.name) ? '-open' : '-closed')}
                  defaultOpen={openMerchants.has(merchant.name)}
                  // 카드를 직접 눌러서 열고 닫을 때도 지도 중심 이동 + 마커/카드 강조가 마커를 눌렀을 때와 똑같이 동작하게 한다.
                  onPress={(open) => {
                    userMovedMapRef.current = true;
                    if (merchant.latitude != null) {
                      mapRef.current?.setCenter({ lat: merchant.latitude, lng: merchant.longitude! });
                    }
                    setHighlightedMerchant((prev) => {
                      if (open) return merchant.name;
                      return prev === merchant.name ? null : prev;
                    });
                    setOpenMerchants((prev) => {
                      const next = new Set(prev);
                      if (open) {
                        next.add(merchant.name);
                      } else {
                        next.delete(merchant.name);
                      }
                      return next;
                    });
                  }}
                  style={
                    highlightedMerchant === merchant.name && { borderWidth: 2, borderColor: Colors.light.primary }
                  }
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
                    {groupMapTransactionsByDate(merchant.dateList).map((tx) => (
                      <View key={tx.transactionIds[0]} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 14, color: Colors.light.cardBodyText }}>
                          {formatDateOnly(tx.date)}
                        </Text>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.light.cardTitle }}>
                          -{formatWon(tx.amount)}원
                        </Text>
                      </View>
                    ))}
                  </View>
                </AccordionCard>
                </View>
              ))}
              </View>
            </Scroll>
          </>
        ) : generalPlaceDetail ? (
          // 4단계에서 "내 장소"가 아닌 일반 가게 마커를 눌렀을 때. 그 가게 하나의 아코디언 카드만 보여준다.
          <>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingLeft: 8,
                paddingRight: 16,
                paddingBottom: 8,
              }}>
              <IconButton name="back" onPress={closeAllDetails} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.light.cardTitle }}>
                  {generalPlaceDetail.name}
                </Text>
                <Text style={{ fontSize: 12, color: Colors.light.cardDescription }}>
                  {generalPlaceDetail.address}
                </Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.light.cardTitle }}>
                {formatWon(generalPlaceDetail.amount)}원
              </Text>
            </View>

            <Scroll height={merchantListHeight} style={{ paddingHorizontal: 16 }}>
              <AccordionCard
                defaultOpen
                header={
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.light.cardTitle }}>
                      {generalPlaceDetail.transactionList[0]?.categoryName ?? '기타'}
                    </Text>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.light.cardTitle }}>
                      {formatWon(generalPlaceDetail.amount)}원
                    </Text>
                  </View>
                }>
                <View style={{ gap: 12 }}>
                  <Text style={{ fontSize: 12, color: Colors.light.cardAccent, fontWeight: '600' }}>
                    이 가게에서 사용한 내역
                  </Text>
                  {groupMapTransactionsByDate(generalPlaceDetail.transactionList).map((tx) => (
                    <View key={tx.transactionIds[0]} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 14, color: Colors.light.cardBodyText }}>
                        {formatDateOnly(tx.date)}
                      </Text>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.light.cardTitle }}>
                        -{formatWon(tx.amount)}원
                      </Text>
                    </View>
                  ))}
                </View>
              </AccordionCard>
            </Scroll>
          </>
        ) : selectedRegionData ? (
          // 1~3단계에서 지역(클러스터) 마커를 눌렀을 때. 그 지역 안 가게들을 내 장소 상세와 같은
          // 아코디언 카드 여러 개로 보여준다.
          <>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingLeft: 8,
                paddingRight: 16,
                paddingBottom: 8,
              }}>
              <IconButton name="back" onPress={closeAllDetails} />
              <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: Colors.light.cardTitle }}>
                {selectedRegionData.depthName}
              </Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.light.cardTitle }}>
                {formatWon(selectedRegionData.amount)}원
              </Text>
            </View>

            <Scroll height={merchantListHeight} style={{ paddingHorizontal: 16 }}>
              <View style={{ gap: 12 }}>
                {regionMerchants.map((merchant) => (
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
                      {groupMapTransactionsByDate(merchant.dateList).map((tx) => (
                        <View
                          key={tx.transactionIds[0]}
                          style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 14, color: Colors.light.cardBodyText }}>
                            {formatDateOnly(tx.date)}
                          </Text>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.light.cardTitle }}>
                            -{formatWon(tx.amount)}원
                          </Text>
                        </View>
                      ))}
                    </View>
                  </AccordionCard>
                ))}
              </View>
            </Scroll>
          </>
        ) : (
          <>
            <Scroll height={placeListHeight} style={{ paddingHorizontal: 16 }}>
              {myPlaces.map((place) => {
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
                    title={place.myPlaceName}
                    description={place.address}
                    trailing={
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        {place.totalAmount > 0 ? (
                          <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.light.cardTitle }}>
                            {formatManwon(place.totalAmount)}
                          </Text>
                        ) : null}
                        <Ionicons name="chevron-forward" size={18} color={Colors.light.cardDescription} />
                      </View>
                    }
                    onPress={() => handleSelectPlace(place)}
                  />
                );
              })}
            </Scroll>
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
                  onChange={setCustomStartDate}
                  // 종료일보다 늦은 시작일도, 오늘보다 미래인 시작일도 고를 수 없게 두 제약 중 더 이른 날짜로 막는다.
                  maxDate={customEndDate && customEndDate < new Date() ? customEndDate : new Date()}
                  style={{ width: '47%' }}
                />
                <DateInput
                  label="종료일"
                  value={customEndDate}
                  onChange={setCustomEndDate}
                  maxDate={new Date()}
                  minDate={customStartDate}
                  style={{ width: '47%' }}
                />
              </View>
            )}
          </View>

          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.light.cardTitle }}>카테고리 선택</Text>
              {/* 하나라도 선택돼 있으면 "전체 해제"(→ 모두 비움), 다 비어 있으면 "전체 선택"(→ 모두 채움)으로 토글 */}
              <Text
                style={{ color: Colors.light.cardDescription }}
                onPress={() =>
                  setSelectedCategoryIds(
                    selectedCategoryIds.length === 0
                      ? categoryOptions.map((category) => category.id)
                      : []
                  )
                }>
                {selectedCategoryIds.length === 0 ? '전체 선택' : '전체 해제'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {categoryGroups.map((group) => (
                <Chip
                  key={group.name}
                  label={group.name}
                  indicator="check"
                  selected={group.ids.every((id) => selectedCategoryIds.includes(id))}
                  onPress={() => toggleCategoryGroup(group.ids)}
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
          <Button
            variant="green"
            disabled={!isCustomPeriodValid}
            onPress={handleApplyFilter}
            style={{ width: '47%', height: 50 }}>
            적용하기
          </Button>
        </View>
      </BottomSheet>
    </View>
  );
}
