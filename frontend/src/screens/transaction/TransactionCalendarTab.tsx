import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CalendarDayCell } from '@/components/transaction/CalendarDayCell';
import { CategoryIcon } from '@/components/transaction/CategoryIcon';
import { EmptyState } from '@/components/transaction/EmptyState';
import { MonthPicker } from '@/components/transaction/MonthPicker';
import TransactionItem from '@/components/transaction/TransactionItem';
import Colors from '@/constants/Colors';
import { getMockDayDetail, getMockMonthDateList } from '@/mocks/transactions';

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

/** 월별 날짜 요약과 선택 날짜의 거래 내역을 표시하는 캘린더 탭입니다. */
export function TransactionCalendarTab({
  month,
  selectedDateKey,
  onNextMonth,
  onPreviousMonth,
  onSelectDate,
  onOpenDetail,
}: TransactionCalendarTabProps) {
  const monthWeeks = useMemo(() => getMonthWeeks(month), [month]);
  const monthTotalsByDay = useMemo(() => {
    const totalsByDay = new Map<number, { expense: number; income: number }>();
    for (const summary of getMockMonthDateList(month.getFullYear(), month.getMonth() + 1)) {
      totalsByDay.set(summary.date, { expense: summary.expense, income: summary.income });
    }
    return totalsByDay;
  }, [month]);
  const selectedDayDetail = useMemo(() => {
    const [year, monthNumber, day] = selectedDateKey.split('-').map(Number);
    return getMockDayDetail(year, monthNumber, day);
  }, [selectedDateKey]);

  return (
    <View style={styles.container}>
      <MonthPicker month={month} onNext={onNextMonth} onPrev={onPreviousMonth} />

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

      <Text style={styles.selectedDateTitle}>{formatDateLabel(selectedDateKey)}</Text>
      {selectedDayDetail.transactionList.length === 0 ? (
        <EmptyState message="선택한 날짜에 거래 내역이 없습니다." />
      ) : (
        <View style={styles.card}>
          {selectedDayDetail.transactionList.map((item, index) => (
            <View key={item.transactionId}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <TransactionItem
                amount={item.amount}
                leading={<CategoryIcon categoryName={item.categoryName} size={20} />}
                onPress={() => onOpenDetail(String(item.transactionId))}
                title={item.name}
                type={item.type}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14, padding: 16 },
  weekdayRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekdayLabel: { width: 44, color: Colors.light.placeholder, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  calendarGrid: { gap: 4 },
  calendarWeekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  selectedDateTitle: { color: Colors.light.text, fontSize: 15, fontWeight: '700' },
  card: { padding: 8, borderRadius: 16, backgroundColor: Colors.light.cardBackground, borderWidth: 1, borderColor: Colors.light.border },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.light.border },
});
