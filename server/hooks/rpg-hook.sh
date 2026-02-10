#!/bin/bash
# Claude Code Hook → RPG Server
# stdin으로 받은 JSON을 그대로 RPG 서버로 전달
INPUT=$(cat)
curl -s http://localhost:3333/api/events \
  -X POST -H 'Content-Type: application/json' \
  --data-binary "$INPUT" 2>/dev/null
exit 0
