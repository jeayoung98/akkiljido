// KakaoMap이 WebView에 띄우는 지도 페이지(HTML) 생성 전용 모듈.
// React나 RN 컴포넌트와는 무관하게, 순수하게 "카카오맵 SDK를 쓰는 HTML 문자열을 만드는" 역할만 한다.
//
// 지도 생성 자체(중심좌표/레벨)만 초기 HTML에 굽고, 그 이후 바뀌는 것들(마커/핀/선택핀/내 위치)은
// 전부 페이지 안에 정의해둔 setXxx 함수를 RN에서 injectJavaScript로 호출하는 방식으로 갱신한다.
// (마커처럼 자주 바뀌는 값을 매번 HTML을 새로 만들어 WebView에 넘기면, WebView가 통째로 리로드되면서
//  지도 중심/줌 레벨 같은 상태가 초기값으로 되돌아가는 문제가 있었다.)

import type { CategoryIconKey } from '@/constants/categories';

const KAKAO_JS_KEY = process.env.EXPO_PUBLIC_KAKAO_JS_KEY;
console.log('[KakaoMap] key exists:', !!KAKAO_JS_KEY, 'length:', KAKAO_JS_KEY?.length);

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
  selected?: boolean; // true면 다른 마커보다 테두리를 더 두껍게 그려서 강조한다.
  // 가게 이름 앞에 보여줄 카테고리 아이콘. 구역(클러스터) 마커처럼 카테고리 하나로 특정할 수 없으면 생략한다.
  iconKey?: CategoryIconKey;
};

export type BuildMapHtmlParams = {
  initialCenter: LatLng;
  initialLevel?: number;
  // false면 드래그(이동)를 막는다.
  draggable?: boolean;
  // false면 확대·축소(핀치줌·휠줌)를 막는다. draggable과 독립적인 옵션이다.
  zoomable?: boolean;
};

// 검색 결과 핀(파랑)과 선택된 핀(초록)은 모양은 같고 색만 다르게 구분한다.
const PIN_COLOR = '#4285F4';
const SELECTED_PIN_COLOR = '#63A061';
// 내 위치 점은 연두색으로, 내 장소 점(파랑)·검색 핀(파랑)과 구분되게 한다.
const MY_LOCATION_COLOR = '#8BC34A';

