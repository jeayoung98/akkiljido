import React, { type ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type AppScreenProps = {
  children: ReactNode;
  scrollable?: boolean;
  backgroundColor?: string;
};

export default function AppScreen({
  children,
  scrollable = false,
  backgroundColor = '#F3F8F4',
}: AppScreenProps) {
  const backgroundStyle = { backgroundColor };

  return (
    <>
      {/* expo-status-bar의 hidden 옵션으로 시스템 상태바를 숨겨 카메라 영역 높이까지 화면을 확장합니다. */}
      <StatusBar hidden />
      {/* 상단은 카메라 영역까지 사용하고, 하단은 NavBar가 담당하므로 좌우 안전 영역만 적용합니다. */}
      <SafeAreaView style={[styles.safeArea, backgroundStyle]} edges={['left', 'right']}>
        {/* 화면 성격에 따라 스크롤 컨테이너와 고정 컨테이너를 선택합니다. */}
        {scrollable ? (
          // 콘텐츠가 짧아도 화면 높이를 채워 공통 레이아웃이 유지됩니다.
          <ScrollView style={[styles.container, backgroundStyle]} contentContainerStyle={styles.scrollContent}>
            {children}
          </ScrollView>
        ) : (
          <View style={styles.container}>{children}</View>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
