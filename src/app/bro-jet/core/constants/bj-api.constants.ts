/** BRO JET – API endpoint constants */
export const BJ_API = {
  STATIONS: '/bj/stations',
  STATION_DETAIL: '/bj/stations/:id',
  STATION_AVAILABILITY: '/bj/stations/:id/availability',
  BOOKINGS: '/bj/bookings',
  BOOKING_CANCEL: '/bj/bookings/:id/cancel',
  BOOKING_HISTORY: '/bj/bookings/history',
  WALLET_BALANCE: '/bj/wallet/balance',
  WALLET_TOPUP: '/bj/wallet/topup',
  PAYMENTS: '/bj/payments/process',
  LOYALTY_POINTS: '/bj/loyalty/points',
  LOYALTY_REDEEM: '/bj/loyalty/redeem',
  VOUCHERS: '/bj/vouchers/available',
  VOUCHER_VALIDATE: '/bj/vouchers/validate',
  VEHICLES: '/bj/vehicles',
  IOT_PROGRESS: '/bj/iot/booking/:id/progress',
} as const;
