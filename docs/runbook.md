# 🚀 RUNBOOK GHOSTAGENCY V2

Guide pas à pas pour lancer votre première campagne avec le système auto-apprenant.

---

## 📋 PRÉ-REQUIS

✅ Projet déployé sur Vercel  
✅ Variables d'environnement configurées (voir [BIBLE.md](./BIBLE.md))  
✅ Migrations SQL exécutées dans Supabase  
✅ Webhook Resend configuré  
✅ Cron Vercel actif  

---

## 🎯 ÉTAPE 1 : SOURCING DES LEADS

### **Option A : Via War Room (Interface)**
1. Ouvrir `https://ton-domaine.vercel.app`
2. Cliquer sur "Nouvelle Campagne"
3. Remplir :
   - **Ville** : ex. "Lyon"
   - **Secteur** : ex. "restaurant"
   - **Nombre** : ex. 50
4. Cliquer "Lancer Pipeline"

### **Option B : Via API**
```bash
curl -X POST https://ton-domaine.vercel.app/api/orchestrator-v2 \
  -H "Content-Type: application/json" \
  -d '{
    "site_web": "https://www.example-restaurant.fr",
    "nom": "Restaurant Example",
    "secteur": "restaurant",
    "email": "contact@example-restaurant.fr"
  }'
```

---

## ⏱️ ÉTAPE 2 : ATTENDRE LE PIPELINE (~40-60s)

Le pipeline V2 exécute 7 agents séquentiellement :

1. **Éclaireur** (2-3s) : Scan rapide
2. **Qualification** (3-5s) : Filtre 4 piliers
3. **Scan Full** (8-12s) : Analyse complète
4. **Audit Ultra** (5-8s) : Diagnostic premium
5. **Stratège** (4-6s) : Angle d'attaque
6. **Architecte** (6-10s) : Structure site
7. **Copywriter** (8-12s) : Rédaction email (3 variantes)
8. **Critique** (3-5s) : Audit qualité

**Statuts possibles** :
- ✅ `qualified` : Lead prêt à être envoyé
- ❌ `rejected` : Lead rejeté (score trop bas, opt-out, etc.)
- ⚠️ `error_*` : Erreur à une étape (voir `raison_rejet`)

---

## 📧 ÉTAPE 3 : VALIDATION & ENVOI

### **Via War Room**
1. Aller dans "Leads Qualifiés"
2. Cliquer sur un lead pour ouvrir le panneau latéral
3. **Vérifier** :
   - Objet email (personnalisé ?)
   - Corps email (angle pertinent ?)
   - Variante recommandée (A/B/C)
   - Mention opt-out en bas
4. **Personnaliser** si nécessaire
5. Cliquer "Send via Resend"

### **Via API**
```bash
curl -X POST https://ton-domaine.vercel.app/api/resend/send \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": 123,
    "subject": "Votre concurrent vient de refaire son site...",
    "body": "Bonjour [Prénom], j'ai remarqué que..."
  }'
```

**⚠️ IMPORTANT** : Toujours inclure le tag `lead_id` pour le tracking :
```typescript
tags: [{ name: 'lead_id', value: String(leadId) }]
```

---

## 📊 ÉTAPE 4 : TRACKING & ANALYTICS

### **Tracking Automatique**
Les webhooks Resend trackent automatiquement :
- ✅ Email envoyé (`sent_at`)
- ✅ Email ouvert (`opened_at`)
- ✅ Lien cliqué (`clicked_at`)
- ❌ Email bounced (`bounced_at`)
- ❌ Email complained (`complained_at`)

### **Vérifier le Tracking**
1. Aller dans War Room → Lead Details
2. Voir les colonnes :
   - `sent_at` : Date d'envoi
   - `opened_at` : Date d'ouverture
   - `clicked_at` : Date de clic
   - `open_count` : Nombre d'ouvertures

### **Marquer les Réponses Manuellement**
Si un prospect répond par email :
1. Ouvrir le lead dans War Room
2. Cliquer "Marquer comme Répondu"
3. Remplir :
   - `replied_at` : Date de réponse
   - `replied_content` : Contenu de la réponse
   - `reply_positive` : true/false (intéressé ou non)

