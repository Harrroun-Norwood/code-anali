import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Bell, MessageSquare, Mail, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface NotificationLog {
  id: string;
  type: 'sms' | 'email' | 'push';
  notification_type: string;
  message: string;
  phone_number?: string;
  email_address?: string;
  status: 'sent' | 'failed' | 'pending';
  created_at: string;
}

const NotificationSettings = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [contactNumber, setContactNumber] = useState('');
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      setSmsEnabled(profile.sms_notifications_enabled ?? true);
      setContactNumber(profile.contact_number || '');
    }
    fetchNotificationLogs();
  }, [profile]);

  const fetchNotificationLogs = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notification_log')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setNotificationLogs((data || []).map(log => ({
        ...log,
        type: log.type as 'sms' | 'email' | 'push',
        status: log.status as 'sent' | 'failed' | 'pending'
      })));
    } catch (error) {
      console.error('Error fetching notification logs:', error);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          sms_notifications_enabled: smsEnabled,
          contact_number: contactNumber.trim() || null
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Settings Updated",
        description: "Your notification preferences have been saved.",
      });
    } catch (error) {
      console.error('Error updating notification settings:', error);
      toast({
        title: "Error",
        description: "Failed to update notification settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testSMSNotification = async () => {
    if (!contactNumber.trim()) {
      toast({
        title: "Missing Phone Number",
        description: "Please enter and save your contact number first.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('send-sms', {
        body: {
          to: contactNumber,
          message: `Hello! This is a test SMS from ANALI Educational Consultancy. Your notifications are working properly. 📚`,
          type: 'general',
          user_id: user?.id
        }
      });

      if (error) throw error;

      toast({
        title: "Test SMS Sent",
        description: "Check your phone for the test message.",
      });

      // Refresh notification logs
      fetchNotificationLogs();
    } catch (error) {
      console.error('Error sending test SMS:', error);
      toast({
        title: "Error",
        description: "Failed to send test SMS. Please check your phone number.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'default';
      case 'failed': return 'destructive';
      case 'pending': return 'secondary';
      default: return 'outline';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sms': return <MessageSquare className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Settings
          </CardTitle>
          <CardDescription>
            Manage your notification preferences and contact information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">SMS Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive important updates via text message
                </p>
              </div>
              <Switch
                checked={smsEnabled}
                onCheckedChange={setSmsEnabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-number" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Contact Number
              </Label>
              <Input
                id="contact-number"
                type="tel"
                placeholder="e.g., +639123456789"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                className="max-w-sm"
              />
              <p className="text-xs text-muted-foreground">
                Include country code (e.g., +63 for Philippines)
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={handleSaveSettings}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </Button>
            
            {smsEnabled && contactNumber && (
              <Button 
                variant="outline" 
                onClick={testSMSNotification}
              >
                Send Test SMS
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Notifications</CardTitle>
          <CardDescription>
            Your notification history from the last 10 messages
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <p className="text-muted-foreground">Loading notification history...</p>
          ) : notificationLogs.length === 0 ? (
            <p className="text-muted-foreground">No notifications sent yet.</p>
          ) : (
            <div className="space-y-3">
              {notificationLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {getTypeIcon(log.type)}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={getStatusColor(log.status)} className="text-xs">
                          {log.status}
                        </Badge>
                        <span className="text-sm font-medium capitalize">
                          {log.notification_type.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {log.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(log.created_at).toLocaleString()}
                        {log.phone_number && ` • ${log.phone_number}`}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationSettings;