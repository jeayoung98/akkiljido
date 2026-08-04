// 주간·월간 리포트의 현재 기간을 고유한 문자열 ID로 만들어, 
// 기간별 1회 표시 여부를 관리하기 위한 유틸

// 주의 시작은 월요일(ISO 8601 기준)로 한다.

// ISO 8601 주차 번호. "2026-W32"처럼 연도-주차 형태로 반환한다.
export function getWeekIdentifier(date: Date = new Date()): string {
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayNumber = (target.getDay() + 6) % 7; // 월=0, 화=1, ..., 일=6
  target.setDate(target.getDate() - dayNumber + 3); // 이번 주 목요일로 이동(ISO 8601 연도 판정 기준)

  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const firstThursdayDayNumber = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstThursdayDayNumber + 3);

  const weekNumber = 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return `${target.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

// "2026-08"처럼 연도-월 형태로 반환한다. 월간 리포트가 생기면 같은 방식(useShowOncePerPeriod)으로 재사용한다.
export function getMonthIdentifier(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
