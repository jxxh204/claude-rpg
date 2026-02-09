import fs from 'fs-extra'
import path from 'path'
import matter from 'gray-matter'

export interface SkillData {
  name: string
  description: string
  allowedTools: string[]
  content: string
  filePath: string
}

export interface CommandData {
  name: string
  description: string
  version: string
  content: string
  filePath: string
  scope: 'global' | 'project'
}

export interface AgentData {
  name: string
  description: string
  tools: string[]
  model: string
  content: string
  filePath: string
  scope: 'global' | 'project' | 'builtin'
}

export interface HookEntry {
  type: string
  command: string
  timeout?: number
}

export interface HookRule {
  matcher: string
  hooks: HookEntry[]
}

export interface HooksData {
  [eventType: string]: HookRule[]
}

// SKILL.md 파싱
export async function parseSkill(skillDir: string): Promise<SkillData | null> {
  const skillFile = path.join(skillDir, 'SKILL.md')
  if (!await fs.pathExists(skillFile)) return null

  const raw = await fs.readFile(skillFile, 'utf-8')
  const { data, content } = matter(raw)

  return {
    name: data.name || path.basename(skillDir),
    description: data.description || '',
    allowedTools: data['allowed-tools']
      ? String(data['allowed-tools']).split(',').map(s => s.trim())
      : [],
    content: content.trim(),
    filePath: skillFile,
  }
}

// Command .md 파싱
export async function parseCommand(filePath: string, scope: 'global' | 'project'): Promise<CommandData | null> {
  if (!await fs.pathExists(filePath)) return null

  const raw = await fs.readFile(filePath, 'utf-8')
  const { data, content } = matter(raw)

  const baseName = path.basename(filePath, '.md')

  return {
    name: data.name || baseName,
    description: data.description || '',
    version: data.version || '1.0.0',
    content: content.trim(),
    filePath,
    scope,
  }
}

// Agent .md 파싱
export async function parseAgent(filePath: string, scope: 'global' | 'project'): Promise<AgentData | null> {
  if (!await fs.pathExists(filePath)) return null

  const raw = await fs.readFile(filePath, 'utf-8')
  const { data, content } = matter(raw)

  const baseName = path.basename(filePath, '.md')

  return {
    name: data.name || baseName,
    description: data.description || '',
    tools: data.tools ? String(data.tools).split(',').map(s => s.trim()) : [],
    model: data.model || 'sonnet',
    content: content.trim(),
    filePath,
    scope,
  }
}

// settings.json에서 hooks 파싱
export async function parseHooks(settingsPath: string): Promise<HooksData> {
  if (!await fs.pathExists(settingsPath)) return {}

  const settings = await fs.readJSON(settingsPath)
  return settings.hooks || {}
}
