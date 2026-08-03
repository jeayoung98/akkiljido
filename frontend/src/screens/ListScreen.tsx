import { router } from 'expo-router';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import AppScreen from '@/components/common/AppScreen';
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
import { EmptyState } from '@/components/transaction/EmptyState';
import { FloatingActionButton } from '@/components/transaction/FloatingActionButton';
import { TransactionTabBar, type TransactionTab } from '@/components/transaction/TransactionTabBar';
import TransactionItem from '@/components/transaction/TransactionItem';
import { CATEGORY_NAMES, CATEGORY_NAME_SELECT_OPTIONS } from '@/constants/categories';
import Colors from '@/constants/Colors';
import { TRANSACTION_SCREEN_MOCKS, type TransactionScreenMock } from '@/mocks/transactionScreen';
import { TransactionAnalysisTab, type AnalysisMode } from '@/src/screens/transaction/TransactionAnalysisTab';
import { TransactionCalendarTab } from '@/src/screens/transaction/TransactionCalendarTab';
import { TransactionListTab } from '@/src/screens/transaction/TransactionListTab';
import { useMapPickerStore } from '@/store/mapPickerStore';

type SortOrder = 'latest' | 'oldest';
type PeriodFilter = 'thisMonth' | 'last3Months' | 'custom';
type AddTransactionType = 'expense' | 'income';

type AppliedTransactionFilter = {
  sortOrder: SortOrder;
  selectedTypes: Array<TransactionScreenMock['type']>;
  periodFilter: PeriodFilter;
  customStartDate: Date;
  customEndDate: Date;
  selectedCategories: string[];
};

const ADD_TRANSACTION_TYPE_OPTIONS = [
  { value: 'expense', label: '💸 소비', activeBackgroundColor: Colors.light.danger, activeTextColor: '#FFFFFF' },
  { value: 'income', label: '💰 소득', activeBackgroundColor: Colors.light.primary, activeTextColor: '#FFFFFF' },
] as const;

const FILTER_CATEGORY_OPTIONS = CATEGORY_NAMES;
const ADD_CATEGORY_OPTIONS = CATEGORY_NAME_SELECT_OPTIONS;

const toDateKey = (datetime: string) => datetime.slice(0, 10);
const toLocalDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/**
 * 거래 화면의 조합 담당 화면입니다.
 * 탭별 본문은 transaction 폴더의 전용 컴포넌트로 분리하고, 여기서는 공통 상태·검색·필터·추가 시트만 관리합니다.
 */
