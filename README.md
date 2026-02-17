# 👻 GHOSTAGENCY.AI - V2 (7 Agents Premium + Feedback Loop)

GhostAgency.ai est un système multi-agents **auto-apprenant** conçu pour automatiser la prospection B2B par l'envoi d'audits UX et de propositions de sites web ultra-personnalisées.

## 🚀 Fonctionnalités Clés V2

### **Pipeline 7 Agents Premium**
- **Phase 0 - Éclaireur** : Scan rapide (meta, h1, design tokens) en 2-3s
- **Phase 1 - Qualification** : Filtre 4 piliers (Business, Transformation, Conversion, Rentabilité)
- **Phase 2 - Scan Full** : Analyse complète (sitemap, body text, Lighthouse)
- **Phase 3 - Audit Ultra** : Diagnostic premium avec benchmarks sectoriels (7 secteurs)
- **Phase 4 - Stratège** : Angle d'attaque psychologique et ton recommandé
- **Phase 5 - Architecte** : Conception structure site & wireframes
- **Phase 6 - Copywriter** : Rédaction copywriting personnalisée (3 variantes A/B/C)
- **Phase 7 - Critique** : Audit qualité hybride (60% déterministe + 40% Gemini)

### **Feedback Loop Auto-Apprenant**
- ✅ Tracking automatique des événements email (ouverture, clic, réponse)
- ✅ Analytics hebdomadaire par secteur/angle/framework
- ✅ Identification des "winners" (meilleurs taux de réponse)
- ✅ **Injection dynamique** dans les prompts Copywriter & Stratège
- ✅ Détection automatique des opt-outs
- ✅ Cache intelligent (1h) pour optimiser les performances

### **Stack Low-Cost**
- **LLMs** : Gemini 1.5 Flash, Claude 3.5 Sonnet/Haiku
- **Framework** : Next.js 14 (App Router)
- **Base de données** : Supabase
- **Email** : Resend API (3k emails/mois gratuits)
- **Cron** : Vercel Cron Jobs (feedback loop hebdomadaire)

### **War Room Premium**
- Interface Next.js avec scores de qualification
- Audits 4 piliers (Présence, Esthétique, UX, Performance)
- Propositions architecturales
- Dashboard analytics temps réel

### **Guards & Compliance**
- Protection RGPD (opt-out automatique)
- Filtrage B2B (rejet emails personnels)
- Contrôle qualité automatique (5 guards)
- Estimation d'impact business (CA perdu, conversions)

## 🛠 Installation Rapide

### 1. Cloner et Installer
```bash
git clone <repo-url>
cd bashghostagency
npm install
```

### 2. Variables d'Environnement
Créer `.env.local` :
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...

# LLMs
GEMINI_API_KEY=...
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...

# Email
RESEND_API_KEY=...
RESEND_WEBHOOK_SECRET=...  # Pour feedback loop

# Cron (feedback loop)
CRON_SECRET=...  # Générer: openssl rand -hex 32
```

### 3. Migrations SQL
Exécuter dans Supabase SQL Editor (dans l'ordre) :
```bash
supabase/migrations/01-feedback-loop.sql
supabase/migrations/02-feedback-winners-table.sql
supabase/migrations/03-prompt-performance-tables.sql
```

### 4. Configurer Resend Webhook
1. Aller sur [resend.com/webhooks](https://resend.com/webhooks)
2. URL : `https://TON-DOMAINE.vercel.app/api/webhooks/resend`
3. Events : `email.sent`, `email.opened`, `email.clicked`, `email.bounced`, `email.complained`
4. Copier le "Signing Secret" → `RESEND_WEBHOOK_SECRET`

### 5. Lancer
```bash
npm run dev
```

## 📖 Documentation

- [**La Bible**](./docs/BIBLE.md) : Référentiel technique et stratégique complet
- [**Feedback Loop Setup**](./docs/feedback-loop-setup.md) : Guide complet du système auto-apprenant
- [**Runbook**](./docs/runbook.md) : Guide pas à pas pour lancer sa première campagne

## 🎯 Architecture

### **Orchestrator V2**
Pipeline séquentiel avec 5 guards :
1. `guardEclaireur` : Vérifie données de scan rapide
2. `guardQualification` : Score global ≥ 55/100
3. `guardAudit` : Données audit complètes
4. `guardCritique` : Qualité email ≥ 60/100
5. `guardEmail` : Format et contenu valides

### **Feedback Loop**
- **Webhook Resend** : `/api/webhooks/resend` (tracking événements)
- **Cron Analytics** : `/api/cron/feedback-loop` (chaque lundi 8h UTC)
- **Prompt Injector** : `lib/feedback/promptInjector.ts` (cache 1h)

### **Tables Supabase**
- `leads` : Prospects et métadonnées email
- `prompt_performance` : Performances hebdomadaires par angle/secteur
- `feedback_winners` : Winners par secteur (deprecated, remplacé par stats_dashboard)
- `opt_outs` : Liste des désabonnements
- `stats_dashboard` : Stockage clé-valeur pour configs dynamiques

## 💰 Coûts Estimés

- **LLMs** : ~2€ pour 1000 leads (Gemini Flash + Claude Haiku)
- **Resend** : Gratuit jusqu'à 3000 emails/mois
- **Supabase** : Free tier (suffisant pour 10k leads/mois)
- **Vercel** : Free tier (cron inclus)
- **Total** : **~2€/1000 leads** (hors infrastructure)

## 🔄 Feedback Loop - Comment ça marche

### Semaine 1-3 : Collecte
- Emails envoyés avec tags `lead_id`
- Webhooks Resend trackent ouvertures/clics
- Données s'accumulent dans `leads`

### Semaine 4+ : Auto-Apprentissage
1. **Lundi 8h UTC** : Cron tourne automatiquement
2. Calcule les performances par secteur/angle/framework
3. Identifie les "winners" (meilleur taux de réponse)
4. Stocke dans `stats_dashboard`
5. **Injection automatique** dans les prompts des prochains emails

### Résultat
Chaque email devient **meilleur que le précédent** car basé sur ce qui a **réellement converti** la semaine d'avant pour ce secteur.

## 🛡 Licence
Propriété exclusive de GhostAgency.

## 🚧 Problèmes Connus

### Gemini API 404
Si vous rencontrez des erreurs 404 avec Gemini :
1. Vérifier que `GEMINI_API_KEY` est valide sur [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Mettre à jour le SDK : `npm update @google/generative-ai`
3. Alternative : Remplacer Gemini par Claude/GPT-4 dans les agents

## 📞 Support
Pour toute question, consulter la [Bible](./docs/BIBLE.md) ou contacter l'équipe GhostAgency.
