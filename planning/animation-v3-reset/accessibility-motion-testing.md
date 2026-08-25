# Accessibility, Motion Safety and Inclusive Testing Plan

Status: **planning contract**

Sumer Reel Forge has two accessibility surfaces:

1. the **Studio / Animation Lab tools** used to author and review animation; and
2. the **rendered media** eventually consumed by viewers.

Both need explicit requirements from the start rather than retrofit work.

## 1. Studio accessibility baseline

Studio UI and Animation Lab UI should target WCAG 2.2 AA / Section 508-compatible interaction patterns where applicable.

Required categories:

- keyboard navigation;
- visible focus;
- semantic controls;
- labels/instructions;
- status messages;
- color-independent state;
- zoom/reflow;
- sufficient contrast;
- screen-reader names/relationships;
- predictable focus after dialogs/promotion actions.

## 2. Storybook accessibility coverage

Every new Studio component story should include accessibility checks when the chosen Storybook framework/addons support them.

Priority components:

```text
source provenance card
actor inspector
timeline/frame scrubber
QA result panel
promotion/rejection controls
city/world-state editor
runtime diagnostics
render/proof status
```

Tests should include keyboard-only interaction for high-value controls.

## 3. Frame scrubber accessibility

The frame control is central to V3 and must not be mouse-only.

Requirements:

- focusable slider/spin control;
- accessible name includes scene and current frame context;
- arrow keys move one frame;
- configurable larger jumps via Page Up/Down or companion controls;
- Home/End move to valid bounds;
- current frame and time are announced without excessive live-region spam;
- proof-state buttons provide semantic shortcuts such as CLOSED or PEAK.

Unit tests:

- keyboard mapping;
- min/max clamping;
- frame/time announcement text.

Storybook interaction tests:

- focus scrubber;
- keyboard move;
- proof state selected;
- accessible value updates.

E2E:

- complete review workflow without mouse for core actions.

## 4. Animation review overlays

Debug overlays must not rely on red/green alone.

Use:

- icon/shape;
- text label;
- pattern/border;
- optional color.

Examples:

```text
PASS ✓
BLOCKED ✕
REVIEW_REQUIRED !
```

## 5. Reduced-motion support in Studio

Studio itself should respect `prefers-reduced-motion`.

This does **not** alter the authored production animation by default. It alters tool/UI transitions and preview autoplay behavior.

Recommended behavior:

- no automatic looping animation when reduced motion is requested;
- exact-frame inspection remains fully available;
- previews default paused;
- UI transitions minimized;
- user can explicitly play a proof when needed.

Tests:

- Storybook reduced-motion media emulation;
- Playwright emulation for reduced motion;
- verify preview does not unexpectedly autoplay.

## 6. Viewer motion-safety considerations

Final reels may contain:

- camera motion;
- storms;
- flashing lightning;
- rapid montage;
- particle effects;
- divine transformations.

Production QA should track motion-safety metadata:

```ts
interface MotionSafetyMetadata {
  rapidFlash: boolean;
  rapidCameraMotion: boolean;
  highContrastStrobe: boolean;
  sustainedZoom: boolean;
  intenseParticleField: boolean;
  notes?: string[];
}
```

This metadata is advisory/editorial and can support future viewer warnings or alternate cuts.

## 7. Flashing/strobe rule

Do not intentionally create repeated high-contrast flashes near seizure-risk thresholds without dedicated review.

Lightning should be designed as cinematic illumination, not repeated full-frame strobe.

Add deterministic analysis later for:

- frame-to-frame luminance spikes;
- repeated high-area flashes;
- frequency windows.

Human review remains required because automated flash metrics are not a complete editorial judgment.

## 8. Caption/subtitle planning

Although current Reel 1 uses narration, V3 should keep dialogue/subtitle accessibility compatible with future expansion.

Scene data should be able to bind spoken lines to:

- speaker;
- start/end frame;
- transcript text;
- narration/dialogue type;
- optional caption-safe placement metadata.

Tests:

- no caption outside scene bounds;
- timing order;
- caption-safe-zone collision checks;
- Storybook caption proof states;
- E2E toggle/show captions in Studio preview when implemented.

## 9. Audio-description future compatibility

Do not implement full audio description now, but Scene V3 should not make it impossible.

Keep scene semantics rich enough to describe:

- actor/action;
- environment;
- important visual transition;
- non-dialogue story information.

The historical-source and narrative bindings can later help generate review candidates for audio-description scripts, still human-owned.

## 10. Color and historical visual style

Historical palettes may be low-contrast or atmospheric. Studio overlays and captions must remain accessible independently of art palette.

Never fix a Studio contrast issue by altering canonical art.

Use UI containers/backplates for readability when needed.

## 11. Accessible promotion/rejection workflow

Promotion is consequential.

Requirements:

- keyboard operable;
- explicit confirmation text;
- clear asset/version being promoted;
- focus returns to meaningful location;
- success/failure announced;
- no timeout-only confirmation.

E2E should cover promotion and rejection with keyboard navigation.

## 12. Accessibility test layers

### Unit

- ARIA/value formatting helpers;
- keyboard command mapping;
- focus-state reducers;
- caption timing helpers.

### Storybook

- accessibility audit;
- keyboard interaction;
- reduced-motion mode;
- zoom/large text stories where useful.

### E2E

- keyboard-only critical workflow;
- reduced-motion emulation;
- focus after dialogs;
- accessible status after long-running proof task;
- responsive/zoom smoke.

### Manual AT

Before major Studio milestone:

- NVDA on Windows at minimum;
- optional JAWS/VoiceOver depending availability;
- keyboard-only review;
- 200% zoom/reflow.

## 13. Animation itself as testable semantic content

Accessibility planning reinforces the V3 semantic model: animation events should have names/intent, not just pixel movement.

Examples:

```text
ENKI_BLINK
ENLIL_FORMAL_ADDRESS
BOAT_HAIL_IMPACT
CITY_TRANSITION_TO_MATURE
```

This semantic structure improves:

- testing;
- provenance;
- potential captions/audio description;
- debugging;
- future accessibility features.

## 14. Phase gate

Any new Studio/Animation Lab UI phase requires locally:

```text
unit
lint
build
Storybook build/test
a11y checks
keyboard interaction tests
focused Playwright E2E
```

Then GitHub Actions repeats the deterministic browser/UI gates.

Manual AT is required at major editor milestones, not every commit.
