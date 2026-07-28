// 내역 탭 기본 화면. 지금은 빈 placeholder이고 화면 중앙에 이름 텍스트만 표시한다.
import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/ui/Themed';

// 내역 화면 컴포넌트 (추후 거래 리스트/캘린더/분석 세그먼트와 상세·추가 화면 진입점이 들어갈 자리)
export default function ListScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>내역 화면</Text>
    </View>
  );
}

// 화면 중앙 정렬 레이아웃과 타이틀 텍스트 스타일
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
