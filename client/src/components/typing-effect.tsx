import { useEffect, useState } from 'react';

const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'AUD'];
const TYPING_SPEED = 150;
const PAUSE_DURATION = 2000;

export function TypingEffect() {
  const [text, setText] = useState('');
  const [currencyIndex, setCurrencyIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currency = currencies[currencyIndex];
    
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        setText(currency.slice(0, text.length + 1));
        if (text.length === currency.length) {
          setTimeout(() => setIsDeleting(true), PAUSE_DURATION);
        }
      } else {
        setText(currency.slice(0, text.length - 1));
        if (text.length === 0) {
          setIsDeleting(false);
          setCurrencyIndex((currencyIndex + 1) % currencies.length);
        }
      }
    }, TYPING_SPEED);

    return () => clearTimeout(timeout);
  }, [text, currencyIndex, isDeleting]);

  return (
    <span className="text-primary font-bold">{text}</span>
  );
}
