const trackContent = {
  research: {
    label: "EDITORIAL & STORYTELLING",
    title: "采编策划组",
    description:
      "适合对文字表达、人物采访、选题策划和推文结构感兴趣的同学。你会学习如何抓住重点、搭建内容框架，并把学院故事写得更有层次和温度。",
    tags: ["选题策划", "采访撰稿", "推文编辑"],
    highlights: [
      "快速建立内容敏感度和选题判断力",
      "学习把学院活动和人物故事写得更清楚、更耐看",
      "跟着学长学姐完成从协作执行到独立出稿的进阶"
    ]
  },
  media: {
    label: "MEDIA & VISUAL",
    title: "视觉设计组",
    description:
      "如果你喜欢海报设计、推文排版、封面视觉和品牌统一感，这里会让你的审美和画面组织能力真正被看见，并逐渐沉淀成完整作品。",
    tags: ["海报设计", "推文排版", "封面视觉"],
    highlights: [
      "参与学院活动与品牌内容的视觉输出",
      "学习从概念、排版到成稿的完整设计逻辑",
      "把设计感和学院气质稳定地结合起来"
    ]
  },
  event: {
    label: "PHOTO & VIDEO",
    title: "摄影摄像组",
    description:
      "适合喜欢拍摄现场、捕捉细节、剪辑视频或用镜头讲故事的同学。你会走进活动现场，也会在后期里学习如何让画面更有叙事感。",
    tags: ["活动跟拍", "视频剪辑", "画面叙事"],
    highlights: [
      "参与真实活动现场的摄影与摄像记录",
      "学习构图、运镜、剪辑和节奏表达的基础方法",
      "在一次次输出中建立属于自己的影像风格"
    ]
  },
  ops: {
    label: "OPERATION & TEAMWORK",
    title: "运营统筹组",
    description:
      "如果你细致、可靠、善于沟通和推进流程，运营统筹会很适合你。它负责栏目协同、进度安排、发布节奏和团队连接，是内容稳定输出的重要底层。",
    tags: ["发布运营", "项目协同", "节奏统筹"],
    highlights: [
      "建立清晰高效的协作与沟通习惯",
      "在细节里培养责任感、节奏感和执行力",
      "成为让整个传媒中心运转更顺畅的重要一环"
    ]
  }
};

const revealSections = document.querySelectorAll(".reveal-section");
const counterElements = document.querySelectorAll("[data-counter]");
const progressLine = document.querySelector(".progress-line__value");
const siteHeader = document.querySelector(".site-header");
const heroVisual = document.querySelector(".hero__visual");
const pageSections = document.querySelectorAll("[data-page-section]");
const pageDots = document.querySelectorAll("[data-page-dot]");
const pageSectionList = [...pageSections];
const trackButtons = document.querySelectorAll(".track-pill");
const trackShowcase = document.getElementById("trackShowcase");
const faqItems = document.querySelectorAll(".faq-item");
const modal = document.getElementById("signupModal");
const openModalButtons = document.querySelectorAll("[data-open-modal]");
const closeModalButtons = document.querySelectorAll("[data-close-modal]");
const signupForm = document.getElementById("signupForm");
const toast = document.getElementById("toast");
const toastMessage = toast.querySelector("p");
const submitButton = signupForm.querySelector('button[type="submit"]');
const signupStorageKey = "media-center-signups";
const legacySignupStorageKey = "media-center-signup";
let lockedScrollY = 0;
const volunteerGroup = document.getElementById("volunteerGroup");
const volunteerError = document.getElementById("volunteerError");
const volunteerSelects = [
  signupForm.elements.namedItem("firstChoice"),
  signupForm.elements.namedItem("secondChoice"),
  signupForm.elements.namedItem("thirdChoice")
];
const tagEditors = {
  skills: {
    container: document.querySelector('[data-tag-editor="skills"]'),
    list: document.getElementById("skillsList"),
    input: document.getElementById("skillsInput"),
    items: []
  },
  awards: {
    container: document.querySelector('[data-tag-editor="awards"]'),
    list: document.getElementById("awardsList"),
    input: document.getElementById("awardsInput"),
    items: []
  }
};

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isServerContext = window.location.protocol === "http:" || window.location.protocol === "https:";
let activePageIndex = 0;
let isPagingLocked = false;
let pagingUnlockTimer = 0;
let touchStartY = 0;
let densitySyncTimer = 0;

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      entry.target.classList.add("is-visible");

      const counters = entry.target.querySelectorAll("[data-counter]");
      counters.forEach(animateCounter);
      revealObserver.unobserve(entry.target);
    });
  },
  {
    threshold: 0.18
  }
);

