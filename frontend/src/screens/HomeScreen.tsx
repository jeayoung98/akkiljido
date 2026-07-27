import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const spending = [
  ['식비', '182,000원', 72], ['쇼핑', '98,000원', 52], ['교통', '58,000원', 34], ['문화', '56,000원', 31],
] as const;

export default function HomeScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.header}><Text style={styles.greeting}>🗺️  안녕하세요, Dust 👋</Text><Text>🔔</Text></View>
        <Pressable style={styles.todayCard}>
          <Text style={styles.captionLight}>오늘 지출액</Text>
          <Text style={styles.todayAmount}>28,500<Text style={styles.won}> 원</Text></Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        <Text style={styles.title}>내 주변 7일간 지출</Text>
        <Text style={styles.caption}>현재 위치 기준 2km 이내 · 총 134,850원</Text>
        <View style={styles.mapCard}>
          <Text style={styles.map}>🗺️</Text>
          <View style={[styles.bubble, { left: 24, top: 25 }]}><Text style={styles.bubbleText}>☕ 21,500원</Text></View>
          <View style={[styles.bubble, { right: 24, top: 34 }]}><Text style={styles.bubbleText}>🍔 14,500원</Text></View>
          <View style={[styles.bubble, { left: 42, bottom: 26 }]}><Text style={styles.bubbleText}>🛍️ 42,000원</Text></View>
          <View style={styles.location} />
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.rowBetween}><Text style={styles.title}>카테고리별 지출</Text><Text style={styles.more}>더보기</Text></View>
          {spending.map(([label, amount, percent]) => (
            <View key={label} style={styles.spendingRow}>
              <View style={styles.rowBetween}><Text style={styles.label}>{label}</Text><Text style={styles.amount}>{amount}</Text></View>
              <View style={styles.track}><View style={[styles.fill, { width: `${percent}%` }]} /></View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F8F6' }, content: { paddingBottom: 28 },
  hero: { backgroundColor: '#268351', padding: 18, paddingTop: 24 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { color: '#FFF', fontSize: 13, fontWeight: '700' }, todayCard: { marginTop: 14, padding: 16, borderRadius: 13, backgroundColor: 'rgba(255,255,255,.18)' },
  captionLight: { color: 'rgba(255,255,255,.78)', fontSize: 11 }, todayAmount: { color: '#FFF', fontSize: 28, fontWeight: '900', marginTop: 4 }, won: { fontSize: 13 },
  body: { padding: 16 }, title: { color: '#18251E', fontSize: 14, fontWeight: '800' }, caption: { color: '#819087', fontSize: 10, marginTop: 4 },
  mapCard: { height: 190, marginTop: 12, borderRadius: 16, backgroundColor: '#DFEAE2', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, map: { fontSize: 120, opacity: .25 },
  bubble: { position: 'absolute', backgroundColor: '#FFF', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 12 }, bubbleText: { fontSize: 9, fontWeight: '700' },
  location: { position: 'absolute', width: 18, height: 18, borderRadius: 9, borderWidth: 5, borderColor: '#FFF', backgroundColor: '#318EFF' },
  summaryCard: { marginTop: 14, padding: 16, borderRadius: 15, backgroundColor: '#FFF' }, rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, more: { color: '#268351', fontSize: 10 },
  spendingRow: { marginTop: 13 }, label: { fontSize: 11, color: '#18251E' }, amount: { fontSize: 10, fontWeight: '600', color: '#18251E' },
  track: { height: 5, borderRadius: 3, backgroundColor: '#EAF5EF', marginTop: 6, overflow: 'hidden' }, fill: { height: '100%', borderRadius: 3, backgroundColor: '#268351' },
});
