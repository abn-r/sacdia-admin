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
});
