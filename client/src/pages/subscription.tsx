import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, 
  CheckCircle, 
  XCircle,
  Crown,
  ExternalLink,
  Loader2
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User } from "@/entities/User";
import { Company } from "@/entities/Company";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Link } from "wouter";

// Load Stripe using the provided publishable key via Vite env
const stripePublicKey = (import.meta.env.VITE_STRIPE_PUBLIC_KEY || import.meta.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) as string;
const stripePromise = loadStripe(stripePublicKey);

const SubscriptionForm = ({ clientSecret, onSuccess }: { clientSecret: string, onSuccess: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/subscription',
      },
    });

    if (error) {
      toast({
        title: "Erro no Pagamento",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Pagamento Bem-sucedido",
        description: "Sua assinatura foi ativada com sucesso!",
      });
      onSuccess();
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button 
        type="submit" 
        className="w-full" 
        disabled={!stripe || isProcessing}
        data-testid="button-submit-payment"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processando...
          </>
        ) : (
          'Confirmar Assinatura'
        )}
      </Button>
    </form>
  );
};

export default function Subscription() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [clientSecret, setClientSecret] = useState("");
  const [showPaymentForm, setShowPaymentForm] = useState(false);

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

  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    enabled: isAuthenticated,
  });

  const { data: company, refetch: refetchCompany, error: companyError } = useQuery({
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

  const subscriptionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/get-or-create-subscription");
      return response.json();
    },
    onSuccess: (data) => {
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        setShowPaymentForm(true);
      }
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
        description: "Falha ao criar assinatura. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const customerPortalMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/create-customer-portal");
      return response.json();
    },
    onSuccess: (data) => {
      if (data.portal_url) {
        window.location.href = data.portal_url;
      }
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
        description: "Falha ao abrir portal do cliente. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleStartSubscription = () => {
    subscriptionMutation.mutate();
  };

  const handleManageSubscription = () => {
    customerPortalMutation.mutate();
  };

  const handlePaymentSuccess = () => {
    setShowPaymentForm(false);
    setClientSecret("");
    refetchCompany();
    toast({
      title: "Sucesso",
      description: "Assinatura ativada com sucesso!",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  const isSubscriptionActive = company?.subscriptionStatus === 'active';

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3" data-testid="heading-subscription">
              <CreditCard className="w-8 h-8" />
              Gerenciar Assinatura
            </h1>
            <p className="text-muted-foreground">
              Controle sua assinatura e métodos de pagamento
            </p>
          </div>
          <Link href="/">
            <Button variant="outline" data-testid="button-back-dashboard">Dashboard</Button>
          </Link>
        </div>

        {/* Subscription Status Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-500" />
                QuoteMaster Pro
              </span>
              <Badge 
                variant={isSubscriptionActive ? "default" : "destructive"}
                data-testid="badge-subscription-status"
              >
                {isSubscriptionActive ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Ativo
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-1" />
                    Inativo
                  </>
                )}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Plan Features */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">Recursos inclusos:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Orçamentos ilimitados</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">5 templates profissionais</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Geração de PDF automática</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Logo personalizado</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Suporte prioritário</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Backups automáticos</span>
                </div>
              </div>
            </div>

            {/* Current Status */}
            <div className="border-t pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-foreground mb-2">Status da Assinatura</h4>
                  <p className={`text-lg font-semibold ${
                    isSubscriptionActive ? 'text-green-600' : 'text-red-600'
                  }`} data-testid="text-subscription-status">
                    {isSubscriptionActive ? 'Assinatura Ativa' : 'Assinatura Inativa'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isSubscriptionActive 
                      ? 'Você tem acesso completo a todas as funcionalidades.'
                      : 'Ative sua assinatura para usar todas as funcionalidades.'
                    }
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium text-foreground mb-2">Valor Mensal</h4>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-subscription-price">
                    R$ 30,00
                  </p>
                  <p className="text-sm text-muted-foreground">por mês</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="border-t pt-6">
              {isSubscriptionActive ? (
                <div className="flex gap-4">
                  <Button 
                    onClick={handleManageSubscription}
                    disabled={customerPortalMutation.isPending}
                    className="flex items-center gap-2"
                    data-testid="button-manage-subscription"
                  >
                    {customerPortalMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ExternalLink className="w-4 h-4" />
                    )}
                    Gerenciar no Portal do Cliente
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => window.open('mailto:suporte@quotemaster.pro', '_blank')}
                    data-testid="button-contact-support"
                  >
                    Contatar Suporte
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={handleStartSubscription}
                  disabled={subscriptionMutation.isPending}
                  size="lg"
                  className="w-full md:w-auto"
                  data-testid="button-start-subscription"
                >
                  {subscriptionMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Preparando...
                    </>
                  ) : (
                    'Ativar Assinatura - R$ 30,00/mês'
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payment Form */}
        {showPaymentForm && clientSecret && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Finalizar Assinatura</CardTitle>
            </CardHeader>
            <CardContent>
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <SubscriptionForm 
                  clientSecret={clientSecret} 
                  onSuccess={handlePaymentSuccess}
                />
              </Elements>
            </CardContent>
          </Card>
        )}

        {/* Benefits Card */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Por que escolher o QuoteMaster Pro?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <CreditCard className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="font-medium text-foreground mb-2">Sem Taxas Extras</h4>
                <p className="text-sm text-muted-foreground">
                  Preço fixo mensal, sem surpresas ou custos adicionais.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <h4 className="font-medium text-foreground mb-2">Cancele Quando Quiser</h4>
                <p className="text-sm text-muted-foreground">
                  Sem fidelidade. Cancele sua assinatura a qualquer momento.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Crown className="w-6 h-6 text-purple-600" />
                </div>
                <h4 className="font-medium text-foreground mb-2">Suporte Prioritário</h4>
                <p className="text-sm text-muted-foreground">
                  Atendimento personalizado e suporte técnico especializado.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
