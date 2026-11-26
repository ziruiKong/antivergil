(() => {
  "use strict";

  const rawSections = Array.isArray(window.COURSES_2027_SPRING)
    ? window.COURSES_2027_SPRING
    : [];
  const PAGE_SIZE = 18;
  const courseImages = [
    "assets/intro/intro-library.jpg",
    "assets/intro/intro-classroom.jpg",
    "assets/intro/intro-students.jpg",
    "assets/intro/intro-campus.jpg",
    "assets/intro/intro-reading.jpg",
    "assets/intro/intro-architecture.jpg",
    "assets/intro/intro-books.jpg",
    "assets/intro/intro-group.jpg",
    "assets/intro/intro-lecture.jpg",
    "assets/intro/intro-exam.jpg",
    "assets/intro/intro-study.jpg",
  ];
  const featuredDepartments = [
    "COMS", "ECON", "PSYC", "POLS", "HIST", "SOCI", "PHIL", "STAT",
    "ARCH", "RELI", "WRIT", "VIAR", "MUSI", "ANTH", "SIPA", "INAF",
    "JOUR", "URBS", "ENGL", "BIOL", "CHEM", "PHYS", "MATH", "IEOR",
  ];
  const levelLabels = {
    all: "All levels",
    1000: "1000 level",
    2000: "2000 level",
    3000: "3000 level",
    4000: "4000 level",
    6000: "Graduate",
  };
  const state = {
    query: "",
    level: "all",
    sort: "featured",
    visible: PAGE_SIZE,
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const escapeHTML = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
  const normalize = (value) => String(value || "").trim().toUpperCase();
  const normalizeSearch = (value) => String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u00c0-\u024f]+/g, " ")
    .trim();
  const numberFormatter = new Intl.NumberFormat("en-US");
  const formatNumber = (value) => numberFormatter.format(value);
  const dayLabels = ["M", "T", "W", "R", "F", "S", "U"];

  function levelOf(code) {
    const match = normalize(code).match(/(\d{4})/);
    return match ? Number(match[1]) : 0;
  }

  function levelBucket(level) {
    if (level >= 6000) return "6000";
    if (level >= 4000) return "4000";
    if (level >= 3000) return "3000";
    if (level >= 2000) return "2000";
    if (level >= 1000) return "1000";
    return "all";
  }

  function sectionNumber(section) {
    const tail = String(section.classId || "").split("-").pop();
    return tail || section.callNumber || "—";
  }

  function timeLabel(section) {
    if (!section.startLabel && !section.endLabel) return "Time TBA";
    return `${section.startLabel || "TBA"}–${section.endLabel || "TBA"}`;
  }

  function dayLabel(section) {
    const days = Array.isArray(section.days) ? section.days : [];
    return days.length ? days.map((day) => dayLabels[Number(day) - 1] || "?").join(" ") : "Days TBA";
  }

  function availability(section) {
    const capacity = Number(section.capacity);
    const enrolled = Number(section.enrolled);
    if (!Number.isFinite(capacity) || capacity <= 0) {
      return { capacity: null, enrolled: Number.isFinite(enrolled) ? enrolled : 0, open: null, pct: null };
    }
    const current = Number.isFinite(enrolled) ? enrolled : 0;
    return {
      capacity,
      enrolled: current,
      open: Math.max(0, capacity - current),
      pct: Math.min(100, Math.round(current / capacity * 100)),
    };
  }

  function departmentName(section) {
    return String(section.dept || section.deptCode || "Columbia University").replace(/\s+\([^)]+\)$/, "");
  }

  function imageFor(code) {
    let hash = 0;
    for (const character of code) hash = (hash * 33 + character.charCodeAt(0)) >>> 0;
    return courseImages[hash % courseImages.length];
  }

  function buildCourses() {
    const grouped = new Map();
    for (const section of rawSections) {
      const code = normalize(section.code);
      if (!code) continue;
      if (!grouped.has(code)) {
        grouped.set(code, {
          code,
          title: section.title || "Untitled course",
          dept: departmentName(section),
          deptCode: normalize(section.deptCode || code.split(" ")[0]),
          level: levelOf(code),
          desc: section.desc || section.subtitle || "",
          sections: [],
        });
      }
      const course = grouped.get(code);
      course.sections.push(section);
      if (!course.desc && section.desc) course.desc = section.desc;
    }

    return [...grouped.values()].map((course) => {
      const preferredIndex = featuredDepartments.indexOf(course.deptCode);
      course.featuredRank = preferredIndex === -1 ? featuredDepartments.length + 100 : preferredIndex;
      course.searchText = normalizeSearch([
        course.code,
        course.title,
        course.dept,
        course.deptCode,
        ...course.sections.map((section) => section.instructor || ""),
      ].join(" "));
      course.openSeats = course.sections.reduce((total, section) => {
        const seats = availability(section).open;
        return total + (seats ?? 0);
      }, 0);
      course.image = imageFor(`${course.deptCode}-${course.code}`);
      return course;
    });
  }

  const courses = buildCourses();

  // Make the default view feel like an editorial catalogue rather than an
  // alphabetical dump: rotate across departments while keeping their best
  // represented courses near the front.
  const editorialBuckets = new Map();
  for (const course of courses) {
    if (!editorialBuckets.has(course.deptCode)) editorialBuckets.set(course.deptCode, []);
    editorialBuckets.get(course.deptCode).push(course);
  }
  const editorialDepartments = [...editorialBuckets.keys()].sort((a, b) => {
    const aRank = featuredDepartments.includes(a) ? featuredDepartments.indexOf(a) : featuredDepartments.length;
    const bRank = featuredDepartments.includes(b) ? featuredDepartments.indexOf(b) : featuredDepartments.length;
    return aRank - bRank || a.localeCompare(b);
  });
  for (const bucket of editorialBuckets.values()) {
    bucket.sort((a, b) => b.sections.length - a.sections.length || a.code.localeCompare(b.code));
  }
  const editorialOrder = [];
  let editorialRound = 0;
  while (editorialOrder.length < courses.length) {
    let added = false;
    for (const department of editorialDepartments) {
      const course = editorialBuckets.get(department)?.[editorialRound];
      if (!course) continue;
      editorialOrder.push(course);
      added = true;
    }
    if (!added) break;
    editorialRound += 1;
  }
  editorialOrder.forEach((course, index) => {
    course.editorialRank = index;
    course.image = courseImages[index % courseImages.length];
  });

  function filteredCourses() {
    const tokens = normalizeSearch(state.query).split(" ").filter(Boolean);
    const filtered = courses.filter((course) => {
      if (tokens.length && !tokens.every((token) => course.searchText.includes(token))) return false;
      if (state.level !== "all" && levelBucket(course.level) !== state.level) return false;
      return true;
    });

    filtered.sort((a, b) => {
      if (state.sort === "code") return a.code.localeCompare(b.code);
      if (state.sort === "availability") return b.openSeats - a.openSeats || a.code.localeCompare(b.code);
      if (state.sort === "sections") return b.sections.length - a.sections.length || a.code.localeCompare(b.code);
      return a.editorialRank - b.editorialRank;
    });
    return filtered;
  }

  function sectionChoiceMarkup(course, activeIndex = 0) {
    const shown = course.sections.slice(0, 5);
    return shown.map((section, index) => {
      return `<button
        class="section-choice${index === activeIndex ? " active" : ""}"
        type="button"
        data-course="${escapeHTML(course.code)}"
        data-section-index="${index}"
        aria-label="Show section ${escapeHTML(sectionNumber(section))}"
        aria-pressed="${index === activeIndex}">${escapeHTML(sectionNumber(section))}</button>`;
    }).join("") + (course.sections.length > 5
      ? `<button class="section-choice more" type="button" data-open-course="${escapeHTML(course.code)}" aria-label="View all ${course.sections.length} sections">+${course.sections.length - 5}</button>`
      : "");
  }

  function factualMarkup(section) {
    const seats = availability(section);
    return `
      <div class="section-fact"><span>Section</span><strong>${escapeHTML(sectionNumber(section))}</strong></div>
      <div class="section-fact"><span>Credits</span><strong>${escapeHTML(section.pointsLabel || section.points || "—")}</strong></div>
      <div class="section-fact"><span>Meeting</span><strong>${escapeHTML(`${dayLabel(section)} · ${timeLabel(section)}`)}</strong></div>
      <div class="section-fact"><span>Seats</span><strong>${seats.open == null ? "Capacity unknown" : `${seats.open} open`}</strong></div>`;
  }

  function cardMarkup(course, index) {
    const section = course.sections[0];
    const instructor = section.instructor || "Instructor TBA";
    return `
      <article class="course-card" data-course-card="${escapeHTML(course.code)}">
        <div class="course-card-info">
          <div class="course-card-tabs" aria-hidden="true">
            <span>Overview</span>
            <span class="active">Sections</span>
          </div>
          <p class="course-department">${escapeHTML(course.dept)}</p>
          <h3 class="course-title" title="${escapeHTML(course.title)}">${escapeHTML(course.title)}</h3>
          <div class="section-config">
            <div class="section-config-head">
              <span>Sections</span>
              <span>Section <b data-section-label>${escapeHTML(sectionNumber(section))}</b></span>
            </div>
            <div class="section-choices" aria-label="Available sections">${sectionChoiceMarkup(course)}</div>
            <p class="course-instructor">${escapeHTML(instructor)}</p>
            <div class="section-facts" data-section-facts>${factualMarkup(section)}</div>
          </div>
          <div class="course-card-footer">
            <button class="view-course" type="button" data-open-course="${escapeHTML(course.code)}">View sections</button>
          </div>
        </div>
      </article>`;
  }

  function renderSummary(total) {
    const shown = Math.min(state.visible, total);
    $("#result-summary").textContent = `${formatNumber(shown)} of ${formatNumber(total)} courses`;
    const filters = [];
    if (state.query) filters.push(`“${state.query}”`);
    if (state.level !== "all") filters.push(levelLabels[state.level]);
    const active = $("#active-filters");
    active.hidden = filters.length === 0;
    active.innerHTML = filters.length
      ? `<span>Showing</span>${filters.map((label) => `<span class="active-filter-pill">${escapeHTML(label)}<button type="button" data-clear-active aria-label="Remove filter">×</button></span>`).join("")}`
      : "";
    $("#filter-count").textContent = state.level === "all" ? "0" : "1";
    $("#filter-count").hidden = state.level === "all";
  }

  function render() {
    const list = filteredCourses();
    renderSummary(list.length);
    const grid = $("#course-grid");
    const empty = $("#empty-state");
    const load = $("#load-more");

    if (!list.length) {
      grid.innerHTML = "";
      grid.hidden = true;
      empty.hidden = false;
      load.hidden = true;
      return;
    }

    grid.hidden = false;
    empty.hidden = true;
    grid.innerHTML = list.slice(0, state.visible).map(cardMarkup).join("");
    load.hidden = state.visible >= list.length;
  }

  function updateCardSection(button) {
    const courseCode = button.dataset.course;
    const index = Number(button.dataset.sectionIndex);
    const course = courses.find((entry) => entry.code === courseCode);
    const card = $(`[data-course-card="${CSS.escape(courseCode)}"]`);
    if (!course || !card || !course.sections[index]) return;
    const section = course.sections[index];
    $$(".section-choice[data-course]", card).forEach((choice) => {
      const active = choice === button;
      choice.classList.toggle("active", active);
      choice.setAttribute("aria-pressed", String(active));
    });
    $("[data-section-label]", card).textContent = sectionNumber(section);
    $("[data-section-facts]", card).innerHTML = factualMarkup(section);
    $(".course-instructor", card).textContent = section.instructor || "Instructor TBA";
  }

  function dialogSectionMarkup(course) {
    return course.sections.map((section, index) => {
      const seats = availability(section);
      const seatsText = seats.open == null
        ? `${seats.enrolled} enrolled`
        : `${seats.enrolled} / ${seats.capacity} · ${seats.open} open`;
      return `
        <div class="dialog-section">
          <span class="dialog-section-index">${String(index + 1).padStart(2, "0")}</span>
          <div><strong>Section ${escapeHTML(sectionNumber(section))}</strong><small>${escapeHTML(section.type || "Course section")}</small></div>
          <div><strong>${escapeHTML(dayLabel(section))}</strong><small>${escapeHTML(timeLabel(section))}</small></div>
          <div><strong>${escapeHTML(section.instructor || "Instructor TBA")}</strong><small>${escapeHTML(section.location || "Location TBA")}</small></div>
          <a href="${escapeHTML(section.link || "#")}" target="_blank" rel="noopener">${escapeHTML(seatsText)} ↗</a>
        </div>`;
    }).join("");
  }

  function openCourse(code) {
    const course = courses.find((entry) => entry.code === code);
    if (!course) return;
    const first = course.sections[0];
    const firstSeats = availability(first);
    const instructors = [...new Set(course.sections.map((section) => section.instructor).filter(Boolean))];
    const description = String(course.desc || "").trim()
      || "Open the Columbia directory to review the latest course description, prerequisites, and section notes.";
    $("#dialog-content").innerHTML = `
      <div class="dialog-hero">
        <div>
          <p class="eyebrow">${escapeHTML(course.dept)} <span>·</span> ${escapeHTML(course.code)}</p>
          <h2>${escapeHTML(course.title)}</h2>
          <p class="dialog-description">${escapeHTML(description.slice(0, 540))}${description.length > 540 ? "…" : ""}</p>
        </div>
        <div class="dialog-poster">
          <img src="${escapeHTML(course.image)}" alt="" />
          <div class="dialog-poster-meta">
            <strong>${escapeHTML(course.deptCode)}</strong>
            <span>Spring 2027 · ${course.sections.length} ${course.sections.length === 1 ? "section" : "sections"}</span>
          </div>
        </div>
        <aside class="dialog-options" aria-label="Course options">
          <div class="dialog-options-tabs"><span>Overview</span><span>Sections</span></div>
          <div class="dialog-options-label"><span>Sections</span><span>Section ${escapeHTML(sectionNumber(first))}</span></div>
          <div class="dialog-options-sections">${course.sections.slice(0, 8).map((section, index) => `<span class="${index === 0 ? "active" : ""}">${escapeHTML(sectionNumber(section))}</span>`).join("")}</div>
          <p class="dialog-options-name">${escapeHTML(first.instructor || "Instructor TBA")}</p>
          <p class="dialog-options-instruction">Choose another tile to compare available sections. Course-level details remain the same.</p>
          <div class="dialog-option-row"><span>Code</span><strong>${escapeHTML(course.code)}</strong></div>
          <div class="dialog-option-row"><span>Credits</span><strong>${escapeHTML(first.pointsLabel || first.points || "—")}</strong></div>
          <div class="dialog-option-row"><span>Meeting</span><strong>${escapeHTML(`${dayLabel(first)} · ${timeLabel(first)}`)}</strong></div>
          <div class="dialog-option-row"><span>Seats</span><strong>${firstSeats.open == null ? "Capacity unknown" : `${firstSeats.open} open`}</strong></div>
          <a class="dialog-options-link" href="${escapeHTML(first.link || "#")}" target="_blank" rel="noopener">View in Columbia directory ↗</a>
        </aside>
      </div>
      <div class="dialog-body">
        <div class="dialog-facts">
          <div class="dialog-fact"><span>Course code</span><strong>${escapeHTML(course.code)}</strong></div>
          <div class="dialog-fact"><span>Department</span><strong>${escapeHTML(course.dept)}</strong></div>
          <div class="dialog-fact"><span>Instructor${instructors.length === 1 ? "" : "s"}</span><strong>${escapeHTML(instructors.join(", ") || "TBA")}</strong></div>
          <div class="dialog-fact"><span>Level</span><strong>${escapeHTML(course.level || "—")}</strong></div>
        </div>
        <section aria-labelledby="dialog-section-title">
          <div class="dialog-sections-head">
            <h3 id="dialog-section-title">Sections</h3>
            <span>${course.sections.length} ${course.sections.length === 1 ? "option" : "options"}</span>
          </div>
          <div class="dialog-section-list">${dialogSectionMarkup(course)}</div>
        </section>
      </div>`;
    const dialog = $("#course-dialog");
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function resetAll() {
    state.query = "";
    state.level = "all";
    state.sort = "featured";
    state.visible = PAGE_SIZE;
    $("#course-search").value = "";
    $("#sort-select").value = "featured";
    $$("#level-filters .filter-chip").forEach((chip) => {
      chip.classList.toggle("active", chip.dataset.level === "all");
    });
    render();
  }

  let searchFrame = 0;
  $("#course-search").addEventListener("input", (event) => {
    cancelAnimationFrame(searchFrame);
    searchFrame = requestAnimationFrame(() => {
      state.query = event.target.value.trim();
      state.visible = PAGE_SIZE;
      render();
    });
  });

  $("#filter-button").addEventListener("click", () => {
    const drawer = $("#filter-drawer");
    const open = drawer.hidden;
    drawer.hidden = !open;
    $("#filter-button").setAttribute("aria-expanded", String(open));
  });

  $("#level-filters").addEventListener("click", (event) => {
    const button = event.target.closest("[data-level]");
    if (!button) return;
    state.level = button.dataset.level;
    state.visible = PAGE_SIZE;
    $$("#level-filters .filter-chip").forEach((chip) => {
      chip.classList.toggle("active", chip === button);
    });
    render();
  });

  $("#sort-select").addEventListener("change", (event) => {
    state.sort = event.target.value;
    state.visible = PAGE_SIZE;
    render();
  });

  $("#clear-filters").addEventListener("click", () => {
    state.level = "all";
    state.sort = "featured";
    state.visible = PAGE_SIZE;
    $("#sort-select").value = "featured";
    $$("#level-filters .filter-chip").forEach((chip) => {
      chip.classList.toggle("active", chip.dataset.level === "all");
    });
    render();
  });

  $("#active-filters").addEventListener("click", (event) => {
    if (!event.target.closest("[data-clear-active]")) return;
    state.query = "";
    state.level = "all";
    state.visible = PAGE_SIZE;
    $("#course-search").value = "";
    $$("#level-filters .filter-chip").forEach((chip) => {
      chip.classList.toggle("active", chip.dataset.level === "all");
    });
    render();
  });

  $("#course-grid").addEventListener("click", (event) => {
    const choice = event.target.closest(".section-choice[data-course]");
    if (choice) {
      updateCardSection(choice);
      return;
    }
    const opener = event.target.closest("[data-open-course]");
    if (opener) openCourse(opener.dataset.openCourse);
  });

  $("#load-more").addEventListener("click", () => {
    state.visible += PAGE_SIZE;
    render();
  });

  $("#empty-reset").addEventListener("click", resetAll);
  $("#dialog-close").addEventListener("click", () => $("#course-dialog").close());
  $("#course-dialog").addEventListener("click", (event) => {
    if (event.target === $("#course-dialog")) $("#course-dialog").close();
  });

  document.addEventListener("keydown", (event) => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || "");
    if (event.key === "/" && !typing) {
      event.preventDefault();
      $("#course-search").focus();
    }
  });

  render();
})();
