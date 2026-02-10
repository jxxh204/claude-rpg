import fs from 'fs-extra'
import path from 'path'
import os from 'os'
import type { Session, TrackingData, RpgEvent, AgentSpawn } from '../models/tracking.js'
import { createEmptyTrackingData } from '../models/tracking.js'

const STATS_FILE = path.join(os.homedir(), '.claude', 'rpg-stats.json')
const MAX_RECENT_SESSIONS = 50
const MAX_DAILY_ACTIVITY = 30
const PERSIST_DEBOUNCE_MS = 5000

export class TrackingService {
  private data: TrackingData = createEmptyTrackingData()
  private activeSessions: Map<string, Session> = new Map()
  private persistTimer: ReturnType<typeof setTimeout> | null = null
  private dirty = false

  // =============================
  // 초기화
  // =============================

  async load(): Promise<void> {
    try {
      if (await fs.pathExists(STATS_FILE)) {
        this.data = await fs.readJSON(STATS_FILE)
        console.log(`[RPG] 추적 데이터 로드 완료 (세션 ${this.data.totalSessions}개, 도구 ${this.data.totalToolUses}회)`)
      } else {
        console.log('[RPG] 추적 데이터 없음, 새로 시작')
      }
    } catch (err) {
      console.error('[RPG] 추적 데이터 로드 실패:', err)
      this.data = createEmptyTrackingData()
    }
  }

  // =============================
  // 이벤트 처리
  // =============================

  handleEvent(event: RpgEvent): void {
    const sessionId = event.sessionId

    switch (event.type) {
      case 'UserPromptSubmit':
        this.startSession(sessionId, event)
        break

      case 'PreToolUse':
        // PreToolUse는 카운트하지 않음 (PostToolUse에서 카운트)
        this.incrementSessionEvent(sessionId)
        break

      case 'PostToolUse':
        this.recordToolUse(sessionId, event.tool)
        break

      case 'PostToolUseFailure':
        this.recordToolUse(sessionId, event.tool)
        break

      case 'SubagentStart':
        this.recordAgentSpawn(sessionId, event.agentId, event.agentType)
        break

      case 'SubagentStop':
        this.recordAgentStop(sessionId, event.agentId)
        break

      case 'Stop':
        this.endSession(sessionId, event)
        break

      case 'SessionEnd':
        // 남은 활성 세션 정리
        if (sessionId && this.activeSessions.has(sessionId)) {
          this.endSession(sessionId, event)
        }
        break

      case 'ChainTrigger':
        this.recordChainTrigger(event)
        break

      default:
        this.incrementSessionEvent(sessionId)
        break
    }

    this.schedulePersist()
  }

  // =============================
  // 세션 관리
  // =============================

  private startSession(sessionId: string | undefined, event: RpgEvent): void {
    if (!sessionId) return

    // 이미 활성 세션이면 이전 세션 종료
    if (this.activeSessions.has(sessionId)) {
      // 같은 세션 내 새로운 prompt → 기존 세션 업데이트
      const existing = this.activeSessions.get(sessionId)!
      existing.prompt = event.prompt?.slice(0, 100)
      existing.eventCount++
      return
    }

    const session: Session = {
      id: sessionId,
      startedAt: event.timestamp,
      prompt: event.prompt?.slice(0, 100),
      cwd: event.cwd,
      toolUsage: {},
      agentSpawns: [],
      eventCount: 1,
      status: 'active',
    }

    this.activeSessions.set(sessionId, session)
  }

  private endSession(sessionId: string | undefined, event: RpgEvent): void {
    if (!sessionId) return

    const session = this.activeSessions.get(sessionId)
    if (!session) return

    session.endedAt = event.timestamp
    session.durationMs = new Date(event.timestamp).getTime() - new Date(session.startedAt).getTime()
    session.status = 'completed'

    // 세션 요약을 이벤트에 첨부
    const toolCount = Object.values(session.toolUsage).reduce((a, b) => a + b, 0)
    const agentCount = session.agentSpawns.length
    event.sessionSummary = {
      toolCount,
      agentCount,
      durationMs: session.durationMs,
    }

    // 집계 업데이트
    this.data.totalSessions++
    this.data.totalDurationMs += session.durationMs || 0

    // 최근 세션 추가
    this.data.recentSessions.unshift({ ...session })
    if (this.data.recentSessions.length > MAX_RECENT_SESSIONS) {
      this.data.recentSessions = this.data.recentSessions.slice(0, MAX_RECENT_SESSIONS)
    }

    // 일별 활동 업데이트
    this.updateDailyActivity(toolCount)

    // 활성 세션에서 제거
    this.activeSessions.delete(sessionId)
    this.dirty = true
  }

  // =============================
  // 도구 사용 기록
  // =============================

