import { create } from 'zustand';

import type { ReportDetail, ReportType } from '@/src/api/reportApi';

/**
 * 리포트 팝업을 연 이유.
 * - 'push' : 리포트 푸시 알림을 탭했거나 알림함에서 눌렀다.
 * - 'auto' : 이번 주 첫 홈 진입(주 1회 자동 노출)이나 개발자 모드로 열렸다.
 */
export type ReportPopupSource = 'push' | 'auto';

export type PendingReport = {
  reportId: number;
  reportType: ReportType;
  /**
   * 푸시 data에 전문(reportPayload=FULL)이 실려 있으면 여기 채워져 오고, 그러면 홈 화면은
   * 네트워크 없이 바로 모달을 그린다. null이면 홈 화면이 reportId로 상세를 조회해 채운다.
   */
  detail: ReportDetail | null;
  source: ReportPopupSource;
};

type ReportPopupStore = {
  pending: PendingReport | null;
  /** 띄울 리포트를 예약한다. 홈 화면이 이 값을 보고 ReportModal을 연다. */
  openReport: (report: PendingReport) => void;
  /** ID_ONLY 푸시로 열린 뒤 상세 조회가 끝났을 때 전문을 채운다. */
  setDetail: (reportId: number, detail: ReportDetail) => void;
  closeReport: () => void;
};

/**
 * "어떤 리포트를 띄워야 하는가"만 담는 전역 상태.
 *
 * 알림을 탭하는 곳(루트 레이아웃의 푸시 리스너, 알림함 화면)과 실제로 모달을 그리는 곳(홈 화면)이
 * 서로 다른 트리에 있어서, 라우팅 파라미터 대신 이 store로 넘긴다. 앱이 죽은 상태에서 알림을 눌러
 * 실행되는 경우에도 홈 화면이 마운트되는 즉시 값을 읽어갈 수 있다.
 */
export const useReportPopupStore = create<ReportPopupStore>((set) => ({
  pending: null,
  openReport: (report) => set({ pending: report }),
  setDetail: (reportId, detail) =>
    set((state) =>
      // 조회가 늦게 끝나는 사이 다른 리포트로 바뀌었을 수 있으니, 같은 리포트일 때만 반영한다.
      state.pending && state.pending.reportId === reportId
        ? { pending: { ...state.pending, detail } }
        : state,
    ),
  closeReport: () => set({ pending: null }),
}));
