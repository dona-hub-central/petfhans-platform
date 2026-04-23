/**
 * Tabla de roles que cada tipo de usuario puede crear al invitar.
 * El servidor lee esta tabla antes de crear cualquier invitación.
 * El campo `role` del body de la request NUNCA se usa directamente.
 */
export const ALLOWED_INVITATION_ROLES: Record<string, string[]> = {
  superadmin:   ['vet_admin'],
  vet_admin:    ['veterinarian', 'pet_owner'],
  veterinarian: ['pet_owner'],
  pet_owner:    [],
}

/**
 * Verifica si un invitador puede crear una invitación con el rol solicitado.
 * @param inviterRole - Rol del usuario que crea la invitación (de la BD)
 * @param requestedRole - Rol que se quiere asignar al invitado (del body)
 */
export function canInviteRole(inviterRole: string, requestedRole: string): boolean {
  return (ALLOWED_INVITATION_ROLES[inviterRole] ?? []).includes(requestedRole)
}
