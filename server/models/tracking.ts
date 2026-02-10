// =============================
// 추적 시스템 타입 정의
// =============================

export interface AgentSpawn {
  agentId: string
  agentType: string
  startedAt: string
  endedAt?: string
  durationMs?: number
}

export interface Session {
  id: string              // session_id from Claude Code
  startedAt: string
  endedAt?: string
  durationMs?: number
  prompt?: string         // UserPromptSubmit의 prompt (첫 100자)
  cwd?: string
  toolUsage: Record<string, number>   // { "Edit": 5, "Read": 12 }
  agentSpawns: AgentSpawn[]
  eventCount: number
  status: 'active' | 'completed'
}

export interface DailyActivity {
  date: string            // "2026-02-10"
  sessions: number
  tools: number
}

export interface TrackingData {
  totalSessions: number
  totalToolUses: number
  totalAgentSpawns: number
  totalDurationMs: number
  totalChainTriggers: number
  toolRanking: Record<string, number>     // 전체 기간 도구 사용 횟수
  agentRanking: Record<string, number>    // 전체 기간 에이전트 소환 횟수
  chainTriggers: Record<string, number>   // 체인별 발동 횟수
  dailyActivity: DailyActivity[]          // 최근 30일
  recentSessions: Session[]               // 최근 50개 세션
}

// 기본 빈 데이터
export function createEmptyTrackingData(): TrackingData {
  return {
    totalSessions: 0,
    totalToolUses: 0,
    totalAgentSpawns: 0,
    totalDurationMs: 0,
    totalChainTriggers: 0,
    toolRanking: {},
    agentRanking: {},
    chainTriggers: {},
    dailyActivity: [],
    recentSessions: [],
  }
}

// RPG 이벤트 (events.ts에서 생성, tracking에서 소비)
export interface RpgEvent {
  id: string
  timestamp: string
  type: string            // hook_event_name 또는 레거시 type
  rpgMessage: string
  rpgIcon: string
  tool?: string
  agentType?: string
  agentId?: string
  sessionId?: string
  toolInputSummary?: string   // 도구 입력 요약 (예: "src/app.tsx")
  prompt?: string             // UserPromptSubmit의 prompt
  cwd?: string
  isSessionStart?: boolean
  isSessionEnd?: boolean
  error?: string              // PostToolUseFailure
  chainId?: string            // ChainTrigger
  chainName?: string          // ChainTrigger
  sessionSummary?: {          // Stop 이벤트에 첨부
    toolCount: number
    agentCount: number
    durationMs: number
  }
}
