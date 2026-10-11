#!/usr/bin/env bash
# Builds the Hizarc Games Android APK (WebView shell + dist/) without Gradle,
# using the Android SDK + OpenJDK that ship with Unity 6000.4.3f1.
#   bash android-apk/build-apk.sh            → debuggable test APK (WebView inspectable)
#   bash android-apk/build-apk.sh --release  → non-debuggable APK (still signed with the local test key)
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
UNITY_ANDROID="${UNITY_ANDROID:-/c/Program Files/Unity/Hub/Editor/6000.4.3f1/Editor/Data/PlaybackEngines/AndroidPlayer}"
SDK="${ANDROID_SDK:-$UNITY_ANDROID/SDK}"
BT="$SDK/build-tools/36.0.0"
PLATFORM_JAR="$SDK/platforms/android-35/android.jar"
export JAVA_HOME="${JAVA_HOME:-$UNITY_ANDROID/OpenJDK}"
export PATH="$JAVA_HOME/bin:$PATH"

VERSION_NAME="$(node -p "require('$ROOT/package.json').version" 2>/dev/null || echo 1.0.0)"
VERSION_CODE="${VERSION_CODE:-1}"
DEBUG=true; SUFFIX=debug
if [[ "${1:-}" == "--release" ]]; then DEBUG=false; SUFFIX=release; fi

OUT="$HERE/out"; WORK="$HERE/build"
rm -rf "$WORK"; mkdir -p "$WORK"/{classes,dex,assets/www,gen,res-compiled} "$OUT"

echo "› web build"
( cd "$ROOT" && npm run build >/dev/null )
cp -r "$ROOT/dist/." "$WORK/assets/www/"

echo "› resources"
mkdir -p "$WORK/res/mipmap-xxxhdpi" "$WORK/res/values"
cp "$HERE/res/values/styles.xml" "$WORK/res/values/"
cp "$ROOT/public/icon-512.png" "$WORK/res/mipmap-xxxhdpi/ic_launcher.png"
"$BT/aapt2.exe" compile --dir "$(cygpath -w "$WORK/res")" -o "$(cygpath -w "$WORK/res-compiled/res.zip")"
"$BT/aapt2.exe" link -o "$(cygpath -w "$WORK/base.apk")" \
  -I "$(cygpath -w "$PLATFORM_JAR")" \
  --manifest "$(cygpath -w "$HERE/AndroidManifest.xml")" \
  "$(cygpath -w "$WORK/res-compiled/res.zip")" \
  --min-sdk-version 24 --target-sdk-version 34 \
  --version-code "$VERSION_CODE" --version-name "$VERSION_NAME" \
  $([[ $DEBUG == true ]] && echo --debug-mode) \
  -0 woff2 -0 png -0 webp

echo "› java → dex"
cat > "$WORK/gen/BuildConfigFlags.java" <<EOF
package com.hizarc.games;
final class BuildConfigFlags { static final boolean DEBUG = $DEBUG; }
EOF
javac -nowarn -source 8 -target 8 -bootclasspath "$(cygpath -w "$PLATFORM_JAR")" -Xlint:-options \
  -d "$(cygpath -w "$WORK/classes")" \
  "$(cygpath -w "$HERE/src/com/hizarc/games/MainActivity.java")" "$(cygpath -w "$WORK/gen/BuildConfigFlags.java")"
jar cf "$(cygpath -w "$WORK/classes.jar")" -C "$(cygpath -w "$WORK/classes")" .
java -cp "$(cygpath -w "$BT/lib/d8.jar")" com.android.tools.r8.D8 --release --min-api 24 --lib "$(cygpath -w "$PLATFORM_JAR")" --output "$(cygpath -w "$WORK/dex")" "$(cygpath -w "$WORK/classes.jar")"

# assets added with jar so zip entries use forward slashes (aapt2 -A on Windows writes backslashes)
jar -u -M -f "$(cygpath -w "$WORK/base.apk")" -C "$(cygpath -w "$WORK")" assets
( cd "$WORK/dex" && "$BT/aapt.exe" add "$(cygpath -w "$WORK/base.apk")" classes.dex >/dev/null )

echo "› align + sign"
KS="$HERE/hizarc-test.keystore"
if [[ ! -f "$KS" ]]; then
  keytool -genkeypair -keystore "$(cygpath -w "$KS")" -storepass hizarc-test -keypass hizarc-test \
    -alias hizarc -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Hizarc Games Test,O=HIZARC,C=IN" >/dev/null 2>&1
fi
"$BT/zipalign.exe" -f -p 4 "$(cygpath -w "$WORK/base.apk")" "$(cygpath -w "$WORK/aligned.apk")"
APK="$OUT/HizarcGames-$VERSION_NAME-$SUFFIX.apk"
java -jar "$(cygpath -w "$BT/lib/apksigner.jar")" sign --ks "$(cygpath -w "$KS")" --ks-pass pass:hizarc-test --out "$(cygpath -w "$APK")" "$(cygpath -w "$WORK/aligned.apk")"
java -jar "$(cygpath -w "$BT/lib/apksigner.jar")" verify "$(cygpath -w "$APK")" && echo "✓ $APK ($(du -h "$APK" | cut -f1))"
