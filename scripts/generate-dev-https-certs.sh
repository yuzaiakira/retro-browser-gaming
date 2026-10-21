#!/usr/bin/env bash
# Generate a local development CA + dual-host leaf for launcher.localhost / j2me.localhost.
# Does NOT install into the system trust store. Tests import the CA into a Chromium NSS DB.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${ROOT}/infra/dev-certs"
mkdir -p "$OUT"
cd "$OUT"

if [[ ! -f ca.key.pem ]]; then
  openssl genrsa -out ca.key.pem 4096
  openssl req -x509 -new -nodes -key ca.key.pem -sha256 -days 825 \
    -subj "/CN=Retro Browser Gaming Dev CA/O=RBG Local Dev/C=US" \
    -out ca.cert.pem
fi

cat > hosts.ext <<'EOF'
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names
[alt_names]
DNS.1 = launcher.localhost
DNS.2 = j2me.localhost
DNS.3 = localhost
IP.1 = 127.0.0.1
EOF

openssl genrsa -out server.key.pem 2048
openssl req -new -key server.key.pem -subj "/CN=launcher.localhost" -out server.csr.pem
openssl x509 -req -in server.csr.pem -CA ca.cert.pem -CAkey ca.key.pem -CAcreateserial \
  -out server.cert.pem -days 825 -sha256 -extfile hosts.ext

rm -f server.csr.pem hosts.ext
echo "Wrote $OUT/ca.cert.pem and server.{key,cert}.pem"
openssl x509 -in server.cert.pem -noout -text | grep -A4 'Subject Alternative Name'
