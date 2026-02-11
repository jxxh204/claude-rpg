import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApi } from '../hooks/useApi'
import type { Recipe, RecipeComponent } from '../types'

type FilterType = 'all' | 'official' | 'community' | 'installed'

const RARITY_LABELS: Record<string, string> = {
  common: '일반',
  uncommon: '고급',
  rare: '희귀',
  epic: '영웅',
  legendary: '전설',
}

const COMPONENT_ICONS: Record<string, string> = {
  skill: '📕',
  command: '⚔️',
  hook: '🔮',
  agent: '🐲',
}

export function SkillLibrary() {
  const { data: recipes, loading, refetch } = useApi<Recipe[]>('/api/library')
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [installing, setInstalling] = useState<string | null>(null)

  const filteredRecipes = useMemo(() => {
    if (!recipes) return []
    let list = recipes

    // 소스 필터
    if (filter === 'official') list = list.filter(r => r.source === 'official')
    else if (filter === 'community') list = list.filter(r => r.source === 'community' || r.source === 'local')
    else if (filter === 'installed') list = list.filter(r => !!r.installedAt)

    // 검색
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.tags.some(t => t.toLowerCase().includes(q))
      )
    }

    return list
  }, [recipes, filter, search])

  const handleInstall = async (id: string) => {
    setInstalling(id)
    try {
      await fetch(`/api/library/install/${id}`, { method: 'POST' })
      refetch()
    } catch (err) {
      console.error('Install failed:', err)
    } finally {
      setInstalling(null)
    }
  }

  const handleUninstall = async (id: string) => {
    if (!confirm('이 레시피를 제거하시겠습니까?')) return
    try {
      await fetch(`/api/library/uninstall/${id}`, { method: 'POST' })
      refetch()
    } catch (err) {
      console.error('Uninstall failed:', err)
    }
  }

  return (
    <div>
      <div className="panel-title">
        {'🏪'} 상점 Library
      </div>

      {/* 필터 바 */}
      <div className="library-filters">
        <div className="library-filters__tabs">
          {([
            ['all', '전체'],
            ['official', '🏛️ 공식'],
            ['community', '👥 커뮤니티'],
            ['installed', '✅ 설치됨'],
          ] as [FilterType, string][]).map(([key, label]) => (
            <button
              key={key}
              className={`library-filter ${filter === key ? 'library-filter--active' : ''}`}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          className="library-search"
          placeholder="🔍 레시피 검색..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* 레시피 그리드 */}
      {loading ? (
        <div className="empty-state">
          <div className="empty-state__icon">{'⏳'}</div>
          <div className="empty-state__text">카탈로그 로딩 중...</div>
        </div>
      ) : !filteredRecipes.length ? (
        <div className="empty-state">
          <div className="empty-state__icon">{'🏪'}</div>
          <div className="empty-state__text">레시피를 찾을 수 없습니다</div>
          <div className="empty-state__sub">다른 필터나 검색어를 시도해보세요</div>
        </div>
      ) : (
        <div className="card-grid">
          <AnimatePresence>
            {filteredRecipes.map((recipe, i) => (
              <motion.div
                key={recipe.id}
                className={`item-card recipe-card recipe-card--${recipe.rarity} ${recipe.installedAt ? 'recipe-card--installed' : ''}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => setSelectedRecipe(recipe)}
              >
                {/* 희귀도 배지 */}
                <div className={`recipe-rarity recipe-rarity--${recipe.rarity}`}>
                  {RARITY_LABELS[recipe.rarity] || recipe.rarity}
                </div>

                <div className="item-card__header">
                  <div className="item-card__icon recipe-icon">{recipe.icon}</div>
                  <div>
                    <div className="item-card__name">{recipe.name}</div>
                    <div className="item-card__scope">
                      by {recipe.author} · v{recipe.version}
                    </div>
                  </div>
                </div>

                <div className="item-card__desc">{recipe.description}</div>

                {/* 구성요소 아이콘 */}
                <div className="recipe-components">
                  {recipe.components.map((c, ci) => (
                    <span key={ci} className="recipe-component-badge" title={`${c.type}: ${c.name}`}>
                      {COMPONENT_ICONS[c.type] || '📦'} {c.name}
                    </span>
                  ))}
                </div>

                {/* 태그 */}
                {recipe.tags.length > 0 && (
                  <div className="recipe-tags">
                    {recipe.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="recipe-tag">#{tag}</span>
                    ))}
                  </div>
                )}

                {/* 설치/제거 버튼 */}
                <div className="item-card__actions" onClick={e => e.stopPropagation()}>
                  {recipe.installedAt ? (
                    <>
                      <span className="recipe-installed-badge">✅ 설치됨</span>
                      <button
                        className="rpg-btn rpg-btn--danger"
                        onClick={() => handleUninstall(recipe.id)}
                      >
                        제거
                      </button>
                    </>
                  ) : (
                    <button
                      className="rpg-btn rpg-btn--primary"
                      onClick={() => handleInstall(recipe.id)}
                      disabled={installing === recipe.id}
                    >
                      {installing === recipe.id ? '설치 중...' : '📥 설치'}
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* 레시피 상세 모달 */}
      <AnimatePresence>
        {selectedRecipe && (
          <RecipeDetailModal
            recipe={selectedRecipe}
            onClose={() => setSelectedRecipe(null)}
            onInstall={handleInstall}
            onUninstall={handleUninstall}
            installing={installing}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// =============================
// 레시피 상세 모달
// =============================

function RecipeDetailModal({
  recipe,
  onClose,
  onInstall,
  onUninstall,
  installing,
}: {
  recipe: Recipe
  onClose: () => void
  onInstall: (id: string) => void
  onUninstall: (id: string) => void
  installing: string | null
}) {
  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal recipe-modal"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal__title">
          <span className="recipe-modal__icon">{recipe.icon}</span>
          {recipe.name}
          <span className={`recipe-rarity recipe-rarity--${recipe.rarity}`}>
            {RARITY_LABELS[recipe.rarity]}
          </span>
        </div>

        <div className="recipe-modal__meta">
          <span>👤 {recipe.author}</span>
          <span>v{recipe.version}</span>
          <span>{recipe.source === 'official' ? '🏛️ 공식' : '👥 커뮤니티'}</span>
        </div>

        <div className="recipe-modal__desc">{recipe.description}</div>

        {/* 구성요소 목록 */}
        <div className="section-divider">{'📦'} 구성요소</div>
        <div className="recipe-modal__components">
          {recipe.components.map((comp, i) => (
            <ComponentPreview key={i} component={comp} />
          ))}
        </div>

        {/* 태그 */}
        {recipe.tags.length > 0 && (
          <>
            <div className="section-divider">{'🏷️'} 태그</div>
            <div className="recipe-tags recipe-tags--large">
              {recipe.tags.map(tag => (
                <span key={tag} className="recipe-tag">#{tag}</span>
              ))}
            </div>
          </>
        )}

        {/* GitHub 링크 */}
        {recipe.githubUrl && (
          <a
            className="recipe-modal__github"
            href={recipe.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            🔗 GitHub에서 보기
          </a>
        )}

        {/* 액션 */}
        <div className="modal__actions">
          <button className="rpg-btn" onClick={onClose}>닫기</button>
          {recipe.installedAt ? (
            <button
              className="rpg-btn rpg-btn--danger"
              onClick={() => { onUninstall(recipe.id); onClose() }}
            >
              🗑️ 제거
            </button>
          ) : (
            <button
              className="rpg-btn rpg-btn--primary"
              onClick={() => { onInstall(recipe.id); onClose() }}
              disabled={installing === recipe.id}
            >
              {installing === recipe.id ? '설치 중...' : '📥 설치하기'}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

function ComponentPreview({ component }: { component: RecipeComponent }) {
  return (
    <div className="component-preview">
      <div className="component-preview__header">
        <span className="component-preview__icon">
          {COMPONENT_ICONS[component.type] || '📦'}
        </span>
        <span className="component-preview__type">{component.type.toUpperCase()}</span>
        <span className="component-preview__name">{component.name}</span>
      </div>
      {component.description && (
        <div className="component-preview__desc">{component.description}</div>
      )}
      {component.hookConfig && (
        <div className="component-preview__hook">
          <span>이벤트: {component.hookConfig.eventType}</span>
          {component.hookConfig.matcher && <span>매처: {component.hookConfig.matcher}</span>}
        </div>
      )}
    </div>
  )
}
