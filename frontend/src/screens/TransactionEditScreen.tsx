import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput as NativeTextInput,
  View,
} from 'react-native';
import { Calendar, type DateData, LocaleConfig } from 'react-native-calendars';

import AppScreen from '@/components/common/AppScreen';
import { Button } from '@/components/common/button/Button';
import { IconButton } from '@/components/common/button/IconButton';
import { TextButton } from '@/components/common/button/TextButton';
import BaseCard from '@/components/common/card/BaseCard';
import { AppHeader } from '@/components/common/header/AppHeader';
import { TextInput } from '@/components/common/input/TextInput';
import { CategoryIcon } from '@/components/transaction/CategoryIcon';
import { EditableInfoRow } from '@/components/transaction/EditableInfoRow';
import type { TransactionType } from '@/components/transaction/TransactionItem';
import { CATEGORY_ID_SELECT_OPTIONS, CATEGORY_NAME_BY_ID } from '@/constants/categories';
import Colors from '@/constants/Colors';
import { MOCK_TRANSACTIONS } from '@/mocks/transactionViewData';
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
  // "YYYY-MM-DD HH:mm:ss+09"에서 날짜 부분만 로컬 Date로 만든다(시간은 수정 대상이 아니라 버린다).
  const [year, month, day] = datetime.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDateDisplay(date: Date) {
  return toDateString(date).replaceAll('-', '.');
}

// TransactionDetailScreen과 같은 규칙: 상세 화면 "장소" 칸은 풀 주소 대신 구 단위만 짧게 보여준다.
function formatPlace(address: string) {
  return address.match(/[가-힣]+구/)?.[0] ?? address;
}

/**
 * 거래 수정 화면입니다. 아직 수정 API가 없어서, 저장을 누르면 MOCK_TRANSACTIONS 배열의
 * 해당 항목을 직접 바꿔치기합니다. 실제 API가 붙으면 이 저장 로직만 PATCH 호출로 바꾸면 됩니다.
 *
 * 디자인이 DateInput·MapInput·SelectInput·CurrencyInput 같은 공용 입력 컴포넌트의 기본 모양과
 * 많이 달라서(한 줄짜리 카드 항목), 그 컴포넌트들을 고치는 대신 이 화면 전용으로
 * EditableInfoRow를 새로 만들고, 달력 팝업·카테고리 드롭다운도 이 화면 안에서 직접 그렸다.
 */
