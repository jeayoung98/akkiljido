import { useEffect, useState } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Text } from '@/components/common/typography/Text';
import { NativeTextInput } from '@/components/common/typography/TextInput';

import Colors from '@/constants/Colors';

export type CurrencyInputProps = {
  /** 입력된 금액이 비어 있으면 null을 사용합니다. */
  value: number | null;
  /** 쉼표를 제거한 숫자값만 상위 화면에 전달합니다. */
  onChangeValue: (value: number | null) => void;
  label?: string;
  unit?: string;
  errorMessage?: string;
  editable?: boolean;
  /** 입력창에 포커스가 갔을 때 알려줍니다(키보드에 가리지 않도록 화면을 스크롤할 때 사용). */
  onFocus?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
};

const getRawValue = (value: number | null) => (value === null ? '' : String(value));

const formatCurrency = (rawValue: string) => {
  if (!rawValue) return '';
  return Number(rawValue).toLocaleString('ko-KR');
};

const countDigits = (text: string) => text.replace(/[^0-9]/g, '').length;

/** 쉼표가 포함된 문자열에서 지정한 숫자 순서에 해당하는 커서 위치를 찾습니다. */
const getFormattedCursor = (formattedValue: string, digitIndex: number) => {
  if (digitIndex <= 0) return 0;

  let digitCount = 0;
  for (let index = 0; index < formattedValue.length; index += 1) {
    if (/\d/.test(formattedValue[index])) digitCount += 1;
    if (digitCount === digitIndex) return index + 1;
  }

  return formattedValue.length;
};

/** 입력값을 억·만 단위로 변환해 큰 금액을 빠르게 확인할 수 있게 합니다. */
const getAmountDescription = (value: number | null) => {
  if (value === null || value === 0) return '';

  const eok = Math.floor(value / 100_000_000);
  const man = Math.floor((value % 100_000_000) / 10_000);
  const won = value % 10_000;
  const parts: string[] = [];

  if (eok) parts.push(`${eok.toLocaleString('ko-KR')}억`);
  if (man) parts.push(`${man.toLocaleString('ko-KR')}만`);
  if (won) parts.push(`${won.toLocaleString('ko-KR')}원`);

  const description = parts.join(' ');
  return won === 0 ? `${description}원` : description;
};

/**
 * 숫자만 입력받아 입력 중에도 천 단위 쉼표를 표시합니다.
 * 포맷 적용 후 커서 위치를 보정하고, 하단에는 억·만 단위의 보조 금액을 제공합니다.
 */
export function CurrencyInput({
  value,
  onChangeValue,
  label,
  unit = '원',
  errorMessage,
  editable = true,
  onFocus,
  containerStyle,
}: CurrencyInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [rawValue, setRawValue] = useState(() => getRawValue(value));
  const [selection, setSelection] = useState(() => {
    const cursor = formatCurrency(getRawValue(value)).length;
    return { start: cursor, end: cursor };
  });
  const hasError = Boolean(errorMessage);
  const amountDescription = getAmountDescription(value);
  // 입력 중에도 현재 금액을 바로 확인할 수 있도록 천 단위 구분 기호를 표시합니다.
  const displayValue = formatCurrency(rawValue);
  const accessibilityValue = value === null ? '금액 미입력' : `${value.toLocaleString('ko-KR')}원${amountDescription ? `, ${amountDescription}` : ''}`;

  // 외부에서 값이 변경된 경우에도 사용자가 입력 중인 문자열은 덮어쓰지 않습니다.
  useEffect(() => {
    if (!isFocused) {
      const nextRawValue = getRawValue(value);
      const cursor = formatCurrency(nextRawValue).length;
      setRawValue(nextRawValue);
      setSelection({ start: cursor, end: cursor });
    }
  }, [isFocused, value]);

  const handleChangeText = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '');
    // 변경 전 선택 영역을 숫자 순서로 계산해 쉼표가 추가된 뒤의 커서 위치로 변환합니다.
    const selectionStartDigit = countDigits(displayValue.slice(0, selection.start));
    const selectionEndDigit = countDigits(displayValue.slice(0, selection.end));
    const selectedDigitCount = selectionEndDigit - selectionStartDigit;
    const insertedDigitCount = digits.length - (rawValue.length - selectedDigitCount);
    const nextDigitCursor = Math.max(
      0,
      Math.min(digits.length, selectionStartDigit + insertedDigitCount),
    );
    const nextFormattedValue = formatCurrency(digits);
    const nextCursor = getFormattedCursor(nextFormattedValue, nextDigitCursor);

    setRawValue(digits);
    // 포맷 적용 후에도 사용자가 수정하던 숫자 위치에 커서를 유지합니다.
    setSelection({ start: nextCursor, end: nextCursor });
    onChangeValue(digits ? Number(digits) : null);
  };

  const handleFocus = () => {
    // 포커스 시 외부 숫자값을 원시 문자열로 바꿔 사용자가 자연스럽게 수정할 수 있게 합니다.
    setRawValue(getRawValue(value));
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => setIsFocused(false);

  return (
    <View style={containerStyle}>
      <View
        style={[
          styles.field,
          label && styles.fieldWithLabel,
          isFocused && styles.focused,
          hasError && styles.error,
          !editable && styles.disabled,
        ]}>
        {label ? <Text style={[styles.label, hasError && styles.errorText]}>{label}</Text> : null}

        <View style={styles.amountRow}>
          <NativeTextInput
            accessibilityLabel={label ?? '금액'}
            accessibilityValue={{ text: accessibilityValue }}
            editable={editable}
            inputMode="numeric"
            keyboardType="number-pad"
            onBlur={handleBlur}
            onChangeText={handleChangeText}
            onFocus={handleFocus}
            onSelectionChange={(event) => setSelection(event.nativeEvent.selection)}
            placeholder="0"
            placeholderTextColor={Colors.light.placeholder}
            selection={selection}
            style={styles.input}
            value={displayValue}
          />
          <Text style={styles.unit}>{unit}</Text>
        </View>
      </View>

      {amountDescription ? (
        // 화면에는 중복된 숫자 금액을 제외하고 읽기 쉬운 단위 설명만 표시합니다.
        <Text accessibilityElementsHidden style={styles.description}>
          {amountDescription}
        </Text>
      ) : null}
      {errorMessage ? <Text style={[styles.errorMessage, styles.errorText]}>{errorMessage}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // 거래 추가 폼의 다른 필드 라벨과 동일한 색상·굵기로 표시합니다.
  label: { color: Colors.light.text, fontSize: 13, fontWeight: '700' },
  field: {
    minHeight: 60,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 14,
    backgroundColor: Colors.light.inputBackground,
  },
  fieldWithLabel: { minHeight: 96, paddingVertical: 12 },
  amountRow: { marginTop: 6, flexDirection: 'row', alignItems: 'center' },
  input: {
    flex: 1,
    paddingVertical: 0,
    color: Colors.light.text,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'right',
  },
  unit: { marginLeft: 8, color: Colors.light.placeholder, fontSize: 16, fontWeight: '600' },
  focused: { borderColor: Colors.light.primary },
  error: { borderColor: Colors.light.danger },
  disabled: { backgroundColor: Colors.light.disabled, opacity: 0.7 },
  description: { minHeight: 20, marginTop: 4, color: Colors.light.textSecondary, fontSize: 12, textAlign: 'right' },
  errorMessage: { minHeight: 20, marginTop: 4, fontSize: 12 },
  errorText: { color: Colors.light.danger },
});
