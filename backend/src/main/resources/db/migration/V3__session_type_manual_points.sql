alter table sessions add column session_type text not null default 'GROUP';

alter table participants add column is_manual boolean not null default false;
alter table participants add column location_label text;
-- Elle eklenen konumun token'ı yoktur. unique(token) NULL'lari ayirt etmez: Postgres'te
-- birden cok NULL ayni unique indexte gecerlidir.
alter table participants alter column token drop not null;
