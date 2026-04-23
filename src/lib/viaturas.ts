export interface ViaturaStatsSummary {
  total: number;
  disponiveis: number;
  emUso: number;
  manutencao: number;
  vendidas: number;
}

export const CATEGORIAS = [
  { value: 'green', label: 'Green' },
  { value: 'comfort', label: 'Comfort' },
  { value: 'black', label: 'Black' },
  { value: 'x-saver', label: 'X-Saver' },
];

export const COMBUSTIVEIS = [
  { value: 'eletrico', label: 'Elétrico' },
  { value: 'hibrido', label: 'Híbrido' },
  { value: 'gasolina', label: 'Gasolina' },
  { value: 'diesel', label: 'Diesel' },
];

export const STATUS_OPTIONS = [
  { value: 'disponivel', label: 'Disponível' },
  { value: 'em_uso', label: 'Em Uso' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'inativo', label: 'Inativo' },
];

export const normalizePlate = (value?: string | null) =>
  (value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export const getCategoriaBadgeClass = (categoria?: string | null) => {
  switch (categoria?.toLowerCase()) {
    case 'green':
      return 'bg-green-500 text-white';
    case 'comfort':
      return 'bg-blue-500 text-white';
    case 'black':
      return 'bg-foreground text-background';
    case 'x-saver':
      return 'bg-orange-500 text-white';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export const getStatusBadgeClass = (status?: string | null) => {
  switch (status) {
    case 'disponivel':
      return 'bg-green-500/10 text-green-600 border-green-500/20';
    case 'em_uso':
      return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'manutencao':
      return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    case 'vendida':
      return 'bg-destructive/10 text-destructive border-destructive/20';
    case 'inativo':
      return 'bg-muted text-muted-foreground border-border';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

export const getStatusColorClass = (status?: string | null) => {
  switch (status) {
    case 'disponivel':
      return 'bg-green-500 text-white hover:bg-green-600';
    case 'em_uso':
      return 'bg-blue-500 text-white hover:bg-blue-600';
    case 'manutencao':
      return 'bg-amber-500 text-white hover:bg-amber-600';
    case 'vendida':
      return 'bg-destructive text-white hover:bg-destructive/90';
    case 'inativo':
      return 'bg-gray-500 text-white hover:bg-gray-600';
    default:
      return 'bg-gray-400 text-white hover:bg-gray-500';
  }
};

export const getStatusLabel = (status?: string | null) => {
  switch (status) {
    case 'disponivel':
      return 'Disponível';
    case 'em_uso':
      return 'Em Uso';
    case 'manutencao':
      return 'Manutenção';
    case 'vendida':
      return 'Vendida';
    case 'inativo':
      return 'Inativo';
    default:
      return status || 'N/D';
  }
};
