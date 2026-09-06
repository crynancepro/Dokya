import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Paperclip, 
  Mic, 
  Square, 
  Play, 
  Pause, 
  AlertTriangle, 
  CheckCheck, 
  Bot, 
  UserCheck, 
  Clock, 
  X, 
  Loader2, 
  Sparkles,
  ShieldAlert,
  HelpCircle,
  Maximize2
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { CandidateProfile, SupportMessage, SupportConversation } from '../types';
import { 
  getOrCreateConversationId, 
  subscribeToSupportConversation, 
  subscribeToSupportMessages, 
  sendSupportMessage, 
  requestHumanSupport,
  purgeOldSupportMessages
} from '../lib/firebase';
import { DokyaLogo } from './DokyaLogo';

interface DokyaSupportChatProps {
  user: FirebaseUser | null;
  userProfile?: CandidateProfile;
  className?: string;
}

// Audio Player Component with WhatsApp-style visual representation
export const VoiceAudioPlayer: React.FC<{ src: string; durationSec?: number }> = ({ src, durationSec = 0 }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(durationSec);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(Math.round(audio.duration));
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch((e) => console.warn('Audio play error:', e));
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 p-2 bg-black/20 rounded-2xl w-60 sm:w-64">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        type="button"
        onClick={togglePlay}
        className="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shrink-0 shadow transition-transform active:scale-90 cursor-pointer"
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-slate-950" /> : <Play className="w-4 h-4 fill-slate-950 ml-0.5" />}
      </button>

      <div className="flex-1 space-y-1">
        {/* Fake waveform bars */}
        <div className="flex items-center gap-0.5 h-4">
          {[40, 70, 30, 85, 50, 100, 60, 45, 90, 35, 75, 50, 65, 80, 40].map((height, idx) => {
            const barProgress = (idx / 15) * 100;
            const isFilled = barProgress <= progressPercent;
            return (
              <div
                key={idx}
                className={`w-1 rounded-full transition-colors ${
                  isFilled ? 'bg-emerald-400' : 'bg-slate-500/50'
                }`}
                style={{ height: `${height}%` }}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(totalDuration || durationSec)}</span>
        </div>
      </div>
    </div>
  );
};

export const DokyaSupportChat: React.FC<DokyaSupportChatProps> = ({
  user,
  userProfile,
  className = ''
}) => {
  const [conversation, setConversation] = useState<SupportConversation | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [previewModalImage, setPreviewModalImage] = useState<string | null>(null);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const userId = user?.uid || 'guest_user';
  const userName = userProfile?.personalInfo?.firstName 
    ? `${userProfile.personalInfo.firstName} ${userProfile.personalInfo.lastName || ''}`.trim()
    : user?.displayName || 'Candidat Dokya';
  const userEmail = user?.email || userProfile?.personalInfo?.email || '';
  const conversationId = getOrCreateConversationId(userId);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. Subscribe to conversation & messages
  useEffect(() => {
    const unsubConv = subscribeToSupportConversation(conversationId, (conv) => {
      setConversation(conv);
    });

    const unsubMsgs = subscribeToSupportMessages(conversationId, (msgs) => {
      setMessages(msgs);
      setTimeout(scrollToBottom, 100);
    });

    // Cleanup old messages (> 24h) silently in the background
    purgeOldSupportMessages(conversationId).catch(() => {});

    return () => {
      unsubConv();
      unsubMsgs();
    };
  }, [conversationId]);

  // Initial welcome message if conversation is empty
  useEffect(() => {
    if (messages.length === 0 && !conversation) {
      const sendInitialWelcome = async () => {
        try {
          await sendSupportMessage(
            conversationId,
            {
              senderId: 'ai',
              senderType: 'ai',
              senderName: 'Dokya AI Assistant',
              text: `Bonjour ${userName} ! 👋\n\nBienvenue sur le centre d'aide Dokya AI. Je suis votre assistant virtuel disponible 24h/24 pour répondre à vos questions sur les CV ATS, factures, abonnements VIP et paiements Wave/Orange Money.\n\n👉 Si vous avez besoin d'un agent de notre équipe, vous pouvez cliquer à tout moment sur « 🆘 Parler à un conseiller humain ».`,
            },
            {
              userId,
              userEmail,
              userName,
              status: 'AI_ASSISTED',
              urgent: false,
            }
          );
        } catch (_e) {}
      };
      sendInitialWelcome();
    }
  }, [messages.length, conversation, conversationId, userId, userEmail, userName]);

  // 2. Escalade vers conseiller humain
  const handleRequestHuman = async () => {
    try {
      await requestHumanSupport(conversationId, {
        uid: userId,
        displayName: userName,
        email: userEmail,
        phone: userProfile?.personalInfo?.phone || '',
      });
    } catch (err: any) {
      console.error('Failed to request human support:', err);
    }
  };

  // 3. Handle image selection & base64 compression
  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner un fichier image valide (JPG, PNG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        // Compress in canvas
        const canvas = document.createElement('canvas');
        const MAX_DIM = 900;
        let { width, height } = img;
        if (width > height && width > MAX_DIM) {
          height = (height * MAX_DIM) / width;
          width = MAX_DIM;
        } else if (height > MAX_DIM) {
          width = (width * MAX_DIM) / height;
          height = MAX_DIM;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.72);
        setSelectedImage(compressedBase64);
      };
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // 4. Handle Voice Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          // Send audio message
          try {
            setIsSending(true);
            await sendSupportMessage(
              conversationId,
              {
                senderId: userId,
                senderType: 'user',
                senderName: userName,
                text: '🎙️ Message vocal',
                mediaUrl: base64Audio,
                mediaType: 'audio',
                audioDuration: recordingSeconds || 5,
              },
              {
                userId,
                userEmail,
                userName,
                userPhone: userProfile?.personalInfo?.phone,
                unreadAdmin: true,
                status: conversation?.status || 'AI_ASSISTED',
              }
            );

            // If in AI mode, ask AI to acknowledge
            if (!conversation?.status || conversation.status === 'AI_ASSISTED') {
              triggerAiReply("J'ai bien reçu votre message vocal. Si vous souhaitez qu'un conseiller humain l'écoute en priorité, cliquez sur le bouton « 🆘 Parler à un conseiller humain ».");
            }
          } catch (err) {
            console.error('Audio send failed:', err);
          } finally {
            setIsSending(false);
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone access denied:', err);
      alert('Veuillez autoriser l\'accès au microphone dans votre navigateur pour enregistrer un message vocal.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      audioChunksRef.current = [];
    }
  };

  // 5. Trigger AI reply via Gemini backend
  const triggerAiReply = async (customDirectReply?: string) => {
    try {
      if (customDirectReply) {
        await sendSupportMessage(
          conversationId,
          {
            senderId: 'ai',
            senderType: 'ai',
            senderName: 'Dokya AI Assistant',
            text: customDirectReply,
          },
          {
            userId,
            userEmail,
            userName,
          }
        );
        return;
      }

      const recentHistory = messages.slice(-5).map((m) => ({
        role: m.senderType === 'user' ? ('user' as const) : ('assistant' as const),
        text: m.text,
      }));

      const res = await fetch('/api/support/ai-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputText,
          history: recentHistory,
          userName,
          userEmail,
        }),
      });

      const data = await res.json();
      if (data.success && data.reply) {
        await sendSupportMessage(
          conversationId,
          {
            senderId: 'ai',
            senderType: 'ai',
            senderName: 'Dokya AI Assistant',
            text: data.reply,
          },
          {
            userId,
            userEmail,
            userName,
          }
        );
      }
    } catch (err) {
      console.warn('AI reply generation failed:', err);
    }
  };

  // 6. Handle Send Text / Image
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const textToSend = inputText.trim();
    if (!textToSend && !selectedImage) return;

    setIsSending(true);
    setInputText('');
    const imageToSend = selectedImage;
    setSelectedImage(null);

    try {
      // Send user message
      const msgPayload: any = {
        senderId: userId,
        senderType: 'user',
        senderName: userName,
        text: textToSend,
      };
      if (imageToSend) {
        msgPayload.mediaUrl = imageToSend;
        msgPayload.mediaType = 'image';
      }

      await sendSupportMessage(
        conversationId,
        msgPayload,
        {
          userId,
          userEmail,
          userName,
          userPhone: userProfile?.personalInfo?.phone || '',
          unreadAdmin: true,
          status: conversation?.status || 'AI_ASSISTED',
        }
      );

      // If conversation is in AI mode (default), ask Gemini to respond!
      if (!conversation?.status || conversation.status === 'AI_ASSISTED') {
        if (textToSend) {
          await triggerAiReply();
        } else if (imageToSend) {
          await triggerAiReply("J'ai bien reçu votre capture d'écran ! Si elle concerne une confirmation de paiement Wave ou Orange Money, un conseiller peut également la valider directement si vous cliquez sur « 🆘 Parler à un conseiller humain ».");
        }
      }
    } catch (err) {
      console.error('Failed to send support message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInputText(prompt);
  };

  const formatMessageTime = (dateVal: any) => {
    if (!dateVal) return '';
    if (typeof dateVal?.toDate === 'function') {
      return dateVal.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isHumanRequested = conversation?.status === 'HUMAN_REQUESTED';
  const isInProgress = conversation?.status === 'IN_PROGRESS';
  const isResolved = conversation?.status === 'RESOLVED';

  return (
    <div className={`flex flex-col h-[calc(100dvh-130px)] sm:h-[750px] sm:max-h-[85vh] bg-slate-950 border border-slate-800/90 rounded-3xl overflow-hidden shadow-2xl relative ${className}`}>
      
      {/* ========================================================================= */}
      {/* HEADER : WHATSAPP-INSPIRED TOP BAR WITH ESCALATION BUTTON                */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border-b border-slate-800 p-3 sm:p-4 sm:px-6 flex flex-wrap items-center justify-between gap-3 shrink-0">
        
        {/* Left: Contact Info */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-md">
              <DokyaLogo size="sm" variant="icon" />
            </div>
            <span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900 absolute -bottom-0.5 -right-0.5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-white">Support & Assistance Dokya</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-950 text-violet-300 border border-violet-800/60">
                24h/7j
              </span>
            </div>

            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              {isHumanRequested ? (
                <span className="text-amber-400 font-semibold flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" />
                  <span>En attente de prise en charge humaine</span>
                </span>
              ) : isInProgress ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <UserCheck className="w-3 h-3" />
                  <span>Conseiller humain en ligne</span>
                </span>
              ) : isResolved ? (
                <span className="text-slate-400 flex items-center gap-1">
                  <CheckCheck className="w-3 h-3 text-emerald-400" />
                  <span>Ticket résolu</span>
                </span>
              ) : (
                <span className="text-violet-300 font-medium flex items-center gap-1">
                  <Bot className="w-3 h-3 text-violet-400" />
                  <span>Assistant IA Gemini actif</span>
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Right: Escalation CTA Button */}
        <div className="flex items-center gap-2">
          {!isHumanRequested && !isInProgress && (
            <button
              type="button"
              onClick={handleRequestHuman}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-lg shadow-rose-600/30 transition-all cursor-pointer active:scale-95 animate-pulse"
              title="Alerte immédiate transmise aux administrateurs"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>🆘 Parler à un conseiller humain</span>
            </button>
          )}

          {isHumanRequested && (
            <div className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Alerte admin transmise</span>
            </div>
          )}

          {isInProgress && (
            <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Relais humain actif</span>
            </div>
          )}
        </div>
      </div>

      {/* Auto-suppression / TTL Notice */}
      <div className="bg-slate-900/60 border-b border-slate-800/80 px-4 py-1.5 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
        <span className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-slate-500" />
          <span>Sécurité & Confidentialité : Les messages de ce tchat s'auto-suppriment après 24 heures.</span>
        </span>
        <span className="hidden sm:inline text-slate-500">ID: {conversationId.slice(0, 16)}...</span>
      </div>

      {/* ========================================================================= */}
      {/* CHAT THREAD (WHATSAPP-STYLE BUBBLES)                                      */}
      {/* ========================================================================= */}
      <div 
        className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4 relative bg-[#0b141a]/95 scrollbar-thin scrollbar-thumb-slate-800"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      >
        {messages.map((msg) => {
          const isUser = msg.senderRole === 'USER' || msg.senderType === 'user';
          const isAgent = msg.senderRole === 'ADMIN' || msg.senderType === 'agent';
          const isAi = msg.senderType === 'ai' || msg.senderId === 'ai';
          const isSystem = msg.senderType === 'system';
          const isImg = msg.type === 'IMAGE' || msg.mediaType === 'image';
          const isAud = msg.type === 'AUDIO' || msg.mediaType === 'audio';

          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center my-3">
                <div className="max-w-md px-4 py-2 rounded-2xl bg-amber-950/80 border border-amber-800/80 text-amber-200 text-xs font-semibold text-center shadow">
                  {msg.text}
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] sm:max-w-[70%] rounded-2xl p-3 sm:p-3.5 shadow-md relative space-y-2 ${
                  isUser
                    ? 'bg-[#005c4b] text-white rounded-tr-none'
                    : isAgent
                      ? 'bg-indigo-900/90 text-slate-100 border border-indigo-700/80 rounded-tl-none'
                      : 'bg-[#202c33] text-slate-200 rounded-tl-none'
                }`}
              >
                {/* Sender badge if not user */}
                {!isUser && (
                  <div className="flex items-center gap-1.5 pb-1 border-b border-white/10 text-[11px] font-bold">
                    {isAi ? (
                      <>
                        <Sparkles className="w-3 h-3 text-violet-400" />
                        <span className="text-violet-300">Dokya AI</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-300">{msg.senderName || 'Conseiller Dokya'}</span>
                      </>
                    )}
                  </div>
                )}

                {/* Text Message */}
                {msg.text && (
                  <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-normal select-text">
                    {msg.text}
                  </div>
                )}

                {/* Image attachment */}
                {msg.mediaUrl && isImg && (
                  <div className="relative group rounded-xl overflow-hidden cursor-pointer mt-1 max-w-[280px]">
                    <img
                      src={msg.mediaUrl}
                      alt="Capture envoyée"
                      className="w-full h-auto max-h-60 object-cover rounded-xl hover:opacity-90 transition-opacity"
                      onClick={() => setPreviewModalImage(msg.mediaUrl || null)}
                    />
                    <div 
                      onClick={() => setPreviewModalImage(msg.mediaUrl || null)}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                    >
                      <Maximize2 className="w-5 h-5" />
                    </div>
                  </div>
                )}

                {/* Voice Message */}
                {msg.mediaUrl && isAud && (
                  <VoiceAudioPlayer src={msg.mediaUrl} durationSec={msg.audioDuration} />
                )}

                {/* Timestamp & checkmarks */}
                <div className={`flex items-center gap-1 text-[10px] justify-end font-mono ${isUser ? 'text-emerald-200/80' : 'text-slate-400'}`}>
                  <span>
                    {formatMessageTime(msg.createdAt)}
                  </span>
                  {isUser && <CheckCheck className="w-3.5 h-3.5 text-sky-300" />}
                </div>
              </div>
            </div>
          );
        })}

        {isSending && (
          <div className="flex justify-start">
            <div className="px-4 py-2.5 rounded-2xl bg-[#202c33] text-slate-400 text-xs flex items-center gap-2 rounded-tl-none">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" />
              <span>Dokya réfléchit...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ========================================================================= */}
      {/* QUICK PROMPT CHIPS (FREQUENT QUESTIONS)                                    */}
      {/* ========================================================================= */}
      <div className="bg-slate-900/90 border-t border-slate-800 px-4 py-2 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-thin">
        <span className="text-[11px] text-slate-400 font-bold shrink-0 flex items-center gap-1">
          <HelpCircle className="w-3 h-3 text-slate-400" />
          <span>Suggestions :</span>
        </span>
        {[
          'Comment créer un CV ATS ?',
          'Avantages du Pass VIP ?',
          'Mon paiement Wave / Orange Money',
          'Comment retirer mes gains d\'affiliation ?',
        ].map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => handleQuickPrompt(q)}
            className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer shrink-0"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Selected Image Preview before sending */}
      {selectedImage && (
        <div className="bg-slate-900 p-2.5 px-4 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <img src={selectedImage} alt="Aperçu" className="w-12 h-12 rounded-lg object-cover border border-slate-700" />
            <span className="text-xs text-slate-300">1 capture d'écran prête à l'envoi</span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedImage(null)}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BOTTOM INPUT BAR (TEXT + AUDIO RECORDER + IMAGE PICKER)                   */}
      {/* ========================================================================= */}
      <div className="sticky bottom-0 z-20 bg-slate-900 border-t border-slate-800 p-2.5 sm:p-4 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {isRecording ? (
          /* Live Voice Recording Bar */
          <div className="flex items-center justify-between gap-3 bg-rose-950/70 border border-rose-800/80 rounded-2xl p-2.5 px-4 animate-pulse">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
              <span className="text-xs font-black text-rose-300">Enregistrement audio en cours...</span>
              <span className="text-xs font-mono text-white font-bold">
                {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, '0')}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelRecording}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-900/40 text-xs font-bold transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={stopRecording}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/30 cursor-pointer"
              >
                <Square className="w-3 h-3 fill-white" />
                <span>Envoyer</span>
              </button>
            </div>
          </div>
        ) : (
          /* Standard Input Bar */
          <form onSubmit={handleSendMessage} className="flex items-center gap-1.5 sm:gap-2">
            
            {/* Attachment Button */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleImagePick}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-2xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Ajouter une capture d'écran"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* Microphone / Voice note Button */}
            <button
              type="button"
              onClick={startRecording}
              className="p-2.5 rounded-2xl text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Enregistrer un message vocal"
            >
              <Mic className="w-5 h-5" />
            </button>

            {/* Text Input */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onFocus={() => setTimeout(() => scrollToBottom('smooth'), 200)}
              placeholder="Posez votre question ou décrivez votre demande..."
              className="flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={isSending || (!inputText.trim() && !selectedImage)}
              className="p-2.5 sm:p-3 rounded-2xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white shadow-lg shadow-violet-600/30 transition-all cursor-pointer active:scale-95 shrink-0"
              title="Envoyer le message"
            >
              {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </form>
        )}
      </div>

      {/* Fullscreen Image Lightbox Modal */}
      {previewModalImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewModalImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <img src={previewModalImage} alt="Zoom" className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl" />
            <button
              type="button"
              onClick={() => setPreviewModalImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-900/80 text-white hover:bg-slate-800"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
