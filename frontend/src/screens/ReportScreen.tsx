import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/common/typography/Text';

import AppScreen from '@/components/common/AppScreen';
import AccordionCard from '@/components/common/card/AccordionCard';
import SegmentedControl from '@/components/common/segmented-control/SegmentedControl';
import { BrandLogo } from '@/components/onboarding/BrandLogo';
import Colors from '@/constants/Colors';
import {
  getReportDetail,
  getReportList,
  type ReportDetail,
  type ReportListItem,
  type ReportQueryType,
} from '@/src/api/reportApi';

const REPORT_TABS = [
  { value: 'weekly', label: '주간 리포트' },
  { value: 'monthly', label: '월간 리포트' },
] as const;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return '리포트를 불러오지 못했습니다.';
}

function formatWon(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`;
}

function formatPeriod(report: ReportListItem): string {
  const { periodStart, periodEnd, type } = report;

  if (!periodStart || !periodEnd) {
    return '기간 정보 없음';
  }

  const [startYear, startMonth, startDay] =
    periodStart.split('-');
  const [, endMonth, endDay] = periodEnd.split('-');

  if (type === 'MONTHLY') {
    return `${Number(startYear)}년 ${Number(startMonth)}월`;
  }

  return (
    `${Number(startMonth)}월 ${Number(startDay)}일 - ` +
    `${Number(endMonth)}월 ${Number(endDay)}일`
  );
}

type ReportDetailContentProps = {
  detail: ReportDetail;
};

function ReportDetailContent({
  detail,
}: ReportDetailContentProps) {
  const transactionCount = detail.summary?.count ?? 0;
  const placeCount = detail.summary?.placeCount ?? 0;

  return (
    <>
      <View style={styles.grid}>
        <View style={styles.gridCard}>
          <Text style={styles.gridLabel}>
            최다 지출 장소
          </Text>

          <Text
            numberOfLines={1}
            style={styles.gridValue}>
            {detail.highestSpendingPlace || '-'}
          </Text>

          <Text style={styles.gridSub}>
            총 {transactionCount}건
          </Text>
        </View>

        <View style={styles.gridCard}>
          <Text style={styles.gridLabel}>
            가장 자주 소비한 장소
          </Text>

          <Text
            numberOfLines={1}
            style={styles.gridValue}>
            {detail.mostFrequentPlace || '-'}
          </Text>

          <Text style={styles.gridSub}>
            방문 장소 {placeCount}곳
          </Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionCardTitle}>
          AI 분석
        </Text>

        {detail.body.length > 0 ? (
          <Text style={styles.sectionCardBody}>
            {detail.body.join(' ')}
          </Text>
        ) : (
          <Text style={styles.emptyText}>
            분석 내용이 없습니다.
          </Text>
        )}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionCardTitle}>
          알림 추천
        </Text>

        {detail.recommendations.length > 0 ? (
          <View style={styles.recList}>
            {detail.recommendations.map(
              (recommendation, index) => {
                const reason =
                  recommendation.reasonMessage ||
                  recommendation.reasonShort;

                return (
                  <View
                    key={[
                      recommendation.placeName,
                      recommendation.startTime,
                      recommendation.endTime,
                      index,
                    ].join('-')}
                    style={styles.recItem}>
                    <View style={styles.recNumber}>
                      <Text style={styles.recNumberText}>
                        {index + 1}
                      </Text>
                    </View>

                    <View style={styles.recContent}>
                      <Text style={styles.recPlace}>
                        {recommendation.placeName}
                      </Text>

                      <Text style={styles.recText}>
                        {reason ||
                          '소비 패턴을 바탕으로 추천한 장소입니다.'}
                      </Text>

                      <Text style={styles.recTime}>
                        {recommendation.startTime}
                        {' - '}
                        {recommendation.endTime}
                      </Text>
                    </View>
                  </View>
                );
              },
            )}
          </View>
        ) : (
          <Text style={styles.emptyText}>
            이번 리포트에는 추천 알림이 없습니다.
          </Text>
        )}
      </View>
    </>
  );
}

type ReportCardProps = {
  report: ReportListItem;
};

function ReportCard({ report }: ReportCardProps) {
  const [detail, setDetail] =
    useState<ReportDetail | null>(null);
  const [detailLoading, setDetailLoading] =
    useState(false);
  const [detailError, setDetailError] =
    useState<string | null>(null);

  const loadDetail = async () => {
    if (detailLoading) {
      return;
    }

    setDetailLoading(true);
    setDetailError(null);

    try {
      const response = await getReportDetail(
        report.reportId,
      );

      setDetail(response);
    } catch (error) {
      setDetailError(getErrorMessage(error));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCardPress = (open: boolean) => {
    if (
      open &&
      !detail &&
      !detailLoading &&
      !detailError
    ) {
      void loadDetail();
    }
  };

  return (
    <AccordionCard
      onPress={handleCardPress}
      header={
        <View style={styles.cardHeader}>
          <View style={styles.iconCircle}>
            <Ionicons
              color={Colors.light.primary}
              name="calendar-outline"
              size={18}
            />
          </View>

          <View style={styles.cardHeaderText}>
            <Text style={styles.periodLabel}>
              {formatPeriod(report)}
            </Text>

            <Text
              numberOfLines={1}
              style={styles.headline}>
              {report.headline}
            </Text>
          </View>

          <View style={styles.cardHeaderAmount}>
            <Text style={styles.amount}>
              {formatWon(report.totalCost)}
            </Text>
          </View>
        </View>
      }>
      {detailLoading ? (
        <View style={styles.detailState}>
          <ActivityIndicator
            color={Colors.light.primary}
            size="small"
          />

          <Text style={styles.stateText}>
            상세 리포트를 불러오고 있어요.
          </Text>
        </View>
      ) : detailError ? (
        <View style={styles.detailState}>
          <Ionicons
            color={Colors.light.cardDescription}
            name="alert-circle-outline"
            size={24}
          />

          <Text style={styles.errorText}>
            {detailError}
          </Text>

          <Pressable
            onPress={() => {
              void loadDetail();
            }}
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.retryButtonPressed,
            ]}>
            <Text style={styles.retryButtonText}>
              다시 시도
            </Text>
          </Pressable>
        </View>
      ) : detail ? (
        <ReportDetailContent detail={detail} />
      ) : null}
    </AccordionCard>
  );
}

export default function ReportScreen() {
  const [tab, setTab] =
    useState<ReportQueryType>('weekly');
  const [reports, setReports] = useState<
    ReportListItem[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] =
    useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError(null);

    getReportList(tab)
      .then((response) => {
        if (!active) {
          return;
        }

        setReports(response);
      })
      .catch((loadError) => {
        if (!active) {
          return;
        }

        setReports([]);
        setError(getErrorMessage(loadError));
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [reloadKey, tab]);

  const sectionTitle =
    tab === 'weekly'
      ? '주간 리포트'
      : '월간 리포트';

  return (
    // 헤더를 ReportModal·RecommendModal(홈 화면 리포트 팝업)과 같은 딥그린 브랜드 헤더로 맞춰서,
    // 팝업과 이 목록 화면이 "같은 리포트 기능"으로 보이게 한다. 배경도 헤더와 같은 색을 줘서
    // 카메라 영역(상단 안전 영역)까지 자연스럽게 이어지고, 목록 영역은 별도 ScrollView에서
    // 원래의 밝은 배경으로 되돌린다.
    <AppScreen backgroundColor={Colors.light.reportHeaderBackground}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <BrandLogo size={40} />
        </View>
        <Text style={styles.headerTitle}>과거 리포트</Text>
        <Text style={styles.headerSubtitle}>주간·월간 소비 리포트를 모아볼 수 있어요</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} style={styles.bodyScroll}>
        <SegmentedControl
          onChange={setTab}
          options={REPORT_TABS}
          value={tab}
        />

        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>
            {sectionTitle}
          </Text>

          <Text style={styles.listCount}>
            총 {reports.length}개
          </Text>
        </View>

        {loading ? (
          <View style={styles.screenState}>
            <ActivityIndicator
              color={Colors.light.primary}
              size="large"
            />

            <Text style={styles.stateText}>
              리포트를 불러오고 있어요.
            </Text>
          </View>
        ) : error ? (
          <View style={styles.screenState}>
            <Ionicons
              color={Colors.light.cardDescription}
              name="alert-circle-outline"
              size={32}
            />

            <Text style={styles.errorText}>
              {error}
            </Text>

            <Pressable
              onPress={() => {
                setReloadKey(
                  (current) => current + 1,
                );
              }}
              style={({ pressed }) => [
                styles.retryButton,
                pressed &&
                  styles.retryButtonPressed,
              ]}>
              <Text style={styles.retryButtonText}>
                다시 시도
              </Text>
            </Pressable>
          </View>
        ) : reports.length === 0 ? (
          <View style={styles.screenState}>
            <Ionicons
              color={Colors.light.cardDescription}
              name="document-text-outline"
              size={32}
            />

            <Text style={styles.stateTitle}>
              아직 생성된 리포트가 없어요.
            </Text>

            <Text style={styles.stateText}>
              리포트가 생성되면 이곳에서 확인할 수
              있어요.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {reports.map((report) => (
              <ReportCard
                key={report.reportId}
                report={report}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: Colors.light.reportHeaderBackground,
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.reportHeaderBadge,
  },
  headerTitle: {
    marginTop: 10,
    fontSize: 20,
    fontWeight: '800',
    color: Colors.onboarding.inverseText,
    textAlign: 'center',
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.reportHeaderSubtitle,
    textAlign: 'center',
  },
  bodyScroll: {
    backgroundColor: Colors.light.cardBackground,
  },
  body: {
    flexGrow: 1,
    gap: 16,
    padding: 20,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listTitle: {
    color: Colors.light.cardTitle,
    fontSize: 16,
    fontWeight: '800',
  },
  listCount: {
    color: Colors.light.cardDescription,
    fontSize: 13,
  },
  list: {
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: Colors.light.inputBackground,
  },
  cardHeaderText: {
    flex: 1,
  },
  periodLabel: {
    color: Colors.light.cardTitle,
    fontSize: 15,
    fontWeight: '700',
  },
  headline: {
    marginTop: 2,
    color: Colors.light.cardDescription,
    fontSize: 12,
  },
  cardHeaderAmount: {
    alignItems: 'flex-end',
  },
  amount: {
    color: Colors.light.cardTitle,
    fontSize: 15,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    gap: 10,
  },
  gridCard: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    backgroundColor: Colors.light.cardBackground,
  },
  gridLabel: {
    color: Colors.light.cardDescription,
    fontSize: 11,
  },
  gridValue: {
    marginTop: 4,
    color: Colors.light.cardTitle,
    fontSize: 14,
    fontWeight: '700',
  },
  gridSub: {
    marginTop: 2,
    color: Colors.light.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  sectionCard: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: Colors.light.cardBackground,
  },
  sectionCardTitle: {
    color: Colors.light.cardAccent,
    fontSize: 12,
    fontWeight: '800',
  },
  sectionCardBody: {
    marginTop: 6,
    color: Colors.light.cardBodyText,
    fontSize: 13,
    lineHeight: 19,
  },
  recList: {
    gap: 8,
    marginTop: 8,
  },
  recItem: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    backgroundColor: Colors.light.inputBackground,
  },
  recNumber: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: Colors.light.primary,
  },
  recNumberText: {
    color: Colors.onboarding.inverseText,
    fontSize: 11,
    fontWeight: '800',
  },
  recContent: {
    flex: 1,
  },
  recPlace: {
    color: Colors.light.cardTitle,
    fontSize: 13,
    fontWeight: '700',
  },
  recText: {
    marginTop: 3,
    color: Colors.light.cardBodyText,
    fontSize: 12,
    lineHeight: 18,
  },
  recTime: {
    marginTop: 4,
    color: Colors.light.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  screenState: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 24,
    borderRadius: 20,
    backgroundColor: Colors.light.cardBackground,
  },
  detailState: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stateTitle: {
    color: Colors.light.cardTitle,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  stateText: {
    color: Colors.light.cardDescription,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 6,
    color: Colors.light.cardDescription,
    fontSize: 12,
    lineHeight: 18,
  },
  errorText: {
    color: Colors.light.cardDescription,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 4,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: Colors.light.primary,
  },
  retryButtonPressed: {
    opacity: 0.65,
  },
  retryButtonText: {
    color: Colors.onboarding.inverseText,
    fontSize: 13,
    fontWeight: '700',
  },
});
