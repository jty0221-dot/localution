-- LU-018 · 2026-10-24 운영 DB 에 Supabase MCP apply_migration 으로 이미 적용한 변경의 기록본.
-- 다시 실행해도 결과가 같다(enable/alter set/revoke 는 반복 가능, CHECK 는 drop 후 재생성).

-- 1) lu018_enable_rls_8_tables — 공개 키로 읽고 쓰던 8표 차단. 정책 없음 = service_role 만 접근.
alter table public.user_notification_prefs enable row level security;
alter table public.notification_log        enable row level security;
alter table public.qr_review_logs          enable row level security;
alter table public.stamp_collections       enable row level security;
alter table public.stamp_events            enable row level security;
alter table public.stamp_cards             enable row level security;
alter table public.menu_items              enable row level security;
alter table public.menu_imports            enable row level security;

-- 2) lu018_harden_views_functions — RLS 를 우회하던 뷰 3개 · 트리거 함수 rpc 노출 · search_path
alter view public.v_user_points set (security_invoker = true);
alter view public.place_keyword_latest set (security_invoker = true);
alter view public.place_keyword_competitors_latest set (security_invoker = true);
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.recalc_customer_stats() from public, anon, authenticated;
revoke execute on function public.has_entitlement(public.module_id) from public, anon;
grant execute on function public.has_entitlement(public.module_id) to authenticated;
alter function public.handle_new_user() set search_path = public;
alter function public.stores_set_updated_at() set search_path = public;
alter function public.touch_updated_at() set search_path = public;
alter function public.touch_blog_tracking_targets() set search_path = public;
alter function public.touch_app_updates() set search_path = public;
alter function public.touch_place_targets() set search_path = public;
alter function public.set_updated_at() set search_path = public;
alter function public.touch_user_notification_prefs() set search_path = public;
alter function public.qr_codes_set_updated_at() set search_path = public;

-- 3) lu018_reply_status_allow_rejected — 사장님 '초안 무시'(approve DELETE)가 쓰는 'rejected' 허용
alter table public.platform_reviews drop constraint if exists platform_reviews_reply_status_check;
alter table public.platform_reviews add constraint platform_reviews_reply_status_check
  check (reply_status = any (array['none','draft','queued','submitting','submitted','failed','rejected']));

-- 되돌리기: 1) disable row level security · 2) security_invoker=false, grant execute 복구 · 3) 'rejected' 행을 'none' 으로 바꾼 뒤 이전 CHECK 재생성