export default function TransactionEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const transaction = MOCK_TRANSACTIONS.find((record) => String(record.transactionId) === id);

  const pickedLocation = useMapPickerStore((state) => state.pickedLocation);
  const clearPickedLocation = useMapPickerStore((state) => state.clearPickedLocation);

  const [name, setName] = useState(transaction?.name ?? '');
  const [amount, setAmount] = useState<number | null>(transaction?.amount ?? null);
  const [type, setType] = useState<TransactionType>(transaction?.type ?? 'expense');
  const [date, setDate] = useState(() => (transaction ? toDateOnly(transaction.datetime) : new Date()));
  const [address, setAddress] = useState(transaction?.address ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(
    transaction ? String(transaction.categoryId) : null,
  );
  const [paymentMethod, setPaymentMethod] = useState(transaction?.paymentMethod ?? '');
  const [memo, setMemo] = useState(transaction?.memo ?? '');

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  // map-picker에서 장소를 고르고 돌아오면 store에 값이 채워진다. 여기서 읽어서 반영한 뒤 비운다.
  useEffect(() => {
    if (pickedLocation) {
      setAddress(pickedLocation.address);
      clearPickedLocation();
    }
  }, [pickedLocation, clearPickedLocation]);

  if (!transaction) {
    return (
      <AppScreen backgroundColor={Colors.light.background}>
        <AppHeader showBackButton title="거래 수정" />
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>거래 내역을 찾을 수 없어요.</Text>
        </View>
      </AppScreen>
    );
  }

  const selectedCategoryName = categoryId ? (CATEGORY_NAME_BY_ID.get(categoryId) ?? '기타') : '기타';
  const amountText = amount === null ? '' : amount.toLocaleString('ko-KR');

  const handleAmountChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '');
    setAmount(digits ? Number(digits) : null);
  };

  const handleToggleType = () => {
    setType((current) => (current === 'income' ? 'expense' : 'income'));
  };

  const handleSelectDay = (day: DateData) => {
    setDate(new Date(day.year, day.month - 1, day.day));
    setIsDatePickerOpen(false);
  };

  const handleOpenMapPicker = () => {
    router.push('/map-picker');
  };

  const handleSelectCategory = (value: string) => {
    setCategoryId(value);
    setIsCategoryOpen(false);
  };

  const handleCancel = () => {
    router.back();
  };

  const handleSave = () => {
    if (!name.trim() || amount === null || !categoryId) {
      Alert.alert('입력을 확인해 주세요', '가게명, 금액, 카테고리는 꼭 입력해야 해요.');
      return;
    }

    // TODO(API): PATCH /transactions/{id} 성공 후 React Query의 거래 상세·목록 쿼리를 invalidate하고,
    // 현재처럼 목업 배열을 직접 바꿔치기하지 않도록 교체합니다.
    transaction.name = name.trim();
    transaction.amount = amount;
    transaction.type = type;
    transaction.datetime = `${toDateString(date)} ${transaction.datetime.slice(11)}`;
    transaction.address = address;
    transaction.categoryId = Number(categoryId);
    transaction.categoryName = selectedCategoryName;
    transaction.paymentMethod = paymentMethod;
    transaction.memo = memo;

    // back()으로 돌아가면 상세 화면이 원래 있던 자리(리스트 바로 위)로 정확히 한 칸만 돌아간다.
    // 화면에 방금 바꾼 값을 보여주는 건 TransactionDetailScreen의 useFocusEffect가 담당한다
    // (화면을 다시 마운트하지 않고도 포커스를 받을 때마다 MOCK_TRANSACTIONS를 다시 읽는다).
    router.back();
  };

  return (
    <AppScreen backgroundColor={Colors.light.background}>
      <AppHeader showBackButton title="거래 수정" />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <BaseCard style={styles.summaryCard}>
          <View style={styles.iconContainer}>
            <CategoryIcon categoryName={selectedCategoryName} size={28} />
          </View>

          <Text style={styles.fieldLabel}>가게명</Text>
          <View style={styles.nameFieldRow}>
            <TextInput
              containerStyle={styles.nameInput}
              onChangeText={setName}
              placeholder="가게명을 입력해 주세요"
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
            <Pressable
              accessibilityLabel="수입·소비 전환"
              accessibilityRole="button"
              onPress={handleToggleType}
              style={styles.signButton}>
              <Text style={styles.signButtonText}>{type === 'income' ? '+' : '−'}</Text>
            </Pressable>

            <NativeTextInput
              accessibilityLabel="금액"
              inputMode="numeric"
              keyboardType="number-pad"
              onChangeText={handleAmountChange}
              placeholder="0"
              placeholderTextColor={Colors.light.placeholder}
              // 자릿수에 맞춰 폭을 늘려서 "원"이 바로 옆에 붙게 하고, 그래도 카드 밖으로
              // 넘치지 않도록 160을 상한으로 둔다.
              style={[styles.amountInput, { width: Math.min(160, Math.max(24, amountText.length * 15 + 2)) }]}
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
            trailingIcon={<Ionicons color={Colors.light.textSecondary} name="calendar-outline" size={16} />}
            value={formatDateDisplay(date)}
          />
          <EditableInfoRow
            label="장소"
            onPress={handleOpenMapPicker}
            trailingIcon={<Ionicons color={Colors.light.textSecondary} name="location-outline" size={16} />}
            value={formatPlace(address)}
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
                {CATEGORY_ID_SELECT_OPTIONS.map((option) => {
                  const isSelected = option.value === categoryId;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      key={option.value}
                      onPress={() => handleSelectCategory(option.value)}
                      style={({ pressed }) => [
                        styles.categoryOption,
                        isSelected && styles.categoryOptionSelected,
                        pressed && styles.categoryOptionPressed,
                      ]}>
                      <Text
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
            value={paymentMethod}
          />
          <EditableInfoRow
            editable
            label="메모"
            onChangeText={setMemo}
            onClear={() => setMemo('')}
            placeholder="메모를 입력해 주세요"
            showDivider={false}
            value={memo}
          />
        </View>

        <View style={styles.actions}>
          <Button onPress={handleCancel} style={styles.actionButton} variant="white">
            취소
          </Button>
          <Button onPress={handleSave} style={styles.actionButton} variant="green">
            저장
          </Button>
        </View>
      </ScrollView>

      {isDatePickerOpen ? (
        <Modal animationType="fade" onRequestClose={() => setIsDatePickerOpen(false)} transparent visible>
          <Pressable onPress={() => setIsDatePickerOpen(false)} style={styles.backdrop}>
            <Pressable onPress={(event) => event.stopPropagation()} style={styles.datePopup}>
              <Calendar
                current={toDateString(date)}
                markedDates={{ [toDateString(date)]: { selected: true, selectedColor: Colors.light.primary } }}
                monthFormat="yyyy년 MMMM"
                onDayPress={handleSelectDay}
                theme={{
                  arrowColor: Colors.light.text,
                  selectedDayBackgroundColor: Colors.light.primary,
                  selectedDayTextColor: '#fff',
                  textDayFontSize: 15,
                  textDayHeaderFontSize: 13,
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
    backgroundColor: '#EEF7F0',
  },
  fieldLabel: {
    marginTop: 12,
    marginBottom: 6,
    color: Colors.light.placeholder,
    fontSize: 13,
    fontWeight: '600',
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
  signButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: Colors.light.inputBackground,
  },
  signButtonText: {
    color: Colors.light.primary,
    fontSize: 20,
    fontWeight: '800',
  },
  amountInput: {
    // 웹 <input>은 width를 안 주면 브라우저 기본폭(약 20자)을 그대로 가져가 카드 밖으로
    // 넘친다. flexGrow:0으로 내용 길이에 맞게 두되, minWidth:0으로 그 기본폭을 무시하게 한다.
    flexGrow: 0,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: 160,
    // 부호 버튼과 금액 사이만 더 띄운다(다른 요소 사이 gap은 그대로 둔다).
    marginLeft: 16,
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
  categoryDropdown: {
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  categoryOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  categoryOptionSelected: {
    backgroundColor: Colors.light.primary,
  },
  categoryOptionPressed: {
    opacity: 0.7,
  },
  categoryOptionText: {
    color: Colors.light.text,
    fontSize: 14,
    textAlign: 'right',
  },
  categoryOptionTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  notFoundText: {
    color: Colors.light.textSecondary,
    fontSize: 14,
  },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
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
