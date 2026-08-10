import { router } from 'expo-router';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Text } from '@/components/common/typography/Text';

import { IconButton } from '@/components/common/button/IconButton';
import Colors from '@/constants/Colors';

type HeaderActionIcon =
  | 'search'
  | 'filter'
  | 'notification'
  | 'edit'
  | 'delete'
  | 'close'
  | 'add';

export type HeaderAction = {
  /** AppHeader에서 지원하는 공통 액션 아이콘입니다. */
  icon: HeaderActionIcon;
  /** 아이콘 버튼을 눌렀을 때 실행할 화면별 동작입니다. */
  onPress: () => void;
  key?: string;
  color?: string;
  disabled?: boolean;
};

export type AppHeaderProps = {
  title: string;
  subtitle?: string;
  /** 상세 화면처럼 이전 화면 이동이 필요한 경우에만 활성화합니다. */
  showBackButton?: boolean;
  /** 검색, 필터, 수정 등 화면 오른쪽에 표시할 액션 목록입니다. */
  rightActions?: HeaderAction[];
  /** 전달하지 않으면 Expo Router의 기본 뒤로가기를 실행합니다. */
  onBack?: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * 일반 화면 상단에서 뒤로가기, 제목, 오른쪽 액션을 공통으로 표시합니다.
 * Safe Area와 화면 스크롤은 AppScreen이 담당하고 AppHeader는 제목 행만 담당합니다.
 */
export function AppHeader({
  title,
  subtitle,
  showBackButton = false,
  rightActions = [],
  onBack,
  style,
}: AppHeaderProps) {
  const handleBack = () => {
    // 별도 동작을 전달하지 않으면 Expo Router의 이전 화면으로 이동합니다.
    if (onBack) {
      onBack();
      return;
    }

    router.back();
  };

  return (
    <View style={[styles.container, style]}>
      {/* 목록·탭 화면에는 숨기고 상세 화면에서만 뒤로가기 버튼을 표시합니다. */}
      {showBackButton ? (
        <IconButton
          background
          color={Colors.light.text}
          name="back"
          onPress={handleBack}
          size={18}
        />
      ) : null}

      {/* flex 영역과 한 줄 제한으로 양쪽 버튼이 있어도 제목이 겹치지 않게 합니다. */}
      <View style={styles.titleArea}>
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* 화면에서 전달한 순서대로 오른쪽 액션 버튼을 렌더링합니다. */}
      {rightActions.length > 0 ? (
        <View style={styles.actions}>
          {rightActions.map((action, index) => (
            <IconButton
              color={action.color ?? Colors.light.primary}
              disabled={action.disabled}
              key={action.key ?? `${action.icon}-${index}`}
              name={action.icon}
              onPress={action.onPress}
              size={22}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    backgroundColor: Colors.light.cardBackground,
  },
  titleArea: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: Colors.light.cardTitle,
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 3,
    color: Colors.light.cardDescription,
    fontSize: 11,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
});
