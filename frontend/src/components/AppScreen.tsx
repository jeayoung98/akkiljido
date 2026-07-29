import React, { type ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
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
    // 하단 안전 영역은 NavBar가 담당하므로 화면에서는 상단과 좌우만 적용합니다.
    <SafeAreaView style={[styles.safeArea, backgroundStyle]} edges={['top', 'left', 'right']}>
      {/* 화면 성격에 따라 스크롤 컨테이너와 고정 컨테이너를 선택합니다. */}
      {scrollable ? (
        // 콘텐츠가 짧아도 화면 높이를 채워 공통 레이아웃이 유지됩니다.
        <ScrollView
          style={[styles.container, backgroundStyle]}
          contentContainerStyle={styles.scrollContent}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={styles.container}>{children}</View>
      )}
    </SafeAreaView>
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
