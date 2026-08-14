import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/common/typography/Text';
import { BrandLogo } from './BrandLogo';
import Colors from '@/constants/Colors';

interface BrandLockupProps {
  logoSize: number;
  tone?: 'light' | 'light';
}

export function BrandLockup({
  logoSize,
  tone = 'light',
}: BrandLockupProps) {
  const isLight = tone === 'light';

  return (
    <View style={styles.container}>
      <BrandLogo size={logoSize} />
      <Text style={[styles.title, isLight && styles.lightText]}>아낄지도</Text>
      <Text style={[styles.tagline, isLight && styles.lightTagline]}>
        지도 보면,{'\n'}아낄지도.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  title: {
    color: Colors.onboarding.text,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 37,
    marginTop: 26,
    textAlign: 'center',
  },
  tagline: {
    color: Colors.onboarding.tagline,
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 25,
    marginTop: 9,
    textAlign: 'center',
  },
  lightText: {
    color: Colors.onboarding.inverseText,
  },
  lightTagline: {
    color: Colors.onboarding.lightText,
  },
});
