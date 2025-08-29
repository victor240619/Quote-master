import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Package } from "lucide-react";

interface QuoteItem {
  description: string;
  unit_price: number;
  needed_quantity: number;
  owned_quantity: number;
  buy_quantity: number;
  total: number;
}

interface ItemsListProps {
  items: QuoteItem[];
  onChange: (items: QuoteItem[]) => void;
  disabled?: boolean;
}

export default function ItemsList({ items, onChange, disabled }: ItemsListProps) {
  const addItem = () => {
    const newItems = [...items, { 
      description: '', 
      unit_price: 0, 
      needed_quantity: 1, 
      owned_quantity: 0,
      buy_quantity: 1,
      total: 0 
    }];
    onChange(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Calculate buy_quantity and total
    if (field === 'needed_quantity' || field === 'owned_quantity' || field === 'unit_price') {
      const needed = newItems[index].needed_quantity || 0;
      const owned = newItems[index].owned_quantity || 0;
      const buyQty = Math.max(0, needed - owned);
      
      newItems[index].buy_quantity = buyQty;
      newItems[index].total = buyQty * (newItems[index].unit_price || 0);
    }
    
    onChange(newItems);
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="border-b border-gray-100">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Itens do Orçamento
          </CardTitle>
          <Button
            onClick={addItem}
            size="sm"
            disabled={disabled}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="button-add-item"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Item
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-[25%]">Item</TableHead>
                <TableHead className="w-[15%] text-right">Preço</TableHead>
                <TableHead className="w-[10%] text-right">Necessário</TableHead>
                <TableHead className="w-[10%] text-right">Já Tenho</TableHead>
                <TableHead className="w-[10%] text-right">Comprar</TableHead>
                <TableHead className="w-[15%] text-right">Total</TableHead>
                <TableHead className="w-[15%] text-right">A Pagar</TableHead>
                <TableHead className="w-[5%] text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    Nenhum item adicionado. Clique em "Adicionar Item" para começar.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item, index) => {
                  const economia = (item.owned_quantity || 0) * (item.unit_price || 0);
                  const totalNecessario = (item.needed_quantity || 0) * (item.unit_price || 0);
                  
                  return (
                    <TableRow key={index}>
                      <TableCell>
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          placeholder="Descrição do item"
                          disabled={disabled}
                          data-testid={`input-item-description-${index}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                            R$
                          </span>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="pl-8 text-right"
                            disabled={disabled}
                            data-testid={`input-item-price-${index}`}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={item.needed_quantity}
                          onChange={(e) => updateItem(index, 'needed_quantity', parseInt(e.target.value) || 0)}
                          className="text-right"
                          disabled={disabled}
                          data-testid={`input-item-needed-${index}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max={item.needed_quantity || 0}
                          step="1"
                          value={item.owned_quantity}
                          onChange={(e) => updateItem(index, 'owned_quantity', parseInt(e.target.value) || 0)}
                          className="text-right text-orange-600 font-medium"
                          disabled={disabled}
                          data-testid={`input-item-owned-${index}`}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-medium text-blue-600" data-testid={`text-item-buy-${index}`}>
                          {item.buy_quantity || 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-medium" data-testid={`text-item-total-${index}`}>
                          R$ {totalNecessario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="space-y-1">
                          <span className="font-semibold text-green-600 block" data-testid={`text-item-payment-${index}`}>
                            R$ {(item.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          {economia > 0 && (
                            <span className="text-xs text-gray-500 block">
                              Economia: R$ {economia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          disabled={disabled}
                          data-testid={`button-remove-item-${index}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}