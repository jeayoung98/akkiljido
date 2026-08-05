import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import AppScreen from '@/components/common/AppScreen';
import AccordionCard from '@/components/common/card/AccordionCard';
import { SaveAlarmModal, type AlarmFormValue } from '@/components/common/modal/SaveAlarmModal';
import SegmentedControl from '@/components/common/segmented-control/SegmentedControl';
import type { ReportRecommendation } from '@/components/report/WeeklyReportRecommendationsModal';
import Colors from '@/constants/Colors';
import { MOCK_MONTHLY_REPORTS, MOCK_WEEKLY_REPORTS, type ReportHistoryEntry } from '@/mocks/report';

type ReportTab = 'weekly' | 'monthly';

// "2026-07-22" ~ "2026-07-28" → "7월 22일 - 7월 28일"
function formatWeeklyPeriodLabel(period: { start: string; end: string }) {
  const [, startMonth, startDay] = period.start.split('-');
  const [, endMonth, endDay] = period.end.split('-');
  return `${Number(startMonth)}월 ${Number(startDay)}일 - ${Number(endMonth)}월 ${Number(endDay)}일`;
}

// "2026-07-01" → "2026년 7월"
function formatMonthlyPeriodLabel(period: { start: string; end: string }) {
  const [year, month] = period.start.split('-');
  return `${year}년 ${Number(month)}월`;
}

// "2026-08-01T07:00:00" → "발행 8월 1일 오전 7:00"
function formatPublishedAt(publishedAt: string) {
  const date = new Date(publishedAt);
  const hour24 = date.getHours();
  const meridiem = hour24 < 12 ? '오전' : '오후';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `발행 ${date.getMonth() + 1}월 ${date.getDate()}일 ${meridiem} ${hour12}:${minute}`;
}

function formatComparison(percent: number, comparedLabel: string) {
  const sign = percent >= 0 ? '+' : '';
  return `${comparedLabel} 대비 ${sign}${percent}%`;
}

