# Reproducibility — Archive of Life: Artifact World

This is a **product/game** repository (educational exploration). Bundled sample biology is **not** verified science. Not a wireless experiment.

Human playtest remains `HUMAN_QA_PENDING`.

## Canonical commands

```bash
npm install
npm test
npm run build
```

Optional data audits (sample/game-authored packs):

```bash
npm run audit:data
npm run audit:coverage
```

Capacitor Android (JDK 17 + Android SDK):

```bash
npx cap sync android
cd android && ./gradlew assembleDebug
```

Package id: `com.gunnchos.archiveoflife`. See `docs/PIXEL_6A_ACCEPTANCE.md`.
