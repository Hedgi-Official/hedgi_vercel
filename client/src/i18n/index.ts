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
      'Enter username': 'Enter username',
      'Select your birth date': 'Select your birth date'
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
      'Enter username': 'Digite seu nome de usuário',
      'Select your birth date': 'Selecione sua data de nascimento'
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
      tradeOrderNumber: 'Ordem de Negociação'
    },
    'What is a Hedge?': 'O que é um Hedge?',
    'What is Hedging?': 'O que é Hedging?',
    'Using Hedgi': 'Usando a Hedgi',
    'About Us': 'Sobre Nós',
    'Page Under Construction': 'Página Em Construção',
    'Coming Soon': 'Esta página está em construção. Por favor, volte em breve.'
  }
};

// Mexican Spanish translations
const esMX = {
  translation: {
    welcome: 'Bienvenido a Hedgi',
    description: 'Tu plataforma integral de cobertura cambiaria',
    'Get Started': 'Comenzar',
    'Start Hedging Now': 'Comienza a Protegerte Ahora',
    'Protect the value': 'Protege el valor',
    'of your': 'de tu',
    'Professional currency hedging made simple': 'Cobertura cambiaria profesional simplificada',
    'Live Exchange Rates': 'Tipos de Cambio en Tiempo Real',
    'Active Hedges': 'Coberturas Activas',
    'New Hedge': 'Nueva Cobertura',
    'No active hedges': 'No hay coberturas activas',
    'Welcome': 'Bienvenido',
    'Logout': 'Cerrar Sesión',
    'Home': 'Inicio',
    auth: {
      'Sign In': 'Iniciar Sesión',
      'Sign Up': 'Registrarse',
      'Email': 'Correo electrónico',
      'Password': 'Contraseña',
      'Username': 'Nombre de usuario',
      'Enter your email': 'Ingresa tu correo electrónico',
      'Enter your password': 'Ingresa tu contraseña',
      'Enter your username': 'Ingresa tu nombre de usuario',
      'or': 'o',
      'Forgot password?': '¿Olvidaste tu contraseña?',
      'Already have an account?': '¿Ya tienes una cuenta?',
      'Don\'t have an account?': '¿No tienes una cuenta?',
      'Welcome back': 'Bienvenido de nuevo',
      'Create your account': 'Crea tu cuenta',
      'Sign in to your account': 'Inicia sesión en tu cuenta',
      'Start protecting your currency today': 'Comienza a proteger tu moneda hoy',
      'Date of Birth': 'Fecha de Nacimiento',
      'Phone Number (Optional)': 'Número de Teléfono (Opcional)',
      'Confirm Password': 'Confirmar Contraseña',
      'Enter username': 'Ingresa tu nombre de usuario',
      'Select your birth date': 'Selecciona tu fecha de nacimiento'
    },
    currencyPairs: {
      'USDBRL': 'USD/BRL - Dólar Estadounidense/Real Brasileño',
      'EURUSD': 'EUR/USD - Euro/Dólar Estadounidense',
      'USDMXN': 'USD/MXN - Dólar Estadounidense/Peso Mexicano',
      'BRLUSD': 'BRL/USD - Real Brasileño/Dólar Estadounidense',
      'BRLEUR': 'BRL/EUR - Real Brasileño/Euro',
      'BRLMXN': 'BRL/MXN - Real Brasileño/Peso Mexicano',
      'MXNUSD': 'MXN/USD - Peso Mexicano/Dólar Estadounidense',
      'MXNEUR': 'MXN/EUR - Peso Mexicano/Euro',
      'MXNBRL': 'MXN/BRL - Peso Mexicano/Real Brasileño'
    },
    simulator: {
      title: 'Simulador de Cobertura Cambiaria',
      targetCurrency: 'Moneda Objetivo',
      baseCurrency: 'Moneda Base',
      tradeDirection: 'Dirección de Operación',
      buy: 'Comprar',
      sell: 'Vender',
      buyHelp: 'Realizaré un pago en',
      sellHelp: 'Recibiré y convertiré a',
      amount: 'Monto en',
      amountField: 'Monto a cubrir',
      amountHelp: 'Ingresa el monto en USD que deseas proteger. Este es el valor total de tu transacción futura que deseas cubrir contra fluctuaciones cambiarias.\n\nPor ejemplo, si necesitas realizar un pago de $50,000 USD en 3 meses, ingresa 50000 aquí.',
      duration: 'Duración',
      durationLabel: 'Duración: {days} días',
      durationHelp: 'El número de días hasta que ocurra tu transacción futura. Esto determina por cuánto tiempo estará activa tu cobertura cambiaria.\n\nDuraciones más largas típicamente significan costos de cobertura más altos, pero proporcionan protección por un período más largo.',
      days: 'días',
      calculateCost: 'Calcular Costo de Cobertura',
      currentRate: 'Tipo de Cambio Actual',
      breakEvenRate: 'Tipo de Cambio de Equilibrio',
      hedgeDetails: 'Detalles de la Cobertura',
      totalCost: 'Costo Total',
      businessDays: 'Días Hábiles',
      placeHedge: 'Realizar Cobertura',
      margin: 'Margen',
      marginHelp: 'El margen es un monto adicional que pagas para mantener tu posición abierta en caso de movimientos adversos del mercado. Si no se consume, se te devuelve después de que se cierra tu cobertura.\n\nEl margen predeterminado se establece en 2 veces el costo de la cobertura para proporcionar protección suficiente para tu posición.',
      willMakePayment: 'Realizaré un pago en',
      willReceive: 'Recibiré',
      convertTo: 'y convertiré a',
      inFuture: 'en el futuro',
      enterAmount: 'Ingresa el monto',
      selectDuration: 'Selecciona la duración: {days} días',
      lastDays: 'Últimos {days} Días del Historial de Tipo de Cambio',
      targetCurrencyHelp: 'Esta es la moneda que deseas cubrir. Por ejemplo, si te preocupa que el USD se vuelva más caro, selecciona USD aquí.',
      baseCurrencyHelp: 'Esta es tu moneda doméstica o preferida. Por ejemplo, si estás en México y te preocupa que el USD se vuelva más caro en relación con el MXN, elige MXN como tu moneda base.',
      tradeDirectionHelp: 'Comprar USD: Selecciona esto si necesitarás comprar USD en el futuro y quieres protegerte contra su encarecimiento.\n\nVender USD: Selecciona esto si recibirás USD en el futuro y quieres protegerte contra su devaluación.',
      notifications: {
        hedgeCreated: 'Cobertura Creada',
        hedgeCreatedDesc: 'Tu posición de cobertura ha sido creada exitosamente.',
        hedgeDeleted: 'Cobertura Eliminada',
        hedgeDeletedDesc: 'La posición de cobertura ha sido eliminada.',
        error: 'Error'
      },
      status: {
        active: 'Activa',
        completed: 'Completada',
        cancelled: 'Cancelada'
      },
      hedgeTitles: {
        bought: 'Compró',
        sold: 'Vendió'
      },
      tradeOrderNumber: 'Orden de Operación'
    },
    'What is a Hedge?': '¿Qué es una Cobertura?',
    'What is Hedging?': '¿Qué es la Cobertura Cambiaria?',
    'Using Hedgi': 'Usando Hedgi',
    'About Us': 'Acerca de Nosotros',
    'Page Under Construction': 'Página En Construcción',
    'Coming Soon': 'Esta página está en construcción. Por favor, vuelve pronto.'
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      'en-US': enUS,
      'pt-BR': ptBR,
      'es-MX': esMX
    },
    lng: 'en-US', // default language
    fallbackLng: 'en-US',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;