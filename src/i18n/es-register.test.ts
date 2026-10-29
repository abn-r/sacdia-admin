import { describe, expect, it } from "vitest";

import esMessages from "../../messages/es.json";

function collectStrings(value: unknown, path = ""): Array<[string, string]> {
  if (typeof value === "string") return [[path, value]];
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) =>
    collectStrings(child, path ? `${path}.${key}` : key),
  );
}

// Spanish copy addresses the user as "tú", never "usted".
const USTED_FORMS =
  /(^|[\s«"¿¡(])(Ingrese|Seleccione|Verifique|Intente|Escriba|Elija|Agregue|Revise|Espere|Contacte|Complete|Haga|Utilice|Consulte|Cargue|Suba|Presione|Pulse|Busque|Confirme|Indique|Introduzca|Reintente)(?=[\s.,:;!?»"]|$)|\bNo tiene permisos? para\b|\bPuede continuar\b|\bdebe capturar\b/;

describe("es.json register", () => {
  it("uses the informal tú form instead of usted", () => {
    const offenders = collectStrings(esMessages)
      .filter(([, text]) => USTED_FORMS.test(text))
      .map(([key, text]) => `${key}: ${text}`);

    expect(offenders).toEqual([]);
  });

  it("keeps the gender of clasificación(es) and avoids the anglicism ranking in labels", () => {
    const slips = collectStrings(esMessages)
      .filter(([, text]) =>
        /\b(el|un|este|ese|del) clasificación\b|\bclasificaciones \w+ados\b|\bclasificación \w+ado\b/i.test(text),
      )
      .map(([key, text]) => `${key}: ${text}`);

    expect(slips).toEqual([]);
  });
});
