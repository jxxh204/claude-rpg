import { Router } from 'express'
import fs from 'fs-extra'
import path from 'path'
import os from 'os'

export const charactersRouter = Router()

const HOME = os.homedir()
const CLAUDE_HOME = path.join(HOME, '.claude')
const RPG_CONFIG = path.join(CLAUDE_HOME, 'rpg-config.json')

interface ServerConfig {
  folders: string[]  // 사용자가 등록한 게임 서버(스캔 폴더) 목록
  favorites?: string[]  // 즐겨찾기된 캐릭터 ID 목록
}

interface Character {
  id: string
  name: string
  type: 'global' | 'project'
  path: string
  claudeDir: string
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

// =============================
// RPG Config (서버 폴더 관리)
// =============================

async function loadConfig(): Promise<ServerConfig> {
  if (await fs.pathExists(RPG_CONFIG)) {
    return fs.readJSON(RPG_CONFIG)
  }
  // 기본값: ~/project
  const defaultFolders = [path.join(HOME, 'project')]
  return { folders: defaultFolders }
}

async function saveConfig(config: ServerConfig) {
  await fs.writeJSON(RPG_CONFIG, config, { spaces: 2 })
}

// =============================
// 게임 서버 (폴더) 관리
// =============================

// 게임 서버 목록 조회
charactersRouter.get('/servers', async (_req, res) => {
  try {
    const config = await loadConfig()
    const servers: GameServer[] = []

    for (const folder of config.folders) {
      if (!await fs.pathExists(folder)) continue

      const projects: Character[] = []
      try {
        const subdirs = await fs.readdir(folder, { withFileTypes: true })
        for (const sub of subdirs.filter(s => s.isDirectory())) {
          const fullPath = path.join(folder, sub.name)
          const claudeDir = path.join(fullPath, '.claude')
          const settingsLocal = path.join(claudeDir, 'settings.local.json')

          if (await fs.pathExists(settingsLocal)) {
            const char = await buildCharacter(fullPath, sub.name, claudeDir, settingsLocal)
            projects.push(char)
          }
        }
      } catch { /* skip inaccessible */ }

      servers.push({
        id: Buffer.from(folder).toString('base64url'),
        folder,
        name: path.basename(folder),
        projectCount: projects.length,
        projects,
      })
    }

    res.json(servers)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// 게임 서버(폴더) 추가
charactersRouter.post('/servers', async (req, res) => {
  try {
    const { folder } = req.body
    if (!folder) return res.status(400).json({ error: 'folder is required' })

    const resolved = path.resolve(folder)
    if (!await fs.pathExists(resolved)) {
      return res.status(404).json({ error: `Folder not found: ${resolved}` })
    }

    const stat = await fs.stat(resolved)
    if (!stat.isDirectory()) {
      return res.status(400).json({ error: 'Path is not a directory' })
    }

    const config = await loadConfig()
    if (!config.folders.includes(resolved)) {
      config.folders.push(resolved)
      await saveConfig(config)
    }

    res.json({ success: true, folder: resolved })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// 게임 서버(폴더) 제거
charactersRouter.delete('/servers/:id', async (req, res) => {
  try {
    const folder = Buffer.from(req.params.id, 'base64url').toString('utf-8')
    const config = await loadConfig()
    config.folders = config.folders.filter(f => f !== folder)
    await saveConfig(config)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// =============================
// 캐릭터 (글로벌 + 프로젝트)
// =============================

// 전역 캐릭터
charactersRouter.get('/global', async (_req, res) => {
  try {
    const globalChar = await buildGlobalCharacter()
    res.json(globalChar)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// 모든 캐릭터 목록 (레거시 호환)
charactersRouter.get('/', async (_req, res) => {
  try {
    const characters: Character[] = []

    // 전역 캐릭터
    characters.push(await buildGlobalCharacter())

    // 서버 폴더에서 프로젝트 캐릭터
    const config = await loadConfig()
    for (const folder of config.folders) {
      if (!await fs.pathExists(folder)) continue
      try {
        const subdirs = await fs.readdir(folder, { withFileTypes: true })
        for (const sub of subdirs.filter(s => s.isDirectory())) {
          const fullPath = path.join(folder, sub.name)
          const claudeDir = path.join(fullPath, '.claude')
          const settingsLocal = path.join(claudeDir, 'settings.local.json')

          if (await fs.pathExists(settingsLocal)) {
            const char = await buildCharacter(fullPath, sub.name, claudeDir, settingsLocal)
            if (!characters.find(c => c.path === char.path)) {
              characters.push(char)
            }
          }
        }
      } catch { /* skip */ }
    }

    res.json(characters)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// Hook 활성화
charactersRouter.post('/:id/activate-hooks', async (req, res) => {
  try {
    const { id } = req.params
    let settingsPath: string

    if (id === 'global') {
      settingsPath = path.join(CLAUDE_HOME, 'settings.json')
    } else {
      const projectPath = Buffer.from(id, 'base64url').toString('utf-8')
      settingsPath = path.join(projectPath, '.claude', 'settings.local.json')
    }

    if (!await fs.pathExists(settingsPath)) {
      await fs.ensureDir(path.dirname(settingsPath))
      await fs.writeJSON(settingsPath, {}, { spaces: 2 })
    }

    const settings = await fs.readJSON(settingsPath)
    const rpgHooks = buildRpgHooks()

    if (!settings.hooks) settings.hooks = {}
    for (const [event, rules] of Object.entries(rpgHooks)) {
      if (!settings.hooks[event]) settings.hooks[event] = []
      const hasRpg = settings.hooks[event].some((r: { hooks: Array<{ command: string }> }) =>
        r.hooks.some((h: { command: string }) => h.command.includes('localhost:3333'))
      )
      if (!hasRpg) {
        settings.hooks[event].push(...rules)
      }
    }

    await fs.writeJSON(settingsPath, settings, { spaces: 2 })
    res.json({ success: true, settingsPath })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// Hook 비활성화
charactersRouter.post('/:id/deactivate-hooks', async (req, res) => {
  try {
    const { id } = req.params
    let settingsPath: string

    if (id === 'global') {
      settingsPath = path.join(CLAUDE_HOME, 'settings.json')
    } else {
      const projectPath = Buffer.from(id, 'base64url').toString('utf-8')
      settingsPath = path.join(projectPath, '.claude', 'settings.local.json')
    }

    if (!await fs.pathExists(settingsPath)) return res.json({ success: true })

    const settings = await fs.readJSON(settingsPath)
    if (!settings.hooks) return res.json({ success: true })

    for (const event of Object.keys(settings.hooks)) {
      settings.hooks[event] = settings.hooks[event].filter((r: { hooks: Array<{ command: string }> }) =>
        !r.hooks.some((h: { command: string }) => h.command.includes('localhost:3333'))
      )
      if (settings.hooks[event].length === 0) delete settings.hooks[event]
    }
    if (Object.keys(settings.hooks).length === 0) delete settings.hooks

    await fs.writeJSON(settingsPath, settings, { spaces: 2 })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// =============================
// 즐겨찾기 관리
// =============================

// 즐겨찾기 목록 조회
charactersRouter.get('/favorites', async (_req, res) => {
  try {
    const config = await loadConfig()
    res.json(config.favorites || [])
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// 즐겨찾기 추가
charactersRouter.post('/favorites/:id', async (req, res) => {
  try {
    const { id } = req.params
    const config = await loadConfig()
    if (!config.favorites) config.favorites = []
    if (!config.favorites.includes(id)) {
      config.favorites.push(id)
      await saveConfig(config)
    }
    res.json({ success: true, favorites: config.favorites })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// 즐겨찾기 제거
charactersRouter.delete('/favorites/:id', async (req, res) => {
  try {
    const { id } = req.params
    const config = await loadConfig()
    if (!config.favorites) config.favorites = []
    config.favorites = config.favorites.filter(f => f !== id)
    await saveConfig(config)
    res.json({ success: true, favorites: config.favorites })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// =============================
// 헬퍼 함수
// =============================

async function buildGlobalCharacter(): Promise<Character> {
  const globalSettings = path.join(CLAUDE_HOME, 'settings.json')
  let hookCount = 0
  if (await fs.pathExists(globalSettings)) {
    const data = await fs.readJSON(globalSettings)
    hookCount = data.hooks ? Object.keys(data.hooks).length : 0
  }

  const globalCommandsDir = path.join(CLAUDE_HOME, 'commands')
  let commandCount = 0
  if (await fs.pathExists(globalCommandsDir)) {
    const files = await fs.readdir(globalCommandsDir)
    commandCount = files.filter(f => f.endsWith('.md')).length
  }

  const globalSkillsDir = path.join(CLAUDE_HOME, 'skills')
  let skillCount = 0
  if (await fs.pathExists(globalSkillsDir)) {
    const dirs = await fs.readdir(globalSkillsDir, { withFileTypes: true })
    skillCount = dirs.filter(d => d.isDirectory()).length
  }

  const globalAgentsDir = path.join(CLAUDE_HOME, 'agents')
  let agentCount = 0
  if (await fs.pathExists(globalAgentsDir)) {
    const files = await fs.readdir(globalAgentsDir)
    agentCount = files.filter(f => f.endsWith('.md')).length
  }

  return {
    id: 'global',
    name: 'Claude (Global)',
    type: 'global',
    path: HOME,
    claudeDir: CLAUDE_HOME,
    hasHooks: hookCount > 0,
    hookCount,
    commandCount,
    skillCount,
    agentCount,
  }
}

async function buildCharacter(
  fullPath: string,
  name: string,
  claudeDir: string,
  settingsLocal: string,
): Promise<Character> {
  let hookCount = 0
  let commandCount = 0
  let agentCount = 0

  try {
    const localSettings = await fs.readJSON(settingsLocal)
    hookCount = localSettings.hooks ? Object.keys(localSettings.hooks).length : 0
  } catch { /* skip */ }

  const localCmdsDir = path.join(claudeDir, 'commands')
  if (await fs.pathExists(localCmdsDir)) {
    const files = await fs.readdir(localCmdsDir)
    commandCount = files.filter(f => f.endsWith('.md')).length
  }

  const localAgentsDir = path.join(claudeDir, 'agents')
  if (await fs.pathExists(localAgentsDir)) {
    const files = await fs.readdir(localAgentsDir)
    agentCount = files.filter(f => f.endsWith('.md')).length
  }

  return {
    id: Buffer.from(fullPath).toString('base64url'),
    name,
    type: 'project',
    path: fullPath,
    claudeDir,
    hasHooks: hookCount > 0,
    hookCount,
    commandCount,
    skillCount: 0,
    agentCount,
  }
}

function buildRpgHooks() {
  return {
    PreToolUse: [{
      matcher: '',
      hooks: [{
        type: 'command',
        command: "curl -s http://localhost:3333/api/events -X POST -H 'Content-Type: application/json' -d '{\"type\":\"pre_tool\",\"tool\":\"'\"$CLAUDE_TOOL_NAME\"'\"}'",
        timeout: 3,
      }],
    }],
    PostToolUse: [{
      matcher: '',
      hooks: [{
        type: 'command',
        command: "curl -s http://localhost:3333/api/events -X POST -H 'Content-Type: application/json' -d '{\"type\":\"post_tool\",\"tool\":\"'\"$CLAUDE_TOOL_NAME\"'\"}'",
        timeout: 3,
      }],
    }],
    Stop: [{
      matcher: '',
      hooks: [{
        type: 'command',
        command: "curl -s http://localhost:3333/api/events -X POST -H 'Content-Type: application/json' -d '{\"type\":\"stop\"}'",
        timeout: 3,
      }],
    }],
    UserPromptSubmit: [{
      matcher: '',
      hooks: [{
        type: 'command',
        command: "curl -s http://localhost:3333/api/events -X POST -H 'Content-Type: application/json' -d '{\"type\":\"user_prompt\"}'",
        timeout: 3,
      }],
    }],
  }
}
