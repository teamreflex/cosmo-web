#!/bin/sh
# runs inside the floci container once its APIs are up; a failure here shuts floci down
set -eu

aws s3api head-bucket --bucket apollo 2>/dev/null || aws s3api create-bucket --bucket apollo

# ses refuses mail from unverified senders, and identities are per region
if [ -n "$MAIL_SES_FROM" ]; then
  aws ses verify-email-identity --region "$MAIL_SES_REGION" --email-address "$MAIL_SES_FROM"
fi
