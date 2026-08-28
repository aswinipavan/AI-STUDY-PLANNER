'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, X, FileText, ImageIcon, FileCode, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import styles from './chat.module.css';
import { useUploadMaterial } from '@/hooks/useMaterials';
import { AttachedMaterial } from '@/hooks/useChat';

interface Props {
  value: string;
  onChange: (val: string) => void;
  onSend: () => void;
  isThinking: boolean;
  attachedMaterial: AttachedMaterial | null;
  onAttachMaterial: (mat: AttachedMaterial | null) => void;
}

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx', '.txt'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const STUDY_PLACEHOLDERS = [
  "Ask anything... (Enter to send, Shift+Enter for new line)",
  "Ask me to explain any concept or formula from your notes...",
  "How should I structure my revision for upcoming exams?",
  "Generate 5 practice multiple-choice questions for revision...",
  "Summarize key formulas, theorems, and definitions...",
  "Help me create a personalized study timetable...",
  "Break down complex academic concepts step-by-step...",
];

const QUICK_ACTIONS = [
  { label: '✨ Summarize', prompt: 'Please provide a comprehensive, structured summary of this material with key takeaways and definitions.' },
  { label: '📝 Generate MCQs', prompt: 'Generate 5 high-yield multiple-choice questions (MCQs) with 4 options each, correct answers, and detailed explanations based on this material.' },
  { label: '🎯 Extract Topics', prompt: 'Extract all major topics, subtopics, and core formulas/concepts from this material, categorized by importance.' },
  { label: '🗂️ Flashcards', prompt: 'Create 5 study flashcards (Question on Front, Detailed Concept Explanation on Back) from this material.' },
  { label: '📅 Study Plan', prompt: 'Create a step-by-step 3-day revision study plan based on the topics in this material.' },
  { label: '💡 Explain Concepts', prompt: 'Explain the core concepts and difficult sections in this material step-by-step in simple terms with examples.' },
];

