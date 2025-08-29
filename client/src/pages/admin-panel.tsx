import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Shield, 
  Users, 
  FileText, 
  DollarSign,
  Ban,
  CheckCircle2,
  AlertTriangle,
  Crown,
  Trash2
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User } from "@/entities/User";
import { Company } from "@/entities/Company";
import { QuoteDraft } from "@/entities/QuoteDraft";
import { isUnauthorizedError } from "@/lib/authUtils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "wouter";

export default function AdminPanel() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [actionDialog, setActionDialog] = useState<{ open: boolean; user: any; action: string | null }>({ 
    open: false, 
    user: null, 
    action: null 
  });
  const [processing, setProcessing] = useState(false);

  // Redirect to home if not authenticated or not admin
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

    if (!isLoading && isAuthenticated && user?.role !== 'admin') {
      toast({
        title: "Access Denied",
        description: "Admin access required.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, user, toast]);

  const { data: users = [], error: usersError } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => User.list(),
    retry: false,
    enabled: isAuthenticated && user?.role === 'admin',
  });

  // Handle users error
  useEffect(() => {
    if (usersError && isUnauthorizedError(usersError as Error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [usersError, toast]);

  const { data: companies = [], error: companiesError } = useQuery({
    queryKey: ["admin", "companies"],
    queryFn: () => Company.list(),
    retry: false,
    enabled: isAuthenticated && user?.role === 'admin',
  });

  // Handle companies error
  useEffect(() => {
    if (companiesError && isUnauthorizedError(companiesError as Error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [companiesError, toast]);

  const { data: quotes = [], error: quotesError } = useQuery({
    queryKey: ["admin", "quotes"],
    queryFn: () => QuoteDraft.list(),
    retry: false,
    enabled: isAuthenticated && user?.role === 'admin',
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

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: any }) => User.update(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "companies"] });
      setActionDialog({ open: false, user: null, action: null });
      toast({
        title: "Success",
        description: "User updated successfully",
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
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const handleUserAction = (selectedUser: any, action: string) => {
    setActionDialog({ open: true, user: selectedUser, action });
  };

  const confirmUserAction = async () => {
    if (!actionDialog.user || !actionDialog.action) return;

    try {
      setProcessing(true);
      const { user: selectedUser, action } = actionDialog;

      if (action === 'delete') {
        await updateUserMutation.mutateAsync({
          userId: selectedUser.id,
          data: { 
            role: 'deleted',
            email: `deleted_${Date.now()}_${selectedUser.email}`
          }
        });
      } else if (action === 'ban') {
        await updateUserMutation.mutateAsync({
          userId: selectedUser.id,
          data: { role: 'banned' }
        });
      } else if (action === 'unban') {
        await updateUserMutation.mutateAsync({
          userId: selectedUser.id,
          data: { role: 'user' }
        });
      }
    } catch (error) {
      console.error("Error performing user action:", error);
    } finally {
      setProcessing(false);
    }
  };

  const getUserCompany = (userEmail: string) => {
    return companies.find(c => c.createdBy === userEmail);
  };

  const getUserStatus = (selectedUser: any) => {
    if (selectedUser.role === 'admin') return { text: 'Admin', variant: 'default', color: 'text-blue-600' };
    if (selectedUser.role === 'banned') return { text: 'Banido', variant: 'destructive', color: 'text-red-600' };
    if (selectedUser.role === 'deleted') return { text: 'Excluído', variant: 'secondary', color: 'text-gray-600' };
    
    const company = getUserCompany(selectedUser.email);
    if (!company) return { text: 'Sem Empresa', variant: 'secondary', color: 'text-gray-600' };
    
    switch (company.subscriptionStatus) {
      case 'active': return { text: 'Ativo', variant: 'default', color: 'text-green-600' };
      case 'past_due': return { text: 'Em Atraso', variant: 'destructive', color: 'text-orange-600' };
      case 'blocked': return { text: 'Bloqueado', variant: 'destructive', color: 'text-red-600' };
      default: return { text: 'Inativo', variant: 'secondary', color: 'text-gray-600' };
    }
  };

  // Calculate stats
  const stats = {
    totalUsers: users.length,
    activeSubscriptions: companies.filter(c => c.subscriptionStatus === 'active').length,
    totalRevenue: companies.filter(c => c.subscriptionStatus === 'active').length * 30, // R$ 30/mês
    totalQuotes: quotes.length
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null; // Redirect will handle this
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-xl">
              <Crown className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="heading-admin-panel">Painel Administrativo</h1>
            <p className="text-gray-600">
              Bem-vindo, {user?.firstName} {user?.lastName} • Gerencie usuários e monitore o sistema
            </p>
          </div>
          <Link href="/">
            <Button variant="outline" data-testid="button-back-dashboard">Dashboard</Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total de Usuários</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2" data-testid="stat-total-users">{stats.totalUsers}</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-50">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Assinaturas Ativas</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2" data-testid="stat-active-subscriptions">{stats.activeSubscriptions}</p>
                </div>
                <div className="p-3 rounded-lg bg-green-50">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Receita Mensal</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2" data-testid="stat-monthly-revenue">
                    R$ {stats.totalRevenue.toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-purple-50">
                  <DollarSign className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Orçamentos Criados</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2" data-testid="stat-total-quotes">{stats.totalQuotes}</p>
                </div>
                <div className="p-3 rounded-lg bg-orange-50">
                  <FileText className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Privileges Alert */}
        <Alert className="border-blue-200 bg-blue-50">
          <Shield className="h-4 w-4" />
          <AlertDescription className="text-blue-800">
            <strong>Privilégios de Administrador:</strong> Você pode usar o sistema de orçamentos sem limitações de pagamento e gerenciar todos os usuários.
          </AlertDescription>
        </Alert>

        {/* Users Management */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Gerenciamento de Usuários
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Usuário</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead>Orçamentos</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((tableUser) => {
                    const userQuotes = quotes.filter(q => q.createdBy === tableUser.email);
                    const status = getUserStatus(tableUser);
                    
                    return (
                      <TableRow key={tableUser.id} className="hover:bg-gray-50" data-testid={`user-row-${tableUser.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {tableUser.role === 'admin' && <Crown className="w-4 h-4 text-yellow-500" />}
                            <span className="font-medium" data-testid={`user-name-${tableUser.id}`}>
                              {tableUser.firstName} {tableUser.lastName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm" data-testid={`user-email-${tableUser.id}`}>
                          {tableUser.email}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant as any} className={status.color} data-testid={`user-status-${tableUser.id}`}>
                            {status.text}
                          </Badge>
                        </TableCell>
                        <TableCell data-testid={`user-created-date-${tableUser.id}`}>
                          {format(new Date(tableUser.createdAt!), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell data-testid={`user-quotes-count-${tableUser.id}`}>{userQuotes.length}</TableCell>
                        <TableCell className="text-right">
                          {tableUser.role !== 'admin' && (
                            <div className="flex gap-2 justify-end">
                              {tableUser.role === 'banned' ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUserAction(tableUser, 'unban')}
                                  className="text-green-600 border-green-600 hover:bg-green-50"
                                  data-testid={`button-unban-${tableUser.id}`}
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-1" />
                                  Desbanir
                                </Button>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleUserAction(tableUser, 'ban')}
                                    className="text-orange-600 border-orange-600 hover:bg-orange-50"
                                    data-testid={`button-ban-${tableUser.id}`}
                                  >
                                    <Ban className="w-4 h-4 mr-1" />
                                    Banir
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleUserAction(tableUser, 'delete')}
                                    className="text-red-600 border-red-600 hover:bg-red-50"
                                    data-testid={`button-delete-${tableUser.id}`}
                                  >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Excluir
                                  </Button>
                                </>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Action Confirmation Dialog */}
        <Dialog open={actionDialog.open} onOpenChange={() => setActionDialog({ open: false, user: null, action: null })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Confirmar Ação
              </DialogTitle>
              <DialogDescription>
                {actionDialog.action === 'delete' && 
                  `Tem certeza que deseja EXCLUIR o usuário ${actionDialog.user?.firstName} ${actionDialog.user?.lastName}? Esta ação não pode ser desfeita.`}
                {actionDialog.action === 'ban' && 
                  `Tem certeza que deseja BANIR o usuário ${actionDialog.user?.firstName} ${actionDialog.user?.lastName}? Ele perderá acesso ao sistema.`}
                {actionDialog.action === 'unban' && 
                  `Tem certeza que deseja DESBANIR o usuário ${actionDialog.user?.firstName} ${actionDialog.user?.lastName}? Ele terá acesso restaurado.`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setActionDialog({ open: false, user: null, action: null })}
                disabled={processing}
                data-testid="button-cancel-action"
              >
                Cancelar
              </Button>
              <Button
                variant={actionDialog.action === 'delete' ? 'destructive' : 'default'}
                onClick={confirmUserAction}
                disabled={processing}
                data-testid="button-confirm-action"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Processando...
                  </>
                ) : (
                  <>
                    {actionDialog.action === 'delete' && 'Excluir'}
                    {actionDialog.action === 'ban' && 'Banir'}
                    {actionDialog.action === 'unban' && 'Desbanir'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
