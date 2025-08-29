import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Building, CreditCard, Users, CheckCircle, Quote } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="container mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <div className="w-16 h-16 bg-primary rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-xl">
            <Quote className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-5xl font-bold text-foreground mb-6" data-testid="heading-main">
            QuoteMaster Pro
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            A plataforma completa para gestão de orçamentos profissionais. 
            Crie, gerencie e acompanhe seus orçamentos com facilidade e elegância.
          </p>
          <div className="flex gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-primary hover:bg-primary/90"
              onClick={() => window.location.href = '/api/login'}
              data-testid="button-login"
            >
              Entrar com Replit
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow" data-testid="card-quotes">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle className="text-xl">Gestão de Orçamentos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Crie orçamentos profissionais com múltiplos templates, 
                calcule automaticamente totais e descontos.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow" data-testid="card-company">
            <CardHeader>
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center mb-4">
                <Building className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle className="text-xl">Multi-Empresa</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Configure sua empresa com logo personalizado e 
                mantenha dados isolados e seguros.
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow" data-testid="card-subscription">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center mb-4">
                <CreditCard className="w-6 h-6 text-purple-600" />
              </div>
              <CardTitle className="text-xl">Assinatura Flexível</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Pagamento via Stripe com portal do cliente 
                para gerenciar sua assinatura facilmente.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Features List */}
        <div className="bg-card rounded-2xl shadow-xl p-8 mb-16">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12" data-testid="heading-features">
            Recursos Principais
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-foreground">5 templates de orçamento profissionais</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-foreground">Geração automática de PDF</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-foreground">Cálculo automático de totais</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-foreground">Sistema de descontos avançado</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-foreground">Gestão multi-usuário</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-foreground">Dashboard administrativo</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-foreground">Isolamento completo de dados</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-foreground">Suporte a múltiplas moedas</span>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground mb-6" data-testid="heading-cta">
            Pronto para começar?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Junte-se a centenas de empresas que já usam o QuoteMaster Pro
          </p>
          <Button 
            size="lg" 
            className="bg-primary hover:bg-primary/90 px-8 py-4 text-lg"
            onClick={() => window.location.href = '/api/login'}
            data-testid="button-cta-login"
          >
            Começar Agora - É Grátis
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center text-muted-foreground">
            <p>&copy; 2024 QuoteMaster Pro. Sistema profissional de gestão de orçamentos.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
