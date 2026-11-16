-- Robot konuşma havuzu (robotegitim.github.io)
-- Düzen: "sadece ekleme". Siteden herkes okur ve yeni kayıt ekler; hiçbir şey güncellenemez ya da silinemez.
-- Temizlik (saçma kayıtları gizleme) yalnız Supabase panelinden yapılır: ilgili satırda silindi = true.

create table public.konular (
  id          text primary key default ('k' || replace(gen_random_uuid()::text, '-', '')),
  ad          text not null check (char_length(ad) between 1 and 80),
  sira        int  not null default 1000,
  yazan       text check (yazan is null or char_length(yazan) <= 40),
  yazan_ad    text check (yazan_ad is null or char_length(yazan_ad) <= 40),
  olusturma   timestamptz not null default now(),
  silindi     boolean not null default false
);

create table public.soylenisler (
  id          bigint generated always as identity primary key,
  konu_id     text not null references public.konular(id),
  metin       text not null check (char_length(metin) between 1 and 200),
  yazan       text check (yazan is null or char_length(yazan) <= 40),
  yazan_ad    text check (yazan_ad is null or char_length(yazan_ad) <= 40),
  olusturma   timestamptz not null default now(),
  silindi     boolean not null default false
);

create table public.cevaplar (
  id          text primary key default ('c' || replace(gen_random_uuid()::text, '-', '')),
  konu_id     text not null references public.konular(id),
  ruh         text not null default '*' check (ruh in ('*', 'mutlu', 'üzgün', 'yorgun', 'heyecanlı')),
  metin       text not null check (char_length(metin) between 1 and 300),
  kaynak      text not null default 'kisi' check (kaynak in ('kisi', 'claude')),
  yazan       text check (yazan is null or char_length(yazan) <= 40),
  yazan_ad    text check (yazan_ad is null or char_length(yazan_ad) <= 40),
  olusturma   timestamptz not null default now(),
  silindi     boolean not null default false
);

-- 👍 / 👎. Bir cevabın durumu, ona verilen SON tepkidir.
create table public.tepkiler (
  id          bigint generated always as identity primary key,
  cevap_id    text not null references public.cevaplar(id),
  tur         text not null check (tur in ('begen', 'begenme')),
  yazan       text check (yazan is null or char_length(yazan) <= 40),
  yazan_ad    text check (yazan_ad is null or char_length(yazan_ad) <= 40),
  olusturma   timestamptz not null default now()
);

create index soylenisler_konu_idx on public.soylenisler (konu_id);
create index cevaplar_konu_idx    on public.cevaplar (konu_id);
create index tepkiler_cevap_idx   on public.tepkiler (cevap_id, olusturma);

alter table public.konular     enable row level security;
alter table public.soylenisler enable row level security;
alter table public.cevaplar    enable row level security;
alter table public.tepkiler    enable row level security;

-- Okuma ve ekleme izni; güncelleme/silme izni bilerek verilmedi.
grant select, insert on public.konular, public.soylenisler, public.cevaplar, public.tepkiler to anon, authenticated;
grant usage on all sequences in schema public to anon, authenticated;

create policy "herkes okur"  on public.konular     for select to anon, authenticated using (true);
create policy "herkes ekler" on public.konular     for insert to anon, authenticated with check (silindi = false and sira = 1000);
create policy "herkes okur"  on public.soylenisler for select to anon, authenticated using (true);
create policy "herkes ekler" on public.soylenisler for insert to anon, authenticated with check (silindi = false);
create policy "herkes okur"  on public.cevaplar    for select to anon, authenticated using (true);
create policy "herkes ekler" on public.cevaplar    for insert to anon, authenticated with check (silindi = false and kaynak = 'kisi');
create policy "herkes okur"  on public.tepkiler    for select to anon, authenticated using (true);
create policy "herkes ekler" on public.tepkiler    for insert to anon, authenticated with check (true);
