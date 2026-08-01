import { Ionicons } from '@expo/vector-icons';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';

export type ChipIndicator = 'check' | 'radio';

export type ChipProps = {
  label: string;
  selected?: boolean;
  indicator?: ChipIndicator;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
};

/** 필터의 단일·다중 선택 상태를 동일한 형태로 표시하는 controlled Chip입니다. */
export function Chip({
  label,
  selected = false,
  indicator,
  disabled = false,
  onPress,
  style,
  accessibilityLabel,
  testID,
}: ChipProps) {
  // 단일 선택은 radio, 다중 선택은 checkbox로 전달해 보조 기술에도 선택 방식을 구분합니다.
  const accessibilityRole = indicator === 'check' ? 'checkbox' : indicator === 'radio' ? 'radio' : 'button';

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ checked: indicator ? selected : undefined, disabled, selected }}
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        selected ? styles.selectedContainer : styles.unselectedContainer,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      testID={testID}>
      {/* 단일 선택 필터는 선택 여부를 채워진 원으로 표시합니다. */}
      {indicator === 'radio' ? (
        <View style={[styles.radio, selected && styles.selectedRadio]} />
      ) : null}

      {/* 다중 선택 필터는 고정된 체크 영역을 사용해 모든 라벨 시작 위치를 맞춥니다. */}
      {indicator === 'check' ? (
        <View style={[styles.checkbox, selected && styles.selectedCheckbox]}>
          {selected ? <Ionicons color="#FFFFFF" name="checkmark" size={13} /> : null}
        </View>
      ) : null}

      <Text numberOfLines={1} style={[styles.label, selected && styles.selectedLabel]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 9,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 16,
    backgroundColor: Colors.light.cardBackground,
  },
  selectedContainer: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.inputBackground,
  },
  unselectedContainer: {
    borderColor: Colors.light.border,
  },
  radio: {
    width: 16,
    height: 16,
    borderWidth: 1,
    borderRadius: 8,
    borderColor: Colors.light.cardDescription,
    backgroundColor: Colors.light.cardBackground,
  },
  selectedRadio: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.primary,
  },
  checkbox: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 5,
    borderColor: Colors.light.cardDescription,
    backgroundColor: Colors.light.cardBackground,
  },
  selectedCheckbox: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.primary,
  },
  label: {
    flex: 1,
    flexShrink: 1,
    color: Colors.light.cardTitle,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  selectedLabel: {
    color: Colors.light.primary,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.68,
  },
  disabled: {
    opacity: 0.42,
  },
});
