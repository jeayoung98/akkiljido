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
  // 날짜를 골랐을 때 호출된다. "해제" 버튼으로 지우면 undefined가 넘어온다.
  onChange: (date: Date | undefined) => void;
  // 선택 가능한 날짜 범위. 범위 밖 날짜는 달력에서 회색 처리되고 눌러도 반응하지 않는다.
  // (예: 기간 필터에서 종료일은 시작일보다 이전을 못 고르게 minDate로 막는다)
  minDate?: Date;
  maxDate?: Date;
  style?: StyleProp<ViewStyle>;
};

function toDateString(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 날짜 하나를 고르는 입력창. 누르면 자체적으로 달력 팝업을 띄우고, 고르면 팝업을 닫는다.
export function DateInput({ label, value, onChange, minDate, maxDate, style }: DateInputProps) {
  const [visible, setVisible] = useState(false);

  const handleSelectDay = (day: DateData) => {
    onChange(new Date(day.year, day.month - 1, day.day));
    setVisible(false);
  };

  const handleToday = () => {
    onChange(new Date());
    setVisible(false);
  };

  // 고른 날짜를 지운다. 팝업을 닫기만 하려면 배경을 탭하면 된다.
  const handleClear = () => {
    onChange(undefined);
    setVisible(false);
  };

  // 오늘이 선택 가능 범위 밖이면 "오늘" 버튼도 비활성화한다.
  // yyyy-mm-dd 문자열은 사전순 비교가 곧 날짜 비교라서 그대로 부등호로 비교한다.
  const todayString = toDateString(new Date());
  const isTodayDisabled =
    (minDate != null && todayString < toDateString(minDate)) ||
    (maxDate != null && todayString > toDateString(maxDate));

  return (
    <>
      <Pressable style={[styles.field, style]} onPress={() => setVisible(true)}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        {value ? <Text style={styles.value}>{`${value.getFullYear()}년 ${value.getMonth() + 1}월 ${value.getDate()}일`}</Text> : null}
      </Pressable>

      {visible && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setVisible(false)}>
          <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
            <Pressable style={styles.popup} onPress={(event) => event.stopPropagation()}>
              <Calendar
                current={value ? toDateString(value) : undefined}
                monthFormat="yyyy년 MMMM"
                minDate={minDate ? toDateString(minDate) : undefined}
                maxDate={maxDate ? toDateString(maxDate) : undefined}
                // 범위 밖(회색) 날짜는 눌러도 onDayPress가 아예 호출되지 않게 한다.
                disableAllTouchEventsForDisabledDays
                onDayPress={handleSelectDay}
                markedDates={
                  value
                    ? { [toDateString(value)]: { selected: true, selectedColor: Colors.light.primary } }
                    : undefined
                }
                theme={{
                  // minDate/maxDate 범위 밖 날짜의 색. 기본값이 연해서 눈에 띄게 회색으로 지정한다.
                  textDisabledColor: Colors.light.disabled,
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
                <TextButton disabled={!value} onPress={handleClear}>해제</TextButton>
                <TextButton disabled={isTodayDisabled} onPress={handleToday}>오늘</TextButton>
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
    // SelectInput의 내부 라벨과 맞춰 2열 배치 시 기준선이 어긋나지 않게 합니다.
    fontSize: 13,
    fontWeight: '700',
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
