-- 追加到已经跑过 schema.sql 的项目上——题库数据从小程序分包搬进数据库
-- 之后要建的新表，不是 schema.sql 的一部分，单独在 SQL Editor 里跑一次。
--
-- 权限规则跟其他 4 张表一样：开 RLS 但不加策略，只有 Edge Function 里的
-- service_role 能读——题库内容虽然不是"个人数据"，但反正整个小程序都在
-- 登录墙后面，没必要单独开一条公开只读的口子，统一走同一个函数更省心。

create table "questions" (
  "id" bigint generated always as identity primary key,
  "paperKey" text not null,
  "idx" int not null, -- 保留原始顺序（章节内号码"N. "就是靠这个顺序对上的）
  "chapter" text,
  "chapterTitle" text,
  "stem" text not null,
  "options" jsonb not null,
  "answer" text not null,
  "explanation" text
);
create index "questions_paperKey_idx_idx" on "questions" ("paperKey", "idx");
alter table "questions" enable row level security;
