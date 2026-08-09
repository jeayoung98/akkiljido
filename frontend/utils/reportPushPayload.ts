import type { ReportDetail, ReportType } from '@/src/api/reportApi';

/**
 * 백엔드 ReportNotificationService가 FCM data에 싣는 값들.
 *
 * - type          : "REPORT_WEEKLY" | "REPORT_MONTHLY" (FcmClient가 항상 넣는 예약 키)
 * - reportId      : 리포트 PK. 전문이 빠져도 이 값은 항상 온다.
 * - reportPayload : "FULL"이면 report에 상세 전문이 들어 있고, "ID_ONLY"면 report 키 자체가 없다.
 * - report        : 상세 조회 API(GET /api/v1/report/{id})와 동일한 스키마의 JSON 문자열.
 *
 * FCM data는 값이 전부 문자열이라, 숫자·객체는 여기서 파싱해준다.
 */
const PUSH_TYPE_TO_REPORT_TYPE: Record<string, ReportType> = {
  REPORT_WEEKLY: 'WEEKLY',
  REPORT_MONTHLY: 'MONTHLY',
};

export type ReportPushPayload = {
  reportId: number;
  reportType: ReportType;
  /**
   * reportPayload가 FULL이고 파싱까지 성공했을 때만 채워진다.
   * null이면 홈 화면이 reportId로 상세를 조회해야 한다.
   */
  detail: ReportDetail | null;
};

function toRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

function toStringValue(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * data.report(JSON 문자열)를 상세 응답 타입으로 되돌린다.
 *
 * 서버가 FULL이라고 표시했어도 문자열이 깨졌을 가능성까지 앱이 감당해야 하므로,
 * 화면이 반드시 쓰는 필드(reportId·body·recommendations)가 성립할 때만 전문으로 인정한다.
 * 인정하지 못하면 null을 돌려주고, 호출부는 ID_ONLY와 똑같이 상세를 조회한다.
 */
function parseReportDetail(raw: unknown, expectedReportId: number): ReportDetail | null {
  const json = toStringValue(raw);
  if (!json) return null;

  try {
    const parsed = toRecord(JSON.parse(json));
    if (!parsed) return null;

    if (typeof parsed.reportId !== 'number' || parsed.reportId !== expectedReportId) {
      return null;
    }
    if (!Array.isArray(parsed.body) || !Array.isArray(parsed.recommendations)) {
      return null;
    }

    return parsed as unknown as ReportDetail;
  } catch (error) {
    console.warn('[push] failed to parse report payload — will fetch detail instead', error);
    return null;
  }
}

/**
 * 알림 data가 리포트 푸시인지 판별하고, 맞으면 화면에 필요한 값으로 정리해 돌려준다.
 * 위치 알림 등 다른 푸시거나 형식이 어긋나면 null.
 */
export function parseReportPushData(data: unknown): ReportPushPayload | null {
  const record = toRecord(data);
  if (!record) return null;

  const pushType = toStringValue(record.type);
  const reportType = pushType ? PUSH_TYPE_TO_REPORT_TYPE[pushType] : undefined;
  if (!reportType) return null;

  // reportId는 문자열로 오지만, 로컬 테스트 등에서 숫자로 들어와도 받아준다.
  const reportId = Number(record.reportId);
  if (!Number.isInteger(reportId) || reportId <= 0) return null;

  const payloadLevel = toStringValue(record.reportPayload);
  const detail = payloadLevel === 'FULL' ? parseReportDetail(record.report, reportId) : null;

  return { reportId, reportType, detail };
}
