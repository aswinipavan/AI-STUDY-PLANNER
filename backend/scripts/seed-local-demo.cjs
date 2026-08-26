#!/usr/bin/env node
/**
 * Seeds the local demo student with a realistic dataset through the REAL REST API
 * (no direct DB writes), then prints what the adaptive endpoints return.
 *
 * Local development only: it authenticates with an app JWT minted from the local
 * JWT_SECRET for the seeded `faculty-demo-uid` student.
 */
const fs = require('fs');

const BASE = 'http://localhost:8080';
const TOKEN = fs.readFileSync('C:/Users/aswin/AppData/Local/Temp/local-dev-token.txt', 'utf8').trim();

async function call(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* non-JSON */ }
  return { status: res.status, json, text };
}

const iso = (daysFromToday) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;
};

const SUBJECTS = [
  { subjectName: 'Operating Systems', subjectCode: 'CS301', credits: 4, difficultyLevel: 5, semester: 6 },
  { subjectName: 'Computer Networks', subjectCode: 'CS302', credits: 4, difficultyLevel: 4, semester: 6 },
  { subjectName: 'Database Systems', subjectCode: 'CS303', credits: 3, difficultyLevel: 3, semester: 6 },
  { subjectName: 'Discrete Mathematics', subjectCode: 'MA201', credits: 3, difficultyLevel: 2, semester: 6 },
];

// Deliberately spread: OS is weak and its exam is closest, DM is strong and far away.
const MARKS = [
  { name: 'Operating Systems', examType: 'MIDTERM', obtained: 41, total: 100, when: -30 },
  { name: 'Operating Systems', examType: 'QUIZ', obtained: 12, total: 25, when: -12 },
  { name: 'Computer Networks', examType: 'MIDTERM', obtained: 58, total: 100, when: -28 },
  { name: 'Database Systems', examType: 'MIDTERM', obtained: 74, total: 100, when: -27 },
  { name: 'Discrete Mathematics', examType: 'MIDTERM', obtained: 88, total: 100, when: -26 },
];

const EXAMS = [
  { name: 'Operating Systems', examName: 'OS Final', in: 9, difficulty: 'hard' },
  { name: 'Computer Networks', examName: 'CN Final', in: 16, difficulty: 'medium' },
  { name: 'Database Systems', examName: 'DBMS Final', in: 24, difficulty: 'medium' },
  { name: 'Discrete Mathematics', examName: 'DM Final', in: 34, difficulty: 'easy' },
];

(async () => {
  const existing = await call('GET', '/api/students/me/subjects');
  const byName = new Map((existing.json?.data ?? []).map(s => [s.subjectName ?? s.name, s]));

  for (const s of SUBJECTS) {
    if (byName.has(s.subjectName)) { console.log(`subject exists   ${s.subjectName}`); continue; }
    const r = await call('POST', '/api/students/me/subjects', s);
    console.log(`subject ${r.status}      ${s.subjectName}`);
    if (r.json?.data) byName.set(s.subjectName, r.json.data);
  }

  const idOf = (name) => byName.get(name)?.id;

  // GET /api/marks is paged, so the rows live under data.content — not data.
  const marksNow = await call('GET', '/api/marks');
  const marksRows = marksNow.json?.data?.content ?? marksNow.json?.data ?? [];
  if (!Array.isArray(marksRows) || marksRows.length === 0) {
    for (const m of MARKS) {
      const r = await call('POST', '/api/marks', {
        subjectId: idOf(m.name),
        examType: m.examType,
        marksObtained: m.obtained,
        totalMarks: m.total,
        examDate: iso(m.when),
      });
      console.log(`mark ${r.status}         ${m.name} ${m.examType} ${m.obtained}/${m.total}`);
      if (r.status >= 400) console.log('   ', r.text.slice(0, 200));
    }
  } else {
    console.log(`marks exist      ${marksRows.length} rows`);
  }

  const examsNow = await call('GET', '/api/exams');
  if ((examsNow.json?.data ?? []).length === 0) {
    for (const e of EXAMS) {
      const r = await call('POST', '/api/exams', {
        subjectId: idOf(e.name),
        examName: e.examName,
        examDate: iso(e.in),
        examType: 'FINAL',
        durationHours: 3,
        difficulty: e.difficulty,
        syllabusCovered: 'Full syllabus',
      });
      console.log(`exam ${r.status}         ${e.examName} in ${e.in}d`);
      if (r.status >= 400) console.log('   ', r.text.slice(0, 250));
    }
  } else {
    console.log(`exams exist      ${(examsNow.json.data).length} rows`);
  }

  const active = await call('GET', '/api/timetable/active');
  if (active.status !== 200) {
    const r = await call('POST', '/api/timetable/generate', {
      subjectIds: SUBJECTS.map(s => idOf(s.subjectName)).filter(Boolean),
      availableHoursPerDay: 4,
      style: 'balanced',
      startDate: iso(-3),           // starts in the past so some slots are already missed
      durationDays: 21,
      useDeadlines: true,
    });
    console.log(`timetable ${r.status}    slots=${r.json?.data?.slots?.length ?? '-'}`);
    if (r.status >= 400) console.log('   ', r.text.slice(0, 400));
  } else {
    console.log(`timetable exists slots=${active.json?.data?.slots?.length ?? '-'}`);
  }

  console.log('\n--- adaptive reads ---');
  const insights = await call('GET', '/api/timetable/insights');
  console.log('insights', insights.status, JSON.stringify(insights.json?.data ?? insights.text).slice(0, 900));
  const priority = await call('GET', '/api/performance/priority');
  console.log('priority', priority.status, JSON.stringify(priority.json?.data ?? priority.text).slice(0, 700));
})();
