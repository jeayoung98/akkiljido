import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/common/typography/Text';

import { CentralModal } from '@/components/common/modal/CentralModal';
import { Button } from '@/components/common/button/Button';
import { BrandLogo } from '@/components/onboarding/BrandLogo';
import Colors from '@/constants/Colors';

// 주간·월간 리포트가 이 하나의 모달/타입을 같이 쓴다. 기간이 얼마나 긴지는 데이터(period)로만
// 구분되고, 컴포넌트 자체는 어느 쪽인지 몰라도 되게 만든다.
//
// 값은 전부 GET /api/v1/report/{id}(= 리포트 푸시 data.report)에서 온다.
// 옵셔널 필드는 그 API가 내려주지 않는 값이라, 없으면 해당 칸을 그리지 않는다.
// (utils/reportAdapters.ts의 toReportModalData가 이 변환을 담당한다.)
export type ReportData = {
  period: { start: string; end: string } | null; // "2026-10-12" (YYYY-MM-DD). 기간 정보가 없는 과거 리포트는 null.
  headline: string; // AI가 뽑은 한 줄 요약. 헤더의 메인 타이틀로 쓴다.
  totalAmount: number; // 기간 총지출
  /** 카테고리별 집계. 리포트 API에는 없어서 보통 비어 있고, 그 자리엔 topSpendingPlace를 대신 그린다. */
  topCategory?: { name: string; amount: number };
  /** 최다 지출 장소. count는 리포트 기간의 재량지출 건수. */
  topSpendingPlace?: { name: string; count: number };
  /** 최다 방문 장소. count(그 장소 방문 횟수)는 서버에 없어서, 보통 placeCount(기간 내 방문 장소 수)만 온다. */
  topPlace: { name: string; count?: number; placeCount?: number };
  body: string[]; // AI 분석 문장들. 이어 붙여서 한 문단으로 보여준다.
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

function formatPeriod(period: { start: string; end: string }) {
  return `${formatMonthDay(period.start)}~${formatMonthDay(period.end)}`;
}

function formatWon(amount: number) {
  return `${amount.toLocaleString('ko-KR')}원`;
}

/** 주간·월간 소비 리포트를 요약해서 보여주는 팝업 모달입니다. */
export function ReportModal({
  visible,
  onClose,
  data,
  periodLabel = '주간 리포트',
  onViewRecommendations,
}: ReportModalProps) {
  // 왼쪽 칸: 카테고리 집계가 있으면 그걸, 없으면 최다 지출 장소를 같은 자리에 그린다.
  const primaryCell = data.topCategory
    ? {
        label: '최다 소비 카테고리',
        value: data.topCategory.name,
        sub: formatWon(data.topCategory.amount),
      }
    : data.topSpendingPlace
      ? {
          label: '최다 지출 장소',
          value: data.topSpendingPlace.name || '-',
          sub: `총 ${data.topSpendingPlace.count}건`,
        }
      : null;

  // 오른쪽 칸의 보조 문구: 그 장소 방문 횟수가 있으면 "N회", 없으면 기간 내 방문 장소 수를 쓴다.
  const frequentPlaceSub =
    data.topPlace.count !== undefined
      ? `${data.topPlace.count}회`
      : data.topPlace.placeCount !== undefined
        ? `방문 장소 ${data.topPlace.placeCount}곳`
        : null;

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
          <Text style={styles.totalAmount}>{formatWon(data.totalAmount)}</Text>
          {data.period ? <Text style={styles.totalPeriod}>{formatPeriod(data.period)}</Text> : null}
        </View>

        <View style={styles.grid}>
          {primaryCell ? (
            <View style={styles.gridCard}>
              <Text style={styles.gridLabel}>{primaryCell.label}</Text>
              <Text style={styles.gridValue} numberOfLines={1}>
                {primaryCell.value}
              </Text>
              <Text style={styles.gridSub}>{primaryCell.sub}</Text>
            </View>
          ) : null}
          <View style={[styles.gridCard, primaryCell ? styles.gridCardDivider : null]}>
            <Text style={styles.gridLabel}>가장 자주 소비한 장소</Text>
            <Text style={styles.gridValue} numberOfLines={1}>
              {data.topPlace.name || '-'}
            </Text>
            {frequentPlaceSub ? <Text style={styles.gridSub}>{frequentPlaceSub}</Text> : null}
          </View>
        </View>

        <View style={styles.aiCard}>
          <Text style={styles.aiTitle}>AI 분석</Text>
          <Text style={styles.aiBody}>
            {data.body.length > 0 ? data.body.join(' ') : '분석 내용이 없습니다.'}
          </Text>
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
