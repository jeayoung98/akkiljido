// "김하은(28, 강남구 역삼동 자취 중인 프리랜서 디자이너)" 페르소나의 약 3개월치 더미 거래 데이터.
// 지도(가게별/시도·시군구·읍면동별/내 장소), 내역 리스트, 카테고리 화면이 전부 이 파일 하나에서 파생된다.
// 실제 백엔드 API 붙이면 이 파일을 통째로 지우고 fetch 호출로 바꾸면 된다.

// ── 카테고리 (GET /api/v1/category 응답과 동일한 목록) ──────────────────────
export type CategoryId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export const CATEGORIES: { id: CategoryId; name: string }[] = [
  { id: 1, name: '음식점' },
  { id: 2, name: '카페·간식' },
  { id: 3, name: '편의점·마트' },
  { id: 4, name: '쇼핑' },
  { id: 5, name: '여가' },
  { id: 6, name: '교통' },
  { id: 7, name: '건강·의료' },
  { id: 8, name: '생활' },
  { id: 9, name: '미용' },
  { id: 10, name: '교육' },
  { id: 11, name: '기타' },
];

function categoryName(id: CategoryId) {
  return CATEGORIES.find((c) => c.id === id)!.name;
}

// ── 김하은이 자주 가는 장소 (전부 강남구 역삼동/삼성동/논현동 일대) ───────────
type Place = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  dong: string; // 읍/면/동 (시도/시군구는 전부 서울특별시/강남구로 고정)
  categoryId: CategoryId;
  amountRange: [number, number];
  weight: number; // 하루 거래를 뽑을 때의 상대적 확률 가중치
};

const PLACES: Place[] = [
  { id: 'p1', name: '스타벅스 강남역점', address: '서울 강남구 역삼동 823', lat: 37.4985, lng: 127.0281, dong: '역삼동', categoryId: 2, amountRange: [4500, 7500], weight: 6 },
  { id: 'p2', name: '이디야커피 역삼점', address: '서울 강남구 역삼동 611', lat: 37.5009, lng: 127.0359, dong: '역삼동', categoryId: 2, amountRange: [3500, 5500], weight: 5 },
  { id: 'p3', name: '투썸플레이스 삼성점', address: '서울 강남구 삼성동 159', lat: 37.5090, lng: 127.0625, dong: '삼성동', categoryId: 2, amountRange: [5000, 8000], weight: 3 },
  { id: 'p4', name: 'GS25 역삼동점', address: '서울 강남구 역삼동 702', lat: 37.5001, lng: 127.0370, dong: '역삼동', categoryId: 3, amountRange: [2000, 12000], weight: 5 },
  { id: 'p5', name: 'CU 강남대로점', address: '서울 강남구 역삼동 823-1', lat: 37.4975, lng: 127.0270, dong: '역삼동', categoryId: 3, amountRange: [2000, 15000], weight: 4 },
  { id: 'p6', name: '올리브영 강남역점', address: '서울 강남구 역삼동 819', lat: 37.4981, lng: 127.0264, dong: '역삼동', categoryId: 9, amountRange: [12000, 38000], weight: 1 },
  { id: 'p7', name: '김밥천국 역삼점', address: '서울 강남구 역삼동 645', lat: 37.5012, lng: 127.0355, dong: '역삼동', categoryId: 1, amountRange: [7000, 9000], weight: 4 },
  { id: 'p8', name: '교촌치킨 강남점', address: '서울 강남구 역삼동 673', lat: 37.4995, lng: 127.0300, dong: '역삼동', categoryId: 1, amountRange: [21000, 26000], weight: 2 },
  { id: 'p9', name: '강남역 2호선', address: '서울 강남구 역삼동 858', lat: 37.4979, lng: 127.0276, dong: '역삼동', categoryId: 6, amountRange: [1400, 1500], weight: 6 },
  { id: 'p10', name: '교보문고 강남점', address: '서울 강남구 역삼동 858-1', lat: 37.5040, lng: 127.0235, dong: '역삼동', categoryId: 10, amountRange: [15000, 32000], weight: 1 },
  { id: 'p11', name: '무신사 스탠다드 강남점', address: '서울 강남구 논현동 92', lat: 37.5115, lng: 127.0221, dong: '논현동', categoryId: 4, amountRange: [25000, 79000], weight: 1 },
  { id: 'p12', name: 'CGV 강남', address: '서울 강남구 역삼동 819-1', lat: 37.4988, lng: 127.0257, dong: '역삼동', categoryId: 5, amountRange: [14000, 20000], weight: 2 },
];

