import { Router } from 'express'
import fs from 'fs-extra'
import path from 'path'
import os from 'os'

export const filesystemRouter = Router()

const HOME = os.homedir()

interface DirEntry {
  name: string
  path: string
  isDirectory: boolean
  hasClaudeDir: boolean  // .claude/ 가 있는 프로젝트인지
  childDirCount: number  // 하위 폴더 수 (디렉토리일 때만)
}

// 디렉토리 목록 조회 (파일 탐색기)
filesystemRouter.get('/browse', async (req, res) => {
  try {
    const dirPath = (req.query.path as string) || HOME

    const resolved = path.resolve(dirPath)
    if (!await fs.pathExists(resolved)) {
      return res.status(404).json({ error: 'Directory not found' })
    }

    const stat = await fs.stat(resolved)
    if (!stat.isDirectory()) {
      return res.status(400).json({ error: 'Path is not a directory' })
    }

    const entries: DirEntry[] = []
    const items = await fs.readdir(resolved, { withFileTypes: true })

    // 디렉토리만 표시 (숨김 폴더는 선택적)
    const dirs = items.filter(item =>
      item.isDirectory() &&
      !item.name.startsWith('.') &&
      item.name !== 'node_modules' &&
      item.name !== 'dist' &&
      item.name !== 'build' &&
      item.name !== '__pycache__' &&
      item.name !== '.git'
    )

    for (const dir of dirs) {
      const fullPath = path.join(resolved, dir.name)
      let childDirCount = 0
      let hasClaudeDir = false

      try {
        // .claude 디렉토리 확인
        hasClaudeDir = await fs.pathExists(path.join(fullPath, '.claude'))

        // 하위 폴더 수 (빠른 카운트)
        const children = await fs.readdir(fullPath, { withFileTypes: true })
        childDirCount = children.filter(c =>
          c.isDirectory() && !c.name.startsWith('.') && c.name !== 'node_modules'
        ).length
      } catch {
        // 접근 권한 없는 폴더 스킵
      }

      entries.push({
        name: dir.name,
        path: fullPath,
        isDirectory: true,
        hasClaudeDir,
        childDirCount,
      })
    }

    // 이름순 정렬, .claude 있는 폴더 우선
    entries.sort((a, b) => {
      if (a.hasClaudeDir !== b.hasClaudeDir) return a.hasClaudeDir ? -1 : 1
      return a.name.localeCompare(b.name)
    })

    // 부모 경로
    const parentPath = path.dirname(resolved)

    res.json({
      current: resolved,
      parent: parentPath !== resolved ? parentPath : null,
      entries,
      isHome: resolved === HOME,
    })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// 홈 디렉토리 경로 반환
filesystemRouter.get('/home', (_req, res) => {
  res.json({ home: HOME })
})
