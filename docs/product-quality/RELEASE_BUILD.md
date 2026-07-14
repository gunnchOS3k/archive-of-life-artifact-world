# Release Build — Archive of Life

| Field | Value |
|-------|-------|
| Package | `com.gunnchos.archiveoflife` |
| Version name | 1.1.0 |
| Version code | 2 |
| Artifact | `build/android/archive-of-life-release.apk` |
| SHA-256 | `0eddea0687fdb68343a065c3e54f2f44de0977e9df66537d4ff8e764e20df55f` |
| `debuggable` | **false** |
| Signing | Internal-testing keystore `~/.android/gunnchos-internal-keys/archive-internal-release.jks` (not committed). Build with `ARCHIVE_STORE_FILE`, `ARCHIVE_STORE_PASSWORD`, `ARCHIVE_KEY_ALIAS`, `ARCHIVE_KEY_PASSWORD`. |
| Cert | CN=Archive Internal RC |
| Cap duplicate resources | Deleted invalid `config 2.xml` / `config 3.xml` (space in name breaks aapt) |
| Pixel acceptance | **NOT TESTED** (ADB empty) |

Prior debug-keystore build SHA-256: `822d653c713705b53eb06c21da14a0c5d7206f53c175587d2ae4d09c22ab57bc` (superseded).
