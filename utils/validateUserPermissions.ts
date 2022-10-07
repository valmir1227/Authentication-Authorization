type User = {
  permissions: string[];
  roles: string[];
};

type validadeUserPermissionsParams = {
  user: User;
  permissions?: string[];
  roles?: string[];
};

export function validadeUserPermissions({
  user,
  permissions,
  roles,
}: validadeUserPermissionsParams) {
  if (permissions?.length > 0) {
    const hasAllPermissions = permissions.every((permission) => {
      return user.permissions.includes(permission);
    });
    if (!hasAllPermissions) {
      return false;
    }
  }

  if (roles) {
    const hasAllRoles = roles?.some((role) => user?.roles.includes(role));

    if (!hasAllRoles) {
      return false;
    }
  }
  return true;
}
