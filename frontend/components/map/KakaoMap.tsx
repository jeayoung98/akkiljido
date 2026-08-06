import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

import { buildMapHtml, type LatLng, type MapMarker } from './kakaoMapHtml';

// LatLng/MapMarker는 지도 HTML 생성 모듈(kakaoMapHtml.ts)이 원래 소유한 타입이지만,
// 기존에 '@/components/map/KakaoMap'에서 가져다 쓰던 화면들이 그대로 동작하도록 여기서도 다시 내보낸다.
export type { LatLng, MapMarker };

export type MapBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

// RN에서 지도를 명령형으로 조작할 때 쓰는 핸들. ref로 접근한다.
export type KakaoMapHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  // 특정 레벨(1~14)로 바로 이동한다. 줌 4단계처럼 정해진 레벨로 점프할 때 쓴다.
  setLevel: (level: number) => void;
  // 지도 중심을 특정 좌표로 옮긴다. "내 위치로 이동" 버튼처럼, 좌표값이 이전과 같아서
  // HTML이 재생성되지 않는 경우에도(=WebView가 재로딩을 안 하는 경우에도) 확실히 이동시키기 위해 쓴다.
  setCenter: (coords: LatLng) => void;
  // 로드뷰 모드를 켜고 끈다. 켜면 로드뷰가 있는 도로가 파란 선으로 표시되고,
  // 그동안 지도 탭은 위치 선택 대신 "그 지점 로드뷰 열기"로 동작한다.
  setRoadviewMode: (on: boolean) => void;
  // 열려 있는 로드뷰(거리 사진)를 닫고 지도로 돌아온다. 로드뷰 모드 자체는 유지된다.
  closeRoadview: () => void;
};

type KakaoMapProps = {
  initialCenter: LatLng;
  // 카카오맵 줌 레벨(1~14, 작을수록 확대). 기본 3. 지도 생성 시점에만 쓰이고, 이후엔 setLevel로만 바뀐다.
  initialLevel?: number;
  // false면 드래그(이동)를 막는다. 기본 true.
  draggable?: boolean;
  // false면 확대·축소(핀치줌·휠줌)를 막는다. 기본 true. draggable과 별개 옵션이다.
  zoomable?: boolean;
  // 내 위치. 있으면 연두색 동그라미로 표시한다(핀 아님). 없으면 아무것도 안 보인다.
  myLocation?: LatLng;
  // 내 장소(집/직장 등). 있으면 그 좌표에 파란 점 + 반경 2km 반투명 원을 표시한다.
  myPlaceCircle?: LatLng;
  // myPlaceCircle과 같은 파란 점이지만 반경 원 없이 점만 표시한다(홈 화면 미니 지도처럼 원이 필요 없을 때).
  myPlaceDot?: LatLng;
  // 이름+금액이 적힌 말풍선 마커 목록 (지도 탭의 가게별/클러스터 마커용).
  markers?: MapMarker[];
  // 검색 결과 등 여러 개 찍을 핀 목록.
  pins?: LatLng[];
  // 지도를 탭했거나 결과 하나를 선택했을 때, 그 위치에 찍을 핀 하나. pins와 모양은 같고 색만 다르다.
  selectedPin?: LatLng;
  onSelectLocation?: (coords: LatLng) => void;
  // pins 배열의 핀 하나를 눌렀을 때, 그 핀이 pins 배열에서 몇 번째인지 알려준다.
  onPinPress?: (index: number) => void;
  // markers 배열의 말풍선 하나를 눌렀을 때, 그 마커의 id를 알려준다.
  onMarkerPress?: (id: string) => void;
  // 지도 확대/축소 레벨이 바뀔 때마다 알려준다(줌 버튼으로 바꾼 경우 + 사용자가 직접 핀치줌한 경우 둘 다 포함).
  onLevelChange?: (level: number) => void;
  // 지도 이동·확대·축소가 끝난 시점의 화면 경계값. 지도 API의 south/west/north/east로 사용한다.
  onBoundsChange?: (bounds: MapBounds) => void;
  // 로드뷰(거리 사진)가 열리거나 닫힐 때 알려준다. 화면이 닫기 버튼 표시 여부를 정하는 데 쓴다.
  onRoadviewChange?: (open: boolean) => void;
  // 로드뷰 모드에서 탭한 지점 근처(50m)에 로드뷰가 없을 때 알려준다.
  onRoadviewUnavailable?: () => void;
  // 지도(WebView + 카카오맵 SDK)가 준비돼서 ref의 setCenter 등을 호출해도 안전해진 시점에 알려준다.
  // 이 시점 전에 setCenter를 호출하면 WebView 안의 map이 아직 없어서 조용히 무시된다.
  onReady?: () => void;
  style?: StyleProp<ViewStyle>;
};

