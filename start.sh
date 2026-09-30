#!/bin/bash

# check if we should run dev services
if [ "${DEV_SERVICES}" = "true" ]; then
  # always start what the web app needs: both databases, valkey, s3proxy and browserless
  SERVICES="postgres-web pgbouncer-web postgres-indexer pgbouncer-indexer valkey s3proxy browserless"

  # conditionally add services based on flags
  if [ "${DEV_TYPESENSE}" = "true" ]; then
    SERVICES="$SERVICES typesense"
  fi

  if [ "${DEV_PROCESSOR}" = "true" ]; then
    SERVICES="$SERVICES processor"
  fi

  if [ "${DEV_IMPORTER}" = "true" ]; then
    SERVICES="$SERVICES import-server"
  fi

  if [ "${DEV_SCHEDULES}" = "true" ]; then
    SERVICES="$SERVICES schedules"
  fi

  echo "Starting services: $SERVICES"
  exec docker compose up $SERVICES
else
  echo "Set DEV_SERVICES=true to run docker services"
  # hang indefinitely until canceled
  while true; do
    sleep 3600  # sleep for 1 hour at a time
  done
fi
