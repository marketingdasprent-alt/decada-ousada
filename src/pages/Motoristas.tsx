import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronUp, ChevronDown, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MotoristaDialog } from "@/components/motoristas/MotoristaDialog";
import { GenerateDocumentsDialog } from "@/components/motoristas/GenerateDocumentsDialog";
import { MotoristaCard } from "@/components/motoristas/MotoristaCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MotoristaDetailsDrawer } from "@/components/motoristas/MotoristaDetailsDrawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn, normalizeString } from "@/lib/utils";

export type Motorista = {
  id: string;
  codigo: number;
  nome: string;
  nif: string | null;
  documento_tipo: string | null;
  documento_numero: string | null;
  documento_validade: string | null;
  documento_ficheiro_url?: string | null;
  documento_identificacao_verso_url?: string | null;
  carta_conducao: string | null;
  carta_categorias: string[] | null;
  carta_validade: string | null;
  carta_ficheiro_url?: string | null;
  carta_conducao_verso_url?: string | null;
  licenca_tvde_numero: string | null;
  licenca_tvde_validade: string | null;
  licenca_tvde_ficheiro_url?: string | null;
  registo_criminal_url?: string | null;
  comprovativo_morada_url?: string | null;
  comprovativo_iban_url?: string | null;
  morada: string | null;
  codigo_postal: string | null;
  email: string | null;
  telefone: string | null;
  data_contratacao: string | null;
  cidade: string | null;
  cidade_assinatura: string | null;
  status_ativo: boolean | null;
  recibo_verde: boolean | null;
  is_slot: boolean | null;
  slot_valor_semanal: number | null;
  cartao_frota: string | null;
  cartao_bp: string | null;
  cartao_repsol: string | null;
  cartao_edp: string | null;
  observacoes: string | null;
  uber_uuid: string | null;
  bolt_id: string | null;
  created_at: string;
  updated_at: string;
};

type SortColumn = "codigo" | "nome" | "nif" | "telefone" | "email" | "cidade" | "status_ativo";

