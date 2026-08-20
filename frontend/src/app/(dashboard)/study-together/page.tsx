'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useActiveStudyRooms, useCreateStudyRoom, useJoinStudyRoom } from '@/hooks/useStudyRoom';
import { useSubjects } from '@/hooks/useSubjects';
import { Users, Plus, LogIn, Clock, Sparkles, BookOpen, User, X } from 'lucide-react';
import styles from './studyTogether.module.css';

export default function StudyTogetherPage() {
  const router = useRouter();
  const { data: activeRooms, isLoading: loadingRooms } = useActiveStudyRooms();
  const { data: subjects } = useSubjects();
  const createRoomMutation = useCreateStudyRoom();
  const joinRoomMutation = useJoinStudyRoom();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Create form state
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [customSubjectName, setCustomSubjectName] = useState('');
  const [topic, setTopic] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(50);
  const [maxParticipants, setMaxParticipants] = useState(4);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const subjectObj = subjects?.find(s => s.id === selectedSubjectId);
    const subName = subjectObj ? subjectObj.name : (customSubjectName.trim() || 'General Study');

    try {
      const newRoom = await createRoomMutation.mutateAsync({
        subjectId: selectedSubjectId || undefined,
        subjectName: subName,
        topic: topic.trim() || 'Focus Session',
        durationMinutes,
        maxParticipants,
      });

      setShowCreateModal(false);
      router.push(`/study-together/${newRoom.roomCode}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create study room.';
      setErrorMessage(msg);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setErrorMessage('');

    const code = joinCode.trim().toUpperCase();
    try {
      await joinRoomMutation.mutateAsync(code);
      setShowJoinModal(false);
      router.push(`/study-together/${code}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to join study room. Check room code.';
      setErrorMessage(msg);
    }
  };

  const formatTimer = (seconds?: number) => {
    if (!seconds || seconds <= 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Study Together</h1>
          <p className={styles.subtitle}>
            Collaborate in focused peer study rooms with synchronized timers, video, shared materials, and instant AI tutor assistance.
          </p>
        </div>
        <div className={styles.actionButtonGroup}>
          <button
            onClick={() => { setShowCreateModal(true); setErrorMessage(''); }}
            className={styles.btnPrimary}
            id="btn-create-study-room"
          >
            <Plus size={18} />
            Create Study Room
          </button>
          <button
            onClick={() => { setShowJoinModal(true); setErrorMessage(''); }}
            className={styles.btnSecondary}
            id="btn-join-study-room"
          >
            <LogIn size={18} />
            Join with Code
          </button>
        </div>
      </div>

      {/* Hero Banner */}
      <div className={styles.heroBanner}>
        <div className={styles.heroContent}>
          <h2>Synchronized Collaborative Focus</h2>
          <p>
            Study side-by-side with peers, maintain mutual accountability with shared Pomodoro timers, and ask the AI Tutor questions that benefit everyone in the room.
          </p>
        </div>
        <div className={styles.heroBadges}>
          <div className={styles.heroPill}>
            <Clock size={14} /> Synchronized Timer
          </div>
          <div className={styles.heroPill}>
            <Sparkles size={14} /> Room AI Tutor
          </div>
          <div className={styles.heroPill}>
            <Users size={14} /> Peer Video & Chat
          </div>
        </div>
      </div>

      {/* Active Study Rooms Section */}
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Active Study Rooms</h2>
        <span style={{ fontSize: '0.8125rem', color: 'var(--color-muted-foreground)' }}>
          {activeRooms?.length || 0} active {activeRooms?.length === 1 ? 'room' : 'rooms'}
        </span>
      </div>

      {loadingRooms ? (
        <div className={styles.roomsGrid}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className={styles.roomCard} style={{ minHeight: '180px', opacity: 0.5 }}>
              <div style={{ height: '24px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} />
            </div>
          ))}
        </div>
      ) : activeRooms && activeRooms.length > 0 ? (
        <div className={styles.roomsGrid}>
          {activeRooms.map((room) => (
            <div key={room.id} className={styles.roomCard}>
              <div>
                <div className={styles.cardHeader}>
                  <span className={styles.codeBadge}>{room.roomCode}</span>
                  <span style={{ fontSize: '0.75rem', color: '#00e5c0', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={12} /> {formatTimer(room.secondsRemaining)}
                  </span>
                </div>

                <h3 className={styles.roomSubject}>{room.subjectName}</h3>
                <p className={styles.roomTopic}>{room.topic || 'Focus Study Session'}</p>

                <div className={styles.roomMetaRow}>
                  <div className={styles.metaItem}>
                    <Users size={13} />
                    <span>{room.currentParticipantsCount} / {room.maxParticipants} participants</span>
                  </div>
                  <div className={styles.metaItem}>
                    <Clock size={13} />
                    <span>{room.durationMinutes} mins</span>
                  </div>
                </div>
              </div>

              <div className={styles.cardFooter}>
                <div className={styles.hostInfo}>
                  <User size={13} />
                  <span>Host: {room.ownerName}</span>
                </div>
                <button
                  onClick={() => router.push(`/study-together/${room.roomCode}`)}
                  className={styles.btnJoinRoom}
                >
                  Join Room
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <Users size={40} color="#00e5c0" style={{ opacity: 0.8 }} />
          <h3 className={styles.emptyTitle}>No active study rooms right now</h3>
          <p className={styles.emptyText}>
            Be the first to start a session! Create a room, share the 4-digit code with friends, and start studying together.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className={styles.btnPrimary}
            style={{ marginTop: '0.5rem' }}
          >
            <Plus size={16} />
            Start a Study Room
          </button>
        </div>
      )}

      {/* ── CREATE ROOM MODAL ── */}
      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={20} color="#00e5c0" />
                <h3 className={styles.modalTitle}>Create Study Room</h3>
              </div>
              <button className={styles.closeModalBtn} onClick={() => setShowCreateModal(false)}>
                <X size={20} />
              </button>
            </div>

            {errorMessage && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', padding: '0.65rem 0.85rem', borderRadius: '6px', fontSize: '0.8125rem', marginBottom: '1rem' }}>
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleCreateRoom}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Select Subject</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className={styles.formSelect}
                >
                  <option value="">-- Choose from your subjects or custom --</option>
                  {subjects?.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {!selectedSubjectId && (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Or Subject Name</label>
                  <input
                    type="text"
                    value={customSubjectName}
                    onChange={(e) => setCustomSubjectName(e.target.value)}
                    placeholder="e.g. Calculus II, Operating Systems"
                    className={styles.formInput}
                  />
                </div>
              )}

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Topic or Chapter Goal</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Chapter 4 Differential Equations, Midterm Prep"
                  className={styles.formInput}
                  required
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Duration (Minutes)</label>
                  <select
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className={styles.formSelect}
                  >
                    <option value={25}>25 mins (Pomodoro)</option>
                    <option value={50}>50 mins (Standard)</option>
                    <option value={90}>90 mins (Deep Dive)</option>
                    <option value={120}>120 mins (Intense)</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Max Participants</label>
                  <select
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(Number(e.target.value))}
                    className={styles.formSelect}
                  >
                    <option value={2}>2 (Pair Study)</option>
                    <option value={4}>4 (Small Group)</option>
                    <option value={8}>8 (Group Session)</option>
                  </select>
                </div>
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className={styles.btnSecondary}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createRoomMutation.isPending}
                  className={styles.btnPrimary}
                >
                  {createRoomMutation.isPending ? 'Creating...' : 'Launch Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── JOIN ROOM MODAL ── */}
      {showJoinModal && (
        <div className={styles.modalOverlay} onClick={() => setShowJoinModal(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LogIn size={20} color="#00e5c0" />
                <h3 className={styles.modalTitle}>Join Study Room</h3>
              </div>
              <button className={styles.closeModalBtn} onClick={() => setShowJoinModal(false)}>
                <X size={20} />
              </button>
            </div>

            {errorMessage && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', padding: '0.65rem 0.85rem', borderRadius: '6px', fontSize: '0.8125rem', marginBottom: '1rem' }}>
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleJoinRoom}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Enter Room Code</label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. MATH-7K42"
                  className={styles.formInput}
                  style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, fontSize: '1.1rem' }}
                  required
                  autoFocus
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--color-muted-foreground)', marginTop: '0.4rem' }}>
                  Ask your peer or room host for their 6-8 character study room code.
                </p>
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className={styles.btnSecondary}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={joinRoomMutation.isPending || !joinCode.trim()}
                  className={styles.btnPrimary}
                >
                  {joinRoomMutation.isPending ? 'Joining...' : 'Enter Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
