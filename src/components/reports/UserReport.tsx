import React from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Calendar, User, Target, TrendingUp, Users, Award, AlertTriangle } from 'lucide-react';

interface ReportData {
  userId: string;
  totalLeads: number;
  statusCounts: {
    novo: number;
    contactado: number;
    interessado: number;
    convertido: number;
    perdido: number;
  };
  conversionRate: string;
  contactRate: string;
  campaignTags: Record<string, number>;
  observationsSummary: string;
  dateRange: string;
}

interface UserReportProps {
  data: ReportData;
}

export const UserReport: React.FC<UserReportProps> = ({ data }) => {
  const statusData = [
    { name: 'Novos', value: data.statusCounts.novo, color: '#3B82F6' },
    { name: 'Contactados', value: data.statusCounts.contactado, color: '#B20101' },
    { name: 'Interessados', value: data.statusCounts.interessado, color: '#22C55E' },
    { name: 'Convertidos', value: data.statusCounts.convertido, color: '#8B5CF6' },
    { name: 'Perdidos', value: data.statusCounts.perdido, color: '#EF4444' },
  ];

  const campaignData = Object.entries(data.campaignTags)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([name, value]) => ({ name, value }));

  const metricsData = [
    { name: 'Taxa de Conversão', value: parseFloat(data.conversionRate) },
    { name: 'Taxa de Contato', value: parseFloat(data.contactRate) },
    { name: 'Leads Ativos', value: ((data.statusCounts.contactado + data.statusCounts.interessado) / data.totalLeads * 100) },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      {/* Print button */}
      <button 
        onClick={() => window.print()}
        className="fixed top-4 right-4 z-50 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-semibold shadow-lg print:hidden transition-colors"
      >
        🖨️ Imprimir Relatório
      </button>

      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800/80 to-gray-900/80 backdrop-blur-sm border-b border-gray-700/50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-primary">
                Relatório de Desempenho
              </h1>
              <p className="text-xl text-gray-300 mt-2">{data.userId}</p>
            </div>
            <div className="text-right text-gray-400">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <span>{new Date().toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="text-sm mt-1">Período: {data.dateRange}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8 space-y-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/50 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-400" />
              <div>
                <p className="text-sm text-gray-400">Total de Leads</p>
                <p className="text-3xl font-bold text-blue-400">{data.totalLeads}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/50 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <Target className="h-8 w-8 text-green-400" />
              <div>
                <p className="text-sm text-gray-400">Taxa de Conversão</p>
                <p className="text-3xl font-bold text-green-400">{data.conversionRate}%</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-primary/20 to-primary/30 border border-primary/50 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-gray-400">Taxa de Contato</p>
                <p className="text-3xl font-bold text-primary">{data.contactRate}%</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/50 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <Award className="h-8 w-8 text-purple-400" />
              <div>
                <p className="text-sm text-gray-400">Pipeline Ativo</p>
                <p className="text-3xl font-bold text-purple-400">
                  {data.statusCounts.contactado + data.statusCounts.interessado}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Status Distribution */}
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-6 text-gray-200">Distribuição por Status</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData.filter(item => item.value > 0)}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Campaign Performance */}
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-6 text-gray-200">Campanhas Mais Efetivas</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={campaignData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#9CA3AF"
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px' 
                    }}
                  />
                  <Bar dataKey="value" fill="#B20101" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
          <h3 className="text-xl font-semibold mb-6 text-gray-200">Métricas de Performance</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metricsData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px' 
                    }}
                    formatter={(value: any) => [`${Number(value).toFixed(1)}%`, 'Percentual']}
                  />
                <Bar dataKey="value" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Details */}
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
          <h3 className="text-xl font-semibold mb-6 text-gray-200">Detalhamento por Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {statusData.map((status) => (
              <div key={status.name} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600/50">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: status.color }}
                  />
                  <div>
                    <p className="text-sm text-gray-400">{status.name}</p>
                    <p className="text-2xl font-bold" style={{ color: status.color }}>
                      {status.value}
                    </p>
                    <p className="text-xs text-gray-500">
                      {data.totalLeads > 0 ? ((status.value / data.totalLeads) * 100).toFixed(1) : '0'}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Analysis */}
        {data.observationsSummary && data.observationsSummary !== "Nenhuma observação disponível para análise." && (
          <div className="bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-500/50 rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-4 text-indigo-300 flex items-center gap-2">
              🤖 Análise Inteligente das Observações
            </h3>
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
              <p className="text-gray-300 leading-relaxed">{data.observationsSummary}</p>
            </div>
          </div>
        )}

        {/* Recommendations */}
        <div className="bg-gradient-to-br from-orange-500/20 to-red-600/20 border border-orange-500/50 rounded-xl p-6">
          <h3 className="text-xl font-semibold mb-4 text-orange-300 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Recomendações Estratégicas
          </h3>
          <div className="space-y-3">
            {data.statusCounts.novo > data.statusCounts.contactado && (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                <p className="text-orange-300">• Priorizar o contato com leads novos para melhorar a taxa de conversão</p>
              </div>
            )}
            {parseFloat(data.conversionRate) < 15 ? (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-300">• Revisar estratégias de qualificação e follow-up para aumentar conversões</p>
              </div>
            ) : (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                <p className="text-green-300">• Excelente taxa de conversão, manter estratégias atuais</p>
              </div>
            )}
            {data.statusCounts.perdido > data.statusCounts.convertido ? (
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
                <p className="text-primary">• Analisar motivos de perda de leads para implementar melhorias</p>
              </div>
            ) : (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                <p className="text-green-300">• Boa retenção de leads, processo funcionando bem</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm border-t border-gray-700/50 pt-6">
          <p>Relatório gerado automaticamente pelo sistema CRM Década Ousada</p>
          <p>Data de geração: {new Date().toLocaleString('pt-BR')}</p>
        </div>
      </div>

      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          body { 
            background: white !important; 
            color: black !important;
          }
          .print\\:hidden { 
            display: none !important; 
          }
          .bg-gradient-to-br,
          .bg-gradient-to-r {
            background: white !important;
            border: 1px solid #ccc !important;
          }
          .text-white {
            color: black !important;
          }
          .text-gray-300,
          .text-gray-400,
          .text-gray-500 {
            color: #666 !important;
          }
        }
      ` }}></style>
    </div>
  );
};