export default function Motoristas() {
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [cidadeFilter, setCidadeFilter] = useState<string>("todas");
  const [selectedMotorista, setSelectedMotorista] = useState<Motorista | null>(null);
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [motoristaToEdit, setMotoristaToEdit] = useState<Motorista | null>(null);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [newMotoristaForContract, setNewMotoristaForContract] = useState<Motorista | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>("codigo");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    loadMotoristas();
  }, []);

  const loadMotoristas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("motoristas_ativos")
        .select("*")
        .order("codigo", { ascending: true });

      if (error) throw error;
      setMotoristas(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar motoristas:", error);
      toast({
        title: "Erro ao carregar motoristas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Get unique cities for filter
  const availableCities = useMemo(() => {
    const cities = motoristas
      .map((m) => m.cidade)
      .filter((c): c is string => !!c);
    return [...new Set(cities)].sort();
  }, [motoristas]);

  // Handle column sort
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Sortable header component
  const SortableHeader = ({ 
    column, 
    label, 
    className 
  }: { 
    column: SortColumn; 
    label: string; 
    className?: string;
  }) => (
    <TableHead 
      className={cn("h-10 cursor-pointer select-none hover:bg-muted/50 transition-colors", className)}
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortColumn === column ? (
          sortDirection === "asc" ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )
        ) : (
          <ChevronDown className="h-4 w-4 opacity-30" />
        )}
      </div>
    </TableHead>
  );

  // Combined filtering and sorting logic
  const filteredMotoristas = useMemo(() => {
    const searchNormalized = normalizeString(searchTerm);

    let result = motoristas.filter((m) => {
      // Text search (code, name, NIF, phone)
      const matchesSearch =
        searchTerm.trim() === "" ||
        m.codigo.toString().includes(searchTerm) ||
        normalizeString(m.nome).includes(searchNormalized) ||
        (m.nif && m.nif.includes(searchTerm)) ||
        (m.telefone && m.telefone.includes(searchTerm));

      // Status filter
      const matchesStatus =
        statusFilter === "todos" ||
        (statusFilter === "ativo" && m.status_ativo) ||
        (statusFilter === "inativo" && !m.status_ativo);

      // City filter
      const matchesCidade =
        cidadeFilter === "todas" || m.cidade === cidadeFilter;

      return matchesSearch && matchesStatus && matchesCidade;
    });

    // Apply sorting
    result.sort((a, b) => {
      let aValue = a[sortColumn];
      let bValue = b[sortColumn];

      // Handle nulls
      if (aValue === null || aValue === undefined) aValue = "";
      if (bValue === null || bValue === undefined) bValue = "";

      // Number comparison (codigo)
      if (typeof aValue === "number" && typeof bValue === "number") {
        const comparison = aValue - bValue;
        return sortDirection === "asc" ? comparison : -comparison;
      }

      // Boolean comparison (status_ativo)
      if (typeof aValue === "boolean" && typeof bValue === "boolean") {
        const comparison = aValue === bValue ? 0 : aValue ? -1 : 1;
        return sortDirection === "asc" ? comparison : -comparison;
      }

      // String comparison
      if (typeof aValue === "string" && typeof bValue === "string") {
        const comparison = aValue.localeCompare(bValue, "pt");
        return sortDirection === "asc" ? comparison : -comparison;
      }

      return 0;
    });

    return result;
  }, [motoristas, searchTerm, statusFilter, cidadeFilter, sortColumn, sortDirection]);

  const handleRowClick = (motorista: Motorista) => {
    navigate(`/motoristas/${motorista.id}`);
  };

  const handleMotoristaUpdated = () => {
    loadMotoristas();
  };

  const handleAddMotorista = () => {
    setMotoristaToEdit(null);
    setIsDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setIsDialogOpen(false);
      setMotoristaToEdit(null);
      loadMotoristas();
    }
  };

  const handleMotoristaCreated = (motorista: Motorista) => {
    setNewMotoristaForContract(motorista);
    setContractDialogOpen(true);
    loadMotoristas();
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Motoristas Ativos</h1>
          <p className="text-muted-foreground text-sm">
            {filteredMotoristas.length} motorista{filteredMotoristas.length !== 1 ? "s" : ""} encontrado{filteredMotoristas.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={handleAddMotorista} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Motorista
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por código, nome, NIF ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="inativo">Inativos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={cidadeFilter} onValueChange={setCidadeFilter}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Cidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {availableCities.map((cidade) => (
                <SelectItem key={cidade} value={cidade}>
                  {cidade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content - Mobile Cards or Desktop Table */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          A carregar...
        </div>
      ) : filteredMotoristas.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {searchTerm || statusFilter !== "todos" || cidadeFilter !== "todas"
            ? "Nenhum motorista encontrado com os filtros aplicados"
            : "Nenhum motorista cadastrado"}
        </div>
      ) : isMobile ? (
        /* Mobile: Card Grid */
        <div className="grid gap-3">
          {filteredMotoristas.map((motorista) => (
            <MotoristaCard
              key={motorista.id}
              motorista={motorista}
              onClick={() => handleRowClick(motorista)}
            />
          ))}
        </div>
      ) : (
        /* Desktop: Table */
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <SortableHeader column="codigo" label="Cód." className="w-[70px]" />
                <SortableHeader column="nome" label="Nome" />
                <SortableHeader column="nif" label="NIF" className="w-[120px]" />
                <SortableHeader column="telefone" label="Telefone" className="w-[130px]" />
                <SortableHeader column="email" label="Email" className="hidden md:table-cell" />
                <SortableHeader column="cidade" label="Cidade" className="w-[120px] hidden lg:table-cell" />
                <SortableHeader column="status_ativo" label="Status" className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMotoristas.map((motorista) => (
                <TableRow
                  key={motorista.id}
                  className="cursor-pointer h-10"
                  onClick={() => handleRowClick(motorista)}
                >
                  <TableCell className="py-2 font-mono text-sm text-muted-foreground">{motorista.codigo}</TableCell>
                  <TableCell className="py-2 font-medium">{motorista.nome}</TableCell>
                  <TableCell className="py-2 text-muted-foreground">{motorista.nif || "-"}</TableCell>
                  <TableCell className="py-2 text-muted-foreground">{motorista.telefone || "-"}</TableCell>
                  <TableCell className="py-2 text-muted-foreground hidden md:table-cell">
                    {motorista.email || "-"}
                  </TableCell>
                  <TableCell className="py-2 text-muted-foreground hidden lg:table-cell">
                    {motorista.cidade || "-"}
                  </TableCell>
                  <TableCell className="py-2 text-center">
                    <Badge
                      variant={motorista.status_ativo ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {motorista.status_ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}



      {/* Dialog para Adicionar Motorista */}
      <MotoristaDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        motorista={motoristaToEdit}
        onMotoristaCreated={handleMotoristaCreated}
      />

      {/* Dialog para Gerar Documentos após criar motorista */}
      <GenerateDocumentsDialog
        open={contractDialogOpen}
        onOpenChange={setContractDialogOpen}
        motorista={newMotoristaForContract}
      />
    </div>
  );
}
