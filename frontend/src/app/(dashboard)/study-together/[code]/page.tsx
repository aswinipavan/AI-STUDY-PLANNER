'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  useStudyRoom,
  useStudyRoomMessages,
  useLeaveStudyRoom,
  useEndStudyRoom,
  useSendStudyRoomMessage,
} from '@/hooks/useStudyRoom';
import { useAuthStore } from '@/stores/authStore';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Clock,
  Send, Sparkles, MessageSquare, Users, Crown, Copy, Check,
  AlertCircle
} from 'lucide-react';
import styles from './studyRoom.module.css';

export default function StudyRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = String(params?.code || '');
  const currentUser = useAuthStore((s) => s.user);

  const { data: room, isLoading: loadingRoom, error: roomError } = useStudyRoom(roomCode);
  const { data: messages } = useStudyRoomMessages(roomCode);
  const leaveMutation = useLeaveStudyRoom();
  const endMutation = useEndStudyRoom();
  const sendMessageMutation = useSendStudyRoomMessage();

  const [activeTab, setActiveTab] = useState<'chat' | 'participants'>('chat');
  const [chatInput, setChatInput] = useState('');
  const [copied, setCopied] = useState(false);

  // Local media stream state
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Local timer state synced with room.secondsRemaining
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  useEffect(() => {
    if (room?.secondsRemaining !== undefined) {
      setSecondsRemaining(room.secondsRemaining);
    }
  }, [room?.secondsRemaining]);

  useEffect(() => {
    if (secondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsRemaining]);

  // Request local camera and microphone stream
  useEffect(() => {
    let active = true;

    async function initMedia() {
      try {
        if (navigator?.mediaDevices?.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
          if (!active) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        }
      } catch (err) {
        console.warn('Camera/Mic permission not granted or unavailable:', err);
        setCameraEnabled(false);
        setMicEnabled(false);
      }
    }

    initMedia();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const toggleMic = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = !micEnabled;
      });
    }
    setMicEnabled(!micEnabled);
  };

  const toggleCamera = () => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((t) => {
        t.enabled = !cameraEnabled;
      });
    }
    setCameraEnabled(!cameraEnabled);
  };

  const handleCopyCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeaveRoom = async () => {
    try {
      await leaveMutation.mutateAsync(roomCode);
    } catch {
      // ignore
    } finally {
      router.push('/study-together');
    }
  };

  const handleEndRoom = async () => {
    if (!confirm('Are you sure you want to end this study session for all participants?')) return;
    try {
      await endMutation.mutateAsync(roomCode);
    } catch {
      // ignore
    } finally {
      router.push('/study-together');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const text = chatInput.trim();
    setChatInput('');

    try {
      await sendMessageMutation.mutateAsync({
        code: roomCode,
        message: text,
        isAi: text.startsWith('@ai') || text.toLowerCase().startsWith('ask ai'),
      });
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleAskAi = () => {
    setChatInput('@ai ');
  };

  const formatTimer = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isOwner = room?.ownerId === currentUser?.id;

  if (loadingRoom) {
    return (
      <div className={styles.roomContainer} style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <Clock size={32} color="#00e5c0" className="animate-spin" />
          <p>Connecting to study room {roomCode}...</p>
        </div>
      </div>
    );
  }

  if (roomError || !room) {
    return (
      <div className={styles.roomContainer} style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <AlertCircle size={40} color="#ef4444" style={{ margin: '0 auto 1rem auto' }} />
          <h2>Study Room Not Found</h2>
          <p style={{ color: 'var(--color-muted-foreground)', margin: '0.5rem 0 1.5rem 0' }}>
            The room code may be invalid or the session has ended.
          </p>
          <button onClick={() => router.push('/study-together')} className={styles.btnLeave}>
            Back to Study Together
          </button>
        </div>
      </div>
    );
  }

  // Filter peers excluding local user
  const peers = room.participants.filter((p) => p.studentId !== currentUser?.id);

  return (
    <div className={styles.roomContainer}>
      {/* Top Header Bar */}
      <div className={styles.topBar}>
        <div className={styles.roomInfoLeft}>
          <div className={styles.codePill} onClick={handleCopyCode} title="Click to copy room code">
            <span>{room.roomCode}</span>
            {copied ? <Check size={14} color="#00e5c0" /> : <Copy size={14} />}
          </div>
          <div>
            <h2 className={styles.roomTitle}>{room.subjectName}</h2>
            <p className={styles.roomTopic}>{room.topic}</p>
          </div>
        </div>

        {/* Synchronized Live Timer */}
        <div className={styles.timerDisplay}>
          <Clock size={16} color="#00e5c0" />
          <span className={styles.timerDigits}>{formatTimer(secondsRemaining)}</span>
        </div>

        {/* Actions */}
        <div className={styles.topBarActions}>
          <button onClick={handleLeaveRoom} className={styles.btnLeave} id="btn-leave-room">
            <PhoneOff size={14} />
            Leave
          </button>
          {isOwner && (
            <button onClick={handleEndRoom} className={styles.btnEndSession} id="btn-end-room">
              End Session
            </button>
          )}
        </div>
      </div>

      {/* Main Collaborative Stage */}
      <div className={styles.mainLayout}>
        {/* Left Side: Video Grid & Controls */}
        <div className={styles.leftWorkspace}>
          <div className={styles.videoStage}>
            <div className={styles.videoGrid}>
              {/* Local User Tile */}
              <div className={styles.videoCard}>
                {cameraEnabled ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={styles.videoElement}
                  />
                ) : (
                  <div className={styles.avatarFallback}>
                    <div className={styles.avatarCircle}>
                      {(currentUser?.name || 'You').charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--color-muted-foreground)' }}>
                      Camera Off
                    </span>
                  </div>
                )}
                <div className={styles.participantNameTag}>
                  <span>You {isOwner && '(Host)'}</span>
                  {!micEnabled && <MicOff size={12} color="#f87171" />}
                </div>
              </div>

              {/* Peer Participants Tiles */}
              {peers.map((peer) => (
                <div key={peer.id} className={styles.videoCard}>
                  <div className={styles.avatarFallback}>
                    <div className={styles.avatarCircle} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>
                      {peer.studentName.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--color-muted-foreground)' }}>
                      Connected
                    </span>
                  </div>
                  <div className={styles.participantNameTag}>
                    <span>{peer.studentName}</span>
                    {peer.isOwner && <Crown size={12} color="#fbbf24" />}
                  </div>
                </div>
              ))}
            </div>

            {/* Media Controls Bar */}
            <div className={styles.mediaControlsBar}>
              <button
                onClick={toggleMic}
                className={`${styles.mediaBtn} ${!micEnabled ? styles.mediaBtnActive : ''}`}
                title={micEnabled ? 'Mute Mic' : 'Unmute Mic'}
                id="btn-toggle-mic"
              >
                {micEnabled ? <Mic size={18} /> : <MicOff size={18} />}
              </button>

              <button
                onClick={toggleCamera}
                className={`${styles.mediaBtn} ${!cameraEnabled ? styles.mediaBtnActive : ''}`}
                title={cameraEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
                id="btn-toggle-cam"
              >
                {cameraEnabled ? <Video size={18} /> : <VideoOff size={18} />}
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Chat & Participants Panel */}
        <div className={styles.rightSidebar}>
          <div className={styles.tabHeader}>
            <button
              onClick={() => setActiveTab('chat')}
              className={`${styles.tabBtn} ${activeTab === 'chat' ? styles.tabBtnActive : ''}`}
            >
              <MessageSquare size={15} />
              Chat & AI
            </button>
            <button
              onClick={() => setActiveTab('participants')}
              className={`${styles.tabBtn} ${activeTab === 'participants' ? styles.tabBtnActive : ''}`}
            >
              <Users size={15} />
              Participants ({room.participants.length})
            </button>
          </div>

          {activeTab === 'chat' ? (
            <>
              <div className={styles.chatMessageList}>
                {(messages || room.recentMessages || []).map((msg) => {
                  const isMe = msg.senderId === currentUser?.id;
                  const isAi = msg.isAi;

                  let itemClass = styles.msgOther;
                  let bubbleClass = styles.msgBubbleOther;

                  if (isAi) {
                    itemClass = styles.msgAi;
                    bubbleClass = styles.msgBubbleAi;
                  } else if (isMe) {
                    itemClass = styles.msgUser;
                    bubbleClass = styles.msgBubbleUser;
                  }

                  return (
                    <div key={msg.id} className={`${styles.msgItem} ${itemClass}`}>
                      <span className={styles.msgSenderName}>
                        {isAi ? '✨ AI Study Tutor' : isMe ? 'You' : msg.senderName}
                      </span>
                      <div className={`${styles.msgBubble} ${bubbleClass}`}>
                        {msg.message}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className={styles.chatInputBox}>
                <div className={styles.chatActionChips}>
                  <button onClick={handleAskAi} className={styles.askAiChip}>
                    <Sparkles size={11} />
                    Ask AI Tutor
                  </button>
                </div>
                <form onSubmit={handleSendMessage} className={styles.chatInputRow}>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type a message or @ai question..."
                    className={styles.chatInput}
                    id="input-room-chat"
                  />
                  <button type="submit" disabled={!chatInput.trim()} className={styles.btnSend}>
                    <Send size={15} />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className={styles.participantsList}>
              {room.participants.map((p) => (
                <div key={p.id} className={styles.participantRow}>
                  <div className={styles.participantLeft}>
                    <div className={styles.avatarCircle} style={{ width: '32px', height: '32px', fontSize: '0.875rem' }}>
                      {p.studentName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className={styles.participantName}>
                        {p.studentName} {p.studentId === currentUser?.id ? '(You)' : ''}
                      </div>
                    </div>
                  </div>
                  {p.isOwner && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: '#fbbf24' }}>
                      <Crown size={13} /> Host
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
