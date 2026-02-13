/**
 * Database Seed Runner
 * Populates MongoDB with initial subjects, topics, and questions data
 */

import mongoose from "mongoose";
import { subjectsData } from "./subjects";
import { allSeedQuestions } from "./seedData";
import { extendedQuestions } from "./seedDataExtended";
import { part3Questions } from "./seedDataPart3";

// Configuration
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/medical_exam_prep";

// Mongoose Schema Definitions
const SubjectSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  iconUrl: String,
  displayOrder: { type: Number, default: 0 },
  color: String,
  isActive: { type: Boolean, default: true },
  questionCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const TopicSchema = new mongoose.Schema({
  name: { type: String, required: true },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject",
    required: true,
  },
  description: String,
  parentTopicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Topic",
    default: null,
  },
  displayOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  questionCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const QuestionOptionSchema = new mongoose.Schema(
  {
    label: { type: String, enum: ["A", "B", "C", "D", "E"], required: true },
    text: { type: String, required: true },
    explanation: String,
  },
  { _id: false },
);

const QuestionStatisticsSchema = new mongoose.Schema(
  {
    timesAttempted: { type: Number, default: 0 },
    timesCorrect: { type: Number, default: 0 },
    correctRate: { type: Number, default: 0 },
    averageTimeSpent: { type: Number, default: 0 },
  },
  { _id: false },
);

const QuestionSchema = new mongoose.Schema({
  questionStem: { type: String, required: true },
  questionType: {
    type: String,
    enum: [
      "single_best_answer",
      "clinical_vignette",
      "image_based",
      "ecg_interpretation",
      "lab_interpretation",
      "drug_selection",
      "diagnosis",
      "management",
    ],
    default: "single_best_answer",
  },
  options: { type: [QuestionOptionSchema], required: true },
  correctAnswer: {
    type: String,
    enum: ["A", "B", "C", "D", "E"],
    required: true,
  },
  explanation: { type: String, required: true },
  teachingPoints: String,
  wrongAnswerAnalysis: mongoose.Schema.Types.Mixed,
  references: [String],
  subject: { type: String, required: true },
  topic: { type: String, required: true },
  subtopic: String,
  difficultyLevel: {
    type: String,
    enum: ["easy", "medium", "hard"],
    default: "medium",
  },
  isHighYield: { type: Boolean, default: false },
  tags: [String],
  statistics: { type: QuestionStatisticsSchema, default: () => ({}) },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Create models
const Subject = mongoose.model("Subject", SubjectSchema);
const Topic = mongoose.model("Topic", TopicSchema);
const Question = mongoose.model("Question", QuestionSchema);

// Clear existing data
async function clearExistingData(): Promise<void> {
  console.log("Clearing existing data...");
  try {
    await Subject.deleteMany({});
    await Topic.deleteMany({});
    await Question.deleteMany({});
    console.log("Existing data cleared");
  } catch (error) {
    console.error("Error clearing data:", error);
    throw error;
  }
}

// Seed subjects and topics
async function seedSubjectsAndTopics(): Promise<Map<string, string>> {
  console.log("Seeding subjects and topics...");
  const subjectIdMap = new Map<string, string>();

  try {
    for (const subjectData of subjectsData) {
      const subject = await Subject.create({
        name: subjectData.name,
        description: subjectData.description,
        iconUrl: subjectData.iconUrl,
        displayOrder: subjectData.displayOrder,
        color: subjectData.color,
        isActive: subjectData.isActive,
        questionCount: 0,
      });

      subjectIdMap.set(subjectData.name, subject._id.toString());
      console.log(`  Created subject: ${subjectData.name}`);

      for (const topicData of subjectData.topics) {
        const topic = await Topic.create({
          name: topicData.name,
          subjectId: subject._id,
          parentTopicId: null,
          displayOrder: topicData.displayOrder,
          isActive: topicData.isActive,
          questionCount: 0,
        });

        if (topicData.subtopics && topicData.subtopics.length > 0) {
          for (const subtopicData of topicData.subtopics) {
            await Topic.create({
              name: subtopicData.name,
              subjectId: subject._id,
              parentTopicId: topic._id,
              displayOrder: subtopicData.displayOrder,
              isActive: subtopicData.isActive,
              questionCount: 0,
            });
          }
        }
      }
    }

    console.log("Subjects and topics seeded successfully");
    return subjectIdMap;
  } catch (error) {
    console.error("Error seeding subjects and topics:", error);
    throw error;
  }
}

// Seed questions
async function seedQuestions(): Promise<number> {
  console.log("Seeding questions...");

  try {
    const allQuestions = [
      ...allSeedQuestions,
      ...extendedQuestions,
      ...part3Questions,
    ];

    console.log(`Found ${allQuestions.length} questions to seed`);

    const validQuestions = allQuestions.filter((q) => q && q.questionText);
    const batchSize = 50;
    let insertedCount = 0;

    for (let i = 0; i < validQuestions.length; i += batchSize) {
      const batch = validQuestions.slice(i, i + batchSize);
      const result = await Question.insertMany(batch, { ordered: false });
      insertedCount += result.length;
      console.log(
        `  Inserted batch ${Math.floor(i / batchSize) + 1}: ${result.length} questions`,
      );
    }

    console.log(`Total questions inserted: ${insertedCount}`);
    return insertedCount;
  } catch (error) {
    console.error("Error seeding questions:", error);
    throw error;
  }
}

// Update question counts
async function updateQuestionCounts(): Promise<void> {
  console.log("Updating question counts...");

  try {
    // Update subject counts
    const subjectCounts = await Question.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$subject", count: { $sum: 1 } } },
    ]);

    for (const { _id: subjectName, count } of subjectCounts) {
      await Subject.updateOne(
        { name: subjectName },
        { $set: { questionCount: count, updatedAt: new Date() } },
      );
    }

    // Update topic counts
    const topicCounts = await Question.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: { subject: "$subject", topic: "$topic" },
          count: { $sum: 1 },
        },
      },
    ]);

    for (const {
      _id: { subject, topic: topicName },
      count,
    } of topicCounts) {
      await Topic.updateOne(
        { name: topicName },
        { $set: { questionCount: count, updatedAt: new Date() } },
      );
    }

    console.log("Question counts updated");
  } catch (error) {
    console.error("Error updating question counts:", error);
    throw error;
  }
}

