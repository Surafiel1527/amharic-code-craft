import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationOperation {
  operation: 'send' | 'send_bulk' | 'get_user_notifications' | 'mark_read' | 'mark_all_read' | 'delete' | 'get_preferences' | 'update_preferences' | 'send_alert';
  params: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Unified Notifications request initiated`);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: NotificationOperation = await req.json();
    console.log(`[${requestId}] Operation: ${payload.operation}`);

    let result;
    switch (payload.operation) {
      case 'send':
        result = await handleSendNotification(payload.params, supabase, requestId);
        break;
      case 'send_bulk':
        result = await handleSendBulkNotifications(payload.params, supabase, requestId);
        break;
      case 'get_user_notifications':
        result = await handleGetUserNotifications(payload.params, supabase, requestId);
        break;
      case 'mark_read':
        result = await handleMarkRead(payload.params, supabase, requestId);
        break;
      case 'mark_all_read':
        result = await handleMarkAllRead(payload.params, supabase, requestId);
        break;
      case 'delete':
        result = await handleDeleteNotification(payload.params, supabase, requestId);
        break;
      case 'get_preferences':
        result = await handleGetPreferences(payload.params, supabase, requestId);
        break;
      case 'update_preferences':
        result = await handleUpdatePreferences(payload.params, supabase, requestId);
        break;
      case 'send_alert':
        result = await handleSendAlert(payload.params, supabase, requestId);
        break;
      default:
        throw new Error(`Unknown operation: ${payload.operation}`);
    }

    console.log(`[${requestId}] Operation completed successfully`);
    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function handleSendNotification(params: any, supabase: any, requestId: string) {
  const { userId, type, title, message, data = {}, priority = 'normal' } = params;
  
  if (!userId || !type || !title || !message) {
    throw new Error('userId, type, title, and message are required');
  }

  console.log(`[${requestId}] Sending notification to user: ${userId}`);

  const { data: notification, error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type,
      title,
      message,
      data,
      priority,
      read: false,
    })
    .select()
    .single();

  if (error) throw error;

  console.log(`[${requestId}] Notification sent: ${notification.id}`);
  return { notificationId: notification.id, ...notification };
}

async function handleSendBulkNotifications(params: any, supabase: any, requestId: string) {
  const { userIds, type, title, message, data = {}, priority = 'normal' } = params;
  
  if (!userIds || !Array.isArray(userIds) || !type || !title || !message) {
    throw new Error('userIds (array), type, title, and message are required');
  }

  console.log(`[${requestId}] Sending bulk notifications to ${userIds.length} users`);

  const notifications = userIds.map(userId => ({
    user_id: userId,
    type,
    title,
    message,
    data,
    priority,
    read: false,
  }));

  const { data: created, error } = await supabase
    .from('notifications')
    .insert(notifications)
    .select();

  if (error) throw error;

  console.log(`[${requestId}] Sent ${created.length} bulk notifications`);
  return { sent: created.length, notifications: created };
}

async function handleGetUserNotifications(params: any, supabase: any, requestId: string) {
  const { userId, limit = 50, unreadOnly = false } = params;
  
  if (!userId) throw new Error('userId is required');

  console.log(`[${requestId}] Fetching notifications for user: ${userId}`);

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (unreadOnly) {
    query = query.eq('read', false);
  }

  const { data: notifications, error } = await query;
  if (error) throw error;

  console.log(`[${requestId}] Retrieved ${notifications.length} notifications`);
  return { notifications, count: notifications.length };
}

async function handleMarkRead(params: any, supabase: any, requestId: string) {
  const { notificationId, userId } = params;
  
  if (!notificationId || !userId) {
    throw new Error('notificationId and userId are required');
  }

  console.log(`[${requestId}] Marking notification as read: ${notificationId}`);

  const { error } = await supabase
    .from('notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', userId);

  if (error) throw error;

  console.log(`[${requestId}] Notification marked as read`);
  return { success: true };
}

async function handleMarkAllRead(params: any, supabase: any, requestId: string) {
  const { userId } = params;
  
  if (!userId) throw new Error('userId is required');

  console.log(`[${requestId}] Marking all notifications as read for user: ${userId}`);

  const { error } = await supabase
    .from('notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) throw error;

  console.log(`[${requestId}] All notifications marked as read`);
  return { success: true };
}

async function handleDeleteNotification(params: any, supabase: any, requestId: string) {
  const { notificationId, userId } = params;
  
  if (!notificationId || !userId) {
    throw new Error('notificationId and userId are required');
  }

  console.log(`[${requestId}] Deleting notification: ${notificationId}`);

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)
    .eq('user_id', userId);

  if (error) throw error;

  console.log(`[${requestId}] Notification deleted`);
  return { success: true };
}

async function handleGetPreferences(params: any, supabase: any, requestId: string) {
  const { userId } = params;
  
  if (!userId) throw new Error('userId is required');

  console.log(`[${requestId}] Fetching notification preferences for user: ${userId}`);

  const { data: preferences, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;

  console.log(`[${requestId}] Retrieved notification preferences`);
  return { preferences: preferences || { user_id: userId, email: true, push: true, in_app: true } };
}

async function handleUpdatePreferences(params: any, supabase: any, requestId: string) {
  const { userId, email, push, inApp } = params;
  
  if (!userId) throw new Error('userId is required');

  console.log(`[${requestId}] Updating notification preferences for user: ${userId}`);

  const { data: preferences, error } = await supabase
    .from('notification_preferences')
    .upsert({
      user_id: userId,
      email: email ?? true,
      push: push ?? true,
      in_app: inApp ?? true,
    })
    .select()
    .single();

  if (error) throw error;

  console.log(`[${requestId}] Notification preferences updated`);
  return { preferences };
}

async function handleSendAlert(params: any, supabase: any, requestId: string) {
  const { alert_type, severity, title, message, metadata = {} } = params;
  
  if (!alert_type || !severity || !title || !message) {
    throw new Error('alert_type, severity, title, and message are required');
  }

  console.log(`[${requestId}] Sending alert: ${title} (${severity})`);

  const { data: alertId, error: alertError } = await supabase.rpc('send_alert', {
    p_alert_type: alert_type,
    p_severity: severity,
    p_title: title,
    p_message: message,
    p_metadata: metadata
  });

  if (alertError) throw alertError;

  const { data: admins } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'admin');

  if (admins && admins.length > 0 && ['error', 'critical'].includes(severity)) {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey) {
      const { data: users } = await supabase.auth.admin.listUsers();
      const adminEmails = users.users
        .filter((u: any) => admins.some((a: any) => a.user_id === u.id))
        .map((u: any) => u.email)
        .filter(Boolean);

      if (adminEmails.length > 0) {
        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: 'alerts@yourdomain.com',
              to: adminEmails,
              subject: `[${severity.toUpperCase()}] ${title}`,
              html: `<h2>${title}</h2><p><strong>Severity:</strong> ${severity}</p><p>${message}</p>`
            })
          });
        } catch (emailError) {
          console.error(`[${requestId}] Email error:`, emailError);
        }
      }
    }
  }

  return { success: true, alert_id: alertId };
}
