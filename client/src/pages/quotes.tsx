import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  FileText, 
  Plus, 
  Edit,
  Trash2,
  Eye,
  Download,
  Search
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QuoteDraft } from "@/entities/QuoteDraft";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertQuoteDraftSchema } from "@shared/schema";
import { z } from "zod";
import { Link } from "wouter";

const createQuoteSchema = insertQuoteDraftSchema.extend({
  title: z.string().min(1, "Título é obrigatório"),
  clientName: z.string().optional(),
  clientEmail: z.string().email("Email inválido").optional().or(z.literal("")),
});

type CreateQuoteForm = z.infer<typeof createQuoteSchema>;

export default function Quotes() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: quotes = [], isLoading: quotesLoading, error: quotesError } = useQuery({
    queryKey: ["quotes"],
    queryFn: () => QuoteDraft.list(),
    retry: false,
    enabled: isAuthenticated,
  });

  // Handle quotes error
  useEffect(() => {
    if (quotesError && isUnauthorizedError(quotesError as Error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [quotesError, toast]);

  const form = useForm<CreateQuoteForm>({
    resolver: zodResolver(createQuoteSchema),
    defaultValues: {
      title: "",
      clientName: "",
      clientEmail: "",
      templateVariant: "variant_a",
      currency: "BRL",
      status: "draft",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<CreateQuoteForm, 'code' | 'companyId' | 'createdBy'>) => QuoteDraft.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast({
        title: "Sucesso",
        description: "Orçamento criado com sucesso!",
      });
      setIsCreateModalOpen(false);
      form.reset();
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao criar orçamento. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (quoteId: string) => QuoteDraft.delete(quoteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast({
        title: "Sucesso",
        description: "Orçamento excluído com sucesso!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao excluir orçamento. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleCreateSubmit = (data: CreateQuoteForm) => {
    createMutation.mutate(data);
  };

  const handleDelete = (quoteId: string) => {
    if (confirm("Tem certeza que deseja excluir este orçamento?")) {
      deleteMutation.mutate(quoteId);
    }
  };

  // Filter quotes
  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = quote.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (quote.clientName && quote.clientName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === "all" || quote.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'finalized': return 'default';
      case 'draft': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'finalized': return 'Finalizado';
      case 'draft': return 'Rascunho';
      default: return status;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="heading-quotes">Orçamentos</h1>
            <p className="text-muted-foreground">Gerencie todos os seus orçamentos</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" data-testid="button-back-dashboard">Dashboard</Button>
            </Link>
            <div className="flex items-center gap-2">
              <Link href="/quote-editor">
                <Button data-testid="button-new-advanced-quote">
                  <Plus className="w-4 h-4 mr-2" />
                  Editor Avançado
                </Button>
              </Link>
              <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" data-testid="button-new-quote">
                    <Plus className="w-4 h-4 mr-2" />
                    Criação Rápida
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle data-testid="dialog-title-create-quote">Criar Novo Orçamento</DialogTitle>
                  <DialogDescription>
                    Preencha os dados básicos para criar um novo orçamento
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(handleCreateSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title">Título do Orçamento *</Label>
                      <Input
                        id="title"
                        placeholder="Ex: Sistema de Segurança"
                        {...form.register("title")}
                        data-testid="input-quote-title"
                      />
                      {form.formState.errors.title && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.title.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="clientName">Nome do Cliente</Label>
                      <Input
                        id="clientName"
                        placeholder="Nome do cliente"
                        {...form.register("clientName")}
                        data-testid="input-client-name"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="clientEmail">Email do Cliente</Label>
                      <Input
                        id="clientEmail"
                        type="email"
                        placeholder="cliente@empresa.com"
                        {...form.register("clientEmail")}
                        data-testid="input-client-email"
                      />
                      {form.formState.errors.clientEmail && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.clientEmail.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="templateVariant">Template</Label>
                      <Select
                        value={form.watch("templateVariant") || ""}
                        onValueChange={(value) => form.setValue("templateVariant", value || "variant_a")}
                      >
                        <SelectTrigger data-testid="select-template-variant">
                          <SelectValue placeholder="Selecione um template" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="variant_a">Template A - Clássico</SelectItem>
                          <SelectItem value="variant_b">Template B - Moderno</SelectItem>
                          <SelectItem value="variant_c">Template C - Minimalista</SelectItem>
                          <SelectItem value="variant_d">Template D - Corporativo</SelectItem>
                          <SelectItem value="variant_e">Template E - Elegante</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="note">Observações</Label>
                    <Textarea
                      id="note"
                      placeholder="Observações adicionais..."
                      rows={3}
                      {...form.register("note")}
                      data-testid="textarea-quote-note"
                    />
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)} data-testid="button-cancel-create">
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-create">
                      {createMutation.isPending ? "Criando..." : "Criar Orçamento"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por título ou cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-quotes"
                  />
                </div>
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-48" data-testid="select-filter-status">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="finalized">Finalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Quotes Grid */}
        {quotesLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filteredQuotes.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2" data-testid="heading-no-quotes">
                {quotes.length === 0 ? "Nenhum orçamento encontrado" : "Nenhum resultado encontrado"}
              </h3>
              <p className="text-muted-foreground mb-6">
                {quotes.length === 0 
                  ? "Você ainda não criou nenhum orçamento. Que tal começar criando seu primeiro?"
                  : "Tente ajustar os filtros ou termo de busca."
                }
              </p>
              {quotes.length === 0 && (
                <Button onClick={() => setIsCreateModalOpen(true)} data-testid="button-create-first-quote">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Orçamento
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredQuotes.map((quote) => (
              <Card key={quote.id} className="hover:shadow-lg transition-shadow" data-testid={`quote-card-${quote.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate" data-testid={`quote-title-${quote.id}`}>
                        {quote.title}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1" data-testid={`quote-code-${quote.id}`}>
                        {quote.code}
                      </p>
                    </div>
                    <Badge variant={getStatusVariant(quote.status || 'draft')} data-testid={`quote-status-${quote.id}`}>
                      {getStatusText(quote.status || 'draft')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-foreground" data-testid={`quote-client-${quote.id}`}>
                      {quote.clientName || "Cliente não informado"}
                    </p>
                    {quote.clientEmail && (
                      <p className="text-sm text-muted-foreground" data-testid={`quote-client-email-${quote.id}`}>
                        {quote.clientEmail}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div>
                      <p className="text-2xl font-bold text-foreground" data-testid={`quote-total-${quote.id}`}>
                        R$ {parseFloat(quote.total || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(`/quotes/${quote.id}`, '_blank')}
                        data-testid={`button-view-quote-${quote.id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(`/quotes/${quote.id}/edit`, '_blank')}
                        data-testid={`button-edit-quote-${quote.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(quote.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-quote-${quote.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
