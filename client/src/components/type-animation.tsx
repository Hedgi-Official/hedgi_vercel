import { useEffect, useState } from "react";

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "BRL"];
const TYPING_SPEED = 150;
const ERASE_SPEED = 100;
const PAUSE_DURATION = 2000;

export function TypeAnimation() {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const updateText = () => {
      if (isTyping) {
        const currentCurrency = CURRENCIES[currentIndex];
        if (displayText.length < currentCurrency.length) {
          setDisplayText(currentCurrency.slice(0, displayText.length + 1));
          timeout = setTimeout(updateText, TYPING_SPEED);
        } else {
          timeout = setTimeout(() => {
            setIsTyping(false);
          }, PAUSE_DURATION);
        }
      } else {
        if (displayText.length > 0) {
          setDisplayText(displayText.slice(0, -1));
          timeout = setTimeout(updateText, ERASE_SPEED);
        } else {
          setCurrentIndex((currentIndex + 1) % CURRENCIES.length);
          setIsTyping(true);
          timeout = setTimeout(updateText, TYPING_SPEED);
        }
      }
    };

    timeout = setTimeout(updateText, TYPING_SPEED);

    return () => clearTimeout(timeout);
  }, [displayText, currentIndex, isTyping]);

  return (
    <span className="inline-block min-w-[4ch] font-mono">
      {displayText}
      <span className="animate-pulse">|</span>
    </span>
  );
}
