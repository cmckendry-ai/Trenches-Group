#!/usr/bin/env bash
# Print the live trenches-os-api bindings and cron schedule from the Cloudflare
# API so wrangler.jsonc can be filled in from fact, not memory.
#
# Needs: CLOUDFLARE_API_TOKEN (Workers Scripts:Read is enough), and optionally
# CLOUDFLARE_ACCOUNT_ID. Without the account id the script lists accounts and
# uses the first one.
set -euo pipefail
: "${CLOUDFLARE_API_TOKEN:?set CLOUDFLARE_API_TOKEN}"
API=https://api.cloudflare.com/client/v4
auth=(-H "Authorization: Bearer $CLOUDFLARE_API_TOKEN")
SCRIPT=${1:-trenches-os-api}

if [ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]; then
  CLOUDFLARE_ACCOUNT_ID=$(curl -sS "${auth[@]}" "$API/accounts" | python3 -c 'import sys,json; r=json.load(sys.stdin)["result"]; print(r[0]["id"]); print("accounts:", [(a["id"],a["name"]) for a in r], file=sys.stderr)')
fi
echo "account_id: $CLOUDFLARE_ACCOUNT_ID"

echo "== bindings =="
curl -sS "${auth[@]}" "$API/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/$SCRIPT/settings" \
  | python3 -c '
import sys,json
r=json.load(sys.stdin)
if not r.get("success"): print(r); sys.exit(1)
s=r["result"]
for b in s.get("bindings",[]):
    print(json.dumps(b))
print("compatibility_date:", s.get("compatibility_date"))
print("compatibility_flags:", s.get("compatibility_flags"))
'
echo "== cron schedules =="
curl -sS "${auth[@]}" "$API/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/$SCRIPT/schedules" \
  | python3 -c 'import sys,json; r=json.load(sys.stdin); print(json.dumps(r.get("result"), indent=1))'
echo "== queues (names, ids, consumers) =="
curl -sS "${auth[@]}" "$API/accounts/$CLOUDFLARE_ACCOUNT_ID/queues" \
  | python3 -c '
import sys,json
for q in json.load(sys.stdin).get("result",[]):
    print(q.get("queue_name"), q.get("queue_id"), [c.get("script") for c in q.get("consumers",[])])'
echo "== workflows =="
curl -sS "${auth[@]}" "$API/accounts/$CLOUDFLARE_ACCOUNT_ID/workflows" \
  | python3 -c '
import sys,json
for w in json.load(sys.stdin).get("result",[]):
    print(w.get("name"), w.get("script_name"), w.get("class_name"))'
