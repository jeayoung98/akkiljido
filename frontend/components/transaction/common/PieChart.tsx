import { StyleProp, View, ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import Colors from '@/constants/Colors';
import { getAnalysisColor } from '@/components/transaction/common/analysisColors';

export type PieChartSlice = {
  /**
   * 색상을 조각/범례에 일관되게 배정하기 위한 key로도 씁니다.
   * 이름은 categoryId지만 카테고리 전용은 아닙니다 — percent만 있으면 어떤 데이터든 그릴 수
   * 있어서, 장소 분석(placeId)처럼 categories가 아닌 응답에도 그대로 씁니다.
   */
  categoryId: string | number;
  /** 분석 API의 percent(0~100, 반올림된 값)를 그대로 넣어주면 됩니다. */
  percent: number;
};

type PieChartProps = {
  data: PieChartSlice[];
  size?: number;
  style?: StyleProp<ViewStyle>;
};

const toRadians = (deg: number) => (deg * Math.PI) / 180;

// 12시 방향을 0%로 두고 시계 방향으로 도는 원 위의 좌표를 구합니다.
function getPointOnCircle(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = toRadians(angleDeg - 90);
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

/**
 * 분석 탭의 카테고리별 소비 비중을 원 그래프로 보여줍니다.
 * 차트 라이브러리 없이 react-native-svg의 Path(부채꼴)로 직접 그립니다.
 * percent 합이 반올림 때문에 100이 정확히 안 맞을 수 있어(예: 37+26+19+18=100이 아닐 수도 있음),
 * 조각을 그릴 때는 항상 실제 합계 기준으로 다시 정규화해서 원 전체가 항상 꽉 차게 합니다.
 */
export function PieChart({ data, size = 160, style }: PieChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;
  const total = data.reduce((sum, item) => sum + item.percent, 0);

  // 데이터가 없거나 전부 0%면 그릴 조각이 없으므로 테두리만 있는 빈 원으로 표시합니다.
  if (data.length === 0 || total <= 0) {
    return (
      <View style={style}>
        <Svg height={size} width={size}>
          <Circle cx={cx} cy={cy} fill="none" r={r - 1} stroke={Colors.light.border} strokeWidth={1} />
        </Svg>
      </View>
    );
  }

  let cumulativePercent = 0;
  const slices = data.map((item, index) => {
    const startAngle = (cumulativePercent / total) * 360;
    cumulativePercent += item.percent;
    const endAngle = (cumulativePercent / total) * 360;
    return { ...item, startAngle, endAngle, color: getAnalysisColor(index) };
  });

  return (
    <View style={style}>
      <Svg height={size} width={size}>
        {slices.length === 1 ? (
          // 조각이 하나뿐이면(카테고리 1개) 부채꼴 계산 없이 원 전체를 그 색으로 채웁니다.
          <Circle cx={cx} cy={cy} fill={slices[0].color} r={r} />
        ) : (
          slices.map((slice, index) => {
            const start = getPointOnCircle(cx, cy, r, slice.startAngle);
            const end = getPointOnCircle(cx, cy, r, slice.endAngle);
            // SVG arc는 180도가 넘는 부채꼴을 그릴 때 largeArcFlag를 1로 줘야 큰 쪽으로 돈다.
            const largeArcFlag = slice.endAngle - slice.startAngle > 180 ? 1 : 0;
            const path = `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`;
            return <Path d={path} fill={slice.color} key={slice.categoryId ?? index} />;
          })
        )}
      </Svg>
    </View>
  );
}
