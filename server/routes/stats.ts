import { Router } from 'express'
import type { TrackingService } from '../services/trackingService.js'

export const statsRouter = Router()

// 전체 집계 통계
statsRouter.get('/', (req, res) => {
  const tracking: TrackingService = req.app.get('tracking')
  res.json(tracking.getStats())
})

// 현재 활성 세션
statsRouter.get('/session', (req, res) => {
  const tracking: TrackingService = req.app.get('tracking')
  const session = tracking.getActiveSession()
  res.json(session || null)
})

// 최근 세션 목록
statsRouter.get('/sessions', (req, res) => {
  const tracking: TrackingService = req.app.get('tracking')
  const limit = parseInt(req.query.limit as string) || 50
  res.json(tracking.getRecentSessions(limit))
})

// 도구 사용 랭킹
statsRouter.get('/ranking/tools', (req, res) => {
  const tracking: TrackingService = req.app.get('tracking')
  const ranking = tracking.getToolRanking()

  // 사용 횟수 내림차순 정렬
  const sorted = Object.entries(ranking)
    .sort(([, a], [, b]) => b - a)
    .map(([tool, count]) => ({ tool, count }))

  res.json(sorted)
})
