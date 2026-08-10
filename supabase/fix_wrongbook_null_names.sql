-- 一次性数据修复：之前 store.js 的 answerQuestion 没有把科目名称传给
-- 服务端，导致章节练习/错题本测验答错时写进 wrongBook 的 paperTag/
-- paperName 一直是 null（错题本列表页显示成"null"）。代码已经修好
-- （现在会带上这两个字段），但已经写进去的旧数据要在 SQL Editor 里
-- 跑一次这个脚本补回来，跑完之后错题本列表就会显示正常的科目名称了。

update "wrongBook" set "paperTag" = 'Paper Ⅰ', "paperName" = '保险原理及实务' where "paperKey" = 'p1' and "paperTag" is null;
update "wrongBook" set "paperTag" = 'Paper Ⅱ', "paperName" = '一般保险' where "paperKey" = 'p2' and "paperTag" is null;
update "wrongBook" set "paperTag" = 'Paper Ⅲ', "paperName" = '长期保险' where "paperKey" = 'p3' and "paperTag" is null;
update "wrongBook" set "paperTag" = 'Paper Ⅴ', "paperName" = '投资相连长期保险' where "paperKey" = 'p5' and "paperTag" is null;
update "wrongBook" set "paperTag" = 'MPF', "paperName" = '强制性公积金计划' where "paperKey" = 'mpf' and "paperTag" is null;
