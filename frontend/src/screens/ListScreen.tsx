import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import AppScreen from '@/components/common/AppScreen';
import BottomSheet from '@/components/common/BottomSheet';
import { AppHeader } from '@/components/common/header/AppHeader';
import { IconButton } from '@/components/common/button/IconButton';
import { Chip } from '@/components/common/chip/Chip';
import { DateInput } from '@/components/common/input/DateInput';
import { CurrencyInput } from '@/components/common/input/CurrencyInput';
import { MapInput } from '@/components/common/input/MapInput';
import { SearchInput } from '@/components/common/input/SearchInput';
import { SelectInput } from '@/components/common/input/SelectInput';
import { TextInput } from '@/components/common/input/TextInput';
import SegmentedControl from '@/components/common/segmented-control/SegmentedControl';
import { Button } from '@/components/common/button/Button';
import { AnalysisCard } from '@/components/transaction/AnalysisCard';
import { AnalysisLegend } from '@/components/transaction/AnalysisLegend';
import { CalendarDayCell } from '@/components/transaction/CalendarDayCell';
import { CategoryIcon } from '@/components/transaction/CategoryIcon';
import { EmptyState } from '@/components/transaction/EmptyState';
import { FloatingActionButton } from '@/components/transaction/FloatingActionButton';
import { MonthPicker } from '@/components/transaction/MonthPicker';
import { PieChart } from '@/components/transaction/PieChart';
import { TransactionTabBar, type TransactionTab } from '@/components/transaction/TransactionTabBar';
import TransactionGroup, { type TransactionGroupItem } from '@/components/transaction/TransactionGroup';
import TransactionItem from '@/components/transaction/TransactionItem';
import Colors from '@/constants/Colors';
import { useMapPickerStore } from '@/store/mapPickerStore';
import {
  getMockDayDetail,
  getMockMonthDateList,
  getMockPlaceAnalysis,
  MOCK_TRANSACTIONS,
} from '@/mocks/transactions';
import {
  TRANSACTION_SCREEN_MOCKS,
  type TransactionScreenMock,
} from '@/mocks/transactionScreen';

const toDateKey = (datetime: string) => datetime.slice(0, 10);

// new Date(...).toISOString()은 UTC 기준이라 KST에서는 자정 근처 날짜가 하루 밀린다.
// 달력 셀은 로컬 연/월/일을 직접 조합해서 dateKey를 만든다.
const toLocalDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

// 목업 데이터를 date별로 묶어서, 실제 "거래내역 목록 조회" API의 dateList 응답 모양과 똑같이 만듭니다.
// (백엔드 연결 전까지는 여기서 흉내 내고, 나중엔 이 부분만 fetch 결과로 바꾸면 됩니다.)
/** 목록 탭 전용 목업을 날짜별 거래 그룹 형태로 변환합니다. */
function groupScreenMocks(records: TransactionScreenMock[], sortOrder: SortOrder) {
  const groups = new Map<string, TransactionScreenMock[]>();

  for (const record of records) {
    const date = toDateKey(record.datetime);
    const group = groups.get(date) ?? [];
    group.push(record);
    groups.set(date, group);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => {
      const direction = sortOrder === 'latest' ? -1 : 1;
      return a.localeCompare(b) * direction;
    })
    .map(([date, transactions]) => ({
      date,
      transactions,
      totalAmount: transactions.reduce(
        (sum, transaction) => sum + (transaction.type === 'income' ? transaction.amount : -transaction.amount),
        0,
      ),
    }));
}

/** 공통 TransactionGroup이 받는 행 데이터로 변환합니다. */
function toScreenGroupItems(records: TransactionScreenMock[]): TransactionGroupItem[] {
  return records.map((record) => ({
    id: record.transactionId,
    title: record.name,
    description: record.categoryName,
    leading: <CategoryIcon categoryName={record.categoryName} size={20} />,
    amount: record.amount,
    type: record.type,
  }));
}

