-- ============================================================
-- CHARLIE GAMES — Schema base
-- Ejecutar en Supabase SQL Editor (una sola vez, es idempotente)
-- ============================================================

-- ── 1. WALLETS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wallets (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance      NUMERIC     NOT NULL DEFAULT 1000 CHECK (balance >= 0),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Cada usuario solo ve y edita su propia wallet
CREATE POLICY "wallet_select_own" ON public.wallets
  FOR SELECT USING (auth.uid() = user_id);

-- Solo funciones con SECURITY DEFINER pueden actualizar (no el cliente directo)
CREATE POLICY "wallet_update_own" ON public.wallets
  FOR UPDATE USING (auth.uid() = user_id);

-- ── 2. WALLET_TRANSACTIONS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type          TEXT        NOT NULL CHECK (type IN ('deposit','withdrawal','bet','win','loss','bonus','promo')),
  amount        NUMERIC     NOT NULL,            -- positivo = crédito, negativo = débito
  balance_after NUMERIC     NOT NULL,
  metadata      JSONB       DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wt_user ON public.wallet_transactions (user_id, created_at DESC);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wt_select_own" ON public.wallet_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- ── 3. PROMO CODES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT        NOT NULL UNIQUE,
  type        TEXT        NOT NULL CHECK (type IN ('fixed','percent','free_spin')),
  value       NUMERIC     NOT NULL,   -- monto o porcentaje
  max_uses    INTEGER     DEFAULT NULL,
  uses_count  INTEGER     NOT NULL DEFAULT 0,
  expires_at  TIMESTAMPTZ DEFAULT NULL,
  active      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "promos_select_active" ON public.promo_codes
  FOR SELECT USING (active = TRUE);

-- Tabla de uso de códigos (evita doble uso por usuario)
CREATE TABLE IF NOT EXISTS public.promo_redemptions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  promo_id   UUID        NOT NULL REFERENCES public.promo_codes(id),
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, promo_id)
);

ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "redemptions_own" ON public.promo_redemptions
  FOR SELECT USING (auth.uid() = user_id);

