import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { pt } from 'date-fns/locale';
import { FileDown, FileSpreadsheet, Loader2 } from 'lucide-react';
import { formatMatricula } from './EventoCard';
import type { CalendarioEvento } from '@/pages/Calendario';
import jsPDF from 'jspdf';

const TIPO_LABELS: Record<string, string> = {
  entrega: 'Entrega',
  recolha: 'Recolha',
  devolucao: 'Devolução',
  troca: 'Troca',
  upgrade: 'Upgrade',
};

const TIPO_COLORS_PDF: Record<string, [number, number, number]> = {
  entrega:   [34,  197, 94],
  recolha:   [59,  130, 246],
  devolucao: [249, 115, 22],
  troca:     [168, 85,  247],
  upgrade:   [234, 179, 8],
};

async function loadImageWithDimensions(
  src: string
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    const resp = await fetch(src);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = reject;
      img.src = dataUrl;
    });
    return { dataUrl, ...dims };
  } catch {
    return null;
  }
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentMonth: Date;
}

export const RelatorioDialog: React.FC<Props> = ({ open, onOpenChange, currentMonth }) => {
  const [dataInicio, setDataInicio] = useState(format(startOfMonth(currentMonth), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(endOfMonth(currentMonth), 'yyyy-MM-dd'));
  const [exportLoading, setExportLoading] = useState(false);
  const [exportExcelLoading, setExportExcelLoading] = useState(false);

  React.useEffect(() => {
    if (open) {
      setDataInicio(format(startOfMonth(currentMonth), 'yyyy-MM-dd'));
      setDataFim(format(endOfMonth(currentMonth), 'yyyy-MM-dd'));
    }
  }, [open, currentMonth]);

  const { data: eventos = [], isLoading } = useQuery({
    queryKey: ['relatorio-eventos', dataInicio, dataFim],
    enabled: open && !!dataInicio && !!dataFim,
    queryFn: async () => {
      const start = new Date(dataInicio + 'T00:00:00');
      const end = new Date(dataFim + 'T23:59:59');

      const { data, error } = await supabase
        .from('calendario_eventos')
        .select('*')
        .gte('data_inicio', start.toISOString())
        .lte('data_inicio', end.toISOString())
        .order('data_inicio', { ascending: true });

      if (error) throw error;

      const criadorIds = [...new Set((data || []).map(e => e.criado_por))];
      let profilesMap: Record<string, string> = {};
      if (criadorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, nome')
          .in('id', criadorIds);
        if (profiles) {
          profilesMap = Object.fromEntries(profiles.map(p => [p.id, p.nome || '']));
        }
      }

      return (data || []).map(e => ({
        ...e,
        profiles: profilesMap[e.criado_por] ? { nome: profilesMap[e.criado_por] } : null,
      })) as CalendarioEvento[];
    },
  });

  const exportarPDF = async () => {
    setExportLoading(true);
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageW = 210;
      const pageH = 297;
      const marginL = 14;
      const marginR = 14;

      // Try white logo first (for dark header), fallback to default
      const logoInfo =
        await loadImageWithDimensions('/images/logo-rota-liquida.png.png');

      // ── HEADER ──────────────────────────────────────────────
      const headerH = 44;
      doc.setFillColor(0, 0, 0); // preto
      doc.rect(0, 0, pageW, headerH, 'F');

      // Accent line at bottom of header
      doc.setFillColor(99, 102, 241); // indigo-500
      doc.rect(0, headerH - 2, pageW, 2, 'F');

      if (logoInfo) {
        try {
          // Manter proporções: max 55mm de largura, max 26mm de altura
          const maxW = 55;
          const maxH = 26;
          const aspect = logoInfo.width / logoInfo.height;
          let logoW = maxW;
          let logoH = logoW / aspect;
          if (logoH > maxH) {
            logoH = maxH;
            logoW = logoH * aspect;
          }
          const logoX = marginL;
          const logoY = (headerH - logoH) / 2;
          doc.addImage(logoInfo.dataUrl, 'PNG', logoX, logoY, logoW, logoH);
        } catch { /* skip logo if error */ }
      }

      // Title on right side of header
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text('Relatório de Eventos', pageW - marginR, 18, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(180, 180, 190);
      doc.text('Calendário  ·  Décadas Ousada', pageW - marginR, 25, { align: 'right' });

      // ── STATS BAR ───────────────────────────────────────────
      const statsY = headerH;
      const statsH = 13;
      doc.setFillColor(244, 244, 245);
      doc.rect(0, statsY, pageW, statsH, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(60, 60, 70);
      const d1 = format(new Date(dataInicio + 'T00:00:00'), 'dd/MM/yyyy');
      const d2 = format(new Date(dataFim + 'T00:00:00'), 'dd/MM/yyyy');
      doc.text(`Período: ${d1}  —  ${d2}`, marginL, statsY + 8.5);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(99, 102, 241);
      doc.text(`${eventos.length} evento(s)`, pageW - marginR, statsY + 8.5, { align: 'right' });

      // ── COLUMN HEADERS ──────────────────────────────────────
      let y = statsY + statsH;
      const colHeaderH = 9;
      doc.setFillColor(39, 39, 42);
      doc.rect(0, y, pageW, colHeaderH, 'F');

      doc.setTextColor(160, 160, 170);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      const COL = { mat: marginL + 4, tipo: 112, data: 143, resp: pageW - marginR };
      doc.text('MATRÍCULA / CIDADE', COL.mat, y + 6);
      doc.text('TIPO', COL.tipo, y + 6);
      doc.text('DATA / HORA', COL.data, y + 6);
      doc.text('RESPONSÁVEL', COL.resp, y + 6, { align: 'right' });
      y += colHeaderH;

      // ── HELPERS ─────────────────────────────────────────────
      const rowPad = 3.5;
      const lineH  = 5;
      const lineH2 = 4.2;
      const obsMaxW = COL.tipo - COL.mat - 2;
      const bodyMaxY = pageH - 12;

      const drawColHeaders = (atY: number) => {
        doc.setFillColor(39, 39, 42);
        doc.rect(0, atY, pageW, colHeaderH, 'F');
        doc.setTextColor(160, 160, 170);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.text('MATRÍCULA / CIDADE', COL.mat, atY + 6);
        doc.text('TIPO', COL.tipo, atY + 6);
        doc.text('DATA / HORA', COL.data, atY + 6);
        doc.text('RESPONSÁVEL', COL.resp, atY + 6, { align: 'right' });
        return atY + colHeaderH;
      };

      const drawFooter = (pageNum: number) => {
        doc.setFillColor(244, 244, 245);
        doc.rect(0, pageH - 10, pageW, 10, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(130, 130, 140);
        doc.text(`Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, marginL, pageH - 3.5);
        doc.text(`Página ${pageNum}`, pageW / 2, pageH - 3.5, { align: 'center' });
        doc.text('Décadas Ousada', pageW - marginR, pageH - 3.5, { align: 'right' });
      };

      // Pre-calculate row heights
      const rowHeights = eventos.map(ev => {
        let h = rowPad + lineH + lineH2;
        if (ev.descricao) {
          const lines = doc.splitTextToSize(`Obs: ${ev.descricao}`, obsMaxW);
          h += (lines.length * 4);
        }
        return h + rowPad;
      });

      // ── DRAW ROWS ───────────────────────────────────────────
      let pageNum = 1;

      eventos.forEach((ev, i) => {
        const rh = rowHeights[i];

        if (y + rh > bodyMaxY) {
          drawFooter(pageNum);
          doc.addPage();
          pageNum++;
          y = drawColHeaders(8);
        }

        // Row background
        if (i % 2 === 0) {
          doc.setFillColor(255, 255, 255);
        } else {
          doc.setFillColor(250, 250, 252);
        }
        doc.rect(0, y, pageW, rh, 'F');

        // Left color bar (tipo)
        const tc = TIPO_COLORS_PDF[ev.tipo] || [120, 120, 120];
        doc.setFillColor(tc[0], tc[1], tc[2]);
        doc.rect(0, y, 3, rh, 'F');

        const ty = y + rowPad + lineH;

        // Matrícula (bold, dark)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(20, 20, 25);
        const matricula = ev.tipo === 'troca'
          ? `${formatMatricula(ev.titulo)}${ev.matricula_devolver ? `  <>  ${formatMatricula(ev.matricula_devolver)}` : ''}`
          : formatMatricula(ev.titulo);
        const cidadeStr = ev.cidade ? `  ${ev.cidade.toUpperCase()}` : '';

        // Ensure matrícula doesn't overflow into tipo column
        const maxMatW = COL.tipo - COL.mat - 4;
        const matLines = doc.splitTextToSize(matricula + cidadeStr, maxMatW);
        doc.text(matLines[0], COL.mat, ty);
        if (matLines.length > 1) {
          doc.setFontSize(8);
          doc.text(matLines.slice(1).join(' '), COL.mat, ty + 3.5);
        }

        // Tipo (colored)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(tc[0], tc[1], tc[2]);
        doc.text(TIPO_LABELS[ev.tipo] || ev.tipo, COL.tipo, ty);

        // Data
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(50, 50, 60);
        const dataStr = format(
          new Date(ev.data_inicio),
          ev.dia_todo ? 'dd/MM/yyyy' : 'dd/MM/yy  HH:mm',
          { locale: pt }
        );
        doc.text(dataStr, COL.data, ty);

        // Responsável (right-aligned, truncated)
        if (ev.profiles?.nome) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(80, 80, 90);
          const respMaxW = pageW - marginR - COL.data - 30;
          const respLines = doc.splitTextToSize(ev.profiles.nome, respMaxW);
          doc.text(respLines[0], COL.resp, ty, { align: 'right' });
        }

        // Observações (wrapped, italic, muted)
        if (ev.descricao) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(8);
          doc.setTextColor(110, 110, 120);
          const obsLines = doc.splitTextToSize(`Obs: ${ev.descricao}`, obsMaxW);
          obsLines.forEach((line: string, li: number) => {
            doc.text(line, COL.mat, ty + lineH2 + li * 4);
          });
        }

        // Bottom separator
        doc.setDrawColor(228, 228, 235);
        doc.setLineWidth(0.2);
        doc.line(0, y + rh, pageW, y + rh);

        y += rh;
      });

      drawFooter(pageNum);

      const periodoNome = `${format(new Date(dataInicio + 'T00:00:00'), 'dd-MM-yyyy')}_${format(new Date(dataFim + 'T00:00:00'), 'dd-MM-yyyy')}`;
      doc.save(`relatorio_calendario_${periodoNome}.pdf`);
    } finally {
      setExportLoading(false);
    }
  };

  // ── EXCEL (CSV) EXPORT ──────────────────────────────────────────
  const exportarExcel = () => {
    setExportExcelLoading(true);
    try {
      const escape = (v: string | null | undefined) => {
        const s = v ?? '';
        // In European locales (PT), semicolon is the standard CSV separator
        if (s.includes(';') || s.includes('"') || s.includes('\n') || s.includes(',')) {
          return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
      };

      const headers = [
        'ID', 'Data', 'Hora', 'Tipo', 'Matrícula',
        'Matrícula Devolver', 'Cidade', 'Responsável', 'Observações',
      ];

      const rows = eventos.map(ev => {
        const dt = new Date(ev.data_inicio);
        return [
          escape(ev.id),
          escape(format(dt, 'dd/MM/yyyy', { locale: pt })),
          escape(ev.dia_todo ? 'Dia inteiro' : format(dt, 'HH:mm', { locale: pt })),
          escape(TIPO_LABELS[ev.tipo] || ev.tipo),
          escape(formatMatricula(ev.titulo)),
          escape(ev.matricula_devolver ? formatMatricula(ev.matricula_devolver) : ''),
          escape(ev.cidade || ''),
          escape(ev.profiles?.nome || ''),
          escape(ev.descricao || ''),
        ].join(';');
      });

      // UTF-8 BOM so Excel reads accents correctly
      const csvContent = '\uFEFF' + [headers.map(escape).join(';'), ...rows].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const periodoNome = `${format(new Date(dataInicio + 'T00:00:00'), 'dd-MM-yyyy')}_${format(new Date(dataFim + 'T00:00:00'), 'dd-MM-yyyy')}`;
      link.download = `calendario_${periodoNome}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportExcelLoading(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            Relatório de Eventos
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-3 items-end">
          <div className="flex-1 space-y-1">
            <Label htmlFor="relatorio-inicio" className="text-xs">De</Label>
            <input
              id="relatorio-inicio"
              type="date"
              value={dataInicio}
              onChange={e => setDataInicio(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="flex-1 space-y-1">
            <Label htmlFor="relatorio-fim" className="text-xs">Até</Label>
            <input
              id="relatorio-fim"
              type="date"
              value={dataFim}
              onChange={e => setDataFim(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <Button
            onClick={exportarPDF}
            disabled={isLoading || exportLoading || eventos.length === 0}
            className="gap-2 shrink-0"
          >
            {exportLoading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <FileDown className="h-4 w-4" />
            }
            <span className="hidden sm:inline">
              {exportLoading ? 'A gerar...' : 'PDF'}
            </span>
          </Button>
          <Button
            variant="outline"
            onClick={exportarExcel}
            disabled={isLoading || exportExcelLoading || eventos.length === 0}
            className="gap-2 shrink-0 border-green-600/40 text-green-700 hover:bg-green-600 hover:text-white dark:text-green-400 dark:hover:text-white"
          >
            {exportExcelLoading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <FileSpreadsheet className="h-4 w-4" />
            }
            <span className="hidden sm:inline">
              {exportExcelLoading ? 'A gerar...' : 'Excel'}
            </span>
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : eventos.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">
              Nenhum evento no período selecionado.
            </p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">{eventos.length} evento(s) encontrado(s)</p>
              {eventos.map(ev => (
                <div key={ev.id} className="border rounded-lg p-3 text-sm space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">
                      {ev.tipo === 'troca'
                        ? `${formatMatricula(ev.titulo)}${ev.matricula_devolver ? ` ↔ ${formatMatricula(ev.matricula_devolver)}` : ''}`
                        : formatMatricula(ev.titulo)}
                      {ev.cidade && ` — ${ev.cidade.toUpperCase()}`}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                      {TIPO_LABELS[ev.tipo] || ev.tipo}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
                    <span>
                      {format(new Date(ev.data_inicio), ev.dia_todo ? 'dd/MM/yyyy' : 'dd/MM/yyyy HH:mm', { locale: pt })}
                    </span>
                    {ev.profiles?.nome && <span>Por: {ev.profiles.nome}</span>}
                    {ev.descricao && <span className="w-full">Obs: {ev.descricao}</span>}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
