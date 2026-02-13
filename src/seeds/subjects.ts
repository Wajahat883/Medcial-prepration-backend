/**
 * Subjects and Topics Seed Data
 * Complete hierarchy for AMC MCQ Exam Preparation Platform
 */

export interface ISubtopicSeed {
  name: string;
  displayOrder: number;
  isActive: boolean;
}

export interface ITopicSeed {
  name: string;
  displayOrder: number;
  isActive: boolean;
  subtopics: ISubtopicSeed[];
}

export interface ISubjectSeed {
  name: string;
  description: string;
  iconUrl?: string;
  displayOrder: number;
  color: string;
  isActive: boolean;
  topics: ITopicSeed[];
}

export const subjectsData: ISubjectSeed[] = [
  {
    name: 'Medicine',
    description: 'Internal Medicine including all medical subspecialties',
    iconUrl: '/icons/medicine.svg',
    displayOrder: 1,
    color: '#3B82F6',
    isActive: true,
    topics: [
      {
        name: 'Cardiology',
        displayOrder: 1,
        isActive: true,
        subtopics: [
          { name: 'Heart Failure', displayOrder: 1, isActive: true },
          { name: 'Arrhythmias', displayOrder: 2, isActive: true },
          { name: 'Valvular Heart Disease', displayOrder: 3, isActive: true },
          { name: 'Coronary Artery Disease', displayOrder: 4, isActive: true },
          { name: 'Hypertension', displayOrder: 5, isActive: true },
          { name: 'ECG Interpretation', displayOrder: 6, isActive: true },
          { name: 'Congenital Heart Disease', displayOrder: 7, isActive: true },
          { name: 'Pericardial Diseases', displayOrder: 8, isActive: true },
          { name: 'Infective Endocarditis', displayOrder: 9, isActive: true },
          { name: 'Cardiomyopathies', displayOrder: 10, isActive: true }
        ]
      },
      {
        name: 'Respiratory Medicine',
        displayOrder: 2,
        isActive: true,
        subtopics: [
          { name: 'Asthma', displayOrder: 1, isActive: true },
          { name: 'COPD', displayOrder: 2, isActive: true },
          { name: 'Pneumonia', displayOrder: 3, isActive: true },
          { name: 'Tuberculosis', displayOrder: 4, isActive: true },
          { name: 'Lung Cancer', displayOrder: 5, isActive: true },
          { name: 'Pulmonary Embolism', displayOrder: 6, isActive: true },
          { name: 'Interstitial Lung Disease', displayOrder: 7, isActive: true },
          { name: 'Pleural Diseases', displayOrder: 8, isActive: true },
          { name: 'Sleep Apnea', displayOrder: 9, isActive: true },
          { name: 'Respiratory Failure', displayOrder: 10, isActive: true }
        ]
      },
      {
        name: 'Gastroenterology',
        displayOrder: 3,
        isActive: true,
        subtopics: [
          { name: 'GERD', displayOrder: 1, isActive: true },
          { name: 'Peptic Ulcer Disease', displayOrder: 2, isActive: true },
          { name: 'Inflammatory Bowel Disease', displayOrder: 3, isActive: true },
          { name: 'Liver Diseases', displayOrder: 4, isActive: true },
          { name: 'Pancreatitis', displayOrder: 5, isActive: true },
          { name: 'Colorectal Cancer', displayOrder: 6, isActive: true },
          { name: 'Malabsorption', displayOrder: 7, isActive: true },
          { name: 'Irritable Bowel Syndrome', displayOrder: 8, isActive: true },
          { name: 'Hepatitis', displayOrder: 9, isActive: true },
          { name: 'GI Bleeding', displayOrder: 10, isActive: true }
        ]
      },
      {
        name: 'Nephrology',
        displayOrder: 4,
        isActive: true,
        subtopics: [
          { name: 'Chronic Kidney Disease', displayOrder: 1, isActive: true },
          { name: 'Acute Kidney Injury', displayOrder: 2, isActive: true },
          { name: 'Glomerulonephritis', displayOrder: 3, isActive: true },
          { name: 'Nephrotic Syndrome', displayOrder: 4, isActive: true },
          { name: 'Urinary Tract Infection', displayOrder: 5, isActive: true },
          { name: 'Electrolyte Disorders', displayOrder: 6, isActive: true },
          { name: 'Acid-Base Disorders', displayOrder: 7, isActive: true },
          { name: 'Renal Tubular Disorders', displayOrder: 8, isActive: true },
          { name: 'Polycystic Kidney Disease', displayOrder: 9, isActive: true },
          { name: 'Diabetic Nephropathy', displayOrder: 10, isActive: true }
        ]
      },
      {
        name: 'Endocrinology',
        displayOrder: 5,
        isActive: true,
        subtopics: [
          { name: 'Diabetes Mellitus', displayOrder: 1, isActive: true },
          { name: 'Thyroid Disorders', displayOrder: 2, isActive: true },
          { name: 'Adrenal Disorders', displayOrder: 3, isActive: true },
          { name: 'Pituitary Disorders', displayOrder: 4, isActive: true },
          { name: 'Calcium Disorders', displayOrder: 5, isActive: true },
          { name: 'PCOS', displayOrder: 6, isActive: true },
          { name: 'Osteoporosis', displayOrder: 7, isActive: true },
          { name: 'Dyslipidemia', displayOrder: 8, isActive: true },
          { name: 'Metabolic Syndrome', displayOrder: 9, isActive: true },
          { name: 'Hypoglycemia', displayOrder: 10, isActive: true }
        ]
      },
      {
        name: 'Neurology',
        displayOrder: 6,
        isActive: true,
        subtopics: [
          { name: 'Stroke', displayOrder: 1, isActive: true },
          { name: 'Seizures & Epilepsy', displayOrder: 2, isActive: true },
          { name: 'Headache', displayOrder: 3, isActive: true },
          { name: 'Parkinson Disease', displayOrder: 4, isActive: true },
          { name: 'Multiple Sclerosis', displayOrder: 5, isActive: true },
          { name: 'Dementia', displayOrder: 6, isActive: true },
          { name: 'Neuropathy', displayOrder: 7, isActive: true },
          { name: 'Myasthenia Gravis', displayOrder: 8, isActive: true },
          { name: 'Meningitis', displayOrder: 9, isActive: true },
          { name: 'Guillain-Barre Syndrome', displayOrder: 10, isActive: true }
        ]
      },
      {
        name: 'Rheumatology',
        displayOrder: 7,
        isActive: true,
        subtopics: [
          { name: 'Rheumatoid Arthritis', displayOrder: 1, isActive: true },
          { name: 'Systemic Lupus Erythematosus', displayOrder: 2, isActive: true },
          { name: 'Osteoarthritis', displayOrder: 3, isActive: true },
          { name: 'Gout', displayOrder: 4, isActive: true },
          { name: 'Spondyloarthropathies', displayOrder: 5, isActive: true },
          { name: 'Systemic Sclerosis', displayOrder: 6, isActive: true },
          { name: 'Vasculitis', displayOrder: 7, isActive: true },
          { name: 'Sjogren Syndrome', displayOrder: 8, isActive: true },
          { name: 'Polymyalgia Rheumatica', displayOrder: 9, isActive: true },
          { name: 'Temporal Arteritis', displayOrder: 10, isActive: true }
        ]
      },
      {
        name: 'Dermatology',
        displayOrder: 8,
        isActive: true,
        subtopics: [
          { name: 'Psoriasis', displayOrder: 1, isActive: true },
          { name: 'Eczema', displayOrder: 2, isActive: true },
          { name: 'Acne', displayOrder: 3, isActive: true },
          { name: 'Skin Cancer', displayOrder: 4, isActive: true },
          { name: 'Drug Eruptions', displayOrder: 5, isActive: true },
          { name: 'Infections', displayOrder: 6, isActive: true },
          { name: 'Bullous Diseases', displayOrder: 7, isActive: true },
          { name: 'Vasculitis', displayOrder: 8, isActive: true },
          { name: 'Hair Disorders', displayOrder: 9, isActive: true },
          { name: 'Nail Disorders', displayOrder: 10, isActive: true }
        ]
      },
      {
        name: 'Hematology',
        displayOrder: 9,
        isActive: true,
        subtopics: [
          { name: 'Anemia', displayOrder: 1, isActive: true },
          { name: 'Leukemia', displayOrder: 2, isActive: true },
          { name: 'Lymphoma', displayOrder: 3, isActive: true },
          { name: 'Coagulation Disorders', displayOrder: 4, isActive: true },
          { name: 'Myeloproliferative Disorders', displayOrder: 5, isActive: true },
          { name: 'Bleeding Disorders', displayOrder: 6, isActive: true },
          { name: 'Thrombocytopenia', displayOrder: 7, isActive: true },
          { name: 'Hemoglobinopathies', displayOrder: 8, isActive: true },
          { name: 'Transfusion Medicine', displayOrder: 9, isActive: true },
          { name: 'Plasma Cell Disorders', displayOrder: 10, isActive: true }
        ]
      },
      {
        name: 'Infectious Diseases',
        displayOrder: 10,
        isActive: true,
        subtopics: [
          { name: 'HIV/AIDS', displayOrder: 1, isActive: true },
          { name: 'Sepsis', displayOrder: 2, isActive: true },
          { name: 'Malaria', displayOrder: 3, isActive: true },
          { name: 'Tuberculosis', displayOrder: 4, isActive: true },
          { name: 'Infective Endocarditis', displayOrder: 5, isActive: true },
          { name: 'Meningitis', displayOrder: 6, isActive: true },
          { name: 'Cellulitis', displayOrder: 7, isActive: true },
          { name: 'Osteomyelitis', displayOrder: 8, isActive: true },
          { name: 'Travel Medicine', displayOrder: 9, isActive: true },
          { name: 'Antibiotic Stewardship', displayOrder: 10, isActive: true }
        ]
      }
    ]
  },
  {
    name: 'Surgery',
    description: 'General Surgery and Surgical Specialties',
    iconUrl: '/icons/surgery.svg',
    displayOrder: 2,
    color: '#EF4444',
    isActive: true,
    topics: [
      {
        name: 'General Surgery',
        displayOrder: 1,
        isActive: true,
        subtopics: [
          { name: 'Acute Abdomen', displayOrder: 1, isActive: true },
          { name: 'Appendicitis', displayOrder: 2, isActive: true },
          { name: 'Gallbladder Disease', displayOrder: 3, isActive: true },
          { name: 'Hernias', displayOrder: 4, isActive: true },
          { name: 'Bowel Obstruction', displayOrder: 5, isActive: true },
          { name: 'GI Bleeding', displayOrder: 6, isActive: true },
          { name: 'Peritonitis', displayOrder: 7, isActive: true },
          { name: 'Abdominal Trauma', displayOrder: 8, isActive: true },
          { name: 'Breast Surgery', displayOrder: 9, isActive: true },
          { name: 'Thyroid Surgery', displayOrder: 10, isActive: true }
        ]
      },
      {
        name: 'Orthopedics',
        displayOrder: 2,
        isActive: true,
        subtopics: [
          { name: 'Fractures', displayOrder: 1, isActive: true },
          { name: 'Joint Replacement', displayOrder: 2, isActive: true },
          { name: 'Low Back Pain', displayOrder: 3, isActive: true },
          { name: 'Osteoarthritis', displayOrder: 4, isActive: true },
          { name: 'Osteomyelitis', displayOrder: 5, isActive: true },
          { name: 'Bone Tumors', displayOrder: 6, isActive: true },
          { name: 'Sports Injuries', displayOrder: 7, isActive: true },
          { name: 'Pediatric Orthopedics', displayOrder: 8, isActive: true },
          { name: 'Hand Surgery', displayOrder: 9, isActive: true },
          { name: 'Spine Disorders', displayOrder: 10, isActive: true }
        ]
      },
      {
        name: 'Neurosurgery',
        displayOrder: 3,
        isActive: true,
        subtopics: [
          { name: 'Head Injury', displayOrder: 1, isActive: true },
          { name: 'Spinal Cord Injury', displayOrder: 2, isActive: true },
          { name: 'Brain Tumors', displayOrder: 3, isActive: true },
          { name: 'Hydrocephalus', displayOrder: 4, isActive: true },
          { name: 'Subarachnoid Hemorrhage', displayOrder: 5, isActive: true },
          { name: 'CNS Infections', displayOrder: 6, isActive: true }
        ]
      },
      {
        name: 'Cardiothoracic Surgery',
        displayOrder: 4,
        isActive: true,
        subtopics: [
          { name: 'CABG', displayOrder: 1, isActive: true },
          { name: 'Valve Surgery', displayOrder: 2, isActive: true },
          { name: 'Lung Cancer Surgery', displayOrder: 3, isActive: true },
          { name: 'Thoracic Trauma', displayOrder: 4, isActive: true }
        ]
      },
      {
        name: 'Vascular Surgery',
        displayOrder: 5,
        isActive: true,
        subtopics: [
          { name: 'Aortic Aneurysm', displayOrder: 1, isActive: true },
          { name: 'Peripheral Artery Disease', displayOrder: 2, isActive: true },
          { name: 'Deep Vein Thrombosis', displayOrder: 3, isActive: true },
          { name: 'Varicose Veins', displayOrder: 4, isActive: true },
          { name: 'Lymphedema', displayOrder: 5, isActive: true }
        ]
      },
      {
        name: 'Urology',
        displayOrder: 6,
        isActive: true,
        subtopics: [
          { name: 'Urinary Tract Stones', displayOrder: 1, isActive: true },
          { name: 'Prostate Disease', displayOrder: 2, isActive: true },
          { name: 'Bladder Cancer', displayOrder: 3, isActive: true },
          { name: 'Renal Cancer', displayOrder: 4, isActive: true },
          { name: 'Testicular Disorders', displayOrder: 5, isActive: true },
          { name: 'Urinary Incontinence', displayOrder: 6, isActive: true }
        ]
      }
    ]
  },
  {
    name: 'Obstetrics & Gynecology',
    description: 'Women\'s health, pregnancy, and reproductive medicine',
    iconUrl: '/icons/obgyn.svg',
    displayOrder: 3,
    color: '#EC4899',
    isActive: true,
    topics: [
      {
        name: 'Obstetrics',
        displayOrder: 1,
        isActive: true,
        subtopics: [
          { name: 'Normal Pregnancy', displayOrder: 1, isActive: true },
          { name: 'Antenatal Care', displayOrder: 2, isActive: true },
          { name: 'Labor and Delivery', displayOrder: 3, isActive: true },
          { name: 'Postpartum Care', displayOrder: 4, isActive: true },
          { name: 'Hypertensive Disorders', displayOrder: 5, isActive: true },
          { name: 'Gestational Diabetes', displayOrder: 6, isActive: true },
          { name: 'Fetal Growth Disorders', displayOrder: 7, isActive: true },
          { name: 'Multiple Pregnancy', displayOrder: 8, isActive: true },
          { name: 'Preterm Labor', displayOrder: 9, isActive: true },
          { name: 'Antepartum Hemorrhage', displayOrder: 10, isActive: true }
        ]
      },
      {
        name: 'Gynecology',
        displayOrder: 2,
        isActive: true,
        subtopics: [
          { name: 'Menstrual Disorders', displayOrder: 1, isActive: true },
          { name: 'Endometriosis', displayOrder: 2, isActive: true },
          { name: 'Uterine Fibroids', displayOrder: 3, isActive: true },
          { name: 'Ovarian Cysts', displayOrder: 4, isActive: true },
          { name: 'PCOS', displayOrder: 5, isActive: true },
          { name: 'Cervical Cancer', displayOrder: 6, isActive: true },
          { name: 'Endometrial Cancer', displayOrder: 7, isActive: true },
          { name: 'Ovarian Cancer', displayOrder: 8, isActive: true },
          { name: 'Pelvic Inflammatory Disease', displayOrder: 9, isActive: true },
          { name: 'Vaginal Infections', displayOrder: 10, isActive: true }
        ]
      },
      {
        name: 'Family Planning',
        displayOrder: 3,
        isActive: true,
        subtopics: [
          { name: 'Contraception', displayOrder: 1, isActive: true },
          { name: 'Infertility', displayOrder: 2, isActive: true },
          { name: 'Menopause', displayOrder: 3, isActive: true }
        ]
      }
    ]
  },
  {
    name: 'Pediatrics',
    description: 'Child health from newborn to adolescence',
    iconUrl: '/icons/pediatrics.svg',
    displayOrder: 4,
    color: '#F59E0B',
    isActive: true,
    topics: [
      {
        name: 'Neonatology',
        displayOrder: 1,
        isActive: true,
        subtopics: [
          { name: 'Newborn Examination', displayOrder: 1, isActive: true },
          { name: 'Neonatal Jaundice', displayOrder: 2, isActive: true },
          { name: 'Respiratory Distress', displayOrder: 3, isActive: true },
          { name: 'Neonatal Infections', displayOrder: 4, isActive: true },
          { name: 'Prematurity', displayOrder: 5, isActive: true }
        ]
      },
      {
        name: 'Pediatric Medicine',
        displayOrder: 2,
        isActive: true,
        subtopics: [
          { name: 'Growth and Development', displayOrder: 1, isActive: true },
          { name: 'Nutrition', displayOrder: 2, isActive: true },
          { name: 'Immunization', displayOrder: 3, isActive: true },
          { name: 'Febrile Child', displayOrder: 4, isActive: true },
          { name: 'Respiratory Infections', displayOrder: 5, isActive: true },
          { name: 'Diarrhea and Dehydration', displayOrder: 6, isActive: true },
          { name: 'Seizures', displayOrder: 7, isActive: true },
          { name: 'Pediatric Rash', displayOrder: 8, isActive: true },
          { name: 'Congenital Anomalies', displayOrder: 9, isActive: true },
          { name: 'Genetic Disorders', displayOrder: 10, isActive: true }
        ]
      },
      {
        name: 'Pediatric Emergencies',
        displayOrder: 3,
        isActive: true,
        subtopics: [
          { name: 'Acute Asthma', displayOrder: 1, isActive: true },
          { name: 'Anaphylaxis', displayOrder: 2, isActive: true },
          { name: 'Poisoning', displayOrder: 3, isActive: true },
          { name: 'Trauma', displayOrder: 4, isActive: true },
          { name: 'Sepsis', displayOrder: 5, isActive: true }
        ]
      }
    ]
  },
  {
    name: 'Psychiatry',
    description: 'Mental health and behavioral disorders',
    iconUrl: '/icons/psychiatry.svg',
    displayOrder: 5,
    color: '#8B5CF6',
    isActive: true,
    topics: [
      {
        name: 'Mood Disorders',
        displayOrder: 1,
        isActive: true,
        subtopics: [
          { name: 'Major Depression', displayOrder: 1, isActive: true },
          { name: 'Bipolar Disorder', displayOrder: 2, isActive: true },
          { name: 'Dysthymia', displayOrder: 3, isActive: true },
          { name: 'Postpartum Depression', displayOrder: 4, isActive: true }
        ]
      },
      {
        name: 'Anxiety Disorders',
        displayOrder: 2,
        isActive: true,
        subtopics: [
          { name: 'Generalized Anxiety', displayOrder: 1, isActive: true },
          { name: 'Panic Disorder', displayOrder: 2, isActive: true },
          { name: 'Phobias', displayOrder: 3, isActive: true },
          { name: 'OCD', displayOrder: 4, isActive: true },
          { name: 'PTSD', displayOrder: 5, isActive: true },
          { name: 'Social Anxiety', displayOrder: 6, isActive: true }
        ]
      },
      {
        name: 'Psychotic Disorders',
        displayOrder: 3,
        isActive: true,
        subtopics: [
          { name: 'Schizophrenia', displayOrder: 1, isActive: true },
          { name: 'Delusional Disorder', displayOrder: 2, isActive: true },
          { name: 'Brief Psychotic Disorder', displayOrder: 3, isActive: true }
        ]
      },
      {
        name: 'Other Disorders',
        displayOrder: 4,
        isActive: true,
        subtopics: [
          { name: 'Personality Disorders', displayOrder: 1, isActive: true },
          { name: 'Eating Disorders', displayOrder: 2, isActive: true },
          { name: 'Substance Abuse', displayOrder: 3, isActive: true },
          { name: 'ADHD', displayOrder: 4, isActive: true },
          { name: 'Autism Spectrum', displayOrder: 5, isActive: true },
          { name: 'Sleep Disorders', displayOrder: 6, isActive: true },
          { name: 'Suicide and Self-harm', displayOrder: 7, isActive: true },
          { name: 'Consultation-Liaison', displayOrder: 8, isActive: true }
        ]
      }
    ]
  },
  {
    name: 'Emergency Medicine',
    description: 'Acute care and emergency management',
    iconUrl: '/icons/emergency.svg',
    displayOrder: 6,
    color: '#DC2626',
    isActive: true,
    topics: [
      {
        name: 'Cardiovascular Emergencies',
        displayOrder: 1,
        isActive: true,
        subtopics: [
          { name: 'Acute MI', displayOrder: 1, isActive: true },
          { name: 'Cardiac Arrest', displayOrder: 2, isActive: true },
          { name: 'Heart Failure', displayOrder: 3, isActive: true },
          { name: 'Aortic Dissection', displayOrder: 4, isActive: true },
          { name: 'Hypertensive Emergency', displayOrder: 5, isActive: true }
        ]
      },
      {
        name: 'Trauma',
        displayOrder: 2,
        isActive: true,
        subtopics: [
          { name: 'ATLS Principles', displayOrder: 1, isActive: true },
          { name: 'Head Trauma', displayOrder: 2, isActive: true },
          { name: 'Chest Trauma', displayOrder: 3, isActive: true },
          { name: 'Abdominal Trauma', displayOrder: 4, isActive: true },
          { name: 'Spinal Trauma', displayOrder: 5, isActive: true },
          { name: 'Burns', displayOrder: 6, isActive: true },
          { name: 'Polytrauma', displayOrder: 7, isActive: true }
        ]
      },
      {
        name: 'Medical Emergencies',
        displayOrder: 3,
        isActive: true,
        subtopics: [
          { name: 'Anaphylaxis', displayOrder: 1, isActive: true },
          { name: 'Sepsis', displayOrder: 2, isActive: true },
          { name: 'DKA', displayOrder: 3, isActive: true },
          { name: 'Thyroid Storm', displayOrder: 4, isActive: true },
          { name: 'Electrolyte Emergencies', displayOrder: 5, isActive: true },
          { name: 'Poisoning', displayOrder: 6, isActive: true },
          { name: 'Environmental Emergencies', displayOrder: 7, isActive: true }
        ]
      },
      {
        name: 'Respiratory Emergencies',
        displayOrder: 4,
        isActive: true,
        subtopics: [
          { name: 'Airway Management', displayOrder: 1, isActive: true },
          { name: 'Asthma Exacerbation', displayOrder: 2, isActive: true },
          { name: 'COPD Exacerbation', displayOrder: 3, isActive: true },
          { name: 'Pulmonary Edema', displayOrder: 4, isActive: true },
          { name: 'Pneumothorax', displayOrder: 5, isActive: true }
        ]
      }
    ]
  },
  {
    name: 'Public Health',
    description: 'Community medicine and preventive health',
    iconUrl: '/icons/public-health.svg',
    displayOrder: 7,
    color: '#10B981',
    isActive: true,
    topics: [
      {
        name: 'Epidemiology',
        displayOrder: 1,
        isActive: true,
        subtopics: [
          { name: 'Study Designs', displayOrder: 1, isActive: true },
          { name: 'Measures of Disease', displayOrder: 2, isActive: true },
          { name: 'Screening Tests', displayOrder: 3, isActive: true },
          { name: 'Outbreak Investigation', displayOrder: 4, isActive: true },
          { name: 'Biostatistics', displayOrder: 5, isActive: true }
        ]
      },
      {
        name: 'Preventive Medicine',
        displayOrder: 2,
        isActive: true,
        subtopics: [
          { name: 'Immunization', displayOrder: 1, isActive: true },
          { name: 'Health Promotion', displayOrder: 2, isActive: true },
          { name: 'Disease Prevention', displayOrder: 3, isActive: true },
          { name: 'Screening Programs', displayOrder: 4, isActive: true }
        ]
      },
      {
        name: 'Community Health',
        displayOrder: 3,
        isActive: true,
        subtopics: [
          { name: 'Healthcare Systems', displayOrder: 1, isActive: true },
          { name: 'Health Equity', displayOrder: 2, isActive: true },
          { name: 'Aboriginal Health', displayOrder: 3, isActive: true },
          { name: 'Occupational Health', displayOrder: 4, isActive: true },
          { name: 'Environmental Health', displayOrder: 5, isActive: true }
        ]
      }
    ]
  },
  {
    name: 'Basic Sciences',
    description: 'Foundational medical sciences',
    iconUrl: '/icons/basic-sciences.svg',
    displayOrder: 8,
    color: '#6366F1',
    isActive: true,
    topics: [
      {
        name: 'Anatomy',
        displayOrder: 1,
        isActive: true,
        subtopics: [
          { name: 'Gross Anatomy', displayOrder: 1, isActive: true },
          { name: 'Embryology', displayOrder: 2, isActive: true },
          { name: 'Histology', displayOrder: 3, isActive: true },
          { name: 'Neuroanatomy', displayOrder: 4, isActive: true }
        ]
      },
      {
        name: 'Physiology',
        displayOrder: 2,
        isActive: true,
        subtopics: [
          { name: 'Cardiovascular Physiology', displayOrder: 1, isActive: true },
          { name: 'Respiratory Physiology', displayOrder: 2, isActive: true },
          { name: 'Renal Physiology', displayOrder: 3, isActive: true },
          { name: 'GI Physiology', displayOrder: 4, isActive: true },
          { name: 'Endocrine Physiology', displayOrder: 5, isActive: true },
          { name: 'Neurophysiology', displayOrder: 6, isActive: true }
        ]
      },
      {
        name: 'Pathology',
        displayOrder: 3,
        isActive: true,
        subtopics: [
          { name: 'General Pathology', displayOrder: 1, isActive: true },
          { name: 'Systemic Pathology', displayOrder: 2, isActive: true },
          { name: 'Hematopathology', displayOrder: 3, isActive: true }
        ]
      },
      {
        name: 'Pharmacology',
        displayOrder: 4,
        isActive: true,
        subtopics: [
          { name: 'Pharmacokinetics', displayOrder: 1, isActive: true },
          { name: 'Pharmacodynamics', displayOrder: 2, isActive: true },
          { name: 'Autonomic Pharmacology', displayOrder: 3, isActive: true },
          { name: 'Cardiovascular Drugs', displayOrder: 4, isActive: true },
          { name: 'Antibiotics', displayOrder: 5, isActive: true },
          { name: 'CNS Drugs', displayOrder: 6, isActive: true },
          { name: 'Analgesics', displayOrder: 7, isActive: true },
          { name: 'Drug Interactions', displayOrder: 8, isActive: true },
          { name: 'Adverse Drug Reactions', displayOrder: 9, isActive: true }
        ]
      },
      {
        name: 'Microbiology',
        displayOrder: 5,
        isActive: true,
        subtopics: [
          { name: 'Bacteriology', displayOrder: 1, isActive: true },
          { name: 'Virology', displayOrder: 2, isActive: true },
          { name: 'Mycology', displayOrder: 3, isActive: true },
          { name: 'Parasitology', displayOrder: 4, isActive: true },
          { name: 'Immunology', displayOrder: 5, isActive: true }
        ]
      }
    ]
  }
];
