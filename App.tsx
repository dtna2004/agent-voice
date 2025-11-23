import React, { useState, useRef, useEffect, useCallback } from 'react';
import { transcribeAudio, editImage } from './services/gemini';
import { VoiceControl } from './components/VoiceControl';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ChatMessage, AppStatus, ImageState } from './types';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [imageState, setImageState] = useState<ImageState | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [textInput, setTextInput] = useState('');
  
  // Ref for auto-scrolling chat
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const addMessage = (role: 'user' | 'assistant' | 'system', text: string, imageUrl?: string) => {
    setChatHistory(prev => [
      ...prev,
      {
        id: Date.now().toString() + Math.random().toString(),
        role,
        text,
        timestamp: Date.now(),
        imageUrl
      }
    ]);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setImageState({
          original: base64,
          current: base64,
          history: [base64],
          historyIndex: 0
        });
        addMessage('system', 'Tải ảnh thành công. Hãy ra lệnh sửa ảnh bằng Tiếng Việt!');
      };
      reader.readAsDataURL(file);
    }
  };

  const executeEdit = async (prompt: string) => {
    if (!imageState) return;

    setStatus(AppStatus.EDITING);
    addMessage('assistant', `Đang xử lý yêu cầu...`);

    try {
      const newImageBase64 = await editImage(imageState.current, prompt);
      
      setImageState(prev => {
        if (!prev) return null;
        const newHistory = [...prev.history.slice(0, prev.historyIndex + 1), newImageBase64];
        return {
          ...prev,
          current: newImageBase64,
          history: newHistory,
          historyIndex: newHistory.length - 1
        };
      });

      addMessage('assistant', 'Đây là ảnh đã chỉnh sửa.', newImageBase64);
      setStatus(AppStatus.IDLE);
    } catch (error) {
      console.error(error);
      addMessage('system', 'Xin lỗi, đã xảy ra lỗi khi chỉnh sửa ảnh.');
      setStatus(AppStatus.ERROR);
      // Reset status after a delay so user can try again
      setTimeout(() => setStatus(AppStatus.IDLE), 3000);
    }
  };

  const handleAudioCaptured = async (audioBlob: Blob) => {
    if (!imageState) {
        addMessage('system', 'Vui lòng tải ảnh lên trước.');
        return;
    }

    setStatus(AppStatus.TRANSCRIBING);
    try {
      const transcript = await transcribeAudio(audioBlob);
      if (!transcript.trim()) {
        addMessage('system', 'Tôi không nghe rõ. Vui lòng nói lại.');
        setStatus(AppStatus.IDLE);
        return;
      }

      addMessage('user', transcript); // Display the interpreted command
      await executeEdit(transcript);
    } catch (error) {
      console.error(error);
      addMessage('system', 'Lỗi xử lý âm thanh.');
      setStatus(AppStatus.IDLE);
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || !imageState) return;
    
    const prompt = textInput;
    setTextInput('');
    addMessage('user', prompt);
    executeEdit(prompt);
  };

  const handleUndo = () => {
    if (!imageState || imageState.historyIndex <= 0) return;
    setImageState(prev => {
      if (!prev) return null;
      const newIndex = prev.historyIndex - 1;
      return {
        ...prev,
        current: prev.history[newIndex],
        historyIndex: newIndex
      };
    });
  };

  const handleRedo = () => {
    if (!imageState || imageState.historyIndex >= imageState.history.length - 1) return;
    setImageState(prev => {
      if (!prev) return null;
      const newIndex = prev.historyIndex + 1;
      return {
        ...prev,
        current: prev.history[newIndex],
        historyIndex: newIndex
      };
    });
  };

  const handleDownload = () => {
    if (!imageState) return;
    const link = document.createElement('a');
    link.href = imageState.current;
    link.download = `pixelvoice-edit-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-900 text-slate-100">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
              <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
            PixelVoice Agent (VN)
          </h1>
        </div>
        
        {imageState && (
          <div className="flex items-center gap-2">
            <button 
              onClick={handleUndo} 
              disabled={imageState.historyIndex <= 0}
              className="p-2 rounded hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Hoàn tác"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              </svg>
            </button>
            <button 
              onClick={handleRedo} 
              disabled={imageState.historyIndex >= imageState.history.length - 1}
              className="p-2 rounded hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Làm lại"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
              </svg>
            </button>
            <div className="h-6 w-px bg-slate-700 mx-1"></div>
            <button 
              onClick={handleDownload}
              className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-md text-sm transition-colors"
            >
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Lưu
            </button>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Left: Canvas/Image Area */}
        <div className="flex-1 bg-slate-950 flex items-center justify-center p-8 relative">
          {!imageState ? (
            <div className="text-center p-10 border-2 border-dashed border-slate-700 rounded-xl bg-slate-900/50">
              <div className="mb-4 flex justify-center">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-slate-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25H3.75A2.25 2.25 0 001.5 6v12a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2 text-slate-300">Bắt đầu bằng cách tải ảnh lên</h2>
              <p className="text-slate-500 mb-6 max-w-sm mx-auto">Tải ảnh lên và ra lệnh chỉnh sửa bằng giọng nói tiếng Việt.</p>
              <label className="cursor-pointer bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-6 rounded-full transition-colors inline-block">
                Tải Ảnh Lên
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              <img 
                src={imageState.current} 
                alt="Editing Canvas" 
                className="max-w-full max-h-full object-contain shadow-2xl rounded-lg border border-slate-800"
              />
              {status === AppStatus.EDITING && (
                 <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg">
                    <LoadingSpinner />
                    <p className="mt-4 text-blue-300 font-medium tracking-wide">AI ĐANG SỬA ẢNH...</p>
                 </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Sidebar / Chat */}
        <div className="w-80 md:w-96 bg-slate-900 border-l border-slate-800 flex flex-col shadow-xl z-20">
          <div className="p-4 border-b border-slate-800 bg-slate-800/50">
            <h3 className="font-semibold text-slate-300 text-sm uppercase tracking-wider">Nhật ký lệnh</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatHistory.length === 0 && (
              <div className="text-center mt-10 opacity-40">
                <p className="text-sm">Các lệnh sẽ xuất hiện ở đây.</p>
              </div>
            )}
            {chatHistory.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div 
                  className={`
                    max-w-[90%] px-4 py-3 rounded-2xl text-sm leading-relaxed
                    ${msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-br-none' 
                      : msg.role === 'system' 
                        ? 'bg-slate-800 text-slate-400 text-xs italic border border-slate-700' 
                        : 'bg-slate-700 text-slate-200 rounded-bl-none'}
                  `}
                >
                  {msg.text}
                </div>
                <span className="text-[10px] text-slate-500 mt-1 px-1">
                  {msg.role === 'user' ? 'Bạn' : 'Agent'}
                </span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Controls Footer */}
          <div className="p-4 bg-slate-800 border-t border-slate-700">
            {status === AppStatus.TRANSCRIBING && (
              <div className="flex items-center justify-center gap-2 mb-3 text-xs text-blue-400 animate-pulse">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                Đang nghe (Tiếng Việt)...
              </div>
            )}
            
            <div className="flex flex-col gap-3">
              <form onSubmit={handleTextSubmit} className="relative">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Nhập hoặc nói bằng Tiếng Việt..."
                  disabled={!imageState || status !== AppStatus.IDLE}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-4 pr-10 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all disabled:opacity-50"
                />
                <button 
                  type="submit"
                  disabled={!textInput.trim() || status !== AppStatus.IDLE}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-blue-500 hover:text-blue-400 disabled:text-slate-600 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
                  </svg>
                </button>
              </form>
              
              <div className="flex items-center justify-between gap-4">
                 <p className="text-xs text-slate-500 flex-1">
                   Giữ mic để nói
                 </p>
                 <VoiceControl 
                   onAudioCaptured={handleAudioCaptured} 
                   disabled={!imageState || status !== AppStatus.IDLE} 
                 />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;