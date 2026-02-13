import { Response } from "express";
import { AuthenticatedRequest } from "../types";
import { User } from "../models/User";
import { UserProgress } from "../models/UserProgress";
import { TestSession } from "../models/TestSession";
import { AppError } from "../middleware/errorHandler";

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
export const getProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: any,
) => {
  try {
    const user = await User.findById(req.user!._id);
    const progress = await UserProgress.findOne({ user: req.user!._id });

    res.json({
      success: true,
      data: {
        user: {
          id: user!._id,
          email: user!.email,
          firstName: user!.firstName,
          lastName: user!.lastName,
          role: user!.role,
          avatar: user!.avatar,
          createdAt: user!.createdAt,
        },
        progress: progress || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: any,
) => {
  try {
    const { firstName, lastName, avatar } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user!._id,
      { firstName, lastName, avatar },
      { new: true, runValidators: true },
    );

    res.json({
      success: true,
      data: {
        id: user!._id,
        email: user!.email,
        firstName: user!.firstName,
        lastName: user!.lastName,
        avatar: user!.avatar,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/users/password
// @access  Private
export const changePassword = async (
  req: AuthenticatedRequest,
  res: Response,
  next: any,
) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user!._id).select("+password");

    // Check current password
    const isMatch = await user!.comparePassword(currentPassword);
    if (!isMatch) {
      return next(new AppError("Current password is incorrect", 400));
    }

    // Update password
    user!.password = newPassword;
    await user!.save();

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user progress
// @route   GET /api/users/progress
// @access  Private
export const getProgress = async (
  req: AuthenticatedRequest,
  res: Response,
  next: any,
) => {
  try {
    const progress = await UserProgress.findOne({ user: req.user!._id });

    if (!progress) {
      return res.json({
        success: true,
        data: {
          totalQuestionsAttempted: 0,
          totalCorrectAnswers: 0,
          accuracy: 0,
          categoryProgress: {},
          streakDays: 0,
        },
      });
    }

    res.json({
      success: true,
      data: {
        totalQuestionsAttempted: progress.totalQuestionsAttempted,
        totalCorrectAnswers: progress.totalCorrectAnswers,
        accuracy: progress.get("accuracy"),
        categoryProgress: progress.categoryProgress,
        streakDays: progress.streakDays,
        lastStudyDate: progress.lastStudyDate,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user statistics
// @route   GET /api/users/statistics
// @access  Private
export const getStatistics = async (
  req: AuthenticatedRequest,
  res: Response,
  next: any,
) => {
  try {
    const userId = req.user!._id;

    // Get all completed tests
    const completedTests = await TestSession.find({
      user: userId,
      status: "completed",
    });

    const totalTestsTaken = completedTests.length;

    if (totalTestsTaken === 0) {
      return res.json({
        success: true,
        data: {
          totalTestsTaken: 0,
          testsPassed: 0,
          testsFailed: 0,
          averageScore: 0,
          highestScore: 0,
          lowestScore: 0,
          totalTimeSpent: 0,
        },
      });
    }

    // Calculate statistics
    const scores = completedTests.map((test) => test.score || 0);
    const averageScore = Math.round(
      scores.reduce((a, b) => a + b, 0) / scores.length,
    );
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);

    // AMC passing score is typically 50%
    const testsPassed = scores.filter((score) => score >= 50).length;
    const testsFailed = totalTestsTaken - testsPassed;

    // Calculate total time spent (in seconds)
    const totalTimeSpent = completedTests.reduce((total, test) => {
      if (test.endTime && test.startTime) {
        return (
          total +
          Math.floor((test.endTime.getTime() - test.startTime.getTime()) / 1000)
        );
      }
      return total;
    }, 0);

    // Get progress to find favorite and weakest categories
    const progress = await UserProgress.findOne({ user: userId });

    let favoriteCategory: string | undefined;
    let weakestCategory: string | undefined;

    if (progress && progress.categoryProgress.size > 0) {
      let maxAttempts = 0;
      let lowestAccuracy = 101;

      for (const [category, data] of progress.categoryProgress.entries()) {
        // Favorite = most attempted
        if (data.attempted > maxAttempts) {
          maxAttempts = data.attempted;
          favoriteCategory = category;
        }

        // Weakest = lowest accuracy
        const accuracy =
          data.attempted > 0 ? (data.correct / data.attempted) * 100 : 0;
        if (accuracy < lowestAccuracy) {
          lowestAccuracy = accuracy;
          weakestCategory = category;
        }
      }
    }

    res.json({
      success: true,
      data: {
        totalTestsTaken,
        testsPassed,
        testsFailed,
        averageScore,
        highestScore,
        lowestScore,
        totalTimeSpent,
        favoriteCategory,
        weakestCategory,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user account
// @route   DELETE /api/users/account
// @access  Private
export const deleteAccount = async (
  req: AuthenticatedRequest,
  res: Response,
  next: any,
) => {
  try {
    await User.findByIdAndUpdate(req.user!._id, { isActive: false });

    res.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Save onboarding step
// @route   PUT /api/users/:id/onboarding/:step
// @access  Private
export const saveOnboardingStep = async (
  req: AuthenticatedRequest,
  res: Response,
  next: any,
) => {
  try {
    const { id, step } = req.params;
    const { selectedCountry, selectedUniversity, selectedExam, selectedPlan } =
      req.body;

    // Validate that user is updating their own profile
    if (req.user!._id.toString() !== id) {
      return next(new AppError("Not authorized to update this user", 403));
    }

    const updateData: any = {};

    if (selectedCountry) updateData.selectedCountry = selectedCountry;
    if (selectedUniversity) updateData.selectedUniversity = selectedUniversity;
    if (selectedExam) updateData.selectedExam = selectedExam;
    if (selectedPlan) updateData.selectedPlan = selectedPlan;

    const user = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      message: `Onboarding step ${step} saved successfully`,
      data: {
        id: user!._id,
        selectedCountry: user!.selectedCountry,
        selectedUniversity: user!.selectedUniversity,
        selectedExam: user!.selectedExam,
        selectedPlan: user!.selectedPlan,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Complete onboarding
// @route   PUT /api/users/:id/onboarding/complete
// @access  Private
export const completeOnboarding = async (
  req: AuthenticatedRequest,
  res: Response,
  next: any,
) => {
  try {
    const { id } = req.params;

    // Validate that user is updating their own profile
    if (req.user!._id.toString() !== id) {
      return next(new AppError("Not authorized to update this user", 403));
    }

    const user = await User.findByIdAndUpdate(
      id,
      { onboardingComplete: true, onboardingCompletedAt: new Date() },
      { new: true, runValidators: true },
    );

    res.json({
      success: true,
      message: "Onboarding completed successfully",
      data: {
        id: user!._id,
        onboardingComplete: user!.onboardingComplete,
        selectedCountry: user!.selectedCountry,
        selectedUniversity: user!.selectedUniversity,
        selectedExam: user!.selectedExam,
        selectedPlan: user!.selectedPlan,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Save premium package selection
// @route   PUT /api/users/:id/premium-package
// @access  Private
export const savePremiumPackage = async (
  req: AuthenticatedRequest,
  res: Response,
  next: any,
) => {
  try {
    const { id } = req.params;
    const { packageId, pastPapers, accessDays, dailyHours, price } = req.body;

    // Validate that user is updating their own profile
    if (req.user!._id.toString() !== id) {
      return next(new AppError("Not authorized to update this user", 403));
    }

    // Calculate premium dates
    const premiumStartDate = new Date();
    const premiumEndDate = new Date(premiumStartDate);
    premiumEndDate.setDate(premiumEndDate.getDate() + accessDays);

    const user = await User.findByIdAndUpdate(
      id,
      {
        premiumPackage: packageId,
        premiumPastPapers: pastPapers,
        premiumAccessDays: accessDays,
        premiumDailyHours: dailyHours,
        premiumPrice: price,
        premiumStartDate,
        premiumEndDate,
      },
      { new: true, runValidators: true },
    );

    res.json({
      success: true,
      message: "Premium package activated successfully",
      data: {
        id: user!._id,
        premiumPackage: user!.premiumPackage,
        premiumPastPapers: user!.premiumPastPapers,
        premiumAccessDays: user!.premiumAccessDays,
        premiumDailyHours: user!.premiumDailyHours,
        premiumStartDate: user!.premiumStartDate,
        premiumEndDate: user!.premiumEndDate,
      },
    });
  } catch (error) {
    next(error);
  }
};
