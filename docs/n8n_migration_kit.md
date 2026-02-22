# ⚠️ LEGACY — N8N MIGRATION KIT
> [!NOTE]
> Kit obsolète. La migration vers TypeScript est terminée en V5.

# N8N Migration Kit — GhostNeural v2.0

Ce document contient les instructions, les workflows et les adaptateurs d'API nécessaires pour migrer le pipeline GhostNeural vers une orchestration N8N.

## 1. Pourquoi N8N ?
- **Fiabilité** : Retries natifs et configuration visuelle.
- **Performance** : Exécution parallèle des agents.
- **Coût** : ~0.007$ / prospect (VPS Hetzner 6€/mois).
- **Monitoring** : Dashboard en temps réel.

## 2. Architecture du Pipeline (8 nœuds)
1. **Trigger** : Webhook POST.
2. **Éclaireur** : Règles déterministes (Rejet gratuit 40-50%).
3. **Qualification** : Gemini 1.5 Flash (4 piliers).
4. **Scan Full + Lighthouse** : Parallèle (Playwright + CWV).
5. **Audit Ultra** : Gemini 1.5 Flash (Benchmarks sectoriels).
6. **Stratège + Architecte** : Parallèle (Claude Haiku).
7. **Copywriter** : Claude Haiku (3 variantes).
8. **Critique** : Gemini 1.5 Flash (Validation finale).

## 3. Installation du VPS (Hetzner)
- **Serveur** : Hetzner Cloud CX21 (2 vCPU, 4 Go RAM).
- **OS** : Ubuntu 22.04 LTS.

### Fichier `docker-compose.yml`
Crée un dossier `n8n` sur ton VPS et place ce fichier dedans :

```yaml
version: '3.8'

services:
  n8n:
    image: n8nio/n8n:latest
    restart: always
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=${N8N_HOST}
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - NODE_ENV=production
      - WEBHOOK_URL=https://${N8N_HOST}/
      # API KEYS
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - NEXT_APP_URL=${NEXT_APP_URL}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - SLACK_BOT_TOKEN=${SLACK_BOT_TOKEN}
    volumes:
      - n8n_data:/home/node/.n8n

volumes:
  n8n_data:
```

### Fichier `.env`
À côté du `docker-compose.yml` :
```env
N8N_HOST=ghostneural.ton-domaine.com
ANTHROPIC_API_KEY=sk-ant-xxx...
NEXT_APP_URL=https://ton-app.vercel.app
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SLACK_BOT_TOKEN=xoxb-...
```

## 4. Workflows Brain v4
Le workflow **Brain Autonome v4 (Retry Loops)** est disponible ici :
👉 [`docs/n8n_brain_v4.json`](file:///Users/nicolasdistefano/Documents/bashghostagency/docs/n8n_brain_v4.json)

## 5. Checklist Finale de Mise en Service
1. **Infrastructure** : N8N installé (VPS ou Local) et accessible.
2. **Import** : Charger le fichier `n8n_brain_v4.json` dans N8N.
3. **Variables** : Vérifier que `NEXT_APP_URL` pointe bien vers ton instance Vercel.
4. **Base de Données** : Appliquer les migrations dans Supabase via `04-orchestrator-v2-columns.sql`.
5. **Déploiement** : Push les dernières modifications du code sur Vercel pour activer les nouvelles routes API (Stratège, Architecte, Copywriter).
6. **Lancement** : Faire un test via le webhook JSON :
   ```json
   {
     "nom": "GhostNeural Test",
     "site_web": "example.com",
     "secteur": "marketing",
     "ville": "Paris"
   }
   ```
