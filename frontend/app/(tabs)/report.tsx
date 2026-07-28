// 리포트 탭 기본 화면. 지금은 빈 placeholder이고 화면 중앙에 이름 텍스트만 표시한다.
import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/ui/Themed';

// 리포트 화면 컴포넌트 (추후 일일 리포트, 소비 패턴 기반 추천이 들어갈 자리)
export default function ReportScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>리포트 화면</Text>
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
