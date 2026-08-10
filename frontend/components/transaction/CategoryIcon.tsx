import type { ReactNode } from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import type { TransactionType } from '@/components/transaction/TransactionItem';
import {
  getCategoryColorById,
  getCategoryColorByName,
  getCategoryIconKey,
  INCOME_CATEGORY,
  type CategoryIconKey,
} from '@/constants/categories';

// assets/icons/categories/*.svg 파일의 path·circle을 그대로 옮긴 것입니다.
// 원본 svg는 stroke 색이 고정돼 있어서, color prop으로 바꿔 쓸 수 있게 react-native-svg로 다시 그렸습니다.
export type CategoryIconName = CategoryIconKey;

const ICON_SHAPES: Record<CategoryIconName, (color: string) => ReactNode> = {
  restaurant: (color) => (
    <>
      <Path d="M7 3v8" />
      <Path d="M4.5 3v4.5A2.5 2.5 0 0 0 7 10" />
      <Path d="M9.5 3v4.5A2.5 2.5 0 0 1 7 10" />
      <Path d="M7 10v11" />
      <Path d="M16 3v18" />
      <Path d="M16 3c3 2 4 5 4 8h-4" />
    </>
  ),
  cafe: (color) => (
    <>
      <Path d="M5 9h11v5.2A4.8 4.8 0 0 1 11.2 19H9.8A4.8 4.8 0 0 1 5 14.2V9Z" />
      <Path d="M16 10h1.2a2.8 2.8 0 0 1 0 5.6H16" />
      <Path d="M4 20h14" />
      <Path d="M8 6.5c-1-1-.8-2 .2-3" />
      <Path d="M12 6.5c-1-1-.8-2 .2-3" />
      <Path d="M8.2 12.2c.7-.8 1.8-.7 2.3.2.5-.9 1.6-1 2.3-.2.8.9.3 2-2.3 3.4-2.6-1.4-3.1-2.5-2.3-3.4Z" />
    </>
  ),
  mart: (color) => (
    <>
      <Path d="M4 9h16l-1.5 10h-13L4 9Z" />
      <Path d="M8 9l2-4" />
      <Path d="M16 9l-2-4" />
      <Path d="M8 13v3" />
      <Path d="M12 13v3" />
      <Path d="M16 13v3" />
    </>
  ),
  shopping: (color) => (
    <>
      <Path d="M5 8h14l-1 12H6L5 8Z" />
      <Path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>
  ),
  leisure: (color) => (
    <>
      <Path d="M8.5 13.5L12 21l3.5-7.5Z" />
      <Path d="M9.6 15.8h4.8" />
      <Path d="M12 10V5.5" />
      <Path d="M9.2 10.8L6.4 7.8" />
      <Path d="M14.8 10.8l2.8-3" />
      <Path d="M8 12H4.5" />
      <Path d="M16 12h3.5" />
      <Path d="M7.3 5.2l-.6-1.4" />
      <Path d="M16.7 5.2l.6-1.4" />
      <Circle cx={4.5} cy={7} fill={color} r={0.7} stroke="none" />
      <Circle cx={19.5} cy={7} fill={color} r={0.7} stroke="none" />
      <Circle cx={12} cy={3.5} fill={color} r={0.7} stroke="none" />
    </>
  ),
  transport: (color) => (
    <>
      <Path d="M3 11l9-7 9 7" />
      <Path d="M5 10v10h14V10" />
      <Path d="M9 20v-6h6v6" />
    </>
  ),
  health: (color) => (
    <>
      <Path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
      <Path d="M7.5 12h2l1.2-2.5 2.2 5 1.2-2.5h2.4" />
    </>
  ),
  living: (color) => (
    <>
      <Rect height={12} rx={2} width={14} x={5} y={7} />
      <Path d="M8 7V5h8v2" />
      <Circle cx={9} cy={13} fill={color} r={1} stroke="none" />
      <Circle cx={12} cy={13} fill={color} r={1} stroke="none" />
      <Circle cx={15} cy={13} fill={color} r={1} stroke="none" />
    </>
  ),
  beauty: (color) => (
    <>
      <Path d="M9 8.5V5.8l3.8-2.3 2.2 1.3v3.7" />
      <Path d="M9 8.5h6" />
      <Path d="M8.5 8.5h7l.7 5h-8.4l.7-5Z" />
      <Rect height={7} rx={1.5} width={9} x={7.5} y={13.5} />
      <Path d="M9 16.5h6" />
    </>
  ),
  education: (color) => (
    <>
      <Path d="M4 5.5A4.5 4.5 0 0 1 8.5 5H12v14H8.5A4.5 4.5 0 0 0 4 19.5v-14Z" />
      <Path d="M20 5.5A4.5 4.5 0 0 0 15.5 5H12v14h3.5a4.5 4.5 0 0 1 4.5.5v-14Z" />
    </>
  ),
  other: (color) => (
    <>
      <Rect height={15} rx={3} width={14} x={5} y={3} />
      <Path d="M7 8h10" />
      <Path d="M8 12h8" />
      <Path d="M8 18v2" />
      <Path d="M16 18v2" />
      <Circle cx={8.5} cy={15.5} fill={color} r={0.8} stroke="none" />
      <Circle cx={15.5} cy={15.5} fill={color} r={0.8} stroke="none" />
    </>
  ),
  // assets/icons/categories/money_bag.svg — 소득 카테고리(INCOME_CATEGORY) 아이콘입니다.
  income: () => (
    <>
      <Path d="M9 7 8 4.5h8L15 7" />
      <Path d="M8.5 8.5h7" />
      <Path d="M8.5 9h7c2.2 1.6 3.5 4.3 3.5 7.3 0 .7.5 1.1.5 1.9 0 1.5-1.2 2.8-2.8 2.8H7.3c-1.6 0-2.8-1.3-2.8-2.8 0-.8.5-1.2.5-1.9C5 13.3 6.3 10.6 8.5 9Z" />
      <Path d="M14.5 12.8a3 3 0 1 0 0 4.4" />
    </>
  ),
};

