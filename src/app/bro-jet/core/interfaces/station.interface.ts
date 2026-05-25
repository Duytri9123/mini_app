export interface BjStationImage {
  id: string;
  url: string;
  is_primary: boolean;
  sort_order: number;
}

export interface BjOpeningHour {
  day_of_week: number; // 1 (Mon) to 7 (Sun)
  open_time: string;   // HH:mm:ss
  close_time: string;  // HH:mm:ss
}

export interface BjStationService {
  id: string;   // e.g. "self_service", "ev_charging"
  name: string; // e.g. "Tự phục vụ", "Trạm sạc"
  enabled: boolean;
}

export interface BjStation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  status: 'active' | 'inactive' | 'maintenance' | string;
  images: BjStationImage[];
  opening_hours?: BjOpeningHour[];
  service_packages?: BjServicePackage[];
  service?: BjStationService[];
  
  // New fields from latest JSON
  is_open_now?: boolean;
  today_work_start_time?: string;
  today_non_work_start_time?: string;
  url_image?: string | null;
  
  // Custom flags and fields requested by user
  is_self_service?: boolean;
  has_ev_charging?: boolean;
  availableBays?: number;
  totalBays?: number;
  rating?: number;
  reviewCount?: number;
  distance?: number; // km from user

  // Legacy/Additional (keep for compatibility if needed elsewhere)
  openTime?: string;  // mapped from opening_hours for convenience
  closeTime?: string; // mapped from opening_hours for convenience
  title?: string;
}

export interface BjStationListItem {
  id: string;
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  status?: string;
  images: BjStationImage[]; // Primary image only in list
  is_self_service?: boolean;
  has_ev_charging?: boolean;
  availableBays?: number;
  rating?: number;
  reviewCount?: number;
  distance?: number;
  service_packages?: BjServicePackage[];
  service?: BjStationService[];
  
  // New fields from latest JSON
  is_open_now?: boolean;
  today_work_start_time?: string;
  today_non_work_start_time?: string;
  url_image?: string | null;
}

export interface BjStationListResponse {
  message: string;
  data: BjStationListItem[];
}

export interface BjStationResponse {
  message: string;
  data: BjStation;
}

export interface BjServicePackage {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
  // keep extra fields if needed or from previous versions
  isActive?: boolean;
}

/** Dùng cho map marker (tối giản) */
export interface BjStationMarker {
  id: string;
  latitude: number;
  longitude: number;
  name: string;
  status: string;
  availableBays: number;
  markerType: 'active' | 'inactive' | 'closed' | 'selected';
}