// 지도 생성 자체(중심좌표/레벨)만 굽고, 마커/핀/선택핀/내 위치는 전부 RN에서 injectJavaScript로 채워 넣는다.
export function buildMapHtml({ initialCenter, initialLevel = 3, draggable = true, zoomable = true }: BuildMapHtmlParams) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; }
    .my-location-dot, .my-place-dot {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 2px solid #fff;
      box-shadow: 0 0 4px rgba(0,0,0,0.4);
    }
    .my-location-dot { background: ${MY_LOCATION_COLOR}; }
    .my-place-dot { background: ${PIN_COLOR}; }
    /* 로드뷰는 평소엔 숨겨져 있다가, 열리면 위쪽 2/3을 덮는다. 아래쪽 1/3은 #map이 그대로 비쳐서
       지금 어디를 보고 있는지 알 수 있고, 그 부분은 원래 지도라 그대로 줌/이동이 된다. */
    #roadview { display: none; position: absolute; top: 0; left: 0; right: 0; bottom: 33%; z-index: 10; }
    /* 로드뷰 위치/시선 방향 마커. 흰 점(위치) 위에 화살표(시선 방향, pan 각도만큼 회전)를 겹친다. */
    .roadview-marker { position: relative; width: 1px; height: 1px; }
    .roadview-marker-dot {
      position: absolute; top: 0; left: 0; transform: translate(-50%, -50%);
      width: 14px; height: 14px; border-radius: 50%;
      background: #fff; border: 2px solid #4285F4; box-shadow: 0 0 4px rgba(0,0,0,0.4);
    }
    .roadview-marker-arrow {
      position: absolute; top: 0; left: 0;
      width: 0; height: 0;
      border-left: 7px solid transparent;
      border-right: 7px solid transparent;
      border-bottom: 16px solid rgba(66,133,244,0.55);
      transform-origin: 50% 26px;
      transform: translate(-50%, -26px) rotate(0deg);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="roadview"></div>
  <script>
    // 이 페이지 안에서 무슨 에러가 나든(SDK 로드 실패, 초기화 실패, 런타임 에러) RN이 알 수 있도록
    // 여기서 잡아서 postMessage로 던진다. 안 그러면 흰 화면만 뜨고 RN·logcat 어디에도 아무 흔적이 안 남는다.
    window.onerror = function (message, source, lineno, colno, error) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'error',
        message: String(message) + ' (' + source + ':' + lineno + ':' + colno + ')' + (error && error.stack ? '\\n' + error.stack : ''),
      }));
      return true;
    };
  </script>
  <script
    src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&autoload=false"
    onerror="window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: 'Kakao Maps SDK 스크립트 로드 실패 (키/네트워크/도메인 확인 필요)' }))"
  ></script>
  <script>
    // autoload=false를 쓰면 이 시점엔 kakao.maps.Map/LatLng 등 실제 지도 모듈이 아직 없고,
    // kakao.maps.load(callback)로 등록해야 로드가 시작되고 콜백이 불린다. (autoload=false 없이
    // 바로 new kakao.maps.LatLng(...)을 부르면 SDK가 내부적으로 document.write로 모듈을 비동기
    // 로드하는 도중이라 "kakao.maps.LatLng is not a constructor" 에러가 난다 — 실제로 겪은 에러.)
    var map, pinImage, selectedPinImage, pinImageSize;

    function makePinImage(color) {
      const svg = '<svg width="24" height="34" viewBox="0 0 24 34" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 22 12 22s12-13 12-22c0-6.6-5.4-12-12-12z" fill="' + color + '"/>' +
        '<circle cx="12" cy="12" r="5" fill="#fff"/></svg>';
      return new kakao.maps.MarkerImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), pinImageSize);
    }

    // ── 내 위치(연두색 점) ────────────────────────────────────────────
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

    // ── 내 장소(파란 점 + 반경 원) ────────────────────────────────
    // 점은 내 위치 점(연두)과 모양은 같고 색만 파랑(.my-place-dot)이다.
    // 원은 "이 범위 안의 소비 내역을 보고 있다"는 표시라서 목 데이터의 근처 판정(약 2km)과 맞춘다.
    // radius/color를 안 넘기면(null/undefined) 실제 서비스 기준(2km, 파란색)을 그대로 쓴다.
    // 다른 반경·색은 시연/테스트 목적(예: app/test.tsx)으로만 넘긴다.
    let myPlaceDotOverlay = null;
    let myPlaceCircleShape = null;
    function setMyPlaceCircle(place, radius, color) {
      if (myPlaceDotOverlay) {
        myPlaceDotOverlay.setMap(null);
        myPlaceDotOverlay = null;
      }
      if (myPlaceCircleShape) {
        myPlaceCircleShape.setMap(null);
        myPlaceCircleShape = null;
      }
      if (!place) return;
      const circleColor = color || '${PIN_COLOR}';
      const position = new kakao.maps.LatLng(place.lat, place.lng);
      myPlaceCircleShape = new kakao.maps.Circle({
        center: position,
        radius: radius || 2000,
        strokeWeight: 2,
        strokeColor: circleColor,
        strokeOpacity: 0.8,
        fillColor: circleColor,
        fillOpacity: 0.06,
      });
      myPlaceCircleShape.setMap(map);
      myPlaceDotOverlay = new kakao.maps.CustomOverlay({
        position: position,
        content: '<div class="my-place-dot" style="background:' + circleColor + '"></div>',
      });
      myPlaceDotOverlay.setMap(map);
    }

    // ── 내 장소 점만(반경 원 없이) ────────────────────────────────────
    // setMyPlaceCircle과 같은 파란 점(.my-place-dot)이지만 원은 그리지 않는다.
    let myPlaceDotOnlyOverlay = null;
    function setMyPlaceDot(place) {
      if (myPlaceDotOnlyOverlay) {
        myPlaceDotOnlyOverlay.setMap(null);
        myPlaceDotOnlyOverlay = null;
      }
      if (!place) return;
      myPlaceDotOnlyOverlay = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(place.lat, place.lng),
        content: '<div class="my-place-dot"></div>',
      });
      myPlaceDotOnlyOverlay.setMap(map);
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

    // ── 카테고리 아이콘 ────────────────────────────────────────────────
    // components/transaction/CategoryIcon.tsx(react-native-svg 버전)와 같은 모양을 그린 것.
    // 이 파일은 WebView 안에서 실행되는 순수 문자열이라 그 컴포넌트를 그대로 가져다 쓸 수 없어서
    // path/원 좌표만 옮겨왔다 — 아이콘 모양을 바꾸면 두 파일을 같이 고쳐야 한다.
    const CATEGORY_ICON_PATHS = {
      restaurant: ['M7 3v8', 'M4.5 3v4.5A2.5 2.5 0 0 0 7 10', 'M9.5 3v4.5A2.5 2.5 0 0 1 7 10', 'M7 10v11', 'M16 3v18', 'M16 3c3 2 4 5 4 8h-4'],
      cafe: ['M5 9h11v5.2A4.8 4.8 0 0 1 11.2 19H9.8A4.8 4.8 0 0 1 5 14.2V9Z', 'M16 10h1.2a2.8 2.8 0 0 1 0 5.6H16', 'M4 20h14', 'M8 6.5c-1-1-.8-2 .2-3', 'M12 6.5c-1-1-.8-2 .2-3', 'M8.2 12.2c.7-.8 1.8-.7 2.3.2.5-.9 1.6-1 2.3-.2.8.9.3 2-2.3 3.4-2.6-1.4-3.1-2.5-2.3-3.4Z'],
      mart: ['M4 9h16l-1.5 10h-13L4 9Z', 'M8 9l2-4', 'M16 9l-2-4', 'M8 13v3', 'M12 13v3', 'M16 13v3'],
      shopping: ['M5 8h14l-1 12H6L5 8Z', 'M9 8V6a3 3 0 0 1 6 0v2'],
      leisure: ['M8.5 13.5L12 21l3.5-7.5Z', 'M9.6 15.8h4.8', 'M12 10V5.5', 'M9.2 10.8L6.4 7.8', 'M14.8 10.8l2.8-3', 'M8 12H4.5', 'M16 12h3.5', 'M7.3 5.2l-.6-1.4', 'M16.7 5.2l.6-1.4'],
      transport: ['M5 16l1.3-4.8A2 2 0 0 1 8.2 9.8h7.6a2 2 0 0 1 1.9 1.4L19 16'],
      health: ['M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z', 'M7.5 12h2l1.2-2.5 2.2 5 1.2-2.5h2.4'],
      living: ['M3 11l9-7 9 7', 'M5 10v10h14V10', 'M9 20v-6h6v6'],
      beauty: ['M9 8.5V5.8l3.8-2.3 2.2 1.3v3.7', 'M9 8.5h6', 'M8.5 8.5h7l.7 5h-8.4l.7-5Z', 'M9 16.5h6'],
      education: ['M4 5.5A4.5 4.5 0 0 1 8.5 5H12v14H8.5A4.5 4.5 0 0 0 4 19.5v-14Z', 'M20 5.5A4.5 4.5 0 0 0 15.5 5H12v14h3.5a4.5 4.5 0 0 1 4.5.5v-14Z'],
      other: ['M8 7V5h8v2'],
      income: ['M9 7 8 4.5h8L15 7', 'M8.5 8.5h7', 'M8.5 9h7c2.2 1.6 3.5 4.3 3.5 7.3 0 .7.5 1.1.5 1.9 0 1.5-1.2 2.8-2.8 2.8H7.3c-1.6 0-2.8-1.3-2.8-2.8 0-.8.5-1.2.5-1.9C5 13.3 6.3 10.6 8.5 9Z', 'M14.5 12.8a3 3 0 1 0 0 4.4'],
    };
    const CATEGORY_ICON_RECTS = {
      transport: { x: 4, y: 16, width: 16, height: 4, rx: 1.5 },
      beauty: { x: 7.5, y: 13.5, width: 9, height: 7, rx: 1.5 },
      other: { x: 5, y: 7, width: 14, height: 12, rx: 2 },
    };
    // fill=색, stroke 없음으로 그리는 작은 점(장식용)들.
    const CATEGORY_ICON_DOTS = {
      leisure: [[4.5, 7, 0.7], [19.5, 7, 0.7], [12, 3.5, 0.7]],
      transport: [[8, 20, 1.6], [16, 20, 1.6]],
      other: [[9, 13, 1], [12, 13, 1], [15, 13, 1]],
    };

    function categoryIconSvg(iconKey, color) {
      const paths = CATEGORY_ICON_PATHS[iconKey] || CATEGORY_ICON_PATHS.other;
      const rect = CATEGORY_ICON_RECTS[iconKey];
      const dots = CATEGORY_ICON_DOTS[iconKey] || [];
      let inner = '';
      if (rect) {
        inner += '<rect x="' + rect.x + '" y="' + rect.y + '" width="' + rect.width + '" height="' + rect.height + '" rx="' + rect.rx + '"/>';
      }
      inner += paths.map(function (d) { return '<path d="' + d + '"/>'; }).join('');
      inner += dots.map(function (dot) {
        return '<circle cx="' + dot[0] + '" cy="' + dot[1] + '" r="' + dot[2] + '" fill="' + color + '" stroke="none"/>';
      }).join('');
      return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="2.4" ' +
        'stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">' + inner + '</svg>';
    }

    // ── 이름+금액 말풍선 마커 ──────────────────────────────────────────
    // 테두리 색과 같은 색 삼각형 꼬리 위에 살짝 작은 흰 삼각형을 겹쳐서
    // "흰 배경 + 테두리 색" 말풍선처럼 보이게 하는 흔한 CSS 트릭이다.
    function markerBubbleHtml(marker) {
      const amountText = marker.amount.toLocaleString('ko-KR') + '원';
      const borderWidth = marker.selected ? 4 : 2;
      const icon = marker.iconKey ? categoryIconSvg(marker.iconKey, marker.color) : '';
      return '<div style="position: relative; display: inline-block;">' +
        '<div style="background:#fff;border:' + borderWidth + 'px solid ' + marker.color + ';border-radius:10px;padding:5px 10px;' +
          'text-align:center;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.15);">' +
          '<div style="display:flex;align-items:center;justify-content:center;gap:4px;">' + icon +
            '<span style="font-size:12px;font-weight:700;color:#18251E;line-height:15px;">' + marker.label + '</span>' +
          '</div>' +
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

    // ── 로드뷰 ────────────────────────────────────────────────────────
    // 모드를 켜면 로드뷰가 있는 도로가 파란 선으로 표시되고, 그 상태에서 지도를 탭하면
    // 가까운 로드뷰 지점을 찾아 거리 사진을 지도 위에 꽉 채워 띄운다.
    let roadviewMode = false;
    let roadview = null;
    let roadviewClient = null;
    let roadviewMarker = null; // 아래쪽 지도에 로드뷰 위치/시선 방향을 보여주는 CustomOverlay
    let roadviewArrowEl = null; // 시선 방향 화살표 DOM. viewpoint_changed 때마다 회전만 갱신한다.
    const roadviewContainer = document.getElementById('roadview');

    function ensureRoadviewMarker(position) {
      if (!roadviewMarker) {
        const wrap = document.createElement('div');
        wrap.className = 'roadview-marker';
        wrap.innerHTML = '<div class="roadview-marker-arrow"></div><div class="roadview-marker-dot"></div>';
        roadviewArrowEl = wrap.querySelector('.roadview-marker-arrow');
        roadviewMarker = new kakao.maps.CustomOverlay({ content: wrap, zIndex: 5 });
      }
      roadviewMarker.setPosition(position);
      roadviewMarker.setMap(map);
    }

    function updateRoadviewHeading() {
      if (!roadview || !roadviewArrowEl) return;
      const pan = roadview.getViewpoint().pan;
      roadviewArrowEl.style.transform = 'translate(-50%, -26px) rotate(' + pan + 'deg)';
    }

    function setRoadviewMode(on) {
      roadviewMode = on;
      if (on) {
        map.addOverlayMapTypeId(kakao.maps.MapTypeId.ROADVIEW);
      } else {
        map.removeOverlayMapTypeId(kakao.maps.MapTypeId.ROADVIEW);
        closeRoadview();
      }
    }

    function openRoadviewAt(lat, lng) {
      const position = new kakao.maps.LatLng(lat, lng);
      if (!roadviewClient) {
        roadviewClient = new kakao.maps.RoadviewClient();
      }
      // 탭한 지점 반경 50m 안에서 가장 가까운 로드뷰 지점을 찾는다. 없으면 null이 온다.
      roadviewClient.getNearestPanoId(position, 50, function (panoId) {
        if (panoId === null) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'roadviewUnavailable' }));
          return;
        }
        roadviewContainer.style.display = 'block';
        if (!roadview) {
          roadview = new kakao.maps.Roadview(roadviewContainer);
          // 드래그로 시선을 돌릴 때마다 화살표 방향을 갱신한다.
          kakao.maps.event.addListener(roadview, 'viewpoint_changed', updateRoadviewHeading);
        }
        roadview.setPanoId(panoId, position);
        ensureRoadviewMarker(position);
        updateRoadviewHeading();
        // #map은 화면 전체 크기라서 setCenter만 하면 화면 정중앙(로드뷰에 가려진 위쪽)으로 맞춰진다.
        // 실제 보이는 건 아래쪽 1/3뿐이라, 그 영역의 가운데(화면 전체 기준 5/6 지점)로 오도록
        // 화면 세로 길이의 1/3만큼 더 내려(panBy) 보정한다.
        map.setCenter(position);
        map.panBy(0, -(window.innerHeight / 3));
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'roadview', open: true }));
      });
    }

    function closeRoadview() {
      if (roadviewContainer.style.display !== 'block') return;
      roadviewContainer.style.display = 'none';
      if (roadviewMarker) {
        roadviewMarker.setMap(null);
      }
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'roadview', open: false }));
    }

    function notifyBounds() {
      const bounds = map.getBounds();
      const southWest = bounds.getSouthWest();
      const northEast = bounds.getNorthEast();

      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          type: 'bounds',
          south: southWest.getLat(),
          west: southWest.getLng(),
          north: northEast.getLat(),
          east: northEast.getLng(),
        })
      );
    }

    try {
      if (typeof kakao === 'undefined' || !kakao.maps) {
        throw new Error('Kakao Maps SDK가 로드되지 않았습니다 (kakao 전역 객체 없음)');
      }
      // 실제 지도 모듈(Map/LatLng/Marker/...)이 다 로드된 뒤에야 이 콜백이 불린다.
      kakao.maps.load(function () {
        try {
          map = new kakao.maps.Map(document.getElementById('map'), {
            center: new kakao.maps.LatLng(${initialCenter.lat}, ${initialCenter.lng}),
            level: ${initialLevel},
            draggable: ${draggable},
            zoomable: ${zoomable},
          });

          pinImageSize = new kakao.maps.Size(24, 34);
          pinImage = makePinImage('${PIN_COLOR}');
          selectedPinImage = makePinImage('${SELECTED_PIN_COLOR}');

          kakao.maps.event.addListener(map, 'click', function (mouseEvent) {
            const latlng = mouseEvent.latLng;
            // 로드뷰 모드 중에는 지도 탭이 "위치 선택"이 아니라 "이 지점 로드뷰 열기"로 동작한다.
            if (roadviewMode) {
              openRoadviewAt(latlng.getLat(), latlng.getLng());
              return;
            }
            window.ReactNativeWebView.postMessage(
              JSON.stringify({ type: 'tap', lat: latlng.getLat(), lng: latlng.getLng() })
            );
          });

          // 줌 버튼으로 바꾼 경우, 핀치줌한 경우 둘 다 여기로 들어와서 RN에 현재 레벨을 알려준다.
          kakao.maps.event.addListener(map, 'zoom_changed', function () {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'level', level: map.getLevel() }));
          });

          // 드래그·확대·축소가 끝난 뒤 최신 화면 영역을 RN에 전달한다.
          kakao.maps.event.addListener(map, 'idle', notifyBounds);

          // 지도(+ 위 함수들)가 준비됐다고 RN에 알린다. RN은 이 신호를 받은 뒤부터 injectJavaScript로
          // setMapMarkers/setMapPins/setSelectedPin/setMyLocation을 호출한다.
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
          notifyBounds();
        } catch (e) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'error',
            message: (e && e.message ? e.message : String(e)) + (e && e.stack ? '\\n' + e.stack : ''),
          }));
        }
      });
    } catch (e) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'error',
        message: (e && e.message ? e.message : String(e)) + (e && e.stack ? '\\n' + e.stack : ''),
      }));
    }
  </script>
</body>
</html>
`;
}
