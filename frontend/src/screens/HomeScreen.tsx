import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import AppScreen from '../components/AppScreen';

export default function HomeScreen() {
  return (
    <AppScreen scrollable backgroundColor="#4E873F">
      <View style={styles.header}>
        <Text style={styles.headerTitle}>홈</Text>
        <Text style={styles.headerDescription}>상단 Safe Area와 이어지는 초록색 영역</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.bodyTitle}>HomeScreen 초안</Text>
        <Text style={styles.bodyDescription}>실제 홈 콘텐츠가 들어갈 흰색 본문 영역</Text>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 180, justifyContent: 'center', paddingHorizontal: 24 },
  headerTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '800' },
  headerDescription: { marginTop: 8, color: '#E3F0DF', fontSize: 13 },
  body: { minHeight: 560, padding: 24, backgroundColor: '#FFFFFF' },
  bodyTitle: { color: '#18251E', fontSize: 18, fontWeight: '800' },
  bodyDescription: { marginTop: 8, color: '#819087', fontSize: 13 },
});
