export type NavAccess = {
  permissions: string[];
  /**
   * Optional global roles. When set, the user must match at least one role
   * in addition to the permission gate. Mirrors backend `@GlobalRoles`.
   */
  roles?: string[];
  /** When true, every permission is required. Default: any match. */
  requireAll?: boolean;
};
