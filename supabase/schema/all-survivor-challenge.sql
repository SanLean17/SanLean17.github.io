-- Applied migration: allow_all_survivor_challenge_overlay.
-- Add the independent survivor overlay without changing RLS, tokens or rows.
BEGIN;
ALTER TABLE public.stream_overlays DROP CONSTRAINT stream_overlays_kind_check;
ALTER TABLE public.stream_overlays ADD CONSTRAINT stream_overlays_kind_check CHECK (kind IN (
  'roulette_killers','roulette_killer_perks','roulette_survivor_perks','vote',
  'challenge_goal','challenge_streak','challenge_all_killers','challenge_all_survivors','giveaway'
));
COMMIT;
