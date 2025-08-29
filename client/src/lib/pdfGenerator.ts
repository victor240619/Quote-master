import { Company } from "@/entities/Company";

interface QuoteItem {
  description: string;
  unit_price: number;
  needed_quantity: number;
  owned_quantity: number;
  buy_quantity: number;
  total: number;
}

interface Quote {
  code: string;
  title: string;
  client_name: string;
  client_email: string;
  items: QuoteItem[];
  discount: number;
  template_variant: string;
  note?: string;
}

export const generateQuotePDF = async (quote: Quote) => {
  try {
    // Check if user can generate PDF
    const accessResponse = await fetch('/api/check-pdf-access', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!accessResponse.ok) {
      throw new Error('Failed to check PDF access');
    }
    
    const accessData = await accessResponse.json();
    
    if (!accessData.canGenerate) {
      // User has exceeded free trial and needs subscription
      return { 
        success: false, 
        requiresSubscription: true,
        freeDownloadsUsed: accessData.freeDownloadsUsed,
        message: 'Você já utilizou seu download gratuito. Assine o plano para continuar gerando PDFs.'
      };
    }
    
    // Track the PDF download
    const trackResponse = await fetch('/api/track-pdf-download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!trackResponse.ok) {
      const errorData = await trackResponse.json();
      if (errorData.code === 'SUBSCRIPTION_REQUIRED') {
        return { 
          success: false, 
          requiresSubscription: true,
          freeDownloadsUsed: errorData.freeDownloadsUsed,
          message: 'Assinatura necessária para gerar mais PDFs.'
        };
      }
      throw new Error('Failed to track PDF download');
    }
    
    const trackData = await trackResponse.json();
    
    // Get company data for logo
    const companies = await Company.list();
    const company = companies.length > 0 ? companies[0] : null;
    
    // Calculate totals
    const subtotal = quote.items.reduce((sum, item) => sum + (item.total || 0), 0);
    const discountAmount = (subtotal * (quote.discount || 0)) / 100;
    const total = subtotal - discountAmount;

    // Generate HTML content based on template variant
    const htmlContent = generateHTMLTemplate(quote, company, { subtotal, total, discountAmount });
    
    // Create a new window with the PDF content
    const pdfWindow = window.open('', '_blank');
    if (pdfWindow) {
      pdfWindow.document.write(htmlContent);
      pdfWindow.document.close();
      
      // Trigger print dialog
      setTimeout(() => {
        pdfWindow.print();
      }, 500);
    }

    return { 
      success: true, 
      url: '#',
      isFreeTrial: accessData.isFreeTrial,
      freeDownloadsUsed: trackData.freeDownloadsUsed,
      message: trackData.message
    };
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    return { 
      success: false, 
      message: 'Erro ao gerar PDF. Tente novamente.'
    };
  }
};

const getTemplateColors = (variant: string) => {
  switch (variant) {
    case 'variant_b': // Moderno
      return { main: '#7c3aed', dark: '#6b21a8', light: '#e9d5ff', bg: '#faf5ff', bg_grad: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)', header_grad: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)' };
    case 'variant_c': // Elegante (Dark Theme)
      return { main: '#c59d5f', dark: '#2d3748', light: '#4a5568', bg: '#2d3748', bg_grad: '#2d3748', header_grad: 'linear-gradient(135deg, #4a5568 0%, #2d3748 100%)', text: '#f7fafc', text_alt: '#a0aec0' };
    case 'variant_d': // Criativo
      return { main: '#047857', dark: '#065f46', light: '#d1fae5', bg: '#f0fdf4', bg_grad: 'linear-gradient(135deg, #f0fdf4 0%, #d1fae5 100%)', header_grad: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' };
    case 'variant_e': // Minimalista
      return { main: '#f97316', dark: '#1f2937', light: '#e5e7eb', bg: '#f9fafb', bg_grad: '#f9fafb', header_grad: '#1f2937' };
    default: // Clássico (variant_a)
      return { main: '#2563eb', dark: '#1e40af', light: '#e0e7ff', bg: '#eff6ff', bg_grad: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', header_grad: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)' };
  }
};

