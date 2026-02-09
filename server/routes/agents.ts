import { Router } from 'express'
import fs from 'fs-extra'
import path from 'path'
import { TASKS_DIR, AGENTS_DIR } from '../utils/paths.js'
import { parseAgent } from '../utils/parsers.js'

export const agentsRouter = Router()

// 빌트인 소환수 타입 목록
const BUILTIN_AGENTS = [
  { name: 'Explore', description: '코드베이스 탐색 전문가', tools: ['Glob', 'Grep', 'Read'], model: 'sonnet', icon: 'dragon', scope: 'builtin' as const },
  { name: 'Bash', description: '커맨드 실행 전문가', tools: ['Bash'], model: 'sonnet', icon: 'eagle', scope: 'builtin' as const },
  { name: 'Plan', description: '구현 전략 설계사', tools: ['Glob', 'Grep', 'Read'], model: 'sonnet', icon: 'owl', scope: 'builtin' as const },
  { name: 'general-purpose', description: '다목적 범용 에이전트', tools: ['*'], model: 'sonnet', icon: 'wolf', scope: 'builtin' as const },
  { name: 'coderabbit:code-reviewer', description: '코드 리뷰 전문가', tools: ['*'], model: 'sonnet', icon: 'crystal', scope: 'builtin' as const },
]

// 소환수 도감 (빌트인 + 커스텀)
agentsRouter.get('/types', async (_req, res) => {
  try {
    const agents = [...BUILTIN_AGENTS]

    // 커스텀 에이전트 (.claude/agents/) 읽기
    if (await fs.pathExists(AGENTS_DIR)) {
      const files = await fs.readdir(AGENTS_DIR)
      const mdFiles = files.filter(f => f.endsWith('.md'))
      for (const file of mdFiles) {
        const agent = await parseAgent(path.join(AGENTS_DIR, file), 'global')
        if (agent) agents.push({ ...agent, icon: 'scroll' })
      }
    }

    res.json(agents)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// 활성 소환수 (현재 실행 중인 태스크)
agentsRouter.get('/active', async (_req, res) => {
  try {
    if (!await fs.pathExists(TASKS_DIR)) {
      return res.json([])
    }

    const taskDirs = await fs.readdir(TASKS_DIR, { withFileTypes: true })
    const activeTasks = []

    for (const dir of taskDirs.filter(d => d.isDirectory())) {
      const taskDir = path.join(TASKS_DIR, dir.name)
      const files = await fs.readdir(taskDir)
      const jsonFiles = files.filter(f => f.endsWith('.json')).sort()

      for (const file of jsonFiles) {
        try {
          const data = await fs.readJSON(path.join(taskDir, file))
          if (data.status === 'in_progress' || data.status === 'pending') {
            activeTasks.push({
              id: dir.name,
              taskId: data.id,
              subject: data.subject || data.description || 'Unknown Task',
              status: data.status,
              activeForm: data.activeForm || '',
            })
          }
        } catch {
          // skip invalid JSON
        }
      }
    }

    res.json(activeTasks)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})
