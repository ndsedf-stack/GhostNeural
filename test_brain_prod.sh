#!/bin/bash
# Test de Production GhostNeural V4
curl -X POST http://localhost:5678/webhook/ghostneural-brain \
-H "Content-Type: application/json" \
-d '{
  "nom": "RDV Gurume",
  "site_web": "https://rdvgurume.com",
  "secteur": "restaurant",
  "ville": "Cannes",
  "email": "contact@rdvgurume.com"
}'
