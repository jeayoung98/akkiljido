import { useAppStore } from '../stores/useAppStore'

export function HomePage() {
  const isInitialized = useAppStore((state) => state.isInitialized)

  return (
    <main>
      <h1>
        {isInitialized
          ? '프론트엔드 프로젝트 초기화가 완료되었습니다.'
          : '프론트엔드 프로젝트를 초기화하고 있습니다.'}
      </h1>
    </main>
  )
}
