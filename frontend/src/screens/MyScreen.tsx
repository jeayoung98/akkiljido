import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import AppScreen from '@/components/ui/AppScreen';

export default function MyScreen() {
  return (
    <AppScreen scrollable backgroundColor="#FFFFFF">
      <View style={styles.header}>
        <Text style={styles.title}>마이페이지</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.bodyTitle}>프로필 영역</Text>
        <Text style={styles.description}>닉네임과 프로필 정보가 들어갈 영역</Text>
        <View style={styles.menuPlaceholder}>
          <Text style={styles.bodyTitle}>메뉴 영역</Text>
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 84, justifyContent: 'center', paddingTop: 12, paddingHorizontal: 20, backgroundColor: '#FFFFFF' },
  title: { color: '#18251E', fontSize: 24, fontWeight: '800' },
  body: { flexGrow: 1, padding: 24, backgroundColor: '#F3F8F4' },
  bodyTitle: { color: '#315F3D', fontSize: 18, fontWeight: '800' },
  description: { marginTop: 8, color: '#819087', fontSize: 13 },
  menuPlaceholder: { marginTop: 28, padding: 20, borderRadius: 14, backgroundColor: '#FFFFFF' },
});
