'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Send, Paperclip, X, FileText, Loader2 } from 'lucide-react';
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
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { mutateAsync: uploadMaterialMutation } = useUploadMaterial();

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 120);
      textarea.style.height = `${newHeight}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 25MB max
    if (file.size > 25 * 1024 * 1024) {
      setUploadError('File exceeds 25MB limit.');
      return;
    }

    setUploadError(null);
    setUploading(true);

    try {
      const title = file.name.replace(/\.[^/.]+$/, '');
      const savedMaterial = await uploadMaterialMutation({
        file,
        title,
        subjectId: '',
      });

      const uploadedMat: AttachedMaterial = {
        id: (savedMaterial as { id?: string })?.id || String(Date.now()),
        title: (savedMaterial as { title?: string })?.title || title,
        fileName: file.name,
        processingStatus: 'ANALYZING',
      };

      onAttachMaterial(uploadedMat);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      setUploadError(msg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className={styles.inputContainer}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        aria-label="Attach academic material"
      />

      {attachedMaterial && (
        <div className={styles.attachedContainer}>
          <div className={styles.attachedPill}>
            <FileText size={14} />
            <span>{attachedMaterial.title || attachedMaterial.fileName}</span>
            <button
              type="button"
              onClick={() => onAttachMaterial(null)}
              className={styles.attachedPillRemove}
              aria-label="Remove attached document"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {uploading && (
        <div className={styles.attachedContainer}>
          <div className={styles.uploadProgressText}>
            <Loader2 size={14} className="animate-spin inline" /> Uploading & analyzing with NLP pipeline...
          </div>
        </div>
      )}

      {uploadError && (
        <div className={styles.attachedContainer} style={{ color: '#ef4444', fontSize: '0.75rem' }}>
          ⚠️ {uploadError}
        </div>
      )}

      <div className={styles.inputWrap}>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || isThinking}
          className={styles.btnAttach}
          aria-label="Attach PDF or lecture notes"
          title="Attach PDF or study notes"
          id="btn-chat-attach"
        >
          <Paperclip size={18} />
        </button>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            attachedMaterial
              ? `Ask anything about "${attachedMaterial.title || attachedMaterial.fileName}"...`
              : 'Ask anything... (Enter to send, Shift+Enter for new line)'
          }
          className={styles.textarea}
          rows={1}
          disabled={isThinking}
          id="chat-textarea"
        />

        <button
          onClick={onSend}
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

