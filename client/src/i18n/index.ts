import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// English translations
const enUS = {
  translation: {
    welcome: 'Welcome to Hedgi',
    description: 'Your comprehensive currency hedging platform',
    'Get Started': 'Get Started',
    'Start Hedging Now': 'Start Hedging Now',
    'Protect the value': 'Protect the value',
    'of your': 'of your',
    'Professional currency hedging made simple': 'Professional currency hedging made simple',
    'Live Exchange Rates': 'Live Exchange Rates',
    'Active Hedges': 'Active Hedges',
    'New Hedge': 'New Hedge',
    'No active hedges': 'No active hedges',
    'Welcome': 'Welcome',
    'Logout': 'Logout',
    auth: {
      'Sign In': 'Sign In',
      'Sign Up': 'Sign Up',
      'Email': 'Email',
      'Password': 'Password',
      'Username': 'Username',
      'Enter your email': 'Enter your email',
      'Enter your password': 'Enter your password',
      'Enter your username': 'Enter your username',
      'or': 'or',
      'Forgot password?': 'Forgot password?',
      'Already have an account?': 'Already have an account?',
      'Don\'t have an account?': 'Don\'t have an account?'
    },
    currencyPairs: {
      'USDBRL': 'USD/BRL - US Dollar/Brazilian Real',
      'EURUSD': 'EUR/USD - Euro/US Dollar',
      'USDMXN': 'USD/MXN - US Dollar/Mexican Peso'
    },
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
      amountField: 'Amount to hedge',
      amountHelp: 'Enter the total amount involved in the future transaction',
      duration: 'Duration',
      days: 'days',
      calculateCost: 'Calculate Hedge Cost',
      currentRate: 'Current Rate',
      breakEvenRate: 'Break-even Rate',
      hedgeDetails: 'Hedge Details',
      totalCost: 'Total Cost',
      businessDays: 'Business Days',
      placeHedge: 'Place Hedge',
      willMakePayment: 'I will make a payment in',
      willReceive: 'I will receive',
      convertTo: 'and convert to',
      inFuture: 'in the future',
      enterAmount: 'Enter amount',
      selectDuration: 'Select duration: {days} days',
      lastDays: 'Last {days} Days of Exchange Rate History'
    }
  }
};

// Brazilian Portuguese translations
const ptBR = {
  translation: {
    welcome: 'Bem-vindo ao Hedgi',
    description: 'Sua plataforma completa de hedge cambial',
    'Get Started': 'Começar',
    'Start Hedging Now': 'Comece a Proteger Agora',
    'Protect the value': 'Proteja o valor',
    'of your': 'do seu',
    'Professional currency hedging made simple': 'Hedge cambial profissional simplificado',
    'Live Exchange Rates': 'Taxas de Câmbio em Tempo Real',
    'Active Hedges': 'Hedges Ativos',
    'New Hedge': 'Novo Hedge',
    'No active hedges': 'Nenhum hedge ativo',
    'Welcome': 'Bem-vindo',
    'Logout': 'Sair',
    auth: {
      'Sign In': 'Entrar',
      'Sign Up': 'Cadastrar',
      'Email': 'E-mail',
      'Password': 'Senha',
      'Username': 'Nome de usuário',
      'Enter your email': 'Digite seu e-mail',
      'Enter your password': 'Digite sua senha',
      'Enter your username': 'Digite seu nome de usuário',
      'or': 'ou',
      'Forgot password?': 'Esqueceu a senha?',
      'Already have an account?': 'Já tem uma conta?',
      'Don\'t have an account?': 'Não tem uma conta?'
    },
    currencyPairs: {
      'USDBRL': 'USD/BRL - Dólar Americano/Real Brasileiro',
      'EURUSD': 'EUR/USD - Euro/Dólar Americano',
      'USDMXN': 'USD/MXN - Dólar Americano/Peso Mexicano'
    },
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
      amountField: 'Valor para proteção',
      amountHelp: 'Digite o valor total envolvido na transação futura',
      duration: 'Duração',
      days: 'dias',
      calculateCost: 'Calcular Custo do Hedge',
      currentRate: 'Taxa Atual',
      breakEvenRate: 'Taxa de Equilíbrio',
      hedgeDetails: 'Detalhes do Hedge',
      totalCost: 'Custo Total',
      businessDays: 'Dias Úteis',
      placeHedge: 'Realizar Hedge',
      willMakePayment: 'Farei um pagamento em',
      willReceive: 'Receberei',
      convertTo: 'e converterei para',
      inFuture: 'no futuro',
      enterAmount: 'Digite o valor',
      selectDuration: 'Selecione a duração: {days} dias',
      lastDays: 'Últimos {days} Dias do Histórico da Taxa de Câmbio'
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