// ── 내 장소 (마이페이지/지도의 "내 장소"에 등록해둔 장소, GET /api/v1/my/place 대응) ──
export const MY_PLACES = [
  { placeId: 'home', name: '집', address: '서울 강남구 역삼동 754-11', lat: 37.5003, lng: 127.0365 },
  { placeId: 'workcafe', name: '작업 거점(강남역)', address: '서울 강남구 역삼동 823', lat: 37.4985, lng: 127.0281 },
  { placeId: 'client', name: '클라이언트사(삼성동)', address: '서울 강남구 삼성동 143', lat: 37.5088, lng: 127.0631 },
];

// ── 시드 고정 난수 생성기 (핫리로드/재실행해도 항상 같은 더미 데이터가 나오게) ───
function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = mulberry32(20260802);

function pickPlace(): Place {
  const totalWeight = PLACES.reduce((sum, p) => sum + p.weight, 0);
  let roll = random() * totalWeight;
  for (const place of PLACES) {
    roll -= place.weight;
    if (roll <= 0) {
      return place;
    }
  }
  return PLACES[0];
}

function randomInt(min: number, max: number) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

// ── 거래 생성 ────────────────────────────────────────────────────────────
export type Transaction = {
  transactionId: string;
  name: string;
  amount: number;
  type: 'expense' | 'income';
  paymentMethod: string;
  categoryId: CategoryId | null;
  categoryName: string;
  datetime: string; // "2026-07-27 15:30:00+09"
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  memo: string;
};

const START_DATE = new Date('2026-05-05T00:00:00+09:00');
const END_DATE = new Date('2026-08-02T00:00:00+09:00');
const PAYMENT_METHODS = ['카카오페이', '신한카드', '현금'];

function generateTransactions(): Transaction[] {
  const transactions: Transaction[] = [];
  let id = 1;

  for (let date = new Date(START_DATE); date <= END_DATE; date.setDate(date.getDate() + 1)) {
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const dailyCount = isWeekend ? randomInt(0, 2) : randomInt(1, 3);

    for (let i = 0; i < dailyCount; i++) {
      const place = pickPlace();
      const amount = randomInt(place.amountRange[0], place.amountRange[1]);
      const hour = randomInt(8, 22);
      const minute = randomInt(0, 59);
      const datetime = `${formatDate(date)} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+09`;

      transactions.push({
        transactionId: String(id++),
        name: place.name,
        amount,
        type: 'expense',
        paymentMethod: PAYMENT_METHODS[randomInt(0, PAYMENT_METHODS.length - 1)],
        categoryId: place.categoryId,
        categoryName: categoryName(place.categoryId),
        datetime,
        address: place.address,
        latitude: place.lat,
        longitude: place.lng,
        memo: '',
      });
    }

    // 매달 1일, 15일에 프리랜서 입금(수입) 하나씩 추가
    if (date.getDate() === 1 || date.getDate() === 15) {
      transactions.push({
        transactionId: String(id++),
        name: '프리랜서 디자인 외주비',
        amount: randomInt(800000, 2200000),
        type: 'income',
        paymentMethod: '계좌이체',
        categoryId: null,
        categoryName: '기타',
        datetime: `${formatDate(date)} 10:00:00+09`,
        address: null,
        latitude: null,
        longitude: null,
        memo: '',
      });
    }
  }

  return transactions;
}

export const MOCK_TRANSACTIONS: Transaction[] = generateTransactions();

// ── GET /api/v1/category 응답 형태 ──────────────────────────────────────
export const mockCategoryResponse = {
  success: true,
  data: { categories: CATEGORIES },
};

// ── GET /api/v1/transaction/list 응답 형태 (날짜별로 묶기) ─────────────────
export function toTransactionListResponse(transactions: Transaction[] = MOCK_TRANSACTIONS) {
  const byDate = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const date = tx.datetime.slice(0, 10);
    if (!byDate.has(date)) {
      byDate.set(date, []);
    }
    byDate.get(date)!.push(tx);
  }

  const dateList = Array.from(byDate.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1)) // 최신순
    .map(([date, list]) => ({
      date,
      amount: list.reduce((sum, tx) => sum + (tx.type === 'expense' ? -tx.amount : tx.amount), 0),
      transactionList: list.map((tx) => ({
        transactionId: tx.transactionId,
        name: tx.name,
        amount: tx.amount,
        type: tx.type,
        categoryId: tx.categoryId,
        categoryName: tx.categoryName,
      })),
    }));

  return { success: true, data: { dateList } };
}

