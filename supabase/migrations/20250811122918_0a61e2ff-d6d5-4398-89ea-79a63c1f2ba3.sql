-- Atualizar leads existentes que não têm licença TVDE
-- Buscar leads que responderam "Não" para licença TVDE e adicionar tag "Formação TVDE"

UPDATE leads_dasprent 
SET campaign_tags = CASE 
  WHEN campaign_tags IS NULL THEN ARRAY['Formação TVDE']
  WHEN NOT ('Formação TVDE' = ANY(campaign_tags)) THEN array_append(campaign_tags, 'Formação TVDE')
  ELSE campaign_tags
END,
tem_formacao_tvde = false
WHERE observacoes LIKE '%Não%' 
  AND formulario_id = '3ca5675a-11a6-4e58-9d1f-2f9e53d4e5f0'
  AND (observacoes LIKE '%field_1748938811761%' OR observacoes LIKE '%licença%' OR observacoes LIKE '%licenca%');