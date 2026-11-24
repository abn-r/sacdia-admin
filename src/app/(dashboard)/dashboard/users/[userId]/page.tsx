import type { ReactNode } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { DetailAsideLayout } from "@/components/shared/detail-aside-layout";
import { DetailHeader } from "@/components/shared/detail-header";
import { ErrorState } from "@/components/shared/error-state";
import { ExceptionStatus } from "@/components/shared/exception-status";
import { UrlTabs, type UrlTabItem } from "@/components/shared/url-tabs";
import { buildRoleTranslator } from "@/lib/auth/role-labels";
import {
  getAdminUserDisplayName,
  getAdminUserSecondaryLabel,
} from "@/lib/admin-users/display";
import { canManageUserAccessFlags } from "@/lib/admin-users/can-manage-user-access-flags";
import { hasGuardianshipsContent } from "@/lib/admin-users/guardianships";
import { hasFamilyAccessContent } from "@/lib/admin-users/family-access";
import { UserAccessToggles } from "@/components/users/user-access-toggles";
import { PostRegistrationTab } from "@/components/users/post-registration-tab";
import { UserAvatar } from "@/components/users/user-avatar";
import { UserRolesPanel } from "@/components/rbac/user-roles-panel";
import { UserRolesOverview } from "@/components/users/user-roles-overview";
import { UserGuardianshipsCard } from "@/components/users/user-guardianships-card";
import { UserFamilyAccessCard } from "@/components/users/user-family-access-card";
import { UserDetailAside, type UserDetailAsideFact } from "@/components/users/detail/aside";
import { UserDetailDataTab } from "@/components/users/detail/data-tab";
import { UserDetailSummaryTab } from "@/components/users/detail/summary-tab";
import { UserDetailAsideActions } from "@/components/users/detail/aside-actions";
import { HealthBlock } from "@/components/users/detail/health-block";
import { UserDetailHonorsTab } from "@/components/users/detail/honors-tab";
import { UserDetailClassesTab } from "@/components/users/detail/classes-tab";
import {
  calculateAge,
  extractAllAssignments,
  extractAssignmentLocation,
  extractEmergencyContacts,
  extractHealthNames,
  extractPrimaryAssignment,
  extractRoleNames,
  formatBaptismDisplay,
  formatBloodType,
  formatDateLong,
} from "@/components/users/detail/helpers";

import {
  getAdminUserDetail,
  type AdminUserDetail,
} from "@/lib/api/admin-users";
import { ApiError } from "@/lib/api/client";
import { errorStateFromError } from "@/lib/api/error-state";
import {
  getPostRegistrationPhotoStatus,
  getPostRegistrationStatus,
} from "@/lib/api/post-registration";
import {
  canManageAdministrativeCompletion,
  canViewAdministrativeCompletion,
} from "@/lib/auth/permission-utils";
import { canCapability } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";
import { getUserRoles, listRoles } from "@/lib/rbac/service";
import {
  availableUserDetailTabs,
  resolveUserDetailTab,
  summarizePostRegistration,
  toSectionLoad,
} from "@/lib/users/detail-model";

type Params = Promise<{ userId: string }>;
type SearchParams = Promise<{ tab?: string | string[] }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const t = await getTranslations("users.pages.detail");
  const { userId } = await params;
  const user = await getAdminUserDetail(userId).catch(() => null);
  const fallback = t("title");
  if (!user) return { title: fallback };
  return {
    title: getAdminUserDisplayName(user, {
      deletedAccount: t("deletedAccount"),
      fallback,
    }),
  };
}

