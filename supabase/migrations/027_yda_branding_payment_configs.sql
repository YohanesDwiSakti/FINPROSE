-- Migration: 027_yda_branding_payment_configs.sql
-- Update payment method account names to YDA LAW OFFICE & Partners branding.

update public.payment_method_configs
set
  account_name = 'YDA LAW OFFICE & Partners',
  updated_at = now()
where account_name ilike '%finpro%'
   or account_name ilike '%fin prose%'
   or account_name ilike '%rawlaw%';
