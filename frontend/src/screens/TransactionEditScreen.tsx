import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/common/typography/Text';
import { NativeTextInput } from '@/components/common/typography/TextInput';
import { Calendar, type DateData, LocaleConfig } from 'react-native-calendars';

import AppScreen from '@/components/common/AppScreen';
import { AsyncStateView } from '@/components/common/AsyncStateView';
import { Button } from '@/components/common/button/Button';
import { IconButton } from '@/components/common/button/IconButton';
import { TextButton } from '@/components/common/button/TextButton';
import BaseCard from '@/components/common/card/BaseCard';
import { AppHeader } from '@/components/common/header/AppHeader';
import { TextInput } from '@/components/common/input/TextInput';
import { CategoryIcon } from '@/components/transaction/CategoryIcon';
import { EditableInfoRow } from '@/components/transaction/EditableInfoRow';
import Colors from '@/constants/Colors';
import { useCategories } from '@/hooks/useCategories';
import { useTransactionDetail, useUpdateTransaction } from '@/hooks/useTransactions';
import {
  type TransactionDetail,
  type TransactionType,
  type TransactionUpdateInput,
} from '@/src/api/transactionsApi';
import { useMapPickerStore } from '@/store/mapPickerStore';

// DateInput.tsx가 이미 등록해두는 것과 같은 설정이다. react-native-calendars의 전역 설정이라
// 두 번 등록해도 값만 같으면 문제없고, 이 화면만 봐서는 DateInput을 거치지 않고 달력을 직접
// 띄우기 때문에 여기서도 한 번 등록해야 월/요일이 한국어로 보인다.
LocaleConfig.locales.kr = {
  monthNames: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  monthNamesShort: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  dayNames: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
  dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
};
LocaleConfig.defaultLocale = 'kr';

function toDateOnly(datetime: string) {
  // "YYYY-MM-DD HH:mm:ss"(뒤에 +09가 붙을 수도 있음)에서 날짜 부분만 로컬 Date로 만든다.
  const [year, month, day] = datetime.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
}

/** 원본 datetime의 시:분:초를 그대로 유지한다. 화면에서 시간은 수정 대상이 아니기 때문이다. */
function toTimeOnly(datetime: string) {
  const time = datetime.slice(11, 19);
  return /^\d{2}:\d{2}:\d{2}$/.test(time) ? time : '00:00:00';
}

function toDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDateDisplay(date: Date) {
  return toDateString(date).replaceAll('-', '.');
}

/**
 * 소득·소비 구분 드롭다운의 선택지.
 * +/− 부호만으로는 어느 쪽인지 한눈에 안 들어온다는 피드백이 있어, 글자와 색으로 구분한다.
 */
const TYPE_OPTIONS: { value: TransactionType; label: string; color: string }[] = [
  { value: 'expense', label: '💸 소비', color: Colors.light.danger },
  { value: 'income', label: '💰 소득', color: Colors.light.primary },
];

/** 구분 드롭다운(Modal) 너비. 트리거 오른쪽 끝에 맞춰 띄우는 위치 계산에도 쓴다. */
const TYPE_DROPDOWN_WIDTH = 130;

/**
 * 거래 수정 화면입니다.
 * GET /api/v1/transaction/{transactionId}로 기존 값을 불러오고,
 * 저장 시 PATCH로 "바뀐 필드만" 보냅니다(PATCH라 보내지 않은 필드는 서버가 그대로 유지).
 *
 * 디자인이 DateInput·MapInput·SelectInput·CurrencyInput 같은 공용 입력 컴포넌트의 기본 모양과
 * 많이 달라서(한 줄짜리 카드 항목), 그 컴포넌트들을 고치는 대신 이 화면 전용으로
 * EditableInfoRow를 새로 만들고, 달력 팝업·카테고리 드롭다운도 이 화면 안에서 직접 그렸다.
 */
