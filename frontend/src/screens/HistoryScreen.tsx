import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import AppScreen from '../components/AppScreen';

export default function HistoryScreen() {
  return (
    <AppScreen scrollable backgroundColor="#FFFFFF">
      <View style={styles.header}>
        <Text style={styles.title}>내역</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.bodyTitle}>HistoryScreen 초안</Text>
        <Text style={styles.description}>내역 콘텐츠가 들어갈 본문 영역</Text>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16, backgroundColor: '#FFFFFF' },
  title: { color: '#18251E', fontSize: 24, fontWeight: '800' },
  body: { minHeight: 640, padding: 24, backgroundColor: '#F3F8F4' },
  bodyTitle: { color: '#315F3D', fontSize: 18, fontWeight: '800' },
  description: { marginTop: 8, color: '#819087', fontSize: 13 },
});
