import { apiRequest } from '@/src/api/apiClient';

/**
 * 거래내역 CRUD API 모듈입니다. (지도 관련 거래내역 API는 여기에 두지 않습니다.)
 *
 * 서버와 앱의 표기가 달라서 이 파일이 그 차이를 흡수합니다.
 * - 요청 body의 거래 유형은 대문자(`EXPENSE`/`INCOME`), 쿼리 파라미터는 소문자(`expense`/`income`/`all`)입니다.
 * - 요청 body의 결제 수단 키는 snake_case(`payment_method`)이지만, 앱 안에서는 camelCase(`paymentMethod`)로 씁니다.
 * - 검색 응답만 `transactionName`/`transactionDate`라는 다른 키를 쓰기 때문에 목록과 같은 모양으로 맞춰서 돌려줍니다.
 * 화면 코드가 이런 차이를 몰라도 되도록, 이 파일 밖으로는 항상 아래 타입들만 나갑니다.
 */

/** 앱 전체에서 쓰는 거래 유형입니다. 서버 응답이 대문자로 와도 이 값으로 정규화합니다. */
export type TransactionType = 'expense' | 'income';

/** 목록·검색 쿼리의 `type` 값입니다. 전체 조회는 `all`입니다. */
export type TransactionTypeFilter = 'all' | TransactionType;

export type TransactionSort = 'latest' | 'oldest';

/** 목록 응답의 날짜 그룹 안에 들어있는 거래 한 건입니다. (목록에는 시간·주소·메모가 오지 않습니다.) */
export type TransactionListItem = {
  transactionId: number;
  name: string;
  /** 항상 양수. 부호는 type으로 표현합니다. */
  amount: number;
  type: TransactionType;
  categoryId: number;
  categoryName: string;
};

/** 목록 응답은 서버가 이미 날짜별로 묶어서 내려줍니다. */
export type TransactionDateGroup = {
  /** `YYYY-MM-DD` */
  date: string;
  /** 그 날의 합계(소득 - 소비)라 음수가 될 수 있습니다. */
  amount: number;
  transactionList: TransactionListItem[];
};

export type TransactionDetail = {
  transactionId: number;
  name: string;
  amount: number;
  type: TransactionType;
  paymentMethod: string;
  categoryId: number;
  categoryName: string;
  /** `YYYY-MM-DD HH:mm:ss` (서버가 `+09` 오프셋을 붙여 보낼 수도 있습니다.) */
  datetime: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  memo: string;
};

/** 검색 응답 항목입니다. 목록과 달리 날짜 그룹 없이 평평한 배열로 옵니다. */
export type TransactionSearchItem = {
  transactionId: number;
  name: string;
  amount: number;
  type: TransactionType;
  /** `YYYY-MM-DD` */
  transactionDate: string;
  categoryId: number;
  categoryName: string;
};

export type TransactionListQuery = {
  /** 기본값 latest */
  sort?: TransactionSort;
  /** 기본값 all */
  type?: TransactionTypeFilter;
  /** `YYYY-MM-DD`. 기본값은 이번 달 1일 */
  startDate?: string;
  /** `YYYY-MM-DD`. 기본값은 오늘 */
  endDate?: string;
  /** 비우면 전체 카테고리 조회 */
  categoryId?: number[];
};

export type TransactionSearchQuery = TransactionListQuery & {
  /** 거래명 부분 일치. 비우면 검색어 조건 없이 조회합니다. */
  query?: string;
};

export type TransactionCreateInput = {
  /** 10자 이하 */
  name: string;
  amount: number;
  type: TransactionType;
  /**
   * 10자 이하. 값을 넣지 않으면 body에서 키 자체가 빠집니다.
   * (명세상 등록의 필수 항목이지만, 소득 등록 화면에는 결제 수단 입력이 없어 선택으로 둡니다.)
   */
  paymentMethod?: string;
  /**
   * 반드시 GET /api/v1/category가 내려준 id여야 합니다.
   * 값을 넣지 않으면 body에서 키 자체가 빠집니다.
   */
  categoryId?: number;
  /** `YYYY-MM-DD HH:mm:ss` */
  datetime: string;
  /** 50자 이하 */
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  /** 30자 이하 */
  memo?: string;
};

/** PATCH라 보내지 않은 필드는 서버가 기존 값을 유지합니다. */
export type TransactionUpdateInput = Partial<TransactionCreateInput>;

/* ------------------------------------------------------------------ */
/* 서버 응답 원본 타입 (이 파일 밖으로 나가지 않습니다)                    */
/* ------------------------------------------------------------------ */

