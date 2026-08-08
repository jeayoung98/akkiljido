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

const SPLASH_DURATION_MS = 1200;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

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

      const restoreSession = async () => {
        try {
          /*
           * 스플래시 화면을 최소 1.2초 동안 보여주는 동시에
           * SecureStore에서 인증 세션을 읽는다.
           */
          const [session] = await Promise.all([
            getAuthSession(),
            wait(SPLASH_DURATION_MS),
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