revealSections.forEach((section) => revealObserver.observe(section));

function animateCounter(element) {
  if (element.dataset.animated === "true") {
    return;
  }

  element.dataset.animated = "true";

  const target = Number(element.dataset.counter);
  const duration = prefersReducedMotion ? 0 : 1400;

  if (!duration) {
    element.textContent = String(target);
    return;
  }

  const startTime = performance.now();

  const tick = (currentTime) => {
    const progress = Math.min((currentTime - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = String(Math.floor(target * eased));

    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      element.textContent = String(target);
    }
  };

  requestAnimationFrame(tick);
}

function updateScrollEffects() {
  const scrollTop = window.scrollY;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const progress = maxScroll > 0 ? scrollTop / maxScroll : 0;

  document.documentElement.style.setProperty("--scroll-progress", progress.toFixed(4));
  progressLine.style.width = `${progress * 100}%`;

  siteHeader?.classList.toggle("is-compact", scrollTop > 16);
}

function syncPageDensity() {
  window.clearTimeout(densitySyncTimer);
  densitySyncTimer = window.setTimeout(() => {
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    if (!viewportHeight) {
      return;
    }

    pageSectionList.forEach((section) => {
      section.classList.remove("is-tight", "is-compact");

      const sectionHeight = section.scrollHeight;
      if (sectionHeight > viewportHeight * 1.14) {
        section.classList.add("is-compact");
      } else if (sectionHeight > viewportHeight * 1.02) {
        section.classList.add("is-tight");
      }
    });
  }, 80);
}

updateScrollEffects();
syncPageDensity();
window.addEventListener("scroll", updateScrollEffects, { passive: true });
window.addEventListener("resize", () => {
  updateScrollEffects();
  syncPageDensity();
});
window.visualViewport?.addEventListener("resize", () => {
  updateScrollEffects();
  syncPageDensity();
});

if (heroVisual && !prefersReducedMotion) {
  heroVisual.addEventListener("pointermove", (event) => {
    const rect = heroVisual.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    document.documentElement.style.setProperty("--pointer-x", x.toFixed(2));
    document.documentElement.style.setProperty("--pointer-y", y.toFixed(2));
  });

  heroVisual.addEventListener("pointerleave", () => {
    document.documentElement.style.setProperty("--pointer-x", "50");
    document.documentElement.style.setProperty("--pointer-y", "50");
  });
}

const pageObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      const activeId = entry.target.dataset.pageSection;
      activePageIndex = pageSectionList.findIndex((section) => section.dataset.pageSection === activeId);
      pageDots.forEach((dot) => {
        dot.classList.toggle("is-active", dot.dataset.pageDot === activeId);
      });
    });
  },
  {
    threshold: 0.55
  }
);

pageSections.forEach((section) => pageObserver.observe(section));

function lockPaging() {
  isPagingLocked = true;
  window.clearTimeout(pagingUnlockTimer);
  pagingUnlockTimer = window.setTimeout(() => {
    isPagingLocked = false;
  }, prefersReducedMotion ? 80 : 900);
}

