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
  options: SelectOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  label?: string;
  placeholder?: string;
  errorMessage?: string;
  disabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

/** 목록이 주변 레이아웃을 밀지 않고 입력창 위에 펼쳐지는 공통 선택 컴포넌트입니다. */
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
  const selectedOption = options.find((option) => option.value === value);
  const hasError = Boolean(errorMessage);

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
          <Text numberOfLines={1} style={[styles.valueText, !selectedOption && styles.placeholder]}>
            {selectedOption?.label ?? placeholder}
          </Text>
          <Text style={styles.chevron}>{isOpen ? '⌃' : '⌄'}</Text>
        </Pressable>

        {isOpen ? (
          <View style={styles.dropdown}>
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
  container: { width: '100%' },
  // 열린 Select 전체를 형제 컴포넌트보다 위에 배치하며 elevation은 Android를 보완합니다.
  openContainer: { zIndex: 10, elevation: 10 },
  label: { marginBottom: 6, color: Colors.light.placeholder, fontSize: 13, fontWeight: '600' },
  fieldArea: { position: 'relative', zIndex: 10, elevation: 10 },
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
  valueText: { flex: 1, color: Colors.light.text, fontSize: 16 },
  placeholder: { color: Colors.light.placeholder },
  chevron: { marginLeft: 8, color: Colors.light.text, fontSize: 22, fontWeight: '700' },
  dropdown: {
    // 목록을 레이아웃 흐름에서 분리해 열릴 때 아래 콘텐츠를 밀지 않게 합니다.
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 14,
    backgroundColor: Colors.light.cardBackground,
    elevation: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
  },
  optionScroll: { maxHeight: 224 },
  option: { minHeight: 52, justifyContent: 'center', paddingHorizontal: 16 },
  // 선택 여부와 관계없이 행 높이를 유지하고 배경색만 변경합니다.
  selectedOption: { backgroundColor: Colors.light.primary },
  optionText: { color: Colors.light.text, fontSize: 16 },
  selectedOptionText: { color: Colors.onboarding.inverseText, fontWeight: '600' },
  focused: { borderColor: Colors.light.primary },
  error: { borderColor: Colors.light.danger },
  disabled: { backgroundColor: Colors.light.disabled, opacity: 0.7 },
  pressedTrigger: { opacity: 0.8 },
  pressedOption: { opacity: 0.75 },
  errorMessage: { minHeight: 20, marginTop: 4, fontSize: 12 },
  errorText: { color: Colors.light.danger },
});
