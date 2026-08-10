import Colors from '@/constants/Colors';

// 가장 연한 색부터 가장 진한 색(primary)까지의 그라데이션 기준점입니다.
// getAnalysisColor는 이 사이를 매끄럽게 보간해서, 5개 중 하나로 뚝뚝 끊기지 않고
// 비율에 따라 촘촘하게 이어지는 색을 만듭니다.
const ANALYSIS_COLORS = [
  '#DCEDD6',
  '#B8D9B0',
  '#8FBF8A',
  '#3F7A4C',
  Colors.light.primary,
];

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '');
  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (value: number) => Math.round(value).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// 두 색상 사이를 factor(0~1) 비율로 섞습니다.
function mixColors(colorA: string, colorB: string, factor: number): string {
  const [r1, g1, b1] = hexToRgb(colorA);
  const [r2, g2, b2] = hexToRgb(colorB);
  return rgbToHex(r1 + (r2 - r1) * factor, g1 + (g2 - g1) * factor, b1 + (b2 - b1) * factor);
}

/**
 * 가장 비중이 큰 항목일수록 진한 초록색을 사용합니다.
 * 차트와 범례가 같은 색을 계산하도록 비율과 해당 목록의 최대 비율을 함께 받습니다.
 * ANALYSIS_COLORS를 그라데이션 기준점 삼아, 비율이 두 기준점 사이 어디에 있는지에 따라
 * 그 두 색을 섞어서 연속적인 색을 만듭니다(고정된 5개 색상 중 하나로 스냅되지 않음).
 */
export function getAnalysisColor(percent: number, maxPercent: number) {
  if (maxPercent <= 0) return ANALYSIS_COLORS[0];

  const ratio = Math.max(0, Math.min(1, percent / maxPercent));
  const scaled = ratio * (ANALYSIS_COLORS.length - 1);
  const lowerIndex = Math.floor(scaled);
  const upperIndex = Math.min(lowerIndex + 1, ANALYSIS_COLORS.length - 1);
  const factor = scaled - lowerIndex;

  return mixColors(ANALYSIS_COLORS[lowerIndex], ANALYSIS_COLORS[upperIndex], factor);
}
