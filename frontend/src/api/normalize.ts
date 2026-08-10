/**
 * 캘린더·분석 API 모듈이 함께 쓰는 응답 정규화 헬퍼입니다.
 *
 * 이 프로젝트의 백엔드는 같은 값을 숫자로 줄 때도 있고 문자열로 줄 때도 있습니다.
 * (예: 캘린더 일 단위 조회의 `amount`가 명세 예시에서는 `"-36500"`처럼 문자열입니다.)
 * 화면에서 `Number(...)`를 흩뿌리지 않도록 API 모듈 경계에서 여기 함수들로 한 번에 정규화합니다.
 *
 * NOTE: transactionsApi.ts에도 같은 이름의 지역 헬퍼가 있습니다. 이미 동작 중인 파일을 건드리지 않으려고
 * 지금은 그대로 두었고, 다음에 그 파일을 손볼 때 이 모듈을 쓰도록 합치면 됩니다.
 */

/** 명세상 숫자지만 문자열로 올 수도 있어 어느 쪽이 와도 숫자로 맞춥니다. */
export function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** 서버가 `EXPENSE`로 주든 `expense`로 주든 앱에서는 소문자 하나로만 다룹니다. */
export function toTransactionType(value: unknown): 'expense' | 'income' {
  return String(value ?? '').toLowerCase() === 'income' ? 'income' : 'expense';
}
