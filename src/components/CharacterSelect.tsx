import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApi } from '../hooks/useApi'
import { FileBrowser } from './FileBrowser'

// =============================
// 타입
// =============================

interface Character {
  id: string
  name: string
  type: 'global' | 'project'
  path: string
  hasHooks: boolean
  hookCount: number
  commandCount: number
  skillCount: number
  agentCount: number
}

interface GameServer {
  id: string
  folder: string
  name: string
  projectCount: number
  projects: Character[]
}

interface CharacterSelectProps {
  serverId?: string
  navigate: (path: string) => void
}

// =============================
// 메인 컴포넌트: serverId에 따라 분기
// =============================

export function CharacterSelect({ serverId, navigate }: CharacterSelectProps) {
  if (serverId) {
    return <CharacterList serverId={serverId} navigate={navigate} />
  }

  return <ServerSelect navigate={navigate} />
}

// =============================
// 즐겨찾기 훅
// =============================

function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/characters/favorites')
      .then(r => r.json())
      .then(data => setFavorites(data))
      .catch(() => {})
  }, [])

  const toggle = async (charId: string) => {
    const isFav = favorites.includes(charId)
    const method = isFav ? 'DELETE' : 'POST'
    try {
      const res = await fetch(`/api/characters/favorites/${charId}`, { method })
      const data = await res.json()
      if (data.favorites) setFavorites(data.favorites)
    } catch { /* ignore */ }
  }

  const isFavorite = (charId: string) => favorites.includes(charId)

  return { favorites, toggle, isFavorite }
}

// =============================
// 1단계: 서버(폴더) 선택 화면
// =============================

