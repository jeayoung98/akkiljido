import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, BackHandler, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/common/typography/Text';

import AppScreen from '@/components/common/AppScreen';
import { AsyncStateView } from '@/components/common/AsyncStateView';
import BottomSheet from '@/components/common/BottomSheet';
import { Button } from '@/components/common/button/Button';
import { IconButton } from '@/components/common/button/IconButton';
import { Chip } from '@/components/common/chip/Chip';
import { AppHeader } from '@/components/common/header/AppHeader';
import { CurrencyInput } from '@/components/common/input/CurrencyInput';
import { DateInput } from '@/components/common/input/DateInput';
import { MapInput } from '@/components/common/input/MapInput';
import { SearchInput } from '@/components/common/input/SearchInput';
import { SelectInput } from '@/components/common/input/SelectInput';
import { TextInput } from '@/components/common/input/TextInput';
import SegmentedControl from '@/components/common/segmented-control/SegmentedControl';
import { CategoryIcon } from '@/components/transaction/CategoryIcon';
import { FloatingActionButton } from '@/components/transaction/FloatingActionButton';
import { TransactionTabBar, type TransactionTab } from '@/components/transaction/TransactionTabBar';
import TransactionItem from '@/components/transaction/TransactionItem';
import Colors from '@/constants/Colors';
import { useCategories } from '@/hooks/useCategories';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { useCreateTransaction, useTransactionList, useTransactionSearch } from '@/hooks/useTransactions';
import {
  toApiDate,
  toApiDateTime,
  type TransactionSort,
  type TransactionType,
  type TransactionTypeFilter,
} from '@/src/api/transactionsApi';
import { TransactionAnalysisTab, type AnalysisMode } from '@/src/screens/transaction/TransactionAnalysisTab';
import { TransactionCalendarTab } from '@/src/screens/transaction/TransactionCalendarTab';
import { TransactionListTab } from '@/src/screens/transaction/TransactionListTab';
import { useMapPickerStore } from '@/store/mapPickerStore';

type PeriodFilter = 'thisMonth' | 'last3Months' | 'custom';

type AppliedTransactionFilter = {
  sortOrder: TransactionSort;
  selectedTypes: TransactionType[];
  periodFilter: PeriodFilter;
  customStartDate: Date;
  customEndDate: Date;
  /** 카테고리 ID 목록. 전체 선택과 전체 해제는 모두 "전체 조회"로 처리합니다. */
  selectedCategoryIds: number[];
};

const ADD_TRANSACTION_TYPE_OPTIONS = [
  { value: 'expense', label: '💸 소비', activeBackgroundColor: Colors.light.danger, activeTextColor: '#FFFFFF' },
  { value: 'income', label: '💰 소득', activeBackgroundColor: Colors.light.primary, activeTextColor: '#FFFFFF' },
] as const;

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);

// 필터 칩을 한 줄에 2개씩 배치할 때 쓴다. width:'48.5%' + flexWrap 조합은 화면 폭에 따라
// 계산이 아슬아슬해서(패딩·gap을 조금만 더 먹어도) 기기별로 한 줄에 1개씩 떨어지는 문제가 있었다.
// 그래서 퍼센트 대신, 두 개씩 묶어 각 줄을 별도의 flex:1 행으로 직접 그려 폭 계산 위험을 없앤다.
function chunkPairs<T>(items: T[]): T[][] {
  const pairs: T[][] = [];
  for (let index = 0; index < items.length; index += 2) {
    pairs.push(items.slice(index, index + 2));
  }
  return pairs;
}

/**
 * 화면의 기간 선택을 목록·검색 API의 startDate/endDate로 바꿉니다.
 * - 이번 달: 1일 ~ 오늘
 * - 최근 3개월: 2개월 전 1일 ~ 오늘 (이번 달 포함 3개월)
 * - 직접 설정: 사용자가 고른 두 날짜
 */
function toPeriodRange(filter: AppliedTransactionFilter): { startDate: string; endDate: string } {
  const today = new Date();

  if (filter.periodFilter === 'custom') {
    return { startDate: toApiDate(filter.customStartDate), endDate: toApiDate(filter.customEndDate) };
  }

  if (filter.periodFilter === 'last3Months') {
    return {
      startDate: toApiDate(new Date(today.getFullYear(), today.getMonth() - 2, 1)),
      endDate: toApiDate(today),
    };
  }

  return { startDate: toApiDate(startOfMonth(today)), endDate: toApiDate(today) };
}

