import { forwardRef, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  PanResponder,
  ScrollView,
  StyleProp,
  View,
  ViewStyle,
} from 'react-native';

import Colors from '@/constants/Colors';

type ScrollProps = {
  children: React.ReactNode;
  height: number; // 스크롤 영역이 보여지는 높이. 이 높이보다 내용이 길 때만 스크롤바가 보인다.
  style?: StyleProp<ViewStyle>;
};

// 흰 트랙 + 초록 막대로 된 커스텀 스크롤바가 있는 스크롤 영역. 트랙을 드래그해서 스크롤 위치를 직접 옮길 수도 있다.
export const Scroll = forwardRef<ScrollView, ScrollProps>(function Scroll({ children, height, style }, forwardedRef) {
  const [contentHeight, setContentHeight] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  // 드래그 계산에 쓰는 최신 값(리렌더 없이 바로 읽기 위한 ref)과, 드래그 시작 시점의 scrollY.
  const contentHeightRef = useRef(0);
  const scrollYRef = useRef(0);
  const dragStartScrollYRef = useRef(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // 바깥에서 넘겨준 ref와, 이 컴포넌트가 드래그 스크롤에 쓰는 내부 ref를 동시에 채운다.
  const setRefs = (node: ScrollView | null) => {
    scrollViewRef.current = node;
    if (typeof forwardedRef === 'function') {
      forwardedRef(node);
    } else if (forwardedRef) {
      forwardedRef.current = node;
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollYRef.current = event.nativeEvent.contentOffset.y;
    setScrollY(scrollYRef.current);
  };

  const handleContentSizeChange = (_: number, contentHeightValue: number) => {
    contentHeightRef.current = contentHeightValue;
    setContentHeight(contentHeightValue);
  };

  const showScrollbar = contentHeight > height;
  const thumbHeight = showScrollbar ? Math.max((height / contentHeight) * height, 24) : 0;
  const thumbTop = showScrollbar ? (scrollY / (contentHeight - height)) * (height - thumbHeight) : 0;

  // 트랙(넓은 터치 영역)을 드래그하면, 드래그한 만큼을 스크롤 비율로 환산해서 그 위치로 스크롤한다.
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStartScrollYRef.current = scrollYRef.current;
      },
      onPanResponderMove: (_, gestureState) => {
        const contentH = contentHeightRef.current;
        if (contentH <= height) {
          return;
        }
        const scrollRange = contentH - height;
        const thumbH = Math.max((height / contentH) * height, 24);
        const trackRange = height - thumbH;
        if (trackRange <= 0) {
          return;
        }
        const deltaScroll = (gestureState.dy / trackRange) * scrollRange;
        const nextY = Math.min(Math.max(dragStartScrollYRef.current + deltaScroll, 0), scrollRange);
        scrollViewRef.current?.scrollTo({ y: nextY, animated: false });
      },
    })
  ).current;

  return (
    <View style={[{ flexDirection: 'row' }, style]}>
      <ScrollView
        ref={setRefs}
        style={{ maxHeight: height, flex: 1 }}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onContentSizeChange={handleContentSizeChange}>
        {children}
      </ScrollView>

      {showScrollbar && (
        <View
          {...panResponder.panHandlers}
          style={{ width: 20, height, alignItems: 'center' }}>
          <View style={{ width: 4, height, backgroundColor: Colors.light.cardBackground, borderRadius: 2 }}>
            <View
              style={{
                position: 'absolute',
                top: thumbTop,
                width: 4,
                height: thumbHeight,
                backgroundColor: Colors.light.primary,
                borderRadius: 2,
              }}
            />
          </View>
        </View>
      )}
    </View>
  );
});
