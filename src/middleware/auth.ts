import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { AuthenticatedRequest, TokenPayload } from "../types";
import { AppError } from "./errorHandler";

/**
 * Authenticate user using JWT token
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    let token: string | undefined;

    // Check for token in Authorization header
    if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }
    // Check for token in cookies
    else if (req.cookies?.token) {
      token = req.cookies.token;
    }
    // Check for token in query string (for development/testing)
    else if (req.query?.token) {
      token = req.query.token as string;
    }

    if (!token) {
      return next(
        new AppError(
          "Not authorized to access this route. Please log in.",
          401,
        ),
      );
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;

    // Check if token has required fields
    if (!decoded.userId) {
      return next(new AppError("Invalid token format", 401));
    }

    // Get user from token
    const user = await User.findById(decoded.userId);

    if (!user) {
      return next(new AppError("User not found. Token may be invalid.", 401));
    }

    if (!user.isActive) {
      return next(new AppError("User account has been deactivated", 401));
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError("Invalid token. Please log in again.", 401));
    }
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AppError("Token expired. Please log in again.", 401));
    }
    return next(new AppError("Not authorized to access this route", 401));
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    let token: string | undefined;

    if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (token) {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET!,
      ) as TokenPayload;
      const user = await User.findById(decoded.userId);

      if (user && user.isActive) {
        req.user = user;
      }
    }

    next();
  } catch {
    // Continue without user
    next();
  }
};

/**
 * Authorize specific roles
 */
export const authorize = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("Not authorized to access this route", 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `User role '${req.user.role}' is not authorized to access this route`,
          403,
        ),
      );
    }

    next();
  };
};

/**
 * Check if user owns resource or is admin
 */
export const authorizeOwnerOrAdmin = (
  getUserIdFromRequest: (req: AuthenticatedRequest) => string,
) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("Not authorized to access this route", 401));
    }

    const resourceUserId = getUserIdFromRequest(req);
    const isOwner = req.user._id.toString() === resourceUserId;
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return next(new AppError("Not authorized to access this resource", 403));
    }

    next();
  };
};
