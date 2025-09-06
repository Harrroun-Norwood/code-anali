import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Phone, Calendar, Shield, Camera } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import ProfileManagement from '@/components/ProfileManagement';

const Profile = () => {
  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Profile Management</h1>
          <p className="text-muted-foreground">
            Manage your personal information, contact details, and account settings.
          </p>
        </div>

        <ProfileManagement />
      </div>
    </div>
  );
};

export default Profile;