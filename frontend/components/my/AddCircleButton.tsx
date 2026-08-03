import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';

import Colors from '@/constants/Colors';

type AddCircleButtonProps = {
  onPress: () => void;
  /** 원 지름(px)입니다. 아이콘 크기는 이 값의 절반 정도로 자동으로 맞춥니다. */
  size?: number;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * 섹션 제목 옆(예: "위치 알림" 옆)에 인라인으로 붙는 작은 초록 원형 + 버튼입니다.
 * 화면 우측 하단에 고정되는 FloatingActionButton과는 달리 position을 지정하지 않아서,
 * 다른 요소와 같은 줄에 자연스럽게 놓입니다.
 */
export function AddCircleButton({
  onPress,
  size = 32,
  disabled = false,
  accessibilityLabel = '추가',
  style,
}: AddCircleButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { width: size, height: size, borderRadius: size / 2 },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}>
      <Ionicons color="#fff" name="add" size={Math.round(size * 0.6)} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primary,
  },
  disabled: {
    backgroundColor: Colors.light.disabled,
  },
  pressed: {
    opacity: 0.8,
  },
});
