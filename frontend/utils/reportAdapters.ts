import type { ReportRecommendation } from '@/components/report/RecommendModal';
import type { ReportData } from '@/components/report/ReportModal';
import type { ReportDetail, ReportType } from '@/src/api/reportApi';

/** 모달 헤더의 작은 라벨. */
export function getReportPeriodLabel(type: ReportType): string {
  return type === 'MONTHLY' ? '월간 리포트' : '주간 리포트';
}

/** "가장 자주 소비한 장소" 칸의 라벨. 리포트를 보여주는 모든 화면(홈 팝업, 과거 리포트)이 같이 쓴다. */
export function getMostFrequentPlaceLabel(type: ReportType): string {
  return type === 'MONTHLY' ? '이번달의 방앗간' : '이번주의 방앗간';
}

/** 추천 모달 헤더 타이틀. 리포트 요약 모달의 headline과 짝을 이룬다. */
export function getReportRecommendationTitle(type: ReportType): string {
  return type === 'MONTHLY' ? '지난달 소비 리포트' : '지난주 소비 리포트';
}

/**
 * 상세 조회 응답(ReportDetail)을 ReportModal이 쓰는 표시용 값으로 옮긴다.
 *
 * 백엔드 리포트에는 카테고리 집계가 없어서(카테고리별 통계는 별도 분석 API 소관) topCategory를
 * 채울 수 없다. 대신 리포트가 실제로 들고 있는 "최다 지출 장소"를 같은 자리에 그리도록
 * topSpendingPlace로 넘긴다. 방문 횟수도 장소 단위로는 안 내려와서, 리포트 전체의 방문 장소 수
 * (summary.placeCount)를 보조 문구로 쓴다 — 과거 리포트 화면(ReportScreen)과 같은 기준이다.
 */
export function toReportModalData(detail: ReportDetail): ReportData {
  return {
    period: detail.period,
    headline: detail.headline,
    totalAmount: detail.totalCost,
    // topCategory: 백엔드 리포트 스키마에 카테고리 집계가 없어 채우지 않는다(모달이 아래 값으로 대체).
    topSpendingPlace: {
      name: detail.highestSpendingPlace,
      count: detail.summary?.count ?? 0,
    },
    topPlace: {
      name: detail.mostFrequentPlace,
      placeCount: detail.summary?.placeCount,
    },
    body: detail.body,
  };
}

/**
 * 리포트의 장소알림 추천을 추천 모달 + 알림 저장 모달이 쓰는 형태로 옮긴다.
 *
 * 두 자리 모두 reasonShort("오후 14~17시에 3번, 모두 23,700원")를 쓴다.
 * - 추천 모달: 문장 뒤에 "{장소} {시간대}에 알림을 설정해 보세요!"가 자동으로 붙는데,
 *   reasonMessage는 "…알림을 받아보시겠어요?"처럼 이미 권유로 끝나서 문장이 겹친다.
 * - 알림 저장 모달의 "알림 추가 이유": 한 줄짜리 입력칸이고, 저장된 값이 그대로
 *   위치 알림 본문("{주소} · {이유}")에 들어간다. 긴 멘트는 잘려서 읽히지 않는다.
 *
 * reasonMessage는 두 화면 모두에 맞지 않아 현재 쓰지 않는다(필요해지면 상세 화면 쪽에서 꺼내 쓰면 된다).
 */
export function toReportRecommendations(detail: ReportDetail): ReportRecommendation[] {
  return detail.recommendations.map((recommendation, index) => {
    const timeRange = `${recommendation.startTime}~${recommendation.endTime}`;

    return {
      // 같은 장소·시간대 추천이 겹칠 수 있어 리포트 ID와 순번으로 key를 만든다.
      id: `report-${detail.reportId}-rec-${index}`,
      description:
        recommendation.reasonShort ||
        recommendation.reasonMessage ||
        '소비 패턴을 분석했어요.',
      placeName: recommendation.placeName,
      timeRange,
      alarm: {
        // 알림 본문에서 "{이름} 근처입니다"로 사용하므로 접미사 없이 장소명만 저장합니다.
        name: recommendation.placeName,
        placeName: recommendation.placeName,
        address: recommendation.address,
        lat: recommendation.latitude,
        lng: recommendation.longitude,
        startTime: recommendation.startTime,
        endTime: recommendation.endTime,
        reason:
          recommendation.reasonShort ||
          recommendation.reasonMessage ||
          '',
      },
    };
  });
}
