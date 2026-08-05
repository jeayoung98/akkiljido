import { useEffect } from 'react';
import {
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
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

  useEffect(() => {
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
  }, [router]);

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