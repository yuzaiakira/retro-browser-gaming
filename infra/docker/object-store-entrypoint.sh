#!/bin/sh
set -eu

: "${S3_ACCESS_KEY_ID:?S3_ACCESS_KEY_ID is required}"
: "${S3_SECRET_ACCESS_KEY:?S3_SECRET_ACCESS_KEY is required}"

# SeaweedFS reads this at startup. The credentials come from the runtime
# environment and are never included in an image layer or build argument.
umask 077
cat > /tmp/retro-s3.json <<EOF
{
  "identities": [{
    "name": "retro-browser-gaming",
    "credentials": [{
      "accessKey": "${S3_ACCESS_KEY_ID}",
      "secretKey": "${S3_SECRET_ACCESS_KEY}"
    }],
    "actions": ["Admin", "Read", "Write", "List", "Tagging"]
  }]
}
EOF

exec weed server \
  -dir=/data \
  -s3 \
  -s3.port=9000 \
  -s3.config=/tmp/retro-s3.json \
  -master.telemetry=false
