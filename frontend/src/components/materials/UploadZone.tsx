'use client';

import React, { useCallback, useId, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, Loader2 } from 'lucide-react';
import { useUploadMaterial } from '@/hooks/useMaterials';
import { useToast } from '@/components/ui/ToastProvider';
import { Subject } from '@/types/api.types';
import styles from '@/app/(dashboard)/materials/materials.module.css';

interface Props {
  subjects: Subject[];
}

export default function UploadZone({ subjects }: Props) {
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [error, setError] = useState<string>('');
  const { mutateAsync: uploadFile, isPending } = useUploadMaterial();
  const { toast } = useToast();
  const selectId = useId();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!selectedSubject) {
      setError('Please select a subject before uploading.');
      return;
    }
    setError('');

    let uploaded = 0;
    for (const file of acceptedFiles) {
      try {
        await uploadFile({
          file,
          title: file.name.split('.')[0],
          subjectId: selectedSubject,
        });
        uploaded += 1;
      } catch (err) {
        console.error('Upload failed for', file.name, err);
        setError(`Failed to upload ${file.name}`);
      }
    }

    // Upload used to finish in silence: the card appeared in a grid further down
    // the page, which is easy to miss on a laptop and invisible on a phone.
    if (uploaded > 0) {
      toast.success(
        uploaded === 1
          ? 'Uploaded. Reading it for topics now — re-plan your timetable once it is ready.'
          : `${uploaded} files uploaded. Reading them for topics now.`,
        'uploadComplete'
      );
    }
  }, [selectedSubject, uploadFile, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: isPending
  });

  return (
    <div className={`${styles.cardBase} ${styles.uploadSection}`}>
      <h3 className={styles.uploadTitle}>Upload Materials</h3>

      {/* The placeholder option is not a label — without this the control was
          announced as just "combo box". */}
      <label className={styles.srOnly} htmlFor={selectId}>
        Subject to upload into
      </label>
      <select
        id={selectId}
        className={styles.subjectSelect}
        value={selectedSubject}
        onChange={(e) => {
          setSelectedSubject(e.target.value);
          setError('');
        }}
      >
        <option value="" disabled>Select Subject Folder</option>
        {subjects.map(sub => (
          <option key={sub.id} value={sub.id}>{sub.name}</option>
        ))}
      </select>
      {error && <p className={styles.uploadError} role="alert">{error}</p>}

      <div
        {...getRootProps()}
        aria-busy={isPending || undefined}
        className={`${styles.dropZone} ${isDragActive ? styles.dropZoneActive : ''} ${isPending ? styles.dropZoneDisabled : ''}`}
      >
        <input {...getInputProps()} />

        {isPending ? (
          <>
            <div className={styles.uploadIconWrap}>
              <Loader2 size={24} className="animate-spin" aria-hidden="true" />
            </div>
            <p className={styles.uploadMainText}>Uploading to secure storage…</p>
          </>
        ) : (
          <>
            <div className={styles.uploadIconWrap}>
              <UploadCloud size={24} aria-hidden="true" />
            </div>
            <p className={styles.uploadMainText}>
              {isDragActive ? "Drop the files here..." : "Drag & drop files here, or click to browse"}
            </p>
            <p className={styles.uploadSubText}>
              Supports PDF, Images, Videos, and Documents
            </p>
          </>
        )}
      </div>
    </div>
  );
}
