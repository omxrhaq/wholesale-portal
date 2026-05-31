with matched_customers as (
  select
    c.id as customer_id,
    u.id as user_id
  from public.customers c
  join auth.users u
    on lower(u.email) = lower(c.email)
  where c.portal_user_id is null
    and c.email is not null
    and not exists (
      select 1
      from public.customers c2
      where c2.id <> c.id
        and c2.company_id = c.company_id
        and c2.portal_user_id = u.id
    )
)
update public.customers c
set
  portal_user_id = matched_customers.user_id,
  updated_at = now()
from matched_customers
where c.id = matched_customers.customer_id;--> statement-breakpoint

insert into public.profiles (id, email, full_name)
select
  u.id,
  u.email,
  coalesce(nullif(trim(c.name), ''), u.email)
from public.customers c
join auth.users u
  on u.id = c.portal_user_id
where c.portal_user_id is not null
on conflict (id) do update
set
  email = excluded.email,
  full_name = excluded.full_name;--> statement-breakpoint

insert into public.company_users (company_id, user_id, role)
select
  c.company_id,
  c.portal_user_id,
  'buyer'
from public.customers c
where c.portal_user_id is not null
on conflict (company_id, user_id) do nothing;
