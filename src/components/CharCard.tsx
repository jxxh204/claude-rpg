interface CharCardProps {
  characterName?: string
  characterType?: 'global' | 'project'
}

export function CharCard({ characterName = 'Claude', characterType = 'global' }: CharCardProps) {
  return (
    <div className="char-card">
      <div className="char-card__avatar">
        {characterType === 'global' ? '🌍' : '⚔️'}
      </div>
      <div className="char-card__name">{characterName}</div>
      <div className="char-card__title">
        {characterType === 'global' ? 'Lv.?? Global Agent' : 'Lv.?? Project Agent'}
      </div>

      {/* HP - 컨텍스트 윈도우 */}
      <div className="stat-bar">
        <div className="stat-bar__label">
          <span className="stat-bar__label-name">HP</span>
          <span className="stat-bar__label-value">Context Window</span>
        </div>
        <div className="stat-bar__track">
          <div className="stat-bar__fill stat-bar__fill--hp" style={{ width: '75%' }} />
        </div>
      </div>

      {/* MP - API 토큰 */}
      <div className="stat-bar">
        <div className="stat-bar__label">
          <span className="stat-bar__label-name">MP</span>
          <span className="stat-bar__label-value">API Tokens</span>
        </div>
        <div className="stat-bar__track stat-bar__track--mp">
          <div className="stat-bar__fill stat-bar__fill--mp" style={{ width: '60%' }} />
        </div>
      </div>

      {/* EXP - 세션 대화 */}
      <div className="stat-bar">
        <div className="stat-bar__label">
          <span className="stat-bar__label-name">EXP</span>
          <span className="stat-bar__label-value">Session</span>
        </div>
        <div className="stat-bar__track stat-bar__track--exp">
          <div className="stat-bar__fill stat-bar__fill--exp" style={{ width: '30%' }} />
        </div>
      </div>
    </div>
  )
}
