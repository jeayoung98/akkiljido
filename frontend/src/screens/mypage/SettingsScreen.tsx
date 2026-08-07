import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Alert, Linking, StyleSheet, Text, View } from 'react-native';

import AppScreen from '@/components/common/AppScreen';
import InfoListItem from '@/components/common/card/InfoListItem';
import { AppHeader } from '@/components/common/header/AppHeader';
import { Switch } from '@/components/my/Switch';
import Colors from '@/constants/Colors';
import { useDevModeStore } from '@/store/devModeStore';
import { startBackgroundLocationTracking, stopBackgroundLocationTracking } from '@/utils/backgroundLocationTask';
import { clearPresentedNotifications } from '@/utils/localNotifications';

/** 마이페이지 > 설정 화면입니다. 알람·위치 권한 스위치는 실제 OS 권한 상태를 그대로 보여줍니다. */
export default function SettingsScreen() {
  const [alarmPermission, setAlarmPermission] = useState(false);
  // 이 앱은 foreground 위치 권한만 요청한다(MapScreen 등 전부 requestForegroundPermissionsAsync만 사용,
  // background/always 권한은 요청하는 곳이 없다). 그래서 foreground 권한 상태만 확인하면 충분하다.
  const [locationPermission, setLocationPermission] = useState(false);
  // 설정 앱을 열어 권한을 바꾼 뒤 돌아왔을 때만 위치 감시를 다시 시작합니다.
  const shouldResumeTrackingRef = useRef(false);
  const isDevMode = useDevModeStore((state) => state.isDevMode);
  const setDevMode = useDevModeStore((state) => state.setDevMode);

  // 스위치는 로컬 state가 아니라 실제 OS 알림/위치 권한 상태를 그대로 보여준다.
  const syncAlarmPermission = useCallback(async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setAlarmPermission(status === 'granted');
    } catch (error) {
      console.error('[settings] notification permission check failed', error);
    }
  }, []);

  const syncLocationPermission = useCallback(async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
    } catch (error) {
      console.error('[settings] location permission check failed', error);
    }
  }, []);

  useEffect(() => {
    syncAlarmPermission();
    syncLocationPermission();
  }, [syncAlarmPermission, syncLocationPermission]);

  useEffect(() => {
    // 설정 앱에서 권한을 바꾸고 이 화면으로 돌아왔을 때도 스위치가 실제 상태를 따라가게 한다.
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        syncAlarmPermission();
        syncLocationPermission();
        if (shouldResumeTrackingRef.current) {
          shouldResumeTrackingRef.current = false;
          void startBackgroundLocationTracking();
        }
      }
    });
    return () => subscription.remove();
  }, [syncAlarmPermission, syncLocationPermission]);

  const handleAlarmPermissionChange = async (next: boolean) => {
    if (next) {
      try {
        const { status, canAskAgain } = await Notifications.requestPermissionsAsync();
        if (status === 'granted') {
          setAlarmPermission(true);
          void startBackgroundLocationTracking();
          return;
        }
        // OS가 다시 물어볼 수 없는 상태(한 번 거부됨)면 앱 안에서는 더 할 수 있는 게 없어 설정 앱으로 안내한다.
        if (!canAskAgain) {
          Alert.alert('알람 권한이 꺼져 있어요', '설정 앱에서 알람 권한을 켜주세요.', [
            { text: '취소', style: 'cancel' },
            { text: '설정으로 이동', onPress: () => Linking.openSettings() },
          ]);
        }
      } catch (error) {
        console.error('[settings] notification permission request failed', error);
      }
      return;
    }

  // OS 알림 권한은 앱에서 직접 끌 수 없어서, 설정 앱으로 안내하고 스위치는 실제 상태(켜짐)로 되돌린다.
    // 설정 앱으로 이동하기 전에도 상시 위치 감시는 바로 멈춰, 사용자가 원치 않는 추적이 계속되지 않게 합니다.
    shouldResumeTrackingRef.current = true;
    void stopBackgroundLocationTracking();
    void clearPresentedNotifications();
    Alert.alert('알람 권한 끄기', '알람 권한은 설정 앱에서 꺼야 해요.', [
      {
        text: '취소',
        style: 'cancel',
        onPress: () => {
          shouldResumeTrackingRef.current = false;
          void startBackgroundLocationTracking();
        },
      },
      { text: '설정으로 이동', onPress: () => Linking.openSettings() },
    ]);
    setAlarmPermission(true);
  };

  const handleLocationPermissionChange = async (next: boolean) => {
    if (next) {
      try {
        const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          setLocationPermission(true);
          void startBackgroundLocationTracking();
          return;
        }
        if (!canAskAgain) {
          Alert.alert('위치 권한이 꺼져 있어요', '설정 앱에서 위치 권한을 켜주세요.', [
            { text: '취소', style: 'cancel' },
            { text: '설정으로 이동', onPress: () => Linking.openSettings() },
          ]);
        }
      } catch (error) {
        console.error('[settings] location permission request failed', error);
      }
      return;
    }

  // OS 위치 권한도 앱에서 직접 끌 수 없어서, 설정 앱으로 안내하고 스위치는 실제 상태(켜짐)로 되돌린다.
    // 위치 권한을 끄려는 의사를 표시한 시점에 포그라운드 서비스부터 종료합니다.
    shouldResumeTrackingRef.current = true;
    void stopBackgroundLocationTracking();
    Alert.alert('위치 권한 끄기', '위치 권한은 설정 앱에서 꺼야 해요.', [
      {
        text: '취소',
        style: 'cancel',
        onPress: () => {
          shouldResumeTrackingRef.current = false;
          void startBackgroundLocationTracking();
        },
      },
      { text: '설정으로 이동', onPress: () => Linking.openSettings() },
    ]);
    setLocationPermission(true);
  };

  return (
    <AppScreen backgroundColor={Colors.light.background}>
      <AppHeader showBackButton title="설정" />

      <View style={styles.content}>
        <View style={styles.card}>
          <InfoListItem
            accessibilityLabel="알람 권한"
            title="알람 권한"
            trailing={<Switch onValueChange={handleAlarmPermissionChange} value={alarmPermission} />}
          />
          <View style={styles.divider} />
          <InfoListItem
            accessibilityLabel="위치 권한"
            title="위치 권한"
            trailing={<Switch onValueChange={handleLocationPermissionChange} value={locationPermission} />}
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
