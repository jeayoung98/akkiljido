import { apiRequest } from '@/src/api/apiClient';

export type TransactionMapBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export type TransactionMapFilter = {
  startDate?: string;
  endDate?: string;
  categoryIds?: number[];
};

export type MapTransaction = {
  transactionId: number;
  name: string;
  amount: number;
  categoryId: number;
  categoryName: string;
  datetime: string;
};

export type MapPlace = {
  address: string;
  latitude: number;
  longitude: number;
  name: string;
  amount: number;
  transactionCount: number;
  transactionList: MapTransaction[];
};

export type MapPlaceList = {
  placeList: MapPlace[];
};

export type MapRegion = {
  latitude: number;
  longitude: number;
  depthName: string;
  amount: number;
  transactionCount: number;
  placeList: MapTransaction[];
};

export type MapRegionList = {
  transactionList: MapRegion[];
};

export type MyPlaceMap = {
  placeId: number;
  myPlaceName: string;
  address: string;
  latitude: number;
  longitude: number;
  totalAmount: number;
};

export type MyPlaceTransactionDate = {
  transactionId: number;
  datetime: string;
  amount: number;
};

export type MyPlaceTransaction = {
  name: string;
  categoryId: number;
  categoryName: string;
  latitude: number;
  longitude: number;
  amount: number;
  dateList: MyPlaceTransactionDate[];
};

export type MyPlaceTransactionList = {
  transactionList: MyPlaceTransaction[];
};

export type GroupedMapTransaction = {
  name: string;
  categoryId: number;
  categoryName: string;
  amount: number;
  dateList: MyPlaceTransactionDate[];
};

export type GroupedMapTransactionDate = {
  date: string;
  // 그룹 안 첫 거래의 실제 시각(HH:mm:ss 포함 원본 문자열)입니다. 같은 날짜에 거래가 여러 건
  // 묶여도 시각을 임의로 만들지 않고, 실제로 기록된 첫 거래의 시각을 그대로 보여줍니다.
  datetime: string;
  amount: number;
  transactionCount: number;
  transactionIds: number[];
};

function appendDateFilter(
  query: URLSearchParams,
  filter?: Pick<TransactionMapFilter, 'startDate' | 'endDate'>,
): void {
  if (filter?.startDate) {
    query.set('startDate', filter.startDate);
  }

  if (filter?.endDate) {
    query.set('endDate', filter.endDate);
  }
}

function appendMapFilter(
  query: URLSearchParams,
  filter?: TransactionMapFilter,
): void {
  appendDateFilter(query, filter);

  filter?.categoryIds?.forEach((categoryId) => {
    query.append('categoryId', String(categoryId));
  });
}

function appendBounds(
  query: URLSearchParams,
  bounds: TransactionMapBounds,
): void {
  query.set('south', String(bounds.south));
  query.set('west', String(bounds.west));
  query.set('north', String(bounds.north));
  query.set('east', String(bounds.east));
}

export async function getTransactionPlaceMap(
  bounds: TransactionMapBounds,
  filter?: TransactionMapFilter,
): Promise<MapPlaceList> {
  const query = new URLSearchParams();

  appendBounds(query, bounds);
  appendMapFilter(query, filter);

  return apiRequest<MapPlaceList>(
    `/api/v1/transaction/map?${query.toString()}`,
  );
}

export async function getTransactionRegionMap(
  depth: 1 | 2 | 3,
  bounds: TransactionMapBounds,
  filter?: TransactionMapFilter,
): Promise<MapRegionList> {
  const query = new URLSearchParams();

  appendBounds(query, bounds);
  appendMapFilter(query, filter);

  return apiRequest<MapRegionList>(
    `/api/v1/transaction/map/${depth}?${query.toString()}`,
  );
}

export async function getTransactionMyPlaces(
  filter?: Pick<TransactionMapFilter, 'startDate' | 'endDate'>,
): Promise<MyPlaceMap[]> {
  const query = new URLSearchParams();

  appendDateFilter(query, filter);

  const queryString = query.toString();

  return apiRequest<MyPlaceMap[]>(
    `/api/v1/transaction/map/my-place${
      queryString ? `?${queryString}` : ''
    }`,
  );
}

export async function getTransactionMyPlaceDetail(
  placeId: number,
  filter?: Pick<TransactionMapFilter, 'startDate' | 'endDate'>,
): Promise<MyPlaceTransactionList> {
  const query = new URLSearchParams();

  appendDateFilter(query, filter);

  const queryString = query.toString();

  return apiRequest<MyPlaceTransactionList>(
    `/api/v1/transaction/map/my-place/${placeId}${
      queryString ? `?${queryString}` : ''
    }`,
  );
}

export function groupMapTransactionsByName(
  transactions: MapTransaction[],
): GroupedMapTransaction[] {
  const groups = new Map<string, MapTransaction[]>();

  transactions.forEach((transaction) => {
    const group = groups.get(transaction.name) ?? [];
    group.push(transaction);
    groups.set(transaction.name, group);
  });

  return Array.from(groups.entries()).map(([name, group]) => {
    const first = group[0];

    return {
      name,
      categoryId: first.categoryId,
      categoryName: first.categoryName,
      amount: group.reduce(
        (sum, transaction) => sum + transaction.amount,
        0,
      ),
      dateList: group.map((transaction) => ({
        transactionId: transaction.transactionId,
        datetime: transaction.datetime,
        amount: transaction.amount,
      })),
    };
  });
}

/** 같은 장소 안에서는 같은 날짜의 개별 거래를 합산해 지도 상세 행으로 보여줍니다. */
export function groupMapTransactionsByDate(
  transactions: MyPlaceTransactionDate[],
): GroupedMapTransactionDate[] {
  const groups = new Map<string, MyPlaceTransactionDate[]>();

  transactions.forEach((transaction) => {
    const date = transaction.datetime.split(' ')[0];
    const group = groups.get(date) ?? [];
    group.push(transaction);
    groups.set(date, group);
  });

  return Array.from(groups.entries()).map(([date, group]) => ({
    date,
    datetime: group[0].datetime,
    amount: group.reduce((sum, transaction) => sum + transaction.amount, 0),
    transactionCount: group.length,
    transactionIds: group.map((transaction) => transaction.transactionId),
  }));
}
