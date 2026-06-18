"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Power, PowerOff, Route, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";
import {
  assignDistrictToCoordinationZone,
  createCoordinationZone,
  createCoordinatorAssignment,
  removeDistrictFromCoordinationZone,
  updateCoordinationZone,
  updateCoordinatorAssignment,
  type CoordinationZone,
  type CoordinatorAssignment,
  type CoordinatorAssignmentType,
} from "@/lib/api/coordination";
import { cn } from "@/lib/utils";

type LocalFieldOption = { local_field_id: number; name: string };
type DistrictOption = {
  district_id?: number;
  districlub_type_id?: number;
  name: string;
  active?: boolean;
};
type ClubTypeOption = { club_type_id: number; name: string };
type CoordinatorUserOption = {
  user_id: string;
  full_name?: string | null;
  name?: string | null;
  paternal_last_name?: string | null;
  maternal_last_name?: string | null;
  email?: string | null;
};
type ClubSectionOption = {
  club_section_id: number;
  name?: string | null;
  active?: boolean;
  club_id: number;
  club_name: string;
  club_type_id?: number | null;
  club_type_name?: string | null;
};

type Props = {
  localFields: LocalFieldOption[];
  selectedLocalFieldId: number;
  zones: CoordinationZone[];
  assignments: CoordinatorAssignment[];
  districts: DistrictOption[];
  clubTypes: ClubTypeOption[];
  coordinatorUsers: CoordinatorUserOption[];
  clubSections: ClubSectionOption[];
  canChangeLocalField: boolean;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

function getDistrictId(district: DistrictOption) {
  return district.district_id ?? district.districlub_type_id ?? 0;
}

function userLabel(user: CoordinatorUserOption) {
  const fullName =
    user.full_name ??
    [user.name, user.paternal_last_name, user.maternal_last_name]
      .filter(Boolean)
      .join(" ");
  return fullName || user.email || user.user_id;
}

type AssignmentTargetLabels = {
  allLocalField: string;
  zoneFallback: (id: number | null | undefined) => string;
  clubTypeFallback: (id: number | null | undefined) => string;
  clubFallback: string;
  sectionFallback: (id: number | null | undefined) => string;
};

function assignmentTarget(
  assignment: CoordinatorAssignment,
  labels: AssignmentTargetLabels,
) {
  if (assignment.assignment_type === "GENERAL") return labels.allLocalField;
  if (assignment.assignment_type === "ZONE") {
    return `${assignment.coordination_zones?.name ?? labels.zoneFallback(assignment.zone_id)} · ${assignment.club_types?.name ?? labels.clubTypeFallback(assignment.club_type_id)}`;
  }
  const section = assignment.club_sections;
  return `${section?.clubs?.name ?? labels.clubFallback} · ${section?.name ?? section?.club_types?.name ?? labels.sectionFallback(assignment.club_section_id)}`;
}

export function CoordinationAdminClient({
  localFields,
  selectedLocalFieldId,
  zones,
  assignments,
  districts,
  clubTypes,
  coordinatorUsers,
  clubSections,
  canChangeLocalField,
}: Props) {
  const router = useRouter();
  const t = useTranslations("coordinationAdmin");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [zoneName, setZoneName] = useState("");
  const [zoneDescription, setZoneDescription] = useState("");
  const [districtZoneId, setDistrictZoneId] = useState<string>("");
  const [districtId, setDistrictId] = useState<string>("");

  const [assignmentType, setAssignmentType] =
    useState<CoordinatorAssignmentType>("ZONE");
  const [assignmentUserId, setAssignmentUserId] = useState("");
  const [assignmentZoneId, setAssignmentZoneId] = useState("");
  const [assignmentClubTypeId, setAssignmentClubTypeId] = useState("");
  const [assignmentSectionId, setAssignmentSectionId] = useState("");

  const activeZones = useMemo(
    () => zones.filter((zone) => zone.active),
    [zones],
  );

  const assignmentLabels = useMemo<Record<CoordinatorAssignmentType, string>>(
    () => ({
      GENERAL: t("assignmentTypes.general"),
      ZONE: t("assignmentTypes.zone"),
      SECTION: t("assignmentTypes.section"),
    }),
    [t],
  );

  const targetLabels = useMemo<AssignmentTargetLabels>(
    () => ({
      allLocalField: t("targets.allLocalField"),
      zoneFallback: (id) => t("targets.zoneFallback", { id: id ?? "—" }),
      clubTypeFallback: (id) =>
        t("targets.clubTypeFallback", { id: id ?? "—" }),
      clubFallback: t("targets.clubFallback"),
      sectionFallback: (id) => t("targets.sectionFallback", { id: id ?? "—" }),
    }),
    [t],
  );

  const runMutation = (fn: () => Promise<unknown>, successMessage: string) => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        await fn();
        setMessage(successMessage);
        router.refresh();
      } catch (err) {
        setError(getErrorMessage(err, t("errors.generic")));
      }
    });
  };

  const handleCreateZone = () => {
    const name = zoneName.trim();
    if (!name) {
      setError(t("errors.zoneNameRequired"));
      return;
    }

    runMutation(
      async () => {
        await createCoordinationZone(selectedLocalFieldId, {
          name,
          description: zoneDescription.trim() || undefined,
        });
        setZoneName("");
        setZoneDescription("");
      },
      t("success.zoneCreated"),
    );
  };

  const handleAssignDistrict = () => {
    if (!districtZoneId || !districtId) {
      setError(t("errors.zoneAndDistrictRequired"));
      return;
    }

    runMutation(
      () => assignDistrictToCoordinationZone(Number(districtZoneId), Number(districtId)),
      t("success.districtAssigned"),
    );
  };

  const handleCreateAssignment = () => {
    if (!assignmentUserId) {
      setError(t("errors.coordinatorRequired"));
      return;
    }

    const payload = {
      user_id: assignmentUserId,
      assignment_type: assignmentType,
      ...(assignmentType === "ZONE"
        ? {
            zone_id: Number(assignmentZoneId),
            club_type_id: Number(assignmentClubTypeId),
          }
        : {}),
      ...(assignmentType === "SECTION"
        ? { club_section_id: Number(assignmentSectionId) }
        : {}),
    };

    if (
      (assignmentType === "ZONE" && (!assignmentZoneId || !assignmentClubTypeId)) ||
      (assignmentType === "SECTION" && !assignmentSectionId)
    ) {
      setError(t("errors.assignmentScopeRequired"));
      return;
    }

    runMutation(
      async () => {
        await createCoordinatorAssignment(selectedLocalFieldId, payload);
        setAssignmentUserId("");
        setAssignmentZoneId("");
        setAssignmentClubTypeId("");
        setAssignmentSectionId("");
      },
      t("success.assignmentCreated"),
    );
  };

  return (
    <div className="space-y-6">
      {(error || message) && (
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-sm",
            error
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-success/30 bg-success/10 text-success-foreground",
          )}
        >
          {error ?? message}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("localField.title")}</CardTitle>
          <CardDescription>
            {t("localField.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={String(selectedLocalFieldId)}
            disabled={!canChangeLocalField || isPending}
            onValueChange={(value) => {
              router.push(`/dashboard/coordination?localFieldId=${value}`);
            }}
          >
            <SelectTrigger className="w-full sm:w-80">
              <SelectValue placeholder={t("localField.placeholder")} />
            </SelectTrigger>
            <SelectContent>
              {localFields.map((localField) => (
                <SelectItem
                  key={localField.local_field_id}
                  value={String(localField.local_field_id)}
                >
                  {localField.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Route className="size-5" /> {t("zones.title")}
            </CardTitle>
            <CardDescription>
              {t("zones.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <div className="space-y-2">
                <Label htmlFor="zone-name">{t("fields.name")}</Label>
                <Input
                  id="zone-name"
                  value={zoneName}
                  onChange={(event) => setZoneName(event.target.value)}
                  placeholder={t("zones.namePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zone-description">{t("fields.description")}</Label>
                <Input
                  id="zone-description"
                  value={zoneDescription}
                  onChange={(event) => setZoneDescription(event.target.value)}
                  placeholder={t("zones.descriptionPlaceholder")}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleCreateZone} disabled={isPending}>
                  <Plus className="size-4" /> {t("actions.createZone")}
                </Button>
              </div>
            </div>

            <div className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1fr_1fr_auto]">
              <div className="space-y-2">
                <Label>{t("fields.zone")}</Label>
                <Select value={districtZoneId} onValueChange={setDistrictZoneId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("fields.selectZone")} />
                  </SelectTrigger>
                  <SelectContent>
                    {activeZones.map((zone) => (
                      <SelectItem key={zone.zone_id} value={String(zone.zone_id)}>
                        {zone.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("fields.district")}</Label>
                <Select value={districtId} onValueChange={setDistrictId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("fields.selectDistrict")} />
                  </SelectTrigger>
                  <SelectContent>
                    {districts.map((district) => (
                      <SelectItem
                        key={getDistrictId(district)}
                        value={String(getDistrictId(district))}
                      >
                        {district.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="secondary" onClick={handleAssignDistrict} disabled={isPending}>
                  {t("actions.assignDistrict")}
                </Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("fields.zone")}</TableHead>
                  <TableHead>{t("fields.districts")}</TableHead>
                  <TableHead>{t("fields.status")}</TableHead>
                  <TableHead className="text-right">{t("fields.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zones.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      {t("zones.empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  zones.map((zone) => (
                    <TableRow key={zone.zone_id}>
                      <TableCell className="font-medium">{zone.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(zone.districts ?? []).filter((item) => item.active).length === 0 ? (
                            <span className="text-muted-foreground">{t("zones.noDistricts")}</span>
                          ) : (
                            (zone.districts ?? [])
                              .filter((item) => item.active)
                              .map((item) => (
                                <Badge key={item.zone_district_id} variant="secondary" className="gap-1">
                                  {item.districts?.name ?? item.districlub_type_id}
                                  <button
                                    type="button"
                                    className="ml-1 text-muted-foreground hover:text-destructive"
                                    onClick={() =>
                                      runMutation(
                                        () => removeDistrictFromCoordinationZone(zone.zone_id, item.districlub_type_id),
                                        t("success.districtRemoved"),
                                      )
                                    }
                                  >
                                    ×
                                  </button>
                                </Badge>
                              ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={zone.active ? "default" : "secondary"}>
                          {zone.active ? t("status.active") : t("status.inactive")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            runMutation(
                              () => updateCoordinationZone(zone.zone_id, { active: !zone.active }),
                              zone.active ? t("success.zoneDeactivated") : t("success.zoneActivated"),
                            )
                          }
                          disabled={isPending}
                        >
                          {zone.active ? <PowerOff className="size-4" /> : <Power className="size-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-5" /> {t("assignments.newTitle")}
            </CardTitle>
            <CardDescription>
              {t("assignments.newDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t("fields.coordinator")}</Label>
              <Select value={assignmentUserId} onValueChange={setAssignmentUserId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("fields.selectUser")} />
                </SelectTrigger>
                <SelectContent>
                  {coordinatorUsers.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {userLabel(user)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("fields.type")}</Label>
              <Select
                value={assignmentType}
                onValueChange={(value) => setAssignmentType(value as CoordinatorAssignmentType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(assignmentLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {assignmentType === "ZONE" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("fields.zone")}</Label>
                  <Select value={assignmentZoneId} onValueChange={setAssignmentZoneId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("fields.zone")} />
                    </SelectTrigger>
                    <SelectContent>
                      {activeZones.map((zone) => (
                        <SelectItem key={zone.zone_id} value={String(zone.zone_id)}>
                          {zone.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("fields.section")}</Label>
                  <Select value={assignmentClubTypeId} onValueChange={setAssignmentClubTypeId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("fields.type")} />
                    </SelectTrigger>
                    <SelectContent>
                      {clubTypes.map((clubType) => (
                        <SelectItem key={clubType.club_type_id} value={String(clubType.club_type_id)}>
                          {clubType.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {assignmentType === "SECTION" && (
              <div className="space-y-2">
                <Label>{t("fields.clubSection")}</Label>
                <Select value={assignmentSectionId} onValueChange={setAssignmentSectionId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("fields.selectSection")} />
                  </SelectTrigger>
                  <SelectContent>
                    {clubSections.map((section) => (
                      <SelectItem key={section.club_section_id} value={String(section.club_section_id)}>
                        {section.club_name} · {section.name ?? section.club_type_name ?? section.club_section_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button className="w-full" onClick={handleCreateAssignment} disabled={isPending}>
              {t("actions.createAssignment")}
            </Button>
            <Textarea
              readOnly
              value={t("assignments.directorConflictRule")}
              className="min-h-20 resize-none text-xs text-muted-foreground"
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("assignments.title")}</CardTitle>
          <CardDescription>
            {t("assignments.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("fields.coordinator")}</TableHead>
                <TableHead>{t("fields.type")}</TableHead>
                <TableHead>{t("fields.scope")}</TableHead>
                <TableHead>{t("fields.status")}</TableHead>
                <TableHead className="text-right">{t("fields.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    {t("assignments.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                assignments.map((assignment) => (
                  <TableRow key={assignment.assignment_id}>
                    <TableCell className="font-medium">
                      {assignment.users ? userLabel(assignment.users) : assignment.user_id}
                    </TableCell>
                    <TableCell>{assignmentLabels[assignment.assignment_type]}</TableCell>
                    <TableCell>{assignmentTarget(assignment, targetLabels)}</TableCell>
                    <TableCell>
                      <Badge variant={assignment.active ? "default" : "secondary"}>
                        {assignment.active ? t("status.active") : t("status.inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          runMutation(
                            () => updateCoordinatorAssignment(assignment.assignment_id, { active: !assignment.active }),
                            assignment.active ? t("success.assignmentDeactivated") : t("success.assignmentActivated"),
                          )
                        }
                        disabled={isPending}
                      >
                        {assignment.active ? <PowerOff className="size-4" /> : <Power className="size-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