const generateHTMLTemplate = (quote: Quote, company: any, totals: { subtotal: number; total: number; discountAmount: number }) => {
  const colors = getTemplateColors(quote.template_variant);
  const isDarkTheme = quote.template_variant === 'variant_c';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Orçamento - ${quote.code}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          line-height: 1.6; 
          color: ${isDarkTheme ? colors.text : '#333'};
          background: ${isDarkTheme ? colors.bg : 'white'};
        }
        .container { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
        
        /* Header */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 3px solid ${colors.main};
        }
        .logo-section { flex: 1; }
        .logo { max-width: 200px; max-height: 80px; object-fit: contain; }
        .company-name {
          font-size: 24px;
          font-weight: bold;
          color: ${colors.main};
          margin-top: 10px;
        }
        .quote-info { text-align: right; flex: 1; }
        .quote-title {
          font-size: 28px;
          font-weight: bold;
          color: ${colors.main};
          margin-bottom: 10px;
        }
        .quote-code {
          background: ${colors.main};
          color: white;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: bold;
          display: inline-block;
          ${quote.template_variant === 'variant_e' ? 'color: #1f2937;' : ''}
        }
        
        /* Client Info */
        .client-section {
          background: ${isDarkTheme ? colors.light : colors.bg_grad};
          padding: 25px;
          border-radius: 10px;
          margin-bottom: 30px;
        }
        .client-title {
          font-size: 18px;
          font-weight: bold;
          color: ${isDarkTheme ? colors.main : colors.dark};
          margin-bottom: 15px;
        }
        .client-info { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .client-field strong { color: ${colors.main}; }
        
        /* Items Table */
        .items-section { margin-bottom: 30px; }
        .section-title {
          font-size: 20px;
          font-weight: bold;
          color: ${colors.main};
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 2px solid ${colors.light};
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          box-shadow: ${isDarkTheme ? 'none' : '0 4px 6px rgba(0,0,0,0.1)'};
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid ${isDarkTheme ? colors.light : 'transparent'};
        }
        .items-table th {
          background: ${colors.header_grad};
          color: white;
          padding: 15px 12px;
          text-align: left;
          font-weight: 600;
        }
        .items-table td {
          padding: 12px;
          border-bottom: 1px solid ${isDarkTheme ? colors.light : '#e5e7eb'};
          color: ${isDarkTheme ? colors.text_alt : '#333'};
        }
        .items-table tbody tr:nth-child(even) { background: ${isDarkTheme ? 'rgba(255,255,255,0.02)' : colors.bg}; }
        .items-table tbody tr:hover { background: ${isDarkTheme ? colors.light : '#f1f5f9'}; }
        .text-right { text-align: right; }
        .font-semibold { font-weight: 600; }
        .item-desc { color: ${isDarkTheme ? colors.text : '#333'}; }
        .text-green-600 { color: ${isDarkTheme ? '#38a169' : '#059669'}; }
        
        /* Summary */
        .summary-section {
          background: ${isDarkTheme ? colors.dark : 'white'};
          border: 2px solid ${colors.light};
          border-radius: 10px;
          padding: 25px;
          margin-bottom: 30px;
        }
        .summary-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; }
        .summary-row.total {
          border-top: 2px solid ${colors.main};
          margin-top: 15px;
          padding-top: 15px;
          font-size: 20px;
          font-weight: bold;
        }
        .total-value { color: ${colors.main}; font-size: 24px; }
        
        /* Notes */
        .notes-section {
          background: ${isDarkTheme ? colors.dark : '#f9fafb'};
          border-left: 4px solid ${colors.main};
          padding: 20px;
          border-radius: 0 8px 8px 0;
          margin-bottom: 30px;
        }
        .notes-title { font-weight: bold; color: ${colors.main}; margin-bottom: 10px; }
        
        /* Footer */
        .footer {
          text-align: center;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid ${colors.light};
          color: #6b7280;
          font-size: 14px;
        }
        
        @media print {
          body { margin: 0; background: white; color: #333; }
          .container { padding: 20px; }
          .quote-info, .items-table { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <div class="logo-section">
            ${company?.logo_url ? `<img src="${company.logo_url}" alt="Logo" class="logo" ${isDarkTheme ? 'style="filter: invert(1) grayscale(1) brightness(2);"' : ''}>` : `<div class="company-name">${company?.name || 'Sua Empresa'}</div>`}
          </div>
          <div class="quote-info">
            <div class="quote-title">ORÇAMENTO</div>
            <div class="quote-code">${quote.code}</div>
            <div style="margin-top: 15px; font-size: 14px; color: #6b7280;">
              Data: ${new Date().toLocaleDateString('pt-BR')}
            </div>
          </div>
        </div>

        <!-- Client Info -->
        <div class="client-section">
          <div class="client-title">Dados do Cliente</div>
          <div class="client-info">
            <div class="client-field">
              <strong>Cliente:</strong> ${quote.client_name || 'N/A'}
            </div>
            <div class="client-field">
              <strong>Email:</strong> ${quote.client_email || 'N/A'}
            </div>
          </div>
        </div>

        <!-- Title -->
        <div style="text-align: center; margin: 30px 0;">
          <h1 style="color: ${colors.main}; font-size: 24px;">
            ${quote.title}
          </h1>
        </div>

        <!-- Items -->
        <div class="items-section">
          <div class="section-title">Itens do Orçamento</div>
          <table class="items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th class="text-right">Preço Unit.</th>
                <th class="text-right">Necessário</th>
                <th class="text-right">Já Tenho</th>
                <th class="text-right">Comprar</th>
                <th class="text-right">A Pagar</th>
              </tr>
            </thead>
            <tbody>
              ${quote.items.map(item => {
                const economia = (item.owned_quantity || 0) * (item.unit_price || 0);
                return `
                <tr>
                  <td class="item-desc">${item.description}</td>
                  <td class="text-right">R$ ${(item.unit_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td class="text-right">${item.needed_quantity || 0}</td>
                  <td class="text-right" style="color: #f97316; font-weight: 600;">${item.owned_quantity || 0}</td>
                  <td class="text-right" style="color: #2563eb; font-weight: 600;">${item.buy_quantity || 0}</td>
                  <td class="text-right font-semibold text-green-600">
                    R$ ${(item.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    ${economia > 0 ? `<br><small style="color: #6b7280;">Economia: R$ ${economia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</small>` : ''}
                  </td>
                </tr>
              `;}).join('')}
            </tbody>
          </table>
        </div>

        <!-- Summary -->
        <div class="summary-section">
          <div class="summary-row">
            <span>Subtotal:</span>
            <span>R$ ${totals.subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          ${quote.discount > 0 ? `
          <div class="summary-row">
            <span>Desconto (${quote.discount}%):</span>
            <span style="color: #dc2626;">-R$ ${totals.discountAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          ` : ''}
          <div class="summary-row total">
            <span>TOTAL:</span>
            <span class="total-value">R$ ${totals.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        ${quote.note ? `
        <!-- Notes -->
        <div class="notes-section">
          <div class="notes-title">Observações:</div>
          <div>${quote.note}</div>
        </div>
        ` : ''}

        <!-- Footer -->
        <div class="footer">
          <p>Este orçamento foi gerado automaticamente pelo QuoteMaster</p>
          <p>Válido por 30 dias a partir da data de emissão</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export default { generateQuotePDF };