export const KakaoMap = forwardRef<KakaoMapHandle, KakaoMapProps>(function KakaoMap(
  {
    initialCenter,
    initialLevel,
    draggable,
    zoomable,
    myLocation,
    myPlaceCircle,
    myPlaceDot,
    markers,
    pins,
    selectedPin,
    onSelectLocation,
    onPinPress,
    onMarkerPress,
    onLevelChange,
    onBoundsChange,
    onRoadviewChange,
    onRoadviewUnavailable,
    onReady,
    style,
  },
  ref
) {
  const webViewRef = useRef<WebView>(null);
  // 지도(+ setMapMarkers 등 페이지 내 함수들)가 준비됐는지. 준비되기 전에 injectJavaScript를 호출하면
  // 아직 정의되지 않은 함수를 부르는 셈이라 에러가 난다.
  const [isReady, setIsReady] = useState(false);

  // 지도 생성에 필요한 중심좌표/레벨만 최초 1회 HTML에 굽는다. 이후 props가 바뀌어도 다시 계산하지 않는다
  // (markers/pins처럼 자주 바뀌는 값까지 여기 포함되면, 바뀔 때마다 HTML이 새로 만들어져서
  //  WebView가 통째로 리로드되고 지도 중심·줌 레벨이 초기값으로 되돌아가 버린다).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const html = useMemo(() => buildMapHtml({ initialCenter, initialLevel, draggable, zoomable }), []);

  // RN → WebView 방향 통신: injectJavaScript로 WebView 안의 map 객체(또는 kakaoMapHtml.ts가 정의해둔
  // setXxx 함수들)에 직접 명령을 실행시킨다.
  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      webViewRef.current?.injectJavaScript('map.setLevel(map.getLevel() - 1); true;');
    },
    zoomOut: () => {
      webViewRef.current?.injectJavaScript('map.setLevel(map.getLevel() + 1); true;');
    },
    setLevel: (level) => {
      webViewRef.current?.injectJavaScript(`map.setLevel(${level}); true;`);
    },
    setCenter: (coords) => {
      webViewRef.current?.injectJavaScript(
        `map.setCenter(new kakao.maps.LatLng(${coords.lat}, ${coords.lng})); true;`
      );
    },
    setRoadviewMode: (on) => {
      webViewRef.current?.injectJavaScript(`setRoadviewMode(${on}); true;`);
    },
    closeRoadview: () => {
      webViewRef.current?.injectJavaScript('closeRoadview(); true;');
    },
  }));

  // 지도가 준비된 뒤로는, markers/pins/selectedPin/myLocation이 바뀔 때마다(그리고 준비된 직후 한 번)
  // 각자 담당 함수를 호출해서 갱신한다. HTML을 다시 만들지 않으므로 리로드도, 상태 초기화도 없다.
  useEffect(() => {
    if (isReady) {
      webViewRef.current?.injectJavaScript(`setMapMarkers(${JSON.stringify(markers ?? [])}); true;`);
    }
  }, [isReady, markers]);

  useEffect(() => {
    if (isReady) {
      webViewRef.current?.injectJavaScript(`setMapPins(${JSON.stringify(pins ?? [])}); true;`);
    }
  }, [isReady, pins]);

  useEffect(() => {
    if (isReady) {
      webViewRef.current?.injectJavaScript(`setSelectedPin(${JSON.stringify(selectedPin ?? null)}); true;`);
    }
  }, [isReady, selectedPin]);

  useEffect(() => {
    if (isReady) {
      webViewRef.current?.injectJavaScript(`setMyLocation(${JSON.stringify(myLocation ?? null)}); true;`);
    }
  }, [isReady, myLocation]);

  useEffect(() => {
    if (isReady) {
      webViewRef.current?.injectJavaScript(`setMyPlaceCircle(${JSON.stringify(myPlaceCircle ?? null)}); true;`);
    }
  }, [isReady, myPlaceCircle]);

  useEffect(() => {
    if (isReady) {
      webViewRef.current?.injectJavaScript(`setMyPlaceDot(${JSON.stringify(myPlaceDot ?? null)}); true;`);
    }
  }, [isReady, myPlaceDot]);

  // WebView → RN 방향 통신: 지도 안에서 일어난 일(준비 완료, 핀 클릭, 탭, 줌 변경)을 postMessage로 받는다.
  const handleMessage = (event: WebViewMessageEvent) => {
    const message = JSON.parse(event.nativeEvent.data);
    if (message.type === 'ready') {
      setIsReady(true);
      onReady?.();
    } else if (message.type === 'pin') {
      onPinPress?.(message.index);
    } else if (message.type === 'marker') {
      onMarkerPress?.(message.id);
    } else if (message.type === 'tap') {
      onSelectLocation?.({ lat: message.lat, lng: message.lng });
    } else if (message.type === 'level') {
      onLevelChange?.(message.level);
    } else if (message.type === 'bounds') {
      onBoundsChange?.({
        south: message.south,
        west: message.west,
        north: message.north,
        east: message.east,
      });
    } else if (message.type === 'roadview') {
      onRoadviewChange?.(message.open);
    } else if (message.type === 'roadviewUnavailable') {
      onRoadviewUnavailable?.();
    }
  };

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html }}
        onMessage={handleMessage}
        javaScriptEnabled
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
