// 공용 아코디언 카드. 헤더를 탭하면 children(상세 내용)이 펼쳐지고 접힌다.
// 지도 탭의 가게별 거래 카드, 리포트 탭의 기간별 리포트 카드 등에서 재사용한다.
import { useState, type ReactNode } from 'react';
import { LayoutAnimation, Platform, Pressable, StyleSheet, UIManager, View } from 'react-native';

import { IconButton } from '@/components/common/button/IconButton';
import BaseCard from '@/components/common/card/BaseCard';

// Android 구 아키텍처에서는 LayoutAnimation을 쓰려면 명시적으로 켜줘야 함
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type AccordionCardProps = {
  header: ReactNode; // 항상 보이는 부분. 헤더 줄 전체를 눌러도 토글된다.
  children: ReactNode; // 펼쳤을 때만 보이는 상세 내용
  defaultOpen?: boolean; // 처음부터 펼쳐진 상태로 시작할지 여부
};

// 헤더 줄(또는 화살표 아이콘)을 누르면 children이 펼쳐지고, 다시 누르면 접힌다.
// BaseCard의 기본 패딩은 0으로 없애고, 헤더/본문 여백은 이 컴포넌트가 직접 관리한다.
export default function AccordionCard({ header, children, defaultOpen = false }: AccordionCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((prev) => !prev);
  };

  return (
    <BaseCard style={styles.card}>
      <Pressable style={styles.header} onPress={toggle}>
        <View style={styles.headerContent}>{header}</View>
        {/* chevronDown 아이콘을 별도로 만들지 않고, 열렸을 때 180도 회전시켜 위쪽을 가리키게 한다 */}
        <IconButton name="chevronDown" onPress={toggle} style={open && styles.chevronOpen} />
      </Pressable>
      {open && <View style={styles.body}>{children}</View>}
    </BaseCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
    gap: 8,
  },
  headerContent: {
    flex: 1,
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  chevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
});
