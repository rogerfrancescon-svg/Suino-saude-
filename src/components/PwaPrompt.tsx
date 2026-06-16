import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

export default function PwaPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      // Impede o Chrome <= 67 de mostrar o prompt automaticamente
      e.preventDefault();
      // Guarda o evento para disparar depois
      setDeferredPrompt(e);
      
      const dismissed = localStorage.getItem('pwa_prompt_dismissed');
      if (!dismissed) {
        setShowPrompt(true);
      }
    };
    
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    // Mostra o prompt de instalação
    deferredPrompt.prompt();
    
    // Aguarda a resposta do usuário
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    
    // Limpa o prompt
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Guarda a preferência para não ficar incomodando o usuário
    localStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-8 md:w-96 bg-[#1E293B] border border-[#1f6feb] p-4 rounded-xl shadow-2xl z-[100] flex gap-4 animate-in slide-in-from-bottom-5">
      <div className="w-12 h-12 bg-[#1f6feb]/20 rounded-xl flex items-center justify-center shrink-0 border border-[#1f6feb]/30 text-[#58a6ff]">
        <Smartphone size={24} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold text-white mb-1">Instalar Suino Saúde</p>
        <p className="text-xs text-slate-400 mb-3 leading-relaxed">Adicione o aplicativo à sua tela inicial para acesso offline, melhor performance e experiência em tela cheia.</p>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleInstall} 
            className="flex-1 bg-[#1f6feb] border border-[#388bfd] hover:bg-[#388bfd] text-white text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2 uppercase tracking-wide"
          >
            <Download size={14} />
            Instalar App
          </button>
          <button 
            onClick={handleDismiss} 
            className="px-3 py-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
