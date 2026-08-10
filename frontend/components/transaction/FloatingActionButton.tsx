import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';

import Colors from '@/constants/Colors';

type FloatingActionButtonProps = {
  onPress: () => void;
  /**
   * 기본은 화면 오른쪽 아래 고정 위치입니다. 다른 위치가 필요하면 right/bottom 등을 덮어써서 씁니다.
   */
  style?: StyleProp<ViewStyle>;
};

/**
 * 내역 리스트 화면에서 거래 추가 바텀시트를 여는 우측 하단 + 버튼입니다.
 *
 * position: absolute로 화면에 고정되므로, 스크롤되는 화면(AppScreen scrollable 등)에서 쓸 때는
 * 스크롤 영역의 children으로 넣지 말고 그 바깥 형제로 렌더링해야 스크롤을 따라가지 않습니다.
 */
export function FloatingActionButton({ onPress, style }: FloatingActionButtonProps) {
  return (
    <Pressable
      accessibilityLabel="내역 추가"
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { opacity: pressed ? 0.85 : 1 }, style]}>
      <Ionicons color="#fff" name="add" size={28} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primary,
    // elevation은 Android, shadow*는 iOS 전용이라 둘 다 넣어야 양쪽에서 입체감이 보입니다.
    elevation: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
});
