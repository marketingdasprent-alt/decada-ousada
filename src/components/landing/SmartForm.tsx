import { useState } from "react";
import { motion } from "framer-motion";
import { Send, CheckCircle2, AlertCircle, Car, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { trackLeadOnce } from "@/lib/pixel";
import { PhoneInput, validatePhoneNumber } from "@/components/ui/phone-input";

type FormType = "rent" | "slot" | null;

interface SmartFormProps {
  initialType?: FormType;
  onClose?: () => void;
}

export const SmartForm = ({ initialType = null, onClose }: SmartFormProps) => {
  const { toast } = useToast();
  const [formType, setFormType] = useState<FormType>(initialType);
  const [situacao, setSituacao] = useState("");
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefone: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNoLicenseWarning, setShowNoLicenseWarning] = useState(false);

  // Opções específicas para Aluguer - focadas na licença (não têm viatura)
  const situacoesAluguer = [
    { value: "licenca_ativa", label: "Já tenho licença TVDE ativa", icon: "✅", canSubmit: true },
    { value: "em_formacao", label: "Estou em formação TVDE", icon: "⏳", canSubmit: true },
    { value: "sem_licenca", label: "Ainda não tenho licença TVDE", icon: "❌", canSubmit: false },
  ];

  // Opções específicas para Slot - focadas na viatura + licença (têm viatura)
  const situacoesSlot = [
    { value: "licenca_e_viatura", label: "Tenho licença TVDE e viatura própria", icon: "✅", canSubmit: true },
    { value: "viatura_em_formacao", label: "Tenho viatura mas estou em formação TVDE", icon: "⏳", canSubmit: true },
    { value: "viatura_sem_licenca", label: "Tenho viatura mas não tenho licença TVDE", icon: "❌", canSubmit: false },
  ];

  // Seleciona as opções corretas baseado no tipo de formulário
  const situacoes = formType === "slot" ? situacoesSlot : situacoesAluguer;

  const handleSituacaoChange = (value: string) => {
    setSituacao(value);
    const selected = situacoes.find(s => s.value === value);
    if (selected && !selected.canSubmit) {
      setShowNoLicenseWarning(true);
      toast({
        title: "⚠️ Licença TVDE Necessária",
        description: "Para trabalhar como motorista TVDE é obrigatório possuir licença. Procure um centro de formação certificado.",
        variant: "destructive",
        duration: 8000,
      });
    } else {
      setShowNoLicenseWarning(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const selected = situacoes.find(s => s.value === situacao);
    if (!selected?.canSubmit) {
      toast({
        title: "❌ Não é possível submeter",
        description: "É necessário possuir licença TVDE para se candidatar.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.nome || !formData.email || !formData.telefone) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    if (!validatePhoneNumber(formData.telefone)) {
      toast({
        title: "Telefone inválido",
        description: "Por favor verifique o número de telefone inserido.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Determina se tem viatura baseado no tipo de formulário
      const temViatura = formType === "slot";
      const emFormacao = situacao === "em_formacao" || situacao === "viatura_em_formacao";

      const leadData = {
        nome: formData.nome,
        email: formData.email,
        telefone: formData.telefone,
        tem_formacao_tvde: !emFormacao, // true se já tem licença, false se está em formação
        tipo_viatura: temViatura ? "Viatura própria" : "Precisa alugar",
        observacoes: `Tipo: ${formType === "slot" ? "Slot" : "Aluguer"} | Situação: ${selected?.label}`,
        campaign_tags: [formType === "slot" ? "SLOT" : "TVDE GERAL"],
        status: "novo",
      };

      const { error } = await supabase.from("leads_dasprent").insert(leadData);

      if (error) throw error;

      trackLeadOnce({
        content_name: formType === "slot" ? "Candidatura Slot" : "Candidatura Aluguer",
        content_category: "Landing Page",
      });

      toast({
        title: "✅ Candidatura enviada!",
        description: "Entraremos em contacto consigo em breve.",
      });

      // Reset form
      setFormData({ nome: "", email: "", telefone: "" });
      setSituacao("");
      setFormType(null);
      onClose?.();
      
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Erro ao enviar",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-2xl p-6 md:p-8 shadow-2xl"
    >
      {/* Form type selector */}
      {!formType && (
        <div className="space-y-6">
          <h3 className="text-2xl font-bold text-white text-center mb-6">
            Como pretende trabalhar connosco?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { setFormType("rent"); setSituacao(""); setShowNoLicenseWarning(false); }}
              className="p-6 bg-gradient-to-br from-[#B20101]/20 to-[#8E0101]/10 border-2 border-[#B20101]/30 hover:border-[#B20101] rounded-xl text-left transition-all"
            >
              <Car className="h-10 w-10 text-[#E53333] mb-4" />
              <h4 className="text-xl font-bold text-white mb-2">Quero Alugar um Carro</h4>
              <p className="text-gray-400 text-sm">
                Preciso de uma viatura para trabalhar como motorista TVDE
              </p>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { setFormType("slot"); setSituacao(""); setShowNoLicenseWarning(false); }}
              className="p-6 bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-2 border-blue-500/30 hover:border-blue-500 rounded-xl text-left transition-all"
            >
              <Zap className="h-10 w-10 text-blue-500 mb-4" />
              <h4 className="text-xl font-bold text-white mb-2">Quero Ser Slot</h4>
              <p className="text-gray-400 text-sm">
                Tenho viatura própria e quero trabalhar como parceiro
              </p>
            </motion.button>
          </div>
        </div>
      )}

      {/* Main form */}
      {formType && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center justify-between mb-4 pr-6">
            <h3 className="text-xl font-bold text-white">
              {formType === "rent" ? "🚗 Candidatura - Aluguer" : "⚡ Candidatura - Slot"}
            </h3>
            <button
              type="button"
              onClick={() => setFormType(null)}
              className="text-gray-400 hover:text-white text-sm whitespace-nowrap"
            >
              ← Voltar
            </button>
          </div>

          {/* Situação checkboxes */}
          <div className="space-y-3">
            <Label className="text-gray-300">Qual é a sua situação atual?</Label>
            <RadioGroup value={situacao} onValueChange={handleSituacaoChange} className="space-y-3">
              {situacoes.map((item) => (
                <div
                  key={item.value}
                  className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                    situacao === item.value
                      ? item.canSubmit
                        ? "border-[#B20101] bg-[#B20101]/10"
                        : "border-[#B20101] bg-[#B20101]/10"
                      : "border-gray-700 hover:border-gray-600 bg-gray-800/50"
                  }`}
                >
                  <RadioGroupItem value={item.value} id={item.value} />
                  <Label htmlFor={item.value} className="flex items-center gap-2 cursor-pointer text-white">
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Warning for no license */}
          {showNoLicenseWarning && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="flex items-start gap-3 p-4 bg-[#B20101]/10 border border-[#B20101]/30 rounded-lg"
            >
              <AlertCircle className="h-5 w-5 text-[#E53333] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[#E53333] font-medium">Licença TVDE Obrigatória</p>
                <p className="text-[#E53333]/70 text-sm mt-1">
                  Para trabalhar como motorista TVDE é necessário possuir licença.
                  Procure um centro de formação certificado na sua zona.
                </p>
              </div>
            </motion.div>
          )}

          {/* Contact fields */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="nome" className="text-gray-300">Nome completo</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="O seu nome"
                className="mt-1 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                required
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-gray-300">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="seu@email.com"
                className="mt-1 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                required
              />
            </div>
            <div>
              <Label htmlFor="telefone" className="text-gray-300">Telefone</Label>
              <div className="mt-1">
                <PhoneInput
                  id="telefone"
                  value={formData.telefone}
                  onChange={(value) => setFormData({ ...formData, telefone: value })}
                  defaultCountry="PT"
                  className="[&_button]:bg-gray-800 [&_button]:border-gray-700 [&_button]:text-white [&_input]:bg-gray-800 [&_input]:border-gray-700 [&_input]:text-white [&_input]:placeholder:text-gray-500"
                />
              </div>
            </div>
          </div>

          {/* Submit button */}
          <Button
            type="submit"
            disabled={isSubmitting || showNoLicenseWarning || !situacao}
            className="w-full bg-[#B20101] hover:bg-[#8E0101] text-white font-bold py-6 text-lg rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                A enviar...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Enviar Candidatura
              </span>
            )}
          </Button>

          <p className="text-gray-500 text-xs text-center">
            Ao submeter, concorda com os nossos termos e política de privacidade.
          </p>
        </form>
      )}
    </motion.div>
  );
};
