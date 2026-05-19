import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ContratoTabsPlaceholderProps {
  /** Conteúdo da tab "Geral" — passado pela página pai. */
  geralContent: React.ReactNode;
}

const PLACEHOLDER_TABS = [
  { value: 'condutores', label: 'Condutores' },
  { value: 'extras', label: 'Extras' },
  { value: 'taxas', label: 'Taxas' },
  { value: 'coberturas', label: 'Coberturas' },
  { value: 'pacotes', label: 'Pacotes' },
  { value: 'fecho', label: 'Fecho' },
  { value: 'anexos', label: 'Anexos' },
  { value: 'outros', label: 'Outros' },
] as const;

export const ContratoTabsPlaceholder: React.FC<ContratoTabsPlaceholderProps> = ({
  geralContent,
}) => {
  const [active, setActive] = useState<string>('geral');

  return (
    <Tabs value={active} onValueChange={setActive} className="w-full">
      <TabsList className="w-full justify-start overflow-x-auto">
        <TabsTrigger value="geral">Geral</TabsTrigger>
        {PLACEHOLDER_TABS.map((t) => (
          <TabsTrigger key={t.value} value={t.value}>
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="geral" className="mt-4">
        {geralContent}
      </TabsContent>

      {PLACEHOLDER_TABS.map((t) => (
        <TabsContent key={t.value} value={t.value} className="mt-4">
          <div className="rounded-md border border-dashed border-border/60 bg-muted/30 p-12 text-center">
            <p className="text-sm text-muted-foreground">
              <strong>{t.label}</strong> em desenvolvimento.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Disponível em fases futuras (ver roadmap).
            </p>
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
};
