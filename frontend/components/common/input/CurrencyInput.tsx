import { useEffect, useState } from 'react';
import {
  NativeSyntheticEvent,
  StyleProp,
  StyleSheet,
  Text,
  TextInput as NativeTextInput,
  TextInputFocusEventData,
  View,
  ViewStyle,
} from 'react-native';

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
  containerStyle?: StyleProp<ViewStyle>;
};

const getRawValue = (value: number | null) => (value === null ? '' : String(value));

const formatCurrency = (rawValue: string) => {
  if (!rawValue) return '';
  return Number(rawValue).toLocaleString('ko-KR');
};

/** 금액을 억·만 단위로 짧게 설명해 입력값을 빠르게 확인할 수 있게 합니다. */
const getAmountDescription = (value: number | null) => {
  if (value === null || value === 0) return '';

  const eok = Math.floor(value / 100_000_000);
  const man = Math.floor((value % 100_000_000) / 10_000);
  const won = value % 10_000;
  const parts: string[] = [];

  if (eok) parts.push(`${eok.toLocaleString('ko-KR')}억`);
  if (man) parts.push(`${man.toLocaleString('ko-KR')}만`);
  if (won) parts.push(`${won.toLocaleString('ko-KR')}원`);

  return parts.join(' ');
};

/** 숫자만 입력받고, 입력이 끝난 뒤 천 단위 구분 기호를 표시하는 금액 입력창입니다. */
export function CurrencyInput({
  value,
  onChangeValue,
  label,
  unit = '원',
  errorMessage,
  editable = true,
  containerStyle,
}: CurrencyInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [rawValue, setRawValue] = useState(() => getRawValue(value));
  const hasError = Boolean(errorMessage);
  const amountDescription = getAmountDescription(value);
  // 입력 중에는 쉼표를 넣지 않아 포맷 변경으로 커서가 이동하는 문제를 방지합니다.
  const displayValue = isFocused ? rawValue : formatCurrency(rawValue);
  const accessibilityValue = value === null ? '금액 미입력' : `${value.toLocaleString('ko-KR')}원${amountDescription ? `, ${amountDescription}` : ''}`;

  // 외부에서 값이 변경된 경우에도 사용자가 입력 중인 문자열은 덮어쓰지 않습니다.
  useEffect(() => {
    if (!isFocused) setRawValue(getRawValue(value));
  }, [isFocused, value]);

  const handleChangeText = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '');
    setRawValue(digits);
    onChangeValue(digits ? Number(digits) : null);
  };

  const handleFocus = () => {
    // 포커스 시 외부 숫자값을 원시 문자열로 바꿔 사용자가 자연스럽게 수정할 수 있게 합니다.
    setRawValue(getRawValue(value));
    setIsFocused(true);
  };

  const handleBlur = (_event: NativeSyntheticEvent<TextInputFocusEventData>) => {
    // 포커스가 해제되면 displayValue가 천 단위 구분 형식으로 다시 표시됩니다.
    setIsFocused(false);
  };

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
            placeholder="0"
            placeholderTextColor={Colors.light.placeholder}
            style={styles.input}
            value={displayValue}
          />
          <Text style={styles.unit}>{unit}</Text>
        </View>
      </View>

      {amountDescription ? (
        <Text accessibilityElementsHidden style={styles.description}>
          {value?.toLocaleString('ko-KR')}원 ({amountDescription})
        </Text>
      ) : null}
      {errorMessage ? <Text style={[styles.errorMessage, styles.errorText]}>{errorMessage}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: Colors.light.placeholder, fontSize: 13, fontWeight: '600' },
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
