import { DetailSection, DetailField, DetailCols2, DetailChipList } from "./section";

export interface HealthBlockProps {
  num?: string;
  title: string;
  emptyMessage: string;
  bloodLabel: string;
  bloodValue: string;
  allergiesLabel: string;
  diseasesLabel: string;
  medicinesLabel: string;
  allergies: string[];
  diseases: string[];
  medicines: string[];
  hasPayload: boolean;
}

export function HealthBlock({
  num = "03",
  title,
  emptyMessage,
  bloodLabel,
  bloodValue,
  allergiesLabel,
  diseasesLabel,
  medicinesLabel,
  allergies,
  diseases,
  medicines,
  hasPayload,
}: HealthBlockProps) {
  return (
    <DetailSection num={num} title={title}>
      {!hasPayload ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <DetailCols2>
          <div>
            <DetailField k={bloodLabel} v={bloodValue} />
            <DetailChipList k={allergiesLabel} items={allergies} tone="destructive" />
          </div>
          <div>
            <DetailChipList k={diseasesLabel} items={diseases} tone="warning" />
            <DetailChipList
              k={medicinesLabel}
              items={medicines}
              tone="info"
              className="border-b-0"
            />
          </div>
        </DetailCols2>
      )}
    </DetailSection>
  );
}
