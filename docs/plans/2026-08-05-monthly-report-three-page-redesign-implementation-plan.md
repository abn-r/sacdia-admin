# Monthly Report Three-Page Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the editable monthly report into exactly three spacious Letter portrait pages, remove colored metric side borders, and expose blank and populated preview variants.

**Architecture:** Keep `MonthlyReport` as the single semantic client-side form and redistribute its existing sections across three `article` page containers. Add a typed example-data factory beside the empty-data factory, and let the protected printable route select the initial fixture from the `example=1` query parameter without adding persistence.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, CSS Modules, Vitest, React Testing Library, native browser printing.

---

### Task 1: Specify three-page behavior and example data

**Files:**
- Modify: `src/components/reports/monthly-report/monthly-report.test.tsx`
- Modify: `src/components/reports/monthly-report/monthly-report.types.ts`

**Step 1: Write the failing page-distribution test**

Update the semantic document test to require three page articles and assert section ownership:

```tsx
expect(screen.getByLabelText("Página 1 de 3")).toHaveTextContent("ADMINISTRACIÓN");
expect(screen.getByLabelText("Página 1 de 3")).toHaveTextContent("ENSEÑANZAS");
expect(screen.getByLabelText("Página 2 de 3")).toHaveTextContent("ACTIVIDADES DEL CLUB");
expect(screen.getByLabelText("Página 2 de 3")).toHaveTextContent("FINANZAS");
expect(screen.getByLabelText("Página 3 de 3")).toHaveTextContent("ACTIVIDAD MISIONERA");
expect(screen.getByLabelText("Página 3 de 3")).toHaveTextContent("SERVICIO");
expect(screen.getByLabelText("Página 3 de 3")).toHaveAccessibleName("Página 3 de 3");
```

**Step 2: Write the failing fixture test**

```tsx
it("renders representative values from the populated example", () => {
  render(<MonthlyReport initialData={createExampleMonthlyReportData()} />);
  expect(screen.getAllByDisplayValue("Distrito Central")).toHaveLength(3);
  expect(screen.getByDisplayValue("Club Centinelas del Valle")).toBeInTheDocument();
  expect(screen.getByDisplayValue("Campaña de recolección")).toBeInTheDocument();
});
```

**Step 3: Run the focused test and verify RED**

Run:

```bash
pnpm exec vitest run src/components/reports/monthly-report/monthly-report.test.tsx --exclude '**/.worktrees/**'
```

Expected: FAIL because page 3 and `createExampleMonthlyReportData` do not exist.

**Step 4: Add the typed example-data factory**

Add `createExampleMonthlyReportData(): MonthlyReportData` with realistic values for all metadata, sections, tables, indicators, and signatures. Keep table data inside the existing shapes and ISO dates in date inputs.

**Step 5: Commit**

```bash
git add src/components/reports/monthly-report/monthly-report.test.tsx src/components/reports/monthly-report/monthly-report.types.ts
git commit -m "test(reports): specify three-page monthly report"
```

### Task 2: Redistribute the semantic report into three pages

**Files:**
- Modify: `src/components/reports/monthly-report/monthly-report.tsx`
- Test: `src/components/reports/monthly-report/monthly-report.test.tsx`

**Step 1: Move sections into approved page containers**

- Page 1: `DocumentHeader(page={1}, totalPages={3})`, Administration, Teachings, footer.
- Page 2: `DocumentHeader(page={2}, totalPages={3})`, Club Activities, Finances, footer.
- Page 3: `DocumentHeader(page={3}, totalPages={3})`, Missionary Activity, Service, Signatures, footer.

Keep one `<form>` and shared state so repeated metadata fields remain synchronized across all pages.

**Step 2: Run the focused test and verify GREEN**

Run:

```bash
pnpm exec vitest run src/components/reports/monthly-report/monthly-report.test.tsx --exclude '**/.worktrees/**'
```

Expected: all component tests pass.

**Step 3: Commit**

```bash
git add src/components/reports/monthly-report/monthly-report.tsx src/components/reports/monthly-report/monthly-report.test.tsx
git commit -m "refactor(reports): distribute monthly report across three pages"
```