export default function ChatInput({
  value,
  onChange,
  onSend,
  isThinking,
  attachedMaterial,
  onAttachMaterial,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const newDataRef = useRef<Array<{ x: number; y: number; r: number; color: string }>>([]);

  const [uploading, setUploading] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [localThumbnail, setLocalThumbnail] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);

  const { mutateAsync: uploadMaterialMutation } = useUploadMaterial();

  // Placeholder rotation
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startPlaceholderAnimation = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCurrentPlaceholder((prev) => (prev + 1) % STUDY_PLACEHOLDERS.length);
    }, 3500);
  }, []);

  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState !== "visible" && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    } else if (document.visibilityState === "visible") {
      startPlaceholderAnimation();
    }
  }, [startPlaceholderAnimation]);

  useEffect(() => {
    startPlaceholderAnimation();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [startPlaceholderAnimation, handleVisibilityChange]);

  // Adjust textarea height
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 120);
      textarea.style.height = `${newHeight}px`;
    }
  }, [value]);

  // Particle Vanish Effect
  const drawVanishCanvas = useCallback(() => {
    if (!textareaRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 400;
    ctx.clearRect(0, 0, 800, 400);

    const computedStyles = getComputedStyle(textareaRef.current);
    const fontSize = parseFloat(computedStyles.getPropertyValue("font-size")) || 14;
    ctx.font = `${fontSize * 2}px ${computedStyles.fontFamily || "sans-serif"}`;
    ctx.fillStyle = "#00e5c0";
    ctx.fillText(value.slice(0, 80), 16, 40);

    try {
      const imageData = ctx.getImageData(0, 0, 800, 400);
      const pixelData = imageData.data;
      const newData: Array<{ x: number; y: number; r: number; color: string }> = [];

      for (let t = 0; t < 400; t += 2) {
        const i = 4 * t * 800;
        for (let n = 0; n < 800; n += 2) {
          const e = i + 4 * n;
          if (
            pixelData[e] !== 0 ||
            pixelData[e + 1] !== 0 ||
            pixelData[e + 2] !== 0
          ) {
            newData.push({
              x: n,
              y: t,
              r: 1,
              color: `rgba(${pixelData[e]}, ${pixelData[e + 1]}, ${pixelData[e + 2]}, ${pixelData[e + 3] / 255})`,
            });
          }
        }
      }
      newDataRef.current = newData;
    } catch {
      newDataRef.current = [];
    }
  }, [value]);

  useEffect(() => {
    drawVanishCanvas();
  }, [value, drawVanishCanvas]);

  const triggerVanishAnimation = (startPos: number = 0) => {
    const animateFrame = (pos: number = 0) => {
      requestAnimationFrame(() => {
        const newArr: Array<{ x: number; y: number; r: number; color: string }> = [];
        for (let i = 0; i < newDataRef.current.length; i++) {
          const current = newDataRef.current[i];
          if (current.x < pos) {
            newArr.push(current);
          } else {
            if (current.r <= 0) continue;
            current.x += Math.random() > 0.5 ? 1 : -1;
            current.y += Math.random() > 0.5 ? 1 : -1;
            current.r -= 0.05 * Math.random();
            newArr.push(current);
          }
        }
        newDataRef.current = newArr;
        const ctx = canvasRef.current?.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, 800, 400);
          newDataRef.current.forEach((t) => {
            const { x: n, y: i, r: s, color } = t;
            if (n > pos && s > 0) {
              ctx.beginPath();
              ctx.rect(n, i, s, s);
              ctx.fillStyle = color;
              ctx.strokeStyle = color;
              ctx.stroke();
            }
          });
        }
        if (newDataRef.current.length > 0) {
          animateFrame(pos - 8);
        } else {
          setAnimating(false);
        }
      });
    };
    animateFrame(startPos);
  };

  const handleSend = () => {
    if ((!value.trim() && !attachedMaterial) || isThinking || uploading) return;

    if (value.trim() && newDataRef.current.length > 0) {
      setAnimating(true);
      const maxX = newDataRef.current.reduce(
        (prev, current) => (current.x > prev ? current.x : prev),
        0
      );
      triggerVanishAnimation(maxX);
    }

    onSend();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploadSuccess(null);

    // 1. Validate empty/corrupt file
    if (file.size === 0) {
      setUploadError('Selected file is empty or corrupted.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // 2. Validate file size (50MB max)
    if (file.size > MAX_FILE_SIZE) {
      setUploadError('File is too large. Maximum allowed size is 50MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // 3. Validate file extension and MIME type
    const lowerName = file.name.toLowerCase();
    const isSupportedExt = ALLOWED_EXTENSIONS.some(ext => lowerName.endsWith(ext));
    const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(lowerName);
    const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf');
    const isDoc = file.type.includes('word') || lowerName.endsWith('.doc') || lowerName.endsWith('.docx') || lowerName.endsWith('.txt');

    if (!isSupportedExt && !isImage && !isPdf && !isDoc) {
      setUploadError('Unsupported file type. Please upload a PDF or image (JPG, JPEG, PNG, WEBP).');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Create local preview thumbnail for images
    let objectUrl: string | null = null;
    if (isImage) {
      try {
        objectUrl = URL.createObjectURL(file);
        setLocalThumbnail(objectUrl);
      } catch {
        // ignore object URL error
      }
    } else {
      setLocalThumbnail(null);
    }

    setUploading(true);
    setUploadStatusText('Uploading directly to secure storage...');

    try {
      const title = file.name.replace(/\.[^/.]+$/, '');
      
      const savedMaterial = await uploadMaterialMutation({
        file,
        title,
        subjectId: '',
      });

      setUploadStatusText('NLP Document Intelligence analyzing...');

      const uploadedMat: AttachedMaterial = {
        id: (savedMaterial as { id?: string })?.id || String(Date.now()),
        title: (savedMaterial as { title?: string })?.title || title,
        fileName: file.name,
        fileUrl: (savedMaterial as { fileUrl?: string })?.fileUrl,
        fileType: file.type || (isPdf ? 'application/pdf' : isImage ? 'image/jpeg' : 'text/plain'),
        fileSizeBytes: file.size,
        thumbnailUrl: objectUrl || undefined,
        processingStatus: 'READY',
      };

      onAttachMaterial(uploadedMat);
      setUploadSuccess(isPdf ? 'PDF uploaded successfully.' : isImage ? 'Image uploaded successfully.' : 'Material uploaded successfully.');
      
      // Auto clear success banner after 4 seconds
      setTimeout(() => setUploadSuccess(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      setUploadError(msg);
      setLocalThumbnail(null);
      onAttachMaterial(null);
    } finally {
      setUploading(false);
      setUploadStatusText('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = () => {
    if (localThumbnail) {
      URL.revokeObjectURL(localThumbnail);
      setLocalThumbnail(null);
    }
    onAttachMaterial(null);
    setUploadError(null);
    setUploadSuccess(null);
  };

  const isAttachmentImage = attachedMaterial?.fileType?.startsWith('image/') || 
                            attachedMaterial?.fileName?.match(/\.(jpg|jpeg|png|webp|gif)$/i) ||
                            Boolean(localThumbnail);
  const isAttachmentPdf = attachedMaterial?.fileType?.includes('pdf') || 
                          attachedMaterial?.fileName?.toLowerCase().endsWith('.pdf');

  return (
    <div className={styles.inputContainer} data-testid="chat-input-container">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.txt,image/*,application/pdf"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        aria-label="Attach academic material or image"
        id="chat-file-input"
      />

      {/* ── ATTACHED MATERIAL CARD ── */}
      {attachedMaterial && (
        <div className={styles.attachedContainer}>
          <div className={styles.attachedCard}>
            <div className={styles.attachedLeft}>
              <div className={`${styles.attachedThumbnailWrap} ${
                isAttachmentPdf ? styles.attachedIconBoxPdf : isAttachmentImage ? styles.attachedIconBoxImage : styles.attachedIconBoxDoc
              }`}>
                {isAttachmentImage && (localThumbnail || attachedMaterial.thumbnailUrl || attachedMaterial.fileUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={localThumbnail || attachedMaterial.thumbnailUrl || attachedMaterial.fileUrl}
                    alt={attachedMaterial.title || attachedMaterial.fileName}
                    className={styles.attachedThumbnail}
                  />
                ) : isAttachmentPdf ? (
                  <FileText size={20} />
                ) : isAttachmentImage ? (
                  <ImageIcon size={20} />
                ) : (
                  <FileCode size={20} />
                )}
              </div>

              <div className={styles.attachedDetails}>
                <span className={styles.attachedFileName} title={attachedMaterial.title || attachedMaterial.fileName}>
                  {attachedMaterial.title || attachedMaterial.fileName}
                </span>

                <div className={styles.attachedMetaRow}>
                  <span className={styles.attachedSize}>
                    {formatFileSize(attachedMaterial.fileSizeBytes)}
                  </span>
                  <span>•</span>
                  <span className={`${styles.attachedStatusBadge} ${
                    uploading ? styles.statusUploading : styles.statusReady
                  }`}>
                    {uploading ? (
                      <>
                        <Loader2 size={10} className="animate-spin" /> Uploading
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={10} /> Ready for AI
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRemoveAttachment}
              className={styles.attachedRemoveBtn}
              aria-label="Remove attached document"
              title="Remove attachment"
            >
              <X size={16} />
            </button>
          </div>

          {/* Quick Action Chips for Attached Material */}
          <div className={styles.actionChipsWrap}>
            {QUICK_ACTIONS.map((action, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onChange(action.prompt);
                  if (textareaRef.current) textareaRef.current.focus();
                }}
                disabled={isThinking || uploading}
                className={styles.actionChip}
                title={action.prompt}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── UPLOAD IN PROGRESS STATUS ── */}
      {uploading && !attachedMaterial && (
        <div className={styles.attachedContainer}>
          <div className={styles.uploadProgressText}>
            <Loader2 size={14} className="animate-spin inline" /> {uploadStatusText || 'Uploading & processing document...'}
          </div>
        </div>
      )}

      {/* ── SUCCESS BANNER ── */}
      {uploadSuccess && (
        <div className={styles.attachedContainer}>
          <div className={styles.uploadSuccessBanner}>
            <Sparkles size={13} /> {uploadSuccess}
          </div>
        </div>
      )}

      {/* ── ERROR BANNER ── */}
      {uploadError && (
        <div className={styles.attachedContainer}>
          <div className={styles.uploadErrorBanner}>
            <span>⚠️ {uploadError}</span>
          </div>
        </div>
      )}

      {/* ── INPUT BAR ── */}
      <div className={styles.inputWrap}>
        {/* Particle Canvas Vanish Layer */}
        <canvas
          ref={canvasRef}
          className={`${styles.vanishCanvas} ${!animating ? styles.canvasHidden : styles.canvasVisible}`}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || isThinking}
          className={styles.btnAttach}
          aria-label="Attach PDF, notes, or image"
          title="Attach PDF, study notes, or diagram"
          id="btn-chat-attach"
        >
          <Paperclip size={18} />
        </button>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className={`${styles.textarea} ${animating ? styles.textareaAnimating : ''}`}
          rows={1}
          disabled={isThinking}
          id="chat-textarea"
          aria-label="Chat input message"
        />

        {/* Animated Rotating Placeholder */}
        {!value && (
          <div className={styles.placeholderOverlay}>
            <AnimatePresence mode="wait">
              <motion.span
                key={attachedMaterial ? 'attached' : `placeholder-${currentPlaceholder}`}
                initial={{ y: 6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -6, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className={styles.placeholderText}
              >
                {attachedMaterial
                  ? `Ask anything about "${attachedMaterial.title || attachedMaterial.fileName}"...`
                  : STUDY_PLACEHOLDERS[currentPlaceholder]}
              </motion.span>
            </AnimatePresence>
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={(!value.trim() && !attachedMaterial) || isThinking || uploading}
          className={styles.btnSend}
          aria-label="Send message"
          id="btn-chat-send"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
