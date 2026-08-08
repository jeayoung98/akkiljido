import { apiRequest } from '@/src/api/apiClient';

/**
 * 목록 조회 API에서 사용하는 쿼리 파라미터.
 *
 * GET /api/v1/report/list?type=weekly
 * GET /api/v1/report/list?type=monthly
 */
export type ReportQueryType = 'weekly' | 'monthly';

/** 백엔드 ReportType enum 응답값. */
export type ReportType = 'WEEKLY' | 'MONTHLY';

export type ReportPeriod = {
  start: string;
  end: string;
};

export type ReportMetrics = {
  /** 리포트 기간 내 재량지출 건수. */
  count: number;

  /** 리포트 기간 내 방문 장소 수. */
  placeCount: number;
};

export type ReportRecommendation = {
  placeName: string;
  address: string;
  latitude: number;
  longitude: number;
  startTime: string;
  endTime: string;
  reasonShort: string;
  reasonMessage: string;
};

/**
 * GET /api/v1/report/list 응답의 목록 항목.
 *
 * Swagger에는 공통 응답 래퍼가 표시되지만 apiRequest가 이미
 * success/code/msg/data 래퍼를 제거하므로 실제 화면에서는 이 타입만 받는다.
 */
export type ReportListItem = {
  reportId: number;
  type: ReportType;
  periodStart: string | null;
  periodEnd: string | null;
  totalCost: number;
  highestSpendingPlace: string;
  mostFrequentPlace: string;
  headline: string;
};

type ReportListResponse = {
  reportList: ReportListItem[];
};

/**
 * GET /api/v1/report/{reportId} 상세 응답.
 *
 * 리포트 푸시 알림의 data.report에도 이 스키마 그대로 실려 온다(백엔드
 * ReportNotificationService가 상세 응답을 그대로 직렬화한다). 그래서 푸시로 받은 전문과
 * 조회로 받은 전문이 같은 타입이고, 화면은 둘을 구분하지 않아도 된다.
 */
export type ReportDetail = {
  reportId: number;
  type: ReportType;
  totalCost: number;
  highestSpendingPlace: string;
  mostFrequentPlace: string;
  period: ReportPeriod | null;
  headline: string;
  body: string[];
  summary: ReportMetrics | null;
  recommendations: ReportRecommendation[];
};

/** 최신순 리포트 목록을 조회한다. */
export async function getReportList(
  type: ReportQueryType,
): Promise<ReportListItem[]> {
  const response = await apiRequest<ReportListResponse>(
    `/api/v1/report/list?type=${encodeURIComponent(type)}`,
  );

  return response.reportList ?? [];
}

/** 선택한 리포트의 본문과 추천 정보를 조회한다. */
export async function getReportDetail(
  reportId: number,
): Promise<ReportDetail> {
  if (!Number.isInteger(reportId) || reportId <= 0) {
    throw new Error('올바르지 않은 리포트 ID입니다.');
  }

  return apiRequest<ReportDetail>(
    `/api/v1/report/${reportId}`,
  );
}

/**
 * 가장 최근 리포트의 상세를 가져온다. 아직 생성된 리포트가 없으면 null.
 *
 * 홈 화면의 "기간당 1회 자동 팝업"이 쓴다. 목록 API가 최신순으로 내려주므로 첫 항목이 곧 최신이다.
 */
export async function getLatestReportDetail(
  type: ReportQueryType,
): Promise<ReportDetail | null> {
  const reports = await getReportList(type);
  const latest = reports[0];

  if (!latest) {
    return null;
  }

  return getReportDetail(latest.reportId);
}
