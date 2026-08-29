# AI-1115 Visual Language

This document is the design source of truth for every AI-1115 experiment,
demonstration, and interactive note.

## Core palette

| Role | Token | Value | Usage |
| --- | --- | --- | --- |
| Deep background | `--course-bg-deep` | `#08171b` | Page background and darkest depth |
| Scene background | `--course-bg-scene` | `#0b1d21` | Three.js canvases and visual stages |
| Raised background | `--course-bg-raised` | `#0d2227` | Gradients and elevated dark surfaces |
| Dark ink | `--course-ink` | `#102a30` | Text on light panels |
| Warm paper | `--course-paper` | `#f2f0e8` | Controls and reading surfaces |
| Primary accent | `--course-orange` | `#ff7043` | First vector, active concepts, key labels |
| Secondary accent | `--course-mint` | `#47c9ae` | Second vector, success, closure |
| Result accent | `--course-yellow` | `#f1c75b` | Results, combinations, derived objects |
| Cool accent | `--course-blue` | `#93aeea` | Fourth categories and supporting concepts |
| Muted text | `--course-muted` | `#819696` | Secondary descriptions on dark surfaces |
| Grid | `--course-grid` | `#315057` | Three.js grids and coordinate guides |

Use orange for the first/input object, mint for the second, and yellow for a
computed result. Preserve this semantic mapping across all AI-1115 visuals.

## Visual grammar

- Dark, spatial canvas with warm off-white control panels.
- Manrope for interface copy; DM Mono for equations, values, coordinates, and labels.
- Compact uppercase eyebrow labels with generous letter spacing.
- Thin, low-contrast borders; small corner radii; restrained translucent surfaces.
- One dominant interactive demonstration per section.
- Live equations and status belong near the visualization they describe.
- Motion should explain a transformation, not decorate the interface.
- Controls should be compact, direct, and usable without instructions.
- Layouts must work at desktop, tablet, and 320 px mobile widths.

## Three.js conventions

- Scene background: `#0b1d21`.
- Grid lines: `#315057`, with secondary lines near `#17353b`.
- First object/vector: `#ff7043`.
- Second object/vector: `#47c9ae`.
- Result, span, or transformed object: `#f1c75b`.
- Use fog, subtle hemispheric light, and one warm key light for depth.
- Orbit and zoom should be available unless they interfere with the concept.
- Cap device pixel ratio at `2` for predictable performance.

## Other courses

Other courses should reuse the same typography, spacing, component shapes,
interaction patterns, and information hierarchy. Give each course a slightly
different palette so it has its own identity; do not change the underlying
design language.

When starting another course, define its palette as semantic tokens first:

```css
:root {
  --course-bg-deep: /* darkest page background */;
  --course-bg-scene: /* interactive stage */;
  --course-paper: /* light control surface */;
  --course-primary: /* first object / key concept */;
  --course-secondary: /* second object / supporting concept */;
  --course-result: /* computed result */;
}
```

Do not copy AI-1115 accent colors unchanged into another course unless the user
explicitly requests it.
