import { StyleSheet } from 'react-native';

import { TextInput, type TextInputProps } from '@/components/common/input/TextInput';

type TimeInputProps = Omit<
  TextInputProps,
  'value' | 'onChangeText' | 'keyboardType' | 'inputMode' | 'maxLength'
> & {
  /** "18:30" 형태의 문자열입니다. 아직 다 안 입력했으면 "1", "18", "18:3"처럼 중간 상태도 옵니다. */
  value: string;
  onChangeText: (value: string) => void;
};

// 숫자만 남기고, 3번째 자리부터는 자동으로 ':'를 넣어서 HH:mm 형태로 만든다.
// 시/분 두 자리가 다 채워진 시점에만 범위를 검사해서 99:99 같은 값을 못 만들게 막는다
// (한 자리만 입력된 중간 상태는 아직 뭐가 될지 몰라서 그대로 둔다. 예: "9"는 09~19 어느 쪽도 될 수 있음).
function formatTimeText(text: string) {
  const digits = text.replace(/\D/g, '').slice(0, 4);

  let hour = digits.slice(0, 2);
  if (hour.length === 2 && Number(hour) > 23) {
    hour = '23';
  }

  let minute = digits.slice(2, 4);
  if (minute.length === 2 && Number(minute) > 59) {
    minute = '59';
  }

  return minute.length > 0 ? `${hour}:${minute}` : hour;
}

/**
 * "18:30" 같은 HH:mm 시간을 입력받는 필드입니다. 이 프로젝트엔 아직 시간 피커 라이브러리가
 * 없어서(날짜는 DateInput+react-native-calendars가 있음), RecommendedAlarmModal.tsx 안에서
 * 쓰던 "숫자만 입력받고 3번째 자리부터 콜론 자동 삽입" 방식을 공용 컴포넌트로 뽑았습니다.
 * 스타일은 새로 만들지 않고 기존 TextInput을 그대로 감싸서 씁니다.
 *
 * HH:mm은 글자 수가 항상 일정해서, 다른 TextInput처럼 폭을 꽉 채우지 않고 내용 크기에 맞춘
 * 좁은 칸으로 고정합니다(가운데 정렬이라 좌우 여백이 같아 보입니다).
 */
export function TimeInput({
  value,
  onChangeText,
  placeholder = '18:30',
  containerStyle,
  inputStyle,
  ...props
}: TimeInputProps) {
  return (
    <TextInput
      {...props}
      containerStyle={[styles.container, containerStyle]}
      inputMode="numeric"
      inputStyle={[styles.input, inputStyle]}
      keyboardType="number-pad"
      maxLength={5}
      onChangeText={(text) => onChangeText(formatTimeText(text))}
      placeholder={placeholder}
      value={value}
    />
  );
}

const styles = StyleSheet.create({
  // 기본 TextInput의 container는 width:'100%'라 가로로 꽉 차는데, 여기선 부모 폭과 무관하게
  // 내용 크기만큼만 차지하도록 flex-start로 덮어쓴다.
  container: {
    alignSelf: 'flex-start',
  },
  input: {
    width: 100,
    textAlign: 'center',
  },
});