// Display summary statistics
async function displaySummary(): Promise<void> {
  console.log("\n========== SEED SUMMARY ==========");

  const subjectCount = await Subject.countDocuments({ isActive: true });
  const topicCount = await Topic.countDocuments({ isActive: true });
  const questionCount = await Question.countDocuments({ isActive: true });

  const difficultyCounts = await Question.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: "$difficultyLevel", count: { $sum: 1 } } },
  ]);

  const highYieldCount = await Question.countDocuments({
    isActive: true,
    isHighYield: true,
  });

  console.log(`Subjects: ${subjectCount}`);
  console.log(`Topics: ${topicCount}`);
  console.log(`Questions: ${questionCount}`);
  console.log(
    `  - Easy: ${difficultyCounts.find((d) => d._id === "easy")?.count || 0}`,
  );
  console.log(
    `  - Medium: ${difficultyCounts.find((d) => d._id === "medium")?.count || 0}`,
  );
  console.log(
    `  - Hard: ${difficultyCounts.find((d) => d._id === "hard")?.count || 0}`,
  );
  console.log(`High-yield questions: ${highYieldCount}`);

  // Subject breakdown
  console.log("\nSubject breakdown:");
  const subjectBreakdown = await Question.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: "$subject", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  for (const { _id: subject, count } of subjectBreakdown) {
    console.log(`  - ${subject}: ${count} questions`);
  }

  console.log("==================================\n");
}

// Main seed function
async function runSeed(): Promise<void> {
  console.log("\nStarting database seed...\n");

  try {
    // Connect to MongoDB
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Clear existing data
    await clearExistingData();

    // Seed subjects and topics
    await seedSubjectsAndTopics();

    // Seed questions
    await seedQuestions();

    // Update counts
    await updateQuestionCounts();

    // Display summary
    await displaySummary();

    console.log("Seed completed successfully!");
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Run seed if executed directly
if (require.main === module) {
  runSeed();
}

export { runSeed };
