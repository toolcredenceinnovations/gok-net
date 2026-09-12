-- Enable Realtime (postgres_changes) on notifications for the header bell's
-- live unread badge. RLS still applies to what each subscriber receives —
-- "read own notifications" already scopes this to `user_id = auth.uid()`.
alter publication supabase_realtime add table notifications;
