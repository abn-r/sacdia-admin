import type { ReactNode } from "react";
import { DetailCols2, DetailField, DetailSection } from "./section";

export interface DataTabField {
  k: string;
  v: ReactNode;
  muted?: boolean;
}

export interface DataTabGroup {
  title: string;
  /** Two columns; fields are split in half in order. */
  fields: DataTabField[];
}

/**
 * Datos: the single place for identity, location and record dates. Union and
 * Campo local appear once (the old "Alcance" group repeated them).
 */
export function UserDetailDataTab({ groups }: { groups: DataTabGroup[] }) {
  return (
    <div className="space-y-6">
      {groups.map((group) => {
        const half = Math.ceil(group.fields.length / 2);
        const columns = [group.fields.slice(0, half), group.fields.slice(half)];
        return (
          <DetailSection key={group.title} title={group.title}>
            <DetailCols2>
              {columns.map((column, idx) => (
                <div key={idx}>
                  {column.map((field) => (
                    <DetailField key={field.k} k={field.k} v={field.v} muted={field.muted} />
                  ))}
                </div>
              ))}
            </DetailCols2>
          </DetailSection>
        );
      })}
    </div>
  );
}