type RawTransactionListItem = {
  transactionId?: number | string;
  name?: string;
  amount?: number | string;
  type?: string;
  categoryId?: number | string;
  categoryName?: string;
};

type RawTransactionDateGroup = {
  date?: string;
  amount?: number | string;
  transactionList?: RawTransactionListItem[];
};

type RawTransactionListResponse = {
  dateList?: RawTransactionDateGroup[];
};

type RawTransactionSearchItem = {
  transactionId?: number | string;
  transactionName?: string;
  /** 명세에는 transactionName이지만 서버가 목록과 같은 name으로 줄 수도 있어 함께 받아둡니다. */
  name?: string;
  amount?: number | string;
  type?: string;
  transactionDate?: string;
  datetime?: string;
  categoryId?: number | string;
  categoryName?: string;
};

type RawTransactionSearchResponse = {
  transactionList?: RawTransactionSearchItem[];
};

type RawTransactionDetail = {
  transactionId?: number | string;
  name?: string;
  amount?: number | string;
  type?: string;
  payment_method?: string;
  /** 서버가 camelCase로 바꿔 보낼 가능성에 대비해 둘 다 읽습니다. */
  paymentMethod?: string;
  categoryId?: number | string;
  categoryName?: string;
  datetime?: string;
  address?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  memo?: string;
};

/* ------------------------------------------------------------------ */
/* 변환 헬퍼                                                            */
/* ------------------------------------------------------------------ */

/** 명세상 숫자지만 예시 JSON은 문자열("-36500")이라 어느 쪽이 와도 숫자로 맞춥니다. */
function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** 서버가 `EXPENSE`로 주든 `expense`로 주든 앱에서는 소문자 하나로만 다룹니다. */
function toTransactionType(value: unknown): TransactionType {
  return String(value ?? '').toLowerCase() === 'income' ? 'income' : 'expense';
}

/** 요청 body에 들어가는 거래 유형은 대문자여야 합니다. */
function toRequestType(type: TransactionType): 'EXPENSE' | 'INCOME' {
  return type === 'income' ? 'INCOME' : 'EXPENSE';
}

/** Date를 목록·검색 쿼리에 쓰는 `YYYY-MM-DD`로 바꿉니다. (UTC가 아닌 기기 로컬 날짜 기준) */
export function toApiDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Date를 등록·수정 body에 쓰는 `YYYY-MM-DD HH:mm:ss`로 바꿉니다.
 * 이 형식이 아니면 서버가 JSON 파싱 단계에서 `C004`로 거절합니다.
 */
export function toApiDateTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${toApiDate(date)} ${hours}:${minutes}:${seconds}`;
}

/**
 * `?a=1&b=2` 형태의 쿼리 문자열을 만듭니다.
 * undefined·빈 문자열은 아예 빼서 서버 기본값이 적용되게 하고, 배열은 같은 키를 여러 번 붙입니다.
 * (React Native의 URLSearchParams 폴리필 동작이 플랫폼마다 달라 직접 만듭니다.)
 */
function buildQueryString(params: Record<string, string | number | Array<string | number> | undefined>): string {
  const pairs: string[] = [];

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;

    const values = Array.isArray(value) ? value : [value];
    for (const item of values) {
      pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`);
    }
  }

  return pairs.length > 0 ? `?${pairs.join('&')}` : '';
}

function toListItem(raw: RawTransactionListItem): TransactionListItem {
  return {
    transactionId: toNumber(raw.transactionId),
    name: raw.name ?? '',
    amount: toNumber(raw.amount),
    type: toTransactionType(raw.type),
    categoryId: toNumber(raw.categoryId),
    categoryName: raw.categoryName ?? '',
  };
}

function toDateGroup(raw: RawTransactionDateGroup): TransactionDateGroup {
  return {
    date: raw.date ?? '',
    amount: toNumber(raw.amount),
    transactionList: (raw.transactionList ?? []).map(toListItem),
  };
}

function toSearchItem(raw: RawTransactionSearchItem): TransactionSearchItem {
  return {
    transactionId: toNumber(raw.transactionId),
    name: raw.transactionName ?? raw.name ?? '',
    amount: toNumber(raw.amount),
    type: toTransactionType(raw.type),
    // datetime으로 올 경우 앞 10자리만 잘라 날짜로 씁니다.
    transactionDate: (raw.transactionDate ?? raw.datetime ?? '').slice(0, 10),
    categoryId: toNumber(raw.categoryId),
    categoryName: raw.categoryName ?? '',
  };
}

