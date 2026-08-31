# Field + Vector Space Lab

An interactive Three.js explainer for AI-1115 Linear Algebra. It includes:

- vector addition, scalar multiplication, and span in ℝ³;
- complex-field addition, multiplication, and inverses;
- live equations, camera controls, and concise axiom references;
- responsive desktop, tablet, and mobile layouts.

The standalone lesson at `public/functions/` adds two connected explainers:

- functions on a three-element set as vectors in ℝ³, with pointwise addition,
  scalar multiplication, zero, and inverses;
- why ℝ is a subspace of ℂ over ℝ but not over ℂ.

The lesson uses browser-native ES modules and CDN-hosted Three.js/KaTeX, so its
three files can also be served directly without a bundling step.

## Run locally

```bash
npm install
npm run dev
```

Create a production build with `npm run build`.

All AI-1115 experiments follow the shared [visual language](DESIGN_SYSTEM.md).
