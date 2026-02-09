import { Router } from 'express'
import fs from 'fs-extra'
import path from 'path'
import { COMMANDS_DIR } from '../utils/paths.js'
import { parseCommand } from '../utils/parsers.js'

export const commandsRouter = Router()

// 모든 액티브 스킬 목록
commandsRouter.get('/', async (_req, res) => {
  try {
    await fs.ensureDir(COMMANDS_DIR)
    const files = await fs.readdir(COMMANDS_DIR)
    const mdFiles = files.filter(f => f.endsWith('.md'))

    const commands = []
    for (const file of mdFiles) {
      const cmd = await parseCommand(path.join(COMMANDS_DIR, file), 'global')
      if (cmd) commands.push(cmd)
    }

    res.json(commands)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// 단일 액티브 스킬 조회
commandsRouter.get('/:name', async (req, res) => {
  try {
    const filePath = path.join(COMMANDS_DIR, `${req.params.name}.md`)
    const cmd = await parseCommand(filePath, 'global')
    if (!cmd) return res.status(404).json({ error: 'Command not found' })
    res.json(cmd)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// 액티브 스킬 생성
commandsRouter.post('/', async (req, res) => {
  try {
    const { name, description, version, content } = req.body
    await fs.ensureDir(COMMANDS_DIR)

    const md = `---
name: ${name}
description: ${description || ''}
version: ${version || '1.0.0'}
---

${content || ''}`

    const filePath = path.join(COMMANDS_DIR, `${name}.md`)
    await fs.writeFile(filePath, md, 'utf-8')
    const cmd = await parseCommand(filePath, 'global')
    res.json(cmd)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// 액티브 스킬 수정
commandsRouter.put('/:name', async (req, res) => {
  try {
    const { description, version, content } = req.body
    const filePath = path.join(COMMANDS_DIR, `${req.params.name}.md`)
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({ error: 'Command not found' })
    }

    const md = `---
name: ${req.params.name}
description: ${description || ''}
version: ${version || '1.0.0'}
---

${content || ''}`

    await fs.writeFile(filePath, md, 'utf-8')
    const cmd = await parseCommand(filePath, 'global')
    res.json(cmd)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// 액티브 스킬 삭제
commandsRouter.delete('/:name', async (req, res) => {
  try {
    const filePath = path.join(COMMANDS_DIR, `${req.params.name}.md`)
    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({ error: 'Command not found' })
    }
    await fs.remove(filePath)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})
