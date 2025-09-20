import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  contact_number?: string;
  photo_url?: string;
  role: 'guest' | 'student' | 'parent' | 'teacher' | 'registrar' | 'accountant' | 'super_admin';
  application_status?: 'applicant' | 'consultation_pending' | 'consultation_completed' | 'payment_pending' | 'enrollment_submitted' | 'student';
  is_active: boolean;
  sms_notifications_enabled?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, userData?: any) => Promise<{ data: any; error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<Profile | null>;
  isRole: (role: string) => boolean;
  isApplicant: () => boolean;
  isStudent: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user profile
          setTimeout(() => {
            fetchUserProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      // Type assertion for application_status
      const profileData = data as Profile;
      console.log('Profile fetched:', profileData.application_status);
      setProfile(profileData);
      return profileData;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  };

  // Enhanced function to refetch user profile - useful for auto-fill updates  
  const refreshProfile = async (): Promise<Profile | null> => {
    if (user?.id) {
      return await fetchUserProfile(user.id);
    }
    return null;
  };

  const signUp = async (email: string, password: string, userData: any = {}) => {
    try {
      // Use dynamic URL that works in both dev and production
      const redirectUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/auth?mode=signin&confirmed=true`
        : 'https://anali-pathways.vercel.app/auth?mode=signin&confirmed=true';
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            ...userData,
            role: 'student',
            application_status: 'applicant'
          }
        }
      });

      // Return both data and error so we can check if confirmation email was sent
      return { data, error };
    } catch (error: any) {
      console.error('Error in signUp:', error);
      return { data: null, error: { message: error.message || 'An error occurred during signup' } };
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    return { error };
  };

  const signOut = async () => {
    try {
      console.log('Starting sign out process...');
      
      // Clear state first
      setUser(null);
      setSession(null);
      setProfile(null);
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      
      if (error) {
        console.error('Supabase sign out error:', error);
      }
      
      // Clear storage
      localStorage.clear();
      sessionStorage.clear();
      
      console.log('Sign out completed, redirecting...');
      
      // Force redirect to home page
      window.location.replace('/');
    } catch (error) {
      console.error('Sign out failed:', error);
      // Force clear state and redirect even if error occurs
      setUser(null);
      setSession(null);
      setProfile(null);
      localStorage.clear();
      sessionStorage.clear();
      window.location.replace('/');
    }
  };

  const isRole = (role: string) => {
    return profile?.role === role;
  };

  const isApplicant = () => {
    return profile?.application_status === 'applicant' || profile?.application_status === 'consultation_pending' || profile?.application_status === 'consultation_completed';
  };

  const isStudent = () => {
    return profile?.application_status === 'student';
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      signUp,
      signIn,
      signOut,
      refreshProfile,
      isRole,
      isApplicant,
      isStudent
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};