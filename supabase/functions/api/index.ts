// 单入口 Edge Function：小程序端把所有数据读写都发到这一个地址，body 是
// { action, token, ...payload }。除了 "login" 之外的每个 action 都先验签
// token 解出 openid，再显式按 openid 过滤/写入——这张服务不依赖 Supabase 的
// RLS/Auth，也不需要给客户端发 anon key（config.toml 里关了 verify_jwt）。
//
// 4 张表（users / wrongBook / examHistory / feedback）用 service_role 密钥
// 直连，这个密钥只存在于这个函数的运行环境里，从不下发给客户端。

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WX_APPID = Deno.env.get("WX_APPID")!;
const WX_SECRET = Deno.env.get("WX_SECRET")!;
const SESSION_SECRET = Deno.env.get("SESSION_SECRET")!;
const TOKEN_TTL_MS = 180 * 24 * 60 * 60 * 1000; // 半年

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function ok(data: unknown = {}) {
  return json({ ok: true, data });
}

function fail(error: string, status = 400) {
  return json({ ok: false, error }, status);
}

/* ============================================================
   签名 token —— HMAC-SHA256，payload 是 { openid, exp }，不用第三方 JWT 库
============================================================ */

function base64url(bytes: Uint8Array): string {
  const str = btoa(String.fromCharCode(...bytes));
  return str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str: string): Uint8Array {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function hmac(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return base64url(new Uint8Array(sig));
}

async function signToken(openid: string): Promise<string> {
  const payload = base64url(new TextEncoder().encode(JSON.stringify({ openid, exp: Date.now() + TOKEN_TTL_MS })));
  return `${payload}.${await hmac(payload)}`;
}

async function verifyToken(token: unknown): Promise<string | null> {
  if (typeof token !== "string" || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  if ((await hmac(payload)) !== sig) return null;
  try {
    const { openid, exp } = JSON.parse(new TextDecoder().decode(base64urlDecode(payload)));
    if (typeof exp !== "number" || Date.now() > exp) return null;
    return openid || null;
  } catch {
    return null;
  }
}

/* ============================================================
   错题本去重 id —— paperKey + hash(stem)，同一用户重复答错同一题只更新一行
   （表的主键是复合的 (openid, id)，不同用户答错同一题不会互相覆盖）
============================================================ */

function hashDedupeKey(paperKey: string, stem: string): string {
  let h = 2166136261; // FNV-1a 32位
  for (let i = 0; i < stem.length; i++) {
    h ^= stem.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `${paperKey}_${(h >>> 0).toString(36)}`;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/* ============================================================
   微信 code -> openid
============================================================ */

async function code2Session(code: string): Promise<{ openid: string }> {
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${WX_APPID}&secret=${WX_SECRET}&js_code=${code}&grant_type=authorization_code`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.openid) throw new Error(data.errmsg || "微信登录换取 openid 失败");
  return data;
}

/* ============================================================
   users 表读写辅助
============================================================ */

async function getUserRow(openid: string) {
  const { data, error } = await db.from("users").select("*").eq("openid", openid).maybeSingle();
  if (error) throw error;
  return data;
}

function genAccountId(): string {
  return "wxid_" + Math.random().toString(36).slice(2, 10);
}

// 答题统计原子性不强（读-改-写），但这是单人练习场景，同一用户不会并发提交
// 答案，不用上锁；跟原来 wx.storage 时代的一致性水平一样。
async function bumpUserStats(openid: string, deltas: Record<string, { done: number; correct: number }>) {
  const user = await getUserRow(openid);
  if (!user) return;
  const paperStats = user.paperStats || {};
  Object.keys(deltas).forEach((k) => {
    if (!paperStats[k]) paperStats[k] = { done: 0, correct: 0 };
    paperStats[k].done += deltas[k].done;
    paperStats[k].correct += deltas[k].correct;
  });
  const activityDates = new Set<string>(user.activityDates || []);
  activityDates.add(dateKey(new Date()));
  const { error } = await db
    .from("users")
    .update({ paperStats, activityDates: Array.from(activityDates) })
    .eq("openid", openid);
  if (error) throw error;
}

/* ============================================================
   入口
============================================================ */

Deno.serve(async (req) => {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return fail("请求体不是合法 JSON");
  }
  const { action } = body;

  if (action === "login") {
    try {
      const { openid } = await code2Session(body.code);
      let user = await getUserRow(openid);
      if (!user) {
        const { data, error } = await db.from("users").insert({ openid }).select("*").single();
        if (error) throw error;
        user = data;
      }
      return ok({ token: await signToken(openid), user });
    } catch (e: any) {
      return fail(e.message || "登录失败", 500);
    }
  }

  const openid = await verifyToken(body.token);
  if (!openid) return fail("unauthorized", 401);

  try {
    switch (action) {
      case "getUser": {
        return ok(await getUserRow(openid));
      }

      case "saveProfile": {
        const existing = await getUserRow(openid);
        const patch: Record<string, unknown> = {
          nickname: body.nickname,
          avatarUrl: body.avatarUrl
        };
        if (!existing?.firstLoginAt) patch.firstLoginAt = Date.now();
        if (!existing?.accountId) patch.accountId = genAccountId();
        const { data, error } = await db.from("users").update(patch).eq("openid", openid).select("*").single();
        if (error) throw error;
        return ok(data);
      }

      case "fetchPracticeQuestions": {
        // 章节练习模式要按章节浏览整份题库，一次性把这份卷子全量返回，
        // 按 idx 排好序（章节内"N. "编号就是靠这个顺序对上的）。
        const { data, error } = await db
          .from("questions")
          .select("*")
          .eq("paperKey", body.paperKey)
          .order("idx", { ascending: true });
        if (error) throw error;
        return ok(data);
      }

      case "fetchExamQuestions": {
        // 模拟考试只需要随机抽 N 题——在这边（数据库同一网络内）取整份卷子
        // 再洗牌切片，客户端只收到抽中的这些题，不用把整份题库传给小程序。
        const { data, error } = await db.from("questions").select("*").eq("paperKey", body.paperKey);
        if (error) throw error;
        return ok(shuffleArray(data).slice(0, body.count));
      }

      case "answerQuestion": {
        const { paperKey, isCorrect, pickedLetter, stem, options, answer, explanation, paperTag, paperName } = body;
        const id = hashDedupeKey(paperKey, stem);
        const jobs: Promise<unknown>[] = [
          bumpUserStats(openid, { [paperKey]: { done: 1, correct: isCorrect ? 1 : 0 } })
        ];
        if (isCorrect) {
          jobs.push(db.from("wrongBook").delete().eq("openid", openid).eq("id", id));
        } else {
          jobs.push(
            db.from("wrongBook").upsert(
              {
                id,
                openid,
                paperKey,
                paperTag: paperTag || null,
                paperName: paperName || null,
                stem,
                options,
                answer,
                lastPicked: pickedLetter,
                explanation,
                wrongAt: Date.now()
              },
              { onConflict: "openid,id" }
            )
          );
        }
        await Promise.all(jobs);
        return ok({});
      }

      case "fetchWrongBook": {
        const { data, error } = await db
          .from("wrongBook")
          .select("*")
          .eq("openid", openid)
          .order("wrongAt", { ascending: false });
        if (error) throw error;
        return ok(data);
      }

      case "removeWrongBookEntry": {
        const { error } = await db.from("wrongBook").delete().eq("openid", openid).eq("id", body.id);
        if (error) throw error;
        return ok({});
      }

      case "countWrongBook": {
        const { count, error } = await db
          .from("wrongBook")
          .select("id", { count: "exact", head: true })
          .eq("openid", openid);
        if (error) throw error;
        return ok({ count: count || 0 });
      }

      case "fetchExamHistory": {
        const { data, error } = await db
          .from("examHistory")
          .select("*")
          .eq("openid", openid)
          .order("timestamp", { ascending: false });
        if (error) throw error;
        return ok(data);
      }

      case "recordExamResult": {
        const { paperKey, questions, answers, paperTag, paperName, config } = body;
        let done = 0;
        let correct = 0;
        const wrongRows: Record<string, unknown>[] = [];
        const correctIds: string[] = [];
        questions.forEach((q: any, i: number) => {
          const picked = answers[i];
          if (!picked) return;
          done++;
          const id = hashDedupeKey(paperKey, q.stem);
          if (picked === q.answer) {
            correct++;
            correctIds.push(id);
          } else {
            wrongRows.push({
              id,
              openid,
              paperKey,
              paperTag,
              paperName,
              stem: q.stem,
              options: q.options,
              answer: q.answer,
              lastPicked: picked,
              explanation: q.explanation || "",
              wrongAt: Date.now()
            });
          }
        });

        const jobs: Promise<unknown>[] = [bumpUserStats(openid, { [paperKey]: { done, correct } })];
        if (correctIds.length) {
          jobs.push(db.from("wrongBook").delete().eq("openid", openid).in("id", correctIds));
        }
        if (wrongRows.length) {
          jobs.push(db.from("wrongBook").upsert(wrongRows, { onConflict: "openid,id" }));
        }
        jobs.push(
          db.from("examHistory").insert({
            openid,
            paperKey,
            paperTag,
            paperName,
            config,
            questions,
            answers,
            total: questions.length,
            correct,
            passed: correct >= (config?.passCount || 0),
            timestamp: Date.now()
          })
        );
        await Promise.all(jobs);
        return ok({});
      }

      case "submitFeedback": {
        const { error } = await db
          .from("feedback")
          .insert({ openid, rating: body.rating, text: body.text, submittedAt: Date.now() });
        if (error) throw error;
        return ok({});
      }

      default:
        return fail(`未知 action: ${action}`, 400);
    }
  } catch (e: any) {
    console.error(e);
    return fail(e.message || "服务器内部错误", 500);
  }
});
