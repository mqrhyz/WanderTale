-- One-time (or limited) redemption of promotion vouchers for user subscriptions.
CREATE TABLE IF NOT EXISTS public.voucher_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  voucher_id UUID NOT NULL REFERENCES public.vouchers(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.platform_transactions(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, voucher_id)
);

CREATE INDEX IF NOT EXISTS voucher_redemptions_voucher_idx
  ON public.voucher_redemptions (voucher_id);

CREATE INDEX IF NOT EXISTS voucher_redemptions_user_idx
  ON public.voucher_redemptions (user_id);

ALTER TABLE public.voucher_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS voucher_redemptions_select_own ON public.voucher_redemptions;
CREATE POLICY voucher_redemptions_select_own ON public.voucher_redemptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

COMMENT ON TABLE public.voucher_redemptions IS
  'Tracks redeemed user-subscription / pro_plan vouchers so gift codes cannot be reused per user.';
