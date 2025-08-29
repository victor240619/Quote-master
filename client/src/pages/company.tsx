import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building, Upload, Save, FileText } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Company } from "@/entities/Company";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCompanySchema } from "@shared/schema";
import { z } from "zod";
import { Link } from "wouter";

const companySchema = insertCompanySchema.extend({
  name: z.string().min(1, "Nome da empresa é obrigatório"),
  logoUrl: z.string().url("URL inválida").optional().or(z.literal("")),
});

type CompanyForm = z.infer<typeof companySchema>;

export default function CompanyPage() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

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

  const { data: company, isLoading: companyLoading, error: companyError } = useQuery({
    queryKey: ["companies", "me"],
    queryFn: () => Company.me(),
    retry: false,
    enabled: isAuthenticated,
  });

  // Handle company error
  useEffect(() => {
    if (companyError && isUnauthorizedError(companyError as Error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [companyError, toast]);

  const form = useForm<CompanyForm>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: "",
      logoUrl: "",
      subscriptionStatus: "active",
    },
  });

  // Update form when company data loads
  useEffect(() => {
    if (company) {
      form.setValue("name", company.name);
      form.setValue("logoUrl", company.logoUrl || "");
    }
  }, [company, form]);

  const createMutation = useMutation({
    mutationFn: (data: CompanyForm) => Company.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies", "me"] });
      toast({
        title: "Sucesso",
        description: "Empresa criada com sucesso!",
      });
      setIsEditing(false);
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
        description: "Falha ao criar empresa. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: CompanyForm) => Company.update(company!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies", "me"] });
      toast({
        title: "Sucesso",
        description: "Empresa atualizada com sucesso!",
      });
      setIsEditing(false);
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
        description: "Falha ao atualizar empresa. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: CompanyForm) => {
    if (company) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleCancel = () => {
    if (company) {
      form.setValue("name", company.name);
      form.setValue("logoUrl", company.logoUrl || "");
    } else {
      form.reset();
    }
    setIsEditing(false);
  };

  if (isLoading || companyLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3" data-testid="heading-company">
              <Building className="w-8 h-8" />
              Configurações da Empresa
            </h1>
            <p className="text-muted-foreground">
              {company 
                ? "Gerencie as informações da sua empresa" 
                : "Configure os dados da sua empresa para começar a usar o sistema"
              }
            </p>
          </div>
          <Link href="/">
            <Button variant="outline" data-testid="button-back-dashboard">Dashboard</Button>
          </Link>
        </div>

        {/* Company Form */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{company ? "Informações da Empresa" : "Criar Empresa"}</span>
              {company && !isEditing && (
                <Button 
                  onClick={() => setIsEditing(true)}
                  data-testid="button-edit-company"
                >
                  Editar Informações
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!company || isEditing ? (
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                {/* Company Logo */}
                <div className="space-y-4">
                  <Label htmlFor="logoUrl">Logo da Empresa</Label>
                  <div className="flex items-center gap-4">
                    {(company?.logoUrl || form.watch("logoUrl")) && (
                      <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center border">
                        <img 
                          src={company?.logoUrl || form.watch("logoUrl")} 
                          alt="Logo da empresa"
                          className="w-14 h-14 object-contain rounded"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                          data-testid="img-company-logo-preview"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <Input
                        id="logoUrl"
                        placeholder="URL do logo da empresa (opcional)"
                        {...form.register("logoUrl")}
                        data-testid="input-logo-url"
                      />
                      {form.formState.errors.logoUrl && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.logoUrl.message}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground mt-1">
                        Forneça uma URL pública da imagem do logo (formato: JPG, PNG, SVG)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Company Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Empresa *</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Empresa XYZ Ltda."
                    {...form.register("name")}
                    data-testid="input-company-name"
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                {/* Subscription Status (read-only info) */}
                {company && (
                  <div className="space-y-2">
                    <Label>Status da Assinatura</Label>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        company.subscriptionStatus === 'active' ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <span className="text-sm font-medium" data-testid="text-subscription-status">
                        {company.subscriptionStatus === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-6 border-t">
                  {company && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleCancel}
                      data-testid="button-cancel-edit"
                    >
                      Cancelar
                    </Button>
                  )}
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="flex items-center gap-2"
                    data-testid="button-save-company"
                  >
                    <Save className="w-4 h-4" />
                    {(createMutation.isPending || updateMutation.isPending) 
                      ? "Salvando..." 
                      : company 
                        ? "Salvar Alterações" 
                        : "Criar Empresa"
                    }
                  </Button>
                </div>
              </form>
            ) : (
              /* Display Mode */
              <div className="space-y-6">
                {/* Company Info Display */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-base font-medium">Nome da Empresa</Label>
                      <p className="text-lg text-foreground mt-1" data-testid="text-company-name-display">
                        {company.name}
                      </p>
                    </div>
                    
                    <div>
                      <Label className="text-base font-medium">Status da Assinatura</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`w-2 h-2 rounded-full ${
                          company.subscriptionStatus === 'active' ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        <span className="text-base" data-testid="text-subscription-status-display">
                          {company.subscriptionStatus === 'active' ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-base font-medium">Criada em</Label>
                      <p className="text-base text-muted-foreground mt-1" data-testid="text-company-created-date">
                        {new Date(company.createdAt!).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  {/* Company Logo Display */}
                  <div className="space-y-4">
                    <Label className="text-base font-medium">Logo da Empresa</Label>
                    {company.logoUrl ? (
                      <div className="w-32 h-32 bg-muted rounded-lg flex items-center justify-center border">
                        <img 
                          src={company.logoUrl} 
                          alt="Logo da empresa"
                          className="w-30 h-30 object-contain rounded"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).parentElement!.innerHTML = 
                              '<div class="text-center p-4"><Building class="w-8 h-8 text-muted-foreground mx-auto mb-2" /><p class="text-sm text-muted-foreground">Logo não disponível</p></div>';
                          }}
                          data-testid="img-company-logo-display"
                        />
                      </div>
                    ) : (
                      <div className="w-32 h-32 bg-muted rounded-lg flex items-center justify-center border" data-testid="placeholder-company-logo">
                        <div className="text-center">
                          <Building className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Sem logo</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="pt-6 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Link href="/quotes">
                      <Button variant="outline" className="w-full justify-start" data-testid="button-manage-quotes">
                        <FileText className="w-4 h-4 mr-2" />
                        Gerenciar Orçamentos
                      </Button>
                    </Link>
                    <Link href="/subscription">
                      <Button variant="outline" className="w-full justify-start" data-testid="button-manage-subscription">
                        <Building className="w-4 h-4 mr-2" />
                        Gerenciar Assinatura
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => setIsEditing(true)}
                      data-testid="button-edit-company-info"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Editar Informações
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Help Card */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-3">Dicas importantes</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Configure sua empresa antes de criar orçamentos</li>
              <li>• O logo será exibido nos PDFs dos orçamentos gerados</li>
              <li>• Certifique-se de que a URL do logo seja pública e acessível</li>
              <li>• Formatos recomendados para logo: PNG, JPG ou SVG</li>
              <li>• A assinatura ativa é necessária para usar todas as funcionalidades</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
