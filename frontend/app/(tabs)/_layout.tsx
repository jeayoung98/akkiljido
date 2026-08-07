// 하단 탭바 정의 파일. 이 폴더(app/(tabs)) 안의 화면 5개를 <Tabs>로 감싸고,
// 탭 아이콘/활성 표시 스타일을 이 파일에서 커스터마이징한다.
import { Tabs } from 'expo-router';
import type { ComponentProps, ComponentType } from 'react';
import { Image, Platform, Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { useNotificationPlaceTrigger } from '@/hooks/useNotificationPlaceTrigger';

// react-native-web의 Pressable은 href를 지원하지만(링크 렌더링용) RN 기본 타입엔 없어서 여기서 확장한다.
type TabBarButtonProps = ComponentProps<typeof Pressable> & { href?: string | null };
const WebPressable = Pressable as ComponentType<TabBarButtonProps>;

// 웹에서 탭 링크를 클릭했을 때 브라우저의 전체 페이지 이동(하드 리로드) 대신
// 앱 내부 라우팅(onPress)만 실행되도록 기본 동작을 막는다.
// React Navigation 기본 탭 버튼(PlatformPressable)이 하던 걸 그대로 재현한 것.
function TabBarButton({ href, onPress, ...props }: TabBarButtonProps) {
  const handlePress = (event: GestureResponderEvent) => {
    if (Platform.OS === 'web' && href != null) {
      const nativeEvent = event.nativeEvent as unknown as MouseEvent;
      const hasModifierKey = nativeEvent.metaKey || nativeEvent.altKey || nativeEvent.ctrlKey || nativeEvent.shiftKey;
      const isLeftClick = nativeEvent.button == null || nativeEvent.button === 0;

      if (hasModifierKey || !isLeftClick) {
        // Ctrl/Cmd/Shift+클릭이나 우클릭 등은 브라우저 기본 동작(새 탭 열기 등)에 맡긴다.
        return;
      }

      event.preventDefault();
    }

    onPress?.(event);
  };

  return (
    <WebPressable
      {...props}
      href={href}
      onPress={handlePress}
      android_ripple={{ color: 'transparent' }}
    />
  );
}

// 탭별 on(선택)/off(비선택) 아이콘 이미지 매핑
const icons = {
  home: {
    on: require('@/assets/images/navbar-item/home-on.png'),
    off: require('@/assets/images/navbar-item/home-off.png'),
  },
  list: {
    on: require('@/assets/images/navbar-item/list-on.png'),
    off: require('@/assets/images/navbar-item/list-off.png'),
  },
  map: {
    on: require('@/assets/images/navbar-item/map-on.png'),
    off: require('@/assets/images/navbar-item/map-off.png'),
  },
  report: {
    on: require('@/assets/images/navbar-item/report-on.png'),
    off: require('@/assets/images/navbar-item/report-off.png'),
  },
  my: {
    on: require('@/assets/images/navbar-item/my-on.png'),
    off: require('@/assets/images/navbar-item/my-off.png'),
  },
};

// 탭 아이콘 컴포넌트. 선택된 탭이면 초록 원 배경 위에 on 아이콘을, 아니면 off 아이콘만 그린다.
function TabIcon({ name, focused }: { name: keyof typeof icons; focused: boolean }) {
  if (!focused) {
    return <Image source={icons[name].off} style={styles.icon} resizeMode="contain" />;
  }
  return (
    <View style={styles.activeCircle}>
      <Image source={icons[name].on} style={styles.icon} resizeMode="contain" />
    </View>
  );
}

// 탭 네비게이터 등록. 헤더/라벨은 숨기고, 탭 5개(홈/내역/지도/리포트/마이)를 순서대로 배치한다.
export default function TabLayout() {
  const insets = useSafeAreaInsets();
  // 탭 화면들이 떠 있는 동안(=앱을 실제로 쓰는 동안) 위치 알림 조건을 계속 확인한다.
  useNotificationPlaceTrigger();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          paddingTop: 10,
          // 기기 하단 안전 영역(홈 인디케이터/제스처 바)만큼 띄운다.
          paddingBottom: insets.bottom,
          height: 60 + insets.bottom,
        },
        // Expo Router와 Pressable의 ref 타입 차이를 변환해 ref와 기존 투명 리플 동작을 모두 유지한다.
        tabBarButton: ({ ref, ...props }) => (
          <TabBarButton {...props} ref={ref as ComponentProps<typeof Pressable>['ref']} />
        ),
      }}>
      <Tabs.Screen name="index" options={{ tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} /> }} />
      <Tabs.Screen name="list" options={{ tabBarIcon: ({ focused }) => <TabIcon name="list" focused={focused} /> }} />
      <Tabs.Screen name="map" options={{ tabBarIcon: ({ focused }) => <TabIcon name="map" focused={focused} /> }} />
      <Tabs.Screen name="report" options={{ tabBarIcon: ({ focused }) => <TabIcon name="report" focused={focused} /> }} />
      <Tabs.Screen name="my" options={{ tabBarIcon: ({ focused }) => <TabIcon name="my" focused={focused} /> }} />
    </Tabs>
  );
}

// 아이콘 크기와 선택된 탭의 원형 배경 스타일
const styles = StyleSheet.create({
  icon: {
    width: 22,
    height: 22,
  },
  activeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
