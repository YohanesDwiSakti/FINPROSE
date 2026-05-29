import React, { useEffect, useRef, useState } from 'react';
import {
  Camera, CameraOff, Mic, MicOff, PhoneOff, Share2,
  MessageSquare, Maximize, Circle, FileText, Download,
  X, MoreHorizontal, ShieldCheck
} from 'lucide-react';
import { Lawyer } from '../types';
import { ActionModal } from './ActionModal';
import { fetchCallSignals, getStoredUser, sendCallSignal, type CallSignalRow } from '../api';

type CallState = 'idle' | 'starting' | 'waiting' | 'connected' | 'ended' | 'error' | 'unavailable';

export const MeetingPage = ({
  lawyer,
  consultationId,
  currentUserRole = 'client',
  localParticipantName,
  remoteParticipantName,
  remoteParticipantSubtitle,
  remoteParticipantImage,
  onEndCall,
  isVoiceOnly = false
}: {
  lawyer: Lawyer,
  consultationId?: string,
  currentUserRole?: 'client' | 'lawyer',
  localParticipantName?: string,
  remoteParticipantName?: string,
  remoteParticipantSubtitle?: string,
  remoteParticipantImage?: string,
  onEndCall: () => void,
  isVoiceOnly?: boolean
}) => {
  const storedUser = getStoredUser();
  const localName = localParticipantName || storedUser?.name || 'Anda';
  const remoteName = remoteParticipantName || lawyer.name;
  const remoteSubtitle = remoteParticipantSubtitle || (currentUserRole === 'lawyer' ? 'Customer' : lawyer.specialty);
  const remoteImage = remoteParticipantImage || (currentUserRole === 'lawyer' ? '' : lawyer.image);
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(!isVoiceOnly);
  const [isRecording, setIsRecording] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [callState, setCallState] = useState<CallState>('idle');
  const [callMessage, setCallMessage] = useState('Menyiapkan kamera dan mikrofon...');
  const [modal, setModal] = useState<{ title: string; description: string } | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const onEndCallRef = useRef(onEndCall);
  const processedSignalsRef = useRef<Set<string>>(new Set());
  const queuedCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const hasCreatedOfferRef = useRef(false);
  const pollRef = useRef<number | null>(null);
  const signalSinceRef = useRef(new Date(Date.now() - 120000).toISOString());
  const peerIdRef = useRef(
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `peer-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );

  useEffect(() => {
    onEndCallRef.current = onEndCall;
  }, [onEndCall]);

  useEffect(() => {
    const localStream = localStreamRef.current;
    localStream?.getAudioTracks().forEach(track => {
      track.enabled = micOn;
    });
  }, [micOn]);

  useEffect(() => {
    const localStream = localStreamRef.current;
    localStream?.getVideoTracks().forEach(track => {
      track.enabled = videoOn && !isVoiceOnly;
    });
  }, [videoOn, isVoiceOnly]);

  useEffect(() => {
    let active = true;
    const user = getStoredUser();

    const emitSignal = async (signalType: CallSignalRow['signal_type'], payload: any) => {
      if (!consultationId || !user?.id) return;
      await sendCallSignal({
        consultationId,
        senderId: user.id,
        senderRole: currentUserRole,
        signalType,
        payload: {
          ...(payload || {}),
          peerId: peerIdRef.current
        }
      }).catch(() => null);
    };

    const flushQueuedCandidates = async () => {
      const peer = peerRef.current;
      if (!peer?.remoteDescription) return;

      const queued = [...queuedCandidatesRef.current];
      queuedCandidatesRef.current = [];
      for (const candidate of queued) {
        await peer.addIceCandidate(candidate).catch(() => null);
      }
    };

    const processSignal = async (signal: CallSignalRow) => {
      if (!active || !peerRef.current) return;
      if (processedSignalsRef.current.has(signal.id)) return;
      processedSignalsRef.current.add(signal.id);
      if (signal.payload?.peerId === peerIdRef.current) return;

      const peer = peerRef.current;
      const { peerId: _peerId, ...signalPayload } = signal.payload || {};
      if (signal.signal_type === 'offer') {
        await peer.setRemoteDescription(new RTCSessionDescription(signalPayload));
        await flushQueuedCandidates();
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        await emitSignal('answer', answer);
        setCallMessage('Menjawab panggilan konsultasi...');
        return;
      }

      if (signal.signal_type === 'answer') {
        if (peer.signalingState === 'have-local-offer') {
          await peer.setRemoteDescription(new RTCSessionDescription(signalPayload));
          await flushQueuedCandidates();
        }
        return;
      }

      if (signal.signal_type === 'candidate') {
        const candidate = signalPayload as RTCIceCandidateInit;
        if (peer.remoteDescription) {
          await peer.addIceCandidate(candidate).catch(() => null);
        } else {
          queuedCandidatesRef.current.push(candidate);
        }
        return;
      }

      if (signal.signal_type === 'leave') {
        setCallState('ended');
        setCallMessage('Lawan bicara keluar dari panggilan.');
        window.setTimeout(() => onEndCallRef.current(), 250);
      }
    };

    const startWebRtc = async () => {
      if (!consultationId) {
        setCallState('unavailable');
        setCallMessage('Buka panggilan dari chat konsultasi aktif agar realtime berjalan.');
        return;
      }

      if (!user?.id) {
        setCallState('error');
        setCallMessage('User belum login, panggilan tidak bisa dimulai.');
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setCallState('error');
        setCallMessage('Browser belum mendukung kamera/mikrofon realtime.');
        return;
      }

      setCallState('starting');
      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVoiceOnly ? false : { width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      if (!active) {
        localStream.getTracks().forEach(track => track.stop());
        return;
      }

      localStream.getAudioTracks().forEach(track => { track.enabled = micOn; });
      localStream.getVideoTracks().forEach(track => { track.enabled = videoOn && !isVoiceOnly; });
      localStreamRef.current = localStream;
      if (localVideoRef.current) localVideoRef.current.srcObject = localStream;

      const remoteStream = new MediaStream();
      remoteStreamRef.current = remoteStream;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;

      const peer = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      });
      peerRef.current = peer;

      localStream.getTracks().forEach(track => peer.addTrack(track, localStream));
      peer.ontrack = (event) => {
        event.streams[0]?.getTracks().forEach(track => {
          if (!remoteStream.getTracks().some(existing => existing.id === track.id)) {
            remoteStream.addTrack(track);
          }
        });
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
      };
      peer.onicecandidate = (event) => {
        if (event.candidate) emitSignal('candidate', event.candidate.toJSON());
      };
      peer.onconnectionstatechange = () => {
        if (peer.connectionState === 'connected') {
          setCallState('connected');
          setCallMessage('Terhubung realtime.');
        } else if (peer.connectionState === 'failed') {
          setCallState('error');
          setCallMessage('Koneksi panggilan gagal. Coba tutup lalu masuk lagi dari chat.');
        } else if (peer.connectionState === 'disconnected') {
          setCallMessage('Koneksi lawan bicara terputus sementara...');
        }
      };

      setCallState('waiting');
      setCallMessage(currentUserRole === 'client' ? 'Memanggil advokat...' : 'Menunggu panggilan dari customer...');

      const pollSignals = async () => {
        const signals = await fetchCallSignals(consultationId, signalSinceRef.current).catch(() => []);
        for (const signal of signals) {
          await processSignal(signal);
        }
      };

      await pollSignals();
      pollRef.current = window.setInterval(pollSignals, 1500);

      if (currentUserRole === 'client' && !hasCreatedOfferRef.current) {
        hasCreatedOfferRef.current = true;
        const offer = await peer.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: !isVoiceOnly });
        await peer.setLocalDescription(offer);
        await emitSignal('offer', offer);
      }
    };

    startWebRtc().catch(error => {
      setCallState('error');
      setCallMessage(error instanceof Error ? error.message : 'Kamera atau mikrofon gagal dibuka.');
    });

    return () => {
      active = false;
      if (pollRef.current) window.clearInterval(pollRef.current);
      emitSignal('leave', { reason: 'ended' });
      peerRef.current?.close();
      peerRef.current = null;
      localStreamRef.current?.getTracks().forEach(track => track.stop());
      remoteStreamRef.current?.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
      remoteStreamRef.current = null;
    };
  }, [consultationId, currentUserRole, isVoiceOnly]);

  const statusColor = callState === 'connected' ? 'bg-green-500' : callState === 'error' ? 'bg-red-500' : 'bg-amber-400';

  return (
    <div className="h-screen bg-[#0A0A0A] text-white flex flex-col overflow-hidden font-sans">
      {modal && <ActionModal title={modal.title} description={modal.description} onClose={() => setModal(null)} />}
      <header className="px-6 py-4 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent z-20">
        <div className="flex items-center space-x-4">
          <div className="bg-brand-black/40 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 flex items-center space-x-3">
            <ShieldCheck className="w-4 h-4 text-green-500" />
            <span className="text-xs font-bold uppercase tracking-widest">FINPROSE Realtime Call</span>
          </div>
          {isRecording && (
            <div className="flex items-center space-x-2 bg-red-500 px-3 py-1.5 rounded-lg animate-pulse">
              <Circle className="w-2 h-2 fill-current" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Recording</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 flex items-center space-x-3">
            <div className={`w-2 h-2 rounded-full ${statusColor}`}></div>
            <span className="text-xs font-bold uppercase tracking-widest">{callState === 'connected' ? 'Terhubung' : 'Menghubungkan'}</span>
          </div>
          <button onClick={() => document.documentElement.requestFullscreen?.()} className="p-2 hover:bg-white/10 rounded-full transition-colors" title="Layar penuh">
            <Maximize className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 relative flex items-center justify-center p-4">
        <div className="w-full h-full max-w-6xl flex gap-4">
          <div className="flex-1 relative rounded-[40px] overflow-hidden bg-zinc-900 shadow-2xl border border-white/5">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover ${isVoiceOnly ? 'hidden' : ''}`}
            />
            {(callState !== 'connected' || isVoiceOnly) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center space-y-6 bg-zinc-900">
                {remoteImage ? (
                  <img src={remoteImage} className="w-40 h-40 rounded-full object-cover grayscale border-8 border-white/5" alt={remoteName} />
                ) : (
                  <div className="w-40 h-40 rounded-full border-8 border-white/5 bg-white text-brand-black flex items-center justify-center text-5xl font-bold">
                    {remoteName[0] || 'K'}
                  </div>
                )}
                <div className="text-center max-w-sm px-6">
                  <h2 className="text-2xl font-bold font-display">{remoteName}</h2>
                  <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs mt-2">{remoteSubtitle}</p>
                  <p className="mt-5 text-xs font-bold uppercase tracking-widest text-zinc-400">{callMessage}</p>
                </div>
              </div>
            )}

            <div className="absolute bottom-8 left-8 bg-black/40 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10">
              <h3 className="font-bold text-sm flex items-center space-x-2">
                <span>{remoteName}</span>
                <div className={`w-1.5 h-1.5 rounded-full ${statusColor}`}></div>
              </h3>
            </div>
          </div>

          <div className="absolute top-8 right-8 w-64 aspect-video rounded-3xl overflow-hidden bg-zinc-800 border-2 border-white/10 shadow-2xl z-10">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover scale-x-[-1] ${videoOn && !isVoiceOnly ? '' : 'hidden'}`}
            />
            {(!videoOn || isVoiceOnly) && (
              <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900">
                <div className="w-14 h-14 rounded-2xl bg-white text-brand-black flex items-center justify-center text-xl font-bold">
                  {localName[0] || 'A'}
                </div>
                <p className="mt-3 text-[9px] font-bold uppercase tracking-widest text-zinc-500">Kamera mati</p>
              </div>
            )}
            <div className="absolute top-4 right-4 p-1.5 bg-black/40 rounded-lg">
              {micOn ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3 text-red-500" />}
            </div>
            <div className="absolute bottom-4 left-4 text-[10px] font-bold uppercase tracking-widest">{localName}</div>
          </div>
        </div>

        {(showChat || showDocs) && (
          <div className="w-96 h-full bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-[40px] ml-4 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-10">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-bold uppercase tracking-widest text-xs">{showDocs ? 'Shared Documents' : 'Quick Chat'}</h3>
              <button onClick={() => { setShowChat(false); setShowDocs(false); }} className="hover:text-zinc-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {showDocs ? (
                <div className="space-y-3">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center space-x-4">
                    <FileText className="w-8 h-8 text-zinc-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">Dokumen konsultasi</p>
                      <p className="text-[10px] text-zinc-500">Terhubung ke vault kasus</p>
                    </div>
                    <button onClick={() => setModal({ title: 'Dokumen', description: 'Dokumen kasus dibuka dari vault konsultasi terkait.' })} className="p-2 hover:bg-white/10 rounded-full">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-white/5 p-3 rounded-2xl rounded-tl-none">
                    <p className="text-sm">Gunakan chat utama untuk pesan permanen selama konsultasi.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="p-8 pb-12 flex items-center justify-center relative z-20">
        <div className="bg-zinc-900/80 backdrop-blur-2xl px-10 py-6 rounded-[32px] border border-white/10 flex items-center space-x-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <div className="flex items-center space-x-4 border-r border-white/5 pr-8">
            <button
              onClick={() => setMicOn(!micOn)}
              className={`p-4 rounded-2xl transition-all ${micOn ? 'hover:bg-white/10' : 'bg-red-500 text-white'}`}
              title={micOn ? 'Matikan mikrofon' : 'Nyalakan mikrofon'}
            >
              {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
            {!isVoiceOnly && (
              <button
                onClick={() => setVideoOn(!videoOn)}
                className={`p-4 rounded-2xl transition-all ${videoOn ? 'hover:bg-white/10' : 'bg-red-500 text-white'}`}
                title={videoOn ? 'Matikan kamera' : 'Nyalakan kamera'}
              >
                {videoOn ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowChat(!showChat)}
              className={`p-4 rounded-2xl transition-all ${showChat ? 'bg-white text-brand-black' : 'hover:bg-white/10 text-zinc-400'}`}
              title="Chat singkat"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowDocs(!showDocs)}
              className={`p-4 rounded-2xl transition-all ${showDocs ? 'bg-white text-brand-black' : 'hover:bg-white/10 text-zinc-400'}`}
              title="Dokumen"
            >
              <FileText className="w-5 h-5" />
            </button>
            <button onClick={() => setModal({ title: 'Bagikan Layar', description: 'Share screen akan dibuat setelah panggilan dasar stabil di production.' })} className="p-4 rounded-2xl hover:bg-white/10 transition-all text-zinc-400" title="Bagikan layar">
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsRecording(!isRecording)}
              className={`p-4 rounded-2xl transition-all ${isRecording ? 'text-red-500' : 'hover:bg-white/10 text-zinc-400'}`}
              title="Rekam"
            >
              <Circle className={`w-5 h-5 ${isRecording ? 'fill-current' : ''}`} />
            </button>
            <button onClick={() => setModal({ title: 'Status Panggilan', description: callMessage })} className="p-4 rounded-2xl hover:bg-white/10 transition-all text-zinc-400" title="Status">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>

          <div className="pl-8 border-l border-white/5">
            <button
              onClick={onEndCall}
              className="bg-red-500 hover:bg-red-600 px-8 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all shadow-xl shadow-red-500/20 flex items-center space-x-2"
            >
              <PhoneOff className="w-4 h-4" />
              <span>Akhiri</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
