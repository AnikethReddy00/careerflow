export const DEFAULT_TEST_PROFILE = {
  personal: {
    firstName: "Aniketh",
    lastName: "Reddy",
    email: "anikethreddy0987@gmail.com",
    phone: "+91 8143532870",
    location: "Hyderabad, India",
  },
  education: [
    {
      institution: "Amrita Vishwa Vidyapeetham",
      degree: "B.Tech",
      field: "Computer Science and Engineering (Artificial Intelligence)",
      startDate: new Date("2023-08-01"),
      endDate: new Date("2027-06-30"),
      description: "CGPA: 8.49/10. Key coursework: Data Structures & Algorithms, Operating Systems, Machine Learning, Computer Networks, Database Management Systems.",
    },
  ],
  experience: [
    {
      company: "BNY Mellon",
      title: "Software Development Engineer Intern",
      startDate: new Date("2026-05-01"),
      endDate: new Date("2026-07-31"),
      description: "Built automated record-and-replay testing tools for web applications reducing testcase creation from 20m to 3m. Developed custom MCP server for automated API testcase framing using React, FastAPI, websockets, and OracleDB.",
      skills: ["React", "FastAPI", "WebSockets", "OracleDB", "Zustand", "Playwright", "TypeScript"],
    },
  ],
  projects: [
    {
      name: "CareerFlow AI",
      description: "Autonomous agentic job tracking platform with local LLM reasoner, Gmail recruiter sync, and browser-assisted application autofill.",
      technologies: ["Next.js", "TailwindCSS", "MongoDB", "Playwright", "Groq AI", "Ollama"],
      url: "https://github.com/AnikethReddy00/careerflow",
    },
    {
      name: "Buy Me A Drink",
      description: "Crowdfunding and micro-funding platform for creator idea sharing with secure payment gateways and responsive design.",
      technologies: ["Next.js", "Tailwind CSS", "MongoDB", "Razorpay"],
      url: "https://github.com/AnikethReddy00",
    },
    {
      name: "Amrita FAQ",
      description: "Real-time inquiry web platform connecting prospective students with university alumni.",
      technologies: ["Node.js", "Express.js", "MongoDB", "EJS"],
      url: "https://github.com/AnikethReddy00",
    },
  ],
  skills: [
    "JavaScript",
    "TypeScript",
    "React",
    "Next.js",
    "Node.js",
    "Express.js",
    "MongoDB",
    "Python",
    "FastAPI",
    "TailwindCSS",
    "Redux",
    "Zustand",
    "SQL",
    "C++",
    "Playwright",
    "REST APIs",
    "Git",
    "Docker",
  ],
  certifications: [
    {
      name: "Supervised Machine Learning Algorithms",
      issuer: "Stanford Online / DeepLearning.AI",
      issueDate: new Date("2025-06-01"),
      expirationDate: null,
      url: "https://coursera.org",
    },
    {
      name: "Managing Emotions in Times of Uncertainty and Stress",
      issuer: "Yale University",
      issueDate: new Date("2024-11-01"),
      expirationDate: null,
      url: "https://coursera.org",
    },
  ],
  links: {
    linkedin: "https://linkedin.com/in/jakka-aniketh-reddy",
    github: "https://github.com/AnikethReddy00",
    portfolio: "https://github.com/AnikethReddy00",
    other: [],
  },
  workAuthorization: {
    status: "Citizen",
    sponsorshipRequired: false,
  },
  preferences: {
    jobTypes: ["Full-time", "Internship"],
    preferredLocations: ["Hyderabad", "Bengaluru", "Remote"],
    remotePreference: "Remote or Hybrid",
    industries: ["Software Engineering", "Artificial Intelligence", "FinTech"],
  },
  resume: {
    fileName: "Aniketh_Reddy_Resume.pdf",
    fileType: "application/pdf",
    fileUrl: "",
    extractedText: `Aniketh Reddy | Hyderabad, India
Email: anikethreddy0987@gmail.com | Phone: +91 8143532870
LinkedIn: https://linkedin.com/in/jakka-aniketh-reddy | GitHub: https://github.com/AnikethReddy00

EDUCATION
Amrita Vishwa Vidyapeetham — B.Tech in Computer Science & Engineering (AI) | Aug 2023 – Jun 2027
CGPA: 8.49/10

TECHNICAL SKILLS
Languages: JavaScript, TypeScript, Python, C/C++, SQL
Frameworks & Libraries: Next.js, React, Node.js, Express.js, FastAPI, Redux, Zustand, TailwindCSS
Tools & Databases: MongoDB, PostgreSQL, OracleDB, Playwright, Git, Docker, REST APIs

EXPERIENCE
BNY Mellon — Software Development Engineer Intern (May 2026 – Jul 2026)
• Created and deployed automation record-and-replay tool reducing test case creation time from 20m to 3m.
• Built custom MCP server automating API test case generation with FastAPI, websockets, and OracleDB.

PROJECTS
• CareerFlow AI: Autonomous career assistant with local LLM reasoner, Gmail sync, and browser autofill.
• Buy Me A Drink: Creator crowdfunding platform with Next.js, MongoDB, and secure payment processing.
• Amrita FAQ: Student advisory portal connecting prospective applicants with senior graduates.`,
    uploadedAt: new Date(),
    updatedAt: new Date(),
  },
};
