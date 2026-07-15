export type NavAccess = {
  permissions: string[];
  /** When true, every permission is required. Default: any match. */
  requireAll?: boolean;
};
