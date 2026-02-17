un système impressionnant mais avec des angles morts critiques
Je viens d'analyser ton document complet sur GhostAgency.ai. Voici ma lecture honnête, en tant qu'ingénieur qui a construit des systèmes similaires.
🟢 Ce qui est excellent
Architecture multi-agent orchestrée
Tu as raison à 100% d'éviter l'agentique émergente. L'orchestration centralisée est la seule approche viable pour un produit industriel. Ça, c'est du très bon sens.
Choix des modèles par spécialité
La matrice agent/modèle est intelligente :
Gemini Flash pour l'extraction → parfait (rapide, pas cher, bon en JSON)
Claude Sonnet pour copy/archi → excellent choix (ton humain, structuration)
GPT-4o mini pour l'audit UX → cohérent (vision + UX)
Architecture technique propre
FastAPI pour les agents → léger, moderne, async-ready
Séparation claire des responsabilités
Guards (légal/qualité) → indispensables
Structure modulaire
🟡 Ce qui mérite réflexion
1. Le scraping déterministe est un mythe
Tu écris :
"Agent Sourcing : Technologie Python + Playwright, LLM : aucun (sauf fallback)"
Problème : Google Maps change ses sélecteurs CSS toutes les 3-6 semaines. Les Pages Jaunes bloquent après 20 requêtes. Le "scraping déterministe" n'existe pas en 2026.
Solution réelle :
Utilise un LLM pour parser le HTML (Gemini Flash avec vision peut lire des screenshots)
Ou paye une API type Outscraper / Bright Data
Ou accepte 15-20% de casse et re-joue les erreurs
2. L'audit "vision" de GPT-4o mini est limité
GPT-4o mini ne peut pas :
Rendre le site dans un vrai browser
Tester l'UX mobile réelle
Détecter les problèmes de performance (LCP, CLS)
Simuler un vrai parcours utilisateur
Ce qu'il manque :
Playwright pour capturer des screenshots à différentes résolutions
Lighthouse pour les métriques Core Web Vitals
Un LLM qui analyse les screenshots + métriques (là oui, GPT-4o mini est bon)
3. Les prompts fournis sont trop vagues
Exemple de ton prompt Audit :
"Simule un utilisateur réel qui essaie de comprendre l'offre"
Problème : ça va générer des réponses génériques type "le site manque de clarté" sans détails actionnables.
Ce qui manque :
Des exemples de bonnes vs mauvaises réponses (few-shot)
Des critères de scoring précis (rubrique)
Une contrainte de longueur par section
4. Délivrabilité email : l'éléphant dans la pièce
Tu écris :
"Agent Email : Python + SMTP, LLM : aucun"
Réalité brutale :
Envoyer depuis no-reply@ghostagency-mail.com → 100% spam si le domaine est neuf
Mailgun sans warm-up → bloqué après 50 emails
Pas de DKIM/SPF/DMARC dans ton doc → emails rejetés
Pas de rotation d'IP → blacklisté en 48h
Ce qui manque VRAIMENT :
Warm-up progressif (5 emails/jour pendant 2 semaines)
Rotation de domaines d'envoi
Lemlist / Smartlead / Instantly en mode API (ils gèrent ça)
Monitoring bounce rate + spam rate en temps réel
🔴 Les angles morts dangereux
1. RGPD : tu es en infraction dès l'email 1
Tu scrapes des données publiques (OK), mais :
Tu n'as pas de base légale pour envoyer un email commercial B2B en France
Tu dois prouver un "intérêt légitime" → très flou juridiquement
Tu dois offrir un opt-out dès le 1er email
Tu dois stocker les refus (pas dans ton archi)
Ce qui manque :
Un lien "Se désabonner" dans chaque email
Une DB des opt-outs avec expiration never
Un legal guard qui vérifie cette DB avant l'envoi
2. Pas de gestion d'erreur LLM
Ton code :
python
raw = call_claude_sonnet(SYSTEM_PROMPT, user_prompt)
data = json.loads(raw) # ← ça va crasher 10% du temps
Problème : les LLM génèrent parfois du Markdown, des pensées avant le JSON, ou du JSON malformé.
Solution :
python
try:
# Extraire JSON du texte (entre ```json ou premier {)
clean = extract_json(raw)
data = json.loads(clean)
except:
# Retry avec prompt + strict
# Ou fallback sur valeurs par défaut
3. Coûts LLM : tu vas saigner
Calcul rapide pour 100 leads :
Audit (GPT-4o mini, ~2000 tokens) : 100 × $0.15 = $15
Proposition (Claude Sonnet, ~3000 tokens) : 100 × $3 = $300
Copy (Claude Sonnet, ~2000 tokens) : 100 × $2 = $200
Total : ~$515 pour 100 leads → si tu vends à 500€/site, tu dois closer 100% pour être rentable.
Optimisations possibles :
Batch les appels (10 leads → 1 appel avec 10 exemples)
Cache les propositions par secteur/ville
Utilise Haiku pour la copy (2x moins cher, 80% aussi bon)
4. Scalabilité : ton archi ne passe pas 1000 leads/jour
Ton orchestrateur est séquentiel :
python
for ld in leads:
# appel 1, attends réponse
# appel 2, attends réponse
# appel 3...
Pour 1000 leads × 6 appels = 6000 requêtes séquentielles → 8-12h de traitement.
Solution :
asyncio + httpx.AsyncClient
Traiter 10-20 leads en parallèle
Queue avec retry (Celery + Redis)
🎯 Verdict final
Ce qui est bon à garder
✅ Architecture multi-agent orchestrée
✅ Choix des modèles par spécialité
✅ Guards légaux/qualité (concept)
✅ Structure FastAPI modulaire
Ce qui doit changer AVANT la prod
🔴 Délivrabilité email : warm-up + rotation + monitoring
🔴 RGPD : opt-out DB + legal guard renforcé
🔴 Gestion erreurs LLM : parsing robuste + retry
🔴 Coûts : batching + cache + modèles moins chers
🔴 Scalabilité : async + queue
Ce qui est manquant (mais faisable après v1)
🟡 Monitoring (Sentry + PostHog)
🟡 Tests (pytest sur chaque agent)
🟡 Audit UX réel (Playwright + Lighthouse)
🟡 War Room (interface validation humaine)
🚀 Mon conseil : MVP en 3 étapes
Étape 1 : Version manuelle (1 semaine)
Sourcing : tu le fais à la main (10 leads)
Enrichissement : à la main
Audit/Archi/Copy : via Claude manuellement
Envoi : via ton Gmail perso
Objectif : valider que les emails convertissent avant d'automatiser.
Étape 2 : Semi-auto (2 semaines)
Sourcing : API Outscraper
Les 3 agents LLM en FastAPI
Envoi : Lemlist API (ils gèrent le warm-up)
Tu valides chaque email avant envoi (War Room = Notion)
Objectif : 50 emails envoyés, 5 réponses positives.
Étape 3 : Full auto (4 semaines)
Orchestrateur async
Guards renforcés
Monitoring
500 emails/semaine
Ce qu’on garde tel quel
Architecture multi‑agents orchestrée → bonne base.
Découpage des rôles (sourcing / enrich / audit / archi / copy / email) → nickel.
Choix des modèles par spécialité → pertinent.
Structure FastAPI + orchestrateur Python → exploitable.
Guards légaux/qualité conceptuels → à renforcer, pas à jeter.
Ça, c’est ton squelette industriel. On ne le casse pas, on le muscle.
2. Ce qu’il faut corriger AVANT de parler “prod”
2.1 Scraping “déterministe” → à relativiser
On ne va pas faire semblant :
Google Maps / Pages Jaunes vont casser ton scraping régulièrement.
Tu as trois options réalistes :
API tierce (Outscraper & co)
Scraping maison + acceptation de la casse (et retry)
LLM pour parser HTML / screenshots (Gemini)
👉 Conclusion :
On garde l’agent Sourcing Python, mais on le pense comme un module interchangeable (scraper maison / API / LLM parser), pas comme un truc “fiable à vie”.
2.2 Audit UX → stack à compléter
Tu as raison : GPT‑4o mini seul ne suffit pas.
Stack réaliste :
Playwright → capture screenshots (desktop + mobile)
Lighthouse CLI → métriques Core Web Vitals
GPT‑4o mini / Claude → analyse des screenshots + métriques
Donc l’Agent Audit doit devenir :
Playwright → screenshots + HTML
Lighthouse → JSON métriques
LLM → interprétation (avec prompt plus strict)
2.3 Prompts → à durcir
Tu as raison :
“Simule un utilisateur réel” → trop mou.
À faire :
few‑shot : 2–3 exemples de bonnes réponses complètes
rubrique : critères explicites (lisibilité, CTA, mobile, confiance…)
contrainte de longueur : X bullet points par section
On peut réécrire les prompts en mode rubrique d’audit, pas “impression générale”.
2.4 Délivrabilité → c’est pas un détail, c’est un produit
Là, on est d’accord :
sans warm‑up + rotation + monitoring, tu es mort.
Donc, réaliste :
V1 : tu ne gères PAS la délivrabilité toi‑même
Tu branches Lemlist / Instantly / Smartlead en API
Eux gèrent : warm‑up, IP, domaines, reputation
V2 : si tu veux internaliser, tu reprends ce qu’on a écrit dans le playbook, mais c’est un produit à part entière.
2.5 RGPD / opt‑out → à rendre concret
Tu as raison :
il faut une DB des opt‑out
il faut un legal guard qui la consulte avant envoi
il faut une phrase d’opt‑out dans chaque email
Concrètement :
Table opt_outs avec email, date, source
Avant chaque envoi :
if email in opt_outs: STOP
Dans chaque email :
“Si vous ne souhaitez plus recevoir d’analyses, dites‑le moi et je vous retire immédiatement.”
2.6 Erreurs LLM → à traiter comme un cas normal
Tu as totalement raison :
json.loads(raw) en direct → ça va casser.
Il faut :
une fonction extract_json(raw) qui :
cherche le premier { et le dernier }
ignore les json / texte autour
un retry avec prompt plus strict si parsing KO
un fallback (log + skip lead) si ça casse encore
2.7 Coûts LLM → à optimiser dès le départ
Ton calcul est juste :
Claude partout, sans batching, sans cache → tu saignes.
Stratégie réaliste :
Audit : GPT‑4o mini (OK)
Architecte : Claude Sonnet (OK)
Copywriter : Claude Haiku ou modèle plus léger
Batching : 5–10 leads par appel quand c’est possible
Cache : par secteur/ville pour certaines parties (ex : structure type)
2.8 Scalabilité → orchestrateur async + queue
Tu as raison :
boucle séquentielle → 1000 leads = journée entière.
À faire :
passer l’orchestrateur en async avec httpx.AsyncClient
traiter N leads en parallèle (10–20)
ajouter une queue (Redis + RQ / Celery) pour :
retry
backoff
résilience
3. Ce que ça veut dire honnêtement
On a une base très solide pour un MVP technique.
On n’a pas encore :
la délivrabilité industrialisée
la gestion RGPD béton
la résilience LLM
l’optimisation coûts
la scalabilité à 1000+ leads/jour
Donc ta phrase est juste :
“Un système impressionnant mais avec des angles morts critiques.”
Je la traduis en version opérationnelle :
“On a une V0 d’architecture. Pour une V1 terrain, il faut ajouter : délivrabilité externalisée, opt‑out DB, parsing LLM robuste, async + queue, prompts durcis.”
4. La suite intelligente
Je te propose un truc très simple, très aligné avec ce que tu as écrit dans la “MVP en 3 étapes” :
On redéfinit ensemble la V1 terrain
10–50 leads
Lemlist/Instantly pour l’envoi
validation humaine systématique
pas de scalabilité, juste de la preuve
On patch le code existant dans ce sens
on remplace l’agent Email Sender SMTP par un “Email Provider API”
on ajoute la DB opt‑out
on ajoute le parsing JSON robuste
on passe l’orchestrateur en async
On garde la scalabilité, la délivrabilité maison, Lighthouse, etc. pour V2/V3.
Synthèse des deux analyses : ma position
OK, j'ai relu l'ensemble. Voici ma lecture finale, sans bullshit, en mode "qu'est-ce qu'on fait maintenant".
1. Ce qu'on a prouvé : l'architecture est solide
Les deux documents convergent :
✅ Architecture multi-agent orchestrée → c'est la bonne approche
✅ Choix des modèles par spécialité → intelligent
✅ Structure FastAPI modulaire → propre et extensible
✅ Guards conceptuels → indispensables (même s'ils doivent être renforcés)
Traduction : tu n'as pas à tout recommencer. Tu as une base exploitable.
2. Ce qu'on a identifié : 4 angles morts critiques
Les deux analyses se rejoignent sur les mêmes points :
🔴 Angle mort #1 : Délivrabilité
Problème : envoyer en direct via SMTP = spam garanti
Solution V1 : externaliser à Lemlist/Instantly/Smartlead (API)
Solution V2 : internaliser plus tard (warm-up, rotation, monitoring)
🔴 Angle mort #2 : RGPD / opt-out
Problème : pas de DB des refus, pas de lien de désabonnement
Solution :
Table opt_outs (email, date)
Legal guard qui consulte cette table avant envoi
Phrase opt-out dans chaque email
🔴 Angle mort #3 : Parsing LLM fragile
Problème : json.loads(raw) va crasher ~10% du temps
Solution :
Fonction extract_json() qui nettoie le texte
Retry avec prompt strict si échec
Fallback (log + skip) si échec persistant
🔴 Angle mort #4 : Scalabilité / Coûts
Problème : orchestrateur séquentiel + Claude partout = lent et cher
Solution V1 :
Async + queue (Redis/Celery)
Haiku pour la copy
Cache par secteur/ville
Solution V2 : batching (10 leads par appel LLM)
3. Ce qu'on fait maintenant : MVP en 3 phases
Je reprends ta proposition, en la rendant exécutable.
🟢 Phase 1 : Validation manuelle (1 semaine)
Objectif : prouver que le message convertit avant d'automatiser.
Ce que tu fais :
Sourcing manuel : 10 leads (restaurants Lyon, tu les trouves à la main)
Enrichissement manuel : tu vas sur leur site, tu notes
Audit/Archi/Copy : tu utilises Claude en mode chat (claude.ai)
Envoi : depuis ton Gmail perso (ou Gmail de GhostAgency)
Ce que tu mesures :
Taux d'ouverture (si tu track avec un pixel)
Taux de réponse (combien répondent ?)
Taux d'intérêt (combien veulent voir l'analyse ?)
Seuil de validation :
Si < 2 réponses positives sur 10 → le message ne fonctionne pas, retour à la planche à dessin
Si ≥ 3 réponses positives sur 10 → GO pour automatiser
Durée réelle : 3-5 jours (pas 7)
🟡 Phase 2 : Semi-auto (2 semaines)
Objectif : automatiser les agents LLM, garder la validation humaine.
Ce que tu codes :
Agent Sourcing :
Option A : API Outscraper (€€€)
Option B : scraper maison + acceptation de 15% de casse
Les 3 agents LLM (Enrichissement, Audit, Archi, Copy) en FastAPI
Parsing JSON robuste : fonction extract_json() avec retry
DB opt-out : table SQLite + legal guard
Envoi : API Lemlist/Instantly (ils gèrent la délivrabilité)
Ce que tu ne codes PAS encore :
Orchestrateur async (tu gardes le for séquentiel)
Batching LLM
Cache
Monitoring avancé
Workflow :
1. Tu lances : python main_orchestrator.py --ville Lyon --secteur restaurant --max 20
2. L'orchestrateur génère 20 emails (stockés en JSON)
3. Tu ouvres Notion / Airtable (War Room)
4. Tu valides manuellement les 20 emails (ou tu les édites)
5. Tu cliques "Envoyer" → appel à l'API Lemlist
Seuil de validation :
50 emails envoyés
≥ 5 réponses positives (10% conversion)
Si tu atteins ça → GO pour scale
Durée réelle : 10-14 jours
🟢 Phase 3 : Full auto (4 semaines)
Objectif : scaler à 500 emails/semaine.
Ce que tu ajoutes :
Orchestrateur async : asyncio + httpx.AsyncClient
Queue : Redis + Celery pour retry/backoff
Optimisation coûts :
Haiku pour la copy (au lieu de Sonnet)
Cache des propositions par secteur/ville
Monitoring :
Sentry pour les erreurs
PostHog pour les events
Dashboard délivrabilité (bounce, spam)
Guards renforcés :
Score qualité minimum (audit > 30)
Score confiance email > 0.7
Blacklist des domaines problématiques
War Room : web app simple (React + FastAPI backend) pour :
Voir les leads en attente
Valider/éditer les emails
Voir les stats
Workflow :
1. Tu lances : python main_orchestrator.py --ville Lyon --secteur restaurant --max 100
2. L'orchestrateur traite 10 leads en parallèle
3. Les emails passent par les guards
4. Ceux qui passent vont dans la War Room
5. Tu valides en batch (ou auto-validation si score > 0.8)
6. Envoi via Lemlist API
Durée réelle : 3-4 semaines
4. Ce que je te propose CONCRÈTEMENT
Je peux t'aider sur 3 axes :
🔧 Axe 1 : Code correctif (Phase 2)
Je te génère :
Fonction extract_json() robuste (avec tests)
DB opt-out SQLite + migration script
Legal guard renforcé (qui consulte la DB)
Agent Email Sender en mode API (Lemlist/Instantly)
Prompts durcis (few-shot + rubrique + contrainte longueur)
🚀 Axe 2 : Orchestrateur async (Phase 3)
Je te génère :
Orchestrateur async avec asyncio
Queue Redis + Celery pour retry
Optimisation coûts (Haiku + cache)
🎨 Axe 3 : War Room (Phase 3)
Je te génère :
Web app React (interface validation emails)
API FastAPI (CRUD leads/emails)
Dashboard stats (taux d'ouverture, réponse, conversion)
5. Ma recommandation : par où commencer ?
Si tu veux être opérationnel en 3 semaines :
✅ Semaine 1 : Validation manuelle (Phase 1)
10 emails envoyés à la main
Objectif : 3+ réponses positives
Pas de code, juste du cerveau et du Gmail
✅ Semaine 2-3 : Semi-auto (Phase 2)
Je te génère le code correctif (Axe 1)
Tu branches Outscraper + Lemlist
Tu envoies 50 emails avec validation humaine
Objectif : 5+ réponses positives
✅ Semaine 4+ : Full auto (Phase 3)
Je te génère l'orchestrateur async (Axe 2)
Tu ajoutes la War Room (Axe 3) si besoin
Tu scales à 100-500 emails/semaine