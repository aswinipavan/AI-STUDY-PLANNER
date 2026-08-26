#!/usr/bin/env node
/**
 * Writes a small but structurally valid PDF (correct xref offsets) whose text is
 * chapter/topic shaped, so the local NLP pipeline has something real to extract.
 * Local test fixture only — no dependency on any PDF library.
 */
const fs = require('fs');

const LINES = [
  'Operating Systems - Unit 1 Course Notes',
  '',
  'Chapter 1: Process Management',
  'A process is a program in execution. The operating system maintains a process',
  'control block for every process, and the scheduler decides which ready process',
  'runs next on the CPU. Context switching saves and restores process state.',
  '',
  'Chapter 2: CPU Scheduling Algorithms',
  'First Come First Served scheduling is simple but suffers from the convoy effect.',
  'Shortest Job First minimises average waiting time. Round Robin scheduling gives',
  'each process a fixed time quantum, which bounds response time for interactive',
  'workloads. Priority scheduling can cause starvation, which ageing solves.',
  '',
  'Chapter 3: Deadlock',
  'Deadlock requires mutual exclusion, hold and wait, no preemption and circular',
  'wait to occur simultaneously. Deadlock avoidance uses the Bankers algorithm to',
  'keep the system in a safe state. Deadlock detection builds a wait for graph and',
  'looks for a cycle. Recovery either terminates a process or preempts a resource.',
  '',
  'Chapter 4: Memory Management and Virtual Memory',
  'Paging divides the address space into fixed size pages mapped by a page table.',
  'Segmentation divides it by logical unit. Demand paging loads a page on a page',
  'fault. Page replacement algorithms include FIFO, optimal replacement and least',
  'recently used. Thrashing happens when the working set exceeds physical memory.',
  '',
  'Chapter 5: File Systems and Disk Scheduling',
  'A file system maps file names to disk blocks using contiguous, linked or indexed',
  'allocation. Inodes store metadata. Disk scheduling algorithms such as SCAN and',
  'CSCAN reduce seek time. Journaling improves crash consistency.',
];

const esc = (s) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

let text = 'BT\n/F1 11 Tf\n14 TL\n56 760 Td\n';
for (const line of LINES) text += `(${esc(line)}) Tj\nT*\n`;
text += 'ET\n';

const objects = [
  '<< /Type /Catalog /Pages 2 0 R >>',
  '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
  `<< /Length ${Buffer.byteLength(text, 'latin1')} >>\nstream\n${text}endstream`,
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
];

let pdf = '%PDF-1.4\n';
const offsets = [];
objects.forEach((body, i) => {
  offsets.push(Buffer.byteLength(pdf, 'latin1'));
  pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
});

const xrefStart = Buffer.byteLength(pdf, 'latin1');
pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
for (const off of offsets) pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

const out = process.argv[2] || 'C:/Users/aswin/AppData/Local/Temp/os-unit1-notes.pdf';
fs.writeFileSync(out, Buffer.from(pdf, 'latin1'));
console.log(`wrote ${out} (${Buffer.byteLength(pdf, 'latin1')} bytes)`);
