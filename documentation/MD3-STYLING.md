# Reel Forge MD3 Styling Contract

Reel Forge uses an MD3-compatible stylesheet architecture without requiring Angular Material components.

## Sheet structure

- `apps/web/src/md3.scss` — global entry point.
- `apps/web/src/styles/md3/_tokens.scss` — semantic color roles, typography scale, shape, spacing, motion, and elevation tokens.
- `apps/web/src/styles/md3/_base.scss` — page surfaces, typography primitives, links, focus treatment, and reduced-motion behavior.
- `apps/web/src/styles/md3/_components.scss` — reusable cards, buttons, chips, top app bar, navigation pills, breadcrumbs, stats, and section headers.
- `apps/web/src/styles/md3/_layout.scss` — container, grid, stack, cluster, section, padding, and responsive layout utilities.
- View-specific global sheets such as `studio-home-visuals.scss` are reserved for decorative compositions that are not reusable MD3 components.

## Component rule

Component SCSS should contain only what is unique to that view:

1. page-specific grid geometry;
2. artwork or decorative composition;
3. one-off responsive behavior that cannot be expressed with a shared layout utility;
4. state layout that is genuinely domain-specific.

Do not redefine buttons, cards, chips, typography, focus rings, elevation, border radii, or semantic colors inside a component. Use MD3 classes and tokens instead.

## Theme rule

Use `md3-page` on application surfaces and add `md3-theme-dark` when a view uses the dark Studio theme. Components must use semantic token roles such as:

- `--md-sys-color-primary`
- `--md-sys-color-surface-container-low`
- `--md-sys-color-on-surface-variant`
- `--md-sys-shape-corner-large`
- `--md-sys-elevation-level2`
- `--md-sys-space-6`

Avoid literal colors in component styles unless the color belongs to unique artwork or brand decoration.

## Preferred composition

```html
<main class="md3-page md3-theme-dark">
  <section class="md3-container md3-section">
    <header class="md3-section-header">
      <div>
        <p class="md3-label">Section label</p>
        <h2 class="md3-headline-medium">Section title</h2>
      </div>
    </header>

    <div class="md3-grid md3-grid--3">
      <article class="md3-card md3-card--elevated md3-pad-6">
        <h3 class="md3-title-large">Card title</h3>
        <p class="md3-body-medium">Card content.</p>
        <a class="md3-button md3-button--filled" href="...">Open</a>
      </article>
    </div>
  </section>
</main>
```

## Style budget

The Angular production build keeps the existing component stylesheet guardrail:

- warning at 7 KB;
- error at 8 KB.

The shared MD3 sheets are intentionally global so reusable styles are paid for once. A component approaching the warning threshold is a signal to extract a reusable pattern instead of increasing the budget.
