export interface EmpresaConfig {
  id: string;
  nome: string;
  nomeCompleto: string;
  nif: string;
  sede: string;
  licencaTVDE: string;
  licencaValidade: string;
  representante: string;
  cargoRepresentante: string;
  papelTimbrado: string;
}

export const EMPRESAS: Record<string, EmpresaConfig> = {
  decada_ousada: {
    id: 'decada_ousada',
    nome: 'Rota Líquida',
    nomeCompleto: 'Rota Líquida, Lda.',
    nif: '515127850',
    sede: 'Rua do Mourato Nº 70 A correio 70, 9600-224 Ribeira Grande',
    licencaTVDE: '(informação a confirmar)',
    licencaValidade: '(informação a confirmar)',
    representante: 'Beatriz Veloso',
    cargoRepresentante: 'gerente com poderes para o ato',
    papelTimbrado: '/images/papel-timbrado-rota-liquida.png'
  },
  distancia_arrojada: {
    id: 'distancia_arrojada',
    nome: 'Distância Arrojada',
    nomeCompleto: 'Distância Arrojada, Unipessoal, Lda.',
    nif: '516600800',
    sede: 'Largo Ribeiro do Amaral, Nº3, Edifício Interbeiras, 3400-070 Oliveira do Hospital',
    licencaTVDE: '87314/2021',
    licencaValidade: '26/12/2028',
    representante: 'Beatriz Veloso',
    cargoRepresentante: 'gerente com poderes para o ato',
    papelTimbrado: '/images/papel-timbrado-distancia-arrojada.png'
  }
};

export const getEmpresaById = (id: string): EmpresaConfig | undefined => {
  return EMPRESAS[id];
};

export const getEmpresasList = (): EmpresaConfig[] => {
  return Object.values(EMPRESAS);
};
