import React from 'react';
import SubjectDetailClient from './SubjectDetailClient';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SubjectDetailPage({ params }: Props) {
  const { id } = await params;
  return <SubjectDetailClient subjectId={id} />;
}
