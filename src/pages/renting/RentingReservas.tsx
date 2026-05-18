import { Card, CardContent } from '@/components/ui/card';
import { StickyPageHeader } from '@/components/ui/StickyPageHeader';
import { CalendarCheck } from 'lucide-react';

const RentingReservas = () => {
  return (
    <div className="w-full">
      <StickyPageHeader
        title="Reservas"
        description="Gestão de reservas de renting"
        icon={CalendarCheck}
      />
      <Card className="bg-card border-border">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <CalendarCheck className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Em desenvolvimento</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default RentingReservas;
