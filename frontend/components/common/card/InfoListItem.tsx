import type { ReactNode } from 'react';
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  StyleSheet,
  Text,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native';

export type InfoListItemProps = {
  leading?: ReactNode;
  title: string;
  description?: string;
  trailing?: ReactNode;
  onPress?: PressableProps['onPress'];
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
};

/** 아이콘, 제목, 설명, 우측 요소를 한 줄로 배치하는 공통 목록 항목입니다. */
export default function InfoListItem({
  leading,
  title,
  description,
  trailing,
  onPress,
  disabled = false,
  accessibilityLabel,
  style,
  titleStyle,
}: InfoListItemProps) {
  // leading과 trailing에는 아이콘, 금액, 화살표, 스위치 등 화면별 요소를 자유롭게 전달합니다.
  const content = (
    <>
      {leading ? <View style={styles.leading}>{leading}</View> : null}

      <View style={styles.content}>
        <Text numberOfLines={1} style={[styles.title, titleStyle]}>
          {title}
        </Text>
        {description ? (
          <Text numberOfLines={2} style={styles.description}>
            {description}
          </Text>
        ) : null}
      </View>

      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </>
  );

  // 행 전체를 누르는 화면에서만 버튼 역할과 터치 피드백을 적용합니다.
  if (onPress) {
    return (
      <Pressable
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.container,
          style,
          pressed && !disabled && styles.pressed,
          disabled && styles.disabled,
        ]}>
        {content}
      </Pressable>
    );
  }

  // 클릭 동작이 없는 정보 행은 불필요한 버튼 역할 없이 View로 렌더링합니다.
  return <View style={[styles.container, style]}>{content}</View>;
}

const styles = StyleSheet.create({
  container: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  leading: {
    marginRight: 12,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: '#18251E',
    fontSize: 17,
    fontWeight: '700',
  },
  description: {
    marginTop: 3,
    color: '#789080',
    fontSize: 13,
    lineHeight: 18,
  },
  trailing: {
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.5,
  },
});
