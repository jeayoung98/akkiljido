import type { ReactNode } from 'react';
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';

import Colors from '@/constants/Colors';

export type BaseCardProps = {
  /** 카드 내부 내용은 화면이나 기능 컴포넌트가 직접 구성합니다. */
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** 전달한 경우에만 카드 전체가 눌리는 Pressable로 렌더링됩니다. */
  onPress?: PressableProps['onPress'];
  disabled?: boolean;
  accessibilityLabel?: string;
};

/**
 * 화면별 카드가 공통으로 사용하는 외곽 컨테이너입니다.
 * 공통 배경색, 내부 여백과 모서리 값을 제공하며 내부 내용은 children으로 구성합니다.
 * onPress가 있을 때만 카드 전체가 눌리는 버튼으로 동작합니다.
 */
export default function BaseCard({
  children,
  style,
  onPress,
  disabled = false,
  accessibilityLabel,
}: BaseCardProps) {
  // 터치 동작이 없는 정보 카드는 View로 렌더링합니다.
  if (!onPress) {
    return <View style={[styles.card, style]}>{children}</View>;
  }

  // 상세 화면 이동처럼 카드 전체를 누르는 경우에만 터치 피드백을 적용합니다.
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        style,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: Colors.light.cardBackground,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
});
