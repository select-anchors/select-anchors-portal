const ROLE_DEFAULTS = {
  admin: {
    can_view_all_wells: true,
    can_view_all_company_wells: true,
    can_edit_wells: true,
    can_bulk_edit_wells: true,
    can_edit_company_contacts: true,
    can_export_csv: true,
    can_transfer_well_ownership: true,
    can_manage_users: true,
    can_manage_company_users: true,
    can_edit_company_users: true,
    can_reset_passwords: true,
    can_reset_company_passwords: true,
    can_manage_items_pricing: true,
    can_approve_changes: true,
    can_use_dispatch: true,
  },
  employee: {
    can_view_all_wells: true,
    can_view_all_company_wells: true,
    can_edit_wells: true,
    can_bulk_edit_wells: true,
    can_edit_company_contacts: true,
    can_export_csv: true,
    can_transfer_well_ownership: false,
    can_manage_users: false,
    can_manage_company_users: false,
    can_edit_company_users: false,
    can_reset_passwords: false,
    can_reset_company_passwords: false,
    can_manage_items_pricing: false,
    can_approve_changes: false,
    can_use_dispatch: true,
  },
  customer: {
    can_view_all_wells: false,
    can_view_all_company_wells: true,
    can_edit_wells: false,
    can_bulk_edit_wells: true,
    can_edit_company_contacts: true,
    can_export_csv: true,
    can_transfer_well_ownership: false,
    can_manage_users: false,
    can_manage_company_users: false,
    can_edit_company_users: false,
    can_reset_passwords: false,
    can_reset_company_passwords: false,
    can_manage_items_pricing: false,
    can_approve_changes: false,
    can_use_dispatch: false,
  },
};

export function getDefaultPermissions(role = "customer") {
  return ROLE_DEFAULTS[role] || ROLE_DEFAULTS.customer;
}

export function resolvePermissions(
  role = "customer",
  companyPermissionsJson = null,
  userPermissionsJson = null
) {
  return {
    ...getDefaultPermissions(role),
    ...(companyPermissionsJson || {}),
    ...(userPermissionsJson || {}),
  };
}

export function hasPermission(sessionOrUser, permissionKey) {
  const user = sessionOrUser?.user || sessionOrUser || {};
  const role = user?.role || "customer";

  const permissions = resolvePermissions(
    role,
    user?.company_permissions_json || null,
    user?.permissions_json || null
  );

  return !!permissions[permissionKey];
}
