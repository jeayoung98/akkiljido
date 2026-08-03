import Colors from '@/constants/Colors';

// 분석 API의 categories 배열 순서대로 배정하는 색상 팔레트입니다.
// PieChart와 AnalysisLegend가 이 파일을 같이 가져다 써서, 같은 인덱스(같은 카테고리)는
// 차트 조각과 범례 점이 항상 같은 색이 되도록 맞춥니다. 브랜드 컬러(초록) 톤 차이로만 구성했습니다.
export const ANALYSIS_COLORS = [
  Colors.light.primary,
  '#3F7A4C',
  '#8FBF8A',
  '#B8D9B0',
  '#DCEDD6',
  Colors.light.cardAccent,
];

export function getAnalysisColor(index: number) {
  return ANALYSIS_COLORS[index % ANALYSIS_COLORS.length];
}
