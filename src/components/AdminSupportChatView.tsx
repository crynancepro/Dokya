import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Send, 
  Paperclip, 
  Mic, 
  Square, 
  CheckCircle2, 
  Bot, 
  UserCheck, 
  AlertTriangle, 
  Clock, 
  X, 
  Loader2, 
  Maximize2,
  Trash2,
  RefreshCw,
  Phone,
  Mail,
  User,
  ShieldCheck,
  ArrowLeft
} from 'lucide-react';
import { SupportConversation, SupportMessage } from '../types';
import { 
  subscribeToActiveSupportConversations, 
  subscribeToSupportMessages, 
  sendSupportMessage, 
  resolveSupportTicket, 
  reactivateAiSupport,
  purgeOldSupportMessages,
  db
} from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { VoiceAudioPlayer } from './DokyaSupportChat';

interface AdminSupportChatViewProps {
  adminEmail: string;
}

export const AdminSupportChatView: React.FC<AdminSupportChatViewProps> = ({ adminEmail }) => {
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'urgent' | 'unread' | 'in_progress' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Active chat state
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

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  };

  // 1. Subscribe to all active conversations in real-time
  useEffect(() => {
    const unsub = subscribeToActiveSupportConversations((convList) => {
      setConversations(convList);
      
      // On desktop (>= 768px), auto-select first conversation if none selected
      // On mobile (< 768px), keep null so the admin lands on conversation list
      if (typeof window !== 'undefined' && window.innerWidth >= 768) {
        setSelectedConvId((prev) => {
          if (prev && convList.some((c) => c.id === prev)) return prev;
          const urgentFirst = convList.find((c) => c.urgent || c.unreadByAdmin);
          return urgentFirst ? urgentFirst.id : convList[0]?.id || null;
        });
      }
    });

    return () => unsub();
  }, []);

  // 2. Subscribe to messages of selected conversation
  useEffect(() => {
    if (!selectedConvId) {
      setMessages([]);
      return;
    }

    // Auto mark as read by admin when opening conversation
    const targetConv = conversations.find(c => c.id === selectedConvId);
    if (targetConv?.unreadByAdmin || targetConv?.unreadAdmin) {
      updateDoc(doc(db, 'support_chats', selectedConvId), {
        unreadByAdmin: false,
        unreadAdmin: false,
      }).catch((e) => console.warn('[Admin Chat] Mark read error:', e));
    }

    const unsub = subscribeToSupportMessages(selectedConvId, (msgs) => {
      setMessages(msgs);
      setTimeout(() => scrollToBottom('smooth'), 120);
    });

    return () => unsub();
  }, [selectedConvId]);

  const selectedConv = conversations.find((c) => c.id === selectedConvId) || null;

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    if (activeFilter === 'urgent' && !c.urgent && c.status !== 'HUMAN_REQUESTED') return false;
    if (activeFilter === 'unread' && !c.unreadByAdmin && !c.unreadAdmin) return false;
    if (activeFilter === 'in_progress' && c.status !== 'IN_PROGRESS') return false;
    if (activeFilter === 'resolved' && c.status !== 'RESOLVED') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (c.userName || '').toLowerCase().includes(q);
      const matchEmail = (c.userEmail || '').toLowerCase().includes(q);
      const matchMsg = (c.lastMessage || c.lastMessageText || '').toLowerCase().includes(q);
      return matchName || matchEmail || matchMsg;
    }
    return true;
  });

  const handleSelectConversation = async (convId: string) => {
    setSelectedConvId(convId);
    try {
      await updateDoc(doc(db, 'support_chats', convId), {
        unreadByAdmin: false,
        unreadAdmin: false,
      });
    } catch (err) {
      console.warn('Could not clear unreadByAdmin:', err);
    }
  };

  // Handle image upload
  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
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
        setSelectedImage(canvas.toDataURL('image/jpeg', 0.75));
      };
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          if (!selectedConvId || !selectedConv) return;
          try {
            setIsSending(true);
            await sendSupportMessage(
              selectedConvId,
              {
                senderId: adminEmail,
                senderRole: 'ADMIN',
                senderName: 'Support Dokya (Admin)',
                text: '🎙️ Message vocal du conseiller',
                mediaUrl: base64Audio,
                type: 'AUDIO',
                audioDuration: recordingSeconds || 5,
              },
              {
                userId: selectedConv.userId,
                userEmail: selectedConv.userEmail,
                userName: selectedConv.userName,
                status: 'IN_PROGRESS',
                unreadByAdmin: false,
                urgent: false,
              }
            );
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
      alert('Veuillez autoriser l\'accès au microphone pour enregistrer un message vocal.');
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

  // Send admin reply
  const handleSendAdminReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedConvId || !selectedConv) return;
    const text = inputText.trim();
    if (!text && !selectedImage) return;

    setIsSending(true);
    setInputText('');
    const imageToSend = selectedImage;
    setSelectedImage(null);

    try {
      const msgPayload: any = {
        senderId: adminEmail,
        senderRole: 'ADMIN',
        senderName: 'Support Dokya',
        text,
        type: imageToSend ? 'IMAGE' : 'TEXT',
      };
      if (imageToSend) {
        msgPayload.mediaUrl = imageToSend;
      }

      await sendSupportMessage(
        selectedConvId,
        msgPayload,
        {
          userId: selectedConv.userId,
          userEmail: selectedConv.userEmail,
          userName: selectedConv.userName,
          status: 'IN_PROGRESS', // Switch to IN_PROGRESS as admin has taken over
          unreadByAdmin: false,
          urgent: false, // Relayed, so no longer unhandled urgent
        }
      );
    } catch (err) {
      console.error('Admin reply failed:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedConvId) return;
    if (window.confirm('Voulez-vous marquer ce ticket de support comme résolu ?')) {
      await resolveSupportTicket(selectedConvId, 'l\'équipe Dokya Support');
    }
  };

  const handleReactivateAi = async () => {
    if (!selectedConvId) return;
    await reactivateAiSupport(selectedConvId);
  };

  const handlePurge = async () => {
    if (!selectedConvId) return;
    if (window.confirm('Supprimer les messages de plus de 24h de cette conversation ?')) {
      const count = await purgeOldSupportMessages(selectedConvId);
      alert(`${count} messages expirés purgés avec succès.`);
    }
  };

  const unreadCount = conversations.filter(c => c.unreadByAdmin || c.unreadAdmin).length;

  const formatMessageTime = (dateVal: any) => {
    if (!dateVal) return '';
    if (typeof dateVal?.toDate === 'function') {
      return dateVal.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-[calc(100dvh-130px)] md:h-[780px] max-h-[85vh]">
      
      {/* ========================================================================= */}
      {/* LEFT COLUMN: CONVERSATION LIST (VISIBLE ON MOBILE ONLY IF NO CHAT OPEN)  */}
      {/* ========================================================================= */}
      <div className={`w-full md:w-80 lg:w-96 border-r border-slate-800 flex-col bg-slate-900/95 shrink-0 ${
        selectedConvId ? 'hidden md:flex' : 'flex'
      }`}>
        
        {/* Header & Filter Tabs */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800 space-y-2.5 sm:space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-white text-sm sm:text-base flex items-center gap-2">
              <span>Support Client</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-violet-950 text-violet-300 border border-violet-800">
                {conversations.length}
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                  {unreadCount} non lu{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </h3>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher candidat ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-0.5">
            {[
              { id: 'all', label: 'Toutes' },
              { id: 'unread', label: '🔴 Non lus' },
              { id: 'urgent', label: '🚨 Urgent' },
              { id: 'in_progress', label: 'En cours' },
              { id: 'resolved', label: 'Résolues' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeFilter === tab.id
                    ? 'bg-violet-600 text-white shadow'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation List Scroll */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              Aucune conversation trouvée dans cette catégorie.
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = conv.id === selectedConvId;
              const isUrgent = conv.urgent || conv.status === 'HUMAN_REQUESTED';
              const isUnread = conv.unreadByAdmin || conv.unreadAdmin;

              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => handleSelectConversation(conv.id)}
                  className={`w-full text-left p-3.5 sm:p-4 transition-colors flex items-start gap-3 cursor-pointer relative ${
                    isSelected
                      ? 'bg-slate-800/95 border-l-4 border-violet-500'
                      : isUnread
                        ? 'bg-violet-950/20 hover:bg-slate-800/40'
                        : 'hover:bg-slate-800/40'
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-slate-700 to-slate-800 flex items-center justify-center font-black text-white text-sm border border-slate-700">
                      {conv.userName ? conv.userName[0].toUpperCase() : 'C'}
                    </div>
                    {isUrgent && (
                      <span className="w-3 h-3 rounded-full bg-rose-500 border-2 border-slate-900 absolute -top-1 -right-1 animate-ping" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <div className="flex items-center gap-1.5 truncate">
                        <h4 className={`text-xs sm:text-sm truncate ${isUnread ? 'font-black text-white' : 'font-bold text-slate-200'}`}>
                          {conv.userName || 'Candidat'}
                        </h4>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                        {formatMessageTime(conv.lastMessageAt)}
                      </span>
                    </div>

                    <p className={`text-[11px] truncate mb-1.5 ${isUnread ? 'font-semibold text-slate-200' : 'text-slate-400'}`}>
                      {conv.lastMessage || conv.lastMessageText || 'Pas de message'}
                    </p>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isUnread && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-extrabold text-[10px]">
                          Nouveau
                        </span>
                      )}
                      {isUrgent && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/50 text-rose-300 font-extrabold text-[10px] animate-pulse">
                          🚨 Relais Humain
                        </span>
                      )}
                      {conv.status === 'IN_PROGRESS' && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-semibold text-[10px]">
                          En cours
                        </span>
                      )}
                      {conv.status === 'RESOLVED' && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 font-semibold text-[10px]">
                          Résolu
                        </span>
                      )}
                      {(!conv.status || conv.status === 'AI_ASSISTED') && (
                        <span className="px-2 py-0.5 rounded-md bg-violet-950 text-violet-300 font-semibold text-[10px]">
                          IA Active
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

      </div>

      {/* ========================================================================= */}
      {/* RIGHT ZONE: DISCUSSION THREAD & ACTION TOOLBAR (FULLSCREEN ON MOBILE)     */}
      {/* ========================================================================= */}
      <div className={`flex-1 flex-col bg-[#0b141a] min-w-0 ${
        !selectedConvId ? 'hidden md:flex' : 'flex'
      }`}>
        {selectedConv ? (
          <>
            {/* Top Discussion Header */}
            <div className="bg-slate-900 border-b border-slate-800 p-3 sm:px-6 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                {/* Mobile Back Button (< 768px) */}
                <button
                  type="button"
                  onClick={() => setSelectedConvId(null)}
                  className="md:hidden p-2 -ml-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl flex items-center gap-1 font-black text-xs cursor-pointer transition-colors bg-slate-800/80 border border-slate-700 shrink-0"
                  title="Retour à la liste des discussions"
                >
                  <ArrowLeft className="w-4 h-4 text-violet-400" />
                  <span>Retour</span>
                </button>

                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-black text-white text-xs sm:text-sm shrink-0">
                  {selectedConv.userName ? selectedConv.userName[0].toUpperCase() : 'C'}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-white text-xs sm:text-base truncate">
                      {selectedConv.userName || 'Candidat'}
                    </h3>
                    {selectedConv.urgent && (
                      <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-rose-950 border border-rose-700 text-rose-300 text-[9px] sm:text-[10px] font-extrabold animate-pulse shrink-0">
                        Urgent
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-slate-400 truncate">
                    <span className="flex items-center gap-1 truncate">
                      <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="truncate">{selectedConv.userEmail || 'Sans email'}</span>
                    </span>
                    {selectedConv.userPhone && (
                      <span className="hidden sm:flex items-center gap-1 text-emerald-400 font-mono">
                        <Phone className="w-3 h-3" />
                        <span>{selectedConv.userPhone}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {selectedConv.status !== 'AI_ASSISTED' && (
                  <button
                    type="button"
                    onClick={handleReactivateAi}
                    className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-violet-950/70 hover:bg-violet-900 border border-violet-800 text-violet-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    title="Repasser la discussion à l'IA"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Activer IA</span>
                  </button>
                )}

                {selectedConv.status !== 'RESOLVED' ? (
                  <button
                    type="button"
                    onClick={handleResolve}
                    className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                    title="Marquer ce ticket comme résolu"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Résolu</span>
                  </button>
                ) : (
                  <span className="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-400 text-xs font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Résolu</span>
                  </span>
                )}

                <button
                  type="button"
                  onClick={handlePurge}
                  className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Purger les messages > 24h"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Conversation Messages Container */}
            <div 
              className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4 bg-[#0b141a] relative scrollbar-thin scrollbar-thumb-slate-800"
              style={{
                backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px)`,
                backgroundSize: '24px 24px'
              }}
            >
              {messages.map((msg) => {
                const isAdmin = msg.senderRole === 'ADMIN' || msg.senderType === 'agent';
                const isUser = msg.senderRole === 'USER' || msg.senderType === 'user';
                const isAi = msg.senderType === 'ai';
                const isSystem = msg.senderType === 'system';
                const isImg = msg.type === 'IMAGE' || msg.mediaType === 'image';
                const isAud = msg.type === 'AUDIO' || msg.mediaType === 'audio';

                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center my-3">
                      <div className="max-w-md px-4 py-1.5 rounded-2xl bg-amber-950/70 border border-amber-800/80 text-amber-200 text-xs font-semibold text-center">
                        {msg.text}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[88%] sm:max-w-[70%] rounded-2xl p-3 sm:p-3.5 shadow-md space-y-2 ${
                        isAdmin
                          ? 'bg-[#005c4b] text-white rounded-tr-none'
                          : isAi
                            ? 'bg-[#202c33] text-slate-200 rounded-tl-none border border-slate-700'
                            : 'bg-[#182229] text-slate-100 rounded-tl-none border border-slate-700/60'
                      }`}
                    >
                      {/* Sender Header */}
                      <div className="flex items-center gap-1.5 pb-1 border-b border-white/10 text-[11px] font-bold">
                        {isAdmin ? (
                          <span className="text-emerald-300 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Vous (Admin)</span>
                          </span>
                        ) : isAi ? (
                          <span className="text-violet-400 flex items-center gap-1">
                            <Bot className="w-3 h-3" />
                            <span>Dokya AI</span>
                          </span>
                        ) : (
                          <span className="text-sky-300 flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>{msg.senderName || 'Client'}</span>
                          </span>
                        )}
                      </div>

                      {/* Text */}
                      {msg.text && (
                        <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap select-text font-normal">
                          {msg.text}
                        </div>
                      )}

                      {/* Image Attachment */}
                      {msg.mediaUrl && isImg && (
                        <div className="relative group rounded-xl overflow-hidden cursor-pointer mt-1 max-w-[280px]">
                          <img
                            src={msg.mediaUrl}
                            alt="Capture reçue"
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

                      {/* Voice Note */}
                      {msg.mediaUrl && isAud && (
                        <VoiceAudioPlayer src={msg.mediaUrl} durationSec={msg.audioDuration} />
                      )}

                      {/* Timestamp */}
                      <div className="text-[10px] text-slate-400 text-right font-mono">
                        {formatMessageTime(msg.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })}

              <div ref={messagesEndRef} />
            </div>

            {/* Selected Image Preview */}
            {selectedImage && (
              <div className="bg-slate-900 p-2.5 px-4 border-t border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <img src={selectedImage} alt="Aperçu" className="w-12 h-12 rounded-lg object-cover border border-slate-700" />
                  <span className="text-xs text-slate-300">1 capture prête à être envoyée au client</span>
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

            {/* Admin Input Bar (Sticky at bottom) */}
            <div className="sticky bottom-0 z-20 bg-slate-900 border-t border-slate-800 p-2.5 sm:p-4 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {isRecording ? (
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
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-400 text-xs font-bold transition-colors cursor-pointer"
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
                <form onSubmit={handleSendAdminReply} className="flex items-center gap-1.5 sm:gap-2">
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
                    title="Envoyer une image ou capture"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={startRecording}
                    className="p-2.5 rounded-2xl text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Enregistrer un message vocal"
                  >
                    <Mic className="w-5 h-5" />
                  </button>

                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onFocus={() => setTimeout(() => scrollToBottom('smooth'), 200)}
                    placeholder="Répondre au client en tant que conseiller Dokya..."
                    className="flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500"
                  />

                  <button
                    type="submit"
                    disabled={isSending || (!inputText.trim() && !selectedImage)}
                    className="p-2.5 sm:p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-black shadow-lg shadow-emerald-600/30 transition-all cursor-pointer active:scale-95 shrink-0"
                    title="Envoyer"
                  >
                    {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </form>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-3">
            <Bot className="w-12 h-12 text-slate-600" />
            <h4 className="text-base font-bold text-slate-400">Aucune conversation sélectionnée</h4>
            <p className="text-xs max-w-sm">
              Sélectionnez une conversation dans la colonne de gauche pour lire les messages et répondre aux clients.
            </p>
          </div>
        )}
      </div>

      {/* Fullscreen Lightbox */}
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
