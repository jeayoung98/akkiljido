// 앱 전체 텍스트를 에이투지체(A2G) 한 굵기로 통일하기 위한 폰트 자산.
// components/common/typography/Text.tsx, TextInput.tsx가 기존 fontWeight 지정과
// 상관없이 항상 이 굵기 하나로 렌더링한다.

export const A2G_FONT_ASSETS = {
  'A2G-Medium': require('@/assets/fonts/A2G/A2G-Medium.ttf'),
} as const;

export type A2GFontFamily = keyof typeof A2G_FONT_ASSETS;

export const DEFAULT_A2G_FONT_FAMILY: A2GFontFamily = 'A2G-Medium';

// 에이투지체는 시스템 기본 폰트보다 같은 fontSize에서 글자가 더 크게 그려져서,
// 기존 화면들의 체감 크기를 맞추려고 지정된 fontSize에 이 비율을 곱해 살짝 줄인다.
export const A2G_FONT_SIZE_SCALE = 0.8;

/**
 * 항상 기본 A2G 굵기를 반환한다. 커스텀 폰트 파일 자체가 이미 이 굵기라,
 * 반환값과 함께 fontWeight는 'normal'로 되돌려야 안드로이드에서 이중으로
 * 두꺼워지는 걸 막을 수 있다.
 */
export function resolveA2GFontFamily(): A2GFontFamily {
  return DEFAULT_A2G_FONT_FAMILY;
}
