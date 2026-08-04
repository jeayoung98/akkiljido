// 카카오맵 레벨(1~14)을 지도 클러스터링 4단계로 변환하는 기준표.
// 레벨이 작을수록 확대(가까움), 클수록 축소(멀리서 봄).
//
// 카카오 레벨 | 실제 축척      | 단계
// 1~5        | 20m ~ 250m    | 4단계 (개별)
// 6~7        | 500m ~ 1,000m | 3단계 (읍/면/동)
// 8~9        | 2km ~ 4km     | 2단계 (시/군/구)
// 10~14      | 8km ~ 128km   | 1단계 (시/도)
export type ZoomStage = 1 | 2 | 3 | 4;

// 줌 버튼으로 단계를 옮길 때 실제로 이동할 대표 레벨. 각 단계 범위의 가운데 값을 쓴다.
export const STAGE_TARGET_LEVEL: Record<ZoomStage, number> = {
  4: 3,
  3: 6,
  2: 8,
  1: 12,
};

// 카카오 레벨을 4단계 중 하나로 변환한다.
// Object.keys()로 순회하는 방식은 숫자처럼 생긴 키를 문자열로 돌려줘서 산술 연산 시 버그가 나기 쉬워
// (예: "1" + 1 은 2가 아니라 "11"), 그냥 범위를 직접 비교하는 게 더 명확하고 안전하다.
export function getZoomStage(level: number): ZoomStage {
  if (level <= 5) {
    return 4;
  }
  if (level <= 7) {
    return 3;
  }
  if (level <= 9) {
    return 2;
  }
  return 1;
}
