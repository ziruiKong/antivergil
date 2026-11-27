(function () {
  const KEY_PREFIX = "antivergil-profile-v1:";

  const COLUMBIA_SCHOOL_OPTIONS = {
    undergraduate: [
      { id: "columbia-college", label: "Columbia College" },
      { id: "engineering", label: "Fu Foundation School of Engineering and Applied Science" },
      { id: "general-studies", label: "School of General Studies" },
      { id: "barnard", label: "Barnard College" },
      { id: "other-school", label: "Other school / Institution" },
    ],
    graduate: [
      { id: "gsas", label: "Graduate School of Arts and Sciences" },
      { id: "engineering", label: "Fu Foundation School of Engineering and Applied Science" },
      { id: "business", label: "Columbia Business School" },
      { id: "sipa", label: "School of International and Public Affairs" },
      { id: "mailman", label: "Mailman School of Public Health" },
      { id: "journalism", label: "Columbia Journalism School" },
      { id: "law", label: "Columbia Law School" },
      { id: "teachers-college", label: "Teachers College" },
      { id: "other-school", label: "Other school / Institution" },
    ],
  };

  const MIAMI_SCHOOL_OPTIONS = {
    undergraduate: [
      { id: "miami-arts-science", label: "College of Arts and Science" },
      { id: "miami-business", label: "Farmer School of Business" },
      { id: "miami-engineering", label: "College of Engineering and Computing" },
      { id: "miami-creative-arts", label: "College of Creative Arts" },
      { id: "miami-education-health", label: "College of Education, Health, and Society" },
      { id: "miami-other", label: "Other / Interdisciplinary" },
    ],
    graduate: [
      { id: "miami-graduate", label: "Graduate School" },
      { id: "miami-other", label: "Other / Interdisciplinary" },
    ],
  };

  const MAJOR_OPTIONS = [
    { id: "computer-science", label: "Computer Science", stages: ["undergraduate", "graduate"], deptCodes: ["COMS"], keywords: ["computer", "software", "algorithm", "artificial intelligence", "machine learning"] },
    { id: "data-science", label: "Data Science", stages: ["undergraduate", "graduate"], deptCodes: ["STAT", "COMS", "IEOR", "DROM"], keywords: ["data science", "machine learning", "statistics", "analytics"] },
    { id: "economics", label: "Economics", stages: ["undergraduate", "graduate"], deptCodes: ["ECON"], keywords: ["economics", "econometrics", "market"] },
    { id: "financial-engineering", label: "Financial Engineering", stages: ["undergraduate", "graduate"], deptCodes: ["IEOR", "FINC"], keywords: ["financial engineering", "quantitative finance", "risk"] },
    { id: "operations-research", label: "Operations Research", stages: ["undergraduate", "graduate"], deptCodes: ["IEOR"], keywords: ["optimization", "operations", "decision", "modeling"] },
    { id: "mathematics", label: "Mathematics", stages: ["undergraduate", "graduate"], deptCodes: ["MATH"], keywords: ["mathematics", "analysis", "algebra"] },
    { id: "statistics", label: "Statistics", stages: ["undergraduate", "graduate"], deptCodes: ["STAT"], keywords: ["statistics", "probability", "inference"] },
    { id: "business", label: "Business & Management", stages: ["undergraduate", "graduate"], deptCodes: ["BUSI", "ACCT", "FINC", "DROM", "BUEC", "MKTG"], keywords: ["business", "management", "leadership", "strategy"] },
    { id: "finance", label: "Finance", stages: ["undergraduate", "graduate"], deptCodes: ["FINC", "BUEC", "ECON"], keywords: ["finance", "investment", "markets", "valuation"] },
    { id: "analytics", label: "Business Analytics", stages: ["undergraduate", "graduate"], deptCodes: ["DROM", "IEOR", "STAT"], keywords: ["analytics", "business analytics", "decision models"] },
    { id: "qmss", label: "Quantitative Methods in the Social Sciences", stages: ["graduate"], deptCodes: ["QMSS"], keywords: ["quantitative social science", "survey", "causal inference"] },
    { id: "political-science", label: "Political Science", stages: ["undergraduate", "graduate"], deptCodes: ["POLS"], keywords: ["politics", "political", "governance"] },
    { id: "public-policy", label: "Public Policy & Administration", stages: ["undergraduate", "graduate"], deptCodes: ["POLS", "SIPA"], keywords: ["public policy", "public administration", "governance"] },
    { id: "sociology", label: "Sociology", stages: ["undergraduate", "graduate"], deptCodes: ["SOCI"], keywords: ["society", "social", "inequality"] },
    { id: "psychology", label: "Psychology", stages: ["undergraduate", "graduate"], deptCodes: ["PSYC"], keywords: ["psychology", "behavior", "cognition"] },
    { id: "history", label: "History", stages: ["undergraduate", "graduate"], deptCodes: ["HIST"], keywords: ["history", "historical", "archive"] },
    { id: "english", label: "English & Literature", stages: ["undergraduate", "graduate"], deptCodes: ["ENGL", "CLEN", "CLLN"], keywords: ["literature", "writing", "novel"] },
    { id: "art-history", label: "Art History", stages: ["undergraduate", "graduate"], deptCodes: ["AHIS"], keywords: ["art", "visual", "museum"] },
    { id: "east-asian-studies", label: "East Asian Studies", stages: ["undergraduate", "graduate"], deptCodes: ["EALC", "EAAS", "CHIN", "JAPN", "KORE"], keywords: ["east asia", "china", "japan", "korea"] },
    { id: "biology", label: "Biology", stages: ["undergraduate", "graduate"], deptCodes: ["BIOL", "EEEB"], keywords: ["biology", "cells", "ecology"] },
    { id: "chemistry", label: "Chemistry", stages: ["undergraduate", "graduate"], deptCodes: ["CHEM"], keywords: ["chemistry", "molecular"] },
    { id: "physics", label: "Physics", stages: ["undergraduate", "graduate"], deptCodes: ["PHYS", "ASTR"], keywords: ["physics", "quantum", "astronomy"] },
    { id: "public-health", label: "Public Health", stages: ["graduate"], deptCodes: ["PUBH", "EPID", "HPM"], keywords: ["public health", "epidemiology", "health policy"] },
    { id: "journalism", label: "Journalism", stages: ["graduate"], deptCodes: ["JOUR"], keywords: ["journalism", "reporting", "media"] },
    { id: "law", label: "Law", stages: ["graduate"], deptCodes: ["LAW"], keywords: ["law", "legal", "rights"] },
    { id: "education", label: "Education", stages: ["graduate"], deptCodes: ["EDUC"], keywords: ["education", "teaching", "learning"] },
    { id: "other", label: "Other / Interdisciplinary", stages: ["undergraduate", "graduate"], deptCodes: [], keywords: [] },
  ];

  const MIAMI_MAJOR_OPTIONS = [
    { id: "miami-computer-science", label: "Computer Science", stages: ["undergraduate", "graduate"], deptCodes: ["CSE", "MTH"], keywords: ["computer", "software", "algorithm", "artificial intelligence", "machine learning"] },
    { id: "miami-data-science", label: "Data Science", stages: ["undergraduate", "graduate"], deptCodes: ["STA", "CSE", "ISA"], keywords: ["data science", "machine learning", "statistics", "analytics"] },
    { id: "miami-cybersecurity", label: "Cybersecurity", stages: ["undergraduate", "graduate"], deptCodes: ["CYB", "CSE"], keywords: ["cybersecurity", "security", "networks", "systems"] },
    { id: "miami-electrical-engineering", label: "Electrical & Computer Engineering", stages: ["undergraduate", "graduate"], deptCodes: ["ECE", "CSE"], keywords: ["electrical", "computer engineering", "circuits", "signals"] },
    { id: "miami-mechanical-engineering", label: "Mechanical & Manufacturing Engineering", stages: ["undergraduate", "graduate"], deptCodes: ["MME", "EGM"], keywords: ["mechanical", "manufacturing", "design", "robotics"] },
    { id: "miami-chemical-engineering", label: "Chemical, Paper & Biomedical Engineering", stages: ["undergraduate", "graduate"], deptCodes: ["CPB", "CHM"], keywords: ["chemical engineering", "biomedical", "paper", "materials"] },
    { id: "miami-architecture", label: "Architecture & Interior Design", stages: ["undergraduate", "graduate"], deptCodes: ["ARC"], keywords: ["architecture", "interior design", "built environment", "studio"] },
    { id: "miami-emerging-technology", label: "Emerging Technology & Interactive Media", stages: ["undergraduate", "graduate"], deptCodes: ["IMS", "CCA"], keywords: ["interactive media", "game design", "creative technology", "design"] },
    { id: "miami-accountancy", label: "Accountancy", stages: ["undergraduate", "graduate"], deptCodes: ["ACC"], keywords: ["accounting", "audit", "tax", "financial reporting"] },
    { id: "miami-finance", label: "Finance", stages: ["undergraduate", "graduate"], deptCodes: ["FIN", "ECO"], keywords: ["finance", "investment", "markets", "valuation"] },
    { id: "miami-marketing", label: "Marketing", stages: ["undergraduate", "graduate"], deptCodes: ["MKT", "STC"], keywords: ["marketing", "consumer", "brand", "strategy"] },
    { id: "miami-management", label: "Management & Entrepreneurship", stages: ["undergraduate", "graduate"], deptCodes: ["MGT", "ESP", "ORG"], keywords: ["management", "entrepreneurship", "leadership", "strategy"] },
    { id: "miami-business-analytics", label: "Business Analytics & Information Systems", stages: ["undergraduate", "graduate"], deptCodes: ["ISA", "BUS", "STA"], keywords: ["analytics", "information systems", "data", "operations"] },
    { id: "miami-economics", label: "Economics", stages: ["undergraduate", "graduate"], deptCodes: ["ECO"], keywords: ["economics", "econometrics", "market", "policy"] },
    { id: "miami-statistics", label: "Statistics", stages: ["undergraduate", "graduate"], deptCodes: ["STA"], keywords: ["statistics", "probability", "inference", "data"] },
    { id: "miami-mathematics", label: "Mathematics", stages: ["undergraduate", "graduate"], deptCodes: ["MTH"], keywords: ["mathematics", "analysis", "algebra", "quantitative"] },
    { id: "miami-political-science", label: "Political Science", stages: ["undergraduate", "graduate"], deptCodes: ["POL", "CIV"], keywords: ["politics", "government", "policy", "public affairs"] },
    { id: "miami-psychology", label: "Psychology", stages: ["undergraduate", "graduate"], deptCodes: ["PSY"], keywords: ["psychology", "behavior", "cognition", "research"] },
    { id: "miami-sociology", label: "Sociology", stages: ["undergraduate", "graduate"], deptCodes: ["SOC", "SJS"], keywords: ["society", "social", "inequality", "justice"] },
    { id: "miami-history", label: "History", stages: ["undergraduate", "graduate"], deptCodes: ["HST"], keywords: ["history", "historical", "archive", "public history"] },
    { id: "miami-english", label: "English & Literature", stages: ["undergraduate", "graduate"], deptCodes: ["ENG"], keywords: ["literature", "writing", "novel", "rhetoric"] },
    { id: "miami-communication", label: "Media, Journalism & Strategic Communication", stages: ["undergraduate", "graduate"], deptCodes: ["MAC", "JRN", "STC", "MJF", "FST"], keywords: ["media", "journalism", "communication", "film"] },
    { id: "miami-biology", label: "Biology", stages: ["undergraduate", "graduate"], deptCodes: ["BIO", "MBI"], keywords: ["biology", "cells", "microbiology", "ecology"] },
    { id: "miami-chemistry", label: "Chemistry & Biochemistry", stages: ["undergraduate", "graduate"], deptCodes: ["CHM"], keywords: ["chemistry", "biochemistry", "molecular", "laboratory"] },
    { id: "miami-physics", label: "Physics", stages: ["undergraduate", "graduate"], deptCodes: ["PHY"], keywords: ["physics", "quantum", "mechanics", "astronomy"] },
    { id: "miami-environment", label: "Environmental Science & Sustainability", stages: ["undergraduate", "graduate"], deptCodes: ["IES", "GEO", "GLG"], keywords: ["environment", "sustainability", "climate", "earth"] },
    { id: "miami-education", label: "Education", stages: ["undergraduate", "graduate"], deptCodes: ["TCE", "EDL", "EDP", "EHS"], keywords: ["education", "teaching", "learning", "curriculum"] },
    { id: "miami-kinesiology", label: "Kinesiology, Nutrition & Health", stages: ["undergraduate", "graduate"], deptCodes: ["KNH", "GHS"], keywords: ["kinesiology", "nutrition", "health", "exercise"] },
    { id: "miami-nursing", label: "Nursing", stages: ["undergraduate", "graduate"], deptCodes: ["NSG", "MMS", "PAS"], keywords: ["nursing", "health", "clinical", "patient care"] },
    { id: "miami-social-work", label: "Family Science & Social Work", stages: ["undergraduate", "graduate"], deptCodes: ["FSW", "GTY"], keywords: ["social work", "family", "community", "aging"] },
    { id: "miami-creative-arts", label: "Art, Music & Theatre", stages: ["undergraduate", "graduate"], deptCodes: ["ART", "MUS", "THE", "CCA"], keywords: ["art", "music", "theatre", "performance", "studio"] },
    { id: "miami-international-studies", label: "International & Area Studies", stages: ["undergraduate", "graduate"], deptCodes: ["ITS", "AAA", "AMS", "WLC"], keywords: ["international", "global", "area studies", "culture"] },
    { id: "miami-other", label: "Other / Interdisciplinary", stages: ["undergraduate", "graduate"], deptCodes: ["WST", "HON", "UNV"], keywords: [] },
  ];

  const liberalArtsMajors = [
    "computer-science", "data-science", "economics", "mathematics", "statistics",
    "political-science", "sociology", "psychology", "history", "english",
    "art-history", "east-asian-studies", "biology", "chemistry", "physics", "other",
  ];
  const SCHOOL_MAJORS = {
    "columbia-college": liberalArtsMajors,
    "general-studies": liberalArtsMajors,
    barnard: liberalArtsMajors,
    engineering: ["computer-science", "data-science", "financial-engineering", "operations-research", "mathematics", "statistics", "biology", "chemistry", "physics", "other"],
    gsas: ["computer-science", "data-science", "economics", "operations-research", "mathematics", "statistics", "qmss", "political-science", "sociology", "psychology", "history", "english", "art-history", "east-asian-studies", "biology", "chemistry", "physics", "other"],
    business: ["business", "finance", "analytics", "economics", "statistics", "data-science", "other"],
    sipa: ["economics", "statistics", "data-science", "qmss", "political-science", "public-policy", "sociology", "history", "other"],
    mailman: ["public-health", "biology", "statistics", "data-science", "psychology", "economics", "public-policy", "other"],
    journalism: ["journalism", "political-science", "sociology", "history", "data-science", "other"],
    law: ["law", "political-science", "public-policy", "history", "sociology", "other"],
    "teachers-college": ["education", "psychology", "sociology", "public-policy", "other"],
    "other-school": null,
  };

  const MIAMI_SCHOOL_MAJORS = {
    "miami-arts-science": [
      "miami-computer-science", "miami-data-science", "miami-cybersecurity", "miami-economics",
      "miami-statistics", "miami-mathematics", "miami-political-science", "miami-psychology",
      "miami-sociology", "miami-history", "miami-english", "miami-biology", "miami-chemistry",
      "miami-physics", "miami-environment", "miami-international-studies", "miami-other",
    ],
    "miami-business": [
      "miami-accountancy", "miami-finance", "miami-marketing", "miami-management",
      "miami-business-analytics", "miami-economics", "miami-statistics", "miami-other",
    ],
    "miami-engineering": [
      "miami-computer-science", "miami-data-science", "miami-cybersecurity",
      "miami-electrical-engineering", "miami-mechanical-engineering",
      "miami-chemical-engineering", "miami-emerging-technology", "miami-mathematics",
      "miami-physics", "miami-other",
    ],
    "miami-creative-arts": [
      "miami-architecture", "miami-emerging-technology", "miami-communication",
      "miami-creative-arts", "miami-english", "miami-other",
    ],
    "miami-education-health": [
      "miami-education", "miami-kinesiology", "miami-nursing", "miami-social-work",
      "miami-psychology", "miami-biology", "miami-other",
    ],
    "miami-graduate": [
      "miami-computer-science", "miami-data-science", "miami-cybersecurity",
      "miami-electrical-engineering", "miami-mechanical-engineering",
      "miami-chemical-engineering", "miami-accountancy", "miami-finance",
      "miami-management", "miami-business-analytics", "miami-economics",
      "miami-statistics", "miami-mathematics", "miami-political-science",
      "miami-psychology", "miami-sociology", "miami-history", "miami-english",
      "miami-communication", "miami-biology", "miami-chemistry", "miami-physics",
      "miami-environment", "miami-education", "miami-kinesiology", "miami-nursing",
      "miami-social-work", "miami-creative-arts", "miami-international-studies", "miami-other",
    ],
    "miami-other": null,
  };

  const MIAMI_SCHOOL_ALIASES = {
    "columbia-college": "miami-arts-science",
    "general-studies": "miami-arts-science",
    barnard: "miami-arts-science",
    engineering: "miami-engineering",
    business: "miami-business",
    gsas: "miami-graduate",
    sipa: "miami-arts-science",
    mailman: "miami-education-health",
    journalism: "miami-creative-arts",
    law: "miami-arts-science",
    "teachers-college": "miami-education-health",
    "other-school": "miami-other",
  };

  const MIAMI_MAJOR_ALIASES = {
    "computer-science": "miami-computer-science",
    "data-science": "miami-data-science",
    economics: "miami-economics",
    "financial-engineering": "miami-finance",
    "operations-research": "miami-business-analytics",
    mathematics: "miami-mathematics",
    statistics: "miami-statistics",
    business: "miami-management",
    finance: "miami-finance",
    analytics: "miami-business-analytics",
    qmss: "miami-data-science",
    "political-science": "miami-political-science",
    "public-policy": "miami-political-science",
    sociology: "miami-sociology",
    psychology: "miami-psychology",
    history: "miami-history",
    english: "miami-english",
    "art-history": "miami-creative-arts",
    "east-asian-studies": "miami-international-studies",
    biology: "miami-biology",
    chemistry: "miami-chemistry",
    physics: "miami-physics",
    "public-health": "miami-kinesiology",
    journalism: "miami-communication",
    law: "miami-other",
    education: "miami-education",
    other: "miami-other",
  };

  const INTEREST_OPTIONS = [
    { id: "technology", label: "Technology & AI", deptCodes: ["COMS", "IEOR"], keywords: ["computer", "software", "artificial intelligence", "machine learning", "algorithm"] },
    { id: "finance", label: "Finance & Markets", deptCodes: ["FINC", "BUEC", "ECON", "ACCT"], keywords: ["finance", "investment", "market", "valuation"] },
    { id: "data", label: "Data & Statistics", deptCodes: ["STAT", "DROM", "QMSS"], keywords: ["data", "statistics", "probability", "analytics"] },
    { id: "policy", label: "Policy & Society", deptCodes: ["POLS", "SOCI", "SIPA"], keywords: ["policy", "politics", "government", "society"] },
    { id: "health", label: "Health & Medicine", deptCodes: ["BIOL", "PSYC", "PUBH"], keywords: ["health", "medicine", "biology", "neuroscience"] },
    { id: "arts", label: "Arts & Design", deptCodes: ["AHIS", "MUSI", "FILM"], keywords: ["art", "design", "music", "visual"] },
    { id: "media", label: "Media & Communication", deptCodes: ["JOUR", "FILM"], keywords: ["media", "journalism", "communication", "film"] },
    { id: "climate", label: "Climate & Environment", deptCodes: ["EESC", "EEEB"], keywords: ["climate", "environment", "sustainability", "earth"] },
    { id: "entrepreneurship", label: "Entrepreneurship", deptCodes: ["BUSI", "FINC"], keywords: ["entrepreneur", "venture", "startup", "innovation"] },
    { id: "culture", label: "Languages & Culture", deptCodes: ["EALC", "EAAS", "CHIN", "JAPN", "KORE", "ENGL"], keywords: ["language", "culture", "literature", "history"] },
  ];

  const MIAMI_INTEREST_OPTIONS = [
    { id: "technology", label: "Technology & AI", deptCodes: ["CSE", "IMS", "CYB"], keywords: ["computer", "software", "artificial intelligence", "machine learning", "algorithm"] },
    { id: "finance", label: "Finance & Markets", deptCodes: ["FIN", "ECO", "ACC"], keywords: ["finance", "investment", "market", "valuation"] },
    { id: "data", label: "Data & Statistics", deptCodes: ["STA", "ISA", "CSE"], keywords: ["data", "statistics", "probability", "analytics"] },
    { id: "policy", label: "Policy & Society", deptCodes: ["POL", "SOC", "SJS", "CIV"], keywords: ["policy", "politics", "government", "society"] },
    { id: "health", label: "Health & Medicine", deptCodes: ["BIO", "PSY", "KNH", "NSG", "MMS"], keywords: ["health", "medicine", "nursing", "neuroscience"] },
    { id: "arts", label: "Arts & Design", deptCodes: ["ART", "MUS", "THE", "ARC", "IMS"], keywords: ["art", "design", "music", "visual", "architecture"] },
    { id: "media", label: "Media & Communication", deptCodes: ["MAC", "JRN", "STC", "MJF", "FST"], keywords: ["media", "journalism", "communication", "film"] },
    { id: "climate", label: "Climate & Environment", deptCodes: ["IES", "GEO", "GLG"], keywords: ["climate", "environment", "sustainability", "earth"] },
    { id: "entrepreneurship", label: "Entrepreneurship", deptCodes: ["ESP", "MGT", "BUS"], keywords: ["entrepreneur", "venture", "startup", "innovation"] },
    { id: "culture", label: "Languages & Culture", deptCodes: ["AAA", "AMS", "ITS", "WLC", "SPN", "CHI", "JPN", "KOR"], keywords: ["language", "culture", "literature", "history"] },
  ];

  const WORKLOAD_OPTIONS = [
    {
      id: "exploratory",
      label: "Exploratory",
      description: "Lighter reading and problem sets, with more room to explore.",
    },
    {
      id: "balanced",
      label: "Balanced",
      description: "A steady mix of reading, projects, and structured coursework.",
    },
    {
      id: "rigorous",
      label: "Rigorous",
      description: "Dense, technical, or high-commitment courses.",
    },
  ];

  const SCHOOL_DEPTS = {
    engineering: ["COMS", "IEOR", "ELEN", "BMEN", "MECE", "CHEN", "CIVI", "STAT"],
    business: ["BUSI", "FINC", "DROM", "ACCT", "BUEC", "MKTG"],
    sipa: ["POLS", "SIPA", "ECON", "SOCI"],
    mailman: ["PUBH", "EPID", "HPM", "BIOL", "PSYC"],
    journalism: ["JOUR", "FILM"],
    law: ["LAW", "POLS"],
    "teachers-college": ["EDUC", "PSYC"],
    gsas: ["COMS", "ECON", "STAT", "QMSS", "POLS", "SOCI", "HIST", "ENGL"],
    "columbia-college": ["COMS", "ECON", "STAT", "POLS", "SOCI", "HIST", "ENGL"],
    "general-studies": ["COMS", "ECON", "STAT", "POLS", "SOCI"],
    barnard: ["COMS", "ECON", "STAT", "POLS", "SOCI", "ENGL"],
    "other-school": [],
  };

  const MIAMI_SCHOOL_DEPTS = {
    "miami-arts-science": ["CSE", "ECO", "STA", "MTH", "POL", "SOC", "HST", "ENG", "BIO", "CHM", "PHY"],
    "miami-business": ["ACC", "FIN", "MKT", "MGT", "ISA", "BUS", "ECO", "ESP"],
    "miami-engineering": ["CSE", "ECE", "MME", "CPB", "EGM", "CYB", "IMS"],
    "miami-creative-arts": ["ARC", "ART", "MUS", "THE", "IMS", "MAC", "JRN"],
    "miami-education-health": ["TCE", "EDL", "EDP", "KNH", "NSG", "FSW", "PSY"],
    "miami-graduate": ["CSE", "ECE", "MME", "CPB", "ACC", "FIN", "ECO", "STA", "PSY", "TCE"],
    "miami-other": [],
  };

  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function institutionForEmail(email) {
    const domain = normalizeEmail(email).split("@").at(-1);
    return domain === "miamioh.edu" || domain.endsWith(".miamioh.edu") ? "miami" : "columbia";
  }

  function institutionLabel(institution) {
    return institution === "miami" ? "Miami University, Oxford" : "Columbia University";
  }

  function profileInstitution(profile) {
    const stored = String(profile?.institution || "").toLowerCase();
    return stored === "miami" || stored === "columbia"
      ? stored
      : institutionForEmail(profile?.email);
  }

  function schoolOptionsFor(stage, institution = "columbia") {
    const source = institution === "miami" ? MIAMI_SCHOOL_OPTIONS : COLUMBIA_SCHOOL_OPTIONS;
    return source[stage] || [];
  }

  function majorOptionsFor(institution = "columbia") {
    return institution === "miami" ? MIAMI_MAJOR_OPTIONS : MAJOR_OPTIONS;
  }

  function schoolMajorsFor(institution = "columbia") {
    return institution === "miami" ? MIAMI_SCHOOL_MAJORS : SCHOOL_MAJORS;
  }

  function interestsFor(institution = "columbia") {
    return institution === "miami" ? MIAMI_INTEREST_OPTIONS : INTEREST_OPTIONS;
  }

  function storageKey(email) {
    return `${KEY_PREFIX}${normalizeEmail(email)}`;
  }

  function read(email) {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey(email)) || "null");
      const complete = value
        && value.version === 1
        && value.email
        && ["undergraduate", "graduate"].includes(value.stage)
        && value.school
        && value.major
        && Array.isArray(value.interests)
        && value.interests.length > 0
        && WORKLOAD_OPTIONS.some((item) => item.id === value.workload);
      return complete ? value : null;
    } catch {
      return null;
    }
  }

  function save(profile) {
    const email = normalizeEmail(profile.email);
    const current = read(email);
    const value = {
      ...profile,
      schedules: current?.schedules || {},
      version: 1,
      email,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(storageKey(email), JSON.stringify(value));
    return value;
  }

  function readSchedules(email) {
    try {
      const cached = JSON.parse(localStorage.getItem(storageKey(email) + ":schedules") || "null");
      if (cached && typeof cached === "object" && !Array.isArray(cached)) return cached;
    } catch {}
    return read(email)?.schedules || {};
  }

  function saveSchedule(email, term, sections) {
    const schedules = {
      ...readSchedules(email),
      [term]: sections.map(({ classId, code }) => ({ classId, code })),
    };
    cacheSchedules(email, schedules);
    return true;
  }

  function cacheSchedules(email, schedules) {
    localStorage.setItem(storageKey(email) + ":schedules", JSON.stringify(schedules));
  }

  function schoolLabel(profile) {
    const institution = profileInstitution(profile);
    const schoolId = institution === "miami" ? (MIAMI_SCHOOL_ALIASES[profile?.school] || profile?.school) : profile?.school;
    return schoolOptionsFor(profile?.stage, institution)
      .find((item) => item.id === schoolId)?.label
      || institutionLabel(institution);
  }

  function major(profile) {
    const institution = profileInstitution(profile);
    const options = majorOptionsFor(institution);
    const majorId = institution === "miami" ? (MIAMI_MAJOR_ALIASES[profile?.major] || profile?.major) : profile?.major;
    return options.find((item) => item.id === majorId) || options.at(-1);
  }

  function majorLabel(profile) {
    return major(profile)?.label || "Undecided";
  }

  function interestLabels(profile) {
    const ids = new Set(profile?.interests || []);
    return interestsFor(profileInstitution(profile)).filter((item) => ids.has(item.id)).map((item) => item.label);
  }

  function courseLevel(code) {
    const match = String(code || "").match(/(\d{3,4})/);
    return match ? Number(match[1]) : null;
  }

  function canViewCourse(profile, code) {
    if (!profile?.stage) return true;
    const level = courseLevel(typeof code === "object" ? code.code : code);
    if (!level) return true;
    if (profile.stage === "undergraduate") return level < 5000;
    if (profile.stage === "graduate") return level >= 4000;
    return true;
  }

  function relevance(profile, course) {
    if (!profile || !course) return 0;
    const institution = profileInstitution(profile);
    const schoolId = institution === "miami" ? (MIAMI_SCHOOL_ALIASES[profile.school] || profile.school) : profile.school;
    const selectedMajor = major(profile);
    const schoolDepartments = institution === "miami" ? MIAMI_SCHOOL_DEPTS : SCHOOL_DEPTS;
    const interestOptions = interestsFor(institution);
    const department = String(course.deptCode || "").toUpperCase();
    const haystack = `${course.code || ""} ${course.title || ""} ${course.desc || ""}`.toLowerCase();
    let score = selectedMajor?.deptCodes?.includes(department) ? 60 : 0;
    if (schoolDepartments[schoolId]?.includes(department)) score += 18;
    for (const keyword of selectedMajor?.keywords || []) {
      if (haystack.includes(keyword)) score += 8;
    }
    for (const interest of interestOptions) {
      if (!(profile.interests || []).includes(interest.id)) continue;
      if (interest.deptCodes?.includes(department)) score += 18;
      for (const keyword of interest.keywords || []) {
        if (haystack.includes(keyword)) score += 5;
      }
    }
    const level = courseLevel(course.code) || 0;
    const credits = Number(course.minPoints ?? course.points ?? course.section?.points ?? 3);
    const demand = (level >= 5000 ? 2 : level >= 4000 ? 1 : 0)
      + (credits >= 4 ? 2 : credits >= 3 ? 1 : 0);
    if (profile.workload === "exploratory") score += Math.max(0, 4 - demand) * 4;
    else if (profile.workload === "balanced") score += demand === 2 ? 6 : demand === 1 ? 8 : 5;
    else if (profile.workload === "rigorous") score += demand * 5;
    return score;
  }

  window.AntivergilProfile = {
    KEY_PREFIX,
    SCHOOL_OPTIONS: COLUMBIA_SCHOOL_OPTIONS,
    COLUMBIA_SCHOOL_OPTIONS,
    MIAMI_SCHOOL_OPTIONS,
    MAJOR_OPTIONS,
    MIAMI_MAJOR_OPTIONS,
    SCHOOL_MAJORS,
    MIAMI_SCHOOL_MAJORS,
    INTEREST_OPTIONS,
    MIAMI_INTEREST_OPTIONS,
    WORKLOAD_OPTIONS,
    SCHOOL_DEPTS,
    MIAMI_SCHOOL_DEPTS,
    normalizeEmail,
    institutionForEmail,
    institutionLabel,
    schoolOptionsFor,
    majorOptionsFor,
    schoolMajorsFor,
    interestsFor,
    read,
    save,
    readSchedules,
    saveSchedule,
    cacheSchedules,
    schoolLabel,
    major,
    majorLabel,
    interestLabels,
    courseLevel,
    canViewCourse,
    relevance,
  };
})();
