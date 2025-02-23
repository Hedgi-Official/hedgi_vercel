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
    'Protect the value of your': 'Proteja o valor de seus'
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
