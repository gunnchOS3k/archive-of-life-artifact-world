# Release Build — Archive of Life

| Field | Value |
|-------|-------|
| Package | `com.gunnchos.archiveoflife` |
| Version name | 1.1.0 |
| Version code | 2 |
| Artifact | `build/android/archive-of-life-release.apk` |
| SHA-256 | `7b011689a5e240dffde606a1aa49d385d25e86444d2dea925d9c98aa9b269ab1` |
| `debuggable` | **false** |
| Signing | Internal-testing keystore `~/.android/gunnchos-internal-keys/archive-internal-release.jks` (not committed). Build with `ARCHIVE_STORE_FILE`, `ARCHIVE_STORE_PASSWORD`, `ARCHIVE_KEY_ALIAS`, `ARCHIVE_KEY_PASSWORD`. |
| Cert | CN=Archive Internal RC |
| Cap duplicate resources | Deleted invalid `config 2.xml` / `config 3.xml` (space in name breaks aapt) |
| Pixel acceptance | **NOT TESTED** (ADB empty) |

Prior debug-keystore build SHA-256: `822d653c713705b53eb06c21da14a0c5d7206f53c175587d2ae4d09c22ab57bc` (superseded).
