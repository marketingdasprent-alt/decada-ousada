import { Card, CardContent } from '@/components/ui/card';
import { StickyPageHeader } from '@/components/ui/StickyPageHeader';
import { FileText } from 'lucide-react';

const RentingContratos = () => {
  return (
    <div className="w-full">
      <StickyPageHeader
        title="Contratos"
        description="Gestão de contratos de renting"
        icon={FileText}
      />
      <Card className="bg-card border-border">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <FileText className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Em desenvolvimento</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default RentingContratos;
