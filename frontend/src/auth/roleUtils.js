export const HOME_BY_ROLE = { player: '/player', owner: '/owner', admin: '/admin' }

export const homeFor = (role) => HOME_BY_ROLE[role] || '/'

/** UI-only convenience. The backend is what actually enforces authorization. */
export const canAccess = (user, roles) => !!user && (!roles || roles.includes(user.role))
