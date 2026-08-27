# Shot 3 recovered motion stack — acceptance record

Status: **CURRENT BASELINE RECORDED; NO NEW PROMOTION**

This document records the current human-review authority for the recovered Shot 3 motion experiments. It is not a new acceptance event and it does not promote any candidate into canonical production assets.

## Current baseline

`counter-sway` — recovered primary motion plus bounded Enki local counter-sway/body-settle.

The existing normal-speed human review preferred this stack over the breathe-calm experiment. Treat it as the current Shot 3 motion baseline unless a later explicit human review supersedes it.

## Historical references

- `primary` — accepted earlier recovered camera + vessel/Enki rigid-group motion; retained as comparison/reference.
- `breath` — technically green historical reference; **human rejected relative to counter-sway**. Do not reopen automatically.
- blink — rejected/deferred; technically isolated attempts were not human-readable at normal speed.
- Shot 3 water extraction — rejected/deferred; source decomposition was not trustworthy.
- Shot 3 rigging extraction — rejected/deferred; no trustworthy source-safe survivor.

## Review tooling

```sh
pnpm animation:shot3:motion-decision-packet
pnpm animation:shot3:motion-review-montage
```

Both commands are evidence/review tools. They cannot promote a candidate and the montage may include rejected historical references only to make the human decision history obvious.

## Future acceptance changes

A later change to the baseline requires:

1. a technically passing deterministic proof receipt;
2. normal-speed human review;
3. an explicit human accept/reject decision;
4. an updated acceptance record that names the superseded baseline;
5. normal promotion safeguards if canonical assets are changed.

AI advisory review is useful evidence but never substitutes for the human decision.
