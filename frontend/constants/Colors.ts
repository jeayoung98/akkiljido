// 앱 전체에서 쓰는 색상 팔레트. 다크모드 없이 라이트 팔레트 하나만 관리한다.

// 선택/강조 상태에 쓰는 틴트 색 (현재는 템플릿 기본값, 실사용처 적음)
const tintColorLight = '#2f95dc';

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
    background: '#fff', // 기본 배경색
    tint: tintColorLight,
    tabIconDefault: '#ccc', // 비선택 탭 아이콘 색
    tabIconSelected: tintColorLight, // 선택된 탭 아이콘 색
    primary: '#4B8062', // 브랜드 그린. 탭바 활성 원 배경 등에 사용
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
