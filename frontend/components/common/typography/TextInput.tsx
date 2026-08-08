// 앱 전체 입력창을 에이투지체 한 굵기로 통일하기 위한 기본 TextInput. react-native의
// TextInput을 그대로 대체해서 쓴다 (props 형태는 동일). Text.tsx와 같이 항상 같은 굵기로
// 렌더링한다.
// components/common/input/TextInput.tsx(라벨·오류 문구가 있는 폼 입력 컴포넌트)와
// import할 때 이름이 헷갈리지 않도록 NativeTextInput으로 내보낸다.
import { forwardRef } from 'react';
import { StyleSheet, TextInput as RNTextInput, type TextInputProps, type TextStyle } from 'react-native';

import { A2G_FONT_SIZE_SCALE, resolveA2GFontFamily } from '@/constants/fonts';

export const NativeTextInput = forwardRef<RNTextInput, TextInputProps>(({ style, ...rest }, ref) => {
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  const fontFamily = flat?.fontFamily ?? resolveA2GFontFamily();
  const fontSize = flat?.fontSize === undefined ? undefined : flat.fontSize * A2G_FONT_SIZE_SCALE;

  return <RNTextInput ref={ref} {...rest} style={[style, { fontFamily, fontWeight: 'normal', fontSize }]} />;
});

NativeTextInput.displayName = 'NativeTextInput';

export default NativeTextInput;