export default function ListScreen() {
  const [tab, setTab] = useState<TransactionTab>('list');
  const [isSearching, setIsSearching] = useState(false);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [isAddVisible, setIsAddVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // 리스트의 기간 필터, 캘린더, 분석은 서로 다른 월 상태를 사용합니다.
  // 따라서 캘린더·분석 화면에서 월을 이동해도 리스트 필터 결과가 바뀌지 않습니다.
  const listFilterMonth = useRef(new Date(2026, 6, 1)).current;
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(2026, 6, 1));
  const [analysisMonth, setAnalysisMonth] = useState(() => new Date(2026, 6, 1));
  const [selectedDateKey, setSelectedDateKey] = useState('2026-07-17');
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('category');
  const [sortOrder, setSortOrder] = useState<SortOrder>('latest');
  const [selectedTypes, setSelectedTypes] = useState<Array<TransactionScreenMock['type']>>(['expense', 'income']);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('thisMonth');
  const [customStartDate, setCustomStartDate] = useState(() => new Date(2026, 6, 1));
  const [customEndDate, setCustomEndDate] = useState(() => new Date(2026, 6, 31));
  const [selectedCategories, setSelectedCategories] = useState<string[]>([...FILTER_CATEGORY_OPTIONS]);
  // 시트에서 선택 중인 값은 초안으로 유지하고, 적용하기를 누른 값만 목록에 반영합니다.
  const [appliedFilter, setAppliedFilter] = useState<AppliedTransactionFilter>(() => ({
    sortOrder: 'latest',
    selectedTypes: ['expense', 'income'],
    periodFilter: 'thisMonth',
    customStartDate: new Date(2026, 6, 1),
    customEndDate: new Date(2026, 6, 31),
    selectedCategories: [...FILTER_CATEGORY_OPTIONS],
  }));

  const [addType, setAddType] = useState<AddTransactionType>('expense');
  const [addName, setAddName] = useState('');
  const [addAmount, setAddAmount] = useState<number | null>(null);
  const [addAddress, setAddAddress] = useState('');
  const [addCategory, setAddCategory] = useState<string | null>(null);
  const [addDate, setAddDate] = useState(() => new Date());
  const pickedLocation = useMapPickerStore((state) => state.pickedLocation);
  const clearPickedLocation = useMapPickerStore((state) => state.clearPickedLocation);
  const isReturningFromMapRef = useRef(false);

  /** 목록과 검색 결과가 동일한 조건을 사용하도록 필터링을 한 곳에서 처리합니다. */
  const filteredTransactions = useMemo(() => {
    const {
      customEndDate: appliedCustomEndDate,
      customStartDate: appliedCustomStartDate,
      periodFilter: appliedPeriodFilter,
      selectedCategories: appliedCategories,
      selectedTypes: appliedTypes,
      sortOrder: appliedSortOrder,
    } = appliedFilter;
    const currentMonthIndex = listFilterMonth.getFullYear() * 12 + listFilterMonth.getMonth();
    const customStartDateKey = toLocalDateKey(appliedCustomStartDate);
    const customEndDateKey = toLocalDateKey(appliedCustomEndDate);

    return TRANSACTION_SCREEN_MOCKS.filter((record) => {
      const recordMonthIndex = Number(record.datetime.slice(0, 4)) * 12 + Number(record.datetime.slice(5, 7)) - 1;
      const monthDifference = currentMonthIndex - recordMonthIndex;
      const recordDateKey = toDateKey(record.datetime);
      const matchesPeriod =
        (appliedPeriodFilter === 'custom' &&
          customStartDateKey <= customEndDateKey &&
          recordDateKey >= customStartDateKey &&
          recordDateKey <= customEndDateKey) ||
        (appliedPeriodFilter === 'thisMonth' && monthDifference === 0) ||
        (appliedPeriodFilter === 'last3Months' && monthDifference >= 0 && monthDifference < 3);

      return matchesPeriod && appliedTypes.includes(record.type) && appliedCategories.includes(record.categoryName);
    }).sort((left, right) => {
      const direction = appliedSortOrder === 'latest' ? -1 : 1;
      return left.datetime.localeCompare(right.datetime) * direction;
    });
  }, [appliedFilter, listFilterMonth]);

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return query ? filteredTransactions.filter((record) => record.name.toLowerCase().includes(query)) : [];
  }, [filteredTransactions, searchQuery]);

  const handleOpenDetail = (transactionId: string) => {
    router.push({ pathname: '/transaction/[id]', params: { id: transactionId } });
  };

  // 지도 선택 뒤에는 선택 주소를 폼 상태로 옮긴 후 거래 추가 시트를 다시 표시합니다.
  useEffect(() => {
    if (!pickedLocation) return;

    setAddAddress(pickedLocation.address);
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

  const isAddFormValid = Boolean(addName.trim() && addAmount !== null && (addType === 'income' || addCategory));

  const handleCreateTransaction = () => {
    if (!isAddFormValid) {
      Alert.alert(
        '입력을 확인해 주세요',
        addType === 'expense' ? '항목명, 금액, 카테고리를 입력해 주세요.' : '항목명과 금액을 입력해 주세요.',
      );
      return;
    }

    // TODO: 거래 추가 API 연결 후 현재 폼 값을 POST 요청 본문으로 전달합니다.
    Alert.alert('거래 추가', '입력한 거래를 추가할 준비가 되었어요.');
  };

  const toggleTransactionType = (type: TransactionScreenMock['type']) => {
    setSelectedTypes((current) => current.includes(type) ? current.filter((item) => item !== type) : [...current, type]);
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((current) => current.includes(category) ? current.filter((item) => item !== category) : [...current, category]);
  };

  const hasAllCategoriesSelected = selectedCategories.length === FILTER_CATEGORY_OPTIONS.length;
  const isCustomPeriodValid =
    periodFilter !== 'custom' || customStartDate <= customEndDate;

  // 마지막 적용값을 초안으로 복원하므로, 적용하지 않고 닫아도 기존 목록은 바뀌지 않습니다.
  const handleOpenFilter = () => {
    setSortOrder(appliedFilter.sortOrder);
    setSelectedTypes(appliedFilter.selectedTypes);
    setPeriodFilter(appliedFilter.periodFilter);
    setCustomStartDate(appliedFilter.customStartDate);
    setCustomEndDate(appliedFilter.customEndDate);
    setSelectedCategories(appliedFilter.selectedCategories);
    setIsFilterVisible(true);
  };

  const handleResetFilter = () => {
    setSortOrder('latest');
    setSelectedTypes(['expense', 'income']);
    setPeriodFilter('thisMonth');
    setCustomStartDate(new Date(2026, 6, 1));
    setCustomEndDate(new Date(2026, 6, 31));
    setSelectedCategories([...FILTER_CATEGORY_OPTIONS]);
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
      selectedCategories: selectedCategories.length > 0 ? selectedCategories : [...FILTER_CATEGORY_OPTIONS],
    });
    setIsFilterVisible(false);
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
            <IconButton color={Colors.light.text} name="close" onPress={() => { setIsSearching(false); setSearchQuery(''); }} />
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
              ) : searchResults.length === 0 ? (
                <EmptyState message="검색 결과가 없습니다." />
              ) : (
                <View style={styles.card}>
                  {searchResults.map((record, index) => (
                    <View key={record.transactionId}>
                      {index > 0 ? <View style={styles.divider} /> : null}
                      <TransactionItem
                        amount={record.amount}
                        description={record.categoryName}
                        leading={<CategoryIcon categoryId={record.categoryId} categoryName={record.categoryName} size={20} />}
                        onPress={() => handleOpenDetail(record.transactionId)}
                        title={record.name}
                        type={record.type}
                      />
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <>
              <TransactionTabBar onChange={setTab} value={tab} />
              {tab === 'list' ? <TransactionListTab onOpenDetail={handleOpenDetail} records={filteredTransactions} sortOrder={sortOrder} /> : null}
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

      <BottomSheet initialHeight={0.82} maxHeight={0.92} minHeight={0.62} onClose={() => setIsFilterVisible(false)} visible={isFilterVisible}>
        <ScrollView contentContainerStyle={styles.filterContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={styles.filterScroll}>
          <View style={styles.filterHeader}>
            <Text style={styles.filterTitle}>내역 필터</Text>
            <IconButton color={Colors.light.text} name="close" onPress={() => setIsFilterVisible(false)} />
          </View>

          <FilterSection label="정렬">
            <View style={styles.filterGrid}>
              <Chip align="center" indicator="radio" label="최신순" onPress={() => setSortOrder('latest')} selected={sortOrder === 'latest'} style={styles.twoColumnChip} />
              <Chip align="center" indicator="radio" label="과거순" onPress={() => setSortOrder('oldest')} selected={sortOrder === 'oldest'} style={styles.twoColumnChip} />
            </View>
          </FilterSection>

          <FilterSection label="소비/소득">
            <View style={styles.filterGrid}>
              <Chip align="center" indicator="radio" label="소비" onPress={() => toggleTransactionType('expense')} selected={selectedTypes.includes('expense')} style={styles.twoColumnChip} />
              <Chip align="center" indicator="radio" label="소득" onPress={() => toggleTransactionType('income')} selected={selectedTypes.includes('income')} style={styles.twoColumnChip} />
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
                <DateInput onChange={setCustomStartDate} style={styles.dateRangeInput} value={customStartDate} />
                <Text style={styles.dateRangeSeparator}>~</Text>
                <DateInput onChange={setCustomEndDate} style={styles.dateRangeInput} value={customEndDate} />
              </View>
            ) : null}
          </FilterSection>

          <FilterSection label="카테고리" actionLabel={hasAllCategoriesSelected ? '전체 해제' : '전체 선택'} onAction={() => setSelectedCategories(hasAllCategoriesSelected ? [] : [...FILTER_CATEGORY_OPTIONS])}>
            <View style={styles.filterGrid}>
              {FILTER_CATEGORY_OPTIONS.map((category) => (
                <Chip indicator="check" key={category} label={category} onPress={() => toggleCategory(category)} selected={selectedCategories.includes(category)} style={styles.twoColumnChip} />
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
        <ScrollView contentContainerStyle={styles.addContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.addTitle}>내역 추가</Text>
          <SegmentedControl<AddTransactionType> onChange={setAddType} options={ADD_TRANSACTION_TYPE_OPTIONS} value={addType} />
          <TextInput label="항목명" labelInside onChangeText={setAddName} placeholder={addType === 'expense' ? '예) 스타벅스, 식료품' : '예) 월급, 용돈'} value={addName} />
          <CurrencyInput label="금액" onChangeValue={setAddAmount} value={addAmount} />

          {addType === 'expense' ? (
            <>
              <MapInput label="위치" onPress={handleOpenMapPicker} value={addAddress || undefined} />
              <View style={styles.addTwoColumnRow}>
                <SelectInput containerStyle={styles.addHalfField} label="카테고리" labelInside onChange={setAddCategory} options={ADD_CATEGORY_OPTIONS} placeholder="선택" value={addCategory} />
                <DateInput label="날짜" onChange={setAddDate} style={styles.addHalfField} value={addDate} />
              </View>
            </>
          ) : <DateInput label="날짜" onChange={setAddDate} value={addDate} />}

          <Button disabled={!isAddFormValid} onPress={handleCreateTransaction} style={styles.addButton}>추가하기</Button>
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
  twoColumnChip: { width: '48.5%', minHeight: 40, borderRadius: 14, paddingHorizontal: 12 },
  threeColumnChip: { flex: 1, minWidth: 0, minHeight: 40, borderRadius: 14, paddingHorizontal: 8 },
  resetText: { color: Colors.light.primary, fontSize: 13, fontWeight: '700' },
  addContent: { gap: 14, paddingHorizontal: 20, paddingBottom: 36 },
  addTitle: { marginBottom: 2, color: Colors.light.cardTitle, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  addTwoColumnRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  addHalfField: { flex: 1 },
  addButton: { marginTop: 4, height: 52, borderRadius: 14 },
});
