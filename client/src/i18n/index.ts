import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// English translations
const enUS = {
  translation: {
    // We'll populate these with the actual text once we get them from the user
    welcome: 'Welcome to Hedgi',
    description: 'Your comprehensive currency hedging platform',
    // Add more translation keys as needed
  }
};

// Brazilian Portuguese translations
const ptBR = {
  translation: {
    welcome: 'Bem-vindo ao Hedgi',
    description: 'Sua plataforma completa de hedge cambial',
    'Protect the value of your': 'Proteja o valor de seus',
    'Currency Hedge Simulator': 'Simulador de Hedge Cambial',
    'Target Currency': 'Moeda Alvo',
    'Base Currency': 'Moeda Base',
    'Trade Direction': 'Direção da Operação',
    'Buy': 'Comprar',
    'Sell': 'Vender',
    'Amount in': 'Valor em',
    'Duration': 'Duração',
    'days': 'dias',
    'Calculate Hedge Cost': 'Calcular Custo do Hedge',
    'Current Rate': 'Taxa Atual',
    'Break-even Rate': 'Taxa de Equilíbrio',
    'Hedge Details': 'Detalhes do Hedge',
    'Total Cost': 'Custo Total',
    'Business Days': 'Dias Úteis',
    'Place Hedge': 'Realizar Hedge',
    'I will make a payment in': 'Farei um pagamento em',
    'I will receive': 'Receberei',
    'and convert to': 'e converterei para',
    'in the future': 'no futuro'
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      'en-US': enUS,
      'pt-BR': ptBR
    },
    lng: 'en-US', // default language
    fallbackLng: 'en-US',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
