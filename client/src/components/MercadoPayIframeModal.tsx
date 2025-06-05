import { useEffect } from 'react';

export function MercadoPayIframeModal({ isOpen, onClose, amount }: { isOpen: boolean, onClose: () => void, amount: number }) {
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.status === "success") {
        console.log("✅ Payment succeeded", event.data);
        onClose(); // Optionally trigger onSuccess from parent
      } else if (event.data?.status === "error") {
        console.error("❌ Payment failed", event.data.error);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onClose]);

  if (!isOpen) return null;

  const FLASK_URL = process.env.FLASK_URL
  const iframeSrc = `${FLASK_URL}/brick?amount=${amount}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg overflow-hidden shadow-lg w-[400px] h-[600px]">
        <iframe
          src={iframeSrc}
          className="w-full h-full"
          frameBorder="0"
          title="Mercado Pago Payment"
        />
        <button onClick={onClose} className="absolute top-2 right-2 text-red-600 font-bold">×</button>
      </div>
    </div>
  );
}
