export interface UserProfile {
  uid: string;
  name: string;
  designation?: string;
  phone?: string;
  photoURL?: string;
  logoURL?: string;
  role?: 'user' | 'admin';
}

export interface Placeholder {
  type: 'text' | 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  color?: string;
  label: string;
  key: string; // e.g., 'name', 'designation', 'userPhoto'
}

export interface Template {
  id: string;
  title: string;
  category: string;
  imageURL: string;
  placeholders: Placeholder[];
}

export interface Poster {
  id: string;
  userId: string;
  templateId: string;
  finalImageURL: string;
  createdAt: string;
}
