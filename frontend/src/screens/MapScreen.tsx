import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

const markers = [
  { name: '버거킹', amount: '8,900원', top: '22%', left: '32%' },
  { name: '스타벅스 홍대점', amount: '12,000원', top: '46%', left: '17%' },
  { name: '올리브영', amount: '18,500원', top: '48%', left: '62%' },
  { name: 'GS25 편의점', amount: '5,500원', top: '66%', left: '39%' },
] as const;

export default function MapScreen() {
  const [filterOpen, setFilterOpen] = useState(false);
  return (
    <View style={styles.screen}>
      <View style={styles.searchRow}><View style={styles.search}><Text style={styles.searchIcon}>⌕</Text><TextInput style={styles.input} placeholder="장소, 주소 검색" placeholderTextColor="#819087" /></View><Pressable style={styles.filter} onPress={() => setFilterOpen(true)}><Text style={styles.filterText}>▽</Text></Pressable></View>
      <View style={styles.map}>
        <View style={[styles.road, { width: 18, height: '120%', left: '42%', transform: [{ rotate: '-2deg' }] }]} />
        <View style={[styles.road, { width: '120%', height: 16, top: '48%', transform: [{ rotate: '-3deg' }] }]} />
        <View style={[styles.road, { width: '110%', height: 12, top: '72%', transform: [{ rotate: '4deg' }] }]} />
        {markers.map((marker) => <View key={marker.name} style={[styles.marker, { top: marker.top, left: marker.left }]}><Text style={styles.markerName}>{marker.name}</Text><Text style={styles.markerAmount}>{marker.amount}</Text></View>)}
        <View style={styles.zoom}><Text style={styles.zoomText}>◇</Text><View style={styles.divider} /><Text style={styles.zoomText}>＋</Text><View style={styles.divider} /><Text style={styles.zoomText}>－</Text></View>
      </View>
      <View style={styles.bottomSheet}><View style={styles.handle} /><Text style={styles.sheetTitle}>✨ 내 장소 3개</Text></View>
      <MapFilter visible={filterOpen} onClose={() => setFilterOpen(false)} />
    </View>
  );
}

function MapFilter({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const categories = ['음식점', '카페·간식', '편의점·마트', '쇼핑', '여가', '교통', '건강·의료', '생활', '여행', '교육', '기타'];
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><View style={styles.overlay}><Pressable style={StyleSheet.absoluteFill} onPress={onClose} /><View style={styles.filterSheet}><View style={styles.filterHeader}><Text style={styles.filterTitle}>필터</Text><Pressable onPress={onClose}><Text style={styles.close}>×</Text></Pressable></View><Text style={styles.label}>기간 선택</Text><View style={styles.periodRow}>{['이번 달', '이번 주', '최근 3개월', '직접 선택'].map((item, i) => <View key={item} style={[styles.period, i === 0 && styles.selected]}><Text style={styles.periodText}>{i === 0 ? '● ' : '○ '}{item}</Text></View>)}</View><Text style={styles.label}>카테고리 선택</Text><View style={styles.categoryGrid}>{categories.map((item) => <View key={item} style={styles.category}><Text style={styles.categoryText}>▣ {item}</Text></View>)}</View><View style={styles.buttonRow}><Pressable style={styles.reset}><Text style={styles.resetText}>초기화</Text></Pressable><Pressable style={styles.apply} onPress={onClose}><Text style={styles.applyText}>적용하기</Text></Pressable></View></View></View></Modal>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#E7F0E9', paddingTop: 20 }, searchRow: { position: 'absolute', zIndex: 3, top: 26, left: 16, right: 16, flexDirection: 'row', gap: 8 }, search: { flex: 1, height: 40, flexDirection: 'row', alignItems: 'center', borderRadius: 20, backgroundColor: 'rgba(255,255,255,.9)', paddingHorizontal: 13 }, searchIcon: { color: '#268351', marginRight: 7 }, input: { flex: 1, fontSize: 11, color: '#18251E' }, filter: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' }, filterText: { color: '#268351', fontSize: 18 },
  map: { flex: 1, overflow: 'hidden' }, road: { position: 'absolute', backgroundColor: '#F9FCFA' }, marker: { position: 'absolute', minWidth: 70, paddingHorizontal: 9, paddingVertical: 7, alignItems: 'center', borderRadius: 12, backgroundColor: '#FFF', shadowColor: '#000', shadowOpacity: .12, shadowRadius: 5, elevation: 3 }, markerName: { fontSize: 9, fontWeight: '800', color: '#18251E' }, markerAmount: { fontSize: 9, fontWeight: '700', color: '#268351', marginTop: 2 }, zoom: { position: 'absolute', right: 14, top: 82, width: 38, borderRadius: 18, alignItems: 'center', backgroundColor: '#FFF', overflow: 'hidden' }, zoomText: { paddingVertical: 8, fontSize: 16, color: '#18251E' }, divider: { width: '100%', height: 1, backgroundColor: '#E1E9E4' }, bottomSheet: { height: 74, backgroundColor: '#FFF', borderTopLeftRadius: 22, borderTopRightRadius: 22, alignItems: 'center', paddingTop: 8 }, handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#D8E1DB' }, sheetTitle: { marginTop: 17, color: '#268351', fontSize: 11, fontWeight: '700' },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.42)' }, filterSheet: { padding: 20, paddingBottom: 28, backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24 }, filterHeader: { flexDirection: 'row', justifyContent: 'space-between' }, filterTitle: { fontSize: 18, fontWeight: '900', color: '#18251E' }, close: { fontSize: 26 }, label: { marginTop: 16, marginBottom: 8, fontSize: 12, fontWeight: '800' }, periodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, period: { width: '48%', paddingVertical: 8, borderRadius: 9, borderWidth: 1, borderColor: '#E1E9E4', alignItems: 'center' }, selected: { borderColor: '#268351', backgroundColor: '#EAF5EF' }, periodText: { fontSize: 10, color: '#268351' }, categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, category: { width: '31%', paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#268351', alignItems: 'center' }, categoryText: { fontSize: 9, color: '#268351' }, buttonRow: { flexDirection: 'row', gap: 10, marginTop: 20 }, reset: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#268351' }, resetText: { color: '#268351', fontWeight: '700' }, apply: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: '#268351' }, applyText: { color: '#FFF', fontWeight: '800' },
});
