import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { IconButton } from '@/components/common/button/IconButton';
import Colors from '@/constants/Colors';

type MapZoomProps = {
  onZoomIn: () => void;
  onZoomOut: () => void;
  style?: StyleProp<ViewStyle>;
};

// 지도 확대/축소 버튼. 실제로 카카오맵 레벨을 바꾸는 건 이 컴포넌트가 하지 않고,
// 부모(지도 화면)가 onZoomIn/onZoomOut을 받아서 KakaoMap과 연결한다.
export function MapZoom({ onZoomIn, onZoomOut, style }: MapZoomProps) {
  return (
    <View style={[styles.container, style]}>
      <IconButton name="zoomIn" color={Colors.light.primary} onPress={onZoomIn} style={styles.button} />
      <View style={styles.divider} />
      <IconButton name="zoomOut" color={Colors.light.primary} onPress={onZoomOut} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  button: {
    padding: 10,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.border,
  },
});
