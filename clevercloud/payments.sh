#!/bin/bash -l
if [[ "$INSTANCE_NUMBER" != "0" ]]; then
  exit 0
fi
curl -sS -H "Authorization: Bearer ${CRON_SECRET}" "http://127.0.0.1:${PORT}/api/cron/payments"
