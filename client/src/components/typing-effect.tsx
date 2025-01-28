import { useEffect, useState } from 'react';

const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'AUD'];
const TYPING_SPEED = 150;
const PAUSE_DURATION = 2000;
const BACKSPACE_SPEED = 100;

export function TypingEffect() {
  const [text, setText] = useState('');
  const [currencyIndex, setCurrencyIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const currency = currencies[currencyIndex];

    if (isPaused) {
      const timeout = setTimeout(() => {
        setIsPaused(false);
        setIsDeleting(true);
      }, PAUSE_DURATION);
      return () => clearTimeout(timeout);
    }

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (text.length === currency.length) {
          setIsPaused(true);
          return;
        }
        setText(currency.slice(0, text.length + 1));
      } else {
        if (text.length === 0) {
          setIsDeleting(false);
          setCurrencyIndex((currencyIndex + 1) % currencies.length);
          return;
        }
        setText(currency.slice(0, text.length - 1));
      }
    }, isDeleting ? BACKSPACE_SPEED : TYPING_SPEED);

    return () => clearTimeout(timeout);
  }, [text, currencyIndex, isDeleting, isPaused]);

  return (
    <span className="text-primary font-bold inline-block min-w-[4ch]">{text}</span>
  );
}