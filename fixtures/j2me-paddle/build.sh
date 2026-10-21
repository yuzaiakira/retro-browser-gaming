#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
BUILD="$ROOT/build"
CLASSES="$BUILD/classes"
STUBS="$BUILD/stubs"
mkdir -p "$CLASSES" "$STUBS" "$BUILD/jar"
find "$ROOT/src/javax" "$ROOT/src/java" -name '*.java' > "$BUILD/stubs.list"
javac --release 8 -Xlint:-options -d "$STUBS" @"$BUILD/stubs.list"
find "$ROOT/src/retro" -name '*.java' > "$BUILD/game.list"
javac --release 8 -Xlint:-options -cp "$STUBS" -d "$CLASSES" @"$BUILD/game.list"
MF="$BUILD/MANIFEST.MF"
cat > "$MF" <<'EOF'
Manifest-Version: 1.0
MIDlet-Name: MIT J2ME Paddle
MIDlet-Version: 1.0.0
MIDlet-Vendor: Retro Browser Gaming
MIDlet-1: MIT J2ME Paddle, , retro.j2me.paddle.PaddleMIDlet
MicroEdition-Configuration: CLDC-1.1
MicroEdition-Profile: MIDP-2.0
EOF
cd "$CLASSES" && jar cfm "$BUILD/jar/mit-j2me-paddle.jar" "$MF" retro
SIZE=$(wc -c < "$BUILD/jar/mit-j2me-paddle.jar" | tr -d ' ')
cat > "$BUILD/jar/mit-j2me-paddle.jad" <<EOF
MIDlet-Name: MIT J2ME Paddle
MIDlet-Version: 1.0.0
MIDlet-Vendor: Retro Browser Gaming
MIDlet-1: MIT J2ME Paddle, , retro.j2me.paddle.PaddleMIDlet
MIDlet-Jar-URL: mit-j2me-paddle.jar
MIDlet-Jar-Size: $SIZE
MicroEdition-Configuration: CLDC-1.1
MicroEdition-Profile: MIDP-2.0
EOF
cp "$BUILD/jar/mit-j2me-paddle.jar" "$BUILD/jar/mit-j2me-paddle.jad" "$ROOT/../../.fixtures/"
sha256sum "$ROOT/../../.fixtures/mit-j2me-paddle.jar"
echo "Built mit-j2me-paddle"
