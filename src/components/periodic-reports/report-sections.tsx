import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface ReportFact {
  label: string;
  value: ReactNode;
}

/** Label / value grid. A missing value renders as an em dash, never as "null". */
export function ReportFactsCard({
  title,
  description,
  facts,
}: {
  title: string;
  description?: string;
  facts: ReportFact[];
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
          {facts.map(({ label, value }) => (
            <div key={label}>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="mt-0.5 text-sm font-medium tabular-nums">
                {value !== null && value !== undefined && value !== "" ? value : "—"}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

/** Long answers (achievements, service description…). Empty ones show the placeholder. */
export function ReportTextCard({
  title,
  entries,
  emptyLabel,
}: {
  title: string;
  entries: { label: string; text: string | null | undefined }[];
  emptyLabel: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {entries.map(({ label, text }) => (
          <div key={label}>
            <h3 className="text-xs text-muted-foreground">{label}</h3>
            <p className="mt-0.5 whitespace-pre-wrap text-sm">
              {text?.trim() ? text : <span className="text-muted-foreground">{emptyLabel}</span>}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/** People with a secondary line (directiva role, honors count…). Hidden when empty. */
export function ReportPeopleCard({
  title,
  people,
  emptyLabel,
}: {
  title: string;
  people: { key: string; primary: string; secondary?: string }[];
  emptyLabel: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {people.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <ul className="divide-y text-sm">
            {people.map((person) => (
              <li key={person.key} className="flex items-baseline justify-between gap-4 py-2">
                <span className="font-medium">{person.primary}</span>
                {person.secondary ? (
                  <span className="text-xs text-muted-foreground">{person.secondary}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
