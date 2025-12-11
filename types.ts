export enum Sender {
  USER = 'user',
  COORDINATOR = 'coordinator',
  SYSTEM = 'system',
  SUB_AGENT = 'sub_agent'
}

export interface FunctionCallArgs {
  [key: string]: any;
}

export interface RoutingEvent {
  toolName: string;
  args: FunctionCallArgs;
  timestamp: number;
}

export interface Message {
  id: string;
  sender: Sender;
  text?: string;
  routingEvent?: RoutingEvent;
  isError?: boolean;
}

export enum AgentType {
  PATIENT = 'manage_patient_info',
  MEDICAL = 'assist_medical_info',
  DOCUMENT = 'generate_document',
  ADMIN = 'handle_admin_task'
}

export interface AgentStatus {
  id: AgentType;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  active: boolean;
}