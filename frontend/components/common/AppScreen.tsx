import React, { type ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const insets = useSafeAreaInsets();
  const backgroundStyle = { backgroundColor };
  // 배경은 카메라 영역까지 이어지게 두고, 실제 콘텐츠만 카메라 높이 아래에서 시작합니다.
  const contentSafeAreaStyle = { paddingTop: insets.top || 32 };

  return (
    <>
      {/* expo-status-bar의 hidden 옵션으로 시스템 상태바를 숨겨 카메라 영역 높이까지 화면을 확장합니다. */}
      <StatusBar hidden />
      {/* 배경은 상단까지 채우되 제목 등 콘텐츠는 카메라 영역과 겹치지 않도록 여백을 적용합니다. */}
      <SafeAreaView
        style={[styles.safeArea, backgroundStyle, contentSafeAreaStyle]}
        edges={['left', 'right']}>
        {/* 키보드가 올라오면 화면 높이를 줄여 하단의 TextInput·SearchInput 등이 가려지지 않게 합니다. */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}>
          {/* 화면 성격에 따라 스크롤 컨테이너와 고정 컨테이너를 선택합니다. */}
          {scrollable ? (
            // 콘텐츠가 짧아도 화면 높이를 채우고, 자체 스크롤을 가진 자식과의 터치 충돌을 방지합니다.
            <ScrollView
              automaticallyAdjustKeyboardInsets
              style={[styles.container, backgroundStyle]}
              contentContainerStyle={styles.scrollContent}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled>
              {children}
            </ScrollView>
          ) : (
            <View style={styles.container}>{children}</View>
          )}
        </KeyboardAvoidingView>
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
