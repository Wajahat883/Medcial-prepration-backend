/**
 * Database seeding utility
 * Run with: npm run seed
 */

// New helper: initialize indexes and minimal governance entries
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User';
import { Question } from '../models/Question';
import { UserProgress } from '../models/UserProgress';

dotenv.config();

// Sample AMC MCQ Questions
const sampleQuestions = [
  {
    questionText: 'A 45-year-old man presents with crushing chest pain radiating to his left arm. ECG shows ST elevation in leads V1-V4. What is the most likely diagnosis?',
    options: [
      'Acute pericarditis',
      'Acute anterior ST-elevation myocardial infarction (STEMI)',
      'Unstable angina',
      'Aortic dissection',
      'Pulmonary embolism',
    ],
    correctAnswer: 1,
    explanation: 'ST elevation in leads V1-V4 indicates anterior wall involvement, characteristic of an anterior STEMI. This requires immediate reperfusion therapy.',
    category: 'Cardiology',
    subcategory: 'Acute Coronary Syndrome',
    difficulty: 'medium',
    tags: ['ECG', 'chest pain', 'STEMI', 'MI'],
    isActive: true,
  },
  {
    questionText: 'A 28-year-old woman presents with fatigue, pallor, and pica (eating ice). Laboratory studies show: Hb 85g/L, MCV 68fL, Ferritin 8μg/L. What is the most likely diagnosis?',
    options: [
      'Vitamin B12 deficiency',
      'Iron deficiency anemia',
      'Anemia of chronic disease',
      'Thalassemia trait',
      'Sideroblastic anemia',
    ],
    correctAnswer: 1,
    explanation: 'Low MCV (microcytic), low ferritin, and pica are classic for iron deficiency anemia. The low ferritin confirms depleted iron stores.',
    category: 'Haematology',
    subcategory: 'Anemias',
    difficulty: 'easy',
    tags: ['anemia', 'iron', 'MCV', 'ferritin'],
    isActive: true,
  },
  {
    questionText: 'A 65-year-old man with type 2 diabetes presents with numbness and tingling in his feet in a "stocking" distribution. What is the most likely cause?',
    options: [
      'Multiple sclerosis',
      'Diabetic peripheral neuropathy',
      'Lumbar radiculopathy',
      'Vitamin B12 deficiency',
      'Syphilis',
    ],
    correctAnswer: 1,
    explanation: 'Symmetric distal sensory neuropathy in a stocking distribution is the most common form of diabetic neuropathy.',
    category: 'Endocrinology',
    subcategory: 'Diabetes Complications',
    difficulty: 'easy',
    tags: ['diabetes', 'neuropathy', 'neurology'],
    isActive: true,
  },
  {
    questionText: 'A 30-year-old man presents with episodic wheezing and shortness of breath, worse at night and with exercise. He has a history of eczema. What is the most appropriate initial diagnostic test?',
    options: [
      'Chest X-ray',
      'Spirometry with bronchodilator response',
      'CT chest',
      'Bronchoscopy',
      'Echocardiogram',
    ],
    correctAnswer: 1,
    explanation: 'The clinical picture suggests asthma. Spirometry with bronchodilator response showing reversible airway obstruction is the diagnostic test of choice.',
    category: 'Respiratory',
    subcategory: 'Asthma',
    difficulty: 'easy',
    tags: ['asthma', 'spirometry', 'wheeze', 'COPD'],
    isActive: true,
  },
  {
    questionText: 'A 55-year-old man presents with jaundice, dark urine, and pale stools. Laboratory studies show elevated conjugated bilirubin and alkaline phosphatase. What is the most likely diagnosis?',
    options: [
      'Hepatitis A',
      'Gilbert syndrome',
      'Obstructive jaundice',
      'Hemolytic anemia',
      'Crigler-Najjar syndrome',
    ],
    correctAnswer: 2,
    explanation: 'Elevated conjugated bilirubin with pale stools suggests obstructive jaundice (cholestasis). The elevated ALP supports a biliary obstruction.',
    category: 'Gastroenterology',
    subcategory: 'Liver Disease',
    difficulty: 'medium',
    tags: ['jaundice', 'bilirubin', 'liver', 'cholestasis'],
    isActive: true,
  },
  {
    questionText: 'A 25-year-old woman presents with joint pain, photosensitivity rash, and proteinuria. ANA is positive. What is the most likely diagnosis?',
    options: [
      'Rheumatoid arthritis',
      'Systemic lupus erythematosus',
      'Sjögren syndrome',
      'Scleroderma',
      'Dermatomyositis',
    ],
    correctAnswer: 1,
    explanation: 'The combination of arthritis, photosensitive rash, and renal involvement with positive ANA is classic for systemic lupus erythematosus (SLE).',
    category: 'Rheumatology',
    subcategory: 'Autoimmune Diseases',
    difficulty: 'medium',
    tags: ['SLE', 'lupus', 'ANA', 'nephritis'],
    isActive: true,
  },
  {
    questionText: 'A 40-year-old man presents with severe headache, fever, and neck stiffness. Lumbar puncture shows: Opening pressure elevated, WBC 1000/μL (predominantly neutrophils), glucose low, protein elevated. What is the most likely diagnosis?',
    options: [
      'Viral meningitis',
      'Bacterial meningitis',
      'Subarachnoid hemorrhage',
      'Multiple sclerosis',
      'Guillain-Barré syndrome',
    ],
    correctAnswer: 1,
    explanation: 'Low glucose with neutrophilic pleocytosis is characteristic of bacterial meningitis. Viral meningitis typically shows normal glucose and lymphocytic predominance.',
    category: 'Neurology',
    subcategory: 'Infections',
    difficulty: 'medium',
    tags: ['meningitis', 'CSF', 'lumbar puncture', 'infection'],
    isActive: true,
  },
  {
    questionText: 'A 60-year-old smoker presents with hematuria and a renal mass on ultrasound. CT shows a solid enhancing renal mass. What is the most likely diagnosis?',
    options: [
      'Renal cell carcinoma',
      'Renal cyst',
      'Transitional cell carcinoma',
      'Nephroblastoma',
      'Angiomyolipoma',
    ],
    correctAnswer: 0,
    explanation: 'Solid enhancing renal mass in an adult is renal cell carcinoma until proven otherwise. The classic triad is hematuria, flank pain, and palpable mass.',
    category: 'Oncology',
    subcategory: 'Genitourinary Cancers',
    difficulty: 'medium',
    tags: ['kidney', 'cancer', 'RCC', 'hematuria'],
    isActive: true,
  },
  {
    questionText: 'A 35-year-old woman at 32 weeks gestation presents with severe headache, visual disturbances, and proteinuria. Blood pressure is 170/110 mmHg. What is the most likely diagnosis?',
    options: [
      'Chronic hypertension',
      'Gestational hypertension',
      'Pre-eclampsia',
      'Eclampsia',
      'Migraine',
    ],
    correctAnswer: 2,
    explanation: 'New-onset hypertension with proteinuria and neurological symptoms after 20 weeks gestation is diagnostic of pre-eclampsia.',
    category: 'Obstetrics',
    subcategory: 'Hypertensive Disorders',
    difficulty: 'medium',
    tags: ['pregnancy', 'pre-eclampsia', 'hypertension', 'proteinuria'],
    isActive: true,
  },
  {
    questionText: 'A 50-year-old man presents with polyuria, polydipsia, and weight loss. Random glucose is 15 mmol/L. HbA1c is 9.5%. What is the most appropriate initial management?',
    options: [
      'Insulin therapy immediately',
      'Lifestyle modification only',
      'Metformin and lifestyle modification',
      'Sulfonylurea monotherapy',
      'Wait for confirmatory testing',
    ],
    correctAnswer: 2,
    explanation: 'HbA1c > 6.5% with symptoms confirms type 2 diabetes. Metformin plus lifestyle modification is first-line therapy unless contraindicated.',
    category: 'Endocrinology',
    subcategory: 'Diabetes Mellitus',
    difficulty: 'easy',
    tags: ['diabetes', 'metformin', 'HbA1c', 'hyperglycemia'],
    isActive: true,
  },
];

