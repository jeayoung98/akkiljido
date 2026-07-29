import type { ReactNode } from 'react';
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';

export type BaseCardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: PressableProps['onPress'];
  disabled?: boolean;
  accessibilityLabel?: string;
};

/**
 * 화면별 카드가 공통으로 사용하는 외곽 컨테이너입니다.
 * 카드 안의 제목, 금액, 아이콘 등은 children으로 자유롭게 구성합니다.
 */
export default function BaseCard({
  children,
  style,
  onPress,
  disabled = false,
  accessibilityLabel,
}: BaseCardProps) {
  // 터치 동작이 없는 정보 카드는 불필요한 버튼 역할 없이 View로 렌더링합니다.
  if (!onPress) {
    return <View style={[styles.card, style]}>{children}</View>;
  }

  // 장소 이동 카드처럼 누를 수 있는 경우에만 Pressable과 터치 피드백을 적용합니다.
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
    backgroundColor: '#FFFFFF',
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
});
