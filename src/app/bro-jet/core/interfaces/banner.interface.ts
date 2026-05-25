export interface BjBanner {
  id: string;
  title: string;
  description: string;
  desc: string;
  button_text: string;
  button: {
    text: string;
    link: string;
  };
  btn: {
    text: string;
    link: string;
  };
  image_url: string;
  link: string;
  badges: string[];
  status: string;
  created_at: string;
}

export interface BjBannerResponse {
  message: string;
  data: BjBanner[];
}