type CategoryIconProps = {
  /** 소득처럼 카테고리가 없는 거래도 있어서 선택 값입니다. */
  categoryName?: string;
  /** 목록·상세 API가 내려주는 categoryId가 있으면 이름보다 우선해 아이콘·색상을 정합니다. */
  categoryId?: number | string;
  /**
   * 거래 유형입니다. `income`이면 서버 카테고리와 상관없이 소득 카테고리(INCOME_CATEGORY)로 그립니다.
   * 소득은 카테고리가 없거나 `기타`로만 오기 때문에, 서버 카테고리만으로는 소득을 구분할 수 없습니다.
   */
  type?: TransactionType;
  size?: number;
  color?: string;
};

/**
 * 카테고리명에 맞는 SVG 아이콘을 그립니다.
 * 소득(`type="income"`)은 소득 카테고리로 취급해서, 다른 카테고리와 똑같이 팔레트에서 아이콘과 색을 가져옵니다.
 * color를 따로 전달하지 않으면 공통 카테고리 팔레트 색을 사용하고, 이름을 찾지 못하면 기타 색으로 표시합니다.
 */
export function CategoryIcon({ categoryName, categoryId, type, size = 20, color }: CategoryIconProps) {
  // 소득이면 서버 categoryId 대신 소득 카테고리의 id를 써서, 아이콘·색을 찾는 경로를 다른 카테고리와 통일합니다.
  const resolvedCategoryId = type === 'income' ? INCOME_CATEGORY.id : categoryId;
  const iconName = type === 'income' ? INCOME_CATEGORY.icon : getCategoryIconKey(categoryName, categoryId);
  const iconColor =
    color ??
    (resolvedCategoryId === undefined
      ? getCategoryColorByName(categoryName ?? '')
      : getCategoryColorById(resolvedCategoryId, categoryName));

  return (
    <Svg
      fill="none"
      height={size}
      stroke={iconColor}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
      width={size}>
      {ICON_SHAPES[iconName](iconColor)}
    </Svg>
  );
}
