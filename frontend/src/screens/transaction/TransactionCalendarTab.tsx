import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/common/typography/Text';

import { AsyncStateView } from '@/components/common/AsyncStateView';
import { CalendarDayCell } from '@/components/transaction/CalendarDayCell';
import { CategoryIcon } from '@/components/transaction/CategoryIcon';
import { MonthPicker } from '@/components/transaction/MonthPicker';
import TransactionItem from '@/components/transaction/TransactionItem';
import Colors from '@/constants/Colors';
import { useCalendarDay, useCalendarMonth } from '@/hooks/useCalendar';
import { fromDateKey, toCalendarParams } from '@/src/api/calendarApi';
import { groupTransactions } from '@/src/utils/groupTransactions';

type MonthCell = { day: number; dateKey: string; inCurrentMonth: boolean };

type TransactionCalendarTabProps = {
  month: Date;
  selectedDateKey: string;
  onNextMonth: () => void;
  onPreviousMonth: () => void;
  onSelectDate: (dateKey: string) => void;
  onOpenDetail: (transactionId: string) => void;
};

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const formatDateLabel = (dateKey: string) => dateKey.replaceAll('-', '.');

function getMonthWeeks(month: Date): MonthCell[][] {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const daysInPreviousMonth = new Date(year, monthIndex, 0).getDate();
  const cells: MonthCell[] = [];

  for (let index = firstWeekday - 1; index >= 0; index -= 1) {
    const date = new Date(year, monthIndex - 1, daysInPreviousMonth - index);
    cells.push({ day: date.getDate(), dateKey: toDateKey(date), inCurrentMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, monthIndex, day);
    cells.push({ day, dateKey: toDateKey(date), inCurrentMonth: true });
  }

  let trailingDay = 1;
  while (cells.length % 7 !== 0) {
    const date = new Date(year, monthIndex + 1, trailingDay);
    cells.push({ day: date.getDate(), dateKey: toDateKey(date), inCurrentMonth: false });
    trailingDay += 1;
  }

  return Array.from({ length: Math.ceil(cells.length / 7) }, (_, index) => cells.slice(index * 7, index * 7 + 7));
}

/**
 * 월별 날짜 요약과 선택 날짜의 거래 내역을 표시하는 캘린더 탭입니다.
 *
 * 서로 다른 API 두 개를 씁니다.
 * - GET /api/v1/calendar/month: 달력 칸에 찍히는 날짜별 소비·소득 합계
 * - GET /api/v1/calendar/day: 아래쪽 "선택한 날짜의 거래 목록"
 * 그래서 날짜만 눌렀을 때는 달력 전체를 다시 조회하지 않고 하루치만 다시 조회합니다.
 */
export function TransactionCalendarTab({
  month,
  selectedDateKey,
  onNextMonth,
  onPreviousMonth,
  onSelectDate,
  onOpenDetail,
}: TransactionCalendarTabProps) {
  const monthWeeks = useMemo(() => getMonthWeeks(month), [month]);

  const monthParams = toCalendarParams(month);
  const {
    daySummaries,
    isLoading: isMonthLoading,
    error: monthError,
    refetch: refetchMonth,
  } = useCalendarMonth(monthParams.year, monthParams.month);

  const selectedDate = fromDateKey(selectedDateKey);
  const {
    dayDetail,
    isLoading: isDayLoading,
    error: dayError,
    refetch: refetchDay,
  } = useCalendarDay(selectedDate.year, selectedDate.month, selectedDate.day);

  // 월 응답은 거래가 있는 날만 내려주므로, 칸을 그릴 때 바로 찾을 수 있게 일(day) 기준 Map으로 만듭니다.
  const monthTotalsByDay = useMemo(() => {
    const totalsByDay = new Map<number, { expense: number; income: number }>();
    for (const summary of daySummaries) {
      totalsByDay.set(summary.date, { expense: summary.expense, income: summary.income });
    }
    return totalsByDay;
  }, [daySummaries]);

  const dayTransactions = dayDetail?.transactionList ?? [];
  const groupedDayTransactions = useMemo(() => groupTransactions(dayTransactions), [dayTransactions]);

  return (
    <View style={styles.container}>
      <MonthPicker month={month} onNext={onNextMonth} onPrev={onPreviousMonth} />

      {/*
        isEmpty를 false로 고정해 로딩 중에도 달력 자체는 그립니다.
        (금액만 나중에 채워지는 편이, 달력이 사라졌다 다시 나타나는 것보다 덜 깜빡입니다.)
        거래가 하나도 없는 달에 "내역 없음"이 떠서 달력이 가려지는 것도 이 때문에 방지됩니다.
      */}
      <AsyncStateView error={monthError} isEmpty={false} isLoading={isMonthLoading} onRetry={refetchMonth}>
        <View style={styles.calendarSection}>
          <View style={styles.weekdayRow}>
            {WEEKDAY_LABELS.map((label) => (
              <Text key={label} style={styles.weekdayLabel}>{label}</Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
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
                      onPress={cell.inCurrentMonth ? () => onSelectDate(cell.dateKey) : undefined}
                      selected={cell.dateKey === selectedDateKey}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </AsyncStateView>

      <Text style={styles.selectedDateTitle}>{formatDateLabel(selectedDateKey)}</Text>
      <AsyncStateView
        emptyMessage="선택한 날짜에 거래 내역이 없습니다."
        error={dayError}
        isEmpty={groupedDayTransactions.length === 0}
        isLoading={isDayLoading}
        onRetry={refetchDay}>
        <View style={styles.card}>
          {groupedDayTransactions.map((item, index) => (
            <View key={item.transactionId}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <TransactionItem
                amount={item.amount}
                /*
                 * 일 단위 조회 응답에는 카테고리가 없습니다(백엔드에 추가 요청해둔 상태).
                 * 소득은 카테고리와 무관하게 돈주머니 아이콘을 쓰므로 지금도 그릴 수 있고,
                 * 소비는 categoryName이 실제로 내려올 때만 그려서 빈 아이콘 자리가 생기지 않게 합니다.
                 */
                leading={
                  item.type === 'income' || item.categoryName ? (
                    <CategoryIcon
                      categoryId={item.categoryId}
                      categoryName={item.categoryName}
                      size={20}
                      type={item.type}
                    />
                  ) : undefined
                }
                onPress={() => onOpenDetail(String(item.transactionId))}
                description={
                  item.transactionCount > 1
                    ? `${item.categoryName} · ${item.transactionCount}건`
                    : item.categoryName
                }
                title={item.name}
                type={item.type}
              />
            </View>
          ))}
        </View>
      </AsyncStateView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14, padding: 16 },
  calendarSection: { gap: 14 },
  weekdayRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekdayLabel: { width: 44, color: Colors.light.placeholder, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  calendarGrid: { gap: 4 },
  calendarWeekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  selectedDateTitle: { color: Colors.light.text, fontSize: 15, fontWeight: '700' },
  card: { padding: 8, borderRadius: 16, backgroundColor: Colors.light.cardBackground, borderWidth: 1, borderColor: Colors.light.border },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.light.border },
});
