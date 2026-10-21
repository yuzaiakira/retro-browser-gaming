#!/usr/bin/env bash
# Build first-party MIT Dot MIDlet (CLDC/MIDP-compatible JAR + JAD).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
BUILD="$ROOT/build"
CLASSES="$BUILD/classes"
STUBS="$BUILD/stubs"
mkdir -p "$CLASSES" "$STUBS" "$BUILD/jar"
# Compile stubs separately (API only)
find "$ROOT/src/javax" -name '*.java' > "$BUILD/stubs.list"
javac --release 8 -d "$STUBS" @"$BUILD/stubs.list"
# Compile game against stubs
find "$ROOT/src/retro" -name '*.java' > "$BUILD/game.list"
javac --release 8 -cp "$STUBS" -d "$CLASSES" @"$BUILD/game.list"
# Package game classes only (runtime supplies MIDP)
MF="$BUILD/MANIFEST.MF"
cat > "$MF" <<'EOF'
Manifest-Version: 1.0
MIDlet-Name: MIT J2ME Dot
MIDlet-Version: 1.0.0
MIDlet-Vendor: Retro Browser Gaming
MIDlet-1: MIT J2ME Dot, , retro.j2me.dot.DotMIDlet
MicroEdition-Configuration: CLDC-1.1
MicroEdition-Profile: MIDP-2.0
EOF
cd "$CLASSES"
jar cfm "$BUILD/jar/mit-j2me-dot.jar" "$MF" retro
# JAD
SIZE=$(wc -c < "$BUILD/jar/mit-j2me-dot.jar" | tr -d ' ')
cat > "$BUILD/jar/mit-j2me-dot.jad" <<EOF
MIDlet-Name: MIT J2ME Dot
MIDlet-Version: 1.0.0
MIDlet-Vendor: Retro Browser Gaming
MIDlet-1: MIT J2ME Dot, , retro.j2me.dot.DotMIDlet
MIDlet-Jar-URL: mit-j2me-dot.jar
MIDlet-Jar-Size: $SIZE
MicroEdition-Configuration: CLDC-1.1
MicroEdition-Profile: MIDP-2.0
EOF
sha256sum "$BUILD/jar/mit-j2me-dot.jar" "$BUILD/jar/mit-j2me-dot.jad"
cp "$BUILD/jar/mit-j2me-dot.jar" "$BUILD/jar/mit-j2me-dot.jad" "$ROOT/../../.fixtures/"
echo "Built .fixtures/mit-j2me-dot.jar and .jad"
