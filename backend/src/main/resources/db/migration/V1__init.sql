create table users (
    id            uuid primary key,
    email         text        not null unique,
    name          text        not null,
    auth_provider text        not null,
    created_at    timestamptz not null default now()
);

create table sessions (
    id            uuid primary key,
    slug          text        not null unique,
    host_id       uuid        not null references users (id),
    activity_type text        not null,
    status        text        not null,
    expires_at    timestamptz not null,
    created_at    timestamptz not null default now()
);

create table participants (
    id           uuid primary key,
    session_id   uuid        not null references sessions (id) on delete cascade,
    display_name text        not null,
    lat          double precision,
    lng          double precision,
    token        text        not null unique,
    joined_at    timestamptz not null default now(),
    deck_done_at timestamptz
);

create table venues (
    id          uuid primary key,
    session_id  uuid             not null references sessions (id) on delete cascade,
    provider    text             not null,
    external_id text             not null,
    name        text             not null,
    lat         double precision not null,
    lng         double precision not null,
    rating      numeric(2, 1),
    price_level smallint,
    photo_url   text,
    maps_url    text,
    deck_order  int              not null,
    unique (session_id, external_id),
    unique (session_id, deck_order)
);

create table swipes (
    session_id     uuid        not null references sessions (id) on delete cascade,
    venue_id       uuid        not null references venues (id) on delete cascade,
    participant_id uuid        not null references participants (id) on delete cascade,
    liked          boolean     not null,
    swiped_at      timestamptz not null default now(),
    primary key (venue_id, participant_id)
);

create table votes (
    session_id     uuid        not null references sessions (id) on delete cascade,
    venue_id       uuid        not null references venues (id) on delete cascade,
    participant_id uuid        not null references participants (id) on delete cascade,
    voted_at       timestamptz not null default now(),
    primary key (session_id, participant_id)
);

create index idx_participants_session on participants (session_id);
create index idx_venues_session on venues (session_id);
create index idx_swipes_session on swipes (session_id);
