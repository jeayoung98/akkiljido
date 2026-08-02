import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import AppScreen from '@/components/common/AppScreen';
import { AppHeader } from '@/components/common/header/AppHeader';
import { IconButton } from '@/components/common/button/IconButton';
import { SearchInput } from '@/components/common/input/SearchInput';
import { AnalysisCard } from '@/components/transaction/common/AnalysisCard';
import { AnalysisLegend } from '@/components/transaction/common/AnalysisLegend';
import { CalendarDayCell } from '@/components/transaction/common/CalendarDayCell';
import { CategoryIcon } from '@/components/transaction/common/CategoryIcon';
import { EmptyState } from '@/components/transaction/common/EmptyState';
import { FloatingActionButton } from '@/components/transaction/common/FloatingActionButton';
import { MonthPicker } from '@/components/transaction/common/MonthPicker';
import { PieChart } from '@/components/transaction/common/PieChart';
import { TransactionTabBar, type TransactionTab } from '@/components/transaction/common/TransactionTabBar';
import TransactionGroup, { type TransactionGroupItem } from '@/components/transaction/TransactionGroup';
import TransactionItem from '@/components/transaction/TransactionItem';
import Colors from '@/constants/Colors';
import { MOCK_TRANSACTIONS, type TransactionRecord } from '@/mocks/transactions';

const toDateKey = (datetime: string) => datetime.slice(0, 10);

// new Date(...).toISOString()은 UTC 기준이라 KST에서는 자정 근처 날짜가 하루 밀린다.
// 달력 셀은 로컬 연/월/일을 직접 조합해서 dateKey를 만든다.
const toLocalDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

// 목업 데이터를 date별로 묶어서, 실제 "거래내역 목록 조회" API의 dateList 응답 모양과 똑같이 만듭니다.
// (백엔드 연결 전까지는 여기서 흉내 내고, 나중엔 이 부분만 fetch 결과로 바꾸면 됩니다.)
function groupByDate(records: TransactionRecord[]) {
  const groups = new Map<string, TransactionRecord[]>();
  for (const record of records) {
    const key = toDateKey(record.datetime);
    const list = groups.get(key) ?? [];
    list.push(record);
    groups.set(key, list);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => (a < b ? 1 : -1)) // 최신순(latest) 기본값
    .map(([date, records]) => ({
      date,
      records,
      totalAmount: records.reduce(
        (sum, record) => sum + (record.type === 'income' ? record.amount : -record.amount),
        0,
      ),
    }));
}

function toGroupItems(records: TransactionRecord[]): TransactionGroupItem[] {
  return records.map((record) => ({
    id: String(record.transactionId),
    title: record.name,
    description: record.categoryName,
    leading: <CategoryIcon categoryName={record.categoryName} size={20} />,
    amount: record.amount,
    type: record.type,
  }));
}

const formatDateLabel = (dateKey: string) => dateKey.replaceAll('-', '.');

function getDailyTotals(records: TransactionRecord[], dateKey: string) {
  const dayRecords = records.filter((record) => toDateKey(record.datetime) === dateKey);
  const income = dayRecords
    .filter((record) => record.type === 'income')
    .reduce((sum, record) => sum + record.amount, 0);
  const expense = dayRecords
    .filter((record) => record.type === 'expense')
    .reduce((sum, record) => sum + record.amount, 0);
  return { income, expense, records: dayRecords };
}

// 달력 한 화면(7의 배수)을 채우기 위해 이전/다음 달 날짜까지 포함한 날짜 배열을 만듭니다.
function getMonthCells(month: Date) {
  const year = month.getFullYear();
  const m = month.getMonth();
  const firstWeekday = new Date(year, m, 1).getDay();
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, m, 0).getDate();

  const cells: { day: number; dateKey: string; inCurrentMonth: boolean }[] = [];

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

  return cells;
}

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

