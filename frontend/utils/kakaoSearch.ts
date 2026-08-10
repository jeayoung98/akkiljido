const KAKAO_REST_KEY = process.env.EXPO_PUBLIC_KAKAO_REST_KEY;

export type PlaceResult = {
  name: string;
  address: string;
  lat: number;
  lng: number;
};

/** 검색 결과를 가까운 순으로 정렬할 때 기준이 되는 좌표(보통 지금 보고 있는 지도 중심)입니다. */
export type SearchCenter = {
  lat: number;
  lng: number;
};

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
 * center를 넘기면 그 좌표를 기준으로 "가까운 순"으로 정렬해서 받는다.
 * (카카오 키워드 검색의 기본 정렬은 정확도순이라, 강남을 보면서 "스타벅스"를 검색해도
 *  경주·제주 지점이 앞에 나올 수 있다. sort=distance는 기준 좌표 x·y가 함께 있어야만
 *  동작하므로, center가 없으면 예전처럼 정확도순으로 검색한다.)
 */
export async function searchPlaces(query: string, center?: SearchCenter): Promise<PlaceResult[]> {
  // 리액트 네이티브의 URLSearchParams 폴리필은 set()이 구현돼 있지 않아 런타임에서 터지므로,
  // 기존 코드처럼 쿼리 문자열을 직접 만든다.
  const params = [`query=${encodeURIComponent(query)}`];

  if (center) {
    params.push(`x=${center.lng}`, `y=${center.lat}`, 'sort=distance');
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
