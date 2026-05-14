import { Card, CardContent } from '@/components/ui/card';
import { StickyPageHeader } from '@/components/ui/StickyPageHeader';
import { Users } from 'lucide-react';

const RentingClientes = () => {
  return (
    <div className="w-full">
      <StickyPageHeader title="Clientes" description="Base de clientes de renting" icon={Users} />
      <Card className="bg-card border-border">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Users className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Em desenvolvimento</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default RentingClientes;
