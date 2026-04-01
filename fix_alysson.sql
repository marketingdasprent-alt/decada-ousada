-- ============================================================
-- FIX: Ligar dados Uber e BP ao Alysson Geraldo Gomes Caldeira
-- motorista_id: aa3b6f7d-4608-4f2e-874a-ef5bda6e4af6
-- ============================================================

-- PASSO 1: Ver que uber_driver_id tem o Alysson na tabela uber_drivers (pelo nome)
-- Execute primeiro este SELECT para encontrar o uber_driver_id dele:
SELECT uber_driver_id, full_name, motorista_id
FROM uber_drivers
WHERE full_name ILIKE '%Alysson%'
   OR full_name ILIKE '%Caldeira%';

-- ============================================================
-- Se encontrou o uber_driver_id acima, execute o UPDATE abaixo
-- substituindo 'UUID_DO_UBER_AQUI' pelo uber_driver_id encontrado:
-- ============================================================
-- UPDATE uber_drivers
-- SET motorista_id = 'aa3b6f7d-4608-4f2e-874a-ef5bda6e4af6'
-- WHERE uber_driver_id = 'UUID_DO_UBER_AQUI';

-- ============================================================
-- PASSO 2: Ver transações BP com o cartão 0638 (motorista_id NULL)
-- ============================================================
SELECT id, transaction_date, amount, quantity, fuel_type, station_name, motorista_id
FROM bp_transacoes
WHERE motorista_id IS NULL
ORDER BY transaction_date DESC
LIMIT 20;

-- Se existirem transações com card_number ou similar a '0638', execute:
-- (Verificar o campo exato que guarda o cartão)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'bp_transacoes'
ORDER BY ordinal_position;

-- ============================================================
-- PASSO 3: Ligar as transações BP do cartão 0638 ao Alysson
-- (Substituir 'CAMPO_CARTAO' pelo nome real da coluna encontrada acima)
-- ============================================================
-- UPDATE bp_transacoes
-- SET motorista_id = 'aa3b6f7d-4608-4f2e-874a-ef5bda6e4af6'
-- WHERE motorista_id IS NULL
--   AND CAMPO_CARTAO ILIKE '%0638%';
