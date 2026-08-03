import Colors from '@/constants/Colors';

const ANALYSIS_COLORS = [
  '#DCEDD6',
  '#B8D9B0',
  '#8FBF8A',
  '#3F7A4C',
  Colors.light.primary,
];

/**
 * 가장 비중이 큰 항목일수록 진한 초록색을 사용합니다.
 * 차트와 범례가 같은 색을 계산하도록 비율과 해당 목록의 최대 비율을 함께 받습니다.
 */
export function getAnalysisColor(percent: number, maxPercent: number) {
  if (maxPercent <= 0) return ANALYSIS_COLORS[0];

  const ratio = Math.max(0, Math.min(1, percent / maxPercent));
  const colorIndex = Math.round(ratio * (ANALYSIS_COLORS.length - 1));
  return ANALYSIS_COLORS[colorIndex];
}