function goToPage(index) {
  const clampedIndex = Math.max(0, Math.min(index, pageSectionList.length - 1));
  const nextSection = pageSectionList[clampedIndex];
  if (!nextSection) {
    return;
  }

  activePageIndex = clampedIndex;
  lockPaging();
  nextSection.scrollIntoView({
    behavior: prefersReducedMotion ? "auto" : "smooth",
    block: "start"
  });
}

function movePageBy(step) {
  if (isPagingLocked) {
    return;
  }

  goToPage(activePageIndex + step);
}

function isInteractiveTarget(target) {
  return Boolean(
    target.closest(
      "a, button, input, textarea, select, option, label, summary, details, .modal, .page-rail, .faq-question, .tag-editor"
    )
  );
}

pageDots.forEach((dot, index) => {
  dot.addEventListener("click", (event) => {
    event.preventDefault();
    goToPage(index);
  });
});

window.addEventListener(
  "wheel",
  (event) => {
    if (modal.classList.contains("is-open")) {
      return;
    }

    if (Math.abs(event.deltaY) < 16) {
      return;
    }

    event.preventDefault();
    movePageBy(event.deltaY > 0 ? 1 : -1);
  },
  { passive: false }
);

window.addEventListener("keydown", (event) => {
  if (modal.classList.contains("is-open")) {
    return;
  }

  if (["ArrowDown", "PageDown", " ", "Enter"].includes(event.key)) {
    event.preventDefault();
    movePageBy(1);
  }

  if (["ArrowUp", "PageUp"].includes(event.key)) {
    event.preventDefault();
    movePageBy(-1);
  }

  if (event.key === "Home") {
    event.preventDefault();
    goToPage(0);
  }

  if (event.key === "End") {
    event.preventDefault();
    goToPage(pageSectionList.length - 1);
  }
});

document.addEventListener("click", (event) => {
  if (modal.classList.contains("is-open")) {
    return;
  }

  if (event.defaultPrevented || event.button !== 0) {
    return;
  }

  if (window.getSelection()?.toString()) {
    return;
  }

  const section = event.target.closest(".page-section");
  if (!section || isInteractiveTarget(event.target)) {
    return;
  }

  movePageBy(1);
});

document.addEventListener(
  "touchstart",
  (event) => {
    if (modal.classList.contains("is-open") || isInteractiveTarget(event.target)) {
      touchStartY = 0;
      return;
    }

    touchStartY = event.changedTouches[0]?.clientY || 0;
  },
  { passive: true }
);

document.addEventListener(
  "touchend",
  (event) => {
    if (!touchStartY || modal.classList.contains("is-open")) {
      touchStartY = 0;
      return;
    }

    const touchEndY = event.changedTouches[0]?.clientY || 0;
    const deltaY = touchStartY - touchEndY;
    touchStartY = 0;

    if (Math.abs(deltaY) < 54) {
      return;
    }

    movePageBy(deltaY > 0 ? 1 : -1);
  },
  { passive: true }
);

const trackLabel = document.getElementById("trackLabel");
const trackTitle = document.getElementById("trackTitle");
const trackDescription = document.getElementById("trackDescription");
const trackTags = document.getElementById("trackTags");
const trackHighlights = document.getElementById("trackHighlights");

function renderTrack(key) {
  const content = trackContent[key];
  if (!content) {
    return;
  }

  trackShowcase.classList.remove("is-swapping");
  void trackShowcase.offsetWidth;
  trackShowcase.classList.add("is-swapping");

  trackLabel.textContent = content.label;
  trackTitle.textContent = content.title;
  trackDescription.textContent = content.description;
  trackTags.innerHTML = content.tags.map((item) => `<li>${item}</li>`).join("");
  trackHighlights.innerHTML = content.highlights.map((item) => `<li>${item}</li>`).join("");
}

