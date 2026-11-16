// Modelos de datos para TrackFlow
// Aquí se definen las interfaces y tipos principales del proyecto

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'completed';
  assignedTo?: string;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
}