export default async function UserDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const currentUser = await requireAdminUser();
  const [t, tp, tRoles, tNav, locale, { userId }, query] = await Promise.all([
    getTranslations("users.pages.detail"),
    getTranslations("people.userDetail"),
    getTranslations("roles"),
    getTranslations("nav.items"),
    getLocale(),
    params,
    searchParams,
  ]);
  const translateRole = buildRoleTranslator(tRoles);
  const dateLocale = locale.startsWith("es") ? "es-MX" : locale;

  const canSeeAdministrativeCompletion = canViewAdministrativeCompletion(currentUser);
  const canSeeHealthData = canCapability(currentUser, "users", "health.read");
  const canSeeEmergencyContacts = canCapability(
    currentUser,
    "users",
    "emergency_contacts.read",
  );
  const canUpdateAdministrativeCompletion = canManageAdministrativeCompletion(currentUser);
  // Resending an invitation takes the same capability as creating the user.
  const canResendInvitation = canCapability(currentUser, "users", "create");
  const canSeeAccessToggles = canManageUserAccessFlags(currentUser);
  // Disable / revoke need `users:update_admin` AND the sensitive
  // `guardianship:update` (the backend enforces both).
  const canManageFamilyAccess =
    canSeeAccessToggles && canCapability(currentUser, "users", "guardianship.update");

  const tabs = availableUserDetailTabs({
    canSeeHealth: canSeeHealthData,
    canSeePostRegistration: canSeeAdministrativeCompletion,
  });
  const activeTab = resolveUserDetailTab(query.tab, tabs);

  // One round trip: everything the aside and the active tab need, in parallel.
  // Only the user is required; the rest fail into their own block.
  const [userResult, userRolesResult, allRolesResult, postStatusResult, photoResult] =
    await Promise.allSettled([
      getAdminUserDetail(userId),
      getUserRoles(userId),
      listRoles(),
      canSeeAdministrativeCompletion
        ? getPostRegistrationStatus(userId)
        : Promise.resolve(null),
      canSeeAdministrativeCompletion
        ? getPostRegistrationPhotoStatus(userId)
        : Promise.resolve(null),
    ]);

  if (userResult.status === "rejected") {
    const error = userResult.reason;
    if (error instanceof ApiError && error.status === 404) notFound();
    const state = errorStateFromError(error);
    return state.kind === "forbidden" ? (
      <ErrorState
        kind="forbidden"
        title={t("restrictedTitle")}
        description={t("restrictedDescription")}
      />
    ) : (
      <ErrorState {...state} retry />
    );
  }
  const user: AdminUserDetail = userResult.value;

  const rolesLoad = toSectionLoad(userRolesResult);
  const allRolesLoad = toSectionLoad(allRolesResult);
  const postStatusLoad = toSectionLoad(postStatusResult);
  const photoLoad = toSectionLoad(photoResult);

  const fullName = getAdminUserDisplayName(user, {
    deletedAccount: t("deletedAccount"),
    fallback: t("title"),
  });
  const secondaryIdentityLabel = getAdminUserSecondaryLabel(user, {
    anonymized: t("anonymizedAccount"),
  });

  // A dependent profile (minor without login, managed by a guardian) is the
  // only signal the admin detail exposes: `guardianships.dependent_profile`.
  // It is null when the actor lacks `guardianship:read`.
  const isDependent = user.guardianships?.dependent_profile != null;
  const isActive = user.active !== false;

  const age = calculateAge(user.birthday);
  const roleLabels = extractRoleNames(user).map((r) => translateRole(r) || r);
  const primaryAssignment = extractPrimaryAssignment(user.club_assignments, translateRole);
  const assignments = extractAllAssignments(user.club_assignments, translateRole);
  const { districtName, churchName } = extractAssignmentLocation(user.club_assignments);
  const emergencyContacts = extractEmergencyContacts(user.emergency_contacts ?? undefined);
  const classesCount = Array.isArray(user.classes) ? user.classes.length : 0;
  const dash = t("sidebar.dash");

  // ── Header ──────────────────────────────────────────────────────────────
  const subtitle = [age !== null ? t("ageYears", { count: age }) : null, secondaryIdentityLabel]
    .filter(Boolean)
    .join(" · ");

  // ── Aside facts: what is consulted from any tab ─────────────────────────
  const postSummary =
    postStatusLoad.ok && postStatusLoad.value
      ? summarizePostRegistration(postStatusLoad.value)
      : null;
  const facts: UserDetailAsideFact[] = [];
  if (!isActive) {
    facts.push({
      label: t("sidebar.status"),
      value: (
        <ExceptionStatus<"active" | "inactive">
          value="inactive"
          normal={["active"]}
          labels={{ active: t("statusActive"), inactive: t("statusInactive") }}
          intents={{ inactive: "neutral" }}
        />
      ),
    });
  }
  if (primaryAssignment?.clubName) {
    facts.push({
      label: t("fields.club"),
      value:
        assignments.length > 1
          ? `${primaryAssignment.clubName} ${tp("aside.moreClubs", { count: assignments.length - 1 })}`
          : primaryAssignment.clubName,
    });
  }
  if (primaryAssignment?.roleName) {
    facts.push({ label: t("heroMeta.labelClubRole"), value: primaryAssignment.roleName });
  }
  if (roleLabels.length > 0) {
    facts.push({ label: t("heroMeta.labelSystemRole"), value: roleLabels.join(", ") });
  }
  if (user.local_field?.name) {
    facts.push({ label: t("fields.localField"), value: user.local_field.name });
  }
  if (canSeeAccessToggles) {
    facts.push({
      label: t("sidebar.appAccess"),
      value: isDependent
        ? t("access.dependentLabel")
        : user.access_app
          ? tp("aside.withAccess")
          : tp("aside.noAccess"),
      muted: isDependent || !user.access_app,
    });
    facts.push({
      label: t("sidebar.panelAccess"),
      value: isDependent || !user.access_panel ? tp("aside.noAccess") : tp("aside.withAccess"),
      muted: isDependent || !user.access_panel,
    });
  }
  if (canSeeAdministrativeCompletion) {
    facts.push({
      label: t("tabPostRegistration"),
      value: !postSummary
        ? tp("aside.postUnavailable")
        : postSummary.state === "complete"
          ? tp("aside.postComplete")
          : postSummary.state === "not_applicable"
            ? tp("aside.postNotApplicable")
            : tp("aside.postPending", { count: postSummary.missing.length }),
      muted: !postSummary || postSummary.state !== "pending",
    });
  }
  facts.push({
    label: t("fields.registrationDate"),
    value: formatDateLong(user.created_at, dateLocale),
  });

  const tabItems: UrlTabItem[] = tabs.map((tab) => ({
    value: tab,
    label:
      tab === "summary"
        ? t("tabResumen")
        : tab === "data"
          ? t("tabPersonalData")
          : tab === "health"
            ? t("tabHealth")
            : tab === "access"
              ? t("tabRolesAccess")
              : tab === "honors"
                ? t("tabHonors")
                : tab === "classes"
                  ? t("tabClasses")
                  : t("tabPostRegistration"),
    ...(tab === "classes" && classesCount > 0 ? { count: classesCount } : {}),
  }));

  // ── Tab content ─────────────────────────────────────────────────────────
  const baptismValue = formatBaptismDisplay(
    user.baptism,
    user.baptism_date,
    {
      yes: t("sidebar.yes"),
      no: t("fields.baptismNo"),
      yesWithDate: (date) => t("fields.baptismYes", { date }),
    },
    dateLocale,
  );

  let content: ReactNode = null;
  switch (activeTab) {
    case "summary":
      content = (
        <UserDetailSummaryTab
          clubs={<UserRolesOverview clubSections={assignments} />}
          guardianships={
            hasGuardianshipsContent(user.guardianships) ? (
              <UserGuardianshipsCard userId={user.user_id} guardianships={user.guardianships} />
            ) : null
          }
          familyAccess={
            hasFamilyAccessContent(user.family_access) ? (
              <UserFamilyAccessCard
                userId={user.user_id}
                familyAccess={user.family_access}
                canManage={canManageFamilyAccess}
              />
            ) : null
          }
          contacts={
            canSeeEmergencyContacts
              ? {
                  title: t("sections.contactsTitle"),
                  hasPayload: user.emergency_contacts != null,
                  contacts: emergencyContacts,
                  principalLabel: t("contacts.principal"),
                  callLabel: t("contacts.call"),
                  emptyMessage: t("sections.contactsEmpty"),
                  missingPayloadMessage: t("sections.contactsMissingPayload"),
                }
              : null
          }
        />
      );
      break;
    case "data":
      content = (
        <UserDetailDataTab
          groups={[
            {
              title: t("sections.fullDataTitle"),
              fields: [
                { k: t("fields.name"), v: user.name },
                { k: t("fields.paternalLastName"), v: user.paternal_last_name },
                { k: t("fields.maternalLastName"), v: user.maternal_last_name },
                { k: t("fields.email"), v: secondaryIdentityLabel },
                { k: t("fields.birthday"), v: formatDateLong(user.birthday, dateLocale) },
                { k: t("fields.gender"), v: user.gender },
                { k: t("fields.baptism"), v: baptismValue },
                {
                  k: t("fields.internalId"),
                  v: <code className="font-mono text-xs">{user.user_id}</code>,
                },
              ],
            },
            {
              title: t("sections.locationTitle"),
              fields: [
                { k: t("fields.country"), v: user.country?.name },
                { k: t("fields.union"), v: user.union?.name },
                { k: t("fields.localField"), v: user.local_field?.name },
                { k: t("fields.district"), v: districtName, muted: districtName == null },
                { k: t("fields.church"), v: churchName, muted: churchName == null },
                {
                  k: t("fields.registrationDate"),
                  v: formatDateLong(user.created_at, dateLocale),
                },
                {
                  k: t("fields.lastUpdate"),
                  v: formatDateLong(user.updated_at ?? user.modified_at, dateLocale),
                },
              ],
            },
          ]}
        />
      );
      break;
    case "health":
      content = (
        <HealthBlock
          num=""
          title={t("sections.healthBlockTitle")}
          emptyMessage={t("sections.healthEmpty")}
          bloodLabel={t("fields.bloodType")}
          bloodValue={formatBloodType(user.health?.blood, t("fields.bloodUnspecified"))}
          allergiesLabel={t("fields.allergies")}
          diseasesLabel={t("fields.diseases")}
          medicinesLabel={t("fields.medicines")}
          allergies={extractHealthNames(user.health?.allergies)}
          diseases={extractHealthNames(user.health?.diseases)}
          medicines={extractHealthNames(user.health?.medicines)}
          hasPayload={user.health != null}
        />
      );
      break;
    case "access":
      content =
        rolesLoad.ok && allRolesLoad.ok ? (
          <div className="space-y-6">
            <UserRolesPanel
              userId={userId}
              initialUserRoles={rolesLoad.value}
              allRoles={allRolesLoad.value}
            />
            {canSeeAccessToggles ? (
              <UserAccessToggles
                userId={user.user_id}
                initialAccessApp={user.access_app}
                initialAccessPanel={user.access_panel}
                initialActive={user.active}
                canManage
              />
            ) : null}
          </div>
        ) : (
          <div className="space-y-6">
            <ErrorState
              {...errorStateFromError(!rolesLoad.ok ? rolesLoad.error : !allRolesLoad.ok ? allRolesLoad.error : undefined)}
              title={tp("errors.rolesTitle")}
              description={tp("errors.rolesDescription")}
              retry
            />
            {canSeeAccessToggles ? (
              <UserAccessToggles
                userId={user.user_id}
                initialAccessApp={user.access_app}
                initialAccessPanel={user.access_panel}
                initialActive={user.active}
                canManage
              />
            ) : null}
          </div>
        );
      break;
    case "honors":
      content = <UserDetailHonorsTab userId={userId} locale={dateLocale} />;
      break;
    case "classes":
      content = (
        <UserDetailClassesTab
          userId={userId}
          locale={dateLocale}
          clubAssignments={user.club_assignments}
        />
      );
      break;
    case "post-registration":
      content =
        postStatusLoad.ok && postStatusLoad.value ? (
          <PostRegistrationTab
            userId={userId}
            status={postStatusLoad.value}
            photoStatus={photoLoad.ok ? photoLoad.value : null}
            canOverride={canUpdateAdministrativeCompletion}
            invitationPending={user.invitation_pending === true}
            canResendInvitation={canResendInvitation}
          />
        ) : (
          <ErrorState
            {...errorStateFromError(postStatusLoad.ok ? undefined : postStatusLoad.error)}
            title={tp("errors.postRegistrationTitle")}
            description={tp("errors.postRegistrationDescription")}
            retry
          />
        );
      break;
  }

  return (
    <div className="space-y-6">
      <DetailHeader
        breadcrumbs={[
          { label: tNav("users"), href: "/dashboard/users" },
          { label: fullName },
        ]}
        media={
          <UserAvatar
            src={user.user_image}
            name={fullName}
            email={secondaryIdentityLabel}
            size={56}
            className="rounded-xl"
            priority
          />
        }
        title={fullName}
        subtitle={subtitle || dash}
      />

      <DetailAsideLayout
        aside={
          <UserDetailAside
            facts={facts}
            actions={
              <UserDetailAsideActions
                userId={user.user_id}
                fullName={fullName}
                active={isActive}
                canManageAccess={canSeeAccessToggles}
                canResendInvitation={user.invitation_pending === true && canResendInvitation}
                accessHref="?tab=access"
              />
            }
          />
        }
      >
        <UrlTabs tabs={tabItems} defaultValue="summary" ariaLabel={tp("tabsLabel")} />
        {content}
      </DetailAsideLayout>
    </div>
  );
}
