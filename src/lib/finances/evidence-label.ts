/** Etiqueta legible en UI; el archivo en servidor conserva su nombre original. */
export function financeEvidenceDisplayLabel(
  index: number,
  translate: (key: "evidenceViewer.itemLabel", values: { n: number }) => string,
): string {
  return translate("evidenceViewer.itemLabel", { n: index });
}
