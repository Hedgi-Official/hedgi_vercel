/**
 * Payment utility functions for Mercado Pago integration
 */

interface PayerIdentification {
  type: string;
  number: string;
}

/**
 * Get the correct identification type and sample number based on currency
 * 
 * @param currency The currency code ('BRL' or 'MXN')
 * @returns An object with the correct identification type and number
 */
export function getIdentificationForCurrency(currency: string): PayerIdentification {
  if (currency === 'MXN') {
    // For Mexico, RFC is the tax ID (Registro Federal de Contribuyentes)
    return {
      type: 'RFC',
      number: 'XAXX010101000' // Sample RFC for testing
    };
  }
  
  // Default to Brazil CPF
  return {
    type: 'CPF',
    number: '219585466' // Sample CPF for testing
  };
}

/**
 * Get the correct locale for Mercado Pago based on currency
 * 
 * @param currency The currency code ('BRL' or 'MXN')
 * @returns The locale string for Mercado Pago
 */
export function getLocaleForCurrency(currency: string): string {
  if (currency === 'MXN') {
    return 'es-MX';
  }
  return 'pt-BR';
}