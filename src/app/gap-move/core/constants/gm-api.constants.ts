export const GM_STORAGE_KEYS = {
  accessToken: 'gm_access_token',
  refreshToken: 'gm_refresh_token',
  user: 'gm_user',
  customerAddressDetails: 'gm_customer_address_details',
  confirmedAddressHistory: 'gm_confirmed_address_history',
} as const;

export const GM_API_ENDPOINTS = {
  auth: {
    login: 'auth/login',
    register: 'auth/register',
    logout: 'auth/logout',
    me: 'auth/me',
  },
  bookings: 'gapmove/bookings',
  deliveries: 'gapmove/deliveries',
  customerAddresses: 'customer-addresses',
  drivers: 'gapmove/drivers',
  notifications: 'gapmove/notifications',
  payments: 'gapmove/payments',
  vehicles: 'gapmove/vehicles',
  wallet: 'gapmove/wallet',
} as const;
