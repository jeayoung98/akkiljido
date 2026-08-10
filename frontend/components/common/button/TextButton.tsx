import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { Text } from '@/components/common/typography/Text';

import Colors from '@/constants/Colors';

type TextButtonProps = {
  children: React.ReactNode;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

// 일반적인 배경 없는 텍스트 버튼 컴포넌트
export function TextButton({ children, disabled, onPress, style }: TextButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.base, { opacity: disabled ? 0.4 : pressed ? 0.5 : 1 }, style]}>
      <Text style={styles.text}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.textSecondary,
  },
});
