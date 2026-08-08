import { useCallback } from 'react';
import {
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLockup } from '@/components/onboarding/BrandLockup';
import Colors from '@/constants/Colors';
import { getAuthSession } from '@/src/auth/tokenStorage';
import { syncPushTokenRegistration } from '@/utils/pushNotifications';

const SPLASH_DURATION_MS = 1200;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

// 모듈 스코프 플래그입니다. 앱이 켜져 있는 동안(콜드 스타트 ~ 프로세스 종료) 딱 한 번만
// 스플래시 연출(1.2초 대기)을 보여주기 위한 값이라, 컴포넌트 상태로 두면 안 됩니다.
// 뒤로가기로 이 화면에 다시 들어오면 컴포넌트는 리마운트되지 않을 수도, 될 수도 있지만
// 어느 쪽이든 모듈 스코프 값은 그대로 유지되어 "이미 한 번 보여줬다"는 사실이 안 사라집니다.
let hasShownSplashOnce = false;

export default function LandingScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const logoSize = Math.min(
    196,
    Math.max(180, width * 0.5),
  );

  // 뒤로가기로 이 화면에 다시 들어왔을 때도 세션 확인·리다이렉트가 다시 실행되어야 한다.
  // useEffect(마운트 시 1회)만 쓰면, 처음 진입해서 이미 한 번 실행된 뒤로는 화면이 다시
  // 포커스를 받아도(언마운트되지 않고 그대로 남아있는 경우) 아무 반응이 없어 스플래시
  // 화면에 멈춰 있는 것처럼 보인다.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      // 최초 진입일 때만 1.2초 연출을 넣는다. 뒤로가기/재진입으로 다시 포커스를 받은
      // 경우에는 스플래시가 다시 "보이면" 안 되므로, 인위적인 대기 없이 세션만 빠르게
      // 다시 확인하고 바로 리다이렉트한다.
      const isFirstRun = !hasShownSplashOnce;
      hasShownSplashOnce = true;

      const restoreSession = async () => {
        try {
          /*
           * 최초 진입일 때만 스플래시 화면을 최소 1.2초 동안 보여주는 동시에
           * SecureStore에서 인증 세션을 읽는다.
           */
          const [session] = await Promise.all([
            getAuthSession(),
            isFirstRun ? wait(SPLASH_DURATION_MS) : Promise.resolve(),
          ]);

          if (cancelled) {
            return;
          }

          if (!session) {
            console.info(
              '[auth] no saved session',
            );

            router.replace('/login');
            return;
          }

          console.info(
            '[auth] saved session restored',
            {
              role: session.role,
              hasAccessToken:
                Boolean(session.accessToken),
              hasRefreshToken:
                Boolean(session.refreshToken),
            },
          );

          if (session.role === 'GUEST') {
            router.replace('/nickname-setup');
            return;
          }

          if (session.role === 'USER') {
            // FCM 토큰은 OS가 재발급할 수 있어서, 자동 로그인으로 들어올 때도 매번 다시 등록한다.
            void syncPushTokenRegistration();

            router.replace('/(tabs)');
            return;
          }

          router.replace('/login');
        } catch (error) {
          console.error(
            '[auth] session restore failed',
            error,
          );

          if (!cancelled) {
            router.replace('/login');
          }
        }
      };

      void restoreSession();

      return () => {
        cancelled = true;
      };
    }, [router]),
  );

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={styles.safeArea}
    >
      <View style={styles.content}>
        <BrandLockup
          logoSize={logoSize}
          tone="light"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor:
      Colors.onboarding.green,
  },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 32,
  },
});
