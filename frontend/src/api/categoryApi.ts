import { apiRequest } from '@/src/api/apiClient';

export type Category = {
  id: number;
  name: string;
};

type CategoryList = {
  categories: Category[];
};

export async function getCategories(): Promise<Category[]> {
  const response = await apiRequest<CategoryList>(
    '/api/v1/category',
  );

  return response.categories;
}
