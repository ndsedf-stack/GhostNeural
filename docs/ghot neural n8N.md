<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>GhostNeural — Architecture N8N</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');

:root {
  --bg: #080808;
  --surface: #111;
  --surface2: #161616;
  --border: #1e1e1e;
  --red: #ff3030;
  --orange: #ff8c00;
  --yellow: #ffc800;
  --green: #00e87a;
  --blue: #00aaff;
  --purple: #a855f7;
  --text: #e0e0e0;
  --muted: #555;
  --connector: #2a2a2a;
}

* { margin:0; padding:0; box-sizing:border-box; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  min-height: 100vh;
  overflow-x: hidden;
}

/* ── HEADER ── */
header {
  padding: 40px 48px 28px;
  border-bottom: 1px solid var(--border);
  position: relative;
}
header::after {
  content:'';
  position:absolute; bottom:0; left:0; right:0; height:1px;
  background: linear-gradient(90deg, var(--red), var(--orange), var(--yellow), var(--green));
}
.header-top { display:flex; align-items:flex-start; justify-content:space-between; }
.header-label { font-size:10px; letter-spacing:4px; color:var(--muted); margin-bottom:10px; }
h1 { font-family:'Syne',sans-serif; font-size:32px; font-weight:800; color:#fff; letter-spacing:-1px; line-height:1; }
h1 span { color:var(--red); }
.header-meta { display:flex; gap:32px; margin-top:14px; }
.meta-item { font-size:10px; color:var(--muted); }
.meta-item strong { color:var(--text); display:block; font-size:13px; font-family:'Syne',sans-serif; }

.legend { display:flex; gap:16px; flex-wrap:wrap; }
.legend-item { display:flex; align-items:center; gap:6px; font-size:10px; color:var(--muted); }
.legend-dot { width:8px; height:8px; border-radius:50%; }

/* ── MAIN CANVAS ── */
.canvas {
  padding: 48px;
  display: flex;
  flex-direction: column;
  gap: 0;
  max-width: 1200px;
  margin: 0 auto;
}

/* ── PIPELINE FLOW ── */
.flow { display:flex; flex-direction:column; align-items:center; gap:0; width:100%; }

/* ── CONNECTOR ── */
.connector {
  width: 2px;
  height: 28px;
  background: linear-gradient(180deg, var(--border), var(--connector));
  position: relative;
  flex-shrink: 0;
}
.connector.branching {
  height: 40px;
}
.connector::after {
  content:'';
  position:absolute;
  bottom:-4px; left:50%;
  transform: translateX(-50%);
  width:0; height:0;
  border-left:4px solid transparent;
  border-right:4px solid transparent;
  border-top:5px solid var(--connector);
}

/* ── NODE ── */
.node {
  width: 100%;
  max-width: 720px;
  border: 1px solid var(--border);
  background: var(--surface);
  cursor: pointer;
  transition: border-color 0.2s, transform 0.15s;
  position: relative;
  overflow: hidden;
}
.node:hover { border-color: #333; transform: translateX(2px); }
.node.active { border-color: var(--node-color, var(--blue)); }
.node::before {
  content:'';
  position:absolute; left:0; top:0; bottom:0;
  width:3px;
  background: var(--node-color, var(--blue));
}

.node-header {
  display:grid;
  grid-template-columns: 40px 1fr auto;
  align-items:center;
  gap:16px;
  padding: 14px 16px 14px 20px;
}
.node-icon {
  width:36px; height:36px;
  border-radius:6px;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--border);
  display:flex; align-items:center; justify-content:center;
  font-size:16px;
  flex-shrink:0;
}
.node-info {}
.node-phase { font-size:9px; letter-spacing:3px; color:var(--muted); text-transform:uppercase; }
.node-name { font-family:'Syne',sans-serif; font-weight:700; font-size:15px; color:#fff; margin-top:2px; }
.node-model { font-size:10px; color:var(--muted); margin-top:1px; }

.node-meta { display:flex; flex-direction:column; align-items:flex-end; gap:4px; }
.node-cost {
  font-size:11px; font-weight:500;
  padding:2px 8px;
  border:1px solid var(--border);
  color: var(--node-color, var(--blue));
}
.node-time { font-size:9px; color:var(--muted); }

.node-body {
  border-top:1px solid var(--border);
  padding: 14px 20px;
  display: none;
  background: var(--surface2);
}
.node.active .node-body { display: block; }

.node-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
.node-grid.triple { grid-template-columns:1fr 1fr 1fr; }

.data-block .label {
  font-size:9px; letter-spacing:2px; color:var(--muted);
  text-transform:uppercase; margin-bottom:6px;
}
.data-block .items { display:flex; flex-direction:column; gap:3px; }
.data-block .item {
  font-size:11px; color:var(--text);
  display:flex; gap:6px; align-items:flex-start;
}
.data-block .item::before { content:'·'; color:var(--muted); flex-shrink:0; }
.data-block .item.good::before { content:'✓'; color:var(--green); }
.data-block .item.bad::before { content:'✗'; color:var(--red); }
.data-block .item.warn::before { content:'⚡'; color:var(--yellow); }

.guard-box {
  margin-top:12px;
  padding:10px 12px;
  border:1px solid rgba(255,200,0,0.2);
  background: rgba(255,200,0,0.04);
  font-size:11px;
  color:var(--yellow);
  display:flex; gap:8px; align-items:flex-start;
}
.guard-box::before { content:'🛡'; flex-shrink:0; }

/* ── BRANCH NODE ── */
.branch-container {
  width:100%; max-width:720px;
  display:flex; gap:16px;
  position: relative;
}
.branch-container::before {
  content:'';
  position:absolute; top:-1px; left:50%;
  transform: translateX(-50%);
  width:calc(100% - 32px); height:1px;
  background: var(--border);
}
.branch {
  flex:1;
  border:1px solid var(--border);
  background: var(--surface);
  padding:14px 16px;
  position:relative;
}
.branch::before {
  content:'';
  position:absolute; left:0; top:0; bottom:0; width:3px;
}
.branch.go::before { background: var(--green); }
.branch.nogo::before { background: var(--red); }
.branch .branch-label {
  font-size:9px; letter-spacing:3px; text-transform:uppercase;
  margin-bottom:8px;
}
.branch.go .branch-label { color:var(--green); }
.branch.nogo .branch-label { color:var(--red); }
.branch .branch-items { display:flex; flex-direction:column; gap:3px; }
.branch .branch-item { font-size:11px; color:var(--muted); }

/* ── FEEDBACK LOOP ── */
.feedback-section {
  width:100%; max-width:720px;
  margin-top:8px;
}
.feedback-box {
  border:1px solid rgba(168,85,247,0.3);
  background: rgba(168,85,247,0.05);
  padding:16px 20px;
  position:relative;
}
.feedback-box::before {
  content:'';
  position:absolute; left:0; top:0; bottom:0; width:3px;
  background: var(--purple);
}
.feedback-title {
  font-family:'Syne',sans-serif;
  font-size:13px; font-weight:700; color:var(--purple);
  margin-bottom:10px;
  display:flex; gap:8px; align-items:center;
}
.feedback-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; }
.feedback-item .label { font-size:9px; letter-spacing:2px; color:var(--muted); margin-bottom:4px; }
.feedback-item .value { font-size:11px; color:var(--text); }

/* ── COST SUMMARY ── */
.cost-summary {
  width:100%; max-width:720px;
  border:1px solid var(--border);
  background: var(--surface);
  padding:20px 24px;
  margin-top:8px;
}
.cost-title { font-family:'Syne',sans-serif; font-size:13px; font-weight:700; color:#fff; margin-bottom:14px; }
.cost-table { width:100%; border-collapse:collapse; }
.cost-table td { padding:5px 0; font-size:11px; border-bottom:1px solid var(--border); }
.cost-table td:last-child { text-align:right; color:var(--green); }
.cost-table tr:last-child td { border-bottom:none; font-weight:600; color:#fff; font-family:'Syne',sans-serif; }
.cost-table td:first-child { color:var(--muted); }

/* ── SECTION TITLE ── */
.section-divider {
  width:100%; max-width:720px;
  display:flex; align-items:center; gap:12px;
  margin: 32px 0 8px;
}
.section-divider span {
  font-size:9px; letter-spacing:4px; text-transform:uppercase; color:var(--muted);
  white-space:nowrap;
}
.section-divider::before, .section-divider::after {
  content:''; flex:1; height:1px; background:var(--border);
}

/* ── N8N NODES ── */
.n8n-note {
  width:100%; max-width:720px;
  border:1px solid rgba(0,170,255,0.2);
  background: rgba(0,170,255,0.04);
  padding:12px 16px;
  font-size:11px; color:var(--blue);
  display:flex; gap:10px; align-items:flex-start;
  margin-bottom:4px;
}
.n8n-note::before { content:'N8N'; font-weight:700; flex-shrink:0; font-family:'Syne',sans-serif; }

/* ── FOOTER ── */
footer {
  border-top:1px solid var(--border);
  padding:24px 48px;
  display:flex; justify-content:space-between;
  font-size:10px; color:var(--muted);
}
</style>
</head>
<body>

<header>
  <div class="header-top">
    <div>
      <div class="header-label">Architecture Système · GhostNeural · N8N Pipeline</div>
      <h1>Pipeline <span>N8N</span><br>GhostNeural</h1>
      <div class="header-meta">
        <div class="meta-item"><strong>8 agents</strong>nœuds N8N</div>
        <div class="meta-item"><strong>~$0.007</strong>par prospect</div>
        <div class="meta-item"><strong>~45s</strong>durée pipeline</div>
        <div class="meta-item"><strong>Self-hosted</strong>VPS 10€/mois</div>
      </div>
    </div>
    <div class="legend">
      <div class="legend-item"><div class="legend-dot" style="background:var(--blue)"></div>Gemini Flash</div>
      <div class="legend-item"><div class="legend-dot" style="background:var(--orange)"></div>Claude Haiku</div>
      <div class="legend-item"><div class="legend-dot" style="background:var(--green)"></div>Logique pure</div>
      <div class="legend-item"><div class="legend-dot" style="background:var(--red)"></div>Guard / Rejet</div>
      <div class="legend-item"><div class="legend-dot" style="background:var(--purple)"></div>Feedback Loop</div>
    </div>
  </div>
</header>

<div class="canvas">
<div class="flow">

  <!-- TRIGGER -->
  <div class="section-divider"><span>Entrée du Pipeline</span></div>

  <div class="n8n-note">
    Nœud Trigger N8N — Webhook POST depuis War Room / Google Sheets / Airtable / Manuel. Reçoit : nom, site_web, secteur, ville, email (optionnel).
  </div>

  <div class="connector"></div>

  <!-- PHASE 0 : ECLAIREUR -->
  <div class="node" style="--node-color: var(--green)" onclick="toggle(this)">
    <div class="node-header">
      <div class="node-icon">🔦</div>
      <div class="node-info">
        <div class="node-phase">Phase 0</div>
        <div class="node-name">L'Éclaireur</div>
        <div class="node-model">N8N : HTTP Request → Code Node → IF Node</div>
      </div>
      <div class="node-meta">
        <div class="node-cost" style="--node-color:var(--green)">~$0.00001</div>
        <div class="node-time">~3 secondes</div>
      </div>
    </div>
    <div class="node-body">
      <div class="node-grid">
        <div class="data-block">
          <div class="label">N8N — Nœuds utilisés</div>
          <div class="items">
            <div class="item warn">HTTP Request → scanQuick (ton API Next.js)</div>
            <div class="item warn">Code Node → 5 règles déterministes (zéro LLM)</div>
            <div class="item warn">Gemini Flash Node → zone grise score 20–70 seulement</div>
            <div class="item warn">IF Node → go === true ? → suite | → Stop + log Supabase</div>
          </div>
        </div>
        <div class="data-block">
          <div class="label">Rejets automatiques (Code Node)</div>
          <div class="items">
            <div class="item bad">HTTP status >= 400</div>
            <div class="item bad">TTFB > 8000ms</div>
            <div class="item bad">Title absent ou < 3 chars</div>
            <div class="item bad">Grandes marques (Facebook, Apple...)</div>
            <div class="item bad">Agences web déjà premium</div>
          </div>
        </div>
      </div>
      <div class="guard-box">
        Guard : go === true AND score_eclaireur >= 35 — sinon Set Node "rejected_eclaireur" → Supabase Insert → Stop Workflow
      </div>
    </div>
  </div>

  <div class="connector"></div>

  <!-- PHASE 1 : QUALIFICATION -->
  <div class="node" style="--node-color: var(--blue)" onclick="toggle(this)">
    <div class="node-header">
      <div class="node-icon">🎯</div>
      <div class="node-info">
        <div class="node-phase">Phase 1</div>
        <div class="node-name">Qualification</div>
        <div class="node-model">Gemini 1.5 Flash — scoring 4 piliers</div>
      </div>
      <div class="node-meta">
        <div class="node-cost">~$0.0003</div>
        <div class="node-time">~4 secondes</div>
      </div>
    </div>
    <div class="node-body">
      <div class="node-grid">
        <div class="data-block">
          <div class="label">Input (depuis Éclaireur)</div>
          <div class="items">
            <div class="item good">url, nom, secteur, ville</div>
            <div class="item good">quickData.title, h1, meta_desc, ttfb</div>
            <div class="item good">eclaireurResult.score + green/red_flags</div>
          </div>
        </div>
        <div class="data-block">
          <div class="label">Output → Scan Full</div>
          <div class="items">
            <div class="item good">scores {business, transformation, conversion, rentabilite}</div>
            <div class="item good">score_global /100</div>
            <div class="item good">priorite : haute / moyenne / basse</div>
            <div class="item good">angle_rapide (5 mots → Stratège)</div>
            <div class="item good">budget_estime (→ Copywriter)</div>
          </div>
        </div>
      </div>
      <div class="guard-box">
        Guard : prospect_interessant === true AND score_global >= 50 AND transformation >= 8 — critère éliminatoire inviolable
      </div>
    </div>
  </div>

  <div class="connector"></div>

  <!-- PHASE 2 : SCAN + LIGHTHOUSE -->
  <div class="node" style="--node-color: var(--green)" onclick="toggle(this)">
    <div class="node-header">
      <div class="node-icon">🕷️</div>
      <div class="node-info">
        <div class="node-phase">Phase 2</div>
        <div class="node-name">Scan Full + Lighthouse</div>
        <div class="node-model">N8N : HTTP Request → ton API Playwright/Lighthouse</div>
      </div>
      <div class="node-meta">
        <div class="node-cost" style="--node-color:var(--green)">~$0.002</div>
        <div class="node-time">~20 secondes</div>
      </div>
    </div>
    <div class="node-body">
      <div class="node-grid">
        <div class="data-block">
          <div class="label">N8N — Nœuds utilisés</div>
          <div class="items">
            <div class="item warn">HTTP Request POST → /api/scanner (Playwright)</div>
            <div class="item warn">HTTP Request POST → /api/lighthouse</div>
            <div class="item warn">Merge Node → fusionne les 2 résultats</div>
            <div class="item warn">Wait Node → timeout 30s max</div>
          </div>
        </div>
        <div class="data-block">
          <div class="label">Output enrichi</div>
          <div class="items">
            <div class="item good">design_tokens (polices, couleurs)</div>
            <div class="item good">body_text (1200 chars)</div>
            <div class="item good">inner_links, cta_count, image_count, form_count</div>
            <div class="item good">screenshot desktop + mobile (base64)</div>
            <div class="item good">LCP, CLS, TTFB, performance_score, total_byte_weight</div>
          </div>
        </div>
      </div>
      <div class="guard-box">
        Guard : Error Node N8N → si timeout ou erreur → Set "error_scan" → Supabase log → Stop (pas de retry coûteux)
      </div>
    </div>
  </div>

  <div class="connector"></div>

  <!-- PHASE 3 : AUDIT -->
  <div class="node" style="--node-color: var(--blue)" onclick="toggle(this)">
    <div class="node-header">
      <div class="node-icon">🔬</div>
      <div class="node-info">
        <div class="node-phase">Phase 3</div>
        <div class="node-name">Audit Ultra</div>
        <div class="node-model">Gemini 1.5 Flash — benchmarks sectoriels + few-shot</div>
      </div>
      <div class="node-meta">
        <div class="node-cost">~$0.0005</div>
        <div class="node-time">~6 secondes</div>
      </div>
    </div>
    <div class="node-body">
      <div class="node-grid triple">
        <div class="data-block">
          <div class="label">Input clé</div>
          <div class="items">
            <div class="item good">scannedData complet</div>
            <div class="item good">lighthouseData</div>
            <div class="item good">secteur (→ benchmark)</div>
          </div>
        </div>
        <div class="data-block">
          <div class="label">Output → Stratège</div>
          <div class="items">
            <div class="item good">analyse_piliers {4 scores + observations}</div>
            <div class="item good">estimation_impact (CA perdu/mois)</div>
            <div class="item good">verdict_strategique</div>
          </div>
        </div>
        <div class="data-block">
          <div class="label">Output → UI</div>
          <div class="items">
            <div class="item good">core_web_vitals</div>
            <div class="item good">sitemap_cible (5 pages)</div>
            <div class="item good">screenshots</div>
          </div>
        </div>
      </div>
      <div class="guard-box">
        Guard : !result.error AND score_global présent AND analyse_piliers présent — N8N : IF Node + Error Handler natif avec retry x2
      </div>
    </div>
  </div>

  <div class="connector"></div>

  <!-- PHASES 4+5 EN PARALLELE -->
  <div class="n8n-note">
    ⚡ N8N Parallel Execution — Stratège + Architecte tournent en simultané (Split In Batches + Merge Node). Gain : ~5 secondes.
  </div>

  <div class="connector"></div>

  <div class="branch-container">
    <!-- STRATEGE -->
    <div class="node" style="--node-color: var(--orange); flex:1; max-width:none;" onclick="toggle(this)">
      <div class="node-header">
        <div class="node-icon">🧠</div>
        <div class="node-info">
          <div class="node-phase">Phase 4 — Parallèle</div>
          <div class="node-name">Le Stratège</div>
          <div class="node-model">Claude 3 Haiku</div>
        </div>
        <div class="node-meta">
          <div class="node-cost" style="--node-color:var(--orange)">~$0.0008</div>
          <div class="node-time">~5s</div>
        </div>
      </div>
      <div class="node-body">
        <div class="data-block">
          <div class="label">Output clé</div>
          <div class="items">
            <div class="item good">angle_approche (spécifique audit)</div>
            <div class="item good">buyer_persona + objection + réponse</div>
            <div class="item good">timing_ideal + preuve_sociale</div>
            <div class="item good">ton_recommande → Copywriter</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ARCHITECTE -->
    <div class="node" style="--node-color: var(--orange); flex:1; max-width:none;" onclick="toggle(this)">
      <div class="node-header">
        <div class="node-icon">🏗️</div>
        <div class="node-info">
          <div class="node-phase">Phase 5 — Parallèle</div>
          <div class="node-name">L'Architecte</div>
          <div class="node-model">Claude 3 Haiku</div>
        </div>
        <div class="node-meta">
          <div class="node-cost" style="--node-color:var(--orange)">~$0.0007</div>
          <div class="node-time">~5s</div>
        </div>
      </div>
      <div class="node-body">
        <div class="data-block">
          <div class="label">Output clé</div>
          <div class="items">
            <div class="item good">arborescence (5 pages secteur)</div>
            <div class="item good">wireframe section par section</div>
            <div class="item good">proposition_valeur (ville + secteur)</div>
            <div class="item good">conversion_funnel → Copywriter</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="connector"></div>

  <!-- PHASE 6 : COPYWRITER -->
  <div class="node" style="--node-color: var(--orange)" onclick="toggle(this)">
    <div class="node-header">
      <div class="node-icon">✍️</div>
      <div class="node-info">
        <div class="node-phase">Phase 6</div>
        <div class="node-name">Le Copywriter</div>
        <div class="node-model">Claude 3 Haiku — 3 variantes PAS / AIDA / Pattern Interrupt</div>
      </div>
      <div class="node-meta">
        <div class="node-cost" style="--node-color:var(--orange)">~$0.001</div>
        <div class="node-time">~5 secondes</div>
      </div>
    </div>
    <div class="node-body">
      <div class="node-grid">
        <div class="data-block">
          <div class="label">Input chainé (Merge Node N8N)</div>
          <div class="items">
            <div class="item good">strategyData complet (angle + persona + timing)</div>
            <div class="item good">archiData (proposition_valeur + CTA)</div>
            <div class="item good">auditData.estimation_impact (CA perdu)</div>
            <div class="item good">ton_recommande du Stratège</div>
          </div>
        </div>
        <div class="data-block">
          <div class="label">Output → Critique</div>
          <div class="items">
            <div class="item good">variante_a (PAS) — objet + corps</div>
            <div class="item good">variante_b (AIDA) — objet + corps</div>
            <div class="item good">variante_c (Pattern Interrupt)</div>
            <div class="item good">opt-out RGPD garanti côté serveur</div>
          </div>
        </div>
      </div>
      <div class="guard-box">
        Guard : email destinataire détecté — IF Node N8N : emailDestinataire != null ? → suite | → "rejected_no_email" + Supabase
      </div>
    </div>
  </div>

  <div class="connector"></div>

  <!-- PHASE 7 : CRITIQUE -->
  <div class="node" style="--node-color: var(--blue)" onclick="toggle(this)">
    <div class="node-header">
      <div class="node-icon">🔍</div>
      <div class="node-info">
        <div class="node-phase">Phase 7 — Finale</div>
        <div class="node-name">Le Critique</div>
        <div class="node-model">Gemini 1.5 Flash — 8 checks déterministes + humanisation</div>
      </div>
      <div class="node-meta">
        <div class="node-cost">~$0.0003</div>
        <div class="node-time">~4 secondes</div>
      </div>
    </div>
    <div class="node-body">
      <div class="node-grid">
        <div class="data-block">
          <div class="label">Checks déterministes (Code Node)</div>
          <div class="items">
            <div class="item good">Longueur 40–180 mots</div>
            <div class="item good">Zéro mot spam</div>
            <div class="item good">Objet 15–80 chars</div>
            <div class="item good">Signature Nicolas — GhostNeural</div>
            <div class="item good">Au moins 1 chiffre/métrique</div>
            <div class="item good">CTA ou question finale</div>
            <div class="item good">Opt-out RGPD présent</div>
          </div>
        </div>
        <div class="data-block">
          <div class="label">Output final</div>
          <div class="items">
            <div class="item good">objet_final + corps_final corrigés</div>
            <div class="item good">qualite_score /100</div>
            <div class="item good">envoyable : true / false</div>
            <div class="item good">variante_choisie (A, B, C ou Combo)</div>
            <div class="item good">blocages si envoyable = false</div>
          </div>
        </div>
      </div>
      <div class="guard-box">
        Guard : envoyable === true AND qualite_score >= 60 — sinon → "quality_review" War Room (correction manuelle possible)
      </div>
    </div>
  </div>

  <div class="connector"></div>

  <!-- BRANCHEMENT FINAL -->
  <div class="branch-container">
    <div class="branch go">
      <div class="branch-label">✓ EMAIL_READY</div>
      <div class="branch-items">
        <div class="branch-item">→ Supabase INSERT lead complet</div>
        <div class="branch-item">→ War Room affiche le lead</div>
        <div class="branch-item">→ Slack notification si score > 80</div>
        <div class="branch-item">→ Envoi auto ou manuel via Resend</div>
      </div>
    </div>
    <div class="branch nogo">
      <div class="branch-label">✗ QUALITY_REVIEW</div>
      <div class="branch-items">
        <div class="branch-item">→ Supabase INSERT status "review"</div>
        <div class="branch-item">→ War Room flag orange</div>
        <div class="branch-item">→ Correction manuelle possible</div>
        <div class="branch-item">→ Re-trigger Copywriter si voulu</div>
      </div>
    </div>
  </div>

  <!-- FEEDBACK LOOP -->
  <div class="section-divider"><span>Feedback Loop — Intelligence qui s'améliore</span></div>

  <div class="feedback-section">
    <div class="feedback-box">
      <div class="feedback-title">🔄 Feedback Loop Automatique</div>
      <div class="feedback-grid">
        <div class="feedback-item">
          <div class="label">Trigger — Resend Webhook</div>
          <div class="value">Email ouvert → N8N reçoit l'événement → UPDATE Supabase ouverture = true</div>
        </div>
        <div class="feedback-item">
          <div class="label">Trigger — Réponse détectée</div>
          <div class="value">Gmail/IMAP polling N8N → réponse reçue → UPDATE Supabase reponse = true + contenu</div>
        </div>
        <div class="feedback-item">
          <div class="label">Analyse hebdo — N8N Schedule</div>
          <div class="value">Chaque lundi 8h → requête Supabase → top 5 emails qui ont converti → injection dans few-shot des prompts</div>
        </div>
      </div>
    </div>
  </div>

  <!-- COST SUMMARY -->
  <div class="cost-summary">
    <div class="cost-title">Coût Total par Prospect Traité</div>
    <table class="cost-table">
      <tr><td>Éclaireur (Gemini Flash ~200 tokens)</td><td>$0.00001</td></tr>
      <tr><td>Qualification (Gemini Flash ~600 tokens)</td><td>$0.0003</td></tr>
      <tr><td>Scan Playwright + Lighthouse (VPS fixe)</td><td>$0.002</td></tr>
      <tr><td>Audit Ultra (Gemini Flash ~2000 tokens)</td><td>$0.0005</td></tr>
      <tr><td>Stratège (Haiku ~1500 tokens)</td><td>$0.0008</td></tr>
      <tr><td>Architecte (Haiku ~1500 tokens)</td><td>$0.0007</td></tr>
      <tr><td>Copywriter (Haiku ~1800 tokens)</td><td>$0.001</td></tr>
      <tr><td>Critique (Gemini Flash ~800 tokens)</td><td>$0.0003</td></tr>
      <tr><td>N8N self-hosted (VPS Hetzner 10€/mois ÷ 1000 prospects)</td><td>$0.001</td></tr>
      <tr><td><strong>TOTAL PAR PROSPECT</strong></td><td><strong>~$0.007</strong></td></tr>
    </table>
    <div style="margin-top:12px; font-size:10px; color:var(--muted)">
      1000 prospects/mois = ~7$ LLM + 10€ VPS = moins de 20€/mois total · 60% des prospects rejetés avant Scan Full = économie réelle ~$0.004/prospect rejeté
    </div>
  </div>

</div>
</div>

<footer>
  <span>GhostNeural — Architecture N8N v1.0</span>
  <span>Cliquer sur chaque nœud pour voir le détail</span>
</footer>

<script>
function toggle(node) {
  const wasActive = node.classList.contains('active');
  document.querySelectorAll('.node').forEach(n => n.classList.remove('active'));
  if (!wasActive) node.classList.add('active');
}

// Animation d'entrée des nœuds
document.querySelectorAll('.node, .branch').forEach((el, i) => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(10px)';
  setTimeout(() => {
    el.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  }, 100 + i * 60);
});
</script>
</body>
</html>


Ce que le schéma montre et que ton orchestrateur TypeScript ne fait pas :
Exécution parallèle native — Stratège + Architecte tournent en simultané avec un Split + Merge Node N8N. Tu gagnes ~5 secondes par prospect sans écrire de code.
Retry natif sur chaque nœud — Si Gemini plante sur l'Audit, N8N retente automatiquement x2 avec backoff. Actuellement ton callLLMWithRetry c'est du code maison fragile.
Feedback loop concret — 3 triggers N8N : Resend webhook quand un email est ouvert → UPDATE Supabase. Gmail polling quand une réponse arrive → UPDATE Supabase. Schedule hebdomadaire chaque lundi → requête Supabase pour les top emails convertis → injection dans les few-shot examples des prompts.
Migration pratique — Tu gardes ton code TypeScript tel quel pour les agents. N8N ne remplace pas les agents — il remplace uniquement l'orchestrateur runPipeline(). Chaque agent devient un nœud "HTTP Request" qui appelle ton API Next.js existante. Migration progressive possible, un agent à la fois.

Prochaine étape concrète : on commence par installer N8N self-hosted ou tu veux d'abord implémenter le feedback loop sur le stack actuel pour valider que le pipeline produit des résultats avant de migrer ?


Ce qui est vraiment de l'intelligence :
Le Stratège choisit parmi 6 angles en fonction du pire pilier de l'audit + le profil du décideur. Ce n'est pas un template — il peut sortir "Incohérence Premium" pour un restaurant gastronomique avec un LCP de 8s, et "L'Invisible Google" pour le même restaurant si son problème principal c'est l'absence de sitemap. Deux prospects identiques en secteur peuvent recevoir des angles totalement différents selon leurs données réelles.
Le Copywriter combine les outputs du Stratège + Architecte + Audit pour créer un email qui cite des métriques réelles de CE site précis. Ce n'est pas un template rempli — c'est une synthèse de 4 analyses.
Ce qui EST effectivement des templates :
L'Architecte, oui. Les 6 templates sectoriels sont des bases fixes. Haiku les personnalise avec la ville et les problèmes de l'audit, mais la structure de base "restaurant = 5 pages avec réservation" ne change pas vraiment.
La Qualification, oui aussi. Le scoring déterministe par secteur c'est une grille fixe avec des bonus/malus codés en dur.
La vraie question que tu poses :
Est-ce que le système produit quelque chose qu'un humain expert ne pourrait pas faire mieux ? Non — pas encore. Ce qu'il fait c'est produire du 80% de qualité à 100% de vitesse et 1% du coût. Un consultant senior ferait un meilleur audit. Mais il ne pourrait pas en faire 500 par jour à 0,05€ l'unité.
Ce qui manquerait pour une vraie intelligence :
Le système ne scrape pas les concurrents réels du prospect pour comparer. Il ne lit pas les avis Google pour comprendre ce que les clients reprochent vraiment. Il n'analyse pas les publicités Facebook du secteur pour voir ce qui convertit. Il n'apprend pas de ses succès — si un angle "Mobile Mort" génère 3x plus de réponses que "Incohérence Premium", le système ne le sait pas et ne s'adapte pas.
C'est pour ça que dans le plan d'amélioration il y avait le feedback loop — tracker les taux d'ouverture et de réponse par variante, et réinjecter les winners dans les few-shot examples. Là ce serait de l'intelligence réelle.
Tu veux qu'on ajoute ça — le tracking des résultats qui améliore automatiquement les prompts ?oui et aussi est que un vrai orchestrateur comme N8N qui gérerait des vrai ia serait pas moyeu x?17:41Oui, N8N serait beaucoup plus puissant. Et c'est exactement la bonne direction.
Voilà pourquoi honnêtement :
Ce que ton orchestrateur TypeScript fait actuellement :
C'est du code séquentiel déguisé en "pipeline multi-agents". Les agents ne se parlent pas vraiment — c'est juste des fonctions appelées les unes après les autres avec des await. Si un agent plante au milieu, tu perds tout. Pas de retry visuel, pas de monitoring en temps réel, pas de branchement conditionnel visuel.
Ce que N8N apporterait de concret :
Un vrai graphe visuel où tu vois chaque agent comme un nœud. Tu peux brancher "si score Éclaireur > 70 → priorité haute → Anthropic Claude Sonnet, si score 35-70 → Haiku". Sans toucher au code. Tu peux aussi ajouter un nœud humain — "si score qualité email entre 55 et 65 → envoyer pour validation manuelle avant envoi" — en glissant-déposant.
La vraie force c'est le retry natif. Si l'audit Gemini plante, N8N retente automatiquement 3 fois avec backoff exponentiel sans que tu écrives une ligne de code. Actuellement ton callLLMWithRetry c'est du bricolage maison.
Et surtout — les intégrations natives. Google Sheets pour importer des prospects en bulk, Airtable comme base de données visuelle, Slack pour recevoir une notif quand un lead score > 80, Resend déjà intégré nativement, webhook entrant depuis ta War Room Next.js.et au niveau du cout?17:41Bonne question — voilà les chiffres réels.
N8N Cloud (n8n.io) :

Starter : 20€/mois — 2 500 exécutions/mois
Pro : 50€/mois — 10 000 exécutions/mois
1 prospect traité = environ 7-8 exécutions de nœuds = ~1 exécution "workflow"
Donc Pro à 50€ = ~10 000 prospects/mois traités

N8N Self-hosted :

Gratuit et illimité en exécutions
Tu paies juste le serveur — un VPS à 5-10€/mois sur Hetzner ou OVH suffit
C'est l'option recommandée pour toi — ton pipeline va tourner en volume

Comparaison avec ton stack actuel :
Ton stack actuel (Next.js + Vercel) te coûte déjà des ressources serveur à chaque pipeline. Un scan Playwright complet + Lighthouse sur Vercel = une fonction qui tourne 30-60 secondes = coût Vercel non négligeable à volume.
Sur N8N self-hosted, les agents LLM coûtent exactement pareil — c'est toujours Gemini Flash et Haiku qui tournent. La différence c'est que N8N gère le orchestration gratuitement au lieu de te coûter du compute Vercel.
Estimation coût total par prospect traité :
ComposantCoût actuelCoût N8N self-hostedGemini Flash (Éclaireur + Qualification + Audit + Critique)~$0.002~$0.002Claude Haiku (Stratège + Architecte + Copywriter)~$0.003~$0.003Playwright + Lighthouse~$0.01 (Vercel compute)~$0.002 (VPS fixe)Orchestrationinclus Vercel~$0 (N8N self-hosted)Total par prospect~$0.015~$0.007
À 1 000 prospects/mois :

Stack actuel : ~15$ LLM + coût Vercel variable
N8N self-hosted : ~7$ LLM + 5-10€ VPS fixe

Le vrai gain c'est pas tant le coût — c'est la fiabilité et la visibilité. Tu vois exactement où ça plante, tu retentes en 1 clic, tu branches des conditions sans coder.