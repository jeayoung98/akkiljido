import { useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput as NativeTextInput,
  View,
  ViewStyle,
} from 'react-native';

import Colors from '@/constants/Colors';

export type CurrencyInputProps = {
  /** 입력된 금액이며 값이 비어 있으면 null을 사용합니다. */
  value: number | null;
  /** 쉼표를 제거한 숫자값만 상위 화면에 전달합니다. */
  onChangeValue: (value: number | null) => void;
  label?: string;
  /** 기본 단위는 원이며 필요한 경우 다른 단위로 변경할 수 있습니다. */
  unit?: string;
  errorMessage?: string;
  editable?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

/**
 * 숫자만 입력받아 천 단위 쉼표와 단위를 표시하는 금액 입력창입니다.
 * 소비·소득 구분과 +/- 부호는 API 데이터를 사용하는 거래 기능에서 처리합니다.
 */
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
  const hasError = Boolean(errorMessage);
  const formattedValue = value === null ? '' : value.toLocaleString('ko-KR');

  // 화면에는 쉼표를 표시하지만 상위 화면에는 숫자값만 전달합니다.
  const handleChangeText = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '');
    onChangeValue(digits ? Number(digits) : null);
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
            editable={editable}
            inputMode="numeric"
            keyboardType="number-pad"
            onBlur={() => setIsFocused(false)}
            onChangeText={handleChangeText}
            onFocus={() => setIsFocused(true)}
            placeholder="0"
            placeholderTextColor={Colors.light.placeholder}
            style={styles.input}
            value={formattedValue}
          />

          <Text style={styles.unit}>{unit}</Text>
        </View>
      </View>

      {errorMessage ? <Text style={[styles.errorMessage, styles.errorText]}>{errorMessage}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: Colors.light.placeholder,
    fontSize: 13,
    fontWeight: '600',
  },
  field: {
    minHeight: 60,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 14,
    backgroundColor: Colors.light.inputBackground,
  },
  fieldWithLabel: {
    minHeight: 96,
    paddingVertical: 12,
  },
  amountRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    paddingVertical: 0,
    color: Colors.light.text,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'right',
  },
  unit: {
    marginLeft: 8,
    color: Colors.light.placeholder,
    fontSize: 16,
    fontWeight: '600',
  },
  focused: {
    borderColor: Colors.light.primary,
  },
  error: {
    borderColor: Colors.light.danger,
  },
  disabled: {
    backgroundColor: Colors.light.disabled,
    opacity: 0.7,
  },
  errorMessage: {
    minHeight: 20,
    marginTop: 4,
    fontSize: 12,
  },
  errorText: {
    color: Colors.light.danger,
  },
});
