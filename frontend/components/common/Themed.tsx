// 앱 색상(라이트 전용)이 자동 적용되는 가장 기초적인 Text/View 컴포넌트. 다크모드 개념은 쓰지 않는다.
import { Text as DefaultText, View as DefaultView } from "react-native";

import { useThemeColor } from "@/hooks/useThemeColor";

// Text/View에서 팔레트 기본색을 덮어쓰고 싶을 때 쓰는 공통 props
type ThemeProps = {
  color?: string;
};

export type TextProps = ThemeProps & DefaultText["props"];
export type ViewProps = ThemeProps & DefaultView["props"];

// 팔레트 색이 자동 적용되는 Text. 기본 RN Text를 대체해서 쓴다.
export function Text(props: TextProps) {
  const { style, color, ...otherProps } = props;
  const textColor = useThemeColor(color, "text");

  return <DefaultText style={[{ color: textColor }, style]} {...otherProps} />;
}

// 팔레트 배경색이 자동 적용되는 View. 기본 RN View를 대체해서 쓴다.
export function View(props: ViewProps) {
  const { style, color, ...otherProps } = props;
  const backgroundColor = useThemeColor(color, "background");

  return <DefaultView style={[{ backgroundColor }, style]} {...otherProps} />;
}
