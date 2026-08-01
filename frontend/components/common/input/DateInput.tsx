import { useState } from 'react';
import { Modal, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Calendar, DateData, LocaleConfig } from 'react-native-calendars';

import { TextButton } from '@/components/common/button/TextButton';
import Colors from '@/constants/Colors';

// 요일/월 이름을 한국어로 표시하기 위한 설정. 앱 전체에서 한 번만 등록하면 된다.
LocaleConfig.locales.kr = {
  monthNames: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  monthNamesShort: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  dayNames: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
  dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
};
LocaleConfig.defaultLocale = 'kr';

type DateInputProps = {
  label?: string;
  value?: Date;
  onChange: (date: Date) => void;
  style?: StyleProp<ViewStyle>;
};

function toDateString(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplay(date: Date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

// 날짜 하나를 고르는 입력창. 누르면 자체적으로 달력 팝업을 띄우고, 고르면 팝업을 닫는다.
export function DateInput({ label, value, onChange, style }: DateInputProps) {
  const [visible, setVisible] = useState(false);

  const handleSelectDay = (day: DateData) => {
    onChange(new Date(day.year, day.month - 1, day.day));
    setVisible(false);
  };

  const handleToday = () => {
    onChange(new Date());
    setVisible(false);
  };

  return (
    <>
      <Pressable style={[styles.field, style]} onPress={() => setVisible(true)}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        {value ? <Text style={styles.value}>{formatDisplay(value)}</Text> : null}
      </Pressable>

      {visible && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setVisible(false)}>
          <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
            <Pressable style={styles.popup} onPress={(event) => event.stopPropagation()}>
              <Calendar
                current={value ? toDateString(value) : undefined}
                monthFormat="yyyy년 MMMM"
                onDayPress={handleSelectDay}
                markedDates={
                  value
                    ? { [toDateString(value)]: { selected: true, selectedColor: Colors.light.primary } }
                    : undefined
                }
                theme={{
                  todayTextColor: Colors.light.primary,
                  selectedDayBackgroundColor: Colors.light.primary,
                  selectedDayTextColor: '#fff',
                  arrowColor: Colors.light.text,
                  textMonthFontWeight: '700',
                  textMonthFontSize: 18,
                  textDayFontSize: 15,
                  textDayHeaderFontSize: 13,
                  textSectionTitleColor: Colors.light.textSecondary,
                }}
              />

              <View style={styles.footer}>
                <TextButton onPress={() => setVisible(false)}>취소</TextButton>
                <TextButton onPress={handleToday}>오늘</TextButton>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 6,
    backgroundColor: Colors.light.inputBackground,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 90,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
  },
  value: {
    fontSize: 15,
    color: Colors.light.text,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  popup: {
    width: '85%',
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 20,
    padding: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 4,
  },
});