function ServerSelect({ navigate }: { navigate: (path: string) => void }) {
  const { data: servers, loading, refetch } = useApi<GameServer[]>('/api/characters/servers')
  const { data: globalChar } = useApi<Character>('/api/characters/global')
  const [showAddServer, setShowAddServer] = useState(false)
  const { toggle: toggleFav, isFavorite } = useFavorites()

  // 즐겨찾기된 캐릭터 모아보기
  const favoriteChars: (Character & { serverName?: string })[] = []
  if (globalChar && isFavorite(globalChar.id)) {
    favoriteChars.push({ ...globalChar, serverName: '글로벌' })
  }
  if (servers) {
    for (const server of servers) {
      for (const proj of server.projects) {
        if (isFavorite(proj.id)) {
          favoriteChars.push({ ...proj, serverName: server.name })
        }
      }
    }
  }

  const handleRemoveServer = async (serverId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('이 게임 서버를 목록에서 제거하시겠습니까?')) return
    await fetch(`/api/characters/servers/${serverId}`, { method: 'DELETE' })
    refetch()
  }

  return (
    <div className="character-select">
      <div className="character-select__bg" />

      <motion.div
        className="character-select__content"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <h1 className="character-select__title">Claude RPG</h1>
        <p className="character-select__subtitle">게임 서버를 선택하세요</p>

        {loading ? (
          <div className="character-select__loading">서버 탐색 중...</div>
        ) : (
          <>
            {/* 즐겨찾기 섹션 */}
            {favoriteChars.length > 0 && (
              <div style={{ marginBottom: '32px', width: '100%' }}>
                <div className="section-divider" style={{ justifyContent: 'center', borderBottom: 'none', color: 'var(--text-gold)' }}>
                  {'⭐'} 즐겨찾기
                </div>
                <div className="character-select__grid favorites-grid">
                  {favoriteChars.map((char, i) => (
                    <motion.div
                      key={`fav-${char.id}`}
                      className="character-card character-card--favorite"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05, type: 'spring' }}
                      onClick={() => navigate(`/play/${char.id}`)}
                      whileHover={{ scale: 1.03, y: -4 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <button
                        className="favorite-btn favorite-btn--active"
                        onClick={(e) => { e.stopPropagation(); toggleFav(char.id) }}
                        title="즐겨찾기 해제"
                      >
                        {'⭐'}
                      </button>
                      <div className="character-card__avatar">
                        {char.type === 'global' ? '🌍' : '⚔️'}
                      </div>
                      <div className="character-card__name">{char.name}</div>
                      <div className="character-card__type">
                        {char.serverName && <span>{char.serverName}</span>}
                      </div>
                      <div className="character-card__stats">
                        <div className="character-card__stat"><span>{'⚔️'}</span> {char.commandCount}</div>
                        <div className="character-card__stat"><span>{'🔮'}</span> {char.hookCount}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* 전역 캐릭터 (특별 카드) */}
            {globalChar && (
              <div style={{ marginBottom: '32px', width: '100%' }}>
                <div className="section-divider" style={{ justifyContent: 'center', borderBottom: 'none', color: 'var(--text-gold)' }}>
                  {'🌍'} 글로벌 서버
                </div>
                <div className="character-select__grid" style={{ maxWidth: '300px', margin: '0 auto' }}>
                  <GlobalCharCard
                    character={globalChar}
                    onSelect={() => navigate('/play/global')}
                    isFavorite={isFavorite(globalChar.id)}
                    onToggleFav={() => toggleFav(globalChar.id)}
                  />
                </div>
              </div>
            )}

            {/* 서버 목록 */}
            <div className="section-divider" style={{ justifyContent: 'center', borderBottom: 'none', color: 'var(--text-gold)' }}>
              {'🏰'} 게임 서버
            </div>
            <div className="server-grid">
              <AnimatePresence>
                {servers?.map((server, i) => (
                  <motion.div
                    key={server.id}
                    className="server-card"
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ delay: i * 0.08, type: 'spring' }}
                    onClick={() => navigate(`/server/${server.id}`)}
                    whileHover={{ scale: 1.02, y: -3 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="server-card__icon">{'🏰'}</div>
                    <div className="server-card__info">
                      <div className="server-card__name">{server.name}</div>
                      <div className="server-card__path">{server.folder}</div>
                      <div className="server-card__meta">
                        <span>{'👥'} {server.projectCount} 캐릭터</span>
                      </div>
                    </div>
                    <button
                      className="rpg-btn rpg-btn--danger server-card__remove"
                      onClick={(e) => handleRemoveServer(server.id, e)}
                      title="서버 제거"
                    >
                      {'✕'}
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* 서버 추가 카드 */}
              <motion.div
                className="server-card server-card--add"
                onClick={() => setShowAddServer(true)}
                whileHover={{ scale: 1.02, y: -3 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="server-card__add-icon">{'+'}</div>
                <div className="server-card__add-text">서버 추가</div>
              </motion.div>
            </div>
          </>
        )}
      </motion.div>

      {/* 서버 추가: 파일 탐색기 */}
      <AnimatePresence>
        {showAddServer && (
          <FileBrowser
            onCancel={() => setShowAddServer(false)}
            onSelect={async (folderPath) => {
              try {
                const res = await fetch('/api/characters/servers', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ folder: folderPath }),
                })
                if (res.ok) {
                  setShowAddServer(false)
                  refetch()
                }
              } catch (err) {
                console.error('Failed to add server:', err)
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// =============================
// 글로벌 캐릭터 카드
// =============================

function GlobalCharCard({
  character,
  onSelect,
  isFavorite,
  onToggleFav,
}: {
  character: Character
  onSelect: () => void
  isFavorite: boolean
  onToggleFav: () => void
}) {
  return (
    <motion.div
      className="character-card character-card--global"
      onClick={onSelect}
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.98 }}
    >
      <button
        className={`favorite-btn ${isFavorite ? 'favorite-btn--active' : ''}`}
        onClick={(e) => { e.stopPropagation(); onToggleFav() }}
        title={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
      >
        {isFavorite ? '⭐' : '☆'}
      </button>
      <div className="character-card__avatar">{'🌍'}</div>
      <div className="character-card__name">{character.name}</div>
      <div className="character-card__type">~/.claude/ 전역 설정</div>
      <div className="character-card__stats">
        <div className="character-card__stat"><span>{'📕'}</span> {character.skillCount}</div>
        <div className="character-card__stat"><span>{'⚔️'}</span> {character.commandCount}</div>
        <div className="character-card__stat"><span>{'🔮'}</span> {character.hookCount}</div>
      </div>
    </motion.div>
  )
}

// =============================
// 2단계: 캐릭터 선택 (서버 내 프로젝트 목록)
// =============================

function CharacterList({
  serverId,
  navigate,
}: {
  serverId: string
  navigate: (path: string) => void
}) {
  const { data: servers, refetch } = useApi<GameServer[]>('/api/characters/servers')
  const currentServer = servers?.find(s => s.id === serverId)
  const { toggle: toggleFav, isFavorite } = useFavorites()

  const handleActivateHooks = async (charId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await fetch(`/api/characters/${charId}/activate-hooks`, { method: 'POST' })
    refetch()
  }

  const handleDeactivateHooks = async (charId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await fetch(`/api/characters/${charId}/deactivate-hooks`, { method: 'POST' })
    refetch()
  }

  // 서버 데이터 로딩 중
  if (!servers) {
    return (
      <div className="character-select">
        <div className="character-select__bg" />
        <div className="character-select__content">
          <div className="character-select__loading">서버 데이터 로딩 중...</div>
        </div>
      </div>
    )
  }

  // 서버를 찾을 수 없음
  if (!currentServer) {
    return (
      <div className="character-select">
        <div className="character-select__bg" />
        <div className="character-select__content">
          <div className="empty-state" style={{ padding: '60px 20px' }}>
            <div className="empty-state__icon">{'❌'}</div>
            <div className="empty-state__text">서버를 찾을 수 없습니다</div>
            <button className="rpg-btn rpg-btn--primary" onClick={() => navigate('/')}>
              {'◀'} 서버 선택으로
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="character-select">
      <div className="character-select__bg" />

      <motion.div
        className="character-select__content"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {/* 뒤로가기 */}
        <button className="rpg-btn" onClick={() => navigate('/')} style={{ marginBottom: '16px', alignSelf: 'flex-start' }}>
          {'◀'} 서버 선택으로
        </button>

        <h1 className="character-select__title" style={{ fontSize: '36px' }}>
          {'🏰'} {currentServer.name}
        </h1>
        <p className="character-select__subtitle">
          {currentServer.folder} — 캐릭터를 선택하세요
        </p>

        {currentServer.projects.length === 0 ? (
          <div className="empty-state" style={{ padding: '60px 20px' }}>
            <div className="empty-state__icon">{'👻'}</div>
            <div className="empty-state__text">이 서버에 캐릭터가 없습니다</div>
            <div className="empty-state__sub">
              프로젝트 폴더에 .claude/ 디렉토리가 있는 프로젝트가 없습니다.
              <br />Claude Code를 사용한 프로젝트만 캐릭터로 나타납니다.
            </div>
          </div>
        ) : (
          <div className="character-select__grid">
            <AnimatePresence>
              {currentServer.projects.map((char, i) => (
                <motion.div
                  key={char.id}
                  className="character-card character-card--project"
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: i * 0.06, type: 'spring' }}
                  onClick={() => navigate(`/play/${char.id}`)}
                  whileHover={{ scale: 1.03, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <button
                    className={`favorite-btn ${isFavorite(char.id) ? 'favorite-btn--active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); toggleFav(char.id) }}
                    title={isFavorite(char.id) ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                  >
                    {isFavorite(char.id) ? '⭐' : '☆'}
                  </button>
                  <div className="character-card__avatar">{'⚔️'}</div>
                  <div className="character-card__name">{char.name}</div>
                  <div className="character-card__type">Project Character</div>
                  <div className="character-card__stats">
                    <div className="character-card__stat"><span>{'⚔️'}</span> {char.commandCount}</div>
                    <div className="character-card__stat"><span>{'🔮'}</span> {char.hookCount}</div>
                    <div className="character-card__stat"><span>{'🐲'}</span> {char.agentCount}</div>
                  </div>

                  {/* Hook 연결 상태 */}
                  <div className="character-card__hook-status">
                    {char.hasHooks ? (
                      <button
                        className="rpg-btn rpg-btn--cast"
                        style={{ width: '100%', fontSize: '11px' }}
                        onClick={(e) => handleDeactivateHooks(char.id, e)}
                      >
                        {'🔗'} 전투 로그 연결됨
                      </button>
                    ) : (
                      <button
                        className="rpg-btn rpg-btn--primary"
                        style={{ width: '100%', fontSize: '11px' }}
                        onClick={(e) => handleActivateHooks(char.id, e)}
                      >
                        {'⚡'} 전투 로그 연결
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  )
}

// AddServerModal 제거됨 → FileBrowser 컴포넌트로 대체
