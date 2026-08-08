import { StyleSheet, Text, View } from 'react-native';

import { CentralModal } from '@/components/common/modal/CentralModal';
import { Button } from '@/components/common/button/Button';
import { BrandLogo } from '@/components/onboarding/BrandLogo';
import Colors from '@/constants/Colors';

// 주간·월간 리포트가 이 하나의 모달/타입을 같이 쓴다. 기간이 얼마나 긴지는 데이터(period)로만
// 구분되고, 컴포넌트 자체는 어느 쪽인지 몰라도 되게 만든다.
export type ReportData = {
  period: { start: string; end: string }; // "2026-10-12" (YYYY-MM-DD)
  headline: string; // AI가 뽑은 한 줄 요약. 헤더의 메인 타이틀로 쓴다.
  // 아래 세 필드는 백엔드가 계산해서 내려주는 값. (최초 공유받은 예시 JSON엔 생략되어 있었음)
  totalAmount: number;
  topCategory: { name: string; amount: number };
  topPlace: { name: string; count: number };
  body: string[]; // AI 분석 문장들. 이어 붙여서 한 문단으로 보여준다.
  publishedAt: string; // 리포트 발행 일시. "2026-08-01T07:00:00" (과거 리포트 목록에 "발행 8월 1일 오전 7:00"로 표시)
  comparedToPrevious: number; // 직전 기간 대비 증감률(%). 양수/음수 부호 포함. "전주/전월 대비 +14%"에 쓴다.
};

export type ReportModalProps = {
  visible: boolean;
  onClose: () => void;
  data: ReportData;
  // 헤더 배지 위에 뜨는 작은 라벨. "주간 리포트"/"월간 리포트"처럼 호출부가 정한다. 기본은 "주간 리포트".
  periodLabel?: string;
  // "알뜰 추천 보기" 버튼을 눌렀을 때. recommendations를 어떻게 보여줄지는 호출부(화면)가 결정한다.
  onViewRecommendations: () => void;
};

// "2026-10-12" → "10월 12일"
function formatMonthDay(dateString: string) {
  const [, month, day] = dateString.split('-');
  return `${Number(month)}월 ${Number(day)}일`;
}

function formatPeriod(period: ReportData['period']) {
  return `${formatMonthDay(period.start)}~${formatMonthDay(period.end)}`;
}

/** 주간·월간 소비 리포트를 요약해서 보여주는 팝업 모달입니다. */
export function ReportModal({
  visible,
  onClose,
  data,
  periodLabel = '주간 리포트',
  onViewRecommendations,
}: ReportModalProps) {
  return (
    <CentralModal visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <BrandLogo size={40} />
        </View>
        <Text style={styles.subtitle}>{periodLabel}</Text>
        <Text style={styles.title}>{data.headline}</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>총 지출</Text>
          <Text style={styles.totalAmount}>{data.totalAmount.toLocaleString('ko-KR')}원</Text>
          <Text style={styles.totalPeriod}>{formatPeriod(data.period)}</Text>
        </View>

        <View style={styles.grid}>
          <View style={styles.gridCard}>
            <Text style={styles.gridLabel}>최다 소비 카테고리</Text>
            <Text style={styles.gridValue} numberOfLines={1}>
              {data.topCategory.name}
            </Text>
            <Text style={styles.gridSub}>{data.topCategory.amount.toLocaleString('ko-KR')}원</Text>
          </View>
          <View style={[styles.gridCard, styles.gridCardDivider]}>
            <Text style={styles.gridLabel}>가장 자주 소비한 장소</Text>
            <Text style={styles.gridValue} numberOfLines={1}>
              {data.topPlace.name}
            </Text>
            <Text style={styles.gridSub}>{data.topPlace.count}회</Text>
          </View>
        </View>

        <View style={styles.aiCard}>
          <Text style={styles.aiTitle}>AI 분석</Text>
          <Text style={styles.aiBody}>{data.body.join(' ')}</Text>
        </View>

        <Button
          onPress={onViewRecommendations}
          style={styles.cta}
          variant="green">
          알뜰 추천 보기
        </Button>
      </View>
    </CentralModal>
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
    color: Colors.onboarding.inverseText,
    textAlign: 'center',
  },
  body: {
    padding: 20,
    gap: 14,
  },
  totalCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: Colors.light.cardMutedBackground,
  },
  totalLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  totalAmount: {
    marginTop: 4,
    fontSize: 26,
    fontWeight: '800',
    color: Colors.light.reportHeaderBackground,
  },
  totalPeriod: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  grid: {
    flexDirection: 'row',
    borderRadius: 16,
    backgroundColor: Colors.light.cardMutedBackground,
  },
  gridCard: {
    flex: 1,
    padding: 14,
  },
  gridCardDivider: {
    borderLeftWidth: 1,
    borderLeftColor: Colors.light.border,
  },
  gridLabel: {
    fontSize: 11,
    color: Colors.light.textSecondary,
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
  aiCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: Colors.light.cardMutedBackground,
  },
  aiTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.light.reportHeaderBackground,
  },
  aiBody: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.light.textSecondary,
  },
  cta: {
    marginTop: 4,
    backgroundColor: Colors.light.reportHeaderBackground,
    borderRadius: 14,
  },
});
