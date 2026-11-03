#!/usr/bin/env bash
# Builds GL Trainer as an Android APK without needing Android Studio or the SDK.
#
#   ./android-app/build-apk.sh            -> dist/gl-trainer.apk
#
# Needs: JDK 17+, python3, curl. Downloads the Android API jar, dx and apksig
# from Maven Central on first run. Signs with $KEYSTORE (PKCS12), creating one
# in ~/.gl-trainer/ if it doesn't exist. Keep that file: Android only installs
# updates signed with the same key.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$HERE")"
CACHE="${CACHE:-$HOME/.cache/gl-trainer-apk}"
BUILD="$ROOT/build/android"
OUT="${OUT:-$ROOT/dist/gl-trainer.apk}"
KEYSTORE="${KEYSTORE:-$HOME/.gl-trainer/release.p12}"
KEY_ALIAS="${KEY_ALIAS:-gltrainer}"
KEY_PASS="${KEY_PASS:-gltrainer}"
MAVEN=https://repo.maven.apache.org/maven2

mkdir -p "$CACHE" "$BUILD" "$(dirname "$OUT")" "$(dirname "$KEYSTORE")"

fetch() { # url dest
  [ -s "$2" ] && return
  echo "downloading $(basename "$2")"
  for i in 1 2 3 4 5; do curl -sSfL -o "$2.part" "$1" && mv "$2.part" "$2" && return; sleep $((i * 5)); done
  echo "failed to download $1" >&2; exit 1
}
fetch "$MAVEN/org/robolectric/android-all/14-robolectric-10818077/android-all-14-robolectric-10818077.jar" "$CACHE/android-all.jar"
fetch "$MAVEN/com/jakewharton/android/repackaged/dalvik-dx/16.0.1/dalvik-dx-16.0.1.jar" "$CACHE/dx.jar"
fetch "$MAVEN/com/android/tools/build/apksig/2.3.0/apksig-2.3.0.jar" "$CACHE/apksig.jar"

echo "compiling Java"
rm -rf "$BUILD/classes" && mkdir -p "$BUILD/classes"
javac -nowarn --release 8 -Xlint:-options -cp "$CACHE/android-all.jar" -d "$BUILD/classes" \
  $(find "$HERE/src" -name '*.java')

echo "converting to dex"
java -cp "$CACHE/dx.jar" com.android.dx.command.Main --dex --min-sdk-version=24 \
  --output="$BUILD/classes.dex" "$BUILD/classes"

echo "packaging"
python3 "$HERE/tools/make_apk.py" "$ROOT/web" "$BUILD/classes.dex" "$ROOT/web/icons/icon-192.png" "$BUILD/unsigned.apk"

if [ ! -f "$KEYSTORE" ]; then
  echo "creating signing key $KEYSTORE"
  keytool -genkeypair -keystore "$KEYSTORE" -storetype PKCS12 -alias "$KEY_ALIAS" \
    -storepass "$KEY_PASS" -keypass "$KEY_PASS" -keyalg RSA -keysize 2048 -validity 10000 \
    -dname "CN=GL Trainer" >/dev/null 2>&1
fi

echo "signing"
# apksig 2.x uses JDK-internal X.509/PKCS classes, which newer JDKs must export explicitly.
java --add-exports java.base/sun.security.x509=ALL-UNNAMED --add-exports java.base/sun.security.pkcs=ALL-UNNAMED \
  --add-exports java.base/sun.security.util=ALL-UNNAMED \
  -cp "$CACHE/apksig.jar" "$HERE/tools/SignApk.java" "$BUILD/unsigned.apk" "$OUT" "$KEYSTORE" "$KEY_ALIAS" "$KEY_PASS"
echo "done: $OUT ($(du -h "$OUT" | cut -f1))"