export default function ReportScreen() {
  const [tab, setTab] = useState<ReportTab>('weekly');
  // 아코디언 안 "알림 추천" 항목을 누르면 그 내용을 초기값으로 채운 SaveAlarmModal을 연다.
  const [saveAlarmVisible, setSaveAlarmVisible] = useState(false);
  const [selectedAlarm, setSelectedAlarm] = useState<AlarmFormValue | null>(null);

  const handleSelectRecommendation = (rec: ReportRecommendation) => {
    // rec.alarm에는 추천 시각 하나(time)만 있어서, 시작·끝 시간은 화면에 이미 보여주는
    // timeRange("14:00~17:00")를 그대로 나눠서 채운다.
    const [startTime, endTime] = rec.timeRange.split('~');
    setSelectedAlarm({
      name: rec.alarm.name,
      placeName: rec.alarm.placeName,
      startTime,
      endTime,
      reason: rec.alarm.reason,
    });
    setSaveAlarmVisible(true);
  };

  const isWeekly = tab === 'weekly';
  const entries = isWeekly ? MOCK_WEEKLY_REPORTS : MOCK_MONTHLY_REPORTS;
  const formatPeriodLabel = isWeekly ? formatWeeklyPeriodLabel : formatMonthlyPeriodLabel;
  const comparedLabel = isWeekly ? '전주' : '전월';
  const sectionTitle = isWeekly ? '주간 리포트' : '월간 리포트';

  return (
    <AppScreen scrollable>
      <View style={styles.header}>
        <Text style={styles.title}>과거 리포트</Text>
        <Text style={styles.subtitle}>주간·월간 소비 리포트를 모아볼 수 있어요</Text>
      </View>

      <View style={styles.body}>
        <SegmentedControl
          options={[
            { value: 'weekly', label: '주간 리포트' },
            { value: 'monthly', label: '월간 리포트' },
          ]}
          value={tab}
          onChange={setTab}
        />

        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>{sectionTitle}</Text>
          <Text style={styles.listCount}>총 {entries.length}개</Text>
        </View>

        <View style={styles.list}>
          {entries.map((entry: ReportHistoryEntry) => {
            const { data, recommendations } = entry;
            return (
              <AccordionCard
                key={data.publishedAt}
                header={
                  <View style={styles.cardHeader}>
                    <View style={styles.iconCircle}>
                      <Ionicons name="calendar-outline" size={18} color={Colors.light.primary} />
                    </View>
                    <View style={styles.cardHeaderText}>
                      <Text style={styles.periodLabel}>{formatPeriodLabel(data.period)}</Text>
                      <Text style={styles.publishedLabel}>{formatPublishedAt(data.publishedAt)}</Text>
                    </View>
                    <View style={styles.cardHeaderAmount}>
                      <Text style={styles.amount}>{data.totalAmount.toLocaleString('ko-KR')}원</Text>
                      <Text
                        style={[
                          styles.comparison,
                          { color: data.comparedToPrevious >= 0 ? Colors.light.danger : Colors.light.primary },
                        ]}>
                        {formatComparison(data.comparedToPrevious, comparedLabel)}
                      </Text>
                    </View>
                  </View>
                }>
                <View style={styles.grid}>
                  <View style={styles.gridCard}>
                    <Text style={styles.gridLabel}>최다 소비 카테고리</Text>
                    <Text style={styles.gridValue} numberOfLines={1}>
                      {data.topCategory.name}
                    </Text>
                    <Text style={styles.gridSub}>{data.topCategory.amount.toLocaleString('ko-KR')}원</Text>
                  </View>
                  <View style={styles.gridCard}>
                    <Text style={styles.gridLabel}>가장 자주 소비한 장소</Text>
                    <Text style={styles.gridValue} numberOfLines={1}>
                      {data.topPlace.name}
                    </Text>
                    <Text style={styles.gridSub}>{data.topPlace.count}회</Text>
                  </View>
                </View>

                <View style={styles.sectionCard}>
                  <Text style={styles.sectionCardTitle}>AI 분석</Text>
                  <Text style={styles.sectionCardBody}>{data.body.join(' ')}</Text>
                </View>

                <View style={styles.sectionCard}>
                  <Text style={styles.sectionCardTitle}>알림 추천</Text>
                  <View style={styles.recList}>
                    {recommendations.map((rec, index) => (
                      <Pressable
                        key={rec.id}
                        onPress={() => handleSelectRecommendation(rec)}
                        style={({ pressed }) => [styles.recItem, pressed && styles.recItemPressed]}>
                        <Text style={styles.recText}>
                          {index + 1}. {rec.description} {rec.placeName} {rec.timeRange}에 알림을 설정해 보세요!
                        </Text>
                        <View style={styles.recAction}>
                          <Ionicons name="add-circle-outline" size={26} color={Colors.light.primary} />
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </AccordionCard>
            );
          })}
        </View>
      </View>

      {selectedAlarm ? (
        <SaveAlarmModal
          initialValue={selectedAlarm}
          onClose={() => setSaveAlarmVisible(false)}
          onReopenAfterLocationPicked={() => setSaveAlarmVisible(true)}
          onSave={() => {
            // TODO: 실제 알림 저장 API 연결. 지금은 SaveAlarmModal만 닫는다.
            setSaveAlarmVisible(false);
          }}
          visible={saveAlarmVisible}
        />
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 84,
    justifyContent: 'center',
    paddingTop: 12,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    gap: 4,
  },
  title: {
    color: Colors.light.cardTitle,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: Colors.light.cardDescription,
    fontSize: 13,
  },
  body: {
    flexGrow: 1,
    padding: 20,
    gap: 16,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.light.cardTitle,
  },
  listCount: {
    fontSize: 13,
    color: Colors.light.cardDescription,
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
    borderRadius: 18,
    backgroundColor: Colors.light.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderText: {
    flex: 1,
  },
  periodLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.cardTitle,
  },
  publishedLabel: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.light.cardDescription,
  },
  cardHeaderAmount: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.cardTitle,
  },
  comparison: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    gap: 10,
  },
  gridCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    backgroundColor: Colors.light.cardBackground,
  },
  gridLabel: {
    fontSize: 11,
    color: Colors.light.cardDescription,
  },
  gridValue: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.cardTitle,
  },
  gridSub: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  sectionCard: {
    marginTop: 12,
    borderRadius: 14,
    padding: 12,
    backgroundColor: Colors.light.cardBackground,
  },
  sectionCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.light.cardAccent,
  },
  sectionCardBody: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.light.cardBodyText,
  },
  recList: {
    marginTop: 6,
    gap: 8,
  },
  recItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.inputBackground,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  recText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.light.cardBodyText,
  },
  recAction: {
    alignSelf: 'center',
  },
  recItemPressed: {
    opacity: 0.6,
  },
});
