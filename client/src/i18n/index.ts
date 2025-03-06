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
      'Enter username': 'Enter username'
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
      durationLabel: 'Duration: {days} days',
      durationHelp: 'Select how many days until your transaction is due',
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
      lastDays: 'Last {days} Days of Exchange Rate History',
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
      tradeOrderNumber: 'Trade Order'
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
    'Coming Soon': 'This page is under construction. Please check back later.'
  }
};

// Brazilian Portuguese translations
  pt: {
    common: {
      'Sign In': 'Entrar',
      'Sign Up': 'Cadastrar',
      'Sign Out': 'Sair',
      'Dashboard': 'Painel',
      'Settings': 'Configurações',
      'Profile': 'Perfil',
      'Home': 'Início',
      'Get Started': 'Começar'
    },
    hedging: {
      'What is Hedging?': 'O que é Hedging?',
      'hedging_description': 'Hedging é uma estratégia financeira utilizada para reduzir o risco causado por flutuações de preços, taxas de juros, moedas ou outras incertezas de mercado. Simplificando, o hedging funciona como um seguro, protegendo investidores, empresas e indivíduos contra perdas financeiras inesperadas devido à volatilidade do mercado.',
      'How Do Institutions Use Hedging?': 'Como Empresas e Instituições Utilizam o Hedging?',
      'institutions_description': 'Empresas e instituições financeiras frequentemente utilizam o hedging para proteger suas operações e lucros.',
      'Airlines': 'Companhias aéreas',
      'airline_description': 'Fazem hedging do preço do combustível para se protegerem contra aumentos no preço do petróleo.',
      'Agricultural': 'Empresas agrícolas',
      'agricultural_description': 'Fazem hedging dos preços das safras para garantir receitas previsíveis.',
      'Corporations': 'Corporações multinacionais',
      'corporations_description': 'Fazem hedging cambial para gerenciar riscos das operações e transações internacionais.',
      'institutions_disclaimer': 'Historicamente, essas estratégias sofisticadas eram reservadas para grandes empresas e instituições financeiras, que têm acesso a produtos financeiros específicos e equipes especializadas.',
      'But What About Individuals?': 'Mas e os indivíduos?',
      'individuals_description': 'Indivíduos também enfrentam riscos semelhantes, especialmente relacionados às oscilações cambiais. Por exemplo:',
      'education_risk': 'Custos com educação no exterior que flutuam devido ao câmbio.',
      'property_risk': 'Compra de imóveis no exterior que se tornam inesperadamente caros.',
      'travel_risk': 'Despesas de viagens internacionais que aumentam abruptamente devido a mudanças cambiais.',
      'investment_risk': 'Investimentos e economias perdendo valor por causa da volatilidade cambial.',
      'Disney Trip Example': 'Exemplo: Viagem em família para a Disney',
      'Without Hedging': 'Sem hedging',
      'without_hedging_example': 'Uma família brasileira planeja uma viagem à Disney, que hoje custa R$ 50 mil. Se o dólar subir, o custo pode aumentar significativamente até a data da viagem.',
      'Initial Cost': 'Custo Inicial',
      'Exchange Rate Changes': 'Mudanças na Taxa de Câmbio',
      'Final Cost': 'Custo Final',
      'With Hedging': 'Com hedging',
      'with_hedging_example': 'A família trava a taxa de câmbio atual, garantindo que o custo da viagem permaneça estável, independentemente das variações do mercado.',
      'individuals_disclaimer': 'Infelizmente, a maioria das instituições financeiras não oferece soluções de hedging adaptadas às necessidades específicas e à escala dos clientes individuais.',
      'Try It Yourself: Currency Hedge Simulator': 'Experimente: Simulador de Hedge Cambial',
      'simulator_description': 'Veja como o hedge cambial pode proteger suas despesas futuras contra a volatilidade das taxas de câmbio.',
      'Introducing Hedgi': 'Conheça a Hedgi: Soluções de Hedging Feitas para Você',
      'hedgi_description': 'Na Hedgi, acreditamos que todas as pessoas merecem ter tranquilidade financeira. Por isso, criamos soluções de hedging especialmente desenhadas para indivíduos:',
      'benefit_secure_rates': 'Fácil de usar: Ferramentas simples e intuitivas.',
      'benefit_protect': 'Transparente: Sem taxas escondidas ou linguagem complicada.',
      'benefit_tools': 'Seguro: Soluções confiáveis que protegem seu dinheiro e tranquilidade.',
      'hedgi_conclusion': 'Assuma o controle do seu futuro financeiro e proteja-se da volatilidade cambial. Hedging não é mais exclusividade de grandes instituições—agora é para você também.',
      'Discover How Easy Hedging Can Be with Hedgi': 'Descubra como é fácil proteger seu dinheiro com a Hedgi'
    },
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
      'Enter username': 'Digite seu nome completo'
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
      amountField: 'Valor para proteção',
      amountHelp: 'Digite o valor total envolvido na transação futura',
      duration: 'Duração',
      durationLabel: 'Duração: {days} dias',
      durationHelp: 'Selecione quantos dias até sua transação vencer',
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
      lastDays: 'Últimos {days} Dias do Histórico da Taxa de Câmbio',
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
      tradeOrderNumber: 'Ordem de Negociação'
    },
    'What is a Hedge?': 'O que é um Hedge?',
    'What is Hedging?': 'O que é Hedge?',
    'Using Hedgi': 'Usando o Hedgi',
    'About Us': 'Sobre Nós',
    'Page Under Construction': 'Página Em Construção',
    'Coming Soon': 'Esta página está em construção. Por favor, volte em breve.'
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