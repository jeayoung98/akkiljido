import Colors from '@/constants/Colors';

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
  | 'other';

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

export function getCategoryIconKey(categoryName?: string, categoryId?: number | string): CategoryIconKey {
  const matchedById = CATEGORIES.find((category) => category.id === Number(categoryId));
  if (matchedById) return matchedById.icon;

  const normalizedName = normalizeCategoryName(categoryName ?? '');
  return CATEGORIES.find((category) => category.name === normalizedName)?.icon ?? 'other';
}

/** categoryName은 화면 표시용이고, 색상은 API와 동일한 categoryId를 기준으로 가져옵니다. */
export function getCategoryColorById(categoryId: number | string) {
  return Colors.category[Number(categoryId)] ?? Colors.category[11];
}

export function getCategoryColorByName(categoryName: string) {
  const normalizedName = normalizeCategoryName(categoryName);
  const category = CATEGORIES.find((item) => item.name === normalizedName);
  return getCategoryColorById(category?.id ?? 11);
}