-- ── 4. TRIGGER: crear wallet automáticamente al registrarse ───
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 1000)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 5. FUNCIÓN: play_roulette ─────────────────────────────────
-- Procesa múltiples apuestas en una sola transacción atómica.
-- Garantiza que nadie puede ganar más de lo que tiene en saldo.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.play_roulette(
  p_user_id UUID,
  p_bets    JSONB   -- Array de { bet_type, bet_value, amount }
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance      NUMERIC;
  v_total_bet    NUMERIC := 0;
  v_payout       NUMERIC := 0;
  v_result       INTEGER;
  v_color        TEXT;
  v_won          BOOLEAN;
  v_bet          JSONB;
  v_red_numbers  INTEGER[] := ARRAY[1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
BEGIN
  -- Bloquear la fila de wallet para evitar condiciones de carrera
  SELECT balance INTO v_balance
  FROM public.wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'wallet_not_found';
  END IF;

  -- Sumar el total apostado
  FOR v_bet IN SELECT * FROM jsonb_array_elements(p_bets)
  LOOP
    v_total_bet := v_total_bet + (v_bet->>'amount')::NUMERIC;
  END LOOP;

  IF v_total_bet <= 0 THEN
    RAISE EXCEPTION 'invalid_bet_amount';
  END IF;

  IF v_balance < v_total_bet THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;

  -- Girar la rueda (0–36, provably fair: puede extenderse con hash)
  v_result := floor(random() * 37)::INTEGER;

  -- Determinar color
  IF v_result = 0 THEN
    v_color := 'green';
  ELSIF v_result = ANY(v_red_numbers) THEN
    v_color := 'red';
  ELSE
    v_color := 'black';
  END IF;

  -- Calcular pago por cada apuesta
  FOR v_bet IN SELECT * FROM jsonb_array_elements(p_bets)
  LOOP
    DECLARE
      v_type  TEXT    := v_bet->>'bet_type';
      v_val   TEXT    := v_bet->>'bet_value';
      v_amt   NUMERIC := (v_bet->>'amount')::NUMERIC;
      v_win   BOOLEAN := FALSE;
      v_mul   NUMERIC := 0;
      v_d     INTEGER;
      v_col   INTEGER;
      v_nums  TEXT[];
    BEGIN
      CASE v_type
        WHEN 'number' THEN
          v_win := (v_val::INTEGER = v_result);
          v_mul := 35;

        WHEN 'color' THEN
          v_win := (v_val = v_color);
          v_mul := 2;

        WHEN 'parity' THEN
          IF v_result != 0 THEN
            v_win := (v_val = 'even' AND v_result % 2 = 0)
                  OR (v_val = 'odd'  AND v_result % 2 != 0);
          END IF;
          v_mul := 2;

        WHEN 'half' THEN
          IF v_result != 0 THEN
            v_win := (v_val = 'low'  AND v_result <= 18)
                  OR (v_val = 'high' AND v_result >= 19);
          END IF;
          v_mul := 2;

        WHEN 'dozen' THEN
          v_d := v_val::INTEGER;
          IF v_result != 0 THEN
            v_win := v_result >= (v_d - 1) * 12 + 1
                 AND v_result <= v_d * 12;
          END IF;
          v_mul := 3;

        WHEN 'column' THEN
          v_col := v_val::INTEGER;
          IF v_result != 0 THEN
            v_win := (v_col = 3 AND v_result % 3 = 0)
                  OR (v_col = 2 AND v_result % 3 = 2)
                  OR (v_col = 1 AND v_result % 3 = 1);
          END IF;
          v_mul := 3;

        WHEN 'split2' THEN
          v_nums := string_to_array(v_val, '-');
          v_win  := v_result::TEXT = ANY(v_nums);
          v_mul  := 17;

        WHEN 'split4' THEN
          v_nums := string_to_array(v_val, '-');
          v_win  := v_result::TEXT = ANY(v_nums);
          v_mul  := 8;

        ELSE NULL;
      END CASE;

      IF v_win THEN
        v_payout := v_payout + v_amt * v_mul;
      END IF;
    END;
  END LOOP;

  v_won := v_payout > 0;

  -- Actualizar wallet (atómico)
  UPDATE public.wallets
  SET balance    = balance - v_total_bet + v_payout,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Registrar transacción
  INSERT INTO public.wallet_transactions (user_id, type, amount, balance_after, metadata)
  VALUES (
    p_user_id,
    CASE WHEN v_won THEN 'win' ELSE 'loss' END,
    v_payout - v_total_bet,
    v_balance - v_total_bet + v_payout,
    jsonb_build_object(
      'result',     v_result,
      'color',      v_color,
      'bets',       p_bets,
      'total_bet',  v_total_bet,
      'payout',     v_payout,
      'game',       'roulette'
    )
  );

  RETURN jsonb_build_object(
    'number',      v_result,
    'result',      v_result,
    'color',       v_color,
    'payout',      v_payout,
    'won',         v_won,
    'new_balance', v_balance - v_total_bet + v_payout
  );

EXCEPTION
  WHEN OTHERS THEN RAISE;
END;
$$;

-- ── 6. FUNCIÓN: redeem_promo_code ─────────────────────────────
CREATE OR REPLACE FUNCTION public.redeem_promo_code(
  p_user_id UUID,
  p_code    TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_promo   public.promo_codes%ROWTYPE;
  v_bonus   NUMERIC;
  v_balance NUMERIC;
BEGIN
  -- Buscar y bloquear el código
  SELECT * INTO v_promo
  FROM public.promo_codes
  WHERE code = UPPER(TRIM(p_code))
    AND active = TRUE
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_code';
  END IF;

  IF v_promo.expires_at IS NOT NULL AND v_promo.expires_at < NOW() THEN
    RAISE EXCEPTION 'expired_code';
  END IF;

  IF v_promo.max_uses IS NOT NULL AND v_promo.uses_count >= v_promo.max_uses THEN
    RAISE EXCEPTION 'code_exhausted';
  END IF;

  -- Verificar que el usuario no lo usó ya
  IF EXISTS (
    SELECT 1 FROM public.promo_redemptions
    WHERE user_id = p_user_id AND promo_id = v_promo.id
  ) THEN
    RAISE EXCEPTION 'already_used';
  END IF;

  -- Calcular bono
  SELECT balance INTO v_balance FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;

  IF v_promo.type = 'fixed' THEN
    v_bonus := v_promo.value;
  ELSIF v_promo.type = 'percent' THEN
    v_bonus := round(v_balance * v_promo.value / 100, 2);
  ELSE
    v_bonus := 0; -- free_spin: lo maneja el front
  END IF;

  -- Aplicar bono
  IF v_bonus > 0 THEN
    UPDATE public.wallets
    SET balance = balance + v_bonus, updated_at = NOW()
    WHERE user_id = p_user_id;

    INSERT INTO public.wallet_transactions (user_id, type, amount, balance_after, metadata)
    VALUES (
      p_user_id, 'promo', v_bonus, v_balance + v_bonus,
      jsonb_build_object('code', p_code, 'promo_id', v_promo.id, 'type', v_promo.type)
    );
  END IF;

  -- Marcar uso
  INSERT INTO public.promo_redemptions (user_id, promo_id)
  VALUES (p_user_id, v_promo.id);

  UPDATE public.promo_codes
  SET uses_count = uses_count + 1
  WHERE id = v_promo.id;

  RETURN jsonb_build_object(
    'success',     TRUE,
    'bonus',       v_bonus,
    'type',        v_promo.type,
    'new_balance', v_balance + v_bonus
  );

EXCEPTION
  WHEN OTHERS THEN RAISE;
END;
$$;

-- ── 7. REALTIME: habilitar para wallets ───────────────────────
-- Ejecutar también en Supabase Dashboard → Database → Replication
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
