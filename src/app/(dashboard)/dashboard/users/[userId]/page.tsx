import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import Link from "next/link";
import {
  Calendar,
  KeyRound,
  Layers,
  LockOpen,
  MailCheck,
  ShieldCheck,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { buildRoleTranslator } from "@/lib/auth/role-labels";
import { normalizeApprovalStatus } from "@/lib/admin-users/approval-status";
import { UserAccessToggles } from "@/components/users/user-access-toggles";
import { PostRegistrationTab } from "@/components/users/post-registration-tab";
import { MfaTab } from "@/components/users/mfa-tab";
import { SessionsTab } from "@/components/users/sessions-tab";
import { UserRolesPanel } from "@/components/rbac/user-roles-panel";

import { UserDetailHero } from "@/components/users/detail/hero";
import { UserDetailStats, ProgressBar, type StatItem } from "@/components/users/detail/stats";
import {
  DetailSection,
  DetailField,
  DetailCols2,
} from "@/components/users/detail/section";
import { UserDetailResumenTab } from "@/components/users/detail/resumen-tab";
import { UserDetailActionSidebar } from "@/components/users/detail/action-sidebar";
import {
  calculateAge,
  computeTenure,
  extractAllAssignments,
  extractEmergencyContacts,
  extractHealthNames,
  extractLegalRepresentative,
  extractPrimaryAssignment,
  extractRoleNames,
  formatBloodType,
  formatDateLong,
} from "@/components/users/detail/helpers";

import {
  getAdminUserDetail,
  type AdminUserDetail,
} from "@/lib/api/admin-users";
import { ApiError } from "@/lib/api/client";
import {
  canManageAdministrativeCompletion,
  canReadSensitiveUserFamily,
  canViewAdministrativeCompletion,
  hasAnyPermission,
} from "@/lib/auth/permission-utils";
import { getAdminUserMfaStatus } from "@/lib/api/mfa";
import { USERS_UPDATE_ADMIN } from "@/lib/auth/permissions";
import { requireAdminUser } from "@/lib/auth/session";
import {
  getUserRoles,
  listRoles,
} from "@/lib/rbac/service";
import {
  getPostRegistrationStatus,
  getPostRegistrationPhotoStatus,
  type PostRegistrationStatus,
  type PhotoStatusResponse,
} from "@/lib/api/post-registration";
import {
  getAdminUserSessions,
  type AdminSessionListData,
} from "@/lib/api/sessions";
import type { UserRole, Role } from "@/lib/rbac/types";

type Params = Promise<{ userId: string }>;

export default async function UserDetailPage({ params }: { params: Params }) {
  const currentUser = await requireAdminUser();
  const t = await getTranslations("users.pages.detail");
  const tRoles = await getTranslations("roles");
  const translateRole = buildRoleTranslator(tRoles);
  const locale = await getLocale();
  const dateLocale = locale.startsWith("es") ? "es-MX" : locale;
  const { userId } = await params;

  let user: AdminUserDetail;
  let userRoles: UserRole[] = [];
  let allRoles: Role[] = [];
  let postRegistrationStatus: PostRegistrationStatus | null = null;
  let photoStatus: PhotoStatusResponse | null = null;
  let sessionsData: AdminSessionListData | null = null;

  try {
    const results = await Promise.all([
      getAdminUserDetail(userId),
      getUserRoles(userId).catch(() => [] as UserRole[]),
      listRoles().catch(() => [] as Role[]),
    ]);
    user = results[0];
    userRoles = results[1];
    allRoles = results[2];
  } catch (error) {
    if (error instanceof ApiError && [401, 403].includes(error.status)) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("restrictedTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {t("restrictedDescription")}
          </CardContent>
        </Card>
      );
    }
    notFound();
  }

  const canSeeAdministrativeCompletion = canViewAdministrativeCompletion(currentUser);
  if (canSeeAdministrativeCompletion) {
    const [prStatus, prPhotoStatus] = await Promise.all([
      getPostRegistrationStatus(userId).catch(() => null),
      getPostRegistrationPhotoStatus(userId).catch(() => null),
    ]);
    postRegistrationStatus = prStatus;
    photoStatus = prPhotoStatus;
  }

  const mfaStatus = await getAdminUserMfaStatus(userId).catch(() => null);
  const canManageMfa = hasAnyPermission(currentUser, [USERS_UPDATE_ADMIN]);
  sessionsData = await getAdminUserSessions(userId).catch(() => null);

  const canSeeHealthData = canReadSensitiveUserFamily(currentUser, "health");
  const canSeeEmergencyContacts = canReadSensitiveUserFamily(
    currentUser,
    "emergency_contacts",
  );
  const canSeeLegalRepresentative = canReadSensitiveUserFamily(
    currentUser,
    "legal_representative",
  );
  const canUpdateAdministrativeCompletion =
    canManageAdministrativeCompletion(currentUser);

  const fullName =
    [user.name, user.paternal_last_name, user.maternal_last_name]
      .filter(Boolean)
      .join(" ") ||
    user.email ||
    t("title");

  const age = calculateAge(user.birthday);
  const roleNamesRaw = extractRoleNames(user);
  const roleLabels = roleNamesRaw.map((r) => translateRole(r) || r);
  const primaryAssignment = extractPrimaryAssignment(user.club_assignments, translateRole);
  const assignments = extractAllAssignments(user.club_assignments, translateRole);
  const emergencyContacts = extractEmergencyContacts(user.emergency_contacts ?? undefined);
  const legalRep = extractLegalRepresentative(user.legal_representative);
  const tenure = computeTenure(user.created_at);
  const classesCount = Array.isArray(user.classes) ? user.classes.length : 0;

  const tenureValue = tenure ? t(`tenure.${tenure.unit}`, { count: tenure.count }) : t("sidebar.dash");
  const tenureSub = tenure
    ? t("stats.tenureRegisteredOn", { date: formatDateLong(tenure.createdAt, dateLocale) })
    : "";

  const statItems: StatItem[] = [
    {
      label: t("stats.tenureLabel"),
      value: tenureValue,
      sub: tenureSub,
      accent: <ProgressBar pct={tenure ? 100 : 0} tone="primary" />,
    },
    {
      label: t("stats.classesLabel"),
      value: classesCount,
      sub: t("stats.classesActive", { count: classesCount }),
      accent: (
        <ProgressBar
          pct={classesCount === 0 ? 0 : Math.min(100, classesCount * 25)}
          tone="warning"
        />
      ),
    },
    {
      label: t("stats.rolesLabel"),
      value: roleNamesRaw.length,
      sub:
        roleNamesRaw.length === 0
          ? t("stats.rolesEmpty")
          : roleLabels.slice(0, 2).join(", "),
      accent: (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 text-primary" />
          {t("stats.rolesRbacNote")}
        </div>
      ),
    },
    {
      label: t("stats.lastUpdateLabel"),
      value: formatDateLong(
        user.updated_at ?? user.modified_at ?? user.created_at,
        dateLocale,
      ),
      sub: user.access_panel ? t("stats.panelEnabled") : t("stats.panelDisabled"),
      accent: (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="size-3.5" />
          {t("stats.auditTracking")}
        </div>
      ),
    },
  ];

  const healthAllergies = extractHealthNames(user.health?.allergies);
  const healthDiseases = extractHealthNames(user.health?.diseases);
  const healthMedicines = extractHealthNames(user.health?.medicines);
  const hasHealthPayload = user.health != null;

  const approvalState =
    user.approval === 1 || user.approval === true || user.approval === "approved"
      ? t("approvalApproved")
      : user.approval === -1 || user.approval === "rejected"
      ? t("approvalRejected")
      : t("approvalPending");

  const mfaSidebarValue =
    mfaStatus?.enabled === true
      ? t("sidebar.enabled")
      : mfaStatus?.enabled === false
      ? t("sidebar.disabled")
      : t("sidebar.dash");

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-1 text-[12px] font-semibold uppercase tracking-[0.16em] text-primary">
          {t("title")}
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          {t("subtitle")}
        </h2>
      </div>

      <UserDetailHero
        user={user}
        fullName={fullName}
        age={age}
        ageLabel={age !== null ? t("ageYears", { age }) : null}
        primaryAssignment={primaryAssignment}
        roleLabels={roleLabels}
        backHref="/dashboard/users"
        backLabel={t("back")}
        statusActiveLabel={t("statusActive")}
        statusInactiveLabel={t("statusInactive")}
        approvalPendingLabel={t("approvalPending")}
        approvalApprovedLabel={t("approvalApproved")}
        approvalRejectedLabel={t("approvalRejected")}
        canUpdateApproval={canUpdateAdministrativeCompletion}
      />

      <UserDetailStats items={statItems} />

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_320px]">
        <Tabs defaultValue="resumen" className="min-w-0">
          <TabsList className="flex-wrap">
            <TabsTrigger value="resumen">{t("tabResumen")}</TabsTrigger>
            <TabsTrigger value="datos">{t("tabPersonalData")}</TabsTrigger>
            {canSeeHealthData ? (
              <TabsTrigger value="salud">
                <Layers className="size-3.5" />
                {t("tabHealth")}
              </TabsTrigger>
            ) : null}
            <TabsTrigger value="roles">{t("tabRolesAccess")}</TabsTrigger>
            {canSeeAdministrativeCompletion ? (
              <TabsTrigger value="post-registration">
                {t("tabPostRegistration")}
              </TabsTrigger>
            ) : null}
            <TabsTrigger value="seguridad">{t("tabSecurity")}</TabsTrigger>
            <TabsTrigger value="sesiones">{t("tabSessions")}</TabsTrigger>
          </TabsList>

          <TabsContent value="resumen" className="mt-4">
            <UserDetailResumenTab
              identityTitle={t("sections.identityTitle")}
              identityFieldsLeft={[
                { k: t("fields.fullName"), v: fullName },
                {
                  k: t("fields.birthday"),
                  v: user.birthday
                    ? `${formatDateLong(user.birthday, dateLocale)}${
                        age !== null ? ` · ${t("ageYears", { age })}` : ""
                      }`
                    : "—",
                },
                { k: t("fields.gender"), v: user.gender ?? "—" },
                {
                  k: t("fields.baptism"),
                  v:
                    user.baptism === true
                      ? `${t("fields.baptismYes")}${
                          user.baptism_date
                            ? ` · ${formatDateLong(user.baptism_date, dateLocale)}`
                            : ""
                        }`
                      : user.baptism === false
                      ? t("fields.baptismNo")
                      : "—",
                },
                { k: t("fields.email"), v: user.email ?? "—" },
              ]}
              identityFieldsRight={[
                { k: t("fields.country"), v: user.country?.name ?? "—" },
                { k: t("fields.union"), v: user.union?.name ?? "—" },
                { k: t("fields.localField"), v: user.local_field?.name ?? "—" },
                {
                  k: t("fields.district"),
                  v: user.district_id != null ? `#${user.district_id}` : "—",
                  muted: user.district_id == null,
                },
                {
                  k: t("fields.church"),
                  v: user.church_id != null ? `#${user.church_id}` : "—",
                  muted: user.church_id == null,
                },
              ]}
              pastoralTitle={t("sections.pastoralTitle")}
              pastoralEmpty={t("sections.pastoralEmpty")}
              assignments={assignments}
              clubLabel={t("fields.club")}
              sectionLabel={t("fields.section")}
              roleLabel={t("fields.role")}
              showHealth={canSeeHealthData}
              healthProps={{
                num: "03",
                title: t("sections.healthTitle"),
                showLabel: t("sections.healthShow"),
                hideLabel: t("sections.healthHide"),
                protectedTitle: t("sections.healthProtectedTitle", {
                  allergies: healthAllergies.length,
                  diseases: healthDiseases.length,
                  medicines: healthMedicines.length,
                }),
                protectedDescription: t("sections.healthProtectedDescription"),
                emptyMessage: t("sections.healthEmpty"),
                bloodLabel: t("fields.bloodType"),
                bloodValue: formatBloodType(
                  user.health?.blood,
                  t("fields.bloodUnspecified"),
                ),
                allergiesLabel: t("fields.allergies"),
                diseasesLabel: t("fields.diseases"),
                medicinesLabel: t("fields.medicines"),
                allergies: healthAllergies,
                diseases: healthDiseases,
                medicines: healthMedicines,
                hasPayload: hasHealthPayload,
              }}
              rolesAccessTitle={t("sections.rolesAccessTitle")}
              rolesLabel={t("sections.rolesLabel")}
              rolesEmpty={t("sections.rolesEmpty")}
              globalRoles={roleLabels}
              accessAppLabel={t("access.appLabel")}
              accessAppSub={t("access.appSub")}
              accessPanelLabel={t("access.panelLabel")}
              accessPanelSub={t("access.panelSub")}
              activeLabel={t("access.activeLabel")}
              activeSub={t("access.activeSub")}
              accessApp={Boolean(user.access_app)}
              accessPanel={Boolean(user.access_panel)}
              active={user.active !== false}
              showContacts={canSeeEmergencyContacts}
              contactsProps={{
                hasPayload: user.emergency_contacts != null,
                contacts: emergencyContacts,
                title: t("sections.contactsTitle"),
                principalLabel: t("contacts.principal"),
                callLabel: t("contacts.call"),
                emptyMessage: t("sections.contactsEmpty"),
                missingPayloadMessage: t("sections.contactsMissingPayload"),
              }}
              showLegalRep={canSeeLegalRepresentative}
              legalRepTitle={t("sections.legalRepTitle")}
              legalRepEmpty={t("sections.legalRepEmpty")}
              legalRep={legalRep}
              legalNameLabel={t("fields.fullName")}
              legalPhoneLabel={t("fields.phone")}
              legalRelationshipLabel={t("fields.relationship")}
            />
          </TabsContent>

          <TabsContent value="datos" className="mt-4">
            <div className="grid gap-3.5 lg:grid-cols-2">
              <DetailSection num="A" title={t("sections.fullDataTitle")}>
                <DetailCols2>
                  <div>
                    <DetailField k={t("fields.name")} v={user.name} />
                    <DetailField
                      k={t("fields.paternalLastName")}
                      v={user.paternal_last_name}
                    />
                    <DetailField
                      k={t("fields.maternalLastName")}
                      v={user.maternal_last_name}
                    />
                    <DetailField k={t("fields.email")} v={user.email} />
                  </div>
                  <div>
                    <DetailField
                      k={t("fields.birthday")}
                      v={formatDateLong(user.birthday, dateLocale)}
                    />
                    <DetailField k={t("fields.gender")} v={user.gender} />
                    <DetailField
                      k={t("fields.baptism")}
                      v={
                        user.baptism === true
                          ? `${t("fields.baptismYes")}${
                              user.baptism_date
                                ? ` (${formatDateLong(user.baptism_date, dateLocale)})`
                                : ""
                            }`
                          : user.baptism === false
                          ? t("fields.baptismNo")
                          : "—"
                      }
                    />
                    <DetailField
                      k={t("fields.internalId")}
                      v={<code className="font-mono text-xs">{user.user_id}</code>}
                    />
                  </div>
                </DetailCols2>
              </DetailSection>

              <DetailSection num="B" title={t("sections.locationTitle")}>
                <DetailCols2>
                  <div>
                    <DetailField k={t("fields.country")} v={user.country?.name} />
                    <DetailField k={t("fields.union")} v={user.union?.name} />
                    <DetailField k={t("fields.localField")} v={user.local_field?.name} />
                  </div>
                  <div>
                    <DetailField
                      k={t("fields.district")}
                      v={user.district_id != null ? `#${user.district_id}` : null}
                      muted={user.district_id == null}
                    />
                    <DetailField
                      k={t("fields.church")}
                      v={user.church_id != null ? `#${user.church_id}` : null}
                      muted={user.church_id == null}
                    />
                  </div>
                </DetailCols2>
              </DetailSection>

              <DetailSection num="C" title={t("sections.scopeTitle")}>
                <DetailCols2>
                  <div>
                    <DetailField k={t("fields.scopeType")} v={user.scope?.type} />
                    <DetailField
                      k={t("fields.scopeUnionId")}
                      v={user.scope?.union_id}
                    />
                    <DetailField
                      k={t("fields.scopeLocalFieldId")}
                      v={user.scope?.local_field_id}
                    />
                  </div>
                  <div>
                    <DetailField
                      k={t("fields.registrationDate")}
                      v={formatDateLong(user.created_at, dateLocale)}
                    />
                    <DetailField
                      k={t("fields.lastUpdate")}
                      v={formatDateLong(
                        user.updated_at ?? user.modified_at,
                        dateLocale,
                      )}
                    />
                  </div>
                </DetailCols2>
              </DetailSection>
            </div>
          </TabsContent>

          {canSeeHealthData ? (
            <TabsContent value="salud" className="mt-4">
              <div className="space-y-3.5">
                <DetailSection num="01" title={t("sections.healthBlockTitle")}>
                  {hasHealthPayload ? (
                    <DetailCols2>
                      <div>
                        <DetailField
                          k={t("fields.bloodType")}
                          v={formatBloodType(
                            user.health?.blood,
                            t("fields.bloodUnspecified"),
                          )}
                        />
                        <DetailField
                          k={t("fields.allergies")}
                          v={
                            healthAllergies.length > 0
                              ? healthAllergies.join(", ")
                              : "—"
                          }
                        />
                      </div>
                      <div>
                        <DetailField
                          k={t("fields.diseases")}
                          v={
                            healthDiseases.length > 0
                              ? healthDiseases.join(", ")
                              : "—"
                          }
                        />
                        <DetailField
                          k={t("fields.medicines")}
                          v={
                            healthMedicines.length > 0
                              ? healthMedicines.join(", ")
                              : "—"
                          }
                        />
                      </div>
                    </DetailCols2>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t("sections.healthEmpty")}
                    </p>
                  )}
                </DetailSection>
              </div>
            </TabsContent>
          ) : null}

          <TabsContent value="roles" className="mt-4">
            <div className="space-y-3.5">
              <UserRolesPanel
                userId={userId}
                initialUserRoles={userRoles}
                allRoles={allRoles}
              />
              <UserAccessToggles
                userId={user.user_id}
                initialAccessApp={user.access_app}
                initialAccessPanel={user.access_panel}
                initialActive={user.active}
                initialApprovalStatus={normalizeApprovalStatus(user.approval)}
              />
            </div>
          </TabsContent>

          {canSeeAdministrativeCompletion ? (
            <TabsContent value="post-registration" className="mt-4">
              {postRegistrationStatus && photoStatus ? (
                <PostRegistrationTab
                  userId={userId}
                  status={postRegistrationStatus}
                  photoStatus={photoStatus}
                  canOverride={canUpdateAdministrativeCompletion}
                />
              ) : (
                <Card>
                  <CardContent className="py-6">
                    <p className="text-center text-sm text-muted-foreground">
                      {t("postRegistrationUnavailable")}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          ) : null}

          <TabsContent value="seguridad" className="mt-4">
            <MfaTab
              userId={userId}
              mfaEnabled={mfaStatus?.enabled ?? null}
              canManageMfa={canManageMfa}
            />
          </TabsContent>

          <TabsContent value="sesiones" className="mt-4">
            <SessionsTab userId={userId} initialData={sessionsData} />
          </TabsContent>
        </Tabs>

        <aside className="hidden lg:block">
          <UserDetailActionSidebar
            title={t("sidebar.title")}
            sections={[
              {
                items: [
                  <SidebarRow
                    key="status"
                    label={t("sidebar.status")}
                    value={
                      user.active !== false
                        ? t("statusActive")
                        : t("statusInactive")
                    }
                  />,
                  <SidebarRow
                    key="approval"
                    label={t("sidebar.approval")}
                    value={approvalState}
                  />,
                  <SidebarRow
                    key="appAccess"
                    label={t("sidebar.appAccess")}
                    value={
                      user.access_app
                        ? t("sidebar.yes")
                        : t("sidebar.no")
                    }
                  />,
                  <SidebarRow
                    key="panelAccess"
                    label={t("sidebar.panelAccess")}
                    value={
                      user.access_panel
                        ? t("sidebar.yes")
                        : t("sidebar.no")
                    }
                  />,
                  <SidebarRow
                    key="mfa"
                    label={t("sidebar.mfa")}
                    value={mfaSidebarValue}
                  />,
                  <SidebarRow
                    key="roles"
                    label={t("sidebar.roles")}
                    value={roleNamesRaw.length}
                  />,
                  <SidebarRow
                    key="assignments"
                    label={t("sidebar.assignments")}
                    value={assignments.length}
                  />,
                ],
              },
              {
                items: [
                  <Button
                    key="back"
                    asChild
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                  >
                    <Link href="/dashboard/users">
                      <LockOpen className="size-4" />
                      {t("back")}
                    </Link>
                  </Button>,
                  <Button
                    key="mfa-link"
                    asChild
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                  >
                    <Link href={`#seguridad`}>
                      <KeyRound className="size-4" />
                      {t("tabSecurity")}
                    </Link>
                  </Button>,
                  <Button
                    key="post-link"
                    asChild
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                  >
                    <Link href={`#post-registration`}>
                      <MailCheck className="size-4" />
                      {t("tabPostRegistration")}
                    </Link>
                  </Button>,
                ],
              },
            ]}
          />
        </aside>
      </div>
    </div>
  );
}

function SidebarRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-dashed border-border/70 pb-2 last:border-b-0 last:pb-0">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
