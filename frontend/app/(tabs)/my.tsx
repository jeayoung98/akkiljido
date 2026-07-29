// 마이 탭 기본 화면. 지금은 빈 placeholder이고 화면 중앙에 이름 텍스트만 표시한다.
import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/ui/Themed';

// 마이페이지 화면 컴포넌트 (추후 프로필, 내 장소 관리, 설정 진입점이 들어갈 자리)
export default function MyScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>마이페이지 화면</Text>
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
