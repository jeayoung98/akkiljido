import type { ReactNode } from 'react';
import { Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { Text } from '@/components/common/typography/Text';

import Colors from '@/constants/Colors';

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
  icon?: ReactNode;
  activeBackgroundColor?: string;
  activeTextColor?: string;
  inactiveTextColor?: string;
  accessibilityLabel?: string;
};

export type SegmentedControlProps<T extends string> = {
  options: readonly [SegmentOption<T>, SegmentOption<T>, ...SegmentOption<T>[]];
  value: T;
  onChange: (value: T) => void;
  size?: 'small' | 'medium';
  disabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * 두 개 이상의 선택지를 동일한 너비로 표시하는 controlled segmented control입니다.
 * 선택 상태와 화면별 활성 색상은 호출부에서 관리합니다.
 */
export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'medium',
  disabled = false,
  containerStyle,
  testID,
}: SegmentedControlProps<T>) {
  const isSmall = size === 'small';

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.container, isSmall ? styles.smallContainer : styles.mediumContainer, containerStyle]}
      testID={testID}>
      {options.map((option) => {
        const selected = option.value === value;
        const textColor = selected
          ? (option.activeTextColor ?? Colors.onboarding.green)
          : (option.inactiveTextColor ?? Colors.light.placeholder);

        const handlePress = () => {
          if (!disabled && !selected) {
            onChange(option.value);
          }
        };

        return (
          <Pressable
            accessibilityLabel={option.accessibilityLabel ?? option.label}
            accessibilityRole="tab"
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            key={option.value}
            onPress={handlePress}
            style={({ pressed }) => [
              styles.segment,
              isSmall ? styles.smallSegment : styles.mediumSegment,
              selected && styles.selectedSegment,
              selected && {
                backgroundColor: option.activeBackgroundColor ?? Colors.light.cardBackground,
              },
              pressed && !disabled && !selected && styles.pressedSegment,
              disabled && styles.disabledSegment,
            ]}
            testID={testID ? `${testID}-${option.value}` : undefined}>
            <View style={styles.content}>
              {option.icon ? <View style={styles.icon}>{option.icon}</View> : null}
              <Text
                numberOfLines={1}
                style={[
                  styles.label,
                  isSmall ? styles.smallLabel : styles.mediumLabel,
                  selected && styles.selectedLabel,
                  { color: textColor },
                ]}>
                {option.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    padding: 3,
    backgroundColor: Colors.light.inputBackground,
  },
  smallContainer: {
    minHeight: 40,
    borderRadius: 12,
  },
  mediumContainer: {
    minHeight: 44,
    borderRadius: 15,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: 'transparent',
    borderWidth: 1,
  },
  smallSegment: {
    minHeight: 34,
    borderRadius: 10,
    paddingHorizontal: 8,
  },
  mediumSegment: {
    minHeight: 38,
    borderRadius: 12,
    paddingHorizontal: 10,
  },
  selectedSegment: {
    borderColor: Colors.light.border,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  pressedSegment: {
    opacity: 0.65,
  },
  disabledSegment: {
    opacity: 0.5,
  },
  content: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 4,
  },
  label: {
    flexShrink: 1,
    textAlign: 'center',
  },
  smallLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  mediumLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  selectedLabel: {
    fontWeight: '700',
  },
});
