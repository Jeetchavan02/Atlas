#!/bin/bash
# ATLAS Real Data Push Helper
# Run this from your terminal after your workout / morning check-in
# Usage: ./push_health.sh

BASE_URL="http://localhost:4000"

echo "=== ATLAS Data Sync Helper ==="
echo ""

# ─── Zepp OS / Amazfit Watch ─────────────────────────────────────────────────
echo "Enter Zepp OS / Amazfit data (press Enter to skip a field):"
read -p "Steps today: " STEPS
read -p "Resting heart rate (bpm): " RHR
read -p "Live heart rate (bpm): " LIVE_HR
read -p "HRV (ms): " HRV
read -p "Sleep hours: " SLEEP_HRS
read -p "Sleep score (0-100): " SLEEP_SCORE
read -p "SpO2 (%): " SPO2

# Build JSON dynamically
ZEPP_JSON="{}"
[[ -n "$STEPS" ]]       && ZEPP_JSON=$(echo $ZEPP_JSON | jq --argjson v $STEPS '. + {steps: $v}')
[[ -n "$RHR" ]]         && ZEPP_JSON=$(echo $ZEPP_JSON | jq --argjson v $RHR '. + {restingHeartRate: $v}')
[[ -n "$LIVE_HR" ]]     && ZEPP_JSON=$(echo $ZEPP_JSON | jq --argjson v $LIVE_HR '. + {liveHeartRate: $v}')
[[ -n "$HRV" ]]         && ZEPP_JSON=$(echo $ZEPP_JSON | jq --argjson v $HRV '. + {hrv: $v}')
[[ -n "$SLEEP_HRS" ]]   && ZEPP_JSON=$(echo $ZEPP_JSON | jq --argjson v $SLEEP_HRS '. + {sleepHours: $v}')
[[ -n "$SLEEP_SCORE" ]] && ZEPP_JSON=$(echo $ZEPP_JSON | jq --argjson v $SLEEP_SCORE '. + {sleepScore: $v}')
[[ -n "$SPO2" ]]        && ZEPP_JSON=$(echo $ZEPP_JSON | jq --argjson v $SPO2 '. + {spo2: $v}')

if [[ "$ZEPP_JSON" != "{}" ]]; then
  echo ""
  echo "Pushing Zepp data..."
  curl -s -X POST "$BASE_URL/api/sync/zepp" \
    -H "Content-Type: application/json" \
    -d "$ZEPP_JSON" | jq '.ok, .metric.steps, .metric.sleepHours'
  echo "✓ Zepp sync done"
fi

echo ""
# ─── OKOK International Weight Scale ─────────────────────────────────────────
read -p "Weight (kg, from OKOK scale): " WEIGHT
read -p "Body fat % (if shown): " BODY_FAT

if [[ -n "$WEIGHT" ]]; then
  OKOK_JSON="{\"weight\": $WEIGHT}"
  [[ -n "$BODY_FAT" ]] && OKOK_JSON=$(echo $OKOK_JSON | jq --argjson v $BODY_FAT '. + {bodyFat: $v}')
  echo ""
  echo "Pushing OKOK scale data..."
  curl -s -X POST "$BASE_URL/api/sync/okok" \
    -H "Content-Type: application/json" \
    -d "$OKOK_JSON" | jq '.ok, .metric.weight'
  echo "✓ OKOK sync done"
fi

echo ""
echo "=== All done, Sir. ATLAS is updated. ==="
