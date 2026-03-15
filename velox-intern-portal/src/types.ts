export type UserRole = 'admin' | 'intern' | 'employee';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'inactive';
  joiningDate?: string;
  whatsapp?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  deadline: string;
  assignedTo: string;
  assignedByName: string;
  status: 'pending' | 'in-progress' | 'completed';
  submissionUrl?: string;
  progress: number;
  createdAt: string;
}

export interface Application {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  resumeUrl: string;
  status: 'pending' | 'accepted' | 'rejected';
  appliedAt: string;
}

export interface Doubt {
  id: string;
  internId: string;
  internName: string;
  mentorId?: string;
  question: string;
  answer?: string;
  status: 'open' | 'resolved';
  createdAt: string;
}