---

## 🔄 ÉTAPE 5 : FEEDBACK LOOP (Semaine 4+)

### **Automatique**
Chaque **lundi 8h UTC**, le cron tourne automatiquement :
1. Calcule les performances de la semaine précédente
2. Identifie les "winners" par secteur
3. Stocke dans `stats_dashboard`
4. Injection automatique dans les prompts

### **Vérifier le Rapport Winners**
```bash
# Tester manuellement le cron
curl https://ton-domaine.vercel.app/api/cron/feedback-loop \
  -H "Authorization: Bearer TON_CRON_SECRET"
```

**Réponse attendue** :
```json
{
  "success": true,
  "semaine": "2024-W07",
  "leads_analyses": 42,
  "groupes_stats": 8,
  "opt_outs": 2,
  "winners_found": 3,
  "duration_s": 12
}
```

### **Consulter les Winners**
1. Aller dans Supabase → Table Editor → `stats_dashboard`
2. Chercher la clé `winner_report_latest`
3. Voir le JSON avec les winners par secteur

---

## 🎯 ÉTAPE 6 : OPTIMISATION

### **Analyser les Performances**
Après 2-3 semaines, analyser :
- **Taux d'ouverture** : Cible 30-50%
- **Taux de réponse** : Cible 10-20%
- **Taux de conversion** : Cible 50%+ des réponses

### **Actions d'Optimisation**
Si les taux sont bas :
1. **Objet email** : Tester des variantes plus percutantes
2. **Angle d'attaque** : Vérifier que le Stratège choisit le bon angle
3. **Secteur** : Certains secteurs convertissent mieux (restaurant > artisan)
4. **Timing** : Envoyer le mardi-jeudi 10h-14h (meilleur taux d'ouverture)

### **Feedback Loop en Action**
Après 4 semaines, le système s'auto-optimise :
- Les angles qui convertissent sont automatiquement réutilisés
- Les frameworks qui performent sont priorisés
- Les tons qui fonctionnent sont injectés dans les prompts

---

## 🚨 TROUBLESHOOTING

### **Lead rejeté à la qualification**
**Cause** : Score global < 55/100  
**Solution** : Normal, le filtre est strict. Vérifier le `raison` pour comprendre pourquoi.

### **Email non envoyé**
**Cause** : Guard email échoué ou opt-out  
**Solution** : Vérifier `rejection_reason` dans la table `leads`

### **Webhook non reçu**
**Cause** : Signature invalide ou URL incorrecte  
**Solution** : Vérifier `RESEND_WEBHOOK_SECRET` et l'URL du webhook sur Resend Dashboard

### **Cron ne tourne pas**
**Cause** : `vercel.json` mal configuré ou `CRON_SECRET` manquant  
**Solution** : Vérifier la config cron dans Vercel Dashboard → Cron Jobs

---

## 📈 MÉTRIQUES DE SUCCÈS

### **Semaine 1**
- ✅ 50 leads sourcés
- ✅ 20-30 leads qualifiés (40-60%)
- ✅ 15-25 emails envoyés (75%+)

### **Semaine 2-3**
- ✅ Taux d'ouverture : 30-50%
- ✅ Taux de réponse : 5-15% (normal pour les premières semaines)

### **Semaine 4+**
- ✅ Feedback loop actif
- ✅ Taux de réponse : 10-20% (amélioration grâce aux winners)
- ✅ Taux de conversion : 50%+ des réponses

---

## 🎓 PROCHAINES ÉTAPES

1. **Scaler** : Passer de 50 à 500 leads/semaine
2. **Automatiser** : Créer un cron pour sourcer automatiquement les leads
3. **Optimiser** : Analyser les winners et ajuster les prompts manuellement si nécessaire
4. **Intégrer** : Connecter à un CRM (Pipedrive, HubSpot, etc.)

---

**Besoin d'aide ?** Consulter la [BIBLE.md](./BIBLE.md) ou le [Feedback Loop Setup](./feedback-loop-setup.md)