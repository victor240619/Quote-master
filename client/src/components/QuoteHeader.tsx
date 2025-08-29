import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, User, Mail } from "lucide-react";

interface QuoteHeaderProps {
  quote: {
    title: string;
    client_name: string;
    client_email: string;
  };
  onChange: (updater: (prev: any) => any) => void;
}

export default function QuoteHeader({ quote, onChange }: QuoteHeaderProps) {
  const handleChange = (field: string, value: string) => {
    onChange(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="border-b border-gray-100">
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-600" />
          Informações do Orçamento
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Título do Orçamento</Label>
          <Input
            id="title"
            value={quote.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="Ex: Desenvolvimento de Website"
            className="text-lg font-medium"
            data-testid="input-quote-title"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="client-name" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Nome do Cliente
            </Label>
            <Input
              id="client-name"
              value={quote.client_name}
              onChange={(e) => handleChange('client_name', e.target.value)}
              placeholder="Nome da empresa ou pessoa"
              data-testid="input-client-name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client-email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email do Cliente
            </Label>
            <Input
              id="client-email"
              type="email"
              value={quote.client_email}
              onChange={(e) => handleChange('client_email', e.target.value)}
              placeholder="email@cliente.com"
              data-testid="input-client-email"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}