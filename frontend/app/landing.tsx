import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLockup } from '@/components/onboarding/BrandLockup';
import Colors from '@/constants/Colors';

// 앱 실행 후 브랜드 로고를 잠시 보여주고 로그인 화면으로 이동하는 랜딩 화면
export default function LandingScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();

  // 화면 크기에 따라 로고 크기를 자동으로 조절하여 다양한 기기에서도 비슷한 비율로 표시한다.
  const logoSize = Math.min(196, Math.max(180, width * 0.5));

  // 1.2초 후 로그인 화면으로 이동한다.
  // replace()를 사용해 랜딩 화면이 뒤로가기 기록에 남지 않도록 한다.
  // /test로 직접 들어갈 때는 initialRouteName 때문에 landing이 보이지 않게 같이 마운트되는데,
  // 이 화면 확인 중엔 스플래시가 끼어들면 안 되니 예외로 타이머를 건너뛴다.
  useEffect(() => {
    if (pathname === '/test') {
      return;
    }

    const timer = setTimeout(() => router.replace('/login'), 1200);

    return () => clearTimeout(timer);
  }, [router, pathname]);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.content}>
        <BrandLockup logoSize={logoSize} tone="light" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.onboarding.green,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 32,
  },
});
