import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Lead {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  status: string;
  campaign_tags?: string[];
  created_at: string;
  observacoes?: string;
  observacoes_gestores?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, leads } = await req.json() as { userId: string, leads: Lead[] };

    console.log(`Generating report for user: ${userId} with ${leads.length} leads`);

    // Calculate statistics
    const totalLeads = leads.length;
    const statusCounts = {
      novo: leads.filter(l => l.status === 'novo').length,
      contactado: leads.filter(l => l.status === 'contactado').length,
      interessado: leads.filter(l => l.status === 'interessado').length,
      convertido: leads.filter(l => l.status === 'convertido').length,
      perdido: leads.filter(l => l.status === 'perdido').length,
    };

    const conversionRate = totalLeads > 0 ? ((statusCounts.convertido / totalLeads) * 100).toFixed(1) : '0';
    const contactRate = totalLeads > 0 ? (((statusCounts.contactado + statusCounts.interessado + statusCounts.convertido) / totalLeads) * 100).toFixed(1) : '0';

    // Collect observations for AI summary
    const observations = leads
      .map(lead => [lead.observacoes, lead.observacoes_gestores])
      .flat()
      .filter(obs => obs && obs.trim().length > 0);

    let observationsSummary = "Nenhuma observação disponível para análise.";

    // Generate AI summary of observations if available
    if (observations.length > 0) {
      try {
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content: 'Você é um assistente especializado em análise de CRM. Analise as observações dos leads e forneça um resumo conciso e profissional em português, destacando padrões, pontos principais e insights relevantes para vendas.'
              },
              {
                role: 'user',
                content: `Analise estas observações de ${totalLeads} leads do usuário ${userId}:\n\n${observations.join('\n---\n')}`
              }
            ],
            max_tokens: 300,
            temperature: 0.7,
          }),
        });

        if (openaiResponse.ok) {
          const openaiData = await openaiResponse.json();
          observationsSummary = openaiData.choices[0]?.message?.content || observationsSummary;
        } else {
          console.error('OpenAI API error:', await openaiResponse.text());
        }
      } catch (error) {
        console.error('Error calling OpenAI API:', error);
      }
    }

    // Get campaign distribution
    const campaignTags = leads
      .flatMap(lead => lead.campaign_tags || [])
      .reduce((acc, tag) => {
        acc[tag] = (acc[tag] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    // Generate the report
    const report = `
RELATÓRIO DE DESEMPENHO - ${userId.toUpperCase()}
Data: ${new Date().toLocaleDateString('pt-BR')}
Período: ${new Date(leads[leads.length - 1]?.created_at || '').toLocaleDateString('pt-BR')} - ${new Date(leads[0]?.created_at || '').toLocaleDateString('pt-BR')}

========================================
RESUMO EXECUTIVO
========================================

Total de Leads: ${totalLeads}
Taxa de Conversão: ${conversionRate}%
Taxa de Contato: ${contactRate}%

========================================
DISTRIBUIÇÃO POR STATUS
========================================

• Novos: ${statusCounts.novo} (${totalLeads > 0 ? ((statusCounts.novo / totalLeads) * 100).toFixed(1) : '0'}%)
• Contactados: ${statusCounts.contactado} (${totalLeads > 0 ? ((statusCounts.contactado / totalLeads) * 100).toFixed(1) : '0'}%)
• Interessados: ${statusCounts.interessado} (${totalLeads > 0 ? ((statusCounts.interessado / totalLeads) * 100).toFixed(1) : '0'}%)
• Convertidos: ${statusCounts.convertido} (${totalLeads > 0 ? ((statusCounts.convertido / totalLeads) * 100).toFixed(1) : '0'}%)
• Perdidos: ${statusCounts.perdido} (${totalLeads > 0 ? ((statusCounts.perdido / totalLeads) * 100).toFixed(1) : '0'}%)

========================================
CAMPANHAS MAIS EFETIVAS
========================================

${Object.entries(campaignTags)
  .sort(([,a], [,b]) => b - a)
  .map(([tag, count]) => `• ${tag}: ${count} leads`)
  .join('\n') || 'Nenhuma campanha identificada'}

========================================
ANÁLISE QUALITATIVA DAS OBSERVAÇÕES
========================================

${observationsSummary}

========================================
MÉTRICAS DE PERFORMANCE
========================================

• Leads por dia: ${(totalLeads / 30).toFixed(1)} (média mensal)
• Eficiência de conversão: ${conversionRate}% dos leads foram convertidos
• Leads em pipeline ativo: ${statusCounts.contactado + statusCounts.interessado}
• Oportunidades perdidas: ${statusCounts.perdido}

========================================
RECOMENDAÇÕES
========================================

${statusCounts.novo > statusCounts.contactado ? 
  '• Priorizar o contato com leads novos para melhorar a taxa de conversão' : 
  '• Boa performance no contato inicial com leads'}

${parseFloat(conversionRate) < 15 ? 
  '• Revisar estratégias de qualificação e follow-up para aumentar conversões' : 
  '• Excelente taxa de conversão, manter estratégias atuais'}

${statusCounts.perdido > statusCounts.convertido ? 
  '• Analisar motivos de perda de leads para implementar melhorias' : 
  '• Boa retenção de leads, processo funcionando bem'}

Relatório gerado automaticamente pelo sistema CRM DasPrent
`;

    return new Response(
      JSON.stringify({ report }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error generating report:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate report' }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});