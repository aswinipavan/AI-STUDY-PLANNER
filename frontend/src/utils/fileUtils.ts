export function inferType(mimeType: string): 'pdf' | 'image' | 'video' | 'doc' {
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('image')) return 'image';
  if (mimeType.includes('video')) return 'video';
  return 'doc'; // Default fallback for word docs, excel, txt, etc.
}
