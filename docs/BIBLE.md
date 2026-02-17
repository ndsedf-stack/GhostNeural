# 📖 LA BIBLE GHOSTAGENCY.AI V2

Ce document est le référentiel unique de GhostAgency.ai V2. Il contient la vision stratégique, l'architecture technique et les procédures opérationnelles.

---

## 🎯 1. VISION STRATÉGIQUE

L'objectif est d'automatiser à 95% la prospection pour la création de sites web haute conversion pour les TPE/PME, avec un **système auto-apprenant** qui s'améliore automatiquement chaque semaine.

Le système utilise un "Cheval de Troie" : l'envoi d'un micro-audit gratuit et personnalisé pour engager la conversation.

### **Différenciation V2**
- **Feedback Loop** : Le système apprend de ses succès et injecte automatiquement les patterns gagnants dans les prompts
- **7 Agents Premium** : Pipeline optimisé avec Éclaireur, Qualification, Scan Full, Audit Ultra, Stratège, Architecte, Copywriter, Critique
- **5 Guards** : Protection qualité à chaque étape critique
- **Tracking Complet** : Webhooks Resend + Analytics hebdomadaire

---

## 🛠 2. ARCHITECTURE TECHNIQUE

### **Stack "Dev-First"**
- **Framework** : Next.js 14 (App Router)
- **Base de données** : Supabase (PostgreSQL)
- **Orchestration** : Pipeline Séquentiel avec Guards (Orchestrator V2)
- **Délivrabilité** : Resend API (SDK principal)
- **Cron** : Vercel Cron Jobs (feedback loop hebdomadaire)

### **Matrice des Agents & Modèles**

| Phase | Agent | Modèle | Rôle | Durée |
|:---:|:---|:---|:---|:---:|
| **0** | **Éclaireur** | Gemini Flash | Scan rapide (meta, h1, design tokens) | 2-3s |
| **1** | **Qualification** | Gemini Flash | Filtre 4 piliers (Business, Transformation, Conversion, Rentabilité) | 3-5s |
| **2** | **Scan Full** | - | Analyse complète (sitemap, body text, Lighthouse) | 8-12s |
| **3** | **Audit Ultra** | Gemini Flash | Diagnostic premium avec benchmarks sectoriels | 5-8s |
| **4** | **Stratège** | Claude 3.5 Sonnet | Angle d'attaque psychologique + ton recommandé | 4-6s |
| **5** | **Architecte** | Claude 3.5 Sonnet | Conception structure site & wireframes | 6-10s |
| **6** | **Copywriter** | Claude 3 Haiku | Rédaction copywriting (3 variantes A/B/C) | 8-12s |
| **7** | **Critique** | Gemini Flash | Audit qualité hybride (60% déterministe + 40% LLM) | 3-5s |

**Durée totale pipeline** : ~40-60s par lead

---

## 🛡 3. GARDE-FOUS (GUARDS)

### **5 Guards Orchestrator V2**

1. **guardEclaireur** : Vérifie que le scan rapide a retourné des données valides (h1, meta_title)
2. **guardQualification** : Score global ≥ 55/100 pour continuer
3. **guardAudit** : Vérifie que l'audit contient `score_global` et `analyse_piliers`
4. **guardCritique** : Qualité email ≥ 60/100
5. **guardEmail** : Format email valide et contenu non vide

### **Legal Guard (Compliance)**
- **B2B Filter** : Rejet des emails personnels (Gmail, Outlook, etc.)
- **Format Check** : Validation par Regex du format email
- **Opt-out DB** : Vérification systématique de la table `opt_outs`
- **RGPD** : Mention opt-out automatique en bas de chaque email

### **Quality Guard (Qualité)**
- Score technique minimum : 20/100
- Score qualité Critique minimum : 60/100
- Rejet si données manquantes (h1, meta_title, etc.)

---

## 🎯 4. AGENT AUDIT ULTRA - VERSION PREMIUM

### **Benchmarks Sectoriels Embarqués**

L'Agent Audit Ultra intègre des référentiels pour **7 secteurs** :

| Secteur | LCP Target | Perf Target | CTA Attendu | Pages Typiques |
|:---|:---:|:---:|:---|:---:|
| **Restaurant** | < 2.0s | > 75 | Réserver / Voir le menu | 5 |
| **Avocat** | < 2.5s | > 70 | Consultation gratuite / RDV | 6 |
| **Coiffeur** | < 2.0s | > 72 | Prendre RDV en ligne | 4 |
| **Artisan** | < 2.5s | > 65 | Devis gratuit / Appeler | 5 |
| **Médecin** | < 2.0s | > 75 | Prendre RDV / Doctolib | 4 |
| **Immobilier** | < 2.5s | > 70 | Estimer mon bien / Voir biens | 6 |
| **Default** | < 2.5s | > 70 | Contact / Devis / RDV | 5 |

