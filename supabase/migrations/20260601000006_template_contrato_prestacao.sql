-- ============================================================
-- Template de Contrato de Prestação de Serviços (regime SLOT)
-- ============================================================
-- Semeia o template usado por generateContratoPrestacaoPdf. Placeholders
-- preenchidos pelo gerador: {{empresa_*}}, {{motorista_*}}, {{carta_*}},
-- {{viatura_matricula|marca_modelo}}, {{valor_semanal}}, {{data_inicio}},
-- {{data_assinatura}}, {{cidade_assinatura}}, {{numero_contrato}}.
--
-- ATENÇÃO: texto legal de exemplo — rever com jurista antes de produção.
-- O renderizador (jsPDF) suporta h1/h2/p/br/strong/em/img — sem tabelas.
-- org_id explícito (Década Ousada) + empresa_id 'decada_ousada' para a
-- linha ser visível sob o RLS rls_org_isolation.
-- Idempotente: ON CONFLICT (empresa_id, tipo, versao) DO NOTHING.
-- ============================================================

INSERT INTO public.document_templates (
  nome, tipo, empresa_id, org_id, template_data, campos_dinamicos, ativo, versao
)
VALUES (
  'Contrato Prestação - DASPRENT',
  'contrato_prestacao',
  'decada_ousada',
  '11111111-1111-1111-1111-111111111111',
  jsonb_build_object('conteudo', $html$
<h1 style="text-align:center">CONTRATO DE PRESTAÇÃO DE SERVIÇOS Nº {{numero_contrato}}</h1>
<p style="text-align:center"><strong>REGIME SLOT — MOTORISTA TVDE COM VIATURA PRÓPRIA</strong></p>
<br>
<p><strong>PRIMEIRA OUTORGANTE (OPERADORA):</strong> {{empresa_nome_completo}}, NIF {{empresa_nif}}, com sede em {{empresa_sede}}, titular da licença TVDE {{empresa_licenca_tvde}}.</p>
<br>
<p><strong>SEGUNDO OUTORGANTE (MOTORISTA):</strong> {{motorista_nome}} — NIF {{motorista_nif}}</p>
<p>Morada: {{motorista_morada}}</p>
<p>Documento de identificação: {{motorista_documento_tipo}} {{motorista_documento_numero}} (validade {{motorista_documento_validade}})</p>
<p>Carta de condução: {{carta_conducao}} — categorias {{carta_categorias}} (validade {{carta_validade}})</p>
<p>Contacto: {{motorista_email}} · {{motorista_telefone}}</p>
<br>
<p><strong>VIATURA DO MOTORISTA:</strong> {{viatura_matricula}} — {{viatura_marca_modelo}}</p>
<br>
<h2>Cláusula 1.ª — Objeto</h2>
<p>O Segundo Outorgante presta serviços de transporte TVDE utilizando viatura própria, operando sob a licença e plataforma da Primeira Outorgante (slot).</p>
<h2>Cláusula 2.ª — Contrapartida</h2>
<p>Pela atribuição do slot, o Segundo Outorgante paga à Primeira Outorgante o valor semanal de <strong>{{valor_semanal}}</strong>, por viatura.</p>
<h2>Cláusula 3.ª — Vigência</h2>
<p>O presente contrato produz efeitos a partir de {{data_inicio}}, por tempo indeterminado, podendo ser denunciado por qualquer das partes mediante aviso prévio.</p>
<h2>Cláusula 4.ª — Obrigações do Motorista</h2>
<p>Manter a viatura, seguros e documentação legalmente exigíveis em dia, e cumprir as regras das plataformas e da legislação TVDE aplicável.</p>
<br>
<p>{{cidade_assinatura}}, {{data_assinatura}}</p>
<br><br>
<p>_______________________________  &nbsp;&nbsp;&nbsp; _______________________________</p>
<p>Primeira Outorgante &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Segundo Outorgante</p>
$html$),
  '[]'::jsonb,
  true,
  1
)
ON CONFLICT (empresa_id, tipo, versao) DO NOTHING;