### Task 3: Remove side accents and introduce vertical rhythm

**Files:**
- Modify: `src/components/reports/monthly-report/monthly-report.module.css`
- Modify: `src/components/reports/monthly-report/monthly-report.test.tsx`

**Step 1: Add a failing source-level style regression test**

Read the CSS module as text and assert the metric-card rule does not contain `border-left` and section/page rules do not use negative margins or positioning.

**Step 2: Run the test and verify RED**

Expected: FAIL because `.metricCard` currently uses a 1 mm colored left border.

**Step 3: Implement the spacing system**

- Give `.documentHeader` intrinsic content height plus a reserved bottom gap.
- Give `.pageContent` a predictable grid with section gaps.
- Replace `.metricCard` side border with `border: 0.25mm solid var(--sac-border)`.
- Remove `border-left-color` from metric tone classes; keep tone classes for icon color only.
- Increase neutral card padding and input/table row height.
- Allocate page-specific flexible space without clipping.
- Keep `break-after: page` on pages 1 and 2 only.
- Update print selectors from two pages to three.

**Step 4: Run tests and verify GREEN**

Run:

```bash
pnpm exec vitest run src/components/reports/monthly-report/monthly-report.test.tsx --exclude '**/.worktrees/**'
```

Expected: all tests pass.

**Step 5: Commit**

```bash
git add src/components/reports/monthly-report/monthly-report.module.css src/components/reports/monthly-report/monthly-report.test.tsx
git commit -m "fix(reports): prevent monthly report layout collisions"
```

### Task 4: Expose the populated preview variant

**Files:**
- Modify: `src/app/(printable)/reports/monthly-preview/page.tsx`
- Modify: `src/components/reports/monthly-report/monthly-report.test.tsx`

**Step 1: Add a route-selection unit seam**

Export a small pure helper:

```ts
export function shouldUseMonthlyReportExample(value: string | string[] | undefined) {
  return value === "1";
}
```

Test `undefined`, `"0"`, `"1"`, and array input before wiring it into the route.

**Step 2: Run the test and verify RED**

Expected: FAIL because the helper does not exist.

**Step 3: Select initial data from `searchParams`**

Keep `requireAdminUser()`, resolve `searchParams`, and pass either `createExampleMonthlyReportData()` or no `initialData` to `MonthlyReport`.

**Step 4: Run the focused tests and verify GREEN**

Run the component and route helper tests. Expected: all pass.

**Step 5: Commit**

```bash
git add 'src/app/(printable)/reports/monthly-preview/page.tsx' src/components/reports/monthly-report/monthly-report.test.tsx
git commit -m "feat(reports): add populated monthly report preview"
```

### Task 5: Documentation and visual verification

**Files:**
- Modify: `src/components/reports/monthly-report/README.md`
- Modify: workspace `docs/features/monthly-reports.md` in its isolated docs branch/worktree
- Create outside git: blank and populated screenshots under the Codex visualizations directory

**Step 1: Update documentation**

Document exactly three pages, the new page distribution, blank/example URLs, absence of persistence, print settings, and required official logo paths.

**Step 2: Run non-build verification**

Run:

```bash
pnpm exec vitest run src/components/reports/monthly-report/monthly-report.test.tsx --exclude '**/.worktrees/**'
pnpm exec eslint src/components/reports/monthly-report 'src/app/(printable)/reports/monthly-preview/page.tsx'
pnpm exec tsc --noEmit
git diff --check
```

Do not run `pnpm build`.

**Step 3: Run local visual inspection**

Start `pnpm dev`, render blank and `?example=1` variants through a temporary local-only auth-free route, and capture full-page screenshots. Remove the temporary route before final status.

Verify visually:

- three complete Letter portrait pages per variant;
- no overlap between metadata and section headers;
- no colored metric side borders;
- readable table rows and form values;
- print button hidden in print media;
- no content clipped at any page edge.

**Step 4: Commit documentation**

```bash
git add src/components/reports/monthly-report/README.md
git commit -m "docs(reports): document three-page monthly preview"
```

