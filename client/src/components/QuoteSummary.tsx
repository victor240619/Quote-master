import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, Percent } from "lucide-react";

interface QuoteItem {
  total: number;
}

interface QuoteSummaryProps {
  items: QuoteItem[];
  discount: number;
  onDiscountChange: (discount: number) => void;
  disabled?: boolean;
}

export default function QuoteSummary({ items, discount, onDiscountChange, disabled }: QuoteSummaryProps) {
  const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal - discountAmount;

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="border-b border-gray-100">
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-blue-600" />
          Resumo do Orçamento
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Subtotal:</span>
            <span className="font-semibold" data-testid="text-subtotal">
              R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="discount" className="flex items-center gap-2">
              <Percent className="w-4 h-4" />
              Desconto (%)
            </Label>
            <Input
              id="discount"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={discount}
              onChange={(e) => onDiscountChange(parseFloat(e.target.value) || 0)}
              placeholder="0"
              disabled={disabled}
              data-testid="input-discount"
            />
            {discount > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-red-600">Desconto aplicado:</span>
                <span className="text-red-600 font-medium" data-testid="text-discount-amount">
                  -R$ {discountAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>

          <hr className="border-gray-200" />

          <div className="flex justify-between items-center text-lg">
            <span className="font-semibold text-gray-900">Total:</span>
            <span className="font-bold text-green-600 text-xl" data-testid="text-total">
              R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Informações</h4>
          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Itens:</span>
              <span data-testid="text-items-count">{items.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Moeda:</span>
              <span>Real Brasileiro (BRL)</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}