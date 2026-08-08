// 앱 전체 텍스트를 에이투지체 한 굵기로 통일하기 위한 기본 Text. react-native의 Text를
// 그대로 대체해서 쓴다 (props 형태는 동일). 화면마다 다르던 fontWeight 지정과 상관없이
// 항상 같은 굵기로 렌더링한다.
import { forwardRef } from 'react';
import { StyleSheet, Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { A2G_FONT_SIZE_SCALE, resolveA2GFontFamily } from '@/constants/fonts';

export const Text = forwardRef<RNText, TextProps>(({ style, ...rest }, ref) => {
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  const fontFamily = flat?.fontFamily ?? resolveA2GFontFamily();
  const fontSize = flat?.fontSize === undefined ? undefined : flat.fontSize * A2G_FONT_SIZE_SCALE;

  return <RNText ref={ref} {...rest} style={[style, { fontFamily, fontWeight: 'normal', fontSize }]} />;
});

Text.displayName = 'Text';

export default Text;
