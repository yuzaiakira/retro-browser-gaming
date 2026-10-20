# Android device discovery — 2026-10-20

Prior “adb missing” finding is obsolete. Rediscovery on the Manjaro host:

| Check | Result |
|---|---|
| `command -v adb` | `/usr/bin/adb` |
| `adb devices -l` | One authorized USB device (`device`) |
| Model (generic) | `2303CRA44A` (Xiaomi / Redmi family) |
| Android | 15 (`ro.build.version.release`) |
| Chrome | `155.0.8059.39` (`com.android.chrome`) |
| Host ports | Next production Compose `127.0.0.1:13000`; API `127.0.0.1:18000` |
| ADB reverse | `tcp:13000` → host `13000`; `tcp:18000` → host `18000` (`scripts/physical-android-forward.sh`) |
| CDP | `adb forward tcp:9222 localabstract:chrome_devtools_remote` |
| Secure context / COI / OPFS / locks / SAB / WebGL2 | All true on `/diagnostics` |
| `maxTouchPoints` | 5 |
| Physical gamepad | No `/dev/input/js*` on host; none attached |
| iOS | `idevice_id` empty |

Device serial and unrelated Chrome tab contents are intentionally omitted from published evidence.
