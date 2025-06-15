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
    'Active Trades': 'Active Trades',
    'New Hedge': 'New Hedge',
    'No active hedges': 'No active hedges',
    'No active trades': 'No active trades',
    'Hedging': 'Hedging',
    'Hedged': 'Hedged',
    'Hedged Amount': 'Hedged Amount',
    'Current Position': 'Current Position',
    'Status': 'Status',
    'Trade History': 'Trade History',
    'Past Trades': 'Past Trades',
    'Hide': 'Hide',
    'Show Trade History': 'Show Trade History',
    'Welcome': 'Welcome',
    'Logout': 'Logout',
    'Home': 'Home',
    auth: {
      'Sign In': 'Sign In',
      'Sign Up': 'Sign Up',
      'Email': 'Email',
      'Password': 'Password',
      'Username': 'Username',
      'Enter your email': 'Enter your email',
      'Enter your password': 'Enter your password',
      'Enter your username': 'Enter your username',
      'Enter your full name': 'Enter your full name',
      'or': 'or',
      'Forgot password?': 'Forgot password?',
      'Already have an account?': 'Already have an account?',
      'Don\'t have an account?': 'Don\'t have an account?',
      'Welcome back': 'Welcome back',
      'Create your account': 'Create your account',
      'Sign in to your account': 'Sign in to your account',
      'Start protecting your currency today': 'Start protecting your currency today',
      'Date of Birth': 'Date of Birth',
      'Phone Number (Optional)': 'Phone Number (Optional)',
      'Confirm Password': 'Confirm Password',
      'Enter username': 'Enter username',
      'Select your birth date': 'Select your birth date',
      'Select your country': 'Select your country',
      'Choose your country': 'Choose your country'
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
      multiplesOf1000: '(multiples of 1000)',
      amountField: 'Amount to hedge',
      amountHelp: 'Enter the amount of USD you want to protect. This is the total value of your future transaction that you want to hedge against currency fluctuations.\n\nFor example, if you need to make a $50,000 USD payment in 3 months, enter 50000 here.',
      duration: 'Duration',
      durationLabel: 'Duration: {days} days',
      durationHelp: 'The number of days until your future transaction will occur. This determines how long your currency hedge will be active.\n\nLonger durations typically mean higher hedging costs but provide protection for a longer period.',
      days: 'days',
      calculateCost: 'Calculate Hedge Cost',
      currentRate: 'Current Rate',
      breakEvenRate: 'Break-even Rate',
      hedgeDetails: 'Hedge Details',
      totalCost: 'Total Cost',
      businessDays: 'Business Days',
      placeHedge: 'Place Hedge',
      margin: 'Margin',
      marginHelp: 'Margin is an additional amount you pay to keep your position open in case of adverse market movements. If not consumed, it is returned to you after your hedge is closed.\n\nThe default margin is set to 2x the hedge cost to provide sufficient protection for your position.',
      willMakePayment: 'I will make a payment in',
      willReceive: 'I will receive',
      convertTo: 'and convert to',
      inFuture: 'in the future',
      enterAmount: 'Enter amount',
      selectDuration: 'Select duration: {days} days',
      lastDays: 'Last {days} Days of Exchange Rate History',
      targetCurrencyHelp: 'This is the currency you want to hedge. For example, if you\'re worried about USD getting more expensive, select USD here.',
      baseCurrencyHelp: 'This is your domestic or preferred currency. For example, if you\'re based in Brazil and concerned about USD getting more expensive relative to BRL, choose BRL as your base currency.',
      tradeDirectionHelp: 'Buy USD: Select this if you\'ll need to purchase USD in the future and want to protect against it becoming more expensive.\n\nSell USD: Select this if you\'ll receive USD in the future and want to protect against it becoming less valuable.',
      notifications: {
        hedgeCreated: 'Hedge Created',
        hedgeCreatedDesc: 'Your hedge position has been created successfully.',
        hedgeDeleted: 'Hedge Deleted',
        hedgeDeletedDesc: 'The hedge position has been removed.',
        error: 'Error'
      },
      status: {
        active: 'Active',
        completed: 'Completed',
        cancelled: 'Cancelled'
      },
      hedgeTitles: {
        bought: 'Bought',
        sold: 'Sold'
      },
      tradeOrderNumber: 'Trade Order',
      confirmCloseTitle: 'Confirm Trade Closure',
      confirmCloseMessage: 'Are you sure you want to close this trade?',
      confirmCloseYes: 'Yes, Close Trade',
      confirmCloseNo: 'No, Keep Trade'
    },
    currencyPairs: {
      'USDBRL': 'USD/BRL - US Dollar/Brazilian Real',
      'EURUSD': 'EUR/USD - Euro/US Dollar',
      'USDMXN': 'USD/MXN - US Dollar/Mexican Peso',
      'BRLUSD': 'BRL/USD - Brazilian Real/US Dollar',
      'BRLEUR': 'BRL/EUR - Brazilian Real/Euro',
      'BRLMXN': 'BRL/MXN - Brazilian Real/Mexican Peso',
      'MXNUSD': 'MXN/USD - Mexican Peso/US Dollar',
      'MXNEUR': 'MXN/EUR - Mexican Peso/Euro',
      'MXNBRL': 'MXN/BRL - Mexican Peso/Brazilian Real'
    },
    'What is a Hedge?': 'What is a Hedge?',
    'What is Hedging?': 'What is Hedging?',
    'Using Hedgi': 'Using Hedgi',
    'About Us': 'About Us',
    'Page Under Construction': 'Page Under Construction',
    'Coming Soon': 'This page is under construction. Please check back later.',
    payment: {
      title: 'Payment',
      mercadoPagoUnavailable: 'Mercado Pago is temporarily unavailable. Please try again in a few hours.'
    },
    lifestyle: {
      tagline: 'Protect your currency, so you can live the life you want — without the stress.',
      description: 'Take control of your financial future and enjoy peace of mind, knowing your currency is protected against market volatility.'
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
    'Active Trades': 'Negociações Ativas',
    'New Hedge': 'Novo Hedge',
    'No active hedges': 'Nenhum hedge ativo',
    'No active trades': 'Nenhuma negociação ativa',
    'Hedging': 'Protegendo',
    'Hedged': 'Protegido',
    'Hedged Amount': 'Valor Protegido',
    'Current Position': 'Posição Atual',
    'Status': 'Status',
    'Trade History': 'Histórico de Negociações',
    'Past Trades': 'Negociações Anteriores',
    'Hide': 'Ocultar',
    'Show Trade History': 'Mostrar Histórico de Negociações',
    'Welcome': 'Bem-vindo',
    'Logout': 'Sair',
    'Home': 'Início',
    auth: {
      'Sign In': 'Entrar',
      'Sign Up': 'Cadastrar',
      'Email': 'E-mail',
      'Password': 'Senha',
      'Username': 'Nome de usuário',
      'Enter your email': 'Digite seu e-mail',
      'Enter your password': 'Digite sua senha',
      'Enter your username': 'Digite seu nome de usuário',
      'Enter your full name': 'Digite seu nome completo',
      'or': 'ou',
      'Forgot password?': 'Esqueceu a senha?',
      'Already have an account?': 'Já tem uma conta?',
      'Don\'t have an account?': 'Não tem uma conta?',
      'Welcome back': 'Bem-vindo de volta',
      'Create your account': 'Crie sua conta',
      'Sign in to your account': 'Entre na sua conta',
      'Start protecting your currency today': 'Comece a proteger sua moeda hoje',
      'Date of Birth': 'Data de Nascimento',
      'Phone Number (Optional)': 'Telefone (Opcional)',
      'Confirm Password': 'Confirmar Senha',
      'Enter username': 'Digite seu nome de usuário',
      'Select your birth date': 'Selecione sua data de nascimento',
      'Select your country': 'Selecione seu país',
      'Choose your country': 'Escolha seu país',
    },
    currencyPairs: {
      'USDBRL': 'USD/BRL - Dólar Americano/Real Brasileiro',
      'EURUSD': 'EUR/USD - Euro/Dólar Americano',
      'USDMXN': 'USD/MXN - Dólar Americano/Peso Mexicano',
      'BRLUSD': 'BRL/USD - Real Brasileiro/Dólar Americano',
      'BRLEUR': 'BRL/EUR - Real Brasileiro/Euro',
      'BRLMXN': 'BRL/MXN - Real Brasileiro/Peso Mexicano',
      'MXNUSD': 'MXN/USD - Peso Mexicano/Dólar Americano',
      'MXNEUR': 'MXN/EUR - Peso Mexicano/Euro',
      'MXNBRL': 'MXN/BRL - Peso Mexicano/Real Brasileiro'
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
      multiplesOf1000: '(múltiplos de 1000)',
      amountField: 'Valor para proteção',
      amountHelp: 'Digite o valor em USD que você deseja proteger. Este é o valor total da sua transação futura que você deseja proteger contra flutuações cambiais.\n\nPor exemplo, se você precisar fazer um pagamento de $50.000 USD em 3 meses, digite 50000 aqui.',
      duration: 'Duração',
      durationLabel: 'Duração: {days} dias',
      durationHelp: 'O número de dias até que sua transação futura ocorra. Isso determina por quanto tempo sua proteção cambial estará ativa.\n\nDurações mais longas geralmente significam custos mais altos de hedge, mas proporcionam proteção por um período mais longo.',
      days: 'dias',
      calculateCost: 'Calcular Custo do Hedge',
      currentRate: 'Taxa Atual',
      breakEvenRate: 'Taxa de Equilíbrio',
      hedgeDetails: 'Detalhes do Hedge',
      totalCost: 'Custo Total',
      businessDays: 'Dias Úteis',
      placeHedge: 'Realizar Hedge',
      margin: 'Margem',
      marginHelp: 'A margem é um valor adicional que você paga para manter sua posição aberta em caso de movimentos adversos do mercado. Se não for consumida, ela é devolvida a você após o fechamento do seu hedge.\n\nA margem padrão é definida como 2x o custo do hedge para fornecer proteção suficiente para sua posição.',
      willMakePayment: 'Farei um pagamento em',
      willReceive: 'Receberei',
      convertTo: 'e converterei para',
      inFuture: 'no futuro',
      enterAmount: 'Digite o valor',
      selectDuration: 'Selecione a duração: {days} dias',
      lastDays: 'Últimos {days} Dias do Histórico da Taxa de Câmbio',
      targetCurrencyHelp: 'Esta é a moeda que você deseja proteger. Por exemplo, se você está preocupado com o USD ficando mais caro, selecione USD aqui.',
      baseCurrencyHelp: 'Esta é sua moeda doméstica ou preferida. Por exemplo, se você está no Brasil e preocupado com o USD ficando mais caro em relação ao BRL, escolha BRL como sua moeda base.',
      tradeDirectionHelp: 'Comprar USD: Selecione esta opção se você precisará comprar USD no futuro e deseja se proteger contra o aumento de preço.\n\nVender USD: Selecione esta opção se você receberá USD no futuro e deseja se proteger contra a desvalorização.',
      notifications: {
        hedgeCreated: 'Hedge Criado',
        hedgeCreatedDesc: 'Sua posição de hedge foi criada com sucesso.',
        hedgeDeleted: 'Hedge Excluído',
        hedgeDeletedDesc: 'A posição de hedge foi removida.',
        error: 'Erro'
      },
      status: {
        active: 'Ativo',
        completed: 'Concluído',
        cancelled: 'Cancelado'
      },
      hedgeTitles: {
        bought: 'Comprou',
        sold: 'Vendeu'
      },
      tradeOrderNumber: 'Ordem de Negociação',
      confirmCloseTitle: 'Confirmar Fechamento da Negociação',
      confirmCloseMessage: 'Tem certeza de que deseja fechar esta negociação?',
      confirmCloseYes: 'Sim, Fechar Negociação',
      confirmCloseNo: 'Não, Manter Negociação'
    },
    'What is a Hedge?': 'O que é um Hedge?',
    'What is Hedging?': 'O que é Hedging?',
    'Using Hedgi': 'Usando a Hedgi',
    'About Us': 'Sobre Nós',
    'Page Under Construction': 'Página Em Construção',
    'Coming Soon': 'Esta página está em construção. Por favor, volte em breve.',
    payment: {
      title: 'Pagamento',
      mercadoPagoUnavailable: 'Mercado Pago está temporariamente indisponível. Tente novamente em algumas horas.'
    },
    lifestyle: {
      tagline: 'Proteja sua moeda, para que você possa viver a vida que deseja — sem o estresse.',
      description: 'Assuma o controle do seu futuro financeiro e desfrute de tranquilidade, sabendo que sua moeda está protegida contra a volatilidade do mercado.'
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