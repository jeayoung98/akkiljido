import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';

import Colors from '@/constants/Colors';

/*
Ionicons의 실제 이름을 직접 사용하지 않고 별칭을 만들어
컴포넌트 사용자가 라이브러리 이름을 몰라도 사용할 수 있도록 한다.
eX) funnel-outline이 아니라 filter로 사용할 수 있다. 
*/
const iconNames = {
  back: 'chevron-back',
  chevronRight: 'chevron-forward',
  chevronDown: 'chevron-down',
  search: 'search',
  filter: 'funnel-outline',
  close: 'close',
  add: 'add',
  edit: 'create-outline',
  delete: 'trash-outline',
  notification: 'notifications-outline',
  pin: 'location',
  locate: 'locate',
  zoomIn: 'add',
  zoomOut: 'remove',
} as const;

// iconNames 객체의 key만 허용하는 타입 생성
type IconName = keyof typeof iconNames;

type IconButtonProps = {
  name: IconName;
  size?: number;
  color?: string;
  background?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function IconButton({
  name,
  size = 24,
  color = Colors.light.text,
  background,
  disabled,
  onPress,
  style,
}: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      style={({ pressed }) => [
        background && styles.background,
        { opacity: disabled ? 0.4 : pressed ? 0.5 : 1 },
        style,
      ]}>
      <Ionicons name={iconNames[name]} size={size} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // 연한 초록 원형 배경. primary 색에 투명도를 줘서 별도 색상 토큰 없이 만든다.
  background: {
    padding: 10,
    borderRadius: 999,
    backgroundColor: `${Colors.light.primary}26`,
  },
});
