// 앱 전체에서 쓰는 색상 팔레트. 다크모드 없이 라이트 팔레트 하나만 관리한다.

/** 백엔드 categoryId 1~11 순서와 같은 카테고리 전용 색상입니다. */
export const categoryColors = [
  '#B388EB', // 라이트 퍼플
  '#F48FB1', // 핑크
  '#FFB74D', // 오렌지
  '#EF9A9A', // 코럴(구 옐로우 — 편의점·마트의 오렌지와 구분되지 않아 변경)
  '#4A784F', // 메인 초록
  '#80CBC4', // 민트
  '#81D4FA', // 하늘
  '#90CAF9', // 블루
  '#F06292', // 로즈 핑크(구 인디고 — 미용 카테고리에 어울리게 변경)
  '#AED581', // 연두
  '#D7B899', // 베이지
] as const;

/**
 * 소득을 카테고리 하나처럼 다루기 위한 예약 categoryId입니다.
 * 서버 categoryId(1~11)와 겹치지 않아야 하고, categoryId가 없을 때 0으로 정규화되는 값과도
 * 겹치면 안 되므로 음수를 씁니다. (constants/categories.ts의 INCOME_CATEGORY가 이 id를 씁니다.)
 */
export const INCOME_CATEGORY_ID = -1;

export default {
  onboarding: {
    green: "#4A784F",
    text: "#202D25",
    muted: "#768E7C",
    tagline: "#4D4D4D",
    lightText: "#C6D6CA",
    inverseText: "#FFFFFF",
    surface: "#FFFFFF",
  },

  // 백엔드 categoryId(1~11)와 같은 순서로 관리하는 카테고리 전용 색상입니다.
  // 지도 마커, 카테고리 아이콘, 분석 차트가 동일한 색을 사용합니다.
  category: {
    // 소득도 카테고리 하나로 취급해 여기서 색을 가져갑니다.
    // 지금은 기타와 같은 베이지를 쓰고, 소득만 다른 색으로 빼고 싶으면 이 줄만 고치면 됩니다.
    [INCOME_CATEGORY_ID]: categoryColors[10],
    1: categoryColors[0],
    2: categoryColors[1],
    3: categoryColors[2],
    4: categoryColors[3],
    5: categoryColors[4],
    6: categoryColors[5],
    7: categoryColors[6],
    8: categoryColors[7],
    9: categoryColors[8],
    10: categoryColors[9],
    11: categoryColors[10],
  } as Record<number, string>,
  light: {
    text: "#000", // 기본 텍스트 색
    textSecondary: "#525a55", // 보조 설명, 타임스탬프 등 회색톤 텍스트
    background: "#FCFFFD", // 기본 배경색
    primary: "#63A061", // 브랜드 그린. 탭바 활성 원 배경 등에 사용
    border: "#DCDCDC", // 구분선, 입력창 테두리 등
    disabled: "#C9CDC9", // 비활성 버튼 배경 등
    placeholder: "#6B8F7A", // 입력창 안내 문구 색
    danger: "#FB2C36", // 위험/삭제 액션, 빨강 버튼 등
    inputBackground: "#F0F7F1", // 기본 입력창의 연한 초록 배경
    overlay: "rgba(0,0,0,0.35)", // 바텀시트/모달 뒤 딤 배경
    cardBackground: "#FFFFFF",
    cardMutedBackground: "#F3F8F4", // 옅은 민트색 배경. 아코디언 펼친 영역 등에 사용 (투명도 아닌 실제 옅은 색)
    cardAccent: "#557A5A", // 아코디언 카드 안의 초록 포인트 텍스트(라벨, chevron 등)
    cardBodyText: "#2B2F2C", // 아코디언 카드 안의 본문 텍스트
    cardTitle: "#18251E",
    cardDescription: "#789080",
    summaryPrimaryBackground: "rgba(49, 95, 61, 0.45)",
    summaryPrimaryLabel: "#DCECD7",
    summaryPrimaryText: "#FFFFFF",
    summaryInfoBackground: "#EEF3FF",
    summaryInfoLabel: "#8198C3",
    summaryInfoText: "#647AA5",
    summaryInfoCaption: "#91A5CA",
    // 주간 리포트 모달의 딥그린 헤더/CTA 버튼에 쓰는 색
    reportHeaderBackground: "#1F7A4C",
    reportHeaderBadge: "#3C9A66", // 헤더 안 캐릭터 뒤 연두색 사각형
    reportHeaderSubtitle: "#B7E4C7", // 헤더 안 "주간 리포트" 소제목
  },
};
