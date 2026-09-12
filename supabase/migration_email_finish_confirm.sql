alter table profiles add column if not exists notify_email text;

alter table sessions add column if not exists finish_email_sent_at timestamptz;
