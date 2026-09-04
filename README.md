# Visualize Coursework

Interactive demonstrations for concepts covered in coursework, packaged as one
Vercel site with a course directory at `/` and one stable path per course.

## Courses

### AI-1115 Linear Algebra

The current demonstration covers fields and vector spaces. It includes vector
addition, scalar multiplication, spans, complex-number operations, and common
examples of vector spaces. A focused lesson at `/ai1115/functions/` connects
finite-domain functions to ℝ³ and compares ℝ ⊂ ℂ over real versus complex
scalar fields.

Source: [`ai-1115-la/`](ai-1115-la/)

```bash
cd ai-1115-la
npm install
npm run dev
```

From the repository root, run `npm run build` to create the complete production
site in `dist/`. AI-1115 is published at `/ai1115`.

The course palette and interface conventions are documented in
[`ai-1115-la/DESIGN_SYSTEM.md`](ai-1115-la/DESIGN_SYSTEM.md).

### AI-1110 Calculus

The course does not have any demonstrations yet. Its standalone source directory
is ready at [`ai-1110-calc/`](ai-1110-calc/); it is not nested inside the
AI-1115 application.

### AI-1020 Computer Systems

The current demonstration turns nanoseconds into the distance light travels,
making hardware latency easier to visualize.

Source: [`ai-1020-cso/`](ai-1020-cso/)

## Project structure

Each course is kept in its own directory with its own dependencies and build
configuration. Demonstrations within a course share a visual system; other
courses use the same layout principles with a different palette.

```text
visualize-coursework/
├── ai-1020-cso/    # AI-1020 Computer Systems
├── ai-1110-calc/   # AI-1110 Calculus
├── ai-1115-la/     # AI-1115 Linear Algebra
├── scripts/        # Production build tooling
└── site/           # Shared course directory
```

## Deploy to Vercel

Import this repository as one Vercel project and leave **Root Directory** set to
the repository root. The checked-in `vercel.json` supplies the install command,
build command, output directory, redirects, caching, and basic security headers.

Suggested project name: `visualize-coursework`. Vercel will assign a production
URL similar to:

- `visualize-coursework.vercel.app` — course directory
- `visualize-coursework.vercel.app/ai1115` — AI-1115
- `visualize-coursework.vercel.app/ai1110` — reserved for the future AI-1110 app

Vercel's generated domains use `.vercel.app`; they do not provide nested
subdomains such as `ai1115.visualize-coursework.vercel.app`.

For course subdomains, attach a custom domain to the same project in **Settings →
Domains**. For example:

- `learn.example.com` — course directory
- `ai1115.learn.example.com` — AI-1115
- `ai1110.learn.example.com` — AI-1110 when it is ready

The deployment config recognizes any attached hostname beginning with `ai1115.`
and serves the AI-1115 lab at its root. Add the exact subdomain to the Vercel
project (or add a wildcard domain) before expecting DNS to resolve.

## Analytics

Vercel Web Analytics is included on both the course directory and the AI-1115
lab. After the first deployment, open the Vercel project, select **Analytics**,
and click **Enable**. Page views will then appear by path and hostname, including
traffic coming through an `ai1115.*` custom subdomain.

## Production build

```bash
npm ci --prefix ai-1115-la
npm run build
```

Preview `dist/` with any static file server. The AI-1115 Vite base path is
`/ai1115/`, so its versioned assets continue to work from both the main site path
and an `ai1115.*` custom subdomain.
