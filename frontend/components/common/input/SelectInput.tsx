import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import Colors from '@/constants/Colors';

export type SelectOption<T extends string = string> = {
  label: string;
  value: T;
};

export type SelectInputProps<T extends string = string> = {
  // 화면이나 API에서 받은 선택지를 전달하므로 목록 내용은 고정되지 않습니다.
  options: SelectOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  label?: string;
  placeholder?: string;
  errorMessage?: string;
  disabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

/**
 * 여러 선택지 중 하나를 고르는 공통 입력 컴포넌트입니다.
 * 목록은 입력창 아래로 열리며, 약 4개 항목 높이 안에서 독립적으로 스크롤합니다.
 * AppScreen의 nestedScrollEnabled와 함께 사용해 실물 안드로이드의 스크롤 충돌을 방지합니다.
 */
export function SelectInput<T extends string = string>({
  options,
  value,
  onChange,
  label,
  placeholder = '선택해 주세요',
  errorMessage,
  disabled = false,
  containerStyle,
}: SelectInputProps<T>) {
  const [isOpen, setIsOpen] = useState(false);

  // 저장된 value와 일치하는 옵션의 표시용 label을 찾습니다.
  const selectedOption = options.find((option) => option.value === value);
  const hasError = Boolean(errorMessage);

  // 선택값을 부모 화면에 전달한 뒤 드롭다운을 닫습니다.
  const handleSelect = (selectedValue: T) => {
    onChange(selectedValue);
    setIsOpen(false);
  };

  return (
    <View style={[styles.container, isOpen && styles.openContainer, containerStyle]}>
      {label ? <Text style={[styles.label, hasError && styles.errorText]}>{label}</Text> : null}

      <View style={styles.fieldArea}>
        <Pressable
          accessibilityLabel={label ?? placeholder}
          accessibilityRole="button"
          accessibilityState={{ disabled, expanded: isOpen }}
          disabled={disabled}
          onPress={() => setIsOpen((current) => !current)}
          style={({ pressed }) => [
            styles.trigger,
            isOpen && styles.focused,
            hasError && styles.error,
            disabled && styles.disabled,
            pressed && !disabled && styles.pressedTrigger,
          ]}>
          <Text style={[styles.valueText, !selectedOption && styles.placeholder]} numberOfLines={1}>
            {selectedOption?.label ?? placeholder}
          </Text>
          <Text style={styles.chevron}>{isOpen ? '⌃' : '⌄'}</Text>
        </Pressable>

        {isOpen ? (
          <View style={styles.dropdown}>
            {/* 부모 AppScreen과 중첩 스크롤을 연결해 필터 목록 안의 터치를 먼저 처리합니다. */}
            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator={options.length > 4}
              style={styles.optionScroll}>
              {options.map((option) => {
                const isSelected = option.value === value;

                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    key={option.value}
                    onPress={() => handleSelect(option.value)}
                    style={({ pressed }) => [
                      styles.option,
                      isSelected && styles.selectedOption,
                      pressed && styles.pressedOption,
                    ]}>
                    <Text style={[styles.optionText, isSelected && styles.selectedOptionText]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}
      </View>

      {errorMessage ? <Text style={[styles.errorMessage, styles.errorText]}>{errorMessage}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  openContainer: {
    zIndex: 10,
  },
  label: {
    marginBottom: 6,
    color: Colors.light.placeholder,
    fontSize: 13,
    fontWeight: '600',
  },
  fieldArea: {
    position: 'relative',
  },
  trigger: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 14,
    backgroundColor: Colors.light.inputBackground,
  },
  valueText: {
    flex: 1,
    color: Colors.light.text,
    fontSize: 16,
  },
  placeholder: {
    color: Colors.light.placeholder,
  },
  chevron: {
    marginLeft: 8,
    color: Colors.light.text,
    fontSize: 22,
    fontWeight: '700',
  },
  dropdown: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 14,
    backgroundColor: Colors.light.cardBackground,
    elevation: 8,
  },
  optionScroll: {
    maxHeight: 224,
  },
  option: {
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  selectedOption: {
    margin: 8,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: Colors.light.primary,
  },
  optionText: {
    color: Colors.light.text,
    fontSize: 16,
  },
  selectedOptionText: {
    color: Colors.onboarding.inverseText,
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
  pressedTrigger: {
    opacity: 0.8,
  },
  pressedOption: {
    opacity: 0.75,
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
