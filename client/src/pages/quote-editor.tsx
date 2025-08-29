import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, FileText, Eye } from "lucide-react";
import { Link, useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QuoteDraft } from "@/entities/QuoteDraft";
import { isUnauthorizedError } from "@/lib/authUtils";
import QuoteHeader from "@/components/QuoteHeader";
import ItemsList from "@/components/ItemsList";
import TemplateSelector from "@/components/TemplateSelector";
import QuoteSummary from "@/components/QuoteSummary";
import { generateQuotePDF } from "@/lib/pdfGenerator";

interface QuoteData {
  code: string;
  title: string;
  client_name: string;
  client_email: string;
  items: Array<{
    description: string;
    unit_price: number;
    needed_quantity: number;
    owned_quantity: number;
    buy_quantity: number;
    total: number;
  }>;
  discount: number;
  template_variant: string;
  note: string;
  status: string;
}

export default function QuoteEditor() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const params = useParams();
  const [, setLocation] = useLocation();
  const isEdit = !!params.id;

  const [quoteData, setQuoteData] = useState<QuoteData>({
    code: '',
    title: '',
    client_name: '',
    client_email: '',
    items: [],
    discount: 0,
    template_variant: 'variant_a',
    note: '',
    status: 'draft'
  });

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Acesso Negado",
        description: "Você precisa estar logado. Redirecionando...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Load existing quote if editing
  const { isLoading: quoteLoading } = useQuery({
    queryKey: ["quote", params.id],
    queryFn: async () => {
      if (!params.id) return null;
      const quote = await QuoteDraft.get(params.id);
      if (quote) {
        setQuoteData({
          code: quote.code,
          title: quote.title,
          client_name: quote.clientName || '',
          client_email: quote.clientEmail || '',
          items: (quote.items || []).map((item: any) => ({
            description: item.description || '',
            unit_price: parseFloat(item.unitPrice) || 0,
            needed_quantity: parseInt(item.neededQuantity) || 0,
            owned_quantity: parseInt(item.ownedQuantity || '0') || 0,
            buy_quantity: parseInt(item.buyQuantity || '0') || 0,
            total: parseFloat(item.total) || 0
          })),
          discount: parseFloat(quote.discount || '0') || 0,
          template_variant: quote.templateVariant || 'variant_a',
          note: quote.note || '',
          status: quote.status || 'draft'
        });
      }
      return quote;
    },
    enabled: isAuthenticated && isEdit,
    retry: false,
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: QuoteData) => {
      const saveData = {
        title: data.title,
        clientName: data.client_name,
        clientEmail: data.client_email,
        items: data.items,
        discount: data.discount.toString(),
        templateVariant: data.template_variant,
        note: data.note,
        status: data.status,
        subtotal: data.items.reduce((sum, item) => sum + (item.total || 0), 0).toString(),
        total: (data.items.reduce((sum, item) => sum + (item.total || 0), 0) - 
               (data.items.reduce((sum, item) => sum + (item.total || 0), 0) * (data.discount || 0)) / 100).toString()
      };

      if (isEdit) {
        return await QuoteDraft.update(params.id!, saveData);
      } else {
        return await QuoteDraft.create(saveData);
      }
    },
    onSuccess: (newQuote) => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast({
        title: "Sucesso!",
        description: `Orçamento ${isEdit ? 'atualizado' : 'criado'} com sucesso.`,
      });
      
      if (!isEdit) {
        setLocation(`/quote-editor/${newQuote.id}`);
      }
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Acesso Negado",
          description: "Você foi desconectado. Redirecionando...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: `Erro ao ${isEdit ? 'atualizar' : 'criar'} orçamento.`,
        variant: "destructive",
      });
    }
  });

  // PDF generation mutation
  const pdfMutation = useMutation({
    mutationFn: async () => {
      return await generateQuotePDF(quoteData);
    },
    onSuccess: (result) => {
      if (result.success) {
        const isFirstDownload = result.isFreeTrial && result.freeDownloadsUsed === 1;
        toast({
          title: "PDF Gerado",
          description: isFirstDownload 
            ? "PDF gerado! Esse foi seu download gratuito. Assine o plano para mais downloads."
            : "O PDF do orçamento foi gerado com sucesso!",
          variant: isFirstDownload ? "default" : "default",
        });
      } else if (result.requiresSubscription) {
        toast({
          title: "Assinatura Necessária",
          description: result.message,
          variant: "destructive",
          action: (
            <button 
              onClick={() => window.location.href = '/subscription'}
              className="bg-primary text-primary-foreground px-3 py-1 rounded text-sm"
            >
              Assinar Agora
            </button>
          )
        });
      } else {
        toast({
          title: "Erro",
          description: result.message || "Erro ao gerar PDF do orçamento.",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao gerar PDF do orçamento.",
        variant: "destructive",
      });
    }
  });

  const handleSave = () => {
    if (!quoteData.title.trim()) {
      toast({
        title: "Erro",
        description: "O título do orçamento é obrigatório.",
        variant: "destructive",
      });
      return;
    }
    saveMutation.mutate(quoteData);
  };

  const handleGeneratePDF = () => {
    if (!quoteData.title.trim()) {
      toast({
        title: "Erro", 
        description: "Salve o orçamento antes de gerar o PDF.",
        variant: "destructive",
      });
      return;
    }
    pdfMutation.mutate();
  };

  if (isLoading || quoteLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/quotes">
              <Button variant="outline" size="sm" data-testid="button-back-quotes">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground" data-testid="heading-quote-editor">
                {isEdit ? 'Editar Orçamento' : 'Novo Orçamento'}
              </h1>
              {quoteData.code && (
                <p className="text-sm text-muted-foreground">Código: {quoteData.code}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={handleGeneratePDF}
              disabled={pdfMutation.isPending || !quoteData.title}
              data-testid="button-generate-pdf"
            >
              <Eye className="w-4 h-4 mr-2" />
              {pdfMutation.isPending ? "Gerando..." : "Visualizar PDF"}
            </Button>
            <Button 
              onClick={handleSave}
              disabled={saveMutation.isPending}
              data-testid="button-save-quote"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>

        {/* Quote Header */}
        <QuoteHeader 
          quote={quoteData} 
          onChange={setQuoteData}
        />

        {/* Template Selector */}
        <TemplateSelector 
          selectedVariant={quoteData.template_variant} 
          onChange={(variant) => setQuoteData(prev => ({ ...prev, template_variant: variant }))}
        />

        {/* Items List */}
        <ItemsList 
          items={quoteData.items} 
          onChange={(items) => setQuoteData(prev => ({ ...prev, items }))}
        />

        {/* Quote Summary and Notes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <QuoteSummary 
            items={quoteData.items}
            discount={quoteData.discount}
            onDiscountChange={(discount) => setQuoteData(prev => ({ ...prev, discount }))}
          />
          
          {/* Notes Section */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Observações
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Label htmlFor="note">Observações Adicionais</Label>
                <Textarea
                  id="note"
                  value={quoteData.note}
                  onChange={(e) => setQuoteData(prev => ({ ...prev, note: e.target.value }))}
                  placeholder="Adicione observações, termos ou condições especiais..."
                  rows={8}
                  className="resize-none"
                  data-testid="textarea-quote-note"
                />
                <p className="text-xs text-gray-500">
                  As observações aparecerão no PDF final do orçamento.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t">
          <Link href="/quotes">
            <Button variant="outline" data-testid="button-cancel-edit">
              Cancelar
            </Button>
          </Link>
          <Button 
            onClick={handleSave}
            disabled={saveMutation.isPending}
            data-testid="button-save-final"
          >
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? "Salvando..." : "Salvar Orçamento"}
          </Button>
        </div>
      </div>
    </div>
  );
}