import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Bug } from 'lucide-react';

export default function PwaPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [swStatus, setSwStatus] = useState<string>('Verificando...');
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    // Check Service Worker status
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(registration => {
        if (registration) {
          setSwStatus(`Registrado ✅`);
        } else {
          setSwStatus('Não registrado ❌');
        }
      }).catch(err => {
        setSwStatus(`Erro: ${err.message}`);
      });
    } else {
      setSwStatus('Não suportado pelo navegador 🚫');
    }

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

  return (
    <>
      <div className="fixed top-20 right-4 z-[200]">
         <button 
           onClick={() => setShowDebug(!showDebug)} 
           className="text-[10px] bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 p-2 rounded-lg flex items-center gap-1 shadow-md transition-colors"
         >
           <Bug size={12} /> Debug PWA
         </button>
         {showDebug && (
           <div className="mt-2 bg-slate-900/95 backdrop-blur-sm text-xs text-white p-3 rounded-lg border border-slate-700 shadow-xl w-64 break-words">
             <div className="font-bold mb-2 border-b border-slate-700 pb-1 flex justify-between items-center text-slate-200">
               <span>Painel de Debug</span>
               <button onClick={() => setShowDebug(false)} className="text-slate-400 hover:text-white"><X size={14} /></button>
             </div>
             <div className="mb-2">
               <span className="text-slate-400">Service Worker:</span> <br/>
               <span className="font-mono text-[10px] text-brand-primary">{swStatus}</span>
             </div>
             <div className="mb-2">
               <span className="text-slate-400">Prompt Event:</span> <br/>
               <span className="font-mono text-[10px] text-brand-primary">{deferredPrompt ? 'Capturado ✅' : 'Não capturado ❌'}</span>
             </div>
             {!deferredPrompt && (
               <div className="mt-3 text-[9px] text-amber-400/90 leading-relaxed bg-amber-500/10 p-2 rounded border border-amber-500/20">
                 O evento de instalação (beforeinstallprompt) não disparou. Isso geralmente ocorre se:
                 <ul className="list-disc pl-3 mt-1 space-y-1">
                   <li>O aplicativo está aberto dentro de um <strong>iframe</strong> (como na tela de preview). Abra em uma nova aba!</li>
                   <li>O PWA já está instalado</li>
                   <li>O Service Worker falhou</li>
                   <li>O site não está em HTTPS</li>
                 </ul>
                 <div className="mt-2 pt-2 border-t border-amber-500/20 text-center">
                   <a 
                     href={window.location.href} 
                     target="_blank" 
                     rel="noopener noreferrer"
                     className="block w-full py-1.5 bg-amber-500 text-black font-bold rounded"
                   >
                     Abrir App em Nova Aba
                   </a>
                 </div>
               </div>
             )}
           </div>
         )}
      </div>

      {showPrompt && (
        <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-8 md:w-96 bg-[#1E293B] border border-brand-primary p-4 rounded-xl shadow-2xl z-[100] flex gap-4 animate-in slide-in-from-bottom-5">
          <div className="w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center shrink-0 border border-brand-primary/30 text-brand-primary">
            <Smartphone size={24} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-white mb-1">Instalar Suino Saúde</p>
            <p className="text-xs text-slate-400 mb-3 leading-relaxed">Adicione o aplicativo à sua tela inicial para acesso offline, melhor performance e experiência em tela cheia.</p>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleInstall} 
                className="flex-1 bg-brand-primary border border-brand-primary-light hover:brightness-110 text-black text-xs font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-2 uppercase tracking-wide"
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
      )}
    </>
  );
}
