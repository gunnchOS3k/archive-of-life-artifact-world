# Original field observation studies — render candidates

Editable source is `src/art/organismStudies.ts`. This increment draws the exact four taxa `balaenoptera_musculus`, `panthera_leo`, `loxodonta_africana` and `danaus_plexippus`, with separate body parts, material-like shading, original markings and timer-driven articulation. It also composes ocean, savanna/watering-hole and milkweed-garden backdrops. Institutional morphology references and limits are recorded in `PROVENANCE.json`; these do not promote bundled scientific records.

The existing game remains Canvas2D. `WildlifeObservation.draw()` calls these studies at the actual observation pose; `World.drawInteractable()` uses small static versions on normal encounter markers. Exact unsupported IDs return before touching the canvas, preserving existing fallback identity and reveal behavior. The large drawings request an appropriate visual motion envelope so the whale is not clipped by the old 80px silhouette margin. Existing patience, alertness, completion, collection and save behavior are retained.

`src/game/companion.ts` improves the existing fictional Lifeling's original contour, shading, face and emote marks. Its current saved name, all equipped/earned traits and progression remain the same. The same draw path serves actual gameplay and the companion panel preview.

Source/test readiness is distinct from visual acceptance. These files have not yet been rendered or aesthetically assessed in this production wave; browser, capture and build execution is waiting for the root's shared-resource turn. Status is **authored render candidate**. No finished-asset or external independent-review claim is granted by passing tests.

## Reproduction after render capacity is released

Preserved comparison baseline is local commit `76e6a3a` (museum bridge reconciled, before new field art); prior independent static blue-whale plate remains at `de15a69a`. Neither baseline has been reset or discarded. Use a separate exact-SHA comparison source if a before render is required; do not modify Cursor's active tree.

Start the actual app with an isolated Vite cache, create an ephemeral profile through Begin Expedition/onboarding, and travel through the existing region UI. Blue whale is in Coastal; lion and elephant are in Savanna; monarch is registered in the authored region catalog (subject to the existing geography filters). Approach the exact encounter marker and press E, then capture the actual observation canvas while idle/holding and at several supplied clock phases. Test reduced motion through the real settings control. Do not count debug relocation, pose fixtures or a source-only drawing preview as an earned discovery or human playthrough.

Existing acceptance helpers `__aolAccept('travel', region)`, `move_beside`, `interact`, `hold` and `snapshot` can assist a clearly declared runtime fixture. They already exist; this art change adds no progression bypass or public test command. The helper's first-species selection may need normal navigation for the second Savanna subject. Before/after art must be compared using the same explicit species and frame/camera conditions.

Focused source validation uses one Vitest worker:

```sh
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vitest/vitest.mjs run src/art/organismStudies.test.ts src/systems/observationLocomotion.test.ts src/game/companion.runtime.test.ts src/systems/companionProgression.test.ts src/systems/museumDexPlayerUi.test.ts src/ui/blueWhaleStudy.test.ts --pool=threads --maxWorkers=1 --minWorkers=1 --cache=false
```

Remaining work includes actual running-product composition/motion assessment, expert anatomy and independent review, human art acceptance, the other flagship taxa, fossil-era reconstructions, museum environment production and broader habitat art. The project inventory records these as pending rather than treating four studies as the final organism catalog.

`HUMAN=false`, `RC2=false`, `V1=false`.
