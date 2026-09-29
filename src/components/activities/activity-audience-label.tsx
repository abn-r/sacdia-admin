import type { Activity } from "@/lib/api/activities";

const ASSET_CODE = /^(AV|CQ|GM)-\d{2}$/;

export function activityAudienceText(
  activity: Activity,
  labels: { all: string; board: string; classes: string },
): string {
  if (activity.audience === "board") return labels.board;
  if (activity.audience === "classes") {
    const names = (activity.audience_classes ?? [])
      .map((item) => item.name.trim())
      .filter((name) => name.length > 0);
    if (names.length > 0) return names.join(", ");
    return labels.classes;
  }
  return labels.all;
}

export function ActivityAudienceValue({
  activity,
  labels,
  withLogos = false,
}: {
  activity: Activity;
  labels: { all: string; board: string; classes: string };
  withLogos?: boolean;
}) {
  const classes = activity.audience_classes ?? [];
  if (withLogos && activity.audience === "classes" && classes.length > 0) {
    return (
      <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {classes.map((item) => {
          const code = item.asset_code?.trim().toUpperCase();
          const logo = code && ASSET_CODE.test(code) ? `/img/logos-clases/${code}.png` : null;
          return (
            <span key={item.class_id} className="inline-flex items-center gap-1.5">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt="" className="size-7 object-contain" />
              ) : null}
              <span>{item.name}</span>
            </span>
          );
        })}
      </span>
    );
  }

  return <span>{activityAudienceText(activity, labels)}</span>;
}
