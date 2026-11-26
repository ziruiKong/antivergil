(function () {
  const store = window.AntivergilProfile;
  const stepsHost = document.querySelector("#profile-steps");
  const progressFill = document.querySelector("#profile-progress-fill");
  const progressRoot = progressFill?.closest(".profile-progress");
  const localOnboardingPreview = ["localhost", "127.0.0.1"].includes(location.hostname)
    && new URLSearchParams(location.search).get("preview") === "onboarding";
  let user = null;
  try { user = JSON.parse(localStorage.getItem("cu-auth-user") || "null"); } catch {}
  if (!user?.email) {
    try {
      const entry = document.cookie.split("; ").find((item) => item.startsWith("antivergil-auth="));
      user = entry ? JSON.parse(decodeURIComponent(entry.slice("antivergil-auth=".length))) : null;
      if (user?.email) localStorage.setItem("cu-auth-user", JSON.stringify(user));
    } catch {}
  }
  if (localOnboardingPreview) {
    user = { email: "preview@student.ubc.ca", name: "Preview Student", sub: "local-onboarding-preview" };
  }

  if (!user?.email || !store) {
    try { sessionStorage.setItem("antivergil-next", "/onboarding/"); } catch {}
    location.replace("/login/");
    return;
  }

  const existing = localOnboardingPreview ? null : store.read(user.email);
  const state = {
    stage: existing?.stage || "",
    school: existing?.school || "",
    major: existing?.major || "",
    interests: Array.isArray(existing?.interests) ? [...existing.interests] : [],
    workload: existing?.workload || "",
    step: existing ? 4 : 0,
    majorQuery: "",
  };

  const esc = (value) => String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  function choicesForStage(items) {
    return items.filter((item) => !item.stages || item.stages.includes(state.stage));
  }

  function majorsForSelection() {
    const allowedMajors = store.SCHOOL_MAJORS?.[state.school];
    return choicesForStage(store.MAJOR_OPTIONS).filter((item) => !allowedMajors || allowedMajors.includes(item.id));
  }

  function choiceMarkup(item, selected, extra = "") {
    return `<button class="profile-choice${selected ? " is-selected" : ""}" type="button" data-${extra || "choice"}="${esc(item.id)}" aria-pressed="${selected}">${esc(item.label)}</button>`;
  }

  function activePanel(index) {
    if (index === 0) {
      return `
        <h2 tabindex="-1">Where are you studying?</h2>
        <div class="profile-options">
          <button class="profile-choice${state.stage === "undergraduate" ? " is-selected" : ""}" type="button" data-stage="undergraduate">
            Undergraduate
          </button>
          <button class="profile-choice${state.stage === "graduate" ? " is-selected" : ""}" type="button" data-stage="graduate">
            Graduate
          </button>
        </div>`;
    }
    if (index === 1) {
      const schools = store.SCHOOL_OPTIONS[state.stage] || [];
      return `
        <h2 tabindex="-1">Which school are you in?</h2>
        <div class="profile-options">
          ${schools.map((school) => choiceMarkup(school, state.school === school.id, "school")).join("")}
        </div>`;
    }
    if (index === 2) {
      const majors = majorsForSelection();
      return `
        <h2 tabindex="-1">What do you study?</h2>
        <p class="profile-major-context">Fields for ${esc(store.schoolLabel(state))}</p>
        <input class="profile-major-search" id="profile-major-search" type="search" value="${esc(state.majorQuery)}" placeholder="Find your major or field" autocomplete="off">
        <div class="profile-major-grid" id="profile-major-grid">
          ${majors.filter((item) => item.label.toLowerCase().includes(state.majorQuery.toLowerCase())).map((major) => choiceMarkup(major, state.major === major.id, "major")).join("") || `<p class="profile-major-empty">No matching field for this school.</p>`}
        </div>`;
    }
    if (index === 3) {
      return `
        <h2 tabindex="-1">What are you curious about?</h2>
        <div class="profile-interest-grid">
          ${store.INTEREST_OPTIONS.map((interest) => `
            <button class="profile-interest${state.interests.includes(interest.id) ? " is-selected" : ""}" type="button" data-interest="${esc(interest.id)}" aria-pressed="${state.interests.includes(interest.id)}">${esc(interest.label)}</button>`).join("")}
        </div>`;
    }
    if (index === 4) {
      return `
        <h2 tabindex="-1">What course rhythm fits you?</h2>
        <div class="profile-options profile-workload-options">
          ${store.WORKLOAD_OPTIONS.map((option) => `
            <button class="profile-choice${state.workload === option.id ? " is-selected" : ""}" type="button" data-workload="${esc(option.id)}" aria-pressed="${state.workload === option.id}">
              ${esc(option.label)}
              <small>${esc(option.description)}</small>
            </button>`).join("")}
        </div>`;
    }
    return "";
  }

  function isComplete(index) {
    if (index === 0) return Boolean(state.stage);
    if (index === 1) return Boolean(state.school);
    if (index === 2) return Boolean(state.major);
    if (index === 3) return state.interests.length > 0;
    if (index === 4) return Boolean(state.workload);
    return false;
  }

  function render() {
    const total = 5;
    const allComplete = isComplete(0) && isComplete(1) && isComplete(2) && isComplete(3) && isComplete(4);
    const position = allComplete ? total : Math.min(total, state.step);
    progressFill.style.width = `${Math.min(100, (position / total) * 100)}%`;
    progressRoot?.classList.toggle("has-progress", position > 0);
    stepsHost.innerHTML = [0, 1, 2, 3, 4].map((index) => {
      const complete = isComplete(index);
      const active = state.step === index;
      const hidden = index > state.step && !complete;
      return `<li class="profile-step${active ? " is-active" : ""}${complete && !active ? " is-complete" : ""}${hidden ? " is-pending" : ""}" data-step="${index}">
        <span class="profile-step-marker" aria-hidden="true"></span>
        <div class="profile-step-body">
          ${activePanel(index)}
        </div>
      </li>`;
    }).join("");
    stepsHost.querySelector(".profile-step.is-active h2")?.focus({ preventScroll: true });
  }

  function advance(index) {
    state.step = index;
    render();
  }

  function finishProfile() {
    if (!isComplete(0) || !isComplete(1) || !isComplete(2) || !isComplete(3) || !isComplete(4)) return;
    if (localOnboardingPreview) return;
    store.save({
      email: user.email,
      stage: state.stage,
      school: state.school,
      major: state.major,
      interests: state.interests,
      workload: state.workload,
      completedAt: new Date().toISOString(),
    });
    let next = "/browse/";
    try { next = sessionStorage.getItem("antivergil-next") || next; sessionStorage.removeItem("antivergil-next"); } catch {}
    if (/^\/profile\/?/.test(next)) next = "/browse/";
    location.assign(next);
  }

  stepsHost.addEventListener("click", (event) => {
    const stage = event.target.closest("[data-stage]");
    if (stage) {
      state.stage = stage.dataset.stage;
      if (!store.SCHOOL_OPTIONS[state.stage]?.some((item) => item.id === state.school)) state.school = "";
      if (state.major && !majorsForSelection().some((item) => item.id === state.major)) state.major = "";
      advance(1);
      return;
    }
    const school = event.target.closest("[data-school]");
    if (school) {
      state.school = school.dataset.school;
      if (state.major && !majorsForSelection().some((item) => item.id === state.major)) state.major = "";
      state.majorQuery = "";
      advance(2);
      return;
    }
    const major = event.target.closest("[data-major]");
    if (major) {
      state.major = major.dataset.major;
      advance(3);
      return;
    }
    const interest = event.target.closest("[data-interest]");
    if (interest) {
      const id = interest.dataset.interest;
      const isSelected = state.interests.includes(id);
      if (!isSelected && state.interests.length >= 5) return;
      state.interests = isSelected
        ? state.interests.filter((value) => value !== id)
        : [...state.interests, id];
      if (!isSelected && state.step < 4) state.step = 4;
      if (!state.interests.length) state.step = 3;
      render();
      return;
    }
    const workload = event.target.closest("[data-workload]");
    if (workload) {
      state.workload = workload.dataset.workload;
      finishProfile();
      return;
    }
  });

  stepsHost.addEventListener("input", (event) => {
    if (event.target.id !== "profile-major-search") return;
    state.majorQuery = event.target.value;
    const cursor = event.target.selectionStart;
    render();
    const input = document.querySelector("#profile-major-search");
    input?.focus();
    input?.setSelectionRange(cursor, cursor);
  });

  const firstIncomplete = [0, 1, 2, 3, 4].find((index) => !isComplete(index));
  if (firstIncomplete != null) state.step = Math.min(state.step, firstIncomplete);
  let stickyFrame = 0;
  const updateStickyState = () => {
    stickyFrame = 0;
    if (!progressRoot) return;
    progressRoot.classList.toggle("is-stuck", progressRoot.getBoundingClientRect().top <= 0.5);
  };
  const queueStickyState = () => {
    if (stickyFrame) return;
    stickyFrame = requestAnimationFrame(updateStickyState);
  };
  window.addEventListener("scroll", queueStickyState, { passive: true });
  window.addEventListener("resize", queueStickyState);
  render();
  updateStickyState();
})();
