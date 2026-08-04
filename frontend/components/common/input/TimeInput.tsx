import { StyleSheet } from 'react-native';

import { TextInput, type TextInputProps } from '@/components/common/input/TextInput';

type TimeInputProps = Omit<
  TextInputProps,
  'value' | 'onChangeText' | 'keyboardType' | 'inputMode' | 'maxLength'
> & {
  /** "18:30" 형식이며 입력 중에는 "1", "18:3" 같은 중간 값도 허용합니다. */
  value: string;
  onChangeText: (value: string) => void;
};

// 숫자만 남기고 세 번째 숫자부터 ':'를 자동으로 넣어 HH:mm 형태를 유지합니다.
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

/** 추천 알림 등에서 HH:mm 시간을 간단히 입력받는 공통 입력 필드입니다. */
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
  container: {
    alignSelf: 'flex-start',
  },
  input: {
    width: 100,
    textAlign: 'center',
  },
});
