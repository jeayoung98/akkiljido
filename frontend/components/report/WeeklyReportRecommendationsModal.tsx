import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/common/button/Button';
import { CenterModal } from '@/components/common/modal/CentralModal';
import type { AlarmRecommendation } from '@/components/common/modal/RecommendedAlarmModal';
import { BrandLogo } from '@/components/onboarding/BrandLogo';
import Colors from '@/constants/Colors';

export type ReportRecommendation = {
  // 강조 앞까지의 설명 문장. 뒤에 "{placeName} {timeRange}에 알림을 설정해 보세요!"가 자동으로 붙는다.
  description: string;
  placeName: string; // 초록으로 강조되는 장소명
  timeRange: string; // 초록으로 강조되는 시간대. "12:00~13:00"
  // 이 추천 박스를 눌렀을 때 알림 추가 모달(RecommendedAlarmModal)에 채워 넣을 추천값
  alarm: AlarmRecommendation;
};

export type WeeklyReportRecommendationsModalProps = {
  visible: boolean;
  // 헤더 타이틀. 리포트 요약 모달과 같은 값을 쓰거나 생략하면 기본 문구가 나온다.
  title?: string;
  recommendations: ReportRecommendation[];
  // 배경 탭/Android 뒤로가기로 닫을 때
  onClose: () => void;
  // "이전" — 리포트 요약 모달로 되돌아갈 때
  onPrev: () => void;
  // "확인하고 홈으로" — 리포트 흐름을 끝낼 때
  onConfirm: () => void;
  // 추천 박스 하나를 눌렀을 때. 호출부는 rec.alarm으로 알림 추가 모달을 띄운다.
  onSelectRecommendation: (rec: ReportRecommendation) => void;
};

/** 주간 리포트의 두 번째 페이지: AI가 추천한 위치 알림 목록을 보여주는 팝업 모달입니다. */
export function WeeklyReportRecommendationsModal({
  visible,
  title = '지난주 소비 리포트',
  recommendations,
  onClose,
  onPrev,
  onConfirm,
  onSelectRecommendation,
}: WeeklyReportRecommendationsModalProps) {
  return (
    <CenterModal visible={visible} onClose={onClose}>
      {/* WeeklyReportModal과 같은 딥그린 헤더. 두 모달이 한 흐름(요약 → 추천)으로 보이게 모양을 맞춘다. */}
      <View style={styles.header}>
        <View style={styles.badge}>
          <BrandLogo size={40} />
        </View>
        <Text style={styles.subtitle}>주간 리포트</Text>
        <Text style={styles.title}>{title}</Text>
      </View>

      <View style={styles.body}>
        <View>
          <Text style={styles.sectionTitle}>위치 알림 추천</Text>
          <Text style={styles.sectionSub}>소비 패턴을 분석해 알림을 추천해 드려요.</Text>
        </View>

        {recommendations.map((rec, index) => (
          <Pressable
            key={`${rec.placeName}-${rec.timeRange}`}
            onPress={() => onSelectRecommendation(rec)}
            style={({ pressed }) => [styles.recCard, pressed && styles.recCardPressed]}>
            <Text style={styles.recIndex}>{index + 1}.</Text>
            <Text style={styles.recText}>
              {rec.description}{' '}
              <Text style={styles.recHighlight}>
                {rec.placeName} {rec.timeRange}
              </Text>
              에 알림을 설정해 보세요!
            </Text>
          </Pressable>
        ))}

        <View style={styles.buttonRow}>
          <Button onPress={onPrev} style={styles.prevButton} variant="white">
            이전
          </Button>
          <Button onPress={onConfirm} style={styles.confirmButton} variant="green">
            확인하고 홈으로
          </Button>
        </View>
      </View>
    </CenterModal>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingTop: 24,
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
  subtitle: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.reportHeaderSubtitle,
  },
  title: {
    marginTop: 4,
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  body: {
    padding: 20,
    gap: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.light.cardTitle,
  },
  sectionSub: {
    marginTop: 4,
    fontSize: 13,
    color: Colors.light.cardDescription,
  },
  recCard: {
    flexDirection: 'row',
    gap: 6,
    borderRadius: 16,
    padding: 16,
    backgroundColor: Colors.light.cardMutedBackground,
  },
  recCardPressed: {
    opacity: 0.7,
  },
  recIndex: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
    color: Colors.light.cardBodyText,
  },
  recText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: Colors.light.cardBodyText,
  },
  recHighlight: {
    fontWeight: '800',
    color: Colors.light.reportHeaderBackground,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  prevButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
  },
  confirmButton: {
    flex: 1.4,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.light.reportHeaderBackground,
  },
});