function toDetail(raw: RawTransactionDetail): TransactionDetail {
  return {
    transactionId: toNumber(raw.transactionId),
    name: raw.name ?? '',
    amount: toNumber(raw.amount),
    type: toTransactionType(raw.type),
    paymentMethod: raw.payment_method ?? raw.paymentMethod ?? '',
    categoryId: toNumber(raw.categoryId),
    categoryName: raw.categoryName ?? '',
    datetime: raw.datetime ?? '',
    address: raw.address ?? '',
    latitude: toOptionalNumber(raw.latitude),
    longitude: toOptionalNumber(raw.longitude),
    memo: raw.memo ?? '',
  };
}

/**
 * 등록·수정 body를 만듭니다.
 * 값을 넣지 않은 필드는 키 자체를 빼야 PATCH에서 "기존 값 유지"로 동작합니다.
 */
function toRequestBody(input: TransactionUpdateInput): Record<string, unknown> {
  const body: Record<string, unknown> = {};

  if (input.name !== undefined) body.name = input.name;
  if (input.amount !== undefined) body.amount = input.amount;
  if (input.type !== undefined) body.type = toRequestType(input.type);
  if (input.paymentMethod !== undefined) body.payment_method = input.paymentMethod;
  if (input.categoryId !== undefined) body.categoryId = input.categoryId;
  if (input.datetime !== undefined) body.datetime = input.datetime;
  if (input.address !== undefined) body.address = input.address;
  if (input.latitude !== undefined && input.latitude !== null) body.latitude = input.latitude;
  if (input.longitude !== undefined && input.longitude !== null) body.longitude = input.longitude;
  if (input.memo !== undefined) body.memo = input.memo;

  return body;
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/* ------------------------------------------------------------------ */
/* API 호출                                                             */
/* ------------------------------------------------------------------ */

/** GET /api/v1/transaction/list — 날짜별로 묶인 거래 목록을 가져옵니다. */
export async function fetchTransactionList(
  query: TransactionListQuery = {},
): Promise<TransactionDateGroup[]> {
  const queryString = buildQueryString({
    sort: query.sort,
    type: query.type,
    startDate: query.startDate,
    endDate: query.endDate,
    categoryId: query.categoryId,
  });

  const data = await apiRequest<RawTransactionListResponse>(
    `/api/v1/transaction/list${queryString}`,
  );

  return (data?.dateList ?? []).map(toDateGroup);
}

/** GET /api/v1/transaction/search — 거래명으로 검색합니다. */
export async function searchTransactions(
  query: TransactionSearchQuery = {},
): Promise<TransactionSearchItem[]> {
  const queryString = buildQueryString({
    query: query.query?.trim(),
    sort: query.sort,
    type: query.type,
    startDate: query.startDate,
    endDate: query.endDate,
    categoryId: query.categoryId,
  });

  const data = await apiRequest<RawTransactionSearchResponse>(
    `/api/v1/transaction/search${queryString}`,
  );

  return (data?.transactionList ?? []).map(toSearchItem);
}

/** GET /api/v1/transaction/{transactionId} — 거래 상세를 가져옵니다. */
export async function fetchTransactionDetail(
  transactionId: number | string,
): Promise<TransactionDetail> {
  const data = await apiRequest<RawTransactionDetail>(
    `/api/v1/transaction/${transactionId}`,
  );

  return toDetail(data ?? {});
}

/** POST /api/v1/transaction — 거래를 등록하고 등록된 거래를 돌려받습니다. */
export async function createTransaction(
  input: TransactionCreateInput,
): Promise<TransactionDetail> {
  const data = await apiRequest<RawTransactionDetail>('/api/v1/transaction', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(toRequestBody(input)),
  });

  return toDetail(data ?? {});
}

/**
 * PATCH /api/v1/transaction/{transactionId} — 보낸 필드만 수정합니다.
 * 명세상 응답에 categoryName이 없을 수 있어, 화면에서 이름이 필요하면 상세를 다시 조회하세요.
 */
export async function updateTransaction(
  transactionId: number | string,
  input: TransactionUpdateInput,
): Promise<TransactionDetail> {
  const data = await apiRequest<RawTransactionDetail>(
    `/api/v1/transaction/${transactionId}`,
    {
      method: 'PATCH',
      headers: JSON_HEADERS,
      body: JSON.stringify(toRequestBody(input)),
    },
  );

  return toDetail(data ?? {});
}

/** DELETE /api/v1/transaction/{transactionId} — 성공 시 data 없이 success만 옵니다. */
export async function deleteTransaction(
  transactionId: number | string,
): Promise<void> {
  await apiRequest<void>(`/api/v1/transaction/${transactionId}`, {
    method: 'DELETE',
  });
}
