export type User = {
  id: string
  name: string
  email: string
  department: string
  role: 'admin' | 'user'
  created_at?: string
  updated_at?: string
}

export type ServiceSchedule = {
  id: string
  date: string
  type: 'sunday' | 'wednesday' | 'saturday'
  time: string
  deadline: string
  status: 'open' | 'closed'
}

export type DepartmentContent = {
  id: string
  service_id: string
  department_id: string
  department_name?: string
  content: string
  created_at: string
  updated_at: string
  user_name?: string
  user_department?: string
}

export type FileAttachment = {
  id: string
  content_id: string
  file_url: string
  description: string
  filename: string
  created_at: string
}

export type ServiceStatus = 'scheduled' | 'canceled' | 'completed'

export type SpecialService = {
  id: string
  title: string
  description: string | null
  date: string
  time: string
  deadline: string
  status: ServiceStatus
  created_by: string
  created_at: string
  updated_at: string
} 