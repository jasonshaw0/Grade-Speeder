import type { SubmissionsResponse, StudentSubmission, RubricCriterion } from './types';

const FIRST_NAMES = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn', 'Cameron', 'Drew', 'Skyler', 'Jamie', 'Reese', 'Hayden', 'Dakota'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Martinez', 'Anderson', 'Wilson', 'Taylor', 'Thomas', 'Moore', 'Jackson'];

const DEMO_RUBRIC: RubricCriterion[] = [
  {
    id: 'crit_1',
    description: 'Thesis & Argument',
    short_description: 'Thesis',
    long_description: 'Evaluates the clarity, strength, and originality of the thesis statement and supporting arguments.',
    points: 25,
    ratings: [
      { id: 'r1a', description: 'Excellent', long_description: 'Clear, compelling thesis with strong argumentation', points: 25 },
      { id: 'r1b', description: 'Good', long_description: 'Clear thesis with adequate support', points: 20 },
      { id: 'r1c', description: 'Satisfactory', long_description: 'Thesis present but could be stronger', points: 15 },
      { id: 'r1d', description: 'Needs Work', long_description: 'Thesis unclear or poorly supported', points: 10 },
      { id: 'r1e', description: 'Missing', long_description: 'No clear thesis', points: 0 },
    ],
  },
  {
    id: 'crit_2',
    description: 'Evidence & Research',
    short_description: 'Research',
    long_description: 'Quality and integration of sources and evidence.',
    points: 25,
    ratings: [
      { id: 'r2a', description: 'Excellent', points: 25 },
      { id: 'r2b', description: 'Good', points: 20 },
      { id: 'r2c', description: 'Satisfactory', points: 15 },
      { id: 'r2d', description: 'Needs Work', points: 10 },
      { id: 'r2e', description: 'Missing', points: 0 },
    ],
  },
  {
    id: 'crit_3',
    description: 'Organization & Structure',
    short_description: 'Organization',
    points: 25,
    ratings: [
      { id: 'r3a', description: 'Excellent', points: 25 },
      { id: 'r3b', description: 'Good', points: 20 },
      { id: 'r3c', description: 'Satisfactory', points: 15 },
      { id: 'r3d', description: 'Needs Work', points: 10 },
      { id: 'r3e', description: 'Missing', points: 0 },
    ],
  },
  {
    id: 'crit_4',
    description: 'Grammar & Style',
    short_description: 'Grammar',
    points: 25,
    ratings: [
      { id: 'r4a', description: 'Excellent', points: 25 },
      { id: 'r4b', description: 'Good', points: 20 },
      { id: 'r4c', description: 'Satisfactory', points: 15 },
      { id: 'r4d', description: 'Needs Work', points: 10 },
      { id: 'r4e', description: 'Missing', points: 0 },
    ],
  },
];

function generateStudentName(index: number): { first: string; last: string } {
  return {
    first: FIRST_NAMES[index % FIRST_NAMES.length],
    last: LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length],
  };
}

