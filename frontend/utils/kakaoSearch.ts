const KAKAO_REST_KEY = process.env.EXPO_PUBLIC_KAKAO_REST_KEY;

export type PlaceResult = {
  name: string;
  address: string;
  lat: number;
  lng: number;
};

/** 검색 결과를 가까운 순으로 정렬할 때 기준이 되는 좌표(지도 중심 등). bounds가 없을 때만 대신 쓴다. */
export type SearchCenter = {
  lat: number;
  lng: number;
};

/** 지금 화면에 보이는 지도 영역. KakaoMap의 onBoundsChange가 주는 값과 같은 모양이다. */
export type SearchBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export type SearchPlacesOptions = {
  /** 지금 화면에 보이는 지도 영역. 검색어에 지역이 없을 때 이 영역 안으로만 결과를 제한한다. */
  bounds?: SearchBounds;
  /** bounds가 없을 때만 쓰는 대체 기준점(가까운 순 정렬용). */
  center?: SearchCenter;
};

// 시/도(약칭 포함) — 이 목록에 있는 이름으로 "시작하는" 토큰이 있으면 지역이 명시된 검색으로 본다.
const PROVINCE_NAMES = [
  '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종',
  '경기', '강원', '충북', '충남', '충청북도', '충청남도', '전북', '전남', '전라북도', '전라남도',
  '경북', '경남', '경상북도', '경상남도', '제주',
];

// 자주 검색될 만한 구/동/신도시/번화가 이름. 전국을 다 담을 수는 없어서, 실제로 자주 쓰이는 지명
// 위주로 골랐다 — 여기 없는 지명은 아래 접미사(시/군/구/읍/면/동/리) 규칙으로 대부분 걸러진다.
const KNOWN_PLACE_NAMES = [
  '강남', '강동', '강북', '강서', '관악', '광진', '구로', '금천', '노원', '도봉', '동대문', '동작',
  '마포', '서대문', '서초', '성동', '성북', '송파', '양천', '영등포', '용산', '은평', '종로', '중랑',
  '홍대', '신촌', '이대', '잠실', '여의도', '건대', '성수', '연신내',
  '분당', '판교', '일산', '수원', '성남', '안양', '부천', '평택', '용인', '화성', '고양', '의정부',
  '안산', '시흥', '파주', '김포', '광명', '하남', '과천', '구리', '남양주', '춘천', '원주', '강릉', '속초',
  '해운대', '수성', '천안', '청주', '전주', '순천', '여수', '목포', '익산', '군산', '진주', '창원', '김해', '포항', '경주',
];

// 이 접미사로 끝나는 3자 이상 토큰은 행정구역명일 가능성이 높다고 본다(예: "강남구", "역삼동").
const REGION_SUFFIXES = ['시', '군', '구', '읍', '면', '동', '리'];

/**
 * 검색어에 지역이 명시돼 있는지 판단한다(예: "수원 편의점", "강남 스타벅스" → true, "편의점" → false).
 * 완벽한 지역 인식은 아니고, 자주 쓰는 지명 목록 + 행정구역 접미사로 판단하는 실용적인 판정이다.
 * 여기서 true가 나오면 searchPlaces는 지금 지도 위치를 완전히 무시하고 검색어 자체로만 찾는다.
 */
export function hasRegionKeyword(query: string): boolean {
  const tokens = query.trim().split(/\s+/).filter(Boolean);

  return tokens.some((token) => {
    if (PROVINCE_NAMES.some((name) => token.startsWith(name))) return true;
    if (KNOWN_PLACE_NAMES.some((name) => token.startsWith(name))) return true;
    if (token.length >= 3 && REGION_SUFFIXES.some((suffix) => token.endsWith(suffix))) return true;
    return false;
  });
}

type KakaoKeywordSearchResponse = {
  documents: {
    place_name: string;
    address_name: string;
    road_address_name: string;
    x: string; // 경도
    y: string; // 위도
  }[];
};

/**
 * 키워드로 장소를 검색한다. 도로명 주소가 있으면 그걸 우선 쓰고, 없으면 지번 주소를 쓴다.
 *
 * 검색어에 지역이 명시돼 있으면(hasRegionKeyword) 지금 지도 위치와 무관하게 전국을 대상으로
 * 정확도순 검색한다 — 그러지 않으면 "강남을 보면서 수원 편의점을 검색"해도 강남 근처 결과가
 * 뒤섞여 나온다(카카오 API에 위치 기준을 같이 넘기면 그 기준이 검색어의 지역명보다 우선시된다).
 *
 * 지역이 없으면 bounds(지금 화면에 보이는 지도 영역)를 rect 파라미터로 넘겨, 그 사각형 밖의
 * 결과는 애초에 응답에 포함되지 않게 한다(반경 검색이 아니라 실제 보이는 영역 전체 기준).
 * bounds가 없을 때만 예전처럼 center 기준 가까운 순 정렬로 대체한다.
 */
export async function searchPlaces(query: string, options: SearchPlacesOptions = {}): Promise<PlaceResult[]> {
  // 리액트 네이티브의 URLSearchParams 폴리필은 set()이 구현돼 있지 않아 런타임에서 터지므로,
  // 기존 코드처럼 쿼리 문자열을 직접 만든다.
  const params = [`query=${encodeURIComponent(query)}`];

  if (!hasRegionKeyword(query)) {
    if (options.bounds) {
      const { south, west, north, east } = options.bounds;
      // rect: "좌하 X,좌하 Y,우상 X,우상 Y" — 지금 화면에 보이는 사각형 영역 그대로.
      params.push(`rect=${west},${south},${east},${north}`);
    } else if (options.center) {
      params.push(`x=${options.center.lng}`, `y=${options.center.lat}`, 'sort=distance');
    }
  }

  const url = `https://dapi.kakao.com/v2/local/search/keyword.json?${params.join('&')}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `KakaoAK ${KAKAO_REST_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`카카오 키워드 검색 요청 실패: ${response.status}`);
  }

  const data: KakaoKeywordSearchResponse = await response.json();

  return data.documents.map((document) => ({
    name: document.place_name,
    address: document.road_address_name || document.address_name,
    lat: Number(document.y),
    lng: Number(document.x),
  }));
}
