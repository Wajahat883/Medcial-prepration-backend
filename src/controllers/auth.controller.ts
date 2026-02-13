import { Response } from "express";
import crypto from "crypto";
import { AuthenticatedRequest } from "../types";
import { User } from "../models/User";
import { Session } from "../models/Session";
import { UserProgress } from "../models/UserProgress";
import { generateToken, verifyToken } from "../utils/jwt";
import { AppError } from "../middleware/errorHandler";

const TOKEN_EXPIRY_HOURS = 24;
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (
  req: AuthenticatedRequest,
  res: Response,
  next: any,
) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return next(new AppError("User already exists", 400));
    }

    // Create user
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
    });

    // Create user progress
    await UserProgress.create({
      user: user._id,
    });

    // Generate tokens
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const refreshToken = crypto.randomBytes(32).toString("hex");

    // Store session in database
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);

    await Session.create({
      userId: user._id,
      token,
      refreshToken,
      userAgent: req.get("user-agent") || "unknown",
      ipAddress: req.ip || "unknown",
      expiresAt,
    });

    res.status(201).json({
      success: true,
      token,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (
  req: AuthenticatedRequest,
  res: Response,
  next: any,
) => {
  try {
    const { email, password } = req.body;

    // Check for user
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return next(new AppError("Invalid credentials", 401));
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return next(new AppError("Invalid credentials", 401));
    }

    // Check if user is active
    if (!user.isActive) {
      return next(new AppError("Account has been deactivated", 401));
    }

    // Generate tokens
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const refreshToken = crypto.randomBytes(32).toString("hex");

    // Store session in database
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);

    await Session.create({
      userId: user._id,
      token,
      refreshToken,
      userAgent: req.get("user-agent") || "unknown",
      ipAddress: req.ip || "unknown",
      expiresAt,
    });

    res.json({
      success: true,
      token,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        onboardingComplete: user.onboardingComplete,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (
  req: AuthenticatedRequest,
  res: Response,
  next: any,
) => {
  try {
    // Invalidate session in database
    const token = req.get("authorization")?.replace("Bearer ", "");
    if (token) {
      await Session.updateOne({ token }, { isActive: false });
    }

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
export const refreshToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: any,
) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return next(new AppError("Refresh token is required", 400));
    }

    // Check if session exists in database
    const session = await Session.findOne({
      refreshToken: token,
      isActive: true,
    });

    if (!session) {
      return next(new AppError("Invalid refresh token", 401));
    }

    // Check if session is expired
    if (new Date() > session.expiresAt) {
      await Session.updateOne({ _id: session._id }, { isActive: false });
      return next(new AppError("Refresh token expired", 401));
    }

    // Get user
    const user = await User.findById(session.userId);
    if (!user || !user.isActive) {
      await Session.updateOne({ _id: session._id }, { isActive: false });
      return next(new AppError("User not found or inactive", 401));
    }

    // Generate new access token
    const accessToken = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Update session expiry
    const newExpiresAt = new Date();
    newExpiresAt.setHours(newExpiresAt.getHours() + TOKEN_EXPIRY_HOURS);

    await Session.updateOne(
      { _id: session._id },
      {
        token: accessToken,
        expiresAt: newExpiresAt,
      },
    );

    res.json({
      success: true,
      token: accessToken,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (
  req: AuthenticatedRequest,
  res: Response,
  next: any,
) => {
  try {
    const user = await User.findById(req.user!._id);
    res.json({
      success: true,
      user: {
        id: user!._id,
        email: user!.email,
        firstName: user!.firstName,
        lastName: user!.lastName,
        role: user!.role,
        avatar: user!.avatar,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (
  req: AuthenticatedRequest,
  res: Response,
  next: any,
) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists
      return res.json({
        success: true,
        message: "If an account exists, a password reset email has been sent",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    // Store reset token (in production, store hashed version in DB)
    // For now, we'll use a simple approach
    (user as any).resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    (user as any).resetPasswordExpire = resetTokenExpiry;
    await user.save({ validateBeforeSave: false });

    // TODO: Send email with reset link
    // In production, send email with: `${process.env.FRONTEND_URL}/reset-password/${resetToken}`

    res.json({
      success: true,
      message: "If an account exists, a password reset email has been sent",
      // Only for development - remove in production
      ...(process.env.NODE_ENV === "development" && { resetToken }),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password/:token
// @access  Public
export const resetPassword = async (
  req: AuthenticatedRequest,
  res: Response,
  next: any,
) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Hash token to compare with stored hash
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return next(new AppError("Invalid or expired reset token", 400));
    }

    // Update password
    user.password = password;
    (user as any).resetPasswordToken = undefined;
    (user as any).resetPasswordExpire = undefined;
    await user.save();

    // Generate new tokens
    const accessToken = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    res.json({
      success: true,
      message: "Password reset successful",
      token: accessToken,
    });
  } catch (error) {
    next(error);
  }
};
