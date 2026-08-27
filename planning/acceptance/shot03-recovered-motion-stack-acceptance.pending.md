# Shot 3 Recovered Motion Stack Acceptance - Pending

## Current Review Packet

Generate the latest packet with:

```text
node tools/scripts/shot03-recovered-motion-decision-packet.mjs
```

The packet compares the current review-ready options:

- `primary` - recovered camera + vessel + Enki rigid-group motion;
- `counterSway` - primary motion plus Enki local counter-sway/body-settle;
- `breath` - counter-sway plus bounded breathe-calm deformation;
- `reject-all` - preserve the current lower-capability baseline and do not promote a new stack.

## Deferred Lanes

Do not use this receipt to accept or revive:

- blink;
- Shot 3 water extraction;
- Shot 3 rigging extraction.

Those lanes remain deferred until new source-supported evidence exists.

## Required Human Review

Before creating an accepted JSON receipt, a reviewer must watch the normal-speed
videos in the generated decision packet and choose exactly one stack.

Minimum acceptance conditions:

- the selected stack is visibly preferable to the simpler control at normal speed;
- Enki remains planted to the vessel;
- no boat, background, water, rigging, or repaired-background fragments move with Enki incorrectly;
- no holes, halos, doubled edges, rubbery pulse, or theatrical movement are introduced;
- built-in AI review may be used only as advisory evidence, not as acceptance.

## Accepted Receipt Target

Only create this file after human review:

```text
planning/acceptance/shot03-recovered-motion-stack-acceptance.json
```

Required fields:

```json
{
  "schemaVersion": 1,
  "type": "shot03-recovered-motion-stack-acceptance",
  "sourceShot": 3,
  "decision": "accepted",
  "selectedStack": "primary | counterSway | breath",
  "reviewedDecisionPacketPath": "tmp/animation-previews/shot03-recovered-motion-decision-packet/<timestamp>/shot03-recovered-motion-decision-packet.json",
  "reviewedDecisionPacketSha256": "sha256:<hash>",
  "normalSpeedReview": true,
  "humanReviewer": "<name or initials>",
  "acceptedBecause": [
    "..."
  ],
  "rejectedAlternatives": [
    {
      "stack": "primary | counterSway | breath",
      "reason": "..."
    }
  ],
  "deferredLanesRemainDeferred": [
    "blink",
    "water",
    "rigging"
  ],
  "automaticPromotionAllowed": false
}
```

If no option is clearly better, do not create the accepted receipt. Add a
dated rejection note instead.
