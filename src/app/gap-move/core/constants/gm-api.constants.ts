export const GM_STORAGE_KEYS = {
  accessToken: 'gm_access_token',
  refreshToken: 'gm_refresh_token',
  user: 'gm_user',
} as const;

export const GM_API_ENDPOINTS = {
  auth: {
    login: 'gapmove/auth/login',
    register: 'gapmove/auth/register',
    logout: 'gapmove/auth/logout',
    me: 'gapmove/auth/me',
  },
  bookings: 'gapmove/bookings',
  deliveries: 'gapmove/deliveries',
  drivers: 'gapmove/drivers',
  notifications: 'gapmove/notifications',
  payments: 'gapmove/payments',
  vehicles: 'gapmove/vehicles',
  wallet: 'gapmove/wallet',
} as const;
