import {
  GoogleSignin,
  isSuccessResponse,
} from '@react-native-google-signin/google-signin';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from '@/components/common/typography/Text';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLockup } from '@/components/onboarding/BrandLockup';
import { GoogleIcon } from '@/components/onboarding/GoogleIcon';
import Colors from '@/constants/Colors';
import { loginWithGoogle } from '@/src/api/authApi';
import { saveAuthSession } from '@/src/auth/tokenStorage';
import { syncPushTokenRegistration } from '@/utils/pushNotifications';

const googleWebClientId =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

export default function LoginScreen() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const { height, width } = useWindowDimensions();

  const logoSize = Math.min(
    196,
    Math.max(180, width * 0.5),
  );

  const compact = height < 700;

  useEffect(() => {
    if (!googleWebClientId) {
      setErrorMessage(
        'Google Web Client ID가 설정되지 않았습니다.',
      );
      return;
    }

    GoogleSignin.configure({
      webClientId: googleWebClientId,
    });
  }, []);

  const handleGoogleLogin = async () => {
    if (loading) {
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');

      if (!googleWebClientId) {
        throw new Error(
          'Google 로그인 환경설정을 확인해주세요.',
        );
      }

      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      const googleResponse =
        await GoogleSignin.signIn();

      if (!isSuccessResponse(googleResponse)) {
        return;
      }

      const idToken =
        googleResponse.data.idToken;

      if (!idToken) {
        throw new Error(
          'Google ID Token이 발급되지 않았습니다.',
        );
      }

      const loginResult =
        await loginWithGoogle(idToken);

      await saveAuthSession(loginResult);

      console.info(
        '[auth] backend login success',
        {
          role: loginResult.role,
          tokensSaved: true,
        },
      );

      if (loginResult.role === 'GUEST') {
        router.replace('/nickname-setup');
        return;
      }

      if (loginResult.role === 'USER') {
        // 리포트 푸시를 받으려면 이 기기 토큰이 서버에 등록돼 있어야 한다.
        // 실패해도 로그인 자체는 막지 않으므로 기다리지 않고 넘어간다.
        void syncPushTokenRegistration();

        router.replace('/(tabs)');
        return;
      }

      throw new Error(
        '알 수 없는 사용자 역할입니다.',
      );
    } catch (error) {
      console.error(
        '[auth] Google login failed',
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Google 로그인에 실패했습니다.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={styles.safeArea}
    >
      <View
        style={[
          styles.content,
          compact && styles.compactContent,
        ]}
      >
        <View
          style={[
            styles.brandArea,
            compact && styles.compactBrandArea,
          ]}
        >
          <BrandLockup logoSize={logoSize} />
        </View>

        <Pressable
          accessibilityLabel="Google로 로그인"
          accessibilityRole="button"
          disabled={
            loading ||
            !googleWebClientId
          }
          onPress={handleGoogleLogin}
          style={({ pressed }) => [
            styles.googleButton,
            (loading || !googleWebClientId) &&
              styles.disabled,
            pressed &&
              !loading &&
              styles.pressed,
          ]}
        >
          {loading ? (
            <ActivityIndicator
              color={Colors.onboarding.text}
            />
          ) : (
            <>
              <GoogleIcon size={21} />

              <Text style={styles.googleText}>
                Google로 로그인
              </Text>
            </>
          )}
        </Pressable>

        {!!errorMessage && (
          <Text style={styles.errorText}>
            {errorMessage}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor:
      Colors.onboarding.surface,
  },

  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },

  compactContent: {
    paddingBottom: 20,
  },

  brandArea: {
    alignItems: 'center',
    marginTop: '14%',
  },

  compactBrandArea: {
    marginTop: 24,
  },

  googleButton: {
    alignItems: 'center',
    backgroundColor:
      Colors.onboarding.surface,
    borderColor: '#E2E7E3',
    borderRadius: 18,
    borderWidth:
      StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 13,
    height: 58,
    justifyContent: 'center',
    marginTop: 'auto',

    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.13,
    shadowRadius: 3,
    elevation: 3,
  },

  googleText: {
    color: Colors.onboarding.text,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 23,
  },

  pressed: {
    opacity: 0.78,
  },

  disabled: {
    opacity: 0.6,
  },

  errorText: {
    color: Colors.light.danger,
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
});