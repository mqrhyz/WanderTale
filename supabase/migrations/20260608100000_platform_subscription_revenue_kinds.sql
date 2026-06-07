-- Allow subscription purchases to be tracked as first-class platform revenue.
-- Existing ad_purchase rows remain the current business package/subscription
-- revenue source; these kinds are for future user/business subscription flows.

ALTER TABLE public.platform_transactions DROP CONSTRAINT IF EXISTS platform_transactions_kind_check;
ALTER TABLE public.platform_transactions ADD CONSTRAINT platform_transactions_kind_check CHECK (
  kind IN (
    'booking_commission', 'ad_purchase', 'business_payout',
    'booking_payment', 'commission', 'payout', 'refund', 'adjustment',
    'business_subscription', 'user_subscription'
  )
);
