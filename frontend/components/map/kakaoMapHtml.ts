// KakaoMap이 WebView에 띄우는 지도 페이지(HTML) 생성 전용 모듈.
// React나 RN 컴포넌트와는 무관하게, 순수하게 "카카오맵 SDK를 쓰는 HTML 문자열을 만드는" 역할만 한다.
//
// 지도 생성 자체(중심좌표/레벨)만 초기 HTML에 굽고, 그 이후 바뀌는 것들(마커/핀/선택핀/내 위치)은
// 전부 페이지 안에 정의해둔 setXxx 함수를 RN에서 injectJavaScript로 호출하는 방식으로 갱신한다.
// (마커처럼 자주 바뀌는 값을 매번 HTML을 새로 만들어 WebView에 넘기면, WebView가 통째로 리로드되면서
//  지도 중심/줌 레벨 같은 상태가 초기값으로 되돌아가는 문제가 있었다.)

const KAKAO_JS_KEY = process.env.EXPO_PUBLIC_KAKAO_JS_KEY;

export type LatLng = {
  lat: number;
  lng: number;
};

// 이름+누적 금액이 적힌 말풍선 마커. 개별(4단계)이면 가게 하나, 클러스터(1~3단계)면 구역 하나를 나타낸다.
export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  label: string; // 가게 이름 또는 구역 이름
  amount: number; // 누적 금액
  color: string; // 테두리 색 (개별=카테고리 지정색, 클러스터=브랜드 그린 등 호출부에서 결정)
};

export type BuildMapHtmlParams = {
  initialCenter: LatLng;
  initialLevel?: number;
};

// 검색 결과 핀(파랑)과 선택된 핀(초록)은 모양은 같고 색만 다르게 구분한다.
const PIN_COLOR = '#4285F4';
const SELECTED_PIN_COLOR = '#63A061';

// 지도 생성 자체(중심좌표/레벨)만 굽고, 마커/핀/선택핀/내 위치는 전부 RN에서 injectJavaScript로 채워 넣는다.
export function buildMapHtml({ initialCenter, initialLevel = 3 }: BuildMapHtmlParams) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; }
    .my-location-dot {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #4285F4;
      border: 2px solid #fff;
      box-shadow: 0 0 4px rgba(0,0,0,0.4);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}"></script>
  <script>
    const map = new kakao.maps.Map(document.getElementById('map'), {
      center: new kakao.maps.LatLng(${initialCenter.lat}, ${initialCenter.lng}),
      level: ${initialLevel},
    });

    const pinImageSize = new kakao.maps.Size(24, 34);
    function makePinImage(color) {
      const svg = '<svg width="24" height="34" viewBox="0 0 24 34" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 22 12 22s12-13 12-22c0-6.6-5.4-12-12-12z" fill="' + color + '"/>' +
        '<circle cx="12" cy="12" r="5" fill="#fff"/></svg>';
      return new kakao.maps.MarkerImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), pinImageSize);
    }
    const pinImage = makePinImage('${PIN_COLOR}');
    const selectedPinImage = makePinImage('${SELECTED_PIN_COLOR}');

    // ── 내 위치(파란 원) ──────────────────────────────────────────────
    let myLocationOverlay = null;
    function setMyLocation(loc) {
      if (myLocationOverlay) {
        myLocationOverlay.setMap(null);
        myLocationOverlay = null;
      }
      if (!loc) return;
      myLocationOverlay = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(loc.lat, loc.lng),
        content: '<div class="my-location-dot"></div>',
      });
      myLocationOverlay.setMap(map);
    }

    // ── 검색 결과 등 단순 핀 목록 ─────────────────────────────────────
    let pinMarkers = [];
    function setMapPins(pins) {
      pinMarkers.forEach(function (m) { m.setMap(null); });
      pinMarkers = pins.map(function (pin, index) {
        const marker = new kakao.maps.Marker({
          position: new kakao.maps.LatLng(pin.lat, pin.lng),
          image: pinImage,
          map: map,
        });
        kakao.maps.event.addListener(marker, 'click', function () {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'pin', index: index }));
        });
        return marker;
      });
    }

    // ── 탭/선택으로 찍히는 핀 하나 ────────────────────────────────────
    let selectedPinMarker = null;
    function setSelectedPin(pin) {
      if (selectedPinMarker) {
        selectedPinMarker.setMap(null);
        selectedPinMarker = null;
      }
      if (!pin) return;
      selectedPinMarker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(pin.lat, pin.lng),
        image: selectedPinImage,
        map: map,
      });
    }

    // ── 이름+금액 말풍선 마커 ──────────────────────────────────────────
    // 테두리 색과 같은 색 삼각형 꼬리 위에 살짝 작은 흰 삼각형을 겹쳐서
    // "흰 배경 + 테두리 색" 말풍선처럼 보이게 하는 흔한 CSS 트릭이다.
    function markerBubbleHtml(marker) {
      const amountText = marker.amount.toLocaleString('ko-KR') + '원';
      return '<div style="position: relative; display: inline-block;">' +
        '<div style="background:#fff;border:2px solid ' + marker.color + ';border-radius:10px;padding:5px 10px;' +
          'text-align:center;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.15);">' +
          '<div style="font-size:12px;font-weight:700;color:#18251E;line-height:15px;">' + marker.label + '</div>' +
          '<div style="font-size:11px;color:#789080;line-height:14px;">' + amountText + '</div>' +
        '</div>' +
        '<div style="position:absolute;bottom:-7px;left:50%;transform:translateX(-50%);width:0;height:0;' +
          'border-left:6px solid transparent;border-right:6px solid transparent;border-top:7px solid ' + marker.color + ';"></div>' +
        '<div style="position:absolute;bottom:-4.5px;left:50%;transform:translateX(-50%);width:0;height:0;' +
          'border-left:5px solid transparent;border-right:5px solid transparent;border-top:5.5px solid #fff;"></div>' +
      '</div>';
    }

    let bubbleOverlays = [];
    function setMapMarkers(markers) {
      bubbleOverlays.forEach(function (o) { o.setMap(null); });
      bubbleOverlays = markers.map(function (marker) {
        const el = document.createElement('div');
        el.innerHTML = markerBubbleHtml(marker);
        const content = el.firstChild;
        content.style.cursor = 'pointer';
        content.addEventListener('click', function () {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'marker', id: marker.id }));
        });
        const overlay = new kakao.maps.CustomOverlay({
          position: new kakao.maps.LatLng(marker.lat, marker.lng),
          content: content,
          yAnchor: 1.3,
        });
        overlay.setMap(map);
        return overlay;
      });
    }

    kakao.maps.event.addListener(map, 'click', function (mouseEvent) {
      const latlng = mouseEvent.latLng;
      window.ReactNativeWebView.postMessage(
        JSON.stringify({ type: 'tap', lat: latlng.getLat(), lng: latlng.getLng() })
      );
    });

    // 줌 버튼으로 바꾼 경우, 핀치줌한 경우 둘 다 여기로 들어와서 RN에 현재 레벨을 알려준다.
    kakao.maps.event.addListener(map, 'zoom_changed', function () {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'level', level: map.getLevel() }));
    });

    // 지도(+ 위 함수들)가 준비됐다고 RN에 알린다. RN은 이 신호를 받은 뒤부터 injectJavaScript로
    // setMapMarkers/setMapPins/setSelectedPin/setMyLocation을 호출한다.
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
  </script>
</body>
</html>
`;
}
