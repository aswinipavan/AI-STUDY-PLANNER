'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, Loader2 } from 'lucide-react';
import { useUploadMaterial } from '@/hooks/useMaterials';
import { Subject } from '@/types/api.types';
import styles from '@/app/(dashboard)/materials/materials.module.css';

interface Props {
  subjects: Subject[];
}

export default function UploadZone({ subjects }: Props) {
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [error, setError] = useState<string>('');
  const { mutateAsync: uploadFile, isPending } = useUploadMaterial();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!selectedSubject) {
      setError('Please select a subject before uploading.');
      return;
    }
    setError('');

    for (const file of acceptedFiles) {
      try {
        await uploadFile({
          file,
          title: file.name.split('.')[0],
          subjectId: selectedSubject,
        });
      } catch (err) {
        console.error('Upload failed for', file.name, err);
        setError(`Failed to upload ${file.name}`);
      }
    }
  }, [selectedSubject, uploadFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    disabled: isPending
  });

  return (
    <div className={`${styles.cardBase} ${styles.uploadSection}`}>
      <h3 className={styles.uploadTitle}>Upload Materials</h3>
      
      <select 
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
      {error && <p className="text-[#f87171] text-sm mb-4">{error}</p>}

      <div 
        {...getRootProps()} 
        className={`${styles.dropZone} ${isDragActive ? styles.dropZoneActive : ''} ${isPending ? styles.dropZoneDisabled : ''}`}
      >
        <input {...getInputProps()} />
        
        {isPending ? (
          <>
            <div className={styles.uploadIconWrap}>
              <Loader2 size={24} className="animate-spin" />
            </div>
            <p className={styles.uploadMainText}>Uploading directly to secure storage...</p>
          </>
        ) : (
          <>
            <div className={styles.uploadIconWrap}>
              <UploadCloud size={24} />
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
