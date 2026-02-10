import { useState, useEffect, useCallback } from 'react'

// =============================
// 라우트 타입
// =============================

export type Route =
  | { page: 'server-select' }
  | { page: 'character-select'; serverId: string }
  | { page: 'play'; characterId: string }

// =============================
// URL 파싱
// =============================

function parseRoute(pathname: string): Route {
  const segments = pathname.split('/').filter(Boolean)

  if (segments[0] === 'server' && segments[1]) {
    return { page: 'character-select', serverId: segments[1] }
  }

  if (segments[0] === 'play' && segments[1]) {
    return { page: 'play', characterId: segments[1] }
  }

  return { page: 'server-select' }
}

// =============================
// useRouter 훅
// =============================

export function useRouter() {
  const [route, setRoute] = useState<Route>(() =>
    parseRoute(window.location.pathname)
  )

  // 브라우저 뒤로가기/앞으로가기 감지
  useEffect(() => {
    const handlePopState = () => {
      setRoute(parseRoute(window.location.pathname))
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // 프로그래밍 방식 네비게이션
  const navigate = useCallback((path: string) => {
    history.pushState(null, '', path)
    setRoute(parseRoute(path))
  }, [])

  return { route, navigate }
}
