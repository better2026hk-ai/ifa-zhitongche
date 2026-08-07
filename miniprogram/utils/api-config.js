// project ref 是 Supabase 项目地址里的那一段，anon key 是公开的客户端 key
// （Project Settings -> API 里的 "anon public"），都不是密钥，公开也没事。
//
// ANON_KEY 需要放进每次请求的 Authorization 头——Supabase 网关本身会先
// 校验这个头是不是合法 JWT，跟我们自己在 Edge Function 里做的 token 校验
// 是两层完全独立的东西：这层过了网关才会走到函数代码，函数代码里再验一次
// 我们自己签的登录 token。走网页版 "Via Editor" 部署时 config.toml 里的
// verify_jwt=false 不生效（那个只有 CLI 部署才会读），所以这层网关校验必须
// 靠带上 anon key 来过，不能指望关掉它。
module.exports = {
  API_BASE: 'https://rzltdhwgizmqtwqbllra.supabase.co/functions/v1/api',
  ANON_KEY:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6bHRkaHdnaXptcXR3cWJsbHJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNzE1NjUsImV4cCI6MjEwMTY0NzU2NX0.7YVh46W_xFSJHDF-P1qprlUS2PoQ9r-A0bsR7CjK74o'
};
