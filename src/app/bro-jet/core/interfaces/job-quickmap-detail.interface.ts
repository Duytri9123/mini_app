/** Response từ API /job-quick-map/:id */
export interface JobQuickmapDetailResponse {
  success: boolean;
  data: JobQuickmapDetail;
}

export interface JobQuickmapDetail {
  id: number;
  subscription_id: string;
  title: string;
  address: string;
  images: string[];
  expected_salary: string;
  number_of_positions: string;
  contact_phone: string;
  contact_email: string;
  contact_name: string;
  description: string;
  requirements: string;
  view_count: string;
  start_date: string;
  end_date: string;
  subscription_info: { trustBadge: number | string; priorityMap: number };
}
