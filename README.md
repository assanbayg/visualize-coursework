# Visualizing Coursework

Interactive demonstrations for concepts covered in coursework.

## Courses

### AI-1115 Linear Algebra

The current demonstration covers fields and vector spaces. It includes vector
addition, scalar multiplication, spans, complex-number operations, and common
examples of vector spaces.

Source: [`ai-1115-la/`](ai-1115-la/)

```bash
cd ai-1115-la
npm install
npm run dev
```

Run `npm run build` to create a production build in `ai-1115-la/dist`.

The course palette and interface conventions are documented in
[`ai-1115-la/DESIGN_SYSTEM.md`](ai-1115-la/DESIGN_SYSTEM.md).

### AI-1110 Calculus

Not started.

## Project structure

Each course is kept in its own directory with its own dependencies and build
configuration. Demonstrations within a course share a visual system; other
courses use the same layout principles with a different palette.
