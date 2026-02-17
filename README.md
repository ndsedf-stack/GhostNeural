# 👻 GHOSTNEURAL — Brain Autonome v4 (Retry Loops)

GhostNeural est un système multi-agents **auto-géré** conçu pour l'ultra-personnalisation de la prospection B2B. Contrairement aux pipelines linéaires classiques, GhostNeural utilise une orchestration n8n pour créer des boucles de feedback et d'auto-correction entre les agents.

## 🚀 Architecture Brain v4

### **Orchestration n8n (Le Cerveau Central)**
Le pipeline n'est plus un script figé mais un workflow dynamique capable de :
- **Évaluer** chaque étape du processus via le Brain LLM.
- **Auto-Corriger** les erreurs en renvoyant des instructions précises aux agents.
- **Retry Automatique** : Jusqu'à 2 tentatives de correction par agent si le score de qualité n'est pas atteint.

### **Les Agents Spécialisés**
1. **Éclaireur** : Gatekeeper déterministe (Scan technique rapide).
2. **Qualification** : Analyse 4 piliers (Business, Transformation, UX, Rentabilité).
3. **Audit Ultra** : Diagnostic technique profond avec benchmarks sectoriels.
4. **Stratège (v4)** : Création d'angles psychologiques avec correction suite au feedback Brain.
5. **Architecte (v4)** : Structure de site & wireframes synchronisés sur l'angle approuvé.
6. **Copywriter (v4)** : Rédaction A/B/C avec insertion dynamique des métriques d'audit et CA perdu.
7. **Critique Final** : Juge suprême capable de réécrire l'email final pour garantir l'excellence.

## 🛠 Installation & Mise en Service

### 1. Infrastructure Infrastructure
GhostNeural nécessite deux composants :
- **Next.js (Vercel)** : Pour faire tourner les agents et le dashboard.
- **n8n (Hetzner VPS ou Local)** : Pour l'orchestration autonome.

### 2. Variables d'Environnement
Dans ton `.env.local` et tes secrets n8n :
```bash
# LLMs & APIs
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AIzaSy...
NEXT_APP_URL=https://ton-app.vercel.app

# Tracking & Storage
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SLACK_BOT_TOKEN=xoxb-... (Optionnel)
```

### 3. Workflow n8n
Le workflow complet est disponible dans [`docs/n8n_brain_v4.json`](./docs/n8n_brain_v4.json).
Importe-le dans ton instance n8n pour activer le pipeline.

## 📊 War Room Premium
L'interface Next.js te permet de :
- Surveiller les leads qualifiés en temps réel.
- Consulter les audits détaillés et les propositions architecturales.
- Voir le raisonnement du **Brain** et le nombre de **Retries** utilisés pour chaque email.
- Valider et envoyer les emails via Lemlist/Resend.

## 🎯 Coûts & Performance
- **Coût** : ~0.005€ / prospect (Gemini 1.5 Flash + Claude 3.5 Haiku).
- **Fiabilité** : Tolérance aux pannes via les retry loops n8n.
- **Conversion** : Ultra-personnalisation basée sur les "pain points" réels détectés par l'audit.

## 🛡 Licence
Propriété exclusive de GhostAgency (Nicolas Distefano).
