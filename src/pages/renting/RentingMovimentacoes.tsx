import { Card, CardContent } from '@/components/ui/card';
import { StickyPageHeader } from '@/components/ui/StickyPageHeader';
import { ArrowRightLeft } from 'lucide-react';

const RentingMovimentacoes = () => {
  return (
    <div className="w-full">
      <StickyPageHeader
        title="Movimentações"
        description="Entradas, saídas e trocas de viatura"
        icon={ArrowRightLeft}
      />
      <Card className="bg-card border-border">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <ArrowRightLeft className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Em desenvolvimento</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default RentingMovimentacoes;
