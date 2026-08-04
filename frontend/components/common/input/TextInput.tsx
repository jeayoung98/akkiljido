import { useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput as NativeTextInput,
  TextInputProps as NativeTextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import Colors from '@/constants/Colors';

type TextInputVariant = 'filled' | 'underline';

export type TextInputProps = NativeTextInputProps & {
  /** 입력창 위에 표시할 항목 이름입니다. */
  label?: string;
  /** 전달된 경우 오류 문구와 오류 테두리를 표시합니다. */
  errorMessage?: string;
  /** 배경이 채워진 입력창과 밑줄 입력창 중 하나를 선택합니다. */
  variant?: TextInputVariant;
  /** 추가 폼처럼 라벨을 채워진 입력 칸 안에 고정해 표시할 때 사용합니다. */
  labelInside?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
};

/**
 * 일반 문자열 입력에 사용하는 공통 컴포넌트입니다.
 * 라벨과 오류 문구, filled·underline 형태를 선택적으로 표시합니다.
 * 나머지 입력 설정은 React Native TextInput의 기본 props를 그대로 사용합니다.
 */
export function TextInput({
  label,
  errorMessage,
  variant = 'filled',
  labelInside = false,
  containerStyle,
  inputStyle,
  editable = true,
  onBlur,
  onFocus,
  accessibilityLabel,
  ...props
}: TextInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const hasError = Boolean(errorMessage);

  // 포커스 상태는 입력 중 테두리 색상을 표시하는 용도로만 사용합니다.
  const handleFocus: NonNullable<NativeTextInputProps['onFocus']> = (event) => {
    setIsFocused(true);
    onFocus?.(event);
  };

  const handleBlur: NonNullable<NativeTextInputProps['onBlur']> = (event) => {
    setIsFocused(false);
    onBlur?.(event);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && !labelInside ? <Text style={[styles.label, hasError && styles.errorText]}>{label}</Text> : null}

      {labelInside ? (
        // 거래 추가처럼 라벨과 입력값을 하나의 필드 안에 배치해야 하는 화면에서 사용합니다.
        <View
          style={[
            styles.insideField,
            isFocused && styles.focused,
            hasError && styles.error,
            !editable && styles.disabled,
          ]}>
          <Text style={[styles.insideLabel, hasError && styles.errorText]}>{label}</Text>
          <NativeTextInput
            {...props}
            accessibilityLabel={accessibilityLabel ?? label}
            editable={editable}
            onBlur={handleBlur}
            onFocus={handleFocus}
            placeholderTextColor={Colors.light.placeholder}
            style={[styles.input, styles.insideInput, inputStyle]}
          />
        </View>
      ) : (
        <NativeTextInput
          // value, onChangeText, maxLength, multiline 등 기본 입력 props를 그대로 전달합니다.
          {...props}
          accessibilityLabel={accessibilityLabel ?? label}
          editable={editable}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholderTextColor={Colors.light.placeholder}
          style={[
            styles.input,
            // 화면 디자인에 따라 filled와 underline 중 하나를 선택합니다.
            variant === 'filled' ? styles.filled : styles.underline,
            isFocused && styles.focused,
            hasError && styles.error,
            !editable && styles.disabled,
            inputStyle,
          ]}
        />
      )}

      {errorMessage ? (
        <Text style={[styles.supportingText, styles.errorText]}>{errorMessage}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    marginBottom: 6,
    color: Colors.light.placeholder,
    fontSize: 13,
    fontWeight: '600',
  },
  insideField: {
    // SelectInput·DateInput과 함께 2열로 놓여도 높이가 일정하게 유지됩니다.
    minHeight: 76,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 14,
    backgroundColor: Colors.light.inputBackground,
  },
  insideLabel: {
    color: Colors.light.text,
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    minHeight: 52,
    paddingHorizontal: 16,
    color: Colors.light.text,
    fontSize: 16,
  },
  insideInput: {
    minHeight: 36,
    paddingHorizontal: 0,
    paddingVertical: 0,
    backgroundColor: 'transparent',
  },
  filled: {
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 14,
    backgroundColor: Colors.light.inputBackground,
  },
  underline: {
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    backgroundColor: 'transparent',
  },
  focused: {
    borderColor: Colors.light.primary,
  },
  error: {
    borderColor: Colors.light.danger,
  },
  disabled: {
    color: Colors.light.textSecondary,
    backgroundColor: Colors.light.disabled,
    opacity: 0.7,
  },
  supportingText: {
    minHeight: 20,
    marginTop: 4,
    color: Colors.light.textSecondary,
    fontSize: 12,
  },
  errorText: {
    color: Colors.light.danger,
  },
});
