import { Router } from "express";
import { body } from "express-validator";
import {
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
  getProgress,
  getStatistics,
  saveOnboardingStep,
  completeOnboarding,
  savePremiumPackage,
} from "../controllers/user.controller";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

// Get user profile
router.get("/profile", authenticate, getProfile);

// Update profile
router.put(
  "/profile",
  authenticate,
  validate([
    body("firstName")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("First name cannot be empty"),
    body("lastName")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Last name cannot be empty"),
  ]),
  updateProfile,
);

// Change password
router.put(
  "/password",
  authenticate,
  validate([
    body("currentPassword")
      .notEmpty()
      .withMessage("Current password is required"),
    body("newPassword")
      .isLength({ min: 6 })
      .withMessage("New password must be at least 6 characters"),
  ]),
  changePassword,
);

// Get user progress
router.get("/progress", authenticate, getProgress);

// Get user statistics
router.get("/statistics", authenticate, getStatistics);

// Save onboarding step
router.put(
  "/:id/onboarding/:step",
  authenticate,
  validate([
    body("selectedCountry").optional().trim().notEmpty(),
    body("selectedUniversity").optional().trim().notEmpty(),
    body("selectedExam").optional().trim().notEmpty(),
    body("selectedPlan").optional().trim().notEmpty(),
  ]),
  saveOnboardingStep,
);

// Complete onboarding
router.put("/:id/onboarding/complete", authenticate, completeOnboarding);

// Save premium package
router.put(
  "/:id/premium-package",
  authenticate,
  validate([
    body("packageId").notEmpty().withMessage("Package ID is required"),
    body("pastPapers").notEmpty().withMessage("Past papers count is required"),
    body("accessDays")
      .isInt({ min: 1 })
      .withMessage("Access days must be a positive number"),
    body("dailyHours")
      .isInt({ min: 1 })
      .withMessage("Daily hours must be a positive number"),
    body("price")
      .isFloat({ min: 0 })
      .withMessage("Price must be a valid number"),
  ]),
  savePremiumPackage,
);

// Delete account
router.delete("/account", authenticate, deleteAccount);

export default router;