const formatDateLabel = (dateKey: string) => dateKey.replaceAll('-', '.');

type MonthCell = { day: number; dateKey: string; inCurrentMonth: boolean };

// 달력 한 화면(7의 배수)을 채우기 위해 이전/다음 달 날짜까지 포함한 날짜 배열을 만들고,
// 7개씩 주 단위로 미리 잘라서 반환합니다. flexWrap에 맡기면 화면 폭에 따라 한 줄에
// 7개보다 많이 들어갈 수 있어서(웹이나 넓은 기기), 렌더링에서 줄바꿈을 신경 쓰지 않도록
// 여기서 항상 정확히 7개짜리 줄로 나눠 줍니다.
function getMonthWeeks(month: Date): MonthCell[][] {
  const year = month.getFullYear();
  const m = month.getMonth();
  const firstWeekday = new Date(year, m, 1).getDay();
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, m, 0).getDate();

  const cells: MonthCell[] = [];

  for (let i = firstWeekday - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const date = new Date(year, m - 1, day);
    cells.push({ day, dateKey: toLocalDateKey(date), inCurrentMonth: false });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, m, day);
    cells.push({ day, dateKey: toLocalDateKey(date), inCurrentMonth: true });
  }
  // 다음 달로 넘어간 뒤에도 매번 다음 달 기준으로 day를 셈해야 한다.
  // (직전 셀의 day+1을 이번 달(m) 기준으로 다시 계산하면 두 번째 줄부터 날짜가 밀린다.)
  let trailingDay = 1;
  while (cells.length % 7 !== 0) {
    const date = new Date(year, m + 1, trailingDay);
    cells.push({ day: date.getDate(), dateKey: toLocalDateKey(date), inCurrentMonth: false });
    trailingDay += 1;
  }

  const weeks: MonthCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

type AnalysisMode = 'category' | 'place';
type SortOrder = 'latest' | 'oldest';
type PeriodFilter = 'thisMonth' | 'last3Months' | 'custom';
type AddTransactionType = 'expense' | 'income';

const FILTER_CATEGORY_OPTIONS = [
  '음식점',
  '카페·간식',
  '편의점·마트',
  '쇼핑',
  '여가',
  '교통',
  '건강·의료',
  '생활',
  '미용',
  '교육',
  '기타',
] as const;

const ANALYSIS_MODE_OPTIONS = [
  { label: '카테고리 분석', value: 'category' },
  { label: '장소 분석', value: 'place' },
] as const;

const ADD_TRANSACTION_TYPE_OPTIONS = [
  {
    value: 'expense',
    label: '💸 소비',
    activeBackgroundColor: Colors.light.danger,
    activeTextColor: '#FFFFFF',
  },
  {
    value: 'income',
    label: '💰 소득',
    activeBackgroundColor: Colors.light.primary,
    activeTextColor: '#FFFFFF',
  },
] as const;

const ADD_CATEGORY_OPTIONS = FILTER_CATEGORY_OPTIONS.map((category) => ({
  label: category,
  value: category,
}));

// 장소 분석 범례는 카테고리처럼 색 점 대신 장소 종류를 나타내는 아이콘을 쓴다.
const PLACE_ICON_BY_NAME: Record<string, keyof typeof Ionicons.glyphMap> = {
  회사: 'business',
  집: 'home',
  학교: 'school',
};
const DEFAULT_PLACE_ICON: keyof typeof Ionicons.glyphMap = 'location';

