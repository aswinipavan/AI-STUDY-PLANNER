'use client';

import React, { useState } from 'react';
import { StudyMaterial } from '@/types/api.types';
import Image from 'next/image';
import { FileText, Image as ImageIcon, Video, File, Trash2 } from 'lucide-react';
import { useDeleteMaterial } from '@/hooks/useMaterials';
import styles from '@/app/(dashboard)/materials/materials.module.css';

interface Props {
  material: StudyMaterial;
}

export default function MaterialCard({ material }: Props) {
  const { mutate: deleteMaterial, isPending } = useDeleteMaterial();
  const [showLightbox, setShowLightbox] = useState(false);

  // File type icons and colors
  const getIcon = () => {
    switch (material.fileType) {
      case 'pdf': return <FileText size={24} color="#f87171" />;
      case 'image': return <ImageIcon size={24} color="#60a5fa" />;
      case 'video': return <Video size={24} color="#c084fc" />;
      default: return <File size={24} color="#34d399" />;
    }
  };

  const handlePreview = () => {
    if (material.fileType === 'pdf') {
      window.open(material.fileUrl, '_blank');
    } else if (material.fileType === 'image') {
      setShowLightbox(true);
    } else {
      // Trigger download for docs/videos
      const link = document.createElement('a');
      link.href = material.fileUrl;
      link.download = material.title;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this material?')) {
      deleteMaterial(material.id);
    }
  };

  return (
    <>
      <div onClick={handlePreview} className={styles.matCard}>
        <button 
          onClick={handleDelete}
          disabled={isPending}
          className={styles.btnDelete}
          aria-label="Delete material"
        >
          <Trash2 size={16} />
        </button>
        
        <div className={styles.matIconWrap}>
          {getIcon()}
        </div>
        
        <h4 className={styles.matTitle} title={material.title}>
          {material.title}
        </h4>
        <span className={styles.matType}>
          {material.fileType}
        </span>
      </div>

      {showLightbox && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowLightbox(false)}
        >
          <div className="relative w-full h-full max-w-5xl max-h-[90vh]">
            <Image 
              src={material.fileUrl} 
              alt={material.title} 
              fill
              className="object-contain drop-shadow-2xl"
              unoptimized
            />
          </div>
        </div>
      )}
    </>
  );
}
