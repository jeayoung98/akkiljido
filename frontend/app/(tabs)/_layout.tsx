// 하단 탭바 정의 파일. 이 폴더(app/(tabs)) 안의 화면 5개를 <Tabs>로 감싸고,
// 탭 아이콘/활성 표시 스타일을 이 파일에서 커스터마이징한다.
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import Colors from '@/constants/Colors';

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
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          paddingTop: 10,
          height: 60,
        },
        // Android 기본 리플(회색 원) 효과를 투명하게 처리한다.
        tabBarButton: ({ ref, ...props }) => (
          <Pressable
            {...props}
            ref={ref as ComponentProps<typeof Pressable>['ref']}
            android_ripple={{ color: 'transparent' }}
          />
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
