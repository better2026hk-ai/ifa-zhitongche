-- 追加到已经跑过 schema.sql / schema_questions.sql 的项目上——给 users
-- 表加一列记录"章节练习模式上次做到哪"，单独在 SQL Editor 里跑一次。

alter table "users" add column "practiceProgress" jsonb not null default '{}'::jsonb;
