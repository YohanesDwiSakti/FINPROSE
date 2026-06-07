alter table public.lawyer_directory
add column if not exists whatsapp_number text;

comment on column public.lawyer_directory.whatsapp_number
is 'International-format WhatsApp number used after a paid consultation, for example 6281234567890.';
