const BASE_URL_VALUE = 'https://admin-jet.tinopage.com';
const GOOGLE_CLIENT_ID_VALUE =
  '764570307183-17o4dsc046ga93sojamt9p640irkgsc8.apps.googleusercontent.com';

export const environment = {
  production: true,
  BASE_URL: BASE_URL_VALUE,
  GOOGLE_CLIENT_ID: GOOGLE_CLIENT_ID_VALUE,
  VIETMAP_API_KEY: '',
  firebase: {
    apiKey: 'AIzaSyD0_UAJLa0bqSkdspVCiRDX25CiI-UuA3A',
    authDomain: 'jetjet-88753.firebaseapp.com',
    projectId: 'jetjet-88753',
    storageBucket: 'jetjet-88753.firebasestorage.app',
    messagingSenderId: '310103998743',
    appId: '1:310103998743:web:ed4d0e1125bfba1bdbf752',
    measurementId: 'G-ZC23RS1PPF',
  },
};

export const BASE_URL = environment.BASE_URL.replace(/\/+$/, '');
export const API_URL = `${BASE_URL}/api`;

const PLACEHOLDER_IMAGE = 'assets/images/No_Image_Available.jpg';

export const getImageUrl = (path?: string | null): string => {
  if (!path || path.trim() === '') {
    return PLACEHOLDER_IMAGE;
  }

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  if (path.startsWith('/assets/') || path.startsWith('assets/')) {
    return path.startsWith('/') ? path : '/' + path;
  }

  const normalized = path.replace(/^\/+/, '');

  if (normalized.startsWith('storage/')) {
    return `${BASE_URL}/${normalized}`;
  }

  return `${BASE_URL}/storage/${normalized}`;
};

export const handleImageError = (event: Event): void => {
  const img = event.target as HTMLImageElement;
  img.src = PLACEHOLDER_IMAGE;
};
