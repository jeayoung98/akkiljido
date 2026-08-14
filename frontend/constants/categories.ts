import Colors, { INCOME_CATEGORY_ID } from '@/constants/Colors';

/**
 * 프론트에서 사용하는 카테고리 마스터 데이터입니다.
 * API 연동 전에는 화면 표시용 이름을 사용하지만, 실제 응답에서는 categoryId를 기준으로 매핑합니다.
 * categoryName 문자열이 이 목록과 다르면 아이콘 등은 안전하게 `기타`로 처리됩니다.
 */
export type CategoryIconKey =
  | 'restaurant'
  | 'cafe'
  | 'mart'
  | 'shopping'
  | 'leisure'
  | 'transport'
  | 'health'
  | 'living'
  | 'beauty'
  | 'education'
  | 'other'
  | 'income';

export const CATEGORIES = [
  { id: 1, name: '음식점', icon: 'restaurant' },
  { id: 2, name: '카페·간식', icon: 'cafe' },
  { id: 3, name: '편의점·마트', icon: 'mart' },
  { id: 4, name: '쇼핑', icon: 'shopping' },
  { id: 5, name: '여가', icon: 'leisure' },
  { id: 6, name: '교통', icon: 'transport' },
  { id: 7, name: '건강·의료', icon: 'health' },
  { id: 8, name: '생활', icon: 'living' },
  { id: 9, name: '미용', icon: 'beauty' },
  { id: 10, name: '교육', icon: 'education' },
  { id: 11, name: '기타', icon: 'other' },
] as const satisfies ReadonlyArray<{ id: number; name: string; icon: CategoryIconKey }>;

/**
 * 소득을 카테고리 하나처럼 다루기 위한 항목입니다.
 *
 * 소득은 서버 카테고리가 아니라 거래 유형이라서 위 CATEGORIES(= 서버 categoryId 1~11)에는 넣지 않고,
 * 겹치지 않는 예약 id로 따로 둡니다. 이렇게 두면 아이콘·색을 다른 카테고리와 똑같은 방식으로
 * (getCategoryColorById / Colors.category) 가져갈 수 있고, 소득만 색을 바꾸고 싶을 때
 * Colors.ts의 category[INCOME_CATEGORY_ID] 한 줄만 고치면 됩니다.
 *
 * CATEGORIES에 넣지 않는 이유: 카테고리 선택 목록·필터 칩이 CATEGORIES를 그대로 순회하기 때문에
 * 넣으면 소비 카테고리 목록에 "소득"이 섞여 나옵니다.
 */
export const INCOME_CATEGORY = {
  id: INCOME_CATEGORY_ID,
  name: '소득',
  icon: 'income',
} as const satisfies { id: number; name: string; icon: CategoryIconKey };

export const CATEGORY_NAMES = CATEGORIES.map((category) => category.name);

export const CATEGORY_NAME_SELECT_OPTIONS = CATEGORIES.map((category) => ({
  label: category.name,
  value: category.name,
}));

export const CATEGORY_ID_SELECT_OPTIONS = CATEGORIES.map((category) => ({
  label: category.name,
  value: String(category.id),
}));

export const CATEGORY_NAME_BY_ID = new Map(CATEGORIES.map((category) => [String(category.id), category.name]));

/** API마다 `카페·간식` / `카페 · 간식`처럼 구분점 주변 공백이 달라도 같은 카테고리로 처리합니다. */
function normalizeCategoryName(categoryName: string) {
  return categoryName.replace(/\s*·\s*/g, '·').trim();
}

/**
 * 카테고리는 회원가입 시 사용자별로 자동 생성돼서 실제 categoryId가 이 목록의 1~11과
 * 다를 수 있지만(이름은 항상 이 11개 중 하나로 내려옵니다), categoryId가 우연히 다른
 * 카테고리의 id와 겹치면 엉뚱한 아이콘이 나올 수 있습니다. 그래서 항상 믿을 수 있는
 * categoryName을 먼저 매칭하고, 이름이 없거나 못 찾았을 때만 id로 대신 찾습니다.
 */
export function getCategoryIconKey(categoryName?: string, categoryId?: number | string): CategoryIconKey {
  const normalizedName = normalizeCategoryName(categoryName ?? '');
  const matchedByName = CATEGORIES.find((category) => category.name === normalizedName);
  if (matchedByName) return matchedByName.icon;

  const matchedById = CATEGORIES.find((category) => category.id === Number(categoryId));
  return matchedById?.icon ?? 'other';
}

/** getCategoryIconKey와 같은 이유로, 색상도 categoryName을 id보다 먼저 매칭합니다. */
export function getCategoryColorById(categoryId: number | string, categoryName?: string) {
  // 소득은 CATEGORIES에 없는 예약 id(INCOME_CATEGORY)라서 팔레트에서 바로 찾습니다.
  if (Number(categoryId) === INCOME_CATEGORY_ID) return Colors.category[INCOME_CATEGORY_ID];

  if (categoryName) {
    const normalizedName = normalizeCategoryName(categoryName);
    const matchedByName = CATEGORIES.find((category) => category.name === normalizedName);
    if (matchedByName) return Colors.category[matchedByName.id];
  }

  const matchedById = CATEGORIES.find((category) => category.id === Number(categoryId));
  if (matchedById) return Colors.category[matchedById.id];

  return Colors.category[11];
}

export function getCategoryColorByName(categoryName: string) {
  const normalizedName = normalizeCategoryName(categoryName);
  const category = CATEGORIES.find((item) => item.name === normalizedName);
  return getCategoryColorById(category?.id ?? 11);
}
