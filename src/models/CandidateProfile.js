import mongoose from "mongoose";

const TextListField = [{ type: String, trim: true }];

const EducationSchema = new mongoose.Schema(
  {
    institution: { type: String, trim: true },
    degree: { type: String, trim: true },
    field: { type: String, trim: true },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    description: { type: String, trim: true },
  },
  { _id: true }
);

const ExperienceSchema = new mongoose.Schema(
  {
    company: { type: String, trim: true },
    title: { type: String, trim: true },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    description: { type: String, trim: true },
    skills: TextListField,
  },
  { _id: true }
);

const ProjectSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    description: { type: String, trim: true },
    technologies: TextListField,
    url: { type: String, trim: true },
  },
  { _id: true }
);

const CertificationSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    issuer: { type: String, trim: true },
    issueDate: { type: Date, default: null },
    expirationDate: { type: Date, default: null },
    url: { type: String, trim: true },
  },
  { _id: true }
);

const CandidateProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    personal: {
      firstName: { type: String, trim: true },
      lastName: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
      phone: { type: String, trim: true },
      location: { type: String, trim: true },
    },
    education: [EducationSchema],
    experience: [ExperienceSchema],
    projects: [ProjectSchema],
    skills: TextListField,
    certifications: [CertificationSchema],
    links: {
      linkedin: { type: String, trim: true },
      github: { type: String, trim: true },
      portfolio: { type: String, trim: true },
      other: TextListField,
    },
    workAuthorization: {
      status: { type: String, trim: true },
      sponsorshipRequired: { type: Boolean, default: null },
    },
    preferences: {
      jobTypes: TextListField,
      preferredLocations: TextListField,
      remotePreference: { type: String, trim: true },
      industries: TextListField,
    },
    resume: {
      fileName: { type: String, trim: true },
      fileType: { type: String, trim: true },
      fileUrl: { type: String, trim: true },
      extractedText: { type: String, trim: true },
      uploadedAt: { type: Date, default: null },
      updatedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

export default mongoose.models.CandidateProfile ||
  mongoose.model("CandidateProfile", CandidateProfileSchema);
