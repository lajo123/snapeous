#!/bin/bash
# Snapeous - Lancement backend + frontend en parallèle
# Usage: ./start.sh

DIR="$(cd "$(dirname "$0")" && pwd)"

# Activer le venv et lancer le backend
"$DIR/venv/bin/python" -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload &
BACK_PID=$!

# Lancer le frontend
npm run dev --prefix "$DIR/frontend" &
FRONT_PID=$!

echo ""
echo "  Snapeous lancé !"
echo "  Backend  : http://localhost:8000"
echo "  Frontend : http://localhost:5173"
echo ""
echo "  Ctrl+C pour arrêter les deux serveurs"
echo ""

# Arrêter les deux à la fermeture
trap "kill $BACK_PID $FRONT_PID 2>/dev/null; exit" INT TERM
wait
