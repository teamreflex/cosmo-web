#!/bin/bash

# check if we should run dev services
if [ "${USE_DEV_SERVICES}" = "true" ]; then
  exec docker compose up
else
  echo "Set USE_DEV_SERVICES=true to run docker services"
  # hang indefinitely until canceled
  while true; do
    sleep 3600  # sleep for 1 hour at a time
  done
fi
