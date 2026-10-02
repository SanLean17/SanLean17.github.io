BEGIN;
DO $qa$
DECLARE
  ws uuid; owner_id uuid; qa_overlay_id uuid; public_key uuid; control_key uuid; affected integer;
BEGIN
  SELECT id,owner_user_id INTO ws,owner_id FROM public.streamer_workspaces ORDER BY created_at LIMIT 1;
  IF ws IS NULL THEN RAISE EXCEPTION 'No workspace available for rollback-only verification'; END IF;
  INSERT INTO public.stream_overlays(workspace_id,kind,settings,state)
  VALUES(ws,'challenge_all_survivors','{"lastRowAlignment":"center"}','{"status":"active","visible":true,"entries":{"fixture":"pending"}}')
  RETURNING id,public_token,control_token INTO qa_overlay_id,public_key,control_key;

  PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
  PERFORM set_config('role','authenticated',true);
  UPDATE public.stream_overlays SET settings='{"lastRowAlignment":"right"}' WHERE id=qa_overlay_id AND workspace_id=ws;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Owner update failed'; END IF;

  PERFORM set_config('role','anon',true);
  IF NOT EXISTS(SELECT 1 FROM public.get_stream_overlay_by_token(public_key::text) r
    WHERE r.overlay_id=qa_overlay_id AND r.kind='challenge_all_survivors' AND NOT r.can_control AND r.settings->>'lastRowAlignment'='right')
  THEN RAISE EXCEPTION 'Public read failed'; END IF;
  IF public.update_stream_overlay_by_control(public_key::text,'{"visible":false}') THEN RAISE EXCEPTION 'Public token allowed write'; END IF;
  IF NOT public.update_stream_overlay_by_control(control_key::text,'{"status":"paused","visible":false,"entries":{"fixture":"completed"}}') THEN RAISE EXCEPTION 'Control token failed'; END IF;

  PERFORM set_config('role','authenticated',true);
  PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  UPDATE public.stream_overlays SET settings='{}' WHERE id=qa_overlay_id;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>0 THEN RAISE EXCEPTION 'Unrelated user updated overlay'; END IF;
  IF EXISTS(SELECT 1 FROM public.stream_overlays WHERE id=qa_overlay_id) THEN RAISE EXCEPTION 'Unrelated user read overlay'; END IF;

  PERFORM set_config('role','postgres',true);
  IF NOT EXISTS(SELECT 1 FROM public.stream_overlays WHERE id=qa_overlay_id AND settings->>'lastRowAlignment'='right' AND state->>'status'='paused')
  THEN RAISE EXCEPTION 'Settings/state were not independent'; END IF;
END $qa$;
ROLLBACK;
SELECT 'PASS: survivor kind, owner update, public read-only token, private control token, outsider RLS; every fixture rolled back' AS result;
