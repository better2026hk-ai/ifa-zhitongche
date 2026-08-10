// 批量更新题库用的生成脚本——给以后的 Claude 复用，不用重新想一遍
// 转义/哈希逻辑。用法：
//
//   node generate-insert-sql.js <paperKey> <题库json路径> [--replace] > out.sql
//
// <题库json路径> 指向的文件必须是一个数组，每题的字段跟 handoff/question-banks/
// 里原始文件一致：{ chapter, chapter_title, stem, options:{A,B,C,D}, answer, explanation }
//
// --replace：如果这门科目（paperKey）在 questions 表里已经有数据（比如这次是
// "换掉整份旧题库"而不是"新增一门科目"），加这个参数会在 INSERT 前面加一句
// DELETE，先删掉这个 paperKey 的所有旧题，避免新旧题目混在一起、idx 重复。
// 新增一门全新科目（数据库里还没有这个 paperKey）不需要加这个参数。
//
// 生成的 SQL 直接整段粘到 Supabase 后台的 SQL Editor 里跑一次就行。

const fs = require('fs');
const path = require('path');

const [paperKey, jsonPath, flag] = process.argv.slice(2);

if (!paperKey || !jsonPath) {
  console.error('用法: node generate-insert-sql.js <paperKey> <题库json路径> [--replace]');
  process.exit(1);
}

function sqlStr(v) {
  if (v === null || v === undefined) return 'NULL';
  return `'${String(v).replace(/'/g, "''")}'`;
}

function sqlJsonb(v) {
  const json = JSON.stringify(v);
  return `'${json.replace(/'/g, "''")}'::jsonb`;
}

const questions = JSON.parse(fs.readFileSync(path.resolve(jsonPath), 'utf8'));

const lines = [];
if (flag === '--replace') {
  lines.push(`delete from "questions" where "paperKey" = ${sqlStr(paperKey)};`);
}

const rows = questions.map((q, idx) => {
  return `(${sqlStr(paperKey)}, ${idx}, ${sqlStr(q.chapter)}, ${sqlStr(q.chapter_title)}, ${sqlStr(q.stem)}, ${sqlJsonb(q.options)}, ${sqlStr(q.answer)}, ${sqlStr(q.explanation)})`;
});

lines.push(
  `insert into "questions" ("paperKey", "idx", "chapter", "chapterTitle", "stem", "options", "answer", "explanation") values\n${rows.join(',\n')};`
);

console.log(lines.join('\n\n'));
console.error(`生成完毕：${questions.length} 道题，paperKey=${paperKey}${flag === '--replace' ? '（含替换旧数据的 DELETE）' : ''}`);
