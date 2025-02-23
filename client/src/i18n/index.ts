import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// English translations
const enUS = {
  translation: {
    welcome: 'Welcome to Hedgi',
    description: 'Your comprehensive currency hedging platform',
    simulator: {
      title: 'Currency Hedge Simulator',
      targetCurrency: 'Target Currency',
      baseCurrency: 'Base Currency',
      tradeDirection: 'Trade Direction',
      buy: 'Buy',
      sell: 'Sell',
      buyHelp: 'I will make a payment in',
      sellHelp: 'I will receive and convert to',
      amount: 'Amount in',
      duration: 'Duration',
      days: 'days',
      calculateCost: 'Calculate Hedge Cost',
      currentRate: 'Current Rate',
      breakEvenRate: 'Break-even Rate',
      details: 'Hedge Details',
      totalCost: 'Total Cost',
      businessDays: 'Business Days',
      placeHedge: 'Place Hedge',
      willMakePayment: 'I will make a payment in',
      willReceive: 'I will receive',
      convertTo: 'and convert to',
      inFuture: 'in the future',
      enterAmount: 'Enter amount',
      selectDuration: 'Select duration: {days} days',
      lastDays: 'Last {days} Days of Exchange Rate History',
      amountToHedge: 'Amount to hedge',
      in: 'in'
    }
  }
};

// Brazilian Portuguese translations
const ptBR = {
  translation: {
    welcome: 'Bem-vindo ao Hedgi',
    description: 'Sua plataforma completa de hedge cambial',
    'Get Started': 'Começar',
    'Welcome,': 'Bem-vindo,',
    'Logout': 'Sair',
    'Switch to English': 'Mudar para Inglês',
    'Sign In': 'Entrar',
    'Sign Up': 'Cadastrar',
    'Email': 'Email',
    'Password': 'Senha',
    'Enter your email': 'Digite seu email',
    'Enter your password': 'Digite sua senha',
    'or': 'ou',
    simulator: {
      title: 'Simulador de Hedge Cambial',
      targetCurrency: 'Moeda Alvo',
      baseCurrency: 'Moeda Base',
      tradeDirection: 'Direção da Operação',
      buy: 'Comprar',
      sell: 'Vender',
      buyHelp: 'Farei um pagamento em',
      sellHelp: 'Receberei e converterei para',
      amount: 'Valor em',
      duration: 'Duração',
      days: 'dias',
      calculateCost: 'Calcular Custo do Hedge',
      currentRate: 'Taxa Atual',
      breakEvenRate: 'Taxa de Equilíbrio',
      details: 'Detalhes do Hedge',
      totalCost: 'Custo Total',
      businessDays: 'Dias Úteis',
      placeHedge: 'Realizar Hedge',
      willMakePayment: 'Farei um pagamento em',
      willReceive: 'Receberei',
      convertTo: 'e converterei para',
      inFuture: 'no futuro',
      enterAmount: 'Digite o valor',
      selectDuration: 'Selecione a duração: {days} dias',
      lastDays: 'Últimos {days} Dias do Histórico da Taxa de Câmbio',
      'in': 'em',
      'Enter amount': 'Digite o valor',
      'Select duration': 'Selecione a duração',
      'Duration:': 'Duração:',
      'Amount to hedge': 'Valor para hedge',
      'Select how many days until your': 'Selecione quantos dias até sua',
      'transaction is due': 'transação vencer',
      'Enter the total amount of': 'Digite o valor total de',
      'involved in the future transaction': 'envolvido na transação futura'
    }
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
