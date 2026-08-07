import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { fetchCategories, type Category } from '@/src/api/categoriesApi';

/**
 * GET /api/v1/category — 등록·수정·필터에서 쓸 카테고리 목록을 가져옵니다.
 *
 * ⚠️ 여기서 나오는 id 외의 값을 categoryId로 서버에 보내면 안 됩니다.
 * 카테고리는 "내 카테고리"라 id가 계정별로 발급되고, constants/categories.ts의 1~11은
 * 아이콘·색상 매핑용 프론트 상수일 뿐 서버 id와 무관합니다.
 * (예전에는 응답이 오기 전/실패 시 이 상수를 대신 썼는데, 그 값으로 등록하면 서버가
 *  `CT001 존재하지 않는 카테고리`로 거절합니다. 그래서 대체값을 완전히 없앴습니다.)
 *
 * 따라서 응답 전이나 실패 시에는 빈 배열을 돌려주고, 화면은 isLoading·error를 보고
 * 카테고리 선택과 등록 버튼을 막아야 합니다.
 */

export const categoryKeys = {
  all: ['categories'] as const,
};

const EMPTY_CATEGORIES: Category[] = [];

export function useCategories() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: categoryKeys.all,
    queryFn: fetchCategories,
    // 앱을 켜는 동안 바뀔 일이 거의 없어 다시 조회하지 않습니다.
    staleTime: Infinity,
  });

  const categories = data ?? EMPTY_CATEGORIES;

  const selectOptions = useMemo(
    () => categories.map((category) => ({ label: category.name, value: String(category.id) })),
    [categories],
  );

  const categoryNameById = useMemo(
    () => new Map(categories.map((category) => [String(category.id), category.name])),
    [categories],
  );

  return {
    categories,
    selectOptions,
    categoryNameById,
    /** 서버에서 받은 카테고리가 하나라도 있는지. false면 등록·수정을 막아야 합니다. */
    hasCategories: categories.length > 0,
    isLoading,
    error,
    refetch,
  };
}