export default function TransactionEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { transaction, isLoading, error, refetch } = useTransactionDetail(id);
  const { selectOptions: categorySelectOptions, categoryNameById } = useCategories();
  const updateMutation = useUpdateTransaction();

  const pickedLocation = useMapPickerStore((state) => state.pickedLocation);
  const clearPickedLocation = useMapPickerStore((state) => state.clearPickedLocation);
  // pickedLocation은 다른 화면의 지도 선택 흐름과 공유하는 전역 store라, 이 화면에서 연 게 아니면 건드리지 않는다.
  const isReturningFromMapRef = useRef(false);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState<number | null>(null);
  const [type, setType] = useState<TransactionType>('expense');
  const [date, setDate] = useState(() => new Date());
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('');

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  // 구분 드롭다운을 Modal로 화면 좌표에 직접 띄우기 위해, 열 때 트리거 위치를 재서 담아둔다.
  const [typeAnchor, setTypeAnchor] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const typeTriggerRef = useRef<View>(null);
  const isSaving = updateMutation.isPending;

  // 소득 거래에는 장소·카테고리·결제 수단 개념이 없어서(등록 화면도 소득이면 이 입력들을 아예 감춥니다)
  // 수정 화면에서도 잠급니다. 잠긴 항목은 저장할 때 변경분에서도 제외합니다.
  const isIncome = type === 'income';
  const selectedTypeOption = TYPE_OPTIONS.find((option) => option.value === type) ?? TYPE_OPTIONS[0];

  // 상세 조회 응답이 도착하면 폼의 초기값으로 한 번 채웁니다.
  // (transactionId가 같으면 다시 채우지 않아, 사용자가 입력하던 값이 재조회로 날아가지 않습니다.)
  useEffect(() => {
    if (!transaction) return;

    setName(transaction.name);
    setAmount(transaction.amount);
    setType(transaction.type);
    setDate(toDateOnly(transaction.datetime));
    setAddress(transaction.address);
    setCoords(
      transaction.latitude !== null && transaction.longitude !== null
        ? { latitude: transaction.latitude, longitude: transaction.longitude }
        : null,
    );
    setCategoryId(String(transaction.categoryId));
    setPaymentMethod(transaction.paymentMethod);
  }, [transaction?.transactionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // map-picker에서 장소를 고르고 돌아오면 store에 값이 채워진다. 여기서 읽어서 반영한 뒤 비운다.
  useEffect(() => {
    if (!pickedLocation || !isReturningFromMapRef.current) return;

    setAddress(pickedLocation.address);
    setCoords({ latitude: pickedLocation.lat, longitude: pickedLocation.lng });
    clearPickedLocation();
    isReturningFromMapRef.current = false;
  }, [pickedLocation, clearPickedLocation]);

  // 카테고리 목록을 못 받았을 때 엉뚱한 이름('기타')을 보여주지 않도록, 상세 응답의 이름으로 되돌립니다.
  const selectedCategoryName =
    (categoryId ? categoryNameById.get(categoryId) : undefined) ?? transaction?.categoryName ?? '-';
  const amountText = amount === null ? '' : amount.toLocaleString('ko-KR');

  const handleAmountChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '');
    setAmount(digits ? Number(digits) : null);
  };

  /**
   * 구분(소비/소득)을 바꿉니다. 소득으로 바꾸면 장소·카테고리·결제 수단이 잠기므로,
   * 그 항목들의 열려 있던 목록도 함께 닫아 둡니다.
   */
  const handleSelectType = (nextType: TransactionType) => {
    setType(nextType);
    setIsTypeOpen(false);
    if (nextType === 'income') {
      setIsCategoryOpen(false);
    }
  };

  /**
   * 구분 드롭다운을 연다. SelectInput의 dropdownDirection="up"과 같은 방식으로, 트리거 위치를
   * 먼저 재고 Modal 위에 그 좌표로 띄운다. 예전에는 카테고리 목록처럼 제자리에서 펼쳐 아래
   * 입력들을 밀어냈는데, 그러면 열 때마다 "구분"과 "가게명" 사이 간격이 넓어져 보였다. absolute로
   * 그냥 겹쳐 띄우면 부모(ScrollView) 영역 밖이라 터치가 전달되지 않는 문제가 있어(SelectInput.tsx와
   * 동일한 이유), Modal로 띄워 그 문제를 피한다.
   */
  const handleToggleType = () => {
    if (isTypeOpen) {
      setIsTypeOpen(false);
      return;
    }

    typeTriggerRef.current?.measureInWindow((x, y, width, height) => {
      setTypeAnchor({ x, y, width, height });
      setIsTypeOpen(true);
    });
  };

  const handleSelectDay = (day: DateData) => {
    setDate(new Date(day.year, day.month - 1, day.day));
    setIsDatePickerOpen(false);
  };

  const handleOpenMapPicker = () => {
    isReturningFromMapRef.current = true;
    router.push('/map-picker');
  };

  const handleSelectCategory = (value: string) => {
    setCategoryId(value);
    setIsCategoryOpen(false);
  };

  const handleCancel = () => {
    router.back();
  };

  /**
   * 원본과 달라진 필드만 골라 PATCH body를 만듭니다.
   * 전부 보내도 되지만, 그러면 다른 화면에서 먼저 바뀐 값까지 되돌릴 수 있어 변경분만 보냅니다.
   */
  const buildChanges = (original: TransactionDetail): TransactionUpdateInput => {
    const changes: TransactionUpdateInput = {};
    const trimmedName = name.trim();
    const trimmedPaymentMethod = paymentMethod.trim();
    const nextDatetime = `${toDateString(date)} ${toTimeOnly(original.datetime)}`;
    const nextCategoryId = Number(categoryId);

    if (trimmedName !== original.name) changes.name = trimmedName;
    if (amount !== null && amount !== original.amount) changes.amount = amount;
    if (type !== original.type) changes.type = type;
    // 서버가 "+09" 같은 오프셋을 붙여 보낼 수 있으므로 앞 19자리(yyyy-MM-dd HH:mm:ss)만 비교합니다.
    if (nextDatetime !== original.datetime.slice(0, 19)) changes.datetime = nextDatetime;

    /*
     * 장소·카테고리·결제 수단·좌표는 소비에만 있는 항목이라, 소득으로 저장할 때는 아무것도 보내지 않습니다.
     * 소득 거래에서는 상세·수정 화면이 이 항목들을 보여주지 않습니다.)
     */
    if (!isIncome) {
      if (address !== original.address) changes.address = address;
      if (Number.isFinite(nextCategoryId) && nextCategoryId !== original.categoryId) {
        changes.categoryId = nextCategoryId;
      }
      // 공백으로 보내면 서버가 400으로 거절하므로, 값이 있을 때만 보냅니다.
      if (trimmedPaymentMethod && trimmedPaymentMethod !== original.paymentMethod) {
        changes.paymentMethod = trimmedPaymentMethod;
      }
      // 장소를 다시 고른 경우에만 좌표를 함께 보냅니다.
      if (coords && (coords.latitude !== original.latitude || coords.longitude !== original.longitude)) {
        changes.latitude = coords.latitude;
        changes.longitude = coords.longitude;
      }
    }

    return changes;
  };

  /** PATCH /api/v1/transaction/{transactionId} */
  const handleSave = async () => {
    if (!transaction || isSaving) return;

    // 소득은 카테고리를 쓰지 않으므로(잠겨 있음) 가게명·금액만 확인합니다.
    if (!name.trim() || amount === null || (!isIncome && !categoryId)) {
      Alert.alert(
        '입력을 확인해 주세요',
        isIncome ? '항목명과 금액은 꼭 입력해야 해요.' : '가게명, 금액, 카테고리는 꼭 입력해야 해요.',
      );
      return;
    }

    const changes = buildChanges(transaction);

    if (Object.keys(changes).length === 0) {
      // 바뀐 게 없으면 굳이 요청하지 않고 그대로 돌아갑니다.
      router.back();
      return;
    }

    try {
      await updateMutation.mutateAsync({ transactionId: transaction.transactionId, input: changes });
      // back()으로 돌아가면 상세 화면이 원래 있던 자리(리스트 바로 위)로 정확히 한 칸만 돌아가고,
      // 수정 훅이 거래 캐시를 무효화했기 때문에 상세·목록이 알아서 방금 저장한 값을 다시 받아온다.
      router.back();
    } catch (caught) {
      Alert.alert('수정 실패', caught instanceof Error ? caught.message : '거래를 수정하지 못했어요.');
    }
  };

  return (
    <AppScreen scrollable backgroundColor={Colors.light.background}>
      <AppHeader showBackButton title="거래 수정" />

      <AsyncStateView
        emptyMessage="거래 내역을 찾을 수 없어요."
        error={error}
        isEmpty={!transaction}
        isLoading={isLoading}
        onRetry={refetch}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <BaseCard style={styles.summaryCard}>
            <View style={styles.iconContainer}>
              <CategoryIcon
                categoryId={categoryId ?? undefined}
                categoryName={selectedCategoryName}
                size={28}
                type={type}
              />
            </View>

            {/* 구분(소비/소득)은 +/− 부호 대신 드롭다운으로 골라, 어느 쪽인지 글자와 색으로 바로 보이게 한다. */}
            <View style={styles.typeFieldRow}>
              <Text style={[styles.fieldLabel, styles.typeFieldLabel]}>구분</Text>
              <Pressable
                ref={typeTriggerRef}
                accessibilityLabel="소비·소득 구분"
                accessibilityRole="button"
                accessibilityState={{ expanded: isTypeOpen }}
                onPress={handleToggleType}
                style={({ pressed }) => [
                  styles.typeTrigger,
                  { borderColor: selectedTypeOption.color },
                  pressed && styles.pressed,
                ]}>
                <Text style={[styles.typeTriggerText, { color: selectedTypeOption.color }]}>
                  {selectedTypeOption.label}
                </Text>
                <Ionicons
                  color={selectedTypeOption.color}
                  name={isTypeOpen ? 'chevron-up' : 'chevron-down'}
                  size={14}
                />
              </Pressable>
            </View>

            <Text style={styles.fieldLabel}>{isIncome ? '항목명' : '가게명'}</Text>
            <View style={styles.nameFieldRow}>
              <TextInput
                containerStyle={styles.nameInput}
                maxLength={10}
                onChangeText={setName}
                placeholder={isIncome ? '항목명을 입력해 주세요' : '가게명을 입력해 주세요'}
                value={name}
              />
              <IconButton
                color={Colors.light.placeholder}
                name="close"
                onPress={() => setName('')}
                size={16}
                style={styles.nameClearButton}
              />
            </View>

            <Text style={styles.fieldLabel}>금액</Text>
            <View style={styles.amountRow}>
              {/* 부호(+/−)는 위 구분 드롭다운으로 이미 표시되고 있어서(글자·색), 금액 앞에 따로 또
                  보여주지 않는다. amount 자체는 항상 양수로만 저장·전송되고 부호는 type 필드로만
                  구분되므로, 이 배지를 빼도 저장 로직에는 영향이 없다. */}
              <NativeTextInput
                accessibilityLabel="금액"
                inputMode="numeric"
                keyboardType="number-pad"
                onChangeText={handleAmountChange}
                placeholder="0"
                placeholderTextColor={Colors.light.placeholder}
                // 자릿수에 맞춰 폭을 늘려서 "원"이 바로 옆에 붙게 하고, 그래도 카드 밖으로
                // 넘치지 않도록 160을 상한으로 둔다.
                // 금액 글자색도 구분에 맞춰 바꿔서, 소득·소비가 부호 하나가 아니라 화면 전체로 티나게 한다.
                style={[
                  styles.amountInput,
                  { color: selectedTypeOption.color, width: Math.min(160, Math.max(24, amountText.length * 15 + 2)) },
                ]}
                value={amountText}
              />
              <Text style={styles.amountUnit}>원</Text>

              <View style={styles.amountSpacer} />

              <IconButton
                color={Colors.light.placeholder}
                name="close"
                onPress={() => setAmount(null)}
                size={16}
              />
            </View>
          </BaseCard>

          <View style={styles.fieldsCard}>
            <EditableInfoRow
              label="일자"
              onPress={() => setIsDatePickerOpen(true)}
              showDivider={!isIncome}
              trailingIcon={<Ionicons color={Colors.light.textSecondary} name="calendar-outline" size={16} />}
              value={formatDateDisplay(date)}
            />
            {/*
              장소·카테고리·결제 수단은 소비에만 있는 항목이라, 소득이면 잠그는 대신 아예 표시하지 않습니다.
              (등록 화면과 상세 화면도 소득일 때 이 항목들을 보여주지 않습니다.)
            */}
            {!isIncome ? (
              <>
                <EditableInfoRow
                  label="장소"
                  onPress={handleOpenMapPicker}
                  trailingIcon={<Ionicons color={Colors.light.textSecondary} name="location-outline" size={16} />}
                  value={address}
                />

                <View>
                  <EditableInfoRow
                    label="카테고리"
                    onPress={() => setIsCategoryOpen((current) => !current)}
                    showDivider={!isCategoryOpen}
                    trailingIcon={
                      <Ionicons
                        color={Colors.light.textSecondary}
                        name={isCategoryOpen ? 'chevron-up' : 'chevron-down'}
                        size={16}
                      />
                    }
                    value={selectedCategoryName}
                  />

                  {isCategoryOpen ? (
                    <View style={styles.categoryDropdown}>
                      {categorySelectOptions.map((option) => {
                        const isSelected = option.value === categoryId;
                        return (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityState={{ selected: isSelected }}
                            key={option.value}
                            onPress={() => handleSelectCategory(option.value)}
                            style={({ pressed }) => [
                              styles.categoryChip,
                              isSelected && styles.categoryChipSelected,
                              pressed && styles.categoryOptionPressed,
                            ]}>
                            <Text
                              numberOfLines={1}
                              style={[
                                styles.categoryOptionText,
                                isSelected && styles.categoryOptionTextSelected,
                              ]}>
                              {option.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : null}
                </View>

                <EditableInfoRow
                  editable
                  label="결제 수단"
                  onChangeText={setPaymentMethod}
                  onClear={() => setPaymentMethod('')}
                  placeholder="결제 수단을 입력해 주세요"
                  showDivider={false}
                  value={paymentMethod}
                />
              </>
            ) : null}
          </View>

          <View style={styles.actions}>
            <Button onPress={handleCancel} style={styles.actionButton} variant="white">
              취소
            </Button>
            <Button loading={isSaving} onPress={handleSave} style={styles.actionButton} variant="green">
              저장
            </Button>
          </View>
        </ScrollView>
      </AsyncStateView>

      {isDatePickerOpen ? (
        <Modal animationType="fade" onRequestClose={() => setIsDatePickerOpen(false)} transparent visible>
          <Pressable onPress={() => setIsDatePickerOpen(false)} style={styles.backdrop}>
            <Pressable onPress={(event) => event.stopPropagation()} style={styles.datePopup}>
              <Calendar
                current={toDateString(date)}
                markedDates={{ [toDateString(date)]: { selected: true, selectedColor: Colors.light.primary } }}
                maxDate={toDateString(new Date())}
                monthFormat="yyyy년 MMMM"
                // 미래 날짜(회색 처리)는 눌러도 onDayPress가 호출되지 않게 한다.
                disableAllTouchEventsForDisabledDays
                onDayPress={handleSelectDay}
                theme={{
                  arrowColor: Colors.light.text,
                  selectedDayBackgroundColor: Colors.light.primary,
                  selectedDayTextColor: Colors.onboarding.inverseText,
                  textDayFontSize: 15,
                  textDayHeaderFontSize: 13,
                  textDisabledColor: Colors.light.disabled,
                  textMonthFontSize: 18,
                  textMonthFontWeight: '700',
                  textSectionTitleColor: Colors.light.textSecondary,
                  todayTextColor: Colors.light.primary,
                }}
              />
              <View style={styles.datePopupFooter}>
                <TextButton onPress={() => setIsDatePickerOpen(false)}>취소</TextButton>
                <TextButton
                  onPress={() => {
                    setDate(new Date());
                    setIsDatePickerOpen(false);
                  }}>
                  오늘
                </TextButton>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}

      {/*
        구분 드롭다운을 트리거 바로 아래, 오른쪽 끝을 맞춰 화면 좌표에 직접 띄운다. SelectInput.tsx의
        dropdownDirection="up"과 같은 이유로 Modal을 쓴다 — ScrollView 안에서 absolute로 겹쳐 띄우면
        부모 영역 밖이라 터치가 전달되지 않고, 제자리에서 펼치면 "구분"과 "가게명" 사이 간격이
        열 때마다 넓어져 보였다.
      */}
      {isTypeOpen && typeAnchor ? (
        <Modal animationType="none" onRequestClose={() => setIsTypeOpen(false)} statusBarTranslucent transparent visible>
          <Pressable onPress={() => setIsTypeOpen(false)} style={StyleSheet.absoluteFill} />
          <View
            style={[
              styles.typeDropdown,
              {
                top: typeAnchor.y + typeAnchor.height + 6,
                left: typeAnchor.x + typeAnchor.width - TYPE_DROPDOWN_WIDTH,
              },
            ]}>
            {TYPE_OPTIONS.map((option) => {
              const isSelected = option.value === type;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  key={option.value}
                  onPress={() => handleSelectType(option.value)}
                  style={({ pressed }) => [
                    styles.typeOption,
                    isSelected && { backgroundColor: `${option.color}1A` },
                    pressed && styles.pressed,
                  ]}>
                  <Text
                    style={[
                      styles.typeOptionText,
                      { color: option.color },
                      isSelected && styles.typeOptionTextSelected,
                    ]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Modal>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 16,
  },
  summaryCard: {
    gap: 4,
  },
  iconContainer: {
    width: 56,
    height: 56,
    alignSelf: 'center',
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: Colors.light.inputBackground,
  },
  fieldLabel: {
    marginTop: 12,
    marginBottom: 6,
    color: Colors.light.placeholder,
    fontSize: 13,
    fontWeight: '600',
  },
  typeFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeFieldLabel: {
    marginTop: 0,
    marginBottom: 0,
  },
  typeTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 104,
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderRadius: 12,
    backgroundColor: Colors.light.cardBackground,
  },
  typeTriggerText: {
    fontSize: 14,
    fontWeight: '800',
  },
  // Modal 위에 화면 좌표(top/left)로 직접 띄우는 목록이라, 위치는 인라인 스타일로만 정한다.
  typeDropdown: {
    position: 'absolute',
    width: TYPE_DROPDOWN_WIDTH,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    backgroundColor: Colors.light.cardBackground,
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
  },
  typeOption: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  typeOptionTextSelected: {
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.7,
  },
  nameFieldRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  nameInput: {
    width: '100%',
  },
  nameClearButton: {
    position: 'absolute',
    right: 14,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amountInput: {
    // 웹 <input>은 width를 안 주면 브라우저 기본폭(약 20자)을 그대로 가져가 카드 밖으로
    // 넘친다. flexGrow:0으로 내용 길이에 맞게 두되, minWidth:0으로 그 기본폭을 무시하게 한다.
    flexGrow: 0,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: 160,
    padding: 0,
    color: Colors.light.cardTitle,
    fontSize: 26,
    fontWeight: '800',
  },
  amountUnit: {
    marginLeft: 2,
    color: Colors.light.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  amountSpacer: {
    flex: 1,
  },
  fieldsCard: {
    padding: 4,
    borderRadius: 16,
    backgroundColor: Colors.light.cardBackground,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  // 세로로 긴 목록이라 카테고리를 고르기 번거롭다는 피드백이 있어, 한 줄에 2개씩 나오는
  // 칩 그리드로 바꿨다. justifyContent:'space-between' + 칩 width 48%로 2열을 맞추고,
  // 3번째 칩부터는 flexWrap이 다음 줄로 넘긴다.
  categoryDropdown: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  categoryChip: {
    width: '48%',
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: 'center',
  },
  categoryChipSelected: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  categoryOptionPressed: {
    opacity: 0.7,
  },
  categoryOptionText: {
    color: Colors.light.text,
    fontSize: 14,
    textAlign: 'center',
  },
  categoryOptionTextSelected: {
    color: Colors.onboarding.inverseText,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.overlay,
  },
  datePopup: {
    width: '85%',
    padding: 12,
    borderRadius: 20,
    backgroundColor: Colors.light.cardBackground,
  },
  datePopupFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 4,
  },
});
