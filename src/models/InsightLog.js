import mongoose from "mongoose";

// Snapshots of generated recommendations/insights over time. Keeping historical
// snapshots (rather than only the latest) is what makes trend tracking possible
// later — e.g. "is my interview conversion rate improving?".
const InsightLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    generatedAt: { type: Date, default: Date.now },
    insightText: { type: String }, // natural-language recommendation card text
    // Free-form metrics blob: conversion rates, platform stats, resume-version
    // comparisons, etc. Mixed type since the shape will evolve.
    metricsSnapshot: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

InsightLogSchema.index({ userId: 1, generatedAt: -1 });

export default mongoose.models.InsightLog ||
  mongoose.model("InsightLog", InsightLogSchema);
