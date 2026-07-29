// Colors.ts 팔레트에서 색을 가져오는 훅. UI 컴포넌트가 화면에 그릴 색을 계산할 때 쓴다.
import Colors from "@/constants/Colors";

// color prop이 있으면 그걸 우선 쓰고, 없으면 팔레트에서 colorName에 해당하는 값을 반환
export function useThemeColor(color: string | undefined, colorName: keyof typeof Colors.light) {
  return color ?? Colors.light[colorName];
}
