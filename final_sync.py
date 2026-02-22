import json

file_path = '/Users/nicolasdistefano/Documents/bashghostagency/docs/n8n_brain_v4.json'

with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# 1. Update "📦 Assembly Final" to include all data required by War Room
assembly_js = """
const d = $input.first().json;
const hasEmail = !!d.prospect.email;

return [{ json: { 
  nom: d.prospect.nom, 
  site_web: d.prospect.site_web, 
  secteur: d.prospect.secteur, 
  ville: d.prospect.ville, 
  email: d.prospect.email, 
  score_opportunite: d.brain_final?.score_opportunite || 0, 
  score_qualite_email: d.copywriter_eval?.qualite_score || 0, 
  email_objet: d.copywriter_eval?.objet_final || "", 
  email_body: d.copywriter_eval?.corps_final || "", 
  brain_synthesis: d.brain_final?.brain_synthesis, 
  brain_ca_perdu: d.brain_final?.ca_perdu_estime, 
  status: hasEmail ? "email_ready" : "no_email",
  audit_data: { 
    audit: d.audit, 
    brain_decision_1: d.brain_decision_1, 
    brain_final: d.brain_final 
  },
  proposition_data: {
    stratege: d.stratege_final,
    architecte: d.archi_final
  }
} }];
"""

for node in data['nodes']:
    if node.get('name') == '📦 Assembly Final':
        node['parameters']['jsCode'] = assembly_js.strip()

# 2. Add "💾 Sauvegarder" node if missing (it should be there from my previous write, let's just make sure it's perfect)
save_node_id = "save-to-db-uuid"
has_save = any(n.get('name') == '💾 Sauvegarder' for n in data['nodes'])

if not has_save:
    save_node = {
      "parameters": {
        "method": "POST",
        # NOTE: Update this URL for production (e.g., https://your-site.com/api/n8n/save)
        "url": "http://localhost:3002/api/n8n/save",
        "sendBody": True,
        "specifyBody": "json",
        "options": {
          "timeout": 30000
        },
        "jsonBody": "={{ $json }}"
      },
      "id": save_node_id,
      "name": "💾 Sauvegarder",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [
        5280,
        160
      ]
    }
    data['nodes'].append(save_node)

# 3. Fix Connections logic
# Assembly -> Save
data['connections']['📦 Assembly Final']['main'] = [[{"node": "💾 Sauvegarder", "type": "main", "index": 0}]]
# Save -> Response
data['connections']['💾 Sauvegarder'] = {"main": [[{"node": "✅ Réponse", "type": "main", "index": 0}]]}

with open(file_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("Synchronized Workflow perfectly updated.")
