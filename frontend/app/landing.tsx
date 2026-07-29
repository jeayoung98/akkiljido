import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLockup } from '@/components/onboarding/BrandLockup';
import Colors from '@/constants/Colors';

export default function LandingScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const logoSize = Math.min(196, Math.max(180, width * 0.5));

  useEffect(() => {
    const timer = setTimeout(() => router.replace('/login'), 1200);

    return () => clearTimeout(timer);
  }, [router]);

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
