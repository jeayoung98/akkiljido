// 앱 전체에서 쓰는 색상 팔레트. 다크모드 없이 라이트 팔레트 하나만 관리한다.

// 선택/강조 상태에 쓰는 틴트 색 (현재는 템플릿 기본값, 실사용처 적음)
const tintColorLight = '#2f95dc';

export default {
  light: {
    text: '#000', // 기본 텍스트 색
    background: '#fff', // 기본 배경색
    tint: tintColorLight,
    tabIconDefault: '#ccc', // 비선택 탭 아이콘 색
    tabIconSelected: tintColorLight, // 선택된 탭 아이콘 색
    primary: '#4B8062', // 브랜드 그린. 탭바 활성 원 배경 등에 사용
  },
};
