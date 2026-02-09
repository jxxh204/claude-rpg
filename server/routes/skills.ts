import { Router } from 'express'
import fs from 'fs-extra'
import path from 'path'
import { SKILLS_DIR } from '../utils/paths.js'
import { parseSkill } from '../utils/parsers.js'

export const skillsRouter = Router()

// 모든 패시브 스킬 목록
skillsRouter.get('/', async (_req, res) => {
  try {
    await fs.ensureDir(SKILLS_DIR)
    const dirs = await fs.readdir(SKILLS_DIR, { withFileTypes: true })
    const skillDirs = dirs.filter(d => d.isDirectory())

    const skills = []
    for (const dir of skillDirs) {
      const skill = await parseSkill(path.join(SKILLS_DIR, dir.name))
      if (skill) skills.push(skill)
    }

    res.json(skills)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// 단일 패시브 스킬 조회
skillsRouter.get('/:name', async (req, res) => {
  try {
    const skill = await parseSkill(path.join(SKILLS_DIR, req.params.name))
    if (!skill) return res.status(404).json({ error: 'Skill not found' })
    res.json(skill)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// 패시브 스킬 생성
skillsRouter.post('/', async (req, res) => {
  try {
    const { name, description, allowedTools, content } = req.body
    const skillDir = path.join(SKILLS_DIR, name)
    await fs.ensureDir(skillDir)

    const toolsStr = (allowedTools || []).join(', ')
    const md = `---
name: ${name}
description: ${description || ''}
allowed-tools: ${toolsStr}
---

${content || ''}`

    await fs.writeFile(path.join(skillDir, 'SKILL.md'), md, 'utf-8')
    const skill = await parseSkill(skillDir)
    res.json(skill)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// 패시브 스킬 수정
skillsRouter.put('/:name', async (req, res) => {
  try {
    const { description, allowedTools, content } = req.body
    const skillDir = path.join(SKILLS_DIR, req.params.name)
    if (!await fs.pathExists(skillDir)) {
      return res.status(404).json({ error: 'Skill not found' })
    }

    const toolsStr = (allowedTools || []).join(', ')
    const md = `---
name: ${req.params.name}
description: ${description || ''}
allowed-tools: ${toolsStr}
---

${content || ''}`

    await fs.writeFile(path.join(skillDir, 'SKILL.md'), md, 'utf-8')
    const skill = await parseSkill(skillDir)
    res.json(skill)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// 패시브 스킬 삭제
skillsRouter.delete('/:name', async (req, res) => {
  try {
    const skillDir = path.join(SKILLS_DIR, req.params.name)
    if (!await fs.pathExists(skillDir)) {
      return res.status(404).json({ error: 'Skill not found' })
    }
    await fs.remove(skillDir)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})