/** 내역 화면: 리스트/캘린더/분석 탭과 검색을 담당합니다. 필터는 바텀시트가 나오면 이어서 붙일 예정입니다. */
export default function ListScreen() {
  const [tab, setTab] = useState<TransactionTab>('list');
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [month, setMonth] = useState(() => new Date(2026, 6, 1));
  const [selectedDateKey, setSelectedDateKey] = useState('2026-07-17');

  const dateGroups = useMemo(() => groupByDate(MOCK_TRANSACTIONS), []);

  // 실제 검색 API는 날짜별로 묶지 않고 flat한 목록을 준다. 목업도 그 모양을 그대로 흉내 낸다.
  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    return MOCK_TRANSACTIONS.filter((record) => record.name.toLowerCase().includes(query));
  }, [searchQuery]);

  const monthCells = useMemo(() => getMonthCells(month), [month]);
  const selectedDayTotals = useMemo(
    () => getDailyTotals(MOCK_TRANSACTIONS, selectedDateKey),
    [selectedDateKey],
  );

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

  const handleOpenDetail = (transactionId: string) => {
    router.push({ pathname: '/transaction/[id]', params: { id: transactionId } });
  };

  const handleAddPress = () => {
    // TODO: 거래 추가 바텀시트는 팀원 작업 완료되면 연결.
    Alert.alert('거래 추가', '추가 화면은 곧 연결될 예정이에요.');
  };

  const handleFilterPress = () => {
    // TODO: 필터 바텀시트 완성되면 연결. 완성되면 검색이랑 같이 적용할 예정.
    Alert.alert('필터', '필터는 곧 연결될 예정이에요.');
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
          <AppHeader
            rightActions={[
              { icon: 'search', key: 'search', onPress: () => setIsSearching(true) },
              { icon: 'filter', key: 'filter', onPress: handleFilterPress },
            ]}
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
                      <TransactionRow
                        onPress={() => handleOpenDetail(String(record.transactionId))}
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
                        transactions={toGroupItems(group.records)}
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
                    {monthCells.map((cell) => {
                      const totals = getDailyTotals(MOCK_TRANSACTIONS, cell.dateKey);
                      return (
                        <CalendarDayCell
                          day={cell.day}
                          disabled={!cell.inCurrentMonth}
                          expenseAmount={totals.expense || undefined}
                          incomeAmount={totals.income || undefined}
                          key={cell.dateKey}
                          onPress={cell.inCurrentMonth ? () => setSelectedDateKey(cell.dateKey) : undefined}
                          selected={cell.dateKey === selectedDateKey}
                        />
                      );
                    })}
                  </View>

                  <Text style={styles.selectedDateTitle}>{formatDateLabel(selectedDateKey)}</Text>
                  {selectedDayTotals.records.length === 0 ? (
                    <EmptyState message="이 날짜엔 거래 내역이 없습니다." />
                  ) : (
                    <View style={styles.card}>
                      {selectedDayTotals.records.map((record, index) => (
                        <View key={record.transactionId}>
                          {index > 0 ? <View style={styles.divider} /> : null}
                          <TransactionRow
                            onPress={() => handleOpenDetail(String(record.transactionId))}
                            record={record}
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
                </View>
              ) : null}
            </>
          )}
        </View>
      </AppScreen>

      {!isSearching && tab === 'list' ? <FloatingActionButton onPress={handleAddPress} /> : null}
    </>
  );
}

// 카테고리 아이콘 + 제목/설명 + 금액을 한 줄로 그리는 행. TransactionGroup 밖(검색 결과, 날짜 선택 목록)에서 재사용합니다.
function TransactionRow({ record, onPress }: { record: TransactionRecord; onPress: () => void }) {
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
    paddingHorizontal: 4,
  },
  weekdayLabel: {
    width: 44,
    textAlign: 'center',
    color: Colors.light.placeholder,
    fontSize: 12,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  monthPickerSpacing: {
    marginBottom: 0,
  },
});
