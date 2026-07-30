// 앱 전체에서 쓰는 색상 팔레트. 다크모드 없이 라이트 팔레트 하나만 관리한다.

export default {
  onboarding: {
    green: '#4A784F',
    text: '#202D25',
    muted: '#768E7C',
    tagline: '#4D4D4D',
    lightText: '#C6D6CA',
    inverseText: '#FFFFFF',
    surface: '#FFFFFF',
  },
  light: {
    text: '#000', // 기본 텍스트 색
    textSecondary: '#525a55', // 보조 설명, 타임스탬프 등 회색톤 텍스트
    background: '#FCFFFD', // 기본 배경색
    primary: '#63A061', // 브랜드 그린. 탭바 활성 원 배경 등에 사용
    border: '#DCDCDC', // 구분선, 입력창 테두리 등
    disabled: '#C9CDC9', // 비활성 버튼 배경 등
    placeholder: '#6B8F7A', // 입력창 안내 문구 색
    danger: '#FB2C36', // 위험/삭제 액션, 빨강 버튼 등
    cardBackground: '#FFFFFF',
    cardTitle: '#18251E',
    cardDescription: '#789080',
    summaryPrimaryBackground: 'rgba(49, 95, 61, 0.45)',
    summaryPrimaryLabel: '#DCECD7',
    summaryPrimaryText: '#FFFFFF',
    summaryInfoBackground: '#EEF3FF',
    summaryInfoLabel: '#8198C3',
    summaryInfoText: '#647AA5',
    summaryInfoCaption: '#91A5CA',
  },
};
