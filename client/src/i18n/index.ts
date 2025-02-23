import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// English translations (using our original text)
const enUS = {
  common: {
    login: "Login",
    signup: "Get Started",
    logout: "Logout",
    dashboard: "Dashboard",
    welcome: "Welcome",
    activeHedges: "Active Hedges",
    newHedge: "New Hedge",
    currencyHedgeSimulator: "Currency Hedge Simulator",
  },
  simulator: {
    targetCurrency: "Target Currency",
    baseCurrency: "Base Currency",
    tradeDirection: "Trade Direction",
    buy: "Buy",
    sell: "Sell",
    amount: "Amount",
    duration: "Duration",
    days: "days",
    calculateHedgeCost: "Calculate Hedge Cost",
    currentRate: "Current Rate",
    breakEvenRate: "Break-even Rate",
    hedgeDetails: "Hedge Details",
    totalCost: "Total Cost",
    businessDays: "Business Days",
    placeHedge: "Place Hedge",
  },
  tooltips: {
    targetCurrencyHelp: "The currency of the payment you will make or receive in the future",
    baseCurrencyHelp: "The currency whose fluctuations you are protecting against",
    buyHelp: "I will make a payment in {{currency}} in the future",
    sellHelp: "I will receive {{currency}} and convert to {{baseCurrency}} in the future",
    amountHelp: "Enter the total amount of {{currency}} involved in the future transaction",
    durationHelp: "Select how many days until your {{currency}} transaction is due",
  },
  auth: {
    welcomeMessage: "Welcome to Hedgi",
    fullName: "Full Name",
    email: "Email",
    dateOfBirth: "Date of Birth",
    cpf: "CPF",
    phoneNumber: "Phone Number (Optional)",
    username: "Username",
    password: "Password",
    confirmPassword: "Confirm Password",
    register: "Register",
    emailPlaceholder: "Enter your email",
    usernamePlaceholder: "Choose a username",
    passwordPlaceholder: "Choose a password",
    cpfPlaceholder: "e.g., 123.456.789-00",
  }
};

// Brazilian Portuguese translations
const ptBR = {
  common: {
    login: "Entrar",
    signup: "Começar",
    logout: "Sair",
    dashboard: "Painel",
    welcome: "Bem-vindo",
    activeHedges: "Hedges Ativos",
    newHedge: "Novo Hedge",
    currencyHedgeSimulator: "Simulador de Hedge Cambial",
  },
  simulator: {
    targetCurrency: "Moeda Alvo",
    baseCurrency: "Moeda Base",
    tradeDirection: "Direção da Operação",
    buy: "Comprar",
    sell: "Vender",
    amount: "Valor",
    duration: "Duração",
    days: "dias",
    calculateHedgeCost: "Calcular Custo do Hedge",
    currentRate: "Taxa Atual",
    breakEvenRate: "Taxa de Equilíbrio",
    hedgeDetails: "Detalhes do Hedge",
    totalCost: "Custo Total",
    businessDays: "Dias Úteis",
    placeHedge: "Realizar Hedge",
  },
  tooltips: {
    targetCurrencyHelp: "A moeda do pagamento que você fará ou receberá no futuro",
    baseCurrencyHelp: "A moeda contra cujas flutuações você está se protegendo",
    buyHelp: "Farei um pagamento em {{currency}} no futuro",
    sellHelp: "Receberei {{currency}} e converterei para {{baseCurrency}} no futuro",
    amountHelp: "Digite o valor total em {{currency}} envolvido na transação futura",
    durationHelp: "Selecione quantos dias até sua transação em {{currency}} vencer",
  },
  auth: {
    welcomeMessage: "Bem-vindo ao Hedgi",
    fullName: "Nome Completo",
    email: "Email",
    dateOfBirth: "Data de Nascimento",
    cpf: "CPF",
    phoneNumber: "Telefone (Opcional)",
    username: "Nome de Usuário",
    password: "Senha",
    confirmPassword: "Confirmar Senha",
    register: "Registrar",
    emailPlaceholder: "Digite seu email",
    usernamePlaceholder: "Escolha um nome de usuário",
    passwordPlaceholder: "Escolha uma senha",
    cpfPlaceholder: "ex: 123.456.789-00",
  }
};

// Mexican Spanish translations
const esMX = {
  common: {
    login: "Iniciar Sesión",
    signup: "Empezar",
    logout: "Cerrar Sesión",
    dashboard: "Panel",
    welcome: "Bienvenido",
    activeHedges: "Coberturas Activas",
    newHedge: "Nueva Cobertura",
    currencyHedgeSimulator: "Simulador de Cobertura Cambiaria",
  },
  simulator: {
    targetCurrency: "Moneda Objetivo",
    baseCurrency: "Moneda Base",
    tradeDirection: "Dirección de Operación",
    buy: "Comprar",
    sell: "Vender",
    amount: "Monto",
    duration: "Duración",
    days: "días",
    calculateHedgeCost: "Calcular Costo de Cobertura",
    currentRate: "Tipo de Cambio Actual",
    breakEvenRate: "Tipo de Cambio de Equilibrio",
    hedgeDetails: "Detalles de Cobertura",
    totalCost: "Costo Total",
    businessDays: "Días Hábiles",
    placeHedge: "Realizar Cobertura",
  },
  tooltips: {
    targetCurrencyHelp: "La moneda del pago que realizará o recibirá en el futuro",
    baseCurrencyHelp: "La moneda contra cuyas fluctuaciones se está protegiendo",
    buyHelp: "Realizaré un pago en {{currency}} en el futuro",
    sellHelp: "Recibiré {{currency}} y convertiré a {{baseCurrency}} en el futuro",
    amountHelp: "Ingrese el monto total en {{currency}} involucrado en la transacción futura",
    durationHelp: "Seleccione cuántos días faltan para que venza su transacción en {{currency}}",
  },
  auth: {
    welcomeMessage: "Bienvenido a Hedgi",
    fullName: "Nombre Completo",
    email: "Correo Electrónico",
    dateOfBirth: "Fecha de Nacimiento",
    cpf: "CPF",
    phoneNumber: "Teléfono (Opcional)",
    username: "Nombre de Usuario",
    password: "Contraseña",
    confirmPassword: "Confirmar Contraseña",
    register: "Registrarse",
    emailPlaceholder: "Ingrese su correo electrónico",
    usernamePlaceholder: "Elija un nombre de usuario",
    passwordPlaceholder: "Elija una contraseña",
    cpfPlaceholder: "ej: 123.456.789-00",
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enUS },
      'pt-BR': { translation: ptBR },
      'es-MX': { translation: esMX }
    },
    fallbackLng: 'en',
    debug: true,
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;