// 앱 전체 입력창을 에이투지체 한 굵기로 통일하기 위한 기본 TextInput. react-native의
// TextInput을 그대로 대체해서 쓴다 (props 형태는 동일). Text.tsx와 같이 항상 같은 굵기로
// 렌더링한다.
import { forwardRef } from 'react';
import { StyleSheet, TextInput as RNTextInput, type TextInputProps, type TextStyle } from 'react-native';

import { A2G_FONT_SIZE_SCALE, resolveA2GFontFamily } from '@/constants/fonts';

export const TextInput = forwardRef<RNTextInput, TextInputProps>(({ style, ...rest }, ref) => {
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  const fontFamily = flat?.fontFamily ?? resolveA2GFontFamily();
  const fontSize = flat?.fontSize === undefined ? undefined : flat.fontSize * A2G_FONT_SIZE_SCALE;

  return <RNTextInput ref={ref} {...rest} style={[style, { fontFamily, fontWeight: 'normal', fontSize }]} />;
});

TextInput.displayName = 'TextInput';

export default TextInput;
