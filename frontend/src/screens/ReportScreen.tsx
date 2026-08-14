import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/common/typography/Text';

import AppScreen from '@/components/common/AppScreen';
import AccordionCard from '@/components/common/card/AccordionCard';
import { AppHeader } from '@/components/common/header/AppHeader';
import { SaveAlarmModal, type AlarmFormValue } from '@/components/common/modal/SaveAlarmModal';
import { RecommendationRow, type ReportRecommendation } from '@/components/report/RecommendModal';
import SegmentedControl from '@/components/common/segmented-control/SegmentedControl';
import Colors from '@/constants/Colors';
import { useSaveRecommendedAlarm } from '@/hooks/useSaveRecommendedAlarm';
import {
  getReportDetail,
  getReportList,
  type ReportDetail,
  type ReportListItem,
  type ReportQueryType,
} from '@/src/api/reportApi';
import { getMostFrequentPlaceLabel, toReportRecommendations } from '@/utils/reportAdapters';

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
  onSelectRecommendation: (rec: ReportRecommendation) => void;
};

function ReportDetailContent({
  detail,
  onSelectRecommendation,
}: ReportDetailContentProps) {
  // 방앗간 알림 추천 모달(components/report/RecommendModal.tsx)과 같은 형태로 변환해서
  // 같은 RecommendationRow를 그대로 쓴다 — 두 화면의 추천 UI/동작이 갈리지 않게 하기 위함.
  const recommendations = toReportRecommendations(detail);
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
            {getMostFrequentPlaceLabel(detail.type)}
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
          방앗간 추천
        </Text>

        {recommendations.length > 0 ? (
          <View style={styles.recList}>
            {recommendations.map((rec, index) => (
              <RecommendationRow
                key={rec.id}
                index={index}
                onPress={() => onSelectRecommendation(rec)}
                rec={rec}
              />
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>
            이번 리포트에는 추천 방앗간이 없습니다.
          </Text>
        )}
      </View>
    </>
  );
}

type ReportCardProps = {
  report: ReportListItem;
  onSelectRecommendation: (rec: ReportRecommendation) => void;
};

function ReportCard({ report, onSelectRecommendation }: ReportCardProps) {
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
        <ReportDetailContent detail={detail} onSelectRecommendation={onSelectRecommendation} />
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
  // 방앗간 추천 항목을 눌렀을 때 열리는 알림 저장 모달. 홈 화면의 리포트 팝업과 동일한 저장 동작을
  // 공유한다(hooks/useSaveRecommendedAlarm.ts) — 두 화면의 동작이 갈리지 않게 하기 위함.
  const [selectedAlarm, setSelectedAlarm] = useState<AlarmFormValue | null>(null);
  const [saveAlarmVisible, setSaveAlarmVisible] = useState(false);
  const { saveAlarm: handleSaveRecommendedAlarm, saving: alarmSaving } = useSaveRecommendedAlarm(() =>
    setSaveAlarmVisible(false),
  );

  const handleSelectRecommendation = (rec: ReportRecommendation) => {
    setSelectedAlarm(rec.alarm);
    setSaveAlarmVisible(true);
  };

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
    <AppScreen backgroundColor={Colors.light.background}>
      {/* 제목·안내 문구를 같은 공통 헤더 안에 두어 다른 화면의 상단 여백과 통일합니다. */}
      <AppHeader subtitle="주간·월간 소비 리포트를 모아볼 수 있어요" title="과거 리포트" />

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
                onSelectRecommendation={handleSelectRecommendation}
                report={report}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {selectedAlarm ? (
        <SaveAlarmModal
          initialValue={selectedAlarm}
          onClose={() => setSaveAlarmVisible(false)}
          onReopenAfterLocationPicked={() => setSaveAlarmVisible(true)}
          onSave={handleSaveRecommendedAlarm}
          saveLoading={alarmSaving}
          visible={saveAlarmVisible}
        />
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  bodyScroll: {
    backgroundColor: Colors.light.background,
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
