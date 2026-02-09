import path from 'path'
import os from 'os'

const HOME = os.homedir()

export const CLAUDE_HOME = path.join(HOME, '.claude')
export const SKILLS_DIR = path.join(CLAUDE_HOME, 'skills')
export const COMMANDS_DIR = path.join(CLAUDE_HOME, 'commands')
export const AGENTS_DIR = path.join(CLAUDE_HOME, 'agents')
export const TASKS_DIR = path.join(CLAUDE_HOME, 'tasks')
export const SETTINGS_FILE = path.join(CLAUDE_HOME, 'settings.json')

// 프로젝트 레벨 경로를 동적으로 받을 수 있도록
export function getProjectPaths(projectRoot: string) {
  const claudeDir = path.join(projectRoot, '.claude')
  return {
    claudeDir,
    commands: path.join(claudeDir, 'commands'),
    settings: path.join(claudeDir, 'settings.local.json'),
    agents: path.join(claudeDir, 'agents'),
  }
}
