-- 在 Supabase 项目的 SQL Editor 里整段执行一次即可。
--
-- 字段名直接用驼峰命名（跟小程序端 utils/store.js 期望的字段名一一对应），
-- 不加字段名转换层。4 张表都开 RLS 但不加任何策略——默认拒绝一切，只有
-- service_role 密钥（只存在于 Edge Function 里，不下发给客户端）能穿透。

create table "users" (
  "openid" text primary key,
  "nickname" text,
  "avatarUrl" text,
  "firstLoginAt" bigint,
  "paperStats" jsonb not null default '{}'::jsonb,
  "activityDates" text[] not null default '{}',
  "accountId" text
);
alter table "users" enable row level security;

create table "wrongBook" (
  "id" text not null, -- paperKey + '_' + hash(stem)，同一题同一用户重复答错只更新这一行
  "openid" text not null references "users"("openid") on delete cascade,
  "paperKey" text not null,
  "paperTag" text,
  "paperName" text,
  "stem" text,
  "options" jsonb,
  "answer" text,
  "lastPicked" text,
  "explanation" text,
  "wrongAt" bigint,
  primary key ("openid", "id") -- 复合主键：id 只按题目哈希，不同用户答错同一题不能撞主键
);
create index "wrongBook_openid_paperKey_idx" on "wrongBook" ("openid", "paperKey");
alter table "wrongBook" enable row level security;

create table "examHistory" (
  "id" bigint generated always as identity primary key,
  "openid" text not null references "users"("openid") on delete cascade,
  "paperKey" text,
  "paperTag" text,
  "paperName" text,
  "config" jsonb,
  "questions" jsonb,
  "answers" jsonb,
  "total" int,
  "correct" int,
  "passed" boolean,
  "timestamp" bigint
);
create index "examHistory_openid_timestamp_idx" on "examHistory" ("openid", "timestamp" desc);
alter table "examHistory" enable row level security;

create table "feedback" (
  "id" bigint generated always as identity primary key,
  "openid" text not null references "users"("openid") on delete cascade,
  "rating" int,
  "text" text,
  "submittedAt" bigint
);
alter table "feedback" enable row level security;
