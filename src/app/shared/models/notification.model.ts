export type NotificationType = 'Welcome' | 'EmailVerified' | 'MessageReceived';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  referenceId: string | null;
  isRead: boolean;
  createdAt: string;
}
