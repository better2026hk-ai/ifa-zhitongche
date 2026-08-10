-- 第一步：先看看每个科目实际有多少行，确认重复的范围
-- （正常应该是 p1=913, p2=655, p3=930, p5=649, mpf=601）
select "paperKey", count(*) as row_count
from "questions"
group by "paperKey"
order by "paperKey";

-- 第二步：确认有重复之后，跑下面这句去重——按 (paperKey, idx) 分组，
-- 每组只留 id 最小的那一行（最早插入的），其余全部删掉。这句对所有
-- 科目都生效，不只是 p1，防止别的科目也不小心被导入了两遍。
delete from "questions" a
using "questions" b
where a."paperKey" = b."paperKey"
  and a."idx" = b."idx"
  and a.id > b.id;

-- 第三步：删完再跑一次第一步那句 select，确认每个科目的数量都恢复正常了。

-- 第四步（防止以后再犯）：给 (paperKey, idx) 加一个唯一约束，以后哪怕
-- 不小心把同一份导入脚本跑了两次，数据库会直接报错拒绝插入，不会再
-- 静默产生重复数据。只需要跑一次。
alter table "questions" add constraint questions_paperkey_idx_unique unique ("paperKey", "idx");

