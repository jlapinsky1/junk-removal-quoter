-- Fix: add p_decision_context parameter to approve_quote_atomic
-- (decision_context column was added to quote_snapshots in 003, but the RPC was never updated)

CREATE OR REPLACE FUNCTION approve_quote_atomic(
  p_booking_id uuid,
  p_admin_id uuid,
  p_approved_price numeric,
  p_recommended_price numeric,
  p_estimate_snapshot jsonb,
  p_settings_snapshot jsonb,
  p_available_slots jsonb,
  p_expires_at timestamptz,
  p_customer_terms jsonb,
  p_admin_override jsonb,
  p_token_hash text,
  p_decision_context jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking     record;
  v_new_version integer;
  v_snapshot_id uuid;
  v_token_id    uuid;
BEGIN
  -- Verify admin
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE user_id = p_admin_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Lock booking
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  v_new_version := COALESCE(v_booking.quote_version, 0) + 1;

  -- Create immutable snapshot (includes decision_context)
  INSERT INTO quote_snapshots (
    booking_id, version, approved_price, recommended_price,
    estimate_snapshot, settings_snapshot, available_slots,
    expires_at, customer_terms, admin_override, admin_id, decision_context
  ) VALUES (
    p_booking_id, v_new_version, p_approved_price, p_recommended_price,
    p_estimate_snapshot, p_settings_snapshot, p_available_slots,
    p_expires_at, p_customer_terms, p_admin_override, p_admin_id, p_decision_context
  )
  RETURNING id INTO v_snapshot_id;

  -- Revoke previous tokens
  UPDATE quote_tokens
  SET revoked_at = NOW()
  WHERE booking_id = p_booking_id
    AND revoked_at IS NULL;

  -- Log revocations
  INSERT INTO audit_log (booking_id, event_type, admin_id, metadata)
  SELECT p_booking_id, 'token_revoked', p_admin_id,
    jsonb_build_object('token_id', id, 'reason', 'superseded_by_v' || v_new_version)
  FROM quote_tokens
  WHERE booking_id = p_booking_id
    AND revoked_at = NOW();

  -- Create new token
  INSERT INTO quote_tokens (
    booking_id, quote_snapshot_id, token_hash, expires_at
  ) VALUES (
    p_booking_id, v_snapshot_id, p_token_hash, p_expires_at
  )
  RETURNING id INTO v_token_id;

  -- Update booking
  UPDATE bookings SET
    status = 'quote_sent',
    quote_version = v_new_version,
    approved_quote = p_approved_price,
    quote_expires_at = p_expires_at,
    approved_at = NOW(),
    quote_token_hash = p_token_hash,
    internal_estimate = p_estimate_snapshot
  WHERE id = p_booking_id;

  -- Audit: approval
  INSERT INTO audit_log (
    booking_id, event_type, admin_id, after_value, metadata
  ) VALUES (
    p_booking_id, 'quote_approved', p_admin_id,
    jsonb_build_object('approved_price', p_approved_price, 'version', v_new_version),
    jsonb_build_object('snapshot_id', v_snapshot_id, 'token_id', v_token_id)
  );

  RETURN jsonb_build_object(
    'success', true,
    'version', v_new_version,
    'snapshot_id', v_snapshot_id,
    'token_id', v_token_id
  );
END;
$$;
