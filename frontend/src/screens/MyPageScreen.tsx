import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function MyPageScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.heading}>마이페이지</Text>
      <View style={styles.profile}><View style={styles.avatar}><Text style={styles.avatarText}>🗺️</Text></View><View><Text style={styles.name}>Dust</Text><Text style={styles.nickname}>닉네임 수정  ✎</Text></View></View>
      <View style={styles.menuCard}>
        <MenuRow icon="♧" label="내 장소 관리" />
        <View style={styles.divider} />
        <MenuRow icon="⚙" label="설정" />
        <View style={styles.divider} />
        <MenuRow icon="↪" label="로그아웃" danger />
      </View>
      <Text style={styles.version}>v1.0.0 · 아낄지도</Text>
    </View>
  );
}

function MenuRow({ icon, label, danger = false }: { icon: string; label: string; danger?: boolean }) {
  return <Pressable style={styles.menuRow}><Text style={[styles.menuIcon, danger && styles.danger]}>{icon}</Text><Text style={[styles.menuLabel, danger && styles.danger]}>{label}</Text><Text style={styles.arrow}>›</Text></Pressable>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F9F8', padding: 18, paddingTop: 34 }, heading: { fontSize: 18, fontWeight: '900', color: '#18251E' }, profile: { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 24 }, avatar: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF5EF', marginRight: 12 }, avatarText: { fontSize: 28 }, name: { fontSize: 17, fontWeight: '900', color: '#18251E' }, nickname: { marginTop: 4, fontSize: 10, color: '#268351' }, menuCard: { borderRadius: 15, backgroundColor: '#FFF', overflow: 'hidden', borderWidth: 1, borderColor: '#E1E9E4' }, menuRow: { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 }, menuIcon: { width: 24, color: '#268351', fontSize: 15 }, menuLabel: { flex: 1, color: '#18251E', fontSize: 12, fontWeight: '600' }, arrow: { color: '#819087', fontSize: 18 }, divider: { height: 1, backgroundColor: '#E1E9E4', marginHorizontal: 14 }, danger: { color: '#FF5B61' }, version: { marginTop: 16, textAlign: 'center', color: '#8AB49B', fontSize: 9 },
});
