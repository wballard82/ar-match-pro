// ARMP R3 auth config — PUBLIC values only (safe in browser-delivered code).
// The service-role key NEVER appears in any frontend file.
window.ARMP_SUPABASE_URL = "https://vjxdqmujxnmlfvnksvpy.supabase.co";
window.ARMP_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_PPfyGFk-_KdzG_IMiTmxYQ_SSOUrgYc";
// Same-origin allowlist for post-auth redirects (prevents open-redirect abuse)
window.ARMP_ALLOWED_NEXT = ["/app.html", "/admin.html"];
window.armpNext = function(){
  try{
    var n = new URLSearchParams(location.search).get("next") || "/app.html";
    return window.ARMP_ALLOWED_NEXT.indexOf(n) >= 0 ? n : "/app.html";
  }catch(e){ return "/app.html"; }
};
window.armpSb = function(){
  return window.supabase.createClient(window.ARMP_SUPABASE_URL, window.ARMP_SUPABASE_PUBLISHABLE_KEY);
};