/**
 * DateInput은 값을 비울 수 있어 onChange로 undefined를 넘길 수 있습니다.
 * 기간 필터는 빈 날짜를 허용하지 않으므로 undefined는 무시하고 기존 값을 유지합니다.
 */
const handleDateChange = (setDate: (date: Date) => void) => (date: Date | undefined) => {
  if (date) setDate(date);
};

/** 소비·소득 체크박스를 쿼리의 type 값으로 바꿉니다. 둘 다 켜졌거나 둘 다 꺼졌으면 전체입니다. */
function toTypeFilter(selectedTypes: TransactionType[]): TransactionTypeFilter {
  if (selectedTypes.length !== 1) return 'all';
  return selectedTypes[0];
}

/**
 * 거래 화면의 조합 담당 화면입니다.
 * 탭별 본문은 transaction 폴더의 전용 컴포넌트로 분리하고, 여기서는 공통 상태·검색·필터·추가 시트만 관리합니다.
 * 목록·검색·등록·캘린더·분석 모두 실제 API를 사용합니다.
 * 조회에 필요한 상태(필터, 캘린더/분석의 월과 선택 날짜)만 여기서 들고 있고, 실제 요청은 각 탭 컴포넌트가 합니다.
 */
export default function ListScreen() {
  // 홈 화면의 "카테고리별 지출 더보기"처럼, 다른 화면에서 특정 탭으로 바로 들어올 수 있게 쿼리로 초기 탭을 받는다.
  const { tab: initialTab } = useLocalSearchParams<{ tab?: TransactionTab }>();
  const [tab, setTab] = useState<TransactionTab>(
    initialTab === 'calendar' || initialTab === 'analysis' ? initialTab : 'list'
  );

  // 탭 화면은 전환해도 언마운트되지 않아서, useState 초기값은 이 화면에 "처음" 들어올 때만 적용된다.
  // 그 뒤로는 "더보기" 링크로 다시 들어와도(쿼리는 여전히 붙어 있지만) 이미 마운트돼 있어 무시된다.
  // useFocusEffect로 포커스가 올 때마다 쿼리의 tab을 다시 반영해서, 홈 화면 더보기를 몇 번을 눌러도
  // 항상 그 탭으로 이동하게 한다.
  useFocusEffect(
    useCallback(() => {
      if (initialTab === 'calendar' || initialTab === 'analysis') {
        setTab(initialTab);
      }
    }, [initialTab]),
  );
  const [isSearching, setIsSearching] = useState(false);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [isAddVisible, setIsAddVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    categories,
    selectOptions: categorySelectOptions,
    hasCategories,
    isLoading: isCategoriesLoading,
    error: categoriesError,
  } = useCategories();
  const allCategoryIds = useMemo(() => categories.map((category) => category.id), [categories]);
  // 배열은 렌더마다 새 참조라 의존성으로 쓸 수 없어서 비교용 문자열 키를 따로 만듭니다.
  const allCategoryIdsKey = allCategoryIds.join(',');

  // 캘린더·분석 탭도 실제 API를 쓰므로, 목업이 들어있던 특정 월이 아니라 이번 달·오늘을 기본값으로 둡니다.
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [analysisMonth, setAnalysisMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDateKey, setSelectedDateKey] = useState(() => toApiDate(new Date()));
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('category');

  // 시트에서 선택 중인 값은 초안으로 유지하고, 적용하기를 누른 값만 목록에 반영합니다.
  const [sortOrder, setSortOrder] = useState<TransactionSort>('latest');
  const [selectedTypes, setSelectedTypes] = useState<TransactionType[]>(['expense', 'income']);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('thisMonth');
  const [customStartDate, setCustomStartDate] = useState(() => startOfMonth(new Date()));
  const [customEndDate, setCustomEndDate] = useState(() => endOfMonth(new Date()));
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>(allCategoryIds);
  const [appliedFilter, setAppliedFilter] = useState<AppliedTransactionFilter>(() => ({
    sortOrder: 'latest',
    selectedTypes: ['expense', 'income'],
    periodFilter: 'thisMonth',
    customStartDate: startOfMonth(new Date()),
    customEndDate: endOfMonth(new Date()),
    selectedCategoryIds: [],
  }));

  // 카테고리 목록은 앱 실행 후 한 번만 받아옵니다. 응답이 도착하면 "전체 선택" 기준을 서버 값으로 맞춥니다.
  useEffect(() => {
    setSelectedCategoryIds([...allCategoryIds]);
    setAppliedFilter((current) => ({ ...current, selectedCategoryIds: [...allCategoryIds] }));
    // allCategoryIds는 매번 새 배열이라 문자열 키로 비교합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCategoryIdsKey]);

  const [addType, setAddType] = useState<TransactionType>('expense');
  const [addName, setAddName] = useState('');
  const [addAmount, setAddAmount] = useState<number | null>(null);
  const [addAddress, setAddAddress] = useState('');
  const [addCoords, setAddCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [addCategoryId, setAddCategoryId] = useState<string | null>(null);
  const [addPaymentMethod, setAddPaymentMethod] = useState('');
  const [addDate, setAddDate] = useState(() => new Date());
  const pickedLocation = useMapPickerStore((state) => state.pickedLocation);
  const clearPickedLocation = useMapPickerStore((state) => state.clearPickedLocation);
  const isReturningFromMapRef = useRef(false);

  // 추가 시트는 화면 아래에 고정돼 있어서, 키보드가 올라오면 아래쪽 입력창(결제 수단 등)이 그대로 가립니다.
  // 키보드 높이만큼 스크롤 아래 여백을 늘려 두고, 포커스된 입력창을 그 위로 스크롤해서 보이게 합니다.
  const keyboardHeight = useKeyboardHeight();
  const addScrollRef = useRef<ScrollView>(null);
  // 지금 포커스된 입력창이 시트 스크롤 안에서 세로로 몇 px에 있는지. 키보드가 올라온 뒤 그 위치로 스크롤합니다.
  const [focusedFieldOffset, setFocusedFieldOffset] = useState<number | null>(null);
  const fieldOffsets = useRef<Record<string, number>>({});

  /** 각 입력 그룹의 세로 위치를 기록해 둡니다(onLayout). 포커스 시 어디로 스크롤할지 계산하는 데 씁니다. */
  const handleFieldLayout = (field: string) => (event: { nativeEvent: { layout: { y: number } } }) => {
    fieldOffsets.current[field] = event.nativeEvent.layout.y;
  };

  const handleFieldFocus = (field: string) => () => {
    setFocusedFieldOffset(fieldOffsets.current[field] ?? null);
  };

  // 키보드가 실제로 올라와 아래 여백이 반영된 뒤에 스크롤해야 원하는 위치까지 이동합니다.
  // (여백이 늘어나기 전에 스크롤하면 스크롤 가능 범위가 부족해 중간에서 멈춥니다.)
  useEffect(() => {
    if (keyboardHeight === 0 || focusedFieldOffset === null) return;
    // 라벨까지 함께 보이도록 입력창 위로 24px 정도 여유를 둡니다.
    addScrollRef.current?.scrollTo({ y: Math.max(0, focusedFieldOffset - 24), animated: true });
  }, [keyboardHeight, focusedFieldOffset]);

  /** 적용된 필터를 목록·검색 API의 쿼리 파라미터로 변환합니다. */
  const listQuery = useMemo(() => {
    const { startDate, endDate } = toPeriodRange(appliedFilter);
    const isEveryCategorySelected =
      appliedFilter.selectedCategoryIds.length === 0 ||
      appliedFilter.selectedCategoryIds.length === allCategoryIds.length;

    return {
      sort: appliedFilter.sortOrder,
      type: toTypeFilter(appliedFilter.selectedTypes),
      startDate,
      endDate,
      // 전체 선택이면 파라미터를 아예 빼서 서버 기본값(전체 조회)을 그대로 씁니다.
      categoryId: isEveryCategorySelected ? undefined : appliedFilter.selectedCategoryIds,
    };
  }, [appliedFilter, allCategoryIds.length]);

  const {
    dateGroups,
    isLoading: isListLoading,
    error: listError,
    refetch: refetchList,
  } = useTransactionList(listQuery);

  // 검색도 목록과 같은 필터 조건 안에서 찾습니다(기간·카테고리를 무시하면 결과가 헷갈리기 때문).
  const {
    results: searchResults,
    isLoading: isSearchLoading,
    error: searchError,
    refetch: refetchSearch,
  } = useTransactionSearch({ ...listQuery, query: searchQuery });

  // 상세 화면에서 수정·삭제하면 그 훅이 거래 캐시를 무효화하므로, 목록으로 돌아오면 자동으로 최신 값을 다시 받아옵니다.
  const createMutation = useCreateTransaction();
  const isSubmitting = createMutation.isPending;

  const handleOpenDetail = (transactionId: string) => {
    router.push({ pathname: '/transaction/[id]', params: { id: transactionId } });
  };

  // 지도 선택 뒤에는 선택 주소·좌표를 폼 상태로 옮긴 후 거래 추가 시트를 다시 표시합니다.
  useEffect(() => {
    if (!pickedLocation) return;

    setAddAddress(pickedLocation.address);
    setAddCoords({ latitude: pickedLocation.lat, longitude: pickedLocation.lng });
    clearPickedLocation();
    if (isReturningFromMapRef.current) {
      setIsAddVisible(true);
      isReturningFromMapRef.current = false;
    }
  }, [clearPickedLocation, pickedLocation]);

  const handleOpenMapPicker = () => {
    isReturningFromMapRef.current = true;
    setIsAddVisible(false);
    router.push('/map-picker');
  };

  /*
   * 소득은 화면에 결제 수단·카테고리 입력이 없고 요청에도 보내지 않으므로 항목명·금액만 확인합니다.
   * 소비는 결제 수단·카테고리가 필요하고, 카테고리는 반드시 서버가 내려준 id여야 하므로
   * 목록을 아직 못 받았으면(hasCategories=false) 등록 자체를 막습니다.
   */
  const isAddFormValid =
    addType === 'income'
      ? Boolean(addName.trim() && addAmount !== null)
      : Boolean(addName.trim() && addAmount !== null && addPaymentMethod.trim() && addCategoryId && hasCategories);

  /** 소득으로 바꾸면 화면에서 사라지는 값(결제 수단·카테고리·위치)을 비워, 남은 값이 요청에 섞이지 않게 합니다. */
  const handleChangeAddType = (nextType: TransactionType) => {
    setAddType(nextType);
    if (nextType === 'income') {
      setAddPaymentMethod('');
      setAddCategoryId(null);
      setAddAddress('');
      setAddCoords(null);
    }
  };

  const resetAddForm = () => {
    setAddName('');
    setAddAmount(null);
    setAddAddress('');
    setAddCoords(null);
    setAddCategoryId(null);
    setAddPaymentMethod('');
    setAddDate(new Date());
    setAddType('expense');
  };

  /** POST /api/v1/transaction으로 거래를 등록하고, 성공하면 목록을 새로고침합니다. */
  const handleCreateTransaction = async () => {
    if (isSubmitting) return;

    const isExpense = addType === 'expense';

    if (isExpense && !hasCategories) {
      Alert.alert('카테고리를 불러오지 못했어요', '카테고리 목록을 받아야 소비를 등록할 수 있어요. 잠시 후 다시 시도해 주세요.');
      return;
    }

    if (!isAddFormValid) {
      Alert.alert(
        '입력을 확인해 주세요',
        isExpense ? '항목명, 금액, 결제 수단, 카테고리를 모두 입력해 주세요.' : '항목명과 금액을 입력해 주세요.',
      );
      return;
    }

    /*
     * 소비만 카테고리를 보냅니다. 반드시 GET /api/v1/category가 내려준 id여야 하고,
     * 프론트 상수(constants/categories.ts의 1~11)를 대신 보내면 서버가 CT001로 거절합니다.
     */
    const categoryId = isExpense
      ? categories.find((category) => String(category.id) === addCategoryId)?.id
      : undefined;

    if (isExpense && categoryId === undefined) {
      Alert.alert('카테고리를 다시 선택해 주세요', '선택한 카테고리를 서버 목록에서 찾지 못했어요.');
      return;
    }

    // 화면에서는 날짜만 고르므로 시각은 등록 시점의 현재 시각을 붙입니다(API가 초 단위까지 요구).
    const now = new Date();
    const datetime = toApiDateTime(
      new Date(
        addDate.getFullYear(),
        addDate.getMonth(),
        addDate.getDate(),
        now.getHours(),
        now.getMinutes(),
        now.getSeconds(),
      ),
    );

    try {
      await createMutation.mutateAsync({
        name: addName.trim(),
        amount: addAmount as number,
        type: addType,
        datetime,
        // 소득에는 결제 수단·카테고리·위치 입력이 없으므로 해당 키를 아예 보내지 않습니다.
        paymentMethod: isExpense ? addPaymentMethod.trim() : undefined,
        categoryId,
        address: isExpense && addAddress ? addAddress : undefined,
        latitude: isExpense ? addCoords?.latitude : undefined,
        longitude: isExpense ? addCoords?.longitude : undefined,
      });

      // 성공하면 useCreateTransaction이 거래 캐시를 무효화해 목록이 알아서 다시 조회됩니다.
      setIsAddVisible(false);
      resetAddForm();
    } catch (error) {
      // apiClient가 서버의 msg를 그대로 담아 던지므로 사용자에게 그대로 보여줍니다.
      Alert.alert('거래 추가 실패', error instanceof Error ? error.message : '거래를 추가하지 못했어요.');
    }
  };

  const toggleTransactionType = (type: TransactionType) => {
    setSelectedTypes((current) => current.includes(type) ? current.filter((item) => item !== type) : [...current, type]);
  };

  // 서버가 같은 이름의 카테고리를 id만 다르게 두 벌(예: 음식점 34, 67) 내려줄 때가 있어서, 필터
  // 칩은 이름 기준으로 묶어서 하나만 보여준다. 칩 하나를 누르면 그 이름에 속한 id를 전부 같이
  // 켜고/끄기 때문에, 화면엔 12개만 보여도 실제 필터링은 두 id 모두를 대상으로 정확히 걸린다.
  const categoryGroups = useMemo(() => {
    const groups = new Map<string, number[]>();
    categories.forEach((category) => {
      const ids = groups.get(category.name) ?? [];
      ids.push(category.id);
      groups.set(category.name, ids);
    });
    return Array.from(groups.entries()).map(([name, ids]) => ({ name, ids }));
  }, [categories]);

  const toggleCategoryGroup = (ids: number[]) => {
    const isFullySelected = ids.every((id) => selectedCategoryIds.includes(id));
    setSelectedCategoryIds((current) =>
      isFullySelected
        ? current.filter((id) => !ids.includes(id))
        : [...current, ...ids.filter((id) => !current.includes(id))],
    );
  };

  const hasAllCategoriesSelected = selectedCategoryIds.length === allCategoryIds.length;
  const isCustomPeriodValid = periodFilter !== 'custom' || customStartDate <= customEndDate;

  // 마지막 적용값을 초안으로 복원하므로, 적용하지 않고 닫아도 기존 목록은 바뀌지 않습니다.
  const handleOpenFilter = () => {
    setSortOrder(appliedFilter.sortOrder);
    setSelectedTypes(appliedFilter.selectedTypes);
    setPeriodFilter(appliedFilter.periodFilter);
    setCustomStartDate(appliedFilter.customStartDate);
    setCustomEndDate(appliedFilter.customEndDate);
    setSelectedCategoryIds(appliedFilter.selectedCategoryIds);
    setIsFilterVisible(true);
  };

  const handleResetFilter = () => {
    setSortOrder('latest');
    setSelectedTypes(['expense', 'income']);
    setPeriodFilter('thisMonth');
    setCustomStartDate(startOfMonth(new Date()));
    setCustomEndDate(endOfMonth(new Date()));
    setSelectedCategoryIds([...allCategoryIds]);
  };

  const handleApplyFilter = () => {
    if (!isCustomPeriodValid) return;

    setAppliedFilter({
      sortOrder,
      selectedTypes,
      periodFilter,
      customStartDate,
      customEndDate,
      // 아무 카테고리도 선택하지 않은 경우에는 지도 필터와 동일하게 전체 선택으로 처리합니다.
      selectedCategoryIds: selectedCategoryIds.length > 0 ? selectedCategoryIds : [...allCategoryIds],
    });
    setIsFilterVisible(false);
  };

  const handleCloseSearch = () => {
    setIsSearching(false);
    setSearchQuery('');
  };

  // 검색 중에 안드로이드 뒤로가기(하드웨어/제스처)를 누르면 기본 동작(화면 자체를 벗어나 홈 탭으로
  // 이동)이 아니라, X 버튼을 누른 것과 같이 검색만 닫고 거래 리스트 화면으로 돌아오게 한다.
  useEffect(() => {
    if (!isSearching) return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      handleCloseSearch();
      return true;
    });
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSearching]);

  return (
    <>
      <AppScreen scrollable backgroundColor={Colors.light.cardBackground}>
        {isSearching ? (
          <View style={styles.searchHeader}>
            <SearchInput
              autoFocus
              containerStyle={styles.searchInput}
              onChangeText={setSearchQuery}
              placeholder="거래명을 검색해 주세요"
              value={searchQuery}
            />
            <IconButton color={Colors.light.text} name="close" onPress={handleCloseSearch} />
          </View>
        ) : (
          <AppHeader
            rightActions={tab === 'list' ? [
              { icon: 'search', key: 'search', onPress: () => setIsSearching(true) },
              { icon: 'filter', key: 'filter', onPress: handleOpenFilter },
            ] : []}
            title="내역"
          />
        )}

        <View style={styles.body}>
          {isSearching ? (
            <View style={styles.section}>
              {searchQuery.trim() === '' ? (
                <Text style={styles.helperText}>거래명을 입력하면 검색 결과가 여기에 표시됩니다.</Text>
              ) : (
                <AsyncStateView
                  emptyMessage="검색 결과가 없습니다."
                  error={searchError}
                  isEmpty={searchResults.length === 0}
                  isLoading={isSearchLoading}
                  onRetry={refetchSearch}>
                  <View style={styles.card}>
                    {searchResults.map((record, index) => (
                      <View key={record.transactionId}>
                        {index > 0 ? <View style={styles.divider} /> : null}
                        <TransactionItem
                          amount={record.amount}
                          description={record.categoryName}
                          leading={<CategoryIcon categoryId={record.categoryId} categoryName={record.categoryName} size={20} type={record.type} />}
                          onPress={() => handleOpenDetail(String(record.transactionId))}
                          title={record.name}
                          type={record.type}
                        />
                      </View>
                    ))}
                  </View>
                </AsyncStateView>
              )}
            </View>
          ) : (
            <>
              <TransactionTabBar onChange={setTab} value={tab} />
              {tab === 'list' ? (
                <AsyncStateView
                  emptyDescription="필터 조건을 바꾸거나 새 거래를 추가해 보세요."
                  emptyMessage="거래 내역이 없습니다."
                  error={listError}
                  isEmpty={dateGroups.length === 0}
                  isLoading={isListLoading}
                  onRetry={refetchList}>
                  <TransactionListTab dateGroups={dateGroups} onOpenDetail={handleOpenDetail} />
                </AsyncStateView>
              ) : null}
              {tab === 'calendar' ? (
                <TransactionCalendarTab
                  month={calendarMonth}
                  onNextMonth={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                  onOpenDetail={handleOpenDetail}
                  onPreviousMonth={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                  onSelectDate={setSelectedDateKey}
                  selectedDateKey={selectedDateKey}
                />
              ) : null}
              {tab === 'analysis' ? (
                <TransactionAnalysisTab
                  mode={analysisMode}
                  month={analysisMonth}
                  onChangeMode={setAnalysisMode}
                  onNextMonth={() => setAnalysisMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                  onPreviousMonth={() => setAnalysisMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                />
              ) : null}
            </>
          )}
        </View>
      </AppScreen>

      {/* 지도 필터(MapScreen.tsx)와 동일하게 min=max로 고정해서, 열자마자 아래 초기화/적용하기
          버튼까지 항상 다 보이게 한다. 가변 높이로 두면 초기 높이가 내용보다 작을 때 버튼이
          화면 밖으로 밀려서 시트를 끌어올려야만 보이는 문제가 있었다. */}
      <BottomSheet maxHeight={0.92} minHeight={0.92} onClose={() => setIsFilterVisible(false)} visible={isFilterVisible}>
        <ScrollView contentContainerStyle={styles.filterContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={styles.filterScroll}>
          <View style={styles.filterHeader}>
            <Text style={styles.filterTitle}>내역 필터</Text>
            <IconButton color={Colors.light.text} name="close" onPress={() => setIsFilterVisible(false)} />
          </View>

          <FilterSection label="정렬">
            <View style={styles.twoColumnRow}>
              <Chip align="center" indicator="radio" label="최신순" onPress={() => setSortOrder('latest')} selected={sortOrder === 'latest'} style={styles.flexChip} />
              <Chip align="center" indicator="radio" label="과거순" onPress={() => setSortOrder('oldest')} selected={sortOrder === 'oldest'} style={styles.flexChip} />
            </View>
          </FilterSection>

          <FilterSection label="소비/소득">
            <View style={styles.twoColumnRow}>
              <Chip align="center" indicator="radio" label="소비" onPress={() => toggleTransactionType('expense')} selected={selectedTypes.includes('expense')} style={styles.flexChip} />
              <Chip align="center" indicator="radio" label="소득" onPress={() => toggleTransactionType('income')} selected={selectedTypes.includes('income')} style={styles.flexChip} />
            </View>
          </FilterSection>

          <FilterSection label="기간">
            <View style={styles.filterGrid}>
              <Chip align="center" indicator="radio" label="이번 달" onPress={() => setPeriodFilter('thisMonth')} selected={periodFilter === 'thisMonth'} style={styles.threeColumnChip} />
              <Chip align="center" indicator="radio" label="최근 3개월" onPress={() => setPeriodFilter('last3Months')} selected={periodFilter === 'last3Months'} style={styles.threeColumnChip} />
              <Chip align="center" indicator="radio" label="직접 설정" onPress={() => setPeriodFilter('custom')} selected={periodFilter === 'custom'} style={styles.threeColumnChip} />
            </View>
            {periodFilter === 'custom' ? (
              <View style={styles.dateRange}>
                <DateInput onChange={handleDateChange(setCustomStartDate)} style={styles.dateRangeInput} value={customStartDate} />
                <Text style={styles.dateRangeSeparator}>~</Text>
                <DateInput onChange={handleDateChange(setCustomEndDate)} style={styles.dateRangeInput} value={customEndDate} />
              </View>
            ) : null}
          </FilterSection>

          <FilterSection
            actionLabel={hasAllCategoriesSelected ? '전체 해제' : '전체 선택'}
            label="카테고리"
            onAction={() => setSelectedCategoryIds(hasAllCategoriesSelected ? [] : [...allCategoryIds])}>
            <View style={styles.twoColumnGrid}>
              {chunkPairs(categoryGroups).map((pair) => (
                <View key={pair[0].name} style={styles.twoColumnRow}>
                  {pair.map((group) => (
                    <Chip
                      indicator="check"
                      key={group.name}
                      label={group.name}
                      onPress={() => toggleCategoryGroup(group.ids)}
                      selected={group.ids.every((id) => selectedCategoryIds.includes(id))}
                      style={styles.flexChip}
                    />
                  ))}
                  {/* 카테고리 개수가 홀수면 마지막 줄에 하나만 남는데, 그 하나가 flex:1이라
                      혼자 줄 전체로 늘어나 버린다. 안 보이는 자리 채우개를 옆에 둬서
                      다른 칩과 같은 폭을 유지하고 나머지 공간은 그냥 비워 둔다. */}
                  {pair.length === 1 ? <View style={styles.flexChip} /> : null}
                </View>
              ))}
            </View>
          </FilterSection>
        </ScrollView>
        {/* 지도 필터와 동일하게 초기화는 초안만 바꾸고, 적용하기를 눌러야 목록에 반영합니다. */}
        <View style={styles.filterFooter}>
          <Button onPress={handleResetFilter} style={styles.filterFooterButton} variant="white">
            초기화
          </Button>
          <Button disabled={!isCustomPeriodValid} onPress={handleApplyFilter} style={styles.filterFooterButton} variant="green">
            적용하기
          </Button>
        </View>
      </BottomSheet>

      <BottomSheet initialHeight={0.82} maxHeight={0.92} minHeight={0.62} onClose={() => setIsAddVisible(false)} visible={isAddVisible}>
        <ScrollView
          ref={addScrollRef}
          // 키보드가 덮는 만큼 아래 여백을 더해, 가려진 입력창을 키보드 위로 스크롤할 수 있게 합니다.
          contentContainerStyle={[styles.addContent, { paddingBottom: 36 + keyboardHeight }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text style={styles.addTitle}>내역 추가</Text>
          <SegmentedControl<TransactionType> onChange={handleChangeAddType} options={ADD_TRANSACTION_TYPE_OPTIONS} value={addType} />
          <View onLayout={handleFieldLayout('name')}>
            <TextInput label="항목명" labelInside onChangeText={setAddName} onFocus={handleFieldFocus('name')} placeholder={addType === 'expense' ? '예) 스타벅스, 식료품' : '예) 월급, 용돈'} value={addName} />
          </View>
          <View onLayout={handleFieldLayout('amount')}>
            <CurrencyInput label="금액" onChangeValue={setAddAmount} onFocus={handleFieldFocus('amount')} value={addAmount} />
          </View>
          {/* 결제 수단·위치·카테고리는 소비에만 있는 입력입니다. 소득은 항목명·금액·날짜만 받습니다. */}
          {addType === 'expense' ? (
            <>
              <View onLayout={handleFieldLayout('paymentMethod')}>
                <TextInput label="결제 수단" labelInside maxLength={10} onChangeText={setAddPaymentMethod} onFocus={handleFieldFocus('paymentMethod')} placeholder="예) 신한카드, 현금" value={addPaymentMethod} />
              </View>
              <MapInput label="위치" onPress={handleOpenMapPicker} value={addAddress || undefined} />
              <View style={styles.addTwoColumnRow}>
                <SelectInput
                  containerStyle={styles.addHalfField}
                  // 시트 아래쪽에 있는 칸이라 아래로 펼치면 목록이 잘리거나 키보드에 가립니다. 위로 펼칩니다.
                  dropdownDirection="up"
                  label="카테고리"
                  labelInside
                  onChange={setAddCategoryId}
                  options={categorySelectOptions}
                  placeholder={isCategoriesLoading ? '불러오는 중' : hasCategories ? '선택' : '불러오기 실패'}
                  value={addCategoryId}
                />
                <DateInput label="날짜" maxDate={new Date()} onChange={handleDateChange(setAddDate)} style={styles.addHalfField} value={addDate} />
              </View>
              {!isCategoriesLoading && !hasCategories ? (
                <Text style={styles.addWarningText}>
                  {categoriesError?.message ?? '카테고리를 불러오지 못해 소비를 등록할 수 없어요.'}
                </Text>
              ) : null}
            </>
          ) : (
            <DateInput label="날짜" maxDate={new Date()} onChange={handleDateChange(setAddDate)} value={addDate} />
          )}

          <Button disabled={!isAddFormValid} loading={isSubmitting} onPress={handleCreateTransaction} style={styles.addButton}>
            추가하기
          </Button>
        </ScrollView>
      </BottomSheet>

      {!isSearching ? <FloatingActionButton onPress={() => setIsAddVisible(true)} /> : null}
    </>
  );
}

type FilterSectionProps = {
  label: string;
  children: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
};

function FilterSection({ label, children, actionLabel, onAction }: FilterSectionProps) {
  return (
    <View style={styles.filterSection}>
      <View style={styles.filterSectionHeader}>
        <Text style={styles.filterLabel}>{label}</Text>
        {actionLabel && onAction ? <Pressable accessibilityRole="button" hitSlop={6} onPress={onAction}><Text style={styles.resetText}>{actionLabel}</Text></Pressable> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  searchHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.light.border, backgroundColor: Colors.light.cardBackground },
  searchInput: { flex: 1 },
  body: { flexGrow: 1, backgroundColor: Colors.light.background },
  section: { padding: 16, gap: 14 },
  card: { padding: 8, borderRadius: 16, backgroundColor: Colors.light.cardBackground, borderWidth: 1, borderColor: Colors.light.border },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.light.border },
  helperText: { color: Colors.light.textSecondary, fontSize: 14 },
  filterScroll: { flex: 1 },
  filterContent: { gap: 20, paddingHorizontal: 20, paddingBottom: 36 },
  filterFooter: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20, borderTopWidth: 1, borderTopColor: Colors.light.border, backgroundColor: Colors.light.cardBackground },
  filterFooterButton: { flex: 1, height: 50 },
  filterHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  filterTitle: { color: Colors.light.cardTitle, fontSize: 18, fontWeight: '800' },
  filterSection: { gap: 10 },
  filterSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  filterLabel: { color: Colors.light.cardTitle, fontSize: 15, fontWeight: '700' },
  filterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  dateRange: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateRangeInput: { flex: 1, alignItems: 'center', minHeight: 48, justifyContent: 'center', gap: 0, paddingHorizontal: 14, paddingVertical: 0, borderRadius: 18 },
  dateRangeSeparator: { color: Colors.light.textSecondary, fontSize: 16 },
  twoColumnGrid: { gap: 10 },
  twoColumnRow: { flexDirection: 'row', gap: 10 },
  flexChip: { flex: 1, minWidth: 0, minHeight: 40, borderRadius: 14, paddingHorizontal: 12 },
  threeColumnChip: { flex: 1, minWidth: 0, minHeight: 40, borderRadius: 14, paddingHorizontal: 4, gap: 4 },
  resetText: { color: Colors.light.primary, fontSize: 13, fontWeight: '700' },
  addContent: { gap: 14, paddingHorizontal: 20, paddingBottom: 36 },
  addTitle: { marginBottom: 2, color: Colors.light.cardTitle, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  // 카테고리 목록은 화면 전체를 덮는 Modal 위에 그려지므로(SelectInput), 여기서 겹침 순서를 신경 쓸 필요가 없습니다.
  addTwoColumnRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  addHalfField: { flex: 1 },
  addWarningText: { color: Colors.light.danger, fontSize: 13 },
  addButton: { marginTop: 4, height: 52, borderRadius: 14 },
});
