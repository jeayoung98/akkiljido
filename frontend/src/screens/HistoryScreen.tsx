import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const data = [
  ['2024.07.17', '☕', '스타벅스 강남역점', '카페·간식', '-4,500원'],
  ['2024.07.17', '📦', '쿠팡 로켓배송', '쇼핑', '-32,000원'],
  ['2024.07.16', '🏪', 'GS25 편의점', '편의점', '-2,300원'],
  ['2024.07.16', '💳', '네이버페이', '기타', '+100,000원'],
  ['2024.07.15', '🛍️', '올리브영', '쇼핑', '-18,500원'],
] as const;

export default function HistoryScreen() {
  const [filterOpen, setFilterOpen] = useState(false);
  return (
    <View style={styles.screen}>
      <View style={styles.header}><Text style={styles.heading}>내역</Text><View style={styles.actions}><Text style={styles.icon}>⌕</Text><Pressable onPress={() => setFilterOpen(true)}><Text style={styles.icon}>▽</Text></Pressable></View></View>
      <View style={styles.tabs}><Text style={styles.activeTab}>리스트</Text><Text style={styles.tab}>캘린더</Text><Text style={styles.tab}>분석</Text></View>
      <ScrollView contentContainerStyle={styles.list}>
        {data.map(([date, icon, place, category, amount], index) => (
          <React.Fragment key={`${place}-${index}`}>
            {(index === 0 || data[index - 1][0] !== date) && <View style={styles.dateRow}><Text style={styles.date}>{date}</Text></View>}
            <Pressable style={styles.transaction}>
              <View style={styles.transactionIcon}><Text>{icon}</Text></View>
              <View style={styles.transactionText}><Text style={styles.place}>{place}</Text><Text style={styles.category}>{category}</Text></View>
              <Text style={[styles.amount, amount.startsWith('+') && styles.income]}>{amount}</Text>
            </Pressable>
          </React.Fragment>
        ))}
      </ScrollView>
      <FilterModal visible={filterOpen} onClose={() => setFilterOpen(false)} />
    </View>
  );
}

function FilterModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const categories = ['식비', '카페·간식', '생활·마트', '쇼핑', '여가', '교통', '건강·의료', '생활', '여행', '교육', '기타'];
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.overlay}><Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHeader}><Text style={styles.heading}>내역 필터</Text><Pressable onPress={onClose}><Text style={styles.close}>×</Text></Pressable></View>
        <FilterRow title="정렬" labels={['● 최신순', '○ 과거순']} />
        <FilterRow title="소비/소득" labels={['○ 전체', '● 소비', '○ 소득']} />
        <FilterRow title="기간" labels={['● 이번 달', '○ 최근 3개월', '○ 직접 설정']} />
        <Text style={styles.filterTitle}>카테고리</Text><View style={styles.categoryGrid}>{categories.map((item) => <View key={item} style={styles.categoryChip}><Text style={styles.chipText}>▣ {item}</Text></View>)}</View>
        <Pressable style={styles.apply} onPress={onClose}><Text style={styles.applyText}>필터 적용</Text></Pressable>
      </View>
    </View>
  </Modal>;
}

function FilterRow({ title, labels }: { title: string; labels: string[] }) {
  return <View><Text style={styles.filterTitle}>{title}</Text><View style={styles.chipRow}>{labels.map((label, i) => <View key={label} style={[styles.chip, i === 0 && styles.chipActive]}><Text style={styles.chipText}>{label}</Text></View>)}</View></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F9F8', paddingTop: 22 }, header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 18 }, heading: { fontSize: 18, fontWeight: '900', color: '#18251E' }, actions: { flexDirection: 'row', gap: 16 }, icon: { color: '#268351', fontSize: 20 },
  tabs: { flexDirection: 'row', gap: 34, paddingHorizontal: 18, marginTop: 20, borderBottomWidth: 1, borderBottomColor: '#E1E9E4' }, tab: { color: '#819087', fontSize: 11, paddingBottom: 10 }, activeTab: { color: '#268351', fontSize: 11, fontWeight: '700', paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: '#268351' },
  list: { paddingHorizontal: 16, paddingBottom: 24 }, dateRow: { marginTop: 15, marginBottom: 4 }, date: { color: '#819087', fontSize: 9 }, transaction: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E1E9E4' }, transactionIcon: { width: 35, height: 35, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF5EF', marginRight: 10 }, transactionText: { flex: 1 }, place: { fontSize: 12, fontWeight: '700', color: '#18251E' }, category: { marginTop: 2, fontSize: 9, color: '#819087' }, amount: { fontSize: 11, fontWeight: '700', color: '#18251E' }, income: { color: '#268351' },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.42)' }, sheet: { padding: 20, paddingBottom: 28, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: '#FFF' }, sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, close: { fontSize: 26 }, filterTitle: { marginTop: 15, marginBottom: 8, fontSize: 12, fontWeight: '800', color: '#18251E' }, chipRow: { flexDirection: 'row', gap: 8 }, chip: { flex: 1, alignItems: 'center', paddingVertical: 8, borderWidth: 1, borderColor: '#E1E9E4', borderRadius: 9 }, chipActive: { borderColor: '#268351', backgroundColor: '#EAF5EF' }, chipText: { color: '#268351', fontSize: 10 }, categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, categoryChip: { width: '31%', alignItems: 'center', paddingVertical: 8, borderWidth: 1, borderColor: '#268351', borderRadius: 8, backgroundColor: '#F7FBF8' }, apply: { marginTop: 18, paddingVertical: 14, alignItems: 'center', borderRadius: 13, backgroundColor: '#268351' }, applyText: { color: '#FFF', fontWeight: '800' },
});
