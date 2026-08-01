#!/usr/bin/env bash
# =============================================================================
# Music Practice Companion — unified dev environment
# =============================================================================
# One command sets up + activates BOTH stacks in your current shell:
#   - Python backend  -> creates/activates api/.venv and installs requirements
#   - Node frontend   -> installs deps and puts Expo/CLI tools on your PATH
#
# A Python venv can only hold Python packages, so the Node side is wired up by
# adding frontend/node_modules/.bin to PATH (there is nothing to "activate" for
# Node — once installed, npm/expo just work).
#
# USAGE (must be SOURCED, not executed, so it can change your shell):
#   source ./activate.sh              # set up / activate everything
#   source ./activate.sh --reinstall  # force a fresh reinstall of all deps
#
# After sourcing, these helpers are available:
#   mpc-backend     start FastAPI  -> http://127.0.0.1:8000/docs
#   mpc-frontend    start Expo web -> http://localhost:8081
#   mpc-deactivate  leave the Python venv
# =============================================================================

# --- make sure we are being sourced -----------------------------------------
_mpc_sourced=0
if [ -n "${ZSH_VERSION:-}" ]; then
  case "${ZSH_EVAL_CONTEXT:-}" in *:file*) _mpc_sourced=1 ;; esac
  _mpc_src="$(eval 'echo ${(%):-%N}')"
elif [ -n "${BASH_VERSION:-}" ]; then
  [ "${BASH_SOURCE[0]}" != "$0" ] && _mpc_sourced=1
  _mpc_src="${BASH_SOURCE[0]}"
else
  _mpc_src="$0"
fi

if [ "$_mpc_sourced" != "1" ]; then
  echo "This script must be SOURCED so it can activate the environment:"
  echo "    source ./activate.sh"
  exit 1
fi

MPC_ROOT="$(cd "$(dirname "$_mpc_src")" && pwd)"
export MPC_ROOT

_mpc_reinstall=0
[ "${1:-}" = "--reinstall" ] && _mpc_reinstall=1

# ---------------------------------------------------------------------------
# Backend: Python virtual environment
# ---------------------------------------------------------------------------
_mpc_venv="$MPC_ROOT/api/.venv"
_mpc_py="$(command -v python3.13 || command -v python3 || command -v python)"

if [ -z "$_mpc_py" ]; then
  echo "[backend] Python not found. Install Python 3.13 from https://www.python.org"
else
  if [ ! -d "$_mpc_venv" ]; then
    echo "[backend] creating virtual environment at api/.venv ..."
    "$_mpc_py" -m venv "$_mpc_venv"
  fi

  # activate it in the current shell
  # shellcheck disable=SC1091
  source "$_mpc_venv/bin/activate"

  _mpc_stamp="$_mpc_venv/.deps_installed"
  if [ "$_mpc_reinstall" = "1" ] || [ ! -f "$_mpc_stamp" ]; then
    echo "[backend] installing Python requirements (one-time, may take a minute) ..."
    python -m pip install --upgrade pip >/dev/null 2>&1
    if python -m pip install -r "$MPC_ROOT/api/requirements.txt"; then
      touch "$_mpc_stamp"
      echo "[backend] Python dependencies ready."
    else
      echo "[backend] pip install hit an error — see the output above."
    fi
  else
    echo "[backend] venv active (dependencies already installed)."
  fi
fi

# ---------------------------------------------------------------------------
# Frontend: Node dependencies + CLI tools on PATH
# ---------------------------------------------------------------------------
_mpc_fe="$MPC_ROOT/frontend"
if command -v npm >/dev/null 2>&1; then
  if [ ! -d "$_mpc_fe/node_modules" ] || [ "$_mpc_reinstall" = "1" ]; then
    echo "[frontend] running npm install (one-time, may take a minute) ..."
    ( cd "$_mpc_fe" && npm install )
  else
    echo "[frontend] node_modules present."
  fi
  # expose locally-installed CLIs (expo, etc.) for this shell session
  case ":$PATH:" in
    *":$_mpc_fe/node_modules/.bin:"*) ;;
    *) export PATH="$_mpc_fe/node_modules/.bin:$PATH" ;;
  esac
else
  echo "[frontend] npm not found. Install Node.js 18+ from https://nodejs.org"
fi

# ---------------------------------------------------------------------------
# Helper commands
# ---------------------------------------------------------------------------
mpc-backend()    { ( cd "$MPC_ROOT/api" && uvicorn app.main:app --reload ); }
mpc-frontend()   { ( cd "$MPC_ROOT/frontend" && npm run web ); }
mpc-deactivate() { deactivate 2>/dev/null && echo "Python venv deactivated." || echo "No active venv."; }

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "================================================================"
echo " Music Practice Companion — dev environment ready"
echo "----------------------------------------------------------------"
echo "  python : $(python --version 2>&1)   (venv: api/.venv)"
echo "  node   : $(command -v node >/dev/null 2>&1 && node --version || echo 'not found')"
echo "  npm    : $(command -v npm  >/dev/null 2>&1 && npm --version  || echo 'not found')"
echo "----------------------------------------------------------------"
echo "  mpc-backend     -> FastAPI   http://127.0.0.1:8000/docs"
echo "  mpc-frontend    -> Expo web  http://localhost:8081"
echo "  mpc-deactivate  -> exit the Python venv"
echo "================================================================"

unset _mpc_sourced _mpc_src _mpc_reinstall _mpc_venv _mpc_py _mpc_stamp _mpc_fe
