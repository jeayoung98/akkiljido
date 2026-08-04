import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLockup } from '@/components/onboarding/BrandLockup';
import { GoogleIcon } from '@/components/onboarding/GoogleIcon';
import Colors from '@/constants/Colors';

// 사용자가 Google 계정으로 로그인할 수 있는 화면
export default function LoginScreen() {
  const router = useRouter();
  const { height, width } = useWindowDimensions();
  const logoSize = Math.min(196, Math.max(180, width * 0.5));
  const compact = height < 700;

  // Google 로그인 성공 시 다음 화면으로 이동한다.
  const handleGoogleLogin = () => {
    // TODO: Google OAuth 연동 완료 후 인증 성공 콜백에서 이동하도록 교체한다.
    router.replace('/nickname-setup');
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={[styles.content, compact && styles.compactContent]}>
        <View style={[styles.brandArea, compact && styles.compactBrandArea]}>
          <BrandLockup logoSize={logoSize} />
        </View>

        <Pressable
          accessibilityLabel="Google로 로그인"
          accessibilityRole="button"
          onPress={handleGoogleLogin}
          style={({ pressed }) => [
            styles.googleButton,
            pressed && styles.pressed,
          ]}
        >
          <GoogleIcon size={21} />
          <Text style={styles.googleText}>Google로 로그인</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.onboarding.surface,
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
    backgroundColor: Colors.onboarding.surface,
    borderColor: '#E2E7E3',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 13,
    height: 58,
    justifyContent: 'center',
    marginTop: 'auto',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
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
});
