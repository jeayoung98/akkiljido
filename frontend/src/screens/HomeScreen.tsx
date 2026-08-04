import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import AppScreen from '@/components/common/AppScreen';
import { ReportModal } from '@/components/report/ReportModal';
import Colors from '@/constants/Colors';
import { useShowOncePerPeriod } from '@/hooks/useShowOncePerPeriod';
import { MOCK_WEEKLY_REPORT } from '@/mocks/report';
import { getWeekIdentifier } from '@/utils/reportSchedule';

const LAST_SHOWN_WEEK_STORAGE_KEY = 'report:lastShownWeek';

export default function HomeScreen() {
  // 이번 주에 처음 홈 화면에 들어온 경우에만 true가 되고, 저장까지 자동으로 끝난다.
  const weekIdentifier = getWeekIdentifier();
  const shouldShowWeeklyReport = useShowOncePerPeriod(LAST_SHOWN_WEEK_STORAGE_KEY, weekIdentifier);
  const [reportVisible, setReportVisible] = useState(false);

  useEffect(() => {
    if (shouldShowWeeklyReport) {
      setReportVisible(true);
    }
  }, [shouldShowWeeklyReport]);

  return (
    <AppScreen scrollable backgroundColor={Colors.light.primary}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>홈</Text>
        <Text style={styles.headerDescription}>상단 Safe Area와 이어지는 초록색 영역</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.bodyTitle}>HomeScreen 초안</Text>
        <Text style={styles.bodyDescription}>실제 홈 콘텐츠가 들어갈 흰색 본문 영역</Text>
      </View>

      <ReportModal
        visible={reportVisible}
        onClose={() => setReportVisible(false)}
        data={MOCK_WEEKLY_REPORT}
        onViewRecommendations={() => {}}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 200, justifyContent: 'center', paddingTop: 16, paddingHorizontal: 24 },
  headerTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '800' },
  headerDescription: { marginTop: 8, color: '#E3F0DF', fontSize: 13 },
  body: { flexGrow: 1, padding: 24, backgroundColor: '#FFFFFF' },
  bodyTitle: { color: '#18251E', fontSize: 18, fontWeight: '800' },
  bodyDescription: { marginTop: 8, color: '#819087', fontSize: 13 },
});
