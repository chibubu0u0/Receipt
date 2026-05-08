-- Song Receipt Studio｜Free 10 credits migration
-- 如果你想讓既有會員也至少有 10 次免費生成，請到 Supabase SQL Editor 執行本檔。
-- 只會把低於 10 次的帳號補到 10 次，不會降低任何人的點數。

update public.user_credits
set remaining_credits = 10,
    updated_at = now()
where remaining_credits < 10;
