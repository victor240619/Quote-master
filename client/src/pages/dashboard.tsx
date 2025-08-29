import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  DollarSign, 
  Clock, 
  TrendingUp,
  Plus,
  Building,
  BarChart3,
  CreditCard,
  Crown,
  LogOut
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { User } from "@/entities/User";
import { Company } from "@/entities/Company";
import { QuoteDraft } from "@/entities/QuoteDraft";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Link } from "wouter";
import type { User as UserType } from "@shared/schema";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

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

  const { data: user } = useQuery<UserType>({
    queryKey: ["/api/auth/user"],
    retry: false,
    enabled: isAuthenticated,
  });

  const { data: company } = useQuery({
    queryKey: ["companies", "me"],
    queryFn: () => Company.me(),
    retry: false,
    enabled: isAuthenticated,
  });

  const { data: quotes = [], error: quotesError } = useQuery({
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

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  // Calculate stats
  const stats = {
    totalQuotes: quotes.length,
    totalRevenue: quotes
      .filter(q => q.status === 'finalized')
      .reduce((sum, q) => sum + parseFloat(q.total || '0'), 0),
    pendingQuotes: quotes.filter(q => q.status === 'draft').length,
    conversionRate: quotes.length > 0 
      ? Math.round((quotes.filter(q => q.status === 'finalized').length / quotes.length) * 100)
      : 0
  };

  const recentQuotes = quotes.slice(0, 3);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'finalized': return 'default';
      case 'draft': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'finalized': return 'text-green-700 bg-green-50 border-green-200';
      case 'draft': return 'text-orange-700 bg-orange-50 border-orange-200';
      default: return 'text-blue-700 bg-blue-50 border-blue-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'finalized': return 'Finalizado';
      case 'draft': return 'Rascunho';
      default: return status;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col shadow-sm">
        {/* Logo Section */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <FileText className="text-primary-foreground text-sm" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground" data-testid="text-app-name">QuoteMaster</h1>
              <p className="text-xs text-muted-foreground">Pro</p>
            </div>
          </div>
        </div>
        
        {/* User Info */}
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-primary-foreground text-sm font-medium" data-testid="text-user-initials">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate" data-testid="text-user-name">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-muted-foreground truncate" data-testid="text-user-email">{user?.email}</p>
            </div>
            {user?.role === 'admin' && (
              <Crown className="text-yellow-500 text-xs" data-testid="icon-admin-crown" />
            )}
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          <div className="flex items-center gap-3 px-3 py-2 rounded-md bg-primary text-primary-foreground font-medium" data-testid="nav-dashboard-active">
            <BarChart3 className="w-4 h-4" />
            <span>Dashboard</span>
          </div>
          <Link href="/quotes">
            <a className="flex items-center gap-3 px-3 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" data-testid="link-quotes">
              <FileText className="w-4 h-4" />
              <span>Orçamentos</span>
            </a>
          </Link>
          <Link href="/company">
            <a className="flex items-center gap-3 px-3 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" data-testid="link-company">
              <Building className="w-4 h-4" />
              <span>Empresa</span>
            </a>
          </Link>
          <Link href="/subscription">
            <a className="flex items-center gap-3 px-3 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" data-testid="link-subscription">
              <CreditCard className="w-4 h-4" />
              <span>Assinatura</span>
            </a>
          </Link>
          {user?.role === 'admin' && (
            <Link href="/admin">
              <a className="flex items-center gap-3 px-3 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" data-testid="link-admin">
                <Crown className="w-4 h-4" />
                <span>Admin Panel</span>
              </a>
            </Link>
          )}
        </nav>
        
        {/* Footer */}
        <div className="p-4 border-t border-border">
          <button 
            onClick={() => window.location.href = '/api/logout'}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors w-full text-left"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-foreground" data-testid="heading-dashboard">Dashboard</h2>
            <p className="text-muted-foreground">Visão geral da sua conta e atividades</p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${
              company?.subscriptionStatus === 'active' 
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`} data-testid="badge-subscription-status">
              <div className={`w-2 h-2 rounded-full ${
                company?.subscriptionStatus === 'active' ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="text-sm font-medium">
                {company?.subscriptionStatus === 'active' ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <Link href="/quotes/new">
              <Button className="flex items-center gap-2" data-testid="button-new-quote">
                <Plus className="w-4 h-4" />
                Novo Orçamento
              </Button>
            </Link>
          </div>
        </header>
        
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total de Orçamentos</p>
                    <p className="text-3xl font-bold text-foreground mt-2" data-testid="stat-total-quotes">
                      {stats.totalQuotes}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <FileText className="text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Valor Total</p>
                    <p className="text-3xl font-bold text-foreground mt-2" data-testid="stat-total-revenue">
                      R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <DollarSign className="text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pendentes</p>
                    <p className="text-3xl font-bold text-foreground mt-2" data-testid="stat-pending-quotes">
                      {stats.pendingQuotes}
                    </p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <Clock className="text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Taxa de Conversão</p>
                    <p className="text-3xl font-bold text-foreground mt-2" data-testid="stat-conversion-rate">
                      {stats.conversionRate}%
                    </p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <TrendingUp className="text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Recent Activity and Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Quotes */}
            <div className="lg:col-span-2 bg-card border border-border rounded-lg shadow-sm">
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">Orçamentos Recentes</h3>
                  <Link href="/quotes">
                    <Button variant="ghost" size="sm" data-testid="link-view-all-quotes">
                      Ver todos
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="p-0">
                {recentQuotes.length === 0 ? (
                  <div className="p-8 text-center">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground" data-testid="text-no-quotes">Nenhum orçamento encontrado</p>
                    <Link href="/quotes/new">
                      <Button variant="outline" className="mt-4" data-testid="button-create-first-quote">
                        Criar primeiro orçamento
                      </Button>
                    </Link>
                  </div>
                ) : (
                  recentQuotes.map((quote) => (
                    <div key={quote.id} className="flex items-center justify-between p-4 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors" data-testid={`quote-${quote.id}`}>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <FileText className="text-primary text-sm" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground" data-testid={`quote-title-${quote.id}`}>
                            {quote.title}
                          </p>
                          <p className="text-sm text-muted-foreground" data-testid={`quote-client-${quote.id}`}>
                            {quote.clientName || 'Cliente não informado'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground" data-testid={`quote-total-${quote.id}`}>
                          R$ {parseFloat(quote.total || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-1 rounded-full text-xs border ${getStatusColor(quote.status || 'draft')}`} data-testid={`quote-status-${quote.id}`}>
                            {getStatusText(quote.status || 'draft')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            {/* Quick Actions & Account Status */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <Card className="border-0 shadow-sm">
                <div className="p-6 border-b border-border">
                  <h3 className="text-lg font-semibold text-foreground">Ações Rápidas</h3>
                </div>
                <div className="p-6 space-y-4">
                  <Link href="/quotes/new">
                    <button className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left" data-testid="button-quick-create-quote">
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                        <Plus className="text-blue-600 text-sm" />
                      </div>
                      <span className="font-medium text-foreground">Criar Orçamento</span>
                    </button>
                  </Link>
                  
                  <Link href="/company">
                    <button className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left" data-testid="button-quick-manage-company">
                      <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                        <Building className="text-green-600 text-sm" />
                      </div>
                      <span className="font-medium text-foreground">Configurar Empresa</span>
                    </button>
                  </Link>
                  
                  <Link href="/quotes">
                    <button className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left" data-testid="button-quick-view-reports">
                      <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                        <BarChart3 className="text-purple-600 text-sm" />
                      </div>
                      <span className="font-medium text-foreground">Ver Relatórios</span>
                    </button>
                  </Link>
                </div>
              </Card>
              
              {/* Account Status */}
              <Card className="border-0 shadow-sm">
                <div className="p-6 border-b border-border">
                  <h3 className="text-lg font-semibold text-foreground">Status da Conta</h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Plano</span>
                    <span className="font-medium text-foreground" data-testid="text-plan">QuoteMaster Pro</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <span className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        company?.subscriptionStatus === 'active' ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <span className={`text-sm font-medium ${
                        company?.subscriptionStatus === 'active' ? 'text-green-700' : 'text-red-700'
                      }`} data-testid="text-subscription-status">
                        {company?.subscriptionStatus === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </span>
                  </div>
                  <div className="pt-4 border-t border-border">
                    <Link href="/subscription">
                      <Button className="w-full" data-testid="button-manage-subscription">
                        Gerenciar Assinatura
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
