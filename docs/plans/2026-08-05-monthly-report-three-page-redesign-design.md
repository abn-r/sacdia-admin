# Monthly Report Three-Page Redesign

**Date:** 2026-08-05
**Status:** Approved

## Problem

The printable monthly report currently compresses its header and first section into the same vertical boundary. The fixed 47 mm header has no residual spacing, so `Mes / Año` visually collides with the first numbered section. Metric cards also use colored left borders that the product owner explicitly rejected.

## Constraints

- Exactly three Letter portrait pages at 100% print scale.
- Semantic, selectable HTML; no canvas, screenshots, rasterized backgrounds, or CDN dependencies.
- Editable on screen and printable through the native browser dialog.
- Page controls hidden during printing.
- Header and footer repeated on all three pages.
- Official local brand assets remain required.
- Existing fields, sections, table headings, minimum blank rows, accessibility labels, and SAC color tokens remain intact.

## Approved Page Distribution

1. **Page 1:** Administration and Teachings.
2. **Page 2:** Club Activities and Finances.
3. **Page 3:** Missionary Activity, Service, and Signatures.

This preserves numerical and business order while balancing estimated content height across pages.

## Visual Structure

- Reserve explicit spacing between the metadata header and page content.
- Keep every numbered section in normal document flow; do not use overlapping or negative positioning.
- Replace colored metric side accents with a complete neutral border.
- Retain restrained color only in icons, numbered section markers, and soft panel headers.
- Increase section gaps, internal padding, input height, textarea height, and table row height where the third page budget permits.
- Use consistent vertical rhythm rather than per-section fixed heights that exactly consume the available page.
- Preserve visible keyboard focus and grayscale-readable Yes/No controls.

## Preview Variants

- `/reports/monthly-preview` renders the blank editable form.
- `/reports/monthly-preview?example=1` renders the same component initialized with realistic example data.
- Example data is a typed local fixture and does not introduce persistence or imply backend compatibility.

## Validation

- Component tests assert exactly three pages and the approved section distribution.
- Tests assert the example fixture renders representative content.
- CSS/source checks assert metric cards no longer declare a colored left border.
- Browser screenshots cover both blank and populated variants.
- Print validation checks Letter portrait page dimensions and confirms no clipped or overlapping content.

