import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import AppScreen from '../components/AppScreen';

export default function ReportScreen() {
  return (
    <AppScreen scrollable backgroundColor="#FFFFFF">
      <View style={styles.header}>
        <Text style={styles.title}>리포트</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.bodyTitle}>ReportScreen 초안</Text>
        <Text style={styles.description}>리포트 콘텐츠가 들어갈 본문 영역</Text>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16, backgroundColor: '#FFFFFF' },
  title: { color: '#18251E', fontSize: 24, fontWeight: '800' },
  body: { minHeight: 640, padding: 24, backgroundColor: '#F3F8F4' },
  bodyTitle: { color: '#315F3D', fontSize: 18, fontWeight: '800' },
  description: { marginTop: 8, color: '#6F8F77', fontSize: 13 },
});
