import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== CREATE USER REQUEST RECEIVED ===');
    
    // Check environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!serviceKey,
      hasAnonKey: !!anonKey
    });

    if (!supabaseUrl || !serviceKey || !anonKey) {
      throw new Error('Missing required environment variables');
    }

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    console.log('Admin client created');

    // Create regular client for auth check
    const supabaseClient = createClient(supabaseUrl, anonKey);
    console.log('Client created');

    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
      throw new Error('Missing authorization header');
    }

    // Get current user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error('Authentication failed');
    }

    console.log('Authenticated user:', user.email);

    // Get user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile error:', profileError);
      throw new Error('User profile not found');
    }

    console.log('User profile:', profile);

    // Check if user is super admin
    if (profile.role !== 'super_admin') {
      console.error('Permission denied. User role:', profile.role);
      throw new Error(`Access denied. Your role: ${profile.role}. Required: super_admin`);
    }

    // Parse request body
    const body = await req.json();
    console.log('Request body keys:', Object.keys(body));

    const { email, password, first_name, last_name, role, contact_number } = body;

    // Validate required fields
    if (!email || !password || !first_name || !last_name || !role) {
      throw new Error('Missing required fields');
    }

    console.log('Creating user:', { email, role });

    // Create user with admin client
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      user_metadata: {
        first_name: first_name,
        last_name: last_name,
        role: role
      },
      email_confirm: true
    });

    if (createError) {
      console.error('User creation error:', createError);
      throw new Error(`Failed to create user: ${createError.message}`);
    }

    if (!newUser.user) {
      throw new Error('No user returned from creation');
    }

    console.log('User created with ID:', newUser.user.id);

    // Wait a bit for the trigger to run
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Update profile
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        first_name: first_name,
        last_name: last_name,
        role: role,
        contact_number: contact_number || null
      })
      .eq('user_id', newUser.user.id);

    if (updateError) {
      console.warn('Profile update warning:', updateError);
    } else {
      console.log('Profile updated successfully');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'User created successfully',
        user: {
          id: newUser.user.id,
          email: newUser.user.email
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('=== ERROR ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});