### **Few-Shot Examples**
L'agent est calibré avec **2 exemples détaillés** (Restaurant score 28, Cabinet d'avocats score 45) pour garantir :
- Observations de 3-5 phrases minimum
- Preuves tirées des données
- Comparaison avec le standard du secteur
- Impact business chiffré (CA perdu, conversions, visiteurs)

### **Prompt Premium**
- **Longueur** : 400+ lignes (vs 60 avant)
- **System Instruction** : Rôle expert (12 ans d'expérience, +800 sites audités)
- **Règles absolues** : Jamais d'observation vague, toujours chiffrer l'impact, toujours comparer au secteur
- **Méthodologie** : Score pondéré (Présence 25% + Esthétique 20% + UX 30% + Performance 25%)

### **Estimation d'Impact Business**
Chaque audit inclut désormais :
- **Visiteurs perdus/mois** : Estimation basée sur SEO et performance
- **CA non capté** : Fourchette en €/mois selon le secteur
- **Taux de conversion actuel** : Estimé selon CTAs et structure
- **Taux de conversion potentiel** : Atteignable après refonte

---

## 🔄 5. FEEDBACK LOOP AUTO-APPRENANT

### **Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│  SEMAINE 1-3 : COLLECTE DE DONNÉES                          │
├─────────────────────────────────────────────────────────────┤
│  1. Email envoyé avec tag lead_id                           │
│  2. Webhook Resend track ouverture/clic                     │
│  3. Données stockées dans leads                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  SEMAINE 4+ : AUTO-APPRENTISSAGE                            │
├─────────────────────────────────────────────────────────────┤
│  1. Cron tourne chaque lundi 8h UTC                         │
│  2. Calcule performances par secteur/angle/framework        │
│  3. Identifie winners (meilleur taux de réponse)            │
│  4. Stocke dans stats_dashboard                             │
│  5. Injection automatique dans prompts                      │
└─────────────────────────────────────────────────────────────┘
```

### **Tables Feedback Loop**

1. **`prompt_performance`** : Performances hebdomadaires
   - Colonnes : `semaine`, `secteur`, `angle`, `framework`, `ton`, `nb_envoyes`, `nb_ouverts`, `nb_repondus`, `taux_ouverture`, `taux_reponse`, `exemples_gagnants`

2. **`opt_outs`** : Liste des désabonnements
   - Colonnes : `email`, `reason`, `source`, `opted_out_at`

3. **`stats_dashboard`** : Stockage clé-valeur
   - Clé importante : `winner_report_latest` (rapport des winners)

### **Endpoints**

- **`/api/webhooks/resend`** : Webhook Resend (tracking événements)
- **`/api/cron/feedback-loop`** : Cron analytics hebdomadaire
- **`lib/feedback/promptInjector.ts`** : Injection dynamique avec cache 1h

### **Fonctionnalités**

✅ Tracking automatique des événements email  
✅ Analytics hebdomadaire par secteur/angle/framework  
✅ Identification des "winners" (minimum 5 envois)  
✅ Injection dynamique dans Copywriter & Stratège  
✅ Détection automatique des opt-outs  
✅ Cache intelligent (1h) pour optimiser les performances  
✅ Dashboard stats pour War Room  

---

## 📈 6. PROCÉDURES OPÉRATIONNELLES (SOP)

### **Phase 1 : Sourcing & Pipeline**
Lancement via l'interface War Room ou via API :
```bash
POST /api/orchestrator-v2 { "ville": "Lyon", "secteur": "restaurant" }
```

### **Phase 2 : Validation (War Room)**
1. **Email Editor** : Clique sur un lead pour ouvrir le panneau latéral
2. **Personnalisation** : Modifie l'objet ou le corps de l'email (objectif : appel 10 min)
3. **Opt-out Line** : Vérifie la présence de la mention légale en bas d'email
4. **Variantes A/B/C** : Choisis la variante recommandée par le Critique

### **Phase 3 : Envoi via Resend**
- **Manuel** : Bouton "Send via Resend" depuis le panneau latéral
- **Auto** : Automatisation possible via `/api/resend/send`
- **Tags** : Toujours inclure `{ name: 'lead_id', value: String(leadId) }`

### **Phase 4 : Tracking & Analytics**
- **Webhooks** : Resend envoie automatiquement les événements (ouverture, clic, etc.)
- **Cron** : Chaque lundi 8h UTC, le système identifie les winners
- **Injection** : Les patterns gagnants sont automatiquement injectés dans les prompts

---

## 💸 7. OPTIMISATION DES COÛTS

### **Coût par Lead**
- **Éclaireur** : ~$0.0001 (Gemini Flash)
- **Qualification** : ~$0.0002 (Gemini Flash)
- **Scan Full** : $0 (pas de LLM)
- **Audit Ultra** : ~$0.0005 (Gemini Flash)
- **Stratège** : ~$0.001 (Claude Sonnet)
- **Architecte** : ~$0.001 (Claude Sonnet)
- **Copywriter** : ~$0.0003 (Claude Haiku)
- **Critique** : ~$0.0002 (Gemini Flash)

**Total** : **~$0.0035/lead** (3.5€ pour 1000 leads)

### **Coût Infrastructure**
- **Resend** : Gratuit jusqu'à 3000 emails/mois
- **Supabase** : Free tier (suffisant pour 10k leads/mois)
- **Vercel** : Free tier (cron inclus)
- **Feedback Loop** : $0/mois

**Total** : **~2-4€/1000 leads** (hors infrastructure)

---

## 🚀 8. DÉPLOIEMENT

### **Variables d'Environnement Requises**
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
RESEND_WEBHOOK_SECRET=...

# Cron
CRON_SECRET=...
```

### **Migrations SQL**
Exécuter dans l'ordre :
1. `01-feedback-loop.sql`
2. `02-feedback-winners-table.sql`
3. `03-prompt-performance-tables.sql`

### **Configuration Resend Webhook**
1. URL : `https://TON-DOMAINE.vercel.app/api/webhooks/resend`
2. Events : `email.sent`, `email.opened`, `email.clicked`, `email.bounced`, `email.complained`
3. Copier le "Signing Secret" → `RESEND_WEBHOOK_SECRET`

---

## 🎯 9. MÉTRIQUES DE SUCCÈS

### **KPIs Pipeline**
- **Taux de qualification** : % de leads qui passent le guard qualification (cible : 40-60%)
- **Taux d'envoi** : % de leads qualifiés qui reçoivent un email (cible : 90%+)
- **Durée moyenne** : Temps total du pipeline (cible : < 60s)

### **KPIs Email**
- **Taux d'ouverture** : % d'emails ouverts (cible : 30-50%)
- **Taux de réponse** : % de réponses reçues (cible : 10-20%)
- **Taux de conversion** : % de réponses positives (cible : 50%+)

### **KPIs Feedback Loop**
- **Winners identifiés** : Nombre de secteurs avec winners (cible : 5+ après 4 semaines)
- **Amélioration taux de réponse** : Évolution semaine après semaine (cible : +2-5%/semaine)

---

## 🛡 10. PROBLÈMES CONNUS & SOLUTIONS

### **Gemini API 404**
**Symptôme** : Tous les modèles Gemini retournent 404  
**Cause** : Clé API invalide ou modèle inexistant  
**Solution** :
1. Vérifier `GEMINI_API_KEY` sur [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Mettre à jour le SDK : `npm update @google/generative-ai`
3. Alternative : Remplacer Gemini par Claude/GPT-4

### **Webhook Resend non reçu**
**Symptôme** : Pas de tracking d'ouverture/clic  
**Cause** : Webhook mal configuré ou signature invalide  
**Solution** :
1. Vérifier l'URL du webhook sur Resend Dashboard
2. Vérifier `RESEND_WEBHOOK_SECRET` dans `.env.local`
3. Tester manuellement : `curl -X POST https://ton-domaine.vercel.app/api/webhooks/resend`

### **Cron ne tourne pas**
**Symptôme** : Pas de rapport winners généré  
**Cause** : `vercel.json` mal configuré ou `CRON_SECRET` manquant  
**Solution** :
1. Vérifier `vercel.json` contient la config cron
2. Vérifier `CRON_SECRET` dans Vercel Environment Variables
3. Tester manuellement : `curl https://ton-domaine.vercel.app/api/cron/feedback-loop -H "Authorization: Bearer TON_CRON_SECRET"`

---

## 📚 11. RESSOURCES

- **Documentation Resend** : [resend.com/docs](https://resend.com/docs)
- **Documentation Supabase** : [supabase.com/docs](https://supabase.com/docs)
- **Documentation Vercel Cron** : [vercel.com/docs/cron-jobs](https://vercel.com/docs/cron-jobs)
- **Google AI Studio** : [makersuite.google.com](https://makersuite.google.com)

---

## 🔐 12. SÉCURITÉ

### **Secrets à ne JAMAIS commit**
- `GEMINI_API_KEY`
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `RESEND_API_KEY`
- `RESEND_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`

### **Protection RGPD**
- Opt-out automatique en bas de chaque email
- Table `opt_outs` vérifiée avant chaque envoi
- Détection automatique des réponses "stop"
- Suppression des données sur demande

---

**Dernière mise à jour** : 2024-02-17  
**Version** : 2.0  
**Auteur** : GhostAgency Team
