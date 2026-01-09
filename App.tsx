import React, { useState, useRef, useMemo } from 'react';
import { Upload, Play, RefreshCw, Settings, FileText, Trash2, Zap, CheckCircle2, AlertCircle, Clock, Send, Plus, X, UserPlus, Users } from 'lucide-react';
import { parseCSV } from './utils/csvParser';
import { Contact, SendStatus } from './types';
import { StatusBadge } from './components/StatusBadge';

const DEFAULT_WEBHOOK = 'https://n8n-n8n.g0rat2.easypanel.host/webhook-test/cadastrar-contato';

const App: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [webhookUrl, setWebhookUrl] = useState(DEFAULT_WEBHOOK);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  
  // Manual Entry State
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualForm, setManualForm] = useState({
    nome: '',
    telefone: '',
    campanha: 'Geral',
    template: 'boas_vindas'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Computed Statistics
  const stats = useMemo(() => {
    return contacts.reduce(
      (acc, curr) => {
        acc.total++;
        if (curr.status === SendStatus.SUCCESS) acc.success++;
        else if (curr.status === SendStatus.ERROR) acc.error++;
        else acc.pending++;
        return acc;
      },
      { total: 0, pending: 0, success: 0, error: 0 }
    );
  }, [contacts]);

  const progressPercentage = stats.total === 0 ? 0 : Math.round(((stats.success + stats.error) / stats.total) * 100);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsedContacts = parseCSV(text);
      // Append instead of replace to allow mixing CSV and Manual
      setContacts(prev => [...prev, ...parsedContacts]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleManualSubmit = () => {
    if (!manualForm.telefone.trim()) {
      alert("Por favor, insira o número de telefone.");
      return;
    }

    const phone = manualForm.telefone.replace(/\D/g, ''); // Remove non-digits
      
    if (phone.length === 0) {
       alert("Número de telefone inválido.");
       return;
    }

    const id = `manual-${Date.now()}`;
    const newContact: Contact = {
        id,
        Nome: manualForm.nome.trim() || 'Desconhecido',
        Telefone: phone,
        Nome_Campanha: manualForm.campanha.trim() || 'Geral',
        Nome_template: manualForm.template.trim() || 'boas_vindas',
        status: SendStatus.IDLE
    };

    setContacts(prev => [...prev, newContact]);
    
    // Clear specific fields but keep campaign/template for faster repeated entry
    setManualForm(prev => ({ ...prev, nome: '', telefone: '' }));
    setShowManualModal(false);
  };

  const clearList = () => {
    if (isProcessing) return;
    setContacts([]);
  };

  const processBulkQueue = async () => {
    if (contacts.length === 0) return;
    
    const targetUrl = webhookUrl.trim();
    if (!targetUrl) {
      alert("Por favor, configure uma URL de Webhook válida.");
      setShowConfig(true);
      return;
    }

    const pendingContacts = contacts.filter(c => c.status !== SendStatus.SUCCESS);

    if (pendingContacts.length === 0) {
      alert("Todos os contatos já foram enviados.");
      return;
    }

    setIsProcessing(true);

    setContacts(prev => prev.map(c => 
      pendingContacts.some(p => p.id === c.id) ? { ...c, status: SendStatus.SENDING, errorMessage: undefined } : c
    ));

    try {
      const payload = pendingContacts.map(c => ({
        Nome: c.Nome,
        Telefone: c.Telefone,
        Nome_Campanha: c.Nome_Campanha,
        Nome_template: c.Nome_template
      }));

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
        mode: 'cors',
        credentials: 'omit'
      });

      let responseData = null;
      try {
        responseData = await response.json();
        console.log("Resposta do Servidor:", responseData);
      } catch (jsonError) {
        console.warn("O servidor respondeu OK, mas não retornou JSON válido.", jsonError);
      }

      if (response.ok) {
        setContacts(prev => prev.map(c => 
          pendingContacts.some(p => p.id === c.id) ? { ...c, status: SendStatus.SUCCESS } : c
        ));
      } else {
        const errorText = `Erro Global: ${response.status} ${response.statusText}`;
        setContacts(prev => prev.map(c => 
          pendingContacts.some(p => p.id === c.id) ? { ...c, status: SendStatus.ERROR, errorMessage: errorText } : c
        ));
      }

    } catch (error: any) {
      let msg = 'Erro de conexão';
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
         msg = 'Erro de Rede/CORS';
      } else if (error.message) {
         msg = error.message;
      }

      setContacts(prev => prev.map(c => 
        pendingContacts.some(p => p.id === c.id) ? { ...c, status: SendStatus.ERROR, errorMessage: msg } : c
      ));
    } finally {
      setIsProcessing(false);
    }
  };

  const StatCard = ({ label, value, icon: Icon, colorClass, bgClass }: any) => (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">{label}</span>
        <div className={`p-1.5 rounded-lg ${bgClass}`}>
          <Icon className={`w-4 h-4 ${colorClass}`} />
        </div>
      </div>
      <div className="text-3xl font-bold text-gray-800 tracking-tight">{value}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/50 text-gray-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-20 relative">
      
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-white to-transparent pointer-events-none z-0"></div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-lg shadow-indigo-500/30">
                <Zap className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Campaign Dispatcher
              </h1>
            </div>
            <p className="text-gray-500 text-sm ml-12">Disparo em lote único via JSON.</p>
          </div>
          
          <button 
            onClick={() => setShowConfig(!showConfig)}
            className={`group flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-200 ${showConfig ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:shadow-sm'}`}
          >
            <Settings className={`w-4 h-4 transition-transform duration-500 ${showConfig ? 'rotate-90' : 'group-hover:rotate-45'}`} />
            <span className="text-sm font-medium">Configurações</span>
          </button>
        </div>

        {/* Configuration Panel */}
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showConfig ? 'max-h-40 opacity-100 mb-8' : 'max-h-0 opacity-0 mb-0'}`}>
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-2">Webhook Endpoint URL</label>
            <div className="relative">
              <input 
                type="text" 
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                placeholder="https://seu-n8n.com/webhook/..."
              />
              <div className="absolute right-3 top-3 text-xs text-gray-400 font-medium px-2 py-0.5 bg-white rounded border border-gray-200">POST</div>
            </div>
            <p className="text-xs text-gray-400 mt-2">Os dados serão enviados como um Array JSON contendo todos os contatos.</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total na Lista" value={stats.total} icon={FileText} colorClass="text-indigo-600" bgClass="bg-indigo-50" />
          <StatCard label="Sucesso" value={stats.success} icon={CheckCircle2} colorClass="text-emerald-600" bgClass="bg-emerald-50" />
          <StatCard label="Falhas" value={stats.error} icon={AlertCircle} colorClass="text-rose-600" bgClass="bg-rose-50" />
          <StatCard label="Pendentes" value={stats.pending} icon={Clock} colorClass="text-blue-600" bgClass="bg-blue-50" />
        </div>

        {/* Action Toolbar */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm mb-8 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-6 z-30 ring-1 ring-gray-900/5 backdrop-blur-xl bg-white/90">
          
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            {/* Import Button */}
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-medium rounded-xl border border-gray-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-4 h-4" />
              Importar CSV
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
            
            {/* Manual Add Button */}
            <button 
              onClick={() => setShowManualModal(true)}
              disabled={isProcessing}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-medium rounded-xl border border-indigo-100 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserPlus className="w-4 h-4" />
              Adicionar Manual
            </button>

            {contacts.length > 0 && (
              <button 
                onClick={clearList}
                disabled={isProcessing}
                className="px-4 py-2.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-100 transition-colors disabled:opacity-50"
                title="Limpar Lista"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
            {contacts.length > 0 && (
              <div className="hidden md:flex flex-col items-end mr-4">
                <span className="text-xs font-semibold text-gray-500">Progresso</span>
                <span className="text-sm font-bold text-indigo-600">{progressPercentage}%</span>
              </div>
            )}

            <button 
              onClick={processBulkQueue}
              disabled={contacts.length === 0 || stats.pending === 0 || isProcessing}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-md shadow-indigo-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none min-w-[200px]"
            >
              {isProcessing ? (
                <>Enviando...</>
              ) : stats.success > 0 || stats.error > 0 ? (
                  <>
                      <RefreshCw className="w-4 h-4" /> Reenviar Pendentes
                  </>
              ) : (
                  <>
                      <Send className="w-4 h-4 fill-current" /> Criar Lista no Webhook
                  </>
              )}
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        {contacts.length > 0 && (
          <div className="w-full mb-8 px-1">
              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500 ease-out" style={{ width: `${progressPercentage}%` }}></div>
              </div>
          </div>
        )}

        {/* Data Table */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[400px]">
          {contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 py-20 text-gray-400">
              <div className="bg-gray-50 p-6 rounded-full mb-4">
                 <Users className="w-12 h-12 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">A lista está vazia</h3>
              <p className="text-sm text-gray-500 max-w-sm text-center">
                Importe um CSV ou adicione contatos manualmente para começar a criar sua campanha.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50/80 sticky top-0 z-10 border-b border-gray-200 backdrop-blur-sm">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nome</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Telefone</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Campanha</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Template</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {contacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-gray-50/80 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={contact.status} />
                        {contact.errorMessage && (
                          <div className="text-[10px] text-rose-500 mt-1.5 font-medium ml-1">{contact.errorMessage}</div>
                        )}
                      </td>
                      <td className="px-6 py-4"><span className="text-sm font-medium text-gray-900">{contact.Nome}</span></td>
                      <td className="px-6 py-4"><span className="text-sm font-mono text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-100">{contact.Telefone}</span></td>
                      <td className="px-6 py-4"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{contact.Nome_Campanha}</span></td>
                      <td className="px-6 py-4"><span className="text-sm text-gray-500">{contact.Nome_template}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        <div className="mt-12 mb-8 text-center">
            <p className="text-xs text-gray-400 font-medium">Campaign Dispatcher Pro &copy; {new Date().getFullYear()}</p>
        </div>
      </div>

      {/* Manual Entry Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                Adicionar Manualmente
              </h3>
              <button 
                onClick={() => setShowManualModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome (Opcional)</label>
                <input 
                  type="text" 
                  value={manualForm.nome}
                  onChange={e => setManualForm({...manualForm, nome: e.target.value})}
                  className="w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-4 py-2 border text-sm bg-white text-gray-900 placeholder-gray-400"
                  placeholder="Ex: João da Silva"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone <span className="text-red-500">*</span>
                </label>
                <input 
                  type="tel"
                  value={manualForm.telefone}
                  onChange={e => setManualForm({...manualForm, telefone: e.target.value})}
                  className="w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-4 py-2 border text-sm bg-white text-gray-900 placeholder-gray-400 font-mono"
                  placeholder="5511999999999"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Campanha</label>
                  <input 
                    type="text" 
                    value={manualForm.campanha}
                    onChange={e => setManualForm({...manualForm, campanha: e.target.value})}
                    className="w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-4 py-2 border text-sm bg-white text-gray-900 placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
                  <input 
                    type="text" 
                    value={manualForm.template}
                    onChange={e => setManualForm({...manualForm, template: e.target.value})}
                    className="w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-4 py-2 border text-sm bg-white text-gray-900 placeholder-gray-400"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button 
                onClick={() => setShowManualModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button 
                onClick={handleManualSubmit}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-sm shadow-indigo-500/30"
              >
                Adicionar à Lista
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;