// ── GET /api/v1/transaction/map 응답 형태 (가게별로 묶기) ──────────────────
export function toMapPlaceListResponse(transactions: Transaction[] = MOCK_TRANSACTIONS) {
  const byPlace = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    if (tx.type !== 'expense' || tx.latitude == null) {
      continue;
    }
    const key = `${tx.latitude},${tx.longitude}`;
    if (!byPlace.has(key)) {
      byPlace.set(key, []);
    }
    byPlace.get(key)!.push(tx);
  }

  const placeList = Array.from(byPlace.values()).map((list) => {
    const first = list[0];
    // 같은 좌표에 이름이 여러 개면(우연히 겹치는 경우) 콤마로 이어붙인다.
    const names = Array.from(new Set(list.map((tx) => tx.name))).join(', ');
    return {
      address: first.address,
      latitude: first.latitude,
      longitude: first.longitude,
      name: names,
      amount: list.reduce((sum, tx) => sum + tx.amount, 0),
      transactionCount: list.length,
      transactionList: list.map((tx) => ({
        transactionId: tx.transactionId,
        name: tx.name,
        amount: tx.amount,
        categoryId: tx.categoryId,
        categoryName: tx.categoryName,
        datetime: tx.datetime,
      })),
    };
  });

  return { success: true, data: { placeList } };
}

// ── GET /api/v1/transaction/map/{depth} 응답 형태 ──────────────────────────
// depth 1: 시/도(서울특별시 하나로 고정), 2: 시/군/구(강남구 하나로 고정), 3: 읍/면/동(역삼동/삼성동/논현동)
export function toMapDepthResponse(depth: 1 | 2 | 3, transactions: Transaction[] = MOCK_TRANSACTIONS) {
  const expenseTx = transactions.filter((tx) => tx.type === 'expense' && tx.latitude != null);

  const depthNameOf = (tx: Transaction) => {
    if (depth === 1) return '서울특별시';
    if (depth === 2) return '강남구';
    return PLACES.find((p) => p.lat === tx.latitude && p.lng === tx.longitude)?.dong ?? '기타동';
  };

  const centerOf = (dongName: string) => {
    const place = PLACES.find((p) => p.dong === dongName);
    return { lat: place?.lat ?? 37.5, lng: place?.lng ?? 127.03 };
  };

  const byRegion = new Map<string, Transaction[]>();
  for (const tx of expenseTx) {
    const key = depthNameOf(tx);
    if (!byRegion.has(key)) {
      byRegion.set(key, []);
    }
    byRegion.get(key)!.push(tx);
  }

  const transactionList = Array.from(byRegion.entries()).map(([depthName, list]) => {
    const center =
      depth === 3
        ? centerOf(depthName)
        : { lat: 37.5006, lng: 127.0364 }; // 시도/시군구 단계는 강남구 대략 중심 좌표로 고정
    return {
      latitude: center.lat,
      longitude: center.lng,
      depthName,
      amount: list.reduce((sum, tx) => sum + tx.amount, 0),
      transactionCount: list.length,
      placeList: list.map((tx) => ({
        transactionId: tx.transactionId,
        name: tx.name,
        amount: tx.amount,
        categoryId: tx.categoryId,
        categoryName: tx.categoryName,
        datetime: tx.datetime,
      })),
    };
  });

  return { success: true, data: { transactionList } };
}

// ── GET /api/v1/transaction/map/my-place/{placeId} 응답 형태 ──────────────
// "내 장소" 반경(24m) 안에서 실제로 쓴 거래를, 이름(가게)별로 묶고 그 안에서 다시 날짜별로 묶는다.
export function toMyPlaceDetailResponse(placeId: string, transactions: Transaction[] = MOCK_TRANSACTIONS) {
  const myPlace = MY_PLACES.find((p) => p.placeId === placeId);
  if (!myPlace) {
    return { success: false as const, code: 'V001', message: '존재하지 않는 장소입니다.' };
  }

  const NEARBY_RADIUS_DEG = 0.01; // 대략 1km 이내를 "이 내 장소 근처"로 취급 (더미 데이터용 단순 근사치)
  const nearby = transactions.filter(
    (tx) =>
      tx.type === 'expense' &&
      tx.latitude != null &&
      Math.abs(tx.latitude - myPlace.lat) < NEARBY_RADIUS_DEG &&
      Math.abs(tx.longitude! - myPlace.lng) < NEARBY_RADIUS_DEG
  );

  const byName = new Map<string, Transaction[]>();
  for (const tx of nearby) {
    if (!byName.has(tx.name)) {
      byName.set(tx.name, []);
    }
    byName.get(tx.name)!.push(tx);
  }

  const transactionList = Array.from(byName.entries()).map(([name, list]) => {
    const first = list[0];
    return {
      name,
      categoryId: first.categoryId,
      categoryName: first.categoryName,
      latitude: first.latitude,
      longitude: first.longitude,
      amount: list.reduce((sum, tx) => sum + tx.amount, 0),
      dateList: list.map((tx) => ({
        transactionId: tx.transactionId,
        datetime: tx.datetime,
        amount: tx.amount,
      })),
    };
  });

  return { success: true as const, data: { transactionList } };
}