/** 내역 화면: 리스트/캘린더/분석 탭과 검색을 담당합니다. 필터는 바텀시트가 나오면 이어서 붙일 예정입니다. */
export default function ListScreen() {
  const [tab, setTab] = useState<TransactionTab>('list');
  const [isSearching, setIsSearching] = useState(false);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [isAddVisible, setIsAddVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [month, setMonth] = useState(() => new Date(2026, 6, 1));
  const [selectedDateKey, setSelectedDateKey] = useState('2026-07-17');
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('category');
  const [sortOrder, setSortOrder] = useState<SortOrder>('latest');
  const [selectedTypes, setSelectedTypes] = useState<Array<TransactionScreenMock['type']>>([
    'expense',
    'income',
  ]);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('thisMonth');
  const [customStartDate, setCustomStartDate] = useState(() => new Date(2026, 6, 1));
  const [customEndDate, setCustomEndDate] = useState(() => new Date(2026, 6, 31));
  const [selectedCategories, setSelectedCategories] = useState<string[]>([...FILTER_CATEGORY_OPTIONS]);
  const [addType, setAddType] = useState<AddTransactionType>('expense');
  const [addName, setAddName] = useState('');
  const [addAmount, setAddAmount] = useState<number | null>(null);
  const [addAddress, setAddAddress] = useState('');
  const [addCategory, setAddCategory] = useState<string | null>(null);
  const [addDate, setAddDate] = useState(() => new Date());
  const pickedLocation = useMapPickerStore((state) => state.pickedLocation);
  const clearPickedLocation = useMapPickerStore((state) => state.clearPickedLocation);
  const isReturningFromMapRef = useRef(false);

  // 목록과 검색은 같은 필터 결과를 사용해, 검색 여부에 따라 조건이 달라지지 않게 합니다.
  const filteredTransactions = useMemo(() => {
    const currentMonthIndex = month.getFullYear() * 12 + month.getMonth();

    return TRANSACTION_SCREEN_MOCKS.filter((record) => {
      const recordYear = Number(record.datetime.slice(0, 4));
      const recordMonthIndex = recordYear * 12 + Number(record.datetime.slice(5, 7)) - 1;
      const monthDifference = currentMonthIndex - recordMonthIndex;
      const recordDateKey = toDateKey(record.datetime);
      const customStartDateKey = toLocalDateKey(customStartDate);
      const customEndDateKey = toLocalDateKey(customEndDate);
      // 직접 설정은 시작일과 종료일을 모두 포함해 목록·검색에 같은 조건으로 적용합니다.
      const matchesPeriod =
        (periodFilter === 'custom' &&
          customStartDateKey <= customEndDateKey &&
          recordDateKey >= customStartDateKey &&
          recordDateKey <= customEndDateKey) ||
        (periodFilter === 'thisMonth' && monthDifference === 0) ||
        (periodFilter === 'last3Months' && monthDifference >= 0 && monthDifference < 3);

      return (
        matchesPeriod &&
        selectedTypes.includes(record.type) &&
        selectedCategories.includes(record.categoryName)
      );
    }).sort((a, b) => {
      const direction = sortOrder === 'latest' ? -1 : 1;
      return a.datetime.localeCompare(b.datetime) * direction;
    });
  }, [customEndDate, customStartDate, month, periodFilter, selectedCategories, selectedTypes, sortOrder]);

  const dateGroups = useMemo(
    () => groupScreenMocks(filteredTransactions, sortOrder),
    [filteredTransactions, sortOrder],
  );

  // 검색도 필터 이후 목록을 대상으로 하므로 두 기능을 함께 사용할 수 있습니다.
  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    return filteredTransactions.filter((record) => record.name.toLowerCase().includes(query));
  }, [filteredTransactions, searchQuery]);

  const monthWeeks = useMemo(() => getMonthWeeks(month), [month]);

  // 캘린더 월별 조회 API(dateList) 모양을 그대로 흉내 낸 목업이라, day(숫자) -> 합계를
  // 바로 찾을 수 있게 Map으로 한 번 더 감싼다. 실제 API로 바꿀 때도 이 부분만 fetch로 교체하면 된다.
  const monthDateList = useMemo(
    () => getMockMonthDateList(month.getFullYear(), month.getMonth() + 1),
    [month],
  );
  const monthTotalsByDay = useMemo(() => {
    const map = new Map<number, { expense: number; income: number }>();
    for (const summary of monthDateList) {
      map.set(summary.date, { expense: summary.expense, income: summary.income });
    }
    return map;
  }, [monthDateList]);

  // 일단위 입출금 조회 API(GET .../calendar/day?year&month&day)와 같은 모양의 목업.
  // 이 API는 categoryName을 안 주므로, 캘린더 탭의 하루 목록엔 카테고리 아이콘을 붙이지 않는다.
  const selectedDayDetail = useMemo(() => {
    const [year, monthNumber, day] = selectedDateKey.split('-').map(Number);
    return getMockDayDetail(year, monthNumber, day);
  }, [selectedDateKey]);

  const analysisData = useMemo(() => {
    const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
    const monthExpenses = MOCK_TRANSACTIONS.filter(
      (record) => record.type === 'expense' && toDateKey(record.datetime).startsWith(monthKey),
    );
    const totalAmount = monthExpenses.reduce((sum, record) => sum + record.amount, 0);

    const byCategory = new Map<string, { categoryId: number; amount: number }>();
    for (const record of monthExpenses) {
      const current = byCategory.get(record.categoryName) ?? { categoryId: record.categoryId, amount: 0 };
      current.amount += record.amount;
      byCategory.set(record.categoryName, current);
    }

    const categories = Array.from(byCategory.entries())
      .map(([categoryName, { categoryId, amount }]) => ({
        id: categoryId,
        name: categoryName,
        amount,
        // 분석 API와 동일하게 반올림해서 소수점을 절삭한다.
        percent: totalAmount === 0 ? 0 : Math.round((amount / totalAmount) * 100),
      }))
      .sort((a, b) => b.amount - a.amount);

    return { totalAmount, categories };
  }, [month]);

  // 장소 분석 목업은 카테고리 분석과 같은 이달 총 소비 금액을 장소별로 나눠서 보여준다.
  // (mocks/transactions.ts의 getMockPlaceAnalysis 주석 참고: 실제 장소 분석 API 나오기 전 placeholder)
  // getMockPlaceAnalysis 자체는 월과 무관하게 고정값을 주기 때문에, 그 달에 소비가 없으면
  // (analysisData.totalAmount === 0) 여기서도 빈 배열을 돌려줘야 카테고리 분석과 똑같이
  // "이달 소비 내역이 없습니다"가 뜬다.
  const placeAnalysisItems = useMemo(() => {
    if (analysisData.totalAmount === 0) return [];

    return getMockPlaceAnalysis().map((item) => ({
      id: item.placeId,
      name: item.myPlaceName,
      amount: item.amount,
      percent: item.percent,
      icon: (
        <Ionicons
          color={Colors.light.textSecondary}
          name={PLACE_ICON_BY_NAME[item.myPlaceName] ?? DEFAULT_PLACE_ICON}
          size={14}
        />
      ),
    }));
  }, [analysisData.totalAmount]);

  const handleOpenDetail = (transactionId: string) => {
    router.push({ pathname: '/transaction/[id]', params: { id: transactionId } });
  };

  // 지도에서 고른 장소는 store를 거쳐 돌아오므로, 기존 입력값을 유지한 채 주소만 반영합니다.
  useEffect(() => {
    if (pickedLocation) {
      setAddAddress(pickedLocation.address);
      clearPickedLocation();

      if (isReturningFromMapRef.current) {
        setIsAddVisible(true);
        isReturningFromMapRef.current = false;
      }
    }
  }, [clearPickedLocation, pickedLocation]);

  const handleAddPress = () => setIsAddVisible(true);

  const handleOpenMapPicker = () => {
    // 바텀시트를 닫은 뒤 지도 화면으로 이동해야 Modal이 지도 위를 가리지 않습니다.
    isReturningFromMapRef.current = true;
    setIsAddVisible(false);
    router.push('/map-picker');
  };

  const isAddFormValid = Boolean(
    addName.trim() && addAmount !== null && (addType === 'income' || addCategory),
  );

  const handleCreateTransaction = () => {
    if (!isAddFormValid) {
      Alert.alert(
        '입력을 확인해 주세요',
        addType === 'expense' ? '항목명, 금액, 카테고리를 입력해 주세요.' : '항목명과 금액을 입력해 주세요.',
      );
      return;
    }

    // TODO: 거래 추가 API가 연결되면 현재 입력값을 POST 요청 본문으로 전달합니다.
    Alert.alert('거래 추가', '입력한 거래를 추가할 준비가 되었어요.');
  };

  const handleFilterPress = () => {
    setIsFilterVisible(true);
  };

  const toggleTransactionType = (type: TransactionScreenMock['type']) => {
    setSelectedTypes((current) =>
      current.includes(type) ? current.filter((item) => item !== type) : [...current, type],
    );
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((current) =>
      current.includes(category) ? current.filter((item) => item !== category) : [...current, category],
    );
  };

  const hasAllCategoriesSelected = selectedCategories.length === FILTER_CATEGORY_OPTIONS.length;

  const toggleAllCategories = () => {
    setSelectedCategories(hasAllCategoriesSelected ? [] : [...FILTER_CATEGORY_OPTIONS]);
  };

  const handleCloseSearch = () => {
    setIsSearching(false);
    setSearchQuery('');
  };

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
          // 검색·필터는 리스트 탭에서만 의미가 있어서, 캘린더·분석 탭에서는 아이콘 자체를 숨긴다.
          <AppHeader
            rightActions={
              tab === 'list'
                ? [
                    { icon: 'search', key: 'search', onPress: () => setIsSearching(true) },
                    { icon: 'filter', key: 'filter', onPress: handleFilterPress },
                  ]
                : []
            }
            title="내역"
          />
        )}

        <View style={styles.body}>
          {isSearching ? (
            <View style={styles.section}>
              {searchQuery.trim() === '' ? (
                <Text style={styles.helperText}>거래명을 입력하면 검색 결과가 여기에 나와요.</Text>
              ) : searchResults.length === 0 ? (
                <EmptyState message="검색 결과가 없습니다." />
              ) : (
                <View style={styles.card}>
                  {searchResults.map((record, index) => (
                    <View key={record.transactionId}>
                      {index > 0 ? <View style={styles.divider} /> : null}
                      {/* 검색 결과는 date로 안 묶이므로 TransactionGroup 대신 항목 하나씩 직접 그린다. */}
                      <ScreenTransactionRow
                        onPress={() => handleOpenDetail(record.transactionId)}
                        record={record}
                      />
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <>
              <TransactionTabBar onChange={setTab} value={tab} />

              {tab === 'list' ? (
                <View style={styles.section}>
                  {dateGroups.length === 0 ? (
                    <EmptyState message="거래 내역이 없습니다." />
                  ) : (
                    dateGroups.map((group) => (
                      <TransactionGroup
                        date={formatDateLabel(group.date)}
                        key={group.date}
                        onItemPress={(item) => handleOpenDetail(item.id)}
                        style={styles.group}
                        totalAmount={group.totalAmount}
                        transactions={toScreenGroupItems(group.transactions)}
                      />
                    ))
                  )}
                </View>
              ) : null}

              {tab === 'calendar' ? (
                <View style={styles.section}>
                  <MonthPicker
                    month={month}
                    onNext={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                    onPrev={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                  />

                  <View style={styles.weekdayRow}>
                    {WEEKDAY_LABELS.map((label) => (
                      <Text key={label} style={styles.weekdayLabel}>
                        {label}
                      </Text>
                    ))}
                  </View>

                  <View style={styles.calendarGrid}>
                    {/* week 단위로 미리 잘라 놓은 배열을 그대로 행으로 그려서, 화면 폭이 넓어도
                        한 줄에 7개보다 많이 들어가는 일이 없게 한다. */}
                    {monthWeeks.map((week, weekIndex) => (
                      <View key={weekIndex} style={styles.calendarWeekRow}>
                        {week.map((cell) => {
                          const totals = monthTotalsByDay.get(cell.day);
                          return (
                            <CalendarDayCell
                              day={cell.day}
                              disabled={!cell.inCurrentMonth}
                              expenseAmount={cell.inCurrentMonth ? totals?.expense || undefined : undefined}
                              incomeAmount={cell.inCurrentMonth ? totals?.income || undefined : undefined}
                              key={cell.dateKey}
                              onPress={cell.inCurrentMonth ? () => setSelectedDateKey(cell.dateKey) : undefined}
                              selected={cell.dateKey === selectedDateKey}
                            />
                          );
                        })}
                      </View>
                    ))}
                  </View>

                  <Text style={styles.selectedDateTitle}>{formatDateLabel(selectedDateKey)}</Text>
                  {selectedDayDetail.transactionList.length === 0 ? (
                    <EmptyState message="이 날짜엔 거래 내역이 없습니다." />
                  ) : (
                    <View style={styles.card}>
                      {selectedDayDetail.transactionList.map((item, index) => (
                        <View key={item.transactionId}>
                          {index > 0 ? <View style={styles.divider} /> : null}
                          {/* categoryName은 아직 실제 API 스펙에 없는 필드라 목업에 우선 넣어둔 상태다.
                              (mocks/transactions.ts의 DayTransactionSummary 주석 참고) */}
                          <TransactionItem
                            amount={item.amount}
                            leading={<CategoryIcon categoryName={item.categoryName} size={20} />}
                            onPress={() => handleOpenDetail(String(item.transactionId))}
                            title={item.name}
                            type={item.type}
                          />
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ) : null}

              {tab === 'analysis' ? (
                <View style={styles.section}>
                  <MonthPicker
                    month={month}
                    onNext={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
                    onPrev={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
                    style={styles.monthPickerSpacing}
                  />

                  <SegmentedControl onChange={setAnalysisMode} options={ANALYSIS_MODE_OPTIONS} value={analysisMode} />

                  {analysisMode === 'category' ? (
                    <AnalysisCard amount={analysisData.totalAmount} label="이달 총 소비">
                      {analysisData.categories.length === 0 ? (
                        <EmptyState message="이달 소비 내역이 없습니다." />
                      ) : (
                        <>
                          <View style={styles.chartRow}>
                            <PieChart data={analysisData.categories} />
                          </View>
                          <AnalysisLegend items={analysisData.categories} style={styles.legendSpacing} />
                        </>
                      )}
                    </AnalysisCard>
                  ) : (
                    <AnalysisCard amount={analysisData.totalAmount} label="내 장소별 소비">
                      {placeAnalysisItems.length === 0 ? (
                        <EmptyState message="등록한 장소 주변 소비 내역이 없습니다." />
                      ) : (
                        <>
                          <Text style={styles.placeDescription}>
                            등록한 장소 주변 소비만 묶고, 범위 밖 소비는 기타로 분류했어요.
                          </Text>
                          <View style={styles.chartRow}>
                            <PieChart data={placeAnalysisItems} />
                          </View>
                          <AnalysisLegend items={placeAnalysisItems} style={styles.legendSpacing} />
                        </>
                      )}
                    </AnalysisCard>
                  )}
                </View>
              ) : null}
            </>
          )}
        </View>
      </AppScreen>

      <BottomSheet
        initialHeight={0.82}
        maxHeight={0.92}
        minHeight={0.62}
        onClose={() => setIsFilterVisible(false)}
        visible={isFilterVisible}>
        <ScrollView
          contentContainerStyle={styles.filterContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.filterScroll}>
          <View style={styles.filterHeader}>
            <Text style={styles.filterTitle}>내역 필터</Text>
            <IconButton color={Colors.light.text} name="close" onPress={() => setIsFilterVisible(false)} />
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>정렬</Text>
            <View style={styles.filterGrid}>
              <Chip
                align="center"
                indicator="radio"
                label="최신순"
                onPress={() => setSortOrder('latest')}
                selected={sortOrder === 'latest'}
                style={styles.twoColumnChip}
              />
              <Chip
                align="center"
                indicator="radio"
                label="과거순"
                onPress={() => setSortOrder('oldest')}
                selected={sortOrder === 'oldest'}
                style={styles.twoColumnChip}
              />
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>소비/소득</Text>
            <View style={styles.filterGrid}>
              <Chip
                align="center"
                indicator="radio"
                label="소비"
                onPress={() => toggleTransactionType('expense')}
                selected={selectedTypes.includes('expense')}
                style={styles.twoColumnChip}
              />
              <Chip
                align="center"
                indicator="radio"
                label="소득"
                onPress={() => toggleTransactionType('income')}
                selected={selectedTypes.includes('income')}
                style={styles.twoColumnChip}
              />
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>기간</Text>
            <View style={styles.filterGrid}>
              <Chip
                align="center"
                indicator="radio"
                label="이번 달"
                onPress={() => setPeriodFilter('thisMonth')}
                selected={periodFilter === 'thisMonth'}
                style={styles.threeColumnChip}
              />
              <Chip
                align="center"
                indicator="radio"
                label="최근 3개월"
                onPress={() => setPeriodFilter('last3Months')}
                selected={periodFilter === 'last3Months'}
                style={styles.threeColumnChip}
              />
              <Chip
                align="center"
                indicator="radio"
                label="직접 설정"
                onPress={() => setPeriodFilter('custom')}
                selected={periodFilter === 'custom'}
                style={styles.threeColumnChip}
              />
            </View>
            {/* 직접 설정일 때만 공통 DateInput 두 개를 노출해 날짜 범위를 선택합니다. */}
            {periodFilter === 'custom' ? (
              <View style={styles.dateRange}>
                <DateInput
                  onChange={setCustomStartDate}
                  style={styles.dateRangeInput}
                  value={customStartDate}
                />
                <Text style={styles.dateRangeSeparator}>~</Text>
                <DateInput
                  onChange={setCustomEndDate}
                  style={styles.dateRangeInput}
                  value={customEndDate}
                />
              </View>
            ) : null}
          </View>

          <View style={styles.filterSection}>
            <View style={styles.categoryHeader}>
              <Text style={styles.filterLabel}>카테고리</Text>
              <Pressable accessibilityRole="button" hitSlop={6} onPress={toggleAllCategories}>
                <Text style={styles.resetText}>{hasAllCategoriesSelected ? '전체 해제' : '전체 선택'}</Text>
              </Pressable>
            </View>
            <View style={styles.filterGrid}>
              {FILTER_CATEGORY_OPTIONS.map((category) => (
                <Chip
                  indicator="check"
                  key={category}
                  label={category}
                  onPress={() => toggleCategory(category)}
                  selected={selectedCategories.includes(category)}
                  style={styles.twoColumnChip}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      </BottomSheet>

      <BottomSheet
        initialHeight={0.82}
        maxHeight={0.92}
        minHeight={0.62}
        onClose={() => setIsAddVisible(false)}
        visible={isAddVisible}>
        <ScrollView
          contentContainerStyle={styles.addContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text style={styles.addTitle}>내역 추가</Text>

          {/* 소비·소득 상태는 API에 전달할 거래 유형 값으로 관리합니다. */}
          <SegmentedControl<AddTransactionType>
            onChange={setAddType}
            options={ADD_TRANSACTION_TYPE_OPTIONS}
            value={addType}
          />

          <TextInput
            label="항목명"
            labelInside
            onChangeText={setAddName}
            placeholder={addType === 'expense' ? '예) 스타벅스, 식료품' : '예) 월급, 용돈'}
            value={addName}
          />

          <CurrencyInput label="금액" onChangeValue={setAddAmount} value={addAmount} />

          {addType === 'expense' ? (
            <>
              <MapInput
                label="위치"
                onPress={handleOpenMapPicker}
                // 빈 문자열 대신 undefined를 전달해 공통 MapInput의 안내 문구를 표시합니다.
                value={addAddress || undefined}
              />

              <View style={styles.addTwoColumnRow}>
                <SelectInput
                  containerStyle={styles.addHalfField}
                  label="카테고리"
                  labelInside
                  onChange={setAddCategory}
                  options={ADD_CATEGORY_OPTIONS}
                  placeholder="선택"
                  value={addCategory}
                />
                <DateInput label="날짜" onChange={setAddDate} style={styles.addHalfField} value={addDate} />
              </View>
            </>
          ) : (
            <DateInput label="날짜" onChange={setAddDate} value={addDate} />
          )}

          <Button
            disabled={!isAddFormValid}
            onPress={handleCreateTransaction}
            style={styles.addButton}>
            추가하기
          </Button>
        </ScrollView>
      </BottomSheet>

      {!isSearching ? <FloatingActionButton onPress={handleAddPress} /> : null}
    </>
  );
}

// 카테고리 아이콘 + 제목/설명 + 금액을 한 줄로 그리는 행. TransactionGroup 밖(검색 결과, 날짜 선택 목록)에서 재사용합니다.
function ScreenTransactionRow({ record, onPress }: { record: TransactionScreenMock; onPress: () => void }) {
  return (
    <TransactionItem
      amount={record.amount}
      description={record.categoryName}
      leading={<CategoryIcon categoryName={record.categoryName} size={20} />}
      onPress={onPress}
      title={record.name}
      type={record.type}
    />
  );
}

const styles = StyleSheet.create({
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    backgroundColor: Colors.light.cardBackground,
  },
  searchInput: {
    flex: 1,
  },
  filterScroll: {
    flex: 1,
  },
  filterContent: {
    gap: 20,
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  addContent: {
    gap: 14,
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  addTitle: {
    marginBottom: 2,
    color: Colors.light.cardTitle,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  addTwoColumnRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  addHalfField: {
    flex: 1,
  },
  addButton: {
    marginTop: 4,
    height: 52,
    borderRadius: 14,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterTitle: {
    color: Colors.light.cardTitle,
    fontSize: 18,
    fontWeight: '800',
  },
  filterSection: {
    gap: 10,
  },
  filterLabel: {
    color: Colors.light.cardTitle,
    fontSize: 15,
    fontWeight: '700',
  },
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dateRange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateRangeInput: {
    flex: 1,
    // 공통 DateInput의 구조는 유지하고, 기간 필터 안에서만 날짜 값을 가운데에 배치합니다.
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
    gap: 0,
    paddingHorizontal: 14,
    paddingVertical: 0,
    borderRadius: 18,
  },
  dateRangeSeparator: {
    color: Colors.light.textSecondary,
    fontSize: 16,
  },
  twoColumnChip: {
    width: '48.5%',
    minHeight: 40,
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  threeColumnChip: {
    flex: 1,
    minWidth: 0,
    minHeight: 40,
    borderRadius: 14,
    paddingHorizontal: 8,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resetText: {
    color: Colors.light.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  body: {
    flexGrow: 1,
    backgroundColor: Colors.light.background,
  },
  section: {
    padding: 16,
    gap: 14,
  },
  group: {
    marginBottom: 4,
  },
  card: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: Colors.light.cardBackground,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.light.border,
  },
  helperText: {
    color: Colors.light.textSecondary,
    fontSize: 14,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekdayLabel: {
    width: 44,
    textAlign: 'center',
    color: Colors.light.placeholder,
    fontSize: 12,
    fontWeight: '600',
  },
  calendarGrid: {
    gap: 4,
  },
  calendarWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  selectedDateTitle: {
    color: Colors.light.text,
    fontSize: 15,
    fontWeight: '700',
  },
  chartRow: {
    alignItems: 'center',
  },
  legendSpacing: {
    marginTop: 16,
  },
  placeDescription: {
    marginBottom: 16,
    color: Colors.light.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  monthPickerSpacing: {
    marginBottom: 0,
  },
});
