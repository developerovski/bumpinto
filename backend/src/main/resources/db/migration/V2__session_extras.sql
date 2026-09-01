alter table sessions add column name text;
alter table sessions add column decided_venue_id uuid references venues (id);
alter table sessions add column runoff_venue_ids text;
alter table participants add column is_host boolean not null default false;
