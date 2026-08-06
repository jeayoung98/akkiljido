import { apiRequest } from '@/src/api/apiClient';

/**
 * 카테고리 조회 API 모듈입니다.
 * 거래 등록·수정의 categoryId는 반드시 이 API가 내려준 id여야 합니다.
 * constants/categories.ts의 1~11은 아이콘·색상 매핑용 프론트 상수이고 서버 id와 무관합니다.
 */

export type Category = {
  id: number;
  name: string;
};

type RawCategory = {
  id?: number | string;
  name?: string;
};

type RawCategoryListResponse = {
  categories?: RawCategory[];
};

/** GET /api/v1/category — 내 카테고리 전체를 가져옵니다. 없으면 빈 배열입니다. */
export async function fetchCategories(): Promise<Category[]> {
  const data = await apiRequest<RawCategoryListResponse>('/api/v1/category');

  const categories = (data?.categories ?? [])
    .map((category) => ({
      id: Number(category.id),
      name: category.name ?? '',
    }))
    // id가 숫자가 아닌 항목을 그대로 두면 등록에서 CT001이 나므로 여기서 걸러냅니다.
    .filter((category) => Number.isFinite(category.id));

  // 서버가 실제로 어떤 id를 주는지 바로 확인할 수 있도록 남깁니다.
  // (등록에서 "존재하지 않는 카테고리"가 뜨면 이 로그의 id와 보낸 categoryId를 비교하세요.)
  console.info(
    '[category] 서버 카테고리',
    categories.map((category) => `${category.id}:${category.name}`).join(', ') || '(비어 있음)',
  );

  return categories;
}
