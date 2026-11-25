(function () {
  const KEY_PREFIX = "antivergil-profile-v1:";

  const SCHOOL_OPTIONS = {
    undergraduate: [
      { id: "columbia-college", label: "Columbia College" },
      { id: "engineering", label: "Fu Foundation School of Engineering and Applied Science" },
      { id: "general-studies", label: "School of General Studies" },
      { id: "barnard", label: "Barnard College" },
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
  };

  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function storageKey(email) {
    return `${KEY_PREFIX}${normalizeEmail(email)}`;
  }

  function read(email) {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey(email)) || "null");
      return value && value.version === 1 && value.email ? value : null;
    } catch {
      return null;
    }
  }

  function save(profile) {
    const email = normalizeEmail(profile.email);
    const value = {
      ...profile,
      version: 1,
      email,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(storageKey(email), JSON.stringify(value));
    return value;
  }

  function schoolLabel(profile) {
    return SCHOOL_OPTIONS[profile?.stage]?.find((item) => item.id === profile.school)?.label
      || "Columbia University";
  }

  function major(profile) {
    return MAJOR_OPTIONS.find((item) => item.id === profile?.major) || MAJOR_OPTIONS.at(-1);
  }

  function majorLabel(profile) {
    return major(profile)?.label || "Undecided";
  }

  function interestLabels(profile) {
    const ids = new Set(profile?.interests || []);
    return INTEREST_OPTIONS.filter((item) => ids.has(item.id)).map((item) => item.label);
  }

  function courseLevel(code) {
    const match = String(code || "").match(/(\d{4})/);
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
    const selectedMajor = major(profile);
    const department = String(course.deptCode || "").toUpperCase();
    const haystack = `${course.code || ""} ${course.title || ""} ${course.desc || ""}`.toLowerCase();
    let score = selectedMajor?.deptCodes?.includes(department) ? 60 : 0;
    if (SCHOOL_DEPTS[profile.school]?.includes(department)) score += 18;
    for (const keyword of selectedMajor?.keywords || []) {
      if (haystack.includes(keyword)) score += 8;
    }
    for (const interest of INTEREST_OPTIONS) {
      if (!(profile.interests || []).includes(interest.id)) continue;
      if (interest.deptCodes?.includes(department)) score += 18;
      for (const keyword of interest.keywords || []) {
        if (haystack.includes(keyword)) score += 5;
      }
    }
    return score;
  }

  window.AntivergilProfile = {
    KEY_PREFIX,
    SCHOOL_OPTIONS,
    MAJOR_OPTIONS,
    INTEREST_OPTIONS,
    SCHOOL_DEPTS,
    normalizeEmail,
    read,
    save,
    schoolLabel,
    major,
    majorLabel,
    interestLabels,
    courseLevel,
    canViewCourse,
    relevance,
  };
})();
