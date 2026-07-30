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

import Colors from '@/constants/Colors';

export type InfoListItemProps = {
  /** 카테고리 이미지나 장소 아이콘처럼 행 왼쪽에 표시할 요소입니다. */
  leading?: ReactNode;
  title: string;
  description?: string;
  /** 금액, 화살표, 알림 스위치, 삭제 버튼, kebab 메뉴 등 행 오른쪽 요소입니다. */
  trailing?: ReactNode;
  /** 전달하면 행 전체가 눌리는 버튼으로 동작합니다. */
  onPress?: PressableProps['onPress'];
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
};

/**
 * 아이콘, 제목, 설명, 우측 요소를 한 줄로 배치하는 공통 목록 항목입니다.
 *
 * 이 컴포넌트는 목록 행의 배치와 행 전체 클릭만 담당합니다.
 * 화면별 데이터 가공과 개별 동작은 사용하는 기능 컴포넌트에서 처리합니다.
 * - 알림: 활성 상태와 kebab 메뉴의 수정·삭제 동작
 * - 장소: API로 받은 누적 금액의 가공 및 표시
 * - 거래: 소비·수입에 따른 금액 부호와 색상 처리
 */
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
  // leading과 trailing에는 화면에 필요한 아이콘, 금액, 화살표, 스위치, 메뉴 버튼 등을 전달합니다.
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

  // onPress가 있으면 행 전체를 누를 수 있는 버튼으로 렌더링합니다.
  // 우측에 별도 버튼이 있다면 해당 버튼의 동작은 사용하는 화면에서 분리해 처리합니다.
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
    color: Colors.light.cardTitle,
    fontSize: 17,
    fontWeight: '700',
  },
  description: {
    marginTop: 3,
    color: Colors.light.cardDescription,
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
