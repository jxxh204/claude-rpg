import { Router } from 'express'
import fs from 'fs-extra'
import { SETTINGS_FILE } from '../utils/paths.js'
import { parseHooks } from '../utils/parsers.js'

export const hooksRouter = Router()

async function readSettings() {
  if (!await fs.pathExists(SETTINGS_FILE)) return {}
  return fs.readJSON(SETTINGS_FILE)
}

async function writeSettings(settings: Record<string, unknown>) {
  await fs.writeJSON(SETTINGS_FILE, settings, { spaces: 2 })
}

// 모든 인챈트(hooks) 목록
hooksRouter.get('/', async (_req, res) => {
  try {
    const hooks = await parseHooks(SETTINGS_FILE)
    res.json(hooks)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// 특정 이벤트 타입의 인챈트
hooksRouter.get('/:eventType', async (req, res) => {
  try {
    const hooks = await parseHooks(SETTINGS_FILE)
    const eventHooks = hooks[req.params.eventType] || []
    res.json(eventHooks)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// 인챈트 추가 (특정 이벤트 타입에)
hooksRouter.post('/:eventType', async (req, res) => {
  try {
    const { matcher, command, timeout } = req.body
    const settings = await readSettings()

    if (!settings.hooks) settings.hooks = {}
    if (!settings.hooks[req.params.eventType]) {
      settings.hooks[req.params.eventType] = []
    }

    const newHook = {
      matcher: matcher || '*',
      hooks: [{
        type: 'command' as const,
        command,
        ...(timeout ? { timeout } : {}),
      }],
    }

    settings.hooks[req.params.eventType].push(newHook)
    await writeSettings(settings)

    res.json(newHook)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// 인챈트 삭제 (이벤트 타입 + 인덱스)
hooksRouter.delete('/:eventType/:index', async (req, res) => {
  try {
    const settings = await readSettings()
    const idx = parseInt(req.params.index, 10)

    if (!settings.hooks?.[req.params.eventType]) {
      return res.status(404).json({ error: 'Hook event type not found' })
    }

    const arr = settings.hooks[req.params.eventType]
    if (idx < 0 || idx >= arr.length) {
      return res.status(404).json({ error: 'Hook index out of range' })
    }

    arr.splice(idx, 1)
    if (arr.length === 0) delete settings.hooks[req.params.eventType]
    await writeSettings(settings)

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})
