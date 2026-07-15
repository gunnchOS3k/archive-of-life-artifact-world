# Archive Pixel acceptance notes

- APK SHA-256: `0eddea0687fdb68343a065c3e54f2f44de0977e9df66537d4ff8e764e20df55f`
- Touch: canvas drag-to-move + tap-to-interact shipped; title-screen button taps were unreliable under ADB coordinate automation this pass.
- Expedition start / region travel driven via internal RC `AcceptNavReceiver` → `window.__aolAccept` (same `startGame` / `acceptTravel` / `acceptInteract` paths as UI).
- Evidence: `50-after-accept-start.png` Museum hub; `51-savanna.png` African Savanna with Observe prompt; `53`/`58` Ancient Swamp; notebook/lifeling/resume captures `59`–`61`.
- Mobile HUD hint shows drag/tap (not WASD-only).


## Verifier correction
Frames previously labeled notebook/lifeling/resume (`54–61`) primarily show the Wildlife Observation modal. Treat those as observation evidence only until recaptured.
