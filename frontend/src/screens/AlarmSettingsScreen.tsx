import { StyleSheet, Text, View } from 'react-native';

import AppScreen from '@/components/common/AppScreen';
import { AppHeader } from '@/components/common/header/AppHeader';

export default function AlarmSettingsScreen() {
  return (
    <AppScreen scrollable backgroundColor="#FFFFFF">
      <AppHeader showBackButton title="알림 설정" />
      <View style={styles.body}>
        <Text style={styles.bodyTitle}>AlarmSettingsScreen 초안</Text>
        <Text style={styles.description}>추천받아 등록한 위치 알림 목록이 들어갈 본문 영역</Text>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  body: { flexGrow: 1, padding: 24, backgroundColor: '#F3F8F4' },
  bodyTitle: { color: '#315F3D', fontSize: 18, fontWeight: '800' },
  description: { marginTop: 8, color: '#819087', fontSize: 13 },
});
