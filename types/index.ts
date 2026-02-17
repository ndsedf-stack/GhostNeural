export interface Lead {
  id: string;
  created_at: string;
  email: string;
  // Add more fields as needed
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
