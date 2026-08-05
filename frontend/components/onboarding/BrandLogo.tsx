import { Image } from 'react-native';
import type { ImageStyle, StyleProp } from 'react-native';

interface BrandLogoProps {
  size: number;
  style?: StyleProp<ImageStyle>;
}

const logoSource = require('../../assets/akkiljido-logo.png');

export function BrandLogo({ size, style }: BrandLogoProps) {
  return (
    <Image
      accessibilityIgnoresInvertColors
      accessibilityLabel="아낄지도 캐릭터"
      resizeMode="contain"
      source={logoSource}
      style={[{ width: size, height: size * 1.025 }, style]}
    />
  );
}