export function generateMockSubmissions(): SubmissionsResponse {
  const now = new Date();
  const dueDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago

  const students: StudentSubmission[] = [];

  // Student 1: Graded, on-time, with instructor comment
  const s1Name = generateStudentName(0);
  students.push({
    draftChangesCount: null,
    userId: 1001,
    userName: `${s1Name.first} ${s1Name.last}`,
    visibleName: `${s1Name.first} ${s1Name.last}`,
    sortableName: `${s1Name.last}, ${s1Name.first}`,
    hasSubmission: true,
    submittedAt: new Date(dueDate.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours early
    late: false,
    missing: false,
    excused: false,
    score: 92,
    grade: '92',
    attachments: [{
      id: 10001,
      displayName: 'Research_Paper.pdf',
      contentType: 'application/pdf',
      size: 524288,
      isPdf: true,
    }],
    existingComments: [{
      id: 20001,
      authorId: 999,
      authorName: 'Dr. Instructor',
      comment: 'Excellent work! Your thesis is well-argued and supported by strong evidence.',
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    }],
    rubricAssessments: {
      crit_1: { rating_id: 'r1a', comments: 'Strong thesis', points: 25 },
      crit_2: { rating_id: 'r2a', comments: '', points: 25 },
      crit_3: { rating_id: 'r3b', comments: '', points: 20 },
      crit_4: { rating_id: 'r4a', comments: '', points: 22 },
    },
  });

  // Student 2: Late submission (12 hours), partially graded
  const s2Name = generateStudentName(1);
  students.push({
    draftChangesCount: null,
    userId: 1002,
    userName: `${s2Name.first} ${s2Name.last}`,
    visibleName: `${s2Name.first} ${s2Name.last}`,
    sortableName: `${s2Name.last}, ${s2Name.first}`,
    hasSubmission: true,
    submittedAt: new Date(dueDate.getTime() + 12 * 60 * 60 * 1000).toISOString(),
    late: true,
    missing: false,
    excused: false,
    secondsLate: 12 * 60 * 60,
    score: 78,
    grade: '78',
    attachments: [{
      id: 10002,
      displayName: 'Essay_Final_v2.pdf',
      contentType: 'application/pdf',
      size: 312000,
      isPdf: true,
    }],
    existingComments: [],
    rubricAssessments: {
      crit_1: { rating_id: 'r1b', comments: '', points: 20 },
      crit_2: { rating_id: 'r2b', comments: '', points: 18 },
      crit_3: { rating_id: 'r3b', comments: '', points: 20 },
      crit_4: { rating_id: 'r4b', comments: '', points: 20 },
    },
  });

  // Student 3: Very late (2 days), not graded
  const s3Name = generateStudentName(2);
  students.push({
    draftChangesCount: null,
    userId: 1003,
    userName: `${s3Name.first} ${s3Name.last}`,
    visibleName: `${s3Name.first} ${s3Name.last}`,
    sortableName: `${s3Name.last}, ${s3Name.first}`,
    hasSubmission: true,
    submittedAt: new Date(dueDate.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    late: true,
    missing: false,
    excused: false,
    secondsLate: 2 * 24 * 60 * 60,
    score: null,
    grade: null,
    attachments: [{
      id: 10003,
      displayName: 'Assignment_4.pdf',
      contentType: 'application/pdf',
      size: 445000,
      isPdf: true,
    }],
    existingComments: [],
  });

  // Student 4: Missing submission
  const s4Name = generateStudentName(3);
  students.push({
    draftChangesCount: null,
    userId: 1004,
    userName: `${s4Name.first} ${s4Name.last}`,
    visibleName: `${s4Name.first} ${s4Name.last}`,
    sortableName: `${s4Name.last}, ${s4Name.first}`,
    hasSubmission: false,
    submittedAt: null,
    late: false,
    missing: true,
    excused: false,
    score: null,
    grade: null,
    attachments: [],
    existingComments: [],
  });

  // Student 5: Excused
  const s5Name = generateStudentName(4);
  students.push({
    draftChangesCount: null,
    userId: 1005,
    userName: `${s5Name.first} ${s5Name.last}`,
    visibleName: `${s5Name.first} ${s5Name.last}`,
    sortableName: `${s5Name.last}, ${s5Name.first}`,
    hasSubmission: false,
    submittedAt: null,
    late: false,
    missing: false,
    excused: true,
    score: null,
    grade: 'EX',
    attachments: [],
    existingComments: [{
      id: 20002,
      authorId: 999,
      authorName: 'Dr. Instructor',
      comment: 'Medical exemption approved.',
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    }],
  });

  // Student 6: On-time, not yet graded, multiple attachments
  const s6Name = generateStudentName(5);
  students.push({
    draftChangesCount: null,
    userId: 1006,
    userName: `${s6Name.first} ${s6Name.last}`,
    visibleName: `${s6Name.first} ${s6Name.last}`,
    sortableName: `${s6Name.last}, ${s6Name.first}`,
    hasSubmission: true,
    submittedAt: new Date(dueDate.getTime() - 30 * 60 * 1000).toISOString(), // 30 min early
    late: false,
    missing: false,
    excused: false,
    score: null,
    grade: null,
    attachments: [
      {
        id: 10004,
        displayName: 'Main_Essay.pdf',
        contentType: 'application/pdf',
        size: 628000,
        isPdf: true,
      },
      {
        id: 10005,
        displayName: 'References.docx',
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 45000,
        isPdf: false,
      },
    ],
    existingComments: [],
  });

  // Student 7: Perfect score
  const s7Name = generateStudentName(6);
  students.push({
    draftChangesCount: null,
    userId: 1007,
    userName: `${s7Name.first} ${s7Name.last}`,
    visibleName: `${s7Name.first} ${s7Name.last}`,
    sortableName: `${s7Name.last}, ${s7Name.first}`,
    hasSubmission: true,
    submittedAt: new Date(dueDate.getTime() - 24 * 60 * 60 * 1000).toISOString(), // 1 day early
    late: false,
    missing: false,
    excused: false,
    score: 100,
    grade: '100',
    attachments: [{
      id: 10006,
      displayName: 'Final_Submission.pdf',
      contentType: 'application/pdf',
      size: 890000,
      isPdf: true,
    }],
    existingComments: [{
      id: 20003,
      authorId: 999,
      authorName: 'Dr. Instructor',
      comment: 'Outstanding work! This is exemplary.',
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    }],
    rubricAssessments: {
      crit_1: { rating_id: 'r1a', comments: 'Exceptional thesis', points: 25 },
      crit_2: { rating_id: 'r2a', comments: 'Comprehensive research', points: 25 },
      crit_3: { rating_id: 'r3a', comments: '', points: 25 },
      crit_4: { rating_id: 'r4a', comments: '', points: 25 },
    },
  });

  // Student 8: Graded with feedback, slightly late
  const s8Name = generateStudentName(7);
  students.push({
    draftChangesCount: null,
    userId: 1008,
    userName: `${s8Name.first} ${s8Name.last}`,
    visibleName: `${s8Name.first} ${s8Name.last}`,
    sortableName: `${s8Name.last}, ${s8Name.first}`,
    hasSubmission: true,
    submittedAt: new Date(dueDate.getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours late
    late: true,
    missing: false,
    excused: false,
    secondsLate: 2 * 60 * 60,
    score: 85,
    grade: '85',
    attachments: [{
      id: 10007,
      displayName: 'Research_Paper_Morgan.pdf',
      contentType: 'application/pdf',
      size: 410000,
      isPdf: true,
    }],
    existingComments: [{
      id: 20004,
      authorId: 999,
      authorName: 'Dr. Instructor',
      comment: 'Good analysis. Consider expanding the conclusion.',
      createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
    }],
  });

  // Student 9: No submission yet (different from missing - just hasn't submitted)
  const s9Name = generateStudentName(8);
  students.push({
    draftChangesCount: null,
    userId: 1009,
    userName: `${s9Name.first} ${s9Name.last}`,
    visibleName: `${s9Name.first} ${s9Name.last}`,
    sortableName: `${s9Name.last}, ${s9Name.first}`,
    hasSubmission: false,
    submittedAt: null,
    late: false,
    missing: false,
    excused: false,
    score: null,
    grade: null,
    attachments: [],
    existingComments: [],
  });

  // Student 10: Graded low score
  const s10Name = generateStudentName(9);
  students.push({
    draftChangesCount: null,
    userId: 1010,
    userName: `${s10Name.first} ${s10Name.last}`,
    visibleName: `${s10Name.first} ${s10Name.last}`,
    sortableName: `${s10Name.last}, ${s10Name.first}`,
    hasSubmission: true,
    submittedAt: new Date(dueDate.getTime() - 1 * 60 * 60 * 1000).toISOString(),
    late: false,
    missing: false,
    excused: false,
    score: 58,
    grade: '58',
    attachments: [{
      id: 10008,
      displayName: 'Essay.pdf',
      contentType: 'application/pdf',
      size: 180000,
      isPdf: true,
    }],
    existingComments: [{
      id: 20005,
      authorId: 999,
      authorName: 'Dr. Instructor',
      comment: 'Please see me during office hours to discuss improvements.',
      createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
    }],
  });

  // Student 11-15: Additional variety
  for (let i = 10; i < 15; i++) {
    const name = generateStudentName(i);
    const isLate = i === 11;
    const hasSubmission = i !== 14;
    const submittedAt = hasSubmission
      ? new Date(dueDate.getTime() + (isLate ? 4 : -Math.random() * 48) * 60 * 60 * 1000).toISOString()
      : null;
    const score = hasSubmission && i !== 12 ? Math.floor(70 + Math.random() * 30) : null;

    students.push({
      draftChangesCount: null,
      userId: 1000 + i + 1,
      userName: `${name.first} ${name.last}`,
      visibleName: `${name.first} ${name.last}`,
      sortableName: `${name.last}, ${name.first}`,
      hasSubmission,
      submittedAt,
      late: isLate,
      missing: !hasSubmission && i === 14,
      excused: false,
      secondsLate: isLate ? 4 * 60 * 60 : undefined,
      score,
      grade: score?.toString() ?? null,
      attachments: hasSubmission ? [{
        id: 10000 + i,
        displayName: `Submission_${name.last}.pdf`,
        contentType: 'application/pdf',
        size: Math.floor(200000 + Math.random() * 600000),
        isPdf: true,
      }] : [],
      existingComments: [],
    });
  }

  return {
    submissions: students,
    assignmentName: 'Research Paper: Modern Developments',
    courseName: 'DEMO 101 - Introduction to Demo Course',
    courseCode: 'DEMO101',
    courseId: 99999,
    assignmentId: 88888,
    dueAt: dueDate.toISOString(),
    pointsPossible: 100,
    latePolicy: {
      lateSubmissionDeductionEnabled: true,
      lateSubmissionDeduction: 10,
      lateSubmissionInterval: 'day',
      lateSubmissionMinimumPercent: 50,
    },
    hasGroups: false,
    rubric: DEMO_RUBRIC,
  };
}
