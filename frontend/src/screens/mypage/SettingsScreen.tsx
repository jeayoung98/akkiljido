import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import AppScreen from '@/components/common/AppScreen';
import InfoListItem from '@/components/common/card/InfoListItem';
import { AppHeader } from '@/components/common/header/AppHeader';
import { Switch } from '@/components/my/Switch';
import Colors from '@/constants/Colors';
import { useDevModeStore } from '@/store/devModeStore';

/**
 * 마이페이지 > 설정 화면입니다. 알람·위치 권한 스위치는 아직 실제 OS 권한 요청과 연결하지 않고
 * 화면 동작만 먼저 확인하는 단계라 로컬 상태로만 관리합니다. 실제 권한 연동은 이후 작업입니다.
 */
export default function SettingsScreen() {
  const [alarmPermission, setAlarmPermission] = useState(true);
  const [locationPermission, setLocationPermission] = useState(true);
  const isDevMode = useDevModeStore((state) => state.isDevMode);
  const setDevMode = useDevModeStore((state) => state.setDevMode);

  return (
    <AppScreen backgroundColor={Colors.light.background}>
      <AppHeader showBackButton title="설정" />

      <View style={styles.content}>
        <View style={styles.card}>
          <InfoListItem
            accessibilityLabel="알람 권한"
            title="알람 권한"
            trailing={<Switch onValueChange={setAlarmPermission} value={alarmPermission} />}
          />
          <View style={styles.divider} />
          <InfoListItem
            accessibilityLabel="위치 권한"
            title="위치 권한"
            trailing={<Switch onValueChange={setLocationPermission} value={locationPermission} />}
          />
          <View style={styles.divider} />
          {/* 켜져 있으면 홈 화면에 진입할 때마다 주간/월간 리포트가 1회 제한 없이 표시된다(리포트 로직 개발용). */}
          <InfoListItem
            accessibilityLabel="개발자 모드"
            title="개발자 모드"
            trailing={<Switch onValueChange={setDevMode} value={isDevMode} />}
          />
          <View style={styles.divider} />
          <InfoListItem title="버전 정보" trailing={<Text style={styles.versionText}>v1.0.0</Text>} />
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
  },
  card: {
    borderRadius: 16,
    backgroundColor: Colors.light.cardBackground,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
    backgroundColor: Colors.light.border,
  },
  versionText: {
    color: Colors.light.textSecondary,
    fontSize: 14,
  },
});