  private recordToolUse(sessionId: string | undefined, toolName?: string): void {
    if (!toolName) return

    // 전체 랭킹 업데이트
    this.data.toolRanking[toolName] = (this.data.toolRanking[toolName] || 0) + 1
    this.data.totalToolUses++

    // 세션 내 카운트
    if (sessionId) {
      const session = this.activeSessions.get(sessionId)
      if (session) {
        session.toolUsage[toolName] = (session.toolUsage[toolName] || 0) + 1
        session.eventCount++
      }
    }

    this.dirty = true
  }

  // =============================
  // 에이전트 소환 기록
  // =============================

  private recordAgentSpawn(sessionId: string | undefined, agentId?: string, agentType?: string): void {
    if (!agentType) return

    // 전체 랭킹 업데이트
    this.data.agentRanking[agentType] = (this.data.agentRanking[agentType] || 0) + 1
    this.data.totalAgentSpawns++

    // 세션 내 기록
    if (sessionId) {
      const session = this.activeSessions.get(sessionId)
      if (session) {
        const spawn: AgentSpawn = {
          agentId: agentId || `agent-${Date.now()}`,
          agentType,
          startedAt: new Date().toISOString(),
        }
        session.agentSpawns.push(spawn)
        session.eventCount++
      }
    }

    this.dirty = true
  }

  private recordAgentStop(sessionId: string | undefined, agentId?: string): void {
    if (!sessionId || !agentId) return

    const session = this.activeSessions.get(sessionId)
    if (!session) return

    const spawn = session.agentSpawns.find(s => s.agentId === agentId && !s.endedAt)
    if (spawn) {
      spawn.endedAt = new Date().toISOString()
      spawn.durationMs = new Date(spawn.endedAt).getTime() - new Date(spawn.startedAt).getTime()
    }
    session.eventCount++
  }

  private recordChainTrigger(event: RpgEvent): void {
    const chainId = (event as any).chainId || 'unknown'
    if (!this.data.chainTriggers) this.data.chainTriggers = {}
    this.data.chainTriggers[chainId] = (this.data.chainTriggers[chainId] || 0) + 1
    if (this.data.totalChainTriggers === undefined) this.data.totalChainTriggers = 0
    this.data.totalChainTriggers++
    this.dirty = true
  }

  private incrementSessionEvent(sessionId: string | undefined): void {
    if (!sessionId) return
    const session = this.activeSessions.get(sessionId)
    if (session) session.eventCount++
  }

  // =============================
  // 일별 활동
  // =============================

  private updateDailyActivity(toolCount: number): void {
    const today = new Date().toISOString().slice(0, 10)
    let todayEntry = this.data.dailyActivity.find(d => d.date === today)

    if (!todayEntry) {
      todayEntry = { date: today, sessions: 0, tools: 0 }
      this.data.dailyActivity.push(todayEntry)
    }

    todayEntry.sessions++
    todayEntry.tools += toolCount

    // 최근 30일만 유지
    if (this.data.dailyActivity.length > MAX_DAILY_ACTIVITY) {
      this.data.dailyActivity = this.data.dailyActivity
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, MAX_DAILY_ACTIVITY)
    }
  }

  // =============================
  // 조회
  // =============================

  getActiveSession(): Session | null {
    // 가장 최근 활성 세션 반환
    const sessions = Array.from(this.activeSessions.values())
    return sessions.length > 0 ? sessions[sessions.length - 1] : null
  }

  getActiveSessions(): Session[] {
    return Array.from(this.activeSessions.values())
  }

  getStats(): TrackingData {
    return { ...this.data }
  }

  getRecentSessions(limit = 50): Session[] {
    return this.data.recentSessions.slice(0, limit)
  }

  getToolRanking(): Record<string, number> {
    return { ...this.data.toolRanking }
  }

  // =============================
  // 영속화
  // =============================

  private schedulePersist(): void {
    if (this.persistTimer) return
    this.persistTimer = setTimeout(async () => {
      this.persistTimer = null
      if (this.dirty) {
        await this.persist()
        this.dirty = false
      }
    }, PERSIST_DEBOUNCE_MS)
  }

  private async persist(): Promise<void> {
    try {
      const tmpFile = STATS_FILE + '.tmp'
      await fs.ensureDir(path.dirname(STATS_FILE))
      await fs.writeJSON(tmpFile, this.data, { spaces: 2 })
      await fs.rename(tmpFile, STATS_FILE)
    } catch (err) {
      console.error('[RPG] 추적 데이터 저장 실패:', err)
    }
  }

  // 서버 종료 시 즉시 저장
  async shutdown(): Promise<void> {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer)
      this.persistTimer = null
    }
    if (this.dirty) {
      await this.persist()
    }
  }
}
