(function () {
  const store = window.AntivergilProfile;
  const stepsHost = document.querySelector("#profile-steps");
  const progressFill = document.querySelector("#profile-progress-fill");
  const progressRoot = progressFill?.closest(".profile-progress");
  let user = null;
  try { user = JSON.parse(localStorage.getItem("cu-auth-user") || "null"); } catch {}

  if (!user?.email || !store) {
    try { sessionStorage.setItem("antivergil-next", "/profile/"); } catch {}
    location.replace("/login/");
    return;
  }

  const existing = store.read(user.email);
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
            <small>Undergraduate and joint courses</small>
          </button>
          <button class="profile-choice${state.stage === "graduate" ? " is-selected" : ""}" type="button" data-stage="graduate">
            Graduate
            <small>Graduate and joint courses</small>
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
      const majors = choicesForStage(store.MAJOR_OPTIONS);
      return `
        <h2 tabindex="-1">What do you study?</h2>
        <input class="profile-major-search" id="profile-major-search" type="search" value="${esc(state.majorQuery)}" placeholder="Find your major or field" autocomplete="off">
        <div class="profile-major-grid" id="profile-major-grid">
          ${majors.filter((item) => item.label.toLowerCase().includes(state.majorQuery.toLowerCase())).map((major) => choiceMarkup(major, state.major === major.id, "major")).join("") || `<p class="profile-major-empty">No matching field. Choose “Other / Interdisciplinary”.</p>`}
        </div>`;
    }
    if (index === 3) {
      return `
        <h2 tabindex="-1">What are you curious about?</h2>
        <div class="profile-interest-grid">
          ${store.INTEREST_OPTIONS.map((interest) => `
            <button class="profile-interest${state.interests.includes(interest.id) ? " is-selected" : ""}" type="button" data-interest="${esc(interest.id)}" aria-pressed="${state.interests.includes(interest.id)}">${esc(interest.label)}</button>`).join("")}
        </div>
        <div class="profile-actions">
          <span class="profile-count">${state.interests.length} selected</span>
          <button class="profile-primary" type="button" data-interests-continue ${state.interests.length ? "" : "disabled"}>Continue <span>↗</span></button>
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
      if (state.major && !choicesForStage(store.MAJOR_OPTIONS).some((item) => item.id === state.major)) state.major = "";
      advance(1);
      return;
    }
    const school = event.target.closest("[data-school]");
    if (school) {
      state.school = school.dataset.school;
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
      state.interests = state.interests.includes(id)
        ? state.interests.filter((value) => value !== id)
        : [...state.interests, id];
      render();
      return;
    }
    if (event.target.closest("[data-interests-continue]") && state.interests.length) {
      advance(4);
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

  render();
})();