// Create test users
const createTestUsers = async () => {
  console.log('Creating test users...');

  const users = [
    {
      email: 'admin@medprep.com',
      password: 'admin123',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
    },
    {
      email: 'student@medprep.com',
      password: 'student123',
      firstName: 'Student',
      lastName: 'User',
      role: 'user',
    },
  ];

  for (const userData of users) {
    const existingUser = await User.findOne({ email: userData.email });
    if (!existingUser) {
      const user = await User.create(userData);
      await UserProgress.create({ user: user._id });
      console.log(`Created user: ${userData.email}`);
    } else {
      console.log(`User already exists: ${userData.email}`);
    }
  }
};

// Create sample questions
const createSampleQuestions = async () => {
  console.log('Creating sample questions...');

  for (const questionData of sampleQuestions) {
    const existingQuestion = await Question.findOne({
      questionText: questionData.questionText,
    });

    if (!existingQuestion) {
      await Question.create(questionData);
      console.log(`Created question: ${questionData.category} - ${questionData.subcategory}`);
    } else {
      console.log(`Question already exists: ${questionData.category}`);
    }
  }
};

// Main seed function
const seedDatabase = async () => {
  try {
    // Connect to database
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/medical-exam-prep';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Clear existing data (optional - remove if you want to keep existing data)
    // await Question.deleteMany({});
    // console.log('Cleared existing questions');

    // Create data
    await createTestUsers();
    await createSampleQuestions();

    console.log('\nSeeding completed successfully!');
    console.log('\nTest Users:');
    console.log('  Admin: admin@medprep.com / admin123');
    console.log('  Student: student@medprep.com / student123');

  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

export { seedDatabase };

const initialize = async () => {
  try {
    const mongoose = require('mongoose');
    const models = require('../models').default || require('../models');

    console.log('Ensuring indexes for models...');
    for (const name of Object.keys(models)) {
      const model = models[name];
      if (model && model.ensureIndexes) {
        await model.ensureIndexes();
        console.log(`Indexes ensured for ${name}`);
      }
    }

    // Create a sample governance entry if none exists
    const QuestionContentGovernance = models.QuestionContentGovernance;
    if (QuestionContentGovernance) {
      const count = await QuestionContentGovernance.countDocuments();
      if (count === 0) {
        await QuestionContentGovernance.create({ questionId: mongoose.Types.ObjectId(), currentStatus: 'draft', workflowStage: 'draft' });
        console.log('Created sample QuestionContentGovernance entry');
      }
    }
  } catch (e) {
    console.warn('Initialization helper failed:', e);
  }
};

if (require.main === module) {
  initialize();
}
