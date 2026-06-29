import { User } from './auth';

export interface HealthRecord {
  id: string;
  patient_id: string;
  doctor_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  patient?: Pick<User, 'id' | 'fullName' | 'email'>;
  doctor?: Pick<User, 'id' | 'fullName' | 'email'>;
  file_urls?: string[];
  previous_doctor_id?: string;
  previous_doctor_name?: string;
}

export interface EmergencyRequest {
  id: string;
  patient_id: string;
  doctor_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'revoked';
  reason: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  patient?: Pick<User, 'id' | 'fullName' | 'email'>;
  doctor?: Pick<User, 'id' | 'fullName' | 'email'>;
}
