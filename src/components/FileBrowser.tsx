import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface DirEntry {
  name: string
  path: string
  isDirectory: boolean
  hasClaudeDir: boolean
  childDirCount: number
}

interface BrowseResult {
  current: string
  parent: string | null
  entries: DirEntry[]
  isHome: boolean
}

interface FileBrowserProps {
  onSelect: (folderPath: string) => void
  onCancel: () => void
}

export function FileBrowser({ onSelect, onCancel }: FileBrowserProps) {
  const [browseData, setBrowseData] = useState<BrowseResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [manualPath, setManualPath] = useState('')
  const [showManualInput, setShowManualInput] = useState(false)

  const browse = async (dirPath?: string) => {
    setLoading(true)
    setError('')
    try {
      const url = dirPath
        ? `/api/fs/browse?path=${encodeURIComponent(dirPath)}`
        : '/api/fs/browse'
      const res = await fetch(url)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to browse')
        setLoading(false)
        return
      }
      setBrowseData(data)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    browse()
  }, [])

  const handleGoHome = async () => {
    const res = await fetch('/api/fs/home')
    const data = await res.json()
    browse(data.home)
  }

  const handleManualGo = () => {
    if (manualPath.trim()) {
      browse(manualPath.trim())
      setShowManualInput(false)
    }
  }

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className="modal file-browser"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal__title">{'📂'} 폴더 탐색기</div>

        {/* 현재 경로 표시 */}
        {browseData && (
          <div className="file-browser__path-bar">
            <div className="file-browser__current-path">
              {browseData.current}
            </div>
            <div className="file-browser__path-actions">
              {browseData.parent && (
                <button
                  className="rpg-btn file-browser__nav-btn"
                  onClick={() => browse(browseData.parent!)}
                  title="상위 폴더"
                >
                  {'⬆'}
                </button>
              )}
              <button
                className="rpg-btn file-browser__nav-btn"
                onClick={handleGoHome}
                title="홈 디렉토리"
              >
                {'🏠'}
              </button>
              <button
                className="rpg-btn file-browser__nav-btn"
                onClick={() => setShowManualInput(!showManualInput)}
                title="경로 직접 입력"
              >
                {'✏️'}
              </button>
            </div>
          </div>
        )}

        {/* 직접 경로 입력 */}
        <AnimatePresence>
          {showManualInput && (
            <motion.div
              className="file-browser__manual"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <input
                className="modal__input"
                value={manualPath}
                onChange={e => setManualPath(e.target.value)}
                placeholder="/Users/username/projects"
                onKeyDown={e => e.key === 'Enter' && handleManualGo()}
                autoFocus
              />
              <button className="rpg-btn rpg-btn--primary" onClick={handleManualGo}>
                {'이동'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 에러 */}
        {error && (
          <div className="file-browser__error">
            {'❌'} {error}
          </div>
        )}

        {/* 폴더 목록 */}
        <div className="file-browser__list">
          {loading ? (
            <div className="file-browser__loading">탐색 중...</div>
          ) : browseData && browseData.entries.length === 0 ? (
            <div className="file-browser__empty">
              하위 폴더가 없습니다
            </div>
          ) : (
            browseData?.entries.map((entry, i) => (
              <motion.div
                key={entry.path}
                className={`file-browser__item ${entry.hasClaudeDir ? 'file-browser__item--claude' : ''}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                onClick={() => browse(entry.path)}
              >
                <div className="file-browser__item-icon">
                  {entry.hasClaudeDir ? '⚔️' : '📁'}
                </div>
                <div className="file-browser__item-info">
                  <div className="file-browser__item-name">{entry.name}</div>
                  <div className="file-browser__item-meta">
                    {entry.hasClaudeDir && (
                      <span className="file-browser__claude-badge">Claude 프로젝트</span>
                    )}
                    {entry.childDirCount > 0 && (
                      <span>{entry.childDirCount}개 하위 폴더</span>
                    )}
                  </div>
                </div>
                <div className="file-browser__item-arrow">{'▶'}</div>
              </motion.div>
            ))
          )}
        </div>

        {/* 하단 액션 */}
        <div className="file-browser__footer">
          <div className="file-browser__hint">
            {'💡'} 이 폴더의 하위 프로젝트들이 캐릭터로 인식됩니다
          </div>
          <div className="modal__actions">
            <button className="rpg-btn" onClick={onCancel}>
              취소
            </button>
            <button
              className="rpg-btn rpg-btn--primary"
              onClick={() => browseData && onSelect(browseData.current)}
            >
              {'🏰'} 이 폴더를 서버로 등록
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
