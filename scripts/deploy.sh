#!/usr/bin/env bash
#
# deploy.sh — 把本地 coax-tools 同步到服务器站点目录
#
# 设计约束（来自站点实际结构，勿随意改动 EXCLUDES）：
#   - 服务器独有 .htaccess / .user.ini（Apache 配置），本地没有，必须保护
#   - 本地独有 node_modules/ 与 AGENTS.md / CLAUDE.md / harness-* 等开发文件，
#     服务器不需要，且 AGENTS.md 属于内部文档，绝不能发布到公网
#   - 默认 dry-run；必须显式 --apply 才真正写入
#
# 用法：
#   ./scripts/deploy.sh            # 预演，列出将发生的变更，不写入
#   ./scripts/deploy.sh --apply    # 真正同步
#   ./scripts/deploy.sh --check    # 仅测试 SSH 连通性与认证
#
# 可用环境变量覆盖：
#   DEPLOY_HOST DEPLOY_PORT DEPLOY_USER DEPLOY_PATH DEPLOY_KEY

set -euo pipefail

HOST="${DEPLOY_HOST:-121.43.30.190}"
PORT="${DEPLOY_PORT:-22}"
USER="${DEPLOY_USER:-root}"
REMOTE_DIR="${DEPLOY_PATH:-/www/wwwroot/www.tools.coax.uno}"
SSH_KEY="${DEPLOY_KEY:-$HOME/.ssh/id_rsa}"

# 始终以仓库根目录为源，避免在子目录执行导致同步残缺
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

MODE="dry-run"
case "${1:-}" in
  --apply) MODE="apply" ;;
  --check) MODE="check" ;;
  "")      MODE="dry-run" ;;
  *)       echo "未知参数: $1（可用: --apply | --check | 无参数）" >&2; exit 2 ;;
esac

SSH_OPTS=(-p "$PORT" -o IdentitiesOnly=yes -o BatchMode=yes -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new)
[ -f "$SSH_KEY" ] && SSH_OPTS+=(-i "$SSH_KEY")
SSH_CMD="ssh ${SSH_OPTS[*]}"

# ── SSH 连通性检查 ────────────────────────────────────────────────
if [ "$MODE" = "check" ]; then
  echo "→ 测试 SSH: $USER@$HOST:$PORT"
  if $SSH_CMD "$USER@$HOST" 'echo "认证成功: $(whoami)@$(hostname)"'; then
    echo "→ 目标目录: $REMOTE_DIR"
    echo "✓ SSH 可用，可以执行同步"
  else
    echo "✗ SSH 认证失败" >&2
    echo "  本地密钥: $SSH_KEY" >&2
    echo "  处置: 宝塔面板 → SSH 授权管理，把本机公钥添加进去；" >&2
    echo "        或设置 DEPLOY_USER / DEPLOY_KEY 指定其他凭据。" >&2
    exit 1
  fi
  exit 0
fi

# ── rsync 排除规则 ────────────────────────────────────────────────
EXCLUDE_FROM="$(mktemp)"
trap 'rm -f "$EXCLUDE_FROM"' EXIT
cat > "$EXCLUDE_FROM" <<'EOF'
# ── 版本控制 / 依赖 / 虚拟环境 ──
.git/
.harness/
.venv/
node_modules/

# ── 测试与内部文档目录：不对公网开放 ──
#   /test/ 曾以 200 状态公开可访问，且内含完整工具生成算法；
#   /docs/favorites-design.md 同样曾返回 200。
#   这两个目录是内部资产，微信外链风控整改要求线上不可见。
#   注意：nginx 侧还有一层 location 拦截，双保险。
test/
docs/

# ── 环境变量文件：绝不能发布到公网可访问目录 ──
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# ── 编辑器 / 工具配置目录 ──
.idea/
.vscode/
.claude/
.lingma/
.DS_Store
Thumbs.db

# ── 本地部署脚本，不属于站点内容 ──
scripts/
.deploy-test/

# ── 内部开发文档，绝不发布到公网 ──
AGENTS.md
CLAUDE.md
.gitignore
harness-progress.txt
harness-tasks.json

# ── 服务器独有的 Apache 配置 ──
# 本地没有这两个文件。rsync 默认不会删除被 exclude 保护的目标端文件，
# 因此即使加了 --delete，服务器上的 Apache 配置依然安全。
.htaccess
.user.ini
EOF

# ── 执行 ──────────────────────────────────────────────────────────
RSYNC_ARGS=(-az --delete --itemize-changes --stats --exclude-from "$EXCLUDE_FROM")

echo "源:      $REPO_ROOT/"
echo "目标:    $USER@$HOST:$REMOTE_DIR/"
echo "模式:    $([ "$MODE" = "apply" ] && echo '写入（--apply）' || echo '预演（不会写入）')"
echo "────────────────────────────────────────────────"

if [ "$MODE" = "apply" ]; then
  rsync "${RSYNC_ARGS[@]}" -e "$SSH_CMD" "$REPO_ROOT/" "$USER@$HOST:$REMOTE_DIR/"
  echo
  echo "✓ 同步完成"
else
  rsync "${RSYNC_ARGS[@]}" --dry-run -e "$SSH_CMD" "$REPO_ROOT/" "$USER@$HOST:$REMOTE_DIR/"
  echo
  echo "↑ 以上为预演结果，未写入任何内容。确认无误后加 --apply 执行。"
fi