trackButtons.forEach((button) => {
  button.addEventListener("click", () => {
    trackButtons.forEach((item) => {
      const isActive = item === button;
      item.classList.toggle("is-active", isActive);
      item.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    renderTrack(button.dataset.track);
  });
});

faqItems.forEach((item) => {
  const button = item.querySelector(".faq-question");
  button.addEventListener("click", () => {
    const isOpen = item.classList.contains("is-open");

    faqItems.forEach((entry) => {
      entry.classList.remove("is-open");
      entry.querySelector(".faq-question")?.setAttribute("aria-expanded", "false");
    });

    if (!isOpen) {
      item.classList.add("is-open");
      button.setAttribute("aria-expanded", "true");
    }
  });
});

function openModal() {
  if (modal.classList.contains("is-open")) {
    return;
  }

  lockedScrollY = window.scrollY;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.position = "fixed";
  document.body.style.top = `-${lockedScrollY}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";
  document.body.style.overflow = "hidden";
  signupForm.querySelector("input")?.focus();
}

function closeModal() {
  if (!modal.classList.contains("is-open")) {
    return;
  }

  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  document.body.style.width = "";
  document.body.style.overflow = "";
  window.scrollTo(0, lockedScrollY);
  updateScrollEffects();
}

openModalButtons.forEach((button) => {
  button.addEventListener("click", openModal);
});

closeModalButtons.forEach((button) => {
  button.addEventListener("click", closeModal);
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal.classList.contains("is-open")) {
    closeModal();
  }
});

function showToast(message, type = "success") {
  toastMessage.textContent = message;
  toast.classList.toggle("is-error", type === "error");
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2600);
}

function normalizeTag(text) {
  return text.replace(/\s+/g, " ").trim();
}

function splitTags(text) {
  return text
    .split(/[,\n，、；;]+/)
    .map(normalizeTag)
    .filter(Boolean);
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderTagEditor(key) {
  const editor = tagEditors[key];
  if (!editor) {
    return;
  }

  editor.list.innerHTML = editor.items
    .map(
      (item, index) => `
        <span class="tag-editor__chip">
          ${escapeHtml(item)}
          <button type="button" data-remove-tag="${key}" data-tag-index="${index}" aria-label="删除${escapeHtml(item)}">&times;</button>
        </span>
      `
    )
    .join("");
}

function addTags(key, rawValue) {
  const editor = tagEditors[key];
  if (!editor) {
    return;
  }

  const values = splitTags(rawValue);
  values.forEach((value) => {
    if (!editor.items.includes(value)) {
      editor.items.push(value);
    }
  });

  editor.container.classList.remove("is-invalid");
  renderTagEditor(key);
}

function commitTagInput(key) {
  const editor = tagEditors[key];
  if (!editor) {
    return;
  }

  addTags(key, editor.input.value);
  editor.input.value = "";
}

function removeTag(key, index) {
  const editor = tagEditors[key];
  if (!editor) {
    return;
  }

  editor.items.splice(index, 1);
  renderTagEditor(key);
}

function resetTagEditors() {
  Object.values(tagEditors).forEach((editor) => {
    editor.items = [];
    editor.input.value = "";
    editor.container.classList.remove("is-invalid");
  });

  renderTagEditor("skills");
  renderTagEditor("awards");
}

function validateSignupForm() {
  const volunteerValues = volunteerSelects.map((select) => select.value.trim());
  if (volunteerValues.some((value) => !value)) {
    volunteerGroup.classList.add("is-invalid");
    volunteerError.hidden = false;
    volunteerError.textContent = "请完整填写第一、第二、第三志愿。";
    volunteerSelects.find((select) => !select.value)?.focus();
    return false;
  }

  if (new Set(volunteerValues).size !== volunteerValues.length) {
    volunteerGroup.classList.add("is-invalid");
    volunteerError.hidden = false;
    volunteerError.textContent = "三个志愿不能重复，请重新选择。";
    volunteerSelects[0].focus();
    return false;
  }

  volunteerGroup.classList.remove("is-invalid");
  volunteerError.hidden = true;
  volunteerError.textContent = "";

  const skillsEditor = tagEditors.skills;
  if (skillsEditor.items.length > 0) {
    skillsEditor.container.classList.remove("is-invalid");
  } else {
    skillsEditor.container.classList.add("is-invalid");
    skillsEditor.input.focus();
    return false;
  }

  return true;
}

function getStoredSignups() {
  const raw = localStorage.getItem(signupStorageKey);
  if (!raw) {
    const legacyRaw = localStorage.getItem(legacySignupStorageKey);
    if (!legacyRaw) {
      return [];
    }

    try {
      const legacyParsed = JSON.parse(legacyRaw);
      const migrated = Array.isArray(legacyParsed) ? legacyParsed : [legacyParsed];
      localStorage.setItem(signupStorageKey, JSON.stringify(migrated));
      localStorage.removeItem(legacySignupStorageKey);
      return migrated;
    } catch {
      return [];
    }
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

async function saveSignup(payload) {
  if (!isServerContext) {
    const signups = getStoredSignups();
    signups.push(payload);
    localStorage.setItem(signupStorageKey, JSON.stringify(signups));
    return {
      message: "当前为本地预览模式，报名信息已保存到当前浏览器。"
    };
  }

  const response = await fetch("/api/signups", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) {
    throw new Error(data?.message || "报名信息提交失败，请稍后重试。");
  }

  return data;
}

function updateVolunteerOptions() {
  const selectedValues = volunteerSelects.map((select) => select.value).filter(Boolean);

  volunteerSelects.forEach((select) => {
    const currentValue = select.value;

    Array.from(select.options).forEach((option) => {
      if (!option.value) {
        option.disabled = false;
        return;
      }

      option.disabled = option.value !== currentValue && selectedValues.includes(option.value);
    });
  });
}

document.querySelectorAll("[data-add-tag]").forEach((button) => {
  button.addEventListener("click", () => {
    commitTagInput(button.dataset.addTag);
  });
});

volunteerSelects.forEach((select) => {
  select.addEventListener("change", () => {
    updateVolunteerOptions();
    volunteerGroup.classList.remove("is-invalid");
    volunteerError.hidden = true;
    volunteerError.textContent = "";
  });
});

Object.entries(tagEditors).forEach(([key, editor]) => {
  editor.input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    commitTagInput(key);
  });
});

signupForm.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-tag]");
  if (!button) {
    return;
  }

  removeTag(button.dataset.removeTag, Number(button.dataset.tagIndex));
});

signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  commitTagInput("skills");
  commitTagInput("awards");

  if (!validateSignupForm()) {
    return;
  }

  const formData = new FormData(signupForm);
  const payload = Object.fromEntries(formData.entries());
  payload.skills = [...tagEditors.skills.items];
  payload.awards = [...tagEditors.awards.items];
  payload.submittedAt = new Date().toISOString();

  submitButton.disabled = true;
  submitButton.textContent = "提交中...";

  try {
    const result = await saveSignup(payload);
    signupForm.reset();
    resetTagEditors();
    updateVolunteerOptions();
    closeModal();
    showToast(result.message || "报名信息已提交。");
  } catch (error) {
    showToast(error instanceof Error ? error.message : "报名信息提交失败，请稍后重试。", "error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "确认提交";
  }
});

window.getMediaCenterSignups = async function getMediaCenterSignups() {
  if (!isServerContext) {
    return getStoredSignups();
  }

  const response = await fetch("/api/admin/signups", {
    headers: {
      Accept: "application/json"
    }
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) {
    throw new Error(data?.message || "读取管理端报名数据失败。");
  }
  return data.items || [];
};

resetTagEditors();
updateVolunteerOptions();

counterElements.forEach((element) => {
  if (element.closest(".reveal-section") === null) {
    animateCounter(element);
  }
});
