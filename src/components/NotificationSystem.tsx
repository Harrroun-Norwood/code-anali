import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Bell, Check, X, AlertCircle, Calendar, CreditCard, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Notification {
  id: string;
  type: 'consultation_approved' | 'consultation_completed' | 'enrollment_approved' | 'payment_reminder' | 'document_ready';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  action_url?: string;
}

const NotificationSystem = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Set up real-time subscription for new notifications
      const subscription = supabase
        .channel(`notifications-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notification_log',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            // Convert database notification to UI notification
            const newNotification = convertToUINotification(payload.new);
            if (newNotification) {
              setNotifications(prev => [newNotification, ...prev]);
              toast({
                title: newNotification.title,
                description: newNotification.message,
              });
            }
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user, toast]);

  const fetchNotifications = async () => {
    try {
      // In a real implementation, you'd have a notifications table
      // For now, we'll create mock notifications based on user status
      const mockNotifications: Notification[] = [];
      
      // This would be replaced with actual database queries
      setNotifications(mockNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const convertToUINotification = (dbNotification: any): Notification | null => {
    const typeMap: Record<string, string> = {
      'consultation_confirmation': 'consultation_approved',
      'consultation_completion': 'consultation_completed',
      'enrollment_approval': 'enrollment_approved',
      'payment_due': 'payment_reminder',
      'document_complete': 'document_ready'
    };

    const type = typeMap[dbNotification.notification_type];
    if (!type) return null;

    return {
      id: dbNotification.id,
      type: type as any,
      title: getNotificationTitle(type),
      message: dbNotification.message,
      read: false,
      created_at: dbNotification.created_at,
      action_url: getActionUrl(type)
    };
  };

  const getNotificationTitle = (type: string): string => {
    switch (type) {
      case 'consultation_approved':
        return 'Consultation Approved';
      case 'consultation_completed':
        return 'Ready for Enrollment';
      case 'enrollment_approved':
        return 'Enrollment Approved';
      case 'payment_reminder':
        return 'Payment Due';
      case 'document_ready':
        return 'Document Ready';
      default:
        return 'Notification';
    }
  };

  const getActionUrl = (type: string): string => {
    switch (type) {
      case 'consultation_approved':
        return '/applicant-dashboard';
      case 'consultation_completed':
        return '/enrollment';
      case 'enrollment_approved':
        return '/billing';
      case 'payment_reminder':
        return '/billing';
      case 'document_ready':
        return '/documents';
      default:
        return '/';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'consultation_approved':
      case 'consultation_completed':
        return <Calendar className="h-5 w-5 text-blue-600" />;
      case 'enrollment_approved':
        return <Check className="h-5 w-5 text-green-600" />;
      case 'payment_reminder':
        return <CreditCard className="h-5 w-5 text-orange-600" />;
      case 'document_ready':
        return <FileText className="h-5 w-5 text-purple-600" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const markAsRead = async (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  };

  if (loading) {
    return <div className="animate-pulse">Loading notifications...</div>;
  }

  if (notifications.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No notifications yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {notifications.map((notification) => (
        <Card key={notification.id} className={`transition-all duration-200 ${
          !notification.read ? 'border-l-4 border-l-primary bg-primary/5' : ''
        }`}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-background rounded-lg border">
                  {getNotificationIcon(notification.type)}
                </div>
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {notification.title}
                    {!notification.read && (
                      <Badge variant="secondary" className="text-xs">New</Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {new Date(notification.created_at).toLocaleDateString()} at{' '}
                    {new Date(notification.created_at).toLocaleTimeString()}
                  </CardDescription>
                </div>
              </div>
              {!notification.read && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAsRead(notification.id)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground mb-3">
              {notification.message}
            </p>
            {notification.action_url && (
              <Button size="sm" variant="outline" asChild>
                <a href={notification.action_url}>Take Action</a>
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default NotificationSystem;