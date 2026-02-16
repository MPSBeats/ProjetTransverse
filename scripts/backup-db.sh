#!/bin/bash
# scripts/backup-db.sh — Sauvegarde automatique MySQL pour o2switch
# Usage: Ajouter en cron : 0 3 * * * /home/user/invithegourmand/scripts/backup-db.sh
# Cela exécute le backup chaque jour à 3h du matin

set -euo pipefail

# ─── Configuration ───
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"
MAX_BACKUPS=30  # Garder les 30 derniers backups

# Charger les variables d'environnement depuis .env
if [ -f "$PROJECT_DIR/.env" ]; then
    export $(grep -v '^#' "$PROJECT_DIR/.env" | grep -E '^(DB_HOST|DB_PORT|DB_USER|DB_PASSWORD|DB_NAME)=' | xargs)
fi

# Fallback: extraire depuis DATABASE_URL si les variables individuelles ne sont pas définies
if [ -z "${DB_HOST:-}" ]; then
    DATABASE_URL=$(grep '^DATABASE_URL=' "$PROJECT_DIR/.env" | cut -d'=' -f2- | tr -d '"')
    DB_USER=$(echo "$DATABASE_URL" | sed -n 's|mysql://\([^:]*\):.*|\1|p')
    DB_PASSWORD=$(echo "$DATABASE_URL" | sed -n 's|mysql://[^:]*:\([^@]*\)@.*|\1|p')
    DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|mysql://[^@]*@\([^:]*\):.*|\1|p')
    DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|mysql://[^@]*@[^:]*:\([^/]*\)/.*|\1|p')
    DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|mysql://[^/]*/\([^?]*\).*|\1|p')
fi

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"

# ─── Création du dossier de backup ───
mkdir -p "$BACKUP_DIR"

# ─── Nom du fichier de backup ───
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

echo "🗄️  Sauvegarde de la base '$DB_NAME'..."
echo "   Hôte: $DB_HOST:$DB_PORT"
echo "   Fichier: $BACKUP_FILE"

# ─── Dump MySQL avec compression ───
mysqldump \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --user="$DB_USER" \
    --password="$DB_PASSWORD" \
    --single-transaction \
    --routines \
    --triggers \
    --add-drop-table \
    --complete-insert \
    "$DB_NAME" | gzip > "$BACKUP_FILE"

# Vérifier le succès
if [ $? -eq 0 ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ Sauvegarde réussie ! Taille: $SIZE"
else
    echo "❌ Erreur lors de la sauvegarde"
    exit 1
fi

# ─── Rotation : supprimer les vieux backups ───
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/*.sql.gz 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
    DELETE_COUNT=$((BACKUP_COUNT - MAX_BACKUPS))
    echo "🔄 Suppression de $DELETE_COUNT ancien(s) backup(s)..."
    ls -1t "$BACKUP_DIR"/*.sql.gz | tail -n "$DELETE_COUNT" | xargs rm -f
fi

echo "📊 Backups conservés: $(ls -1 "$BACKUP_DIR"/*.sql.gz 2>/dev/null | wc -l)/$MAX_BACKUPS"
echo "✨ Terminé !"
