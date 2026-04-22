const state = {
  items: [],
  filteredItems: []
};

const totalCount = document.getElementById("totalCount");
const todayCount = document.getElementById("todayCount");
const topChoice = document.getElementById("topChoice");
const latestTime = document.getElementById("latestTime");
const searchInput = document.getElementById("searchInput");
const resultMeta = document.getElementById("resultMeta");
const tableBody = document.getElementById("signupTableBody");
const emptyState = document.getElementById("emptyState");
const refreshButton = document.getElementById("refreshButton");
const toast = document.getElementById("adminToast");
const toastMessage = document.getElementById("adminToastMessage");

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function showToast(message, type = "success") {
  toastMessage.textContent = message;
  toast.classList.toggle("is-error", type === "error");
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2800);
}

function formatLocalTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function renderStats(items) {
  totalCount.textContent = String(items.length);

  const todayKey = new Date().toLocaleDateString("zh-CN");
  const todayItems = items.filter((item) => {
    const submittedAt = new Date(item.submittedAt);
    return !Number.isNaN(submittedAt.getTime()) && submittedAt.toLocaleDateString("zh-CN") === todayKey;
  });
  todayCount.textContent = String(todayItems.length);

  if (items.length === 0) {
    topChoice.textContent = "-";
    latestTime.textContent = "-";
    return;
  }

  const choiceCounts = new Map();
  items.forEach((item) => {
    const key = item.firstChoice || "-";
    choiceCounts.set(key, (choiceCounts.get(key) || 0) + 1);
  });

  const [leadingChoice] = [...choiceCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  topChoice.textContent = leadingChoice || "-";
  latestTime.textContent = formatLocalTime(items[0].submittedAt);
}

function buildSearchText(item) {
  return [
    item.name,
    item.className,
    item.studentId,
    item.major,
    item.firstChoice,
    item.secondChoice,
    item.thirdChoice,
    item.resume,
    item.message,
    ...(item.skills || []),
    ...(item.awards || [])
  ]
    .join(" ")
    .toLowerCase();
}

function filterItems() {
  const keyword = searchInput.value.trim().toLowerCase();
  state.filteredItems = keyword
    ? state.items.filter((item) => buildSearchText(item).includes(keyword))
    : [...state.items];

  resultMeta.textContent = `当前显示 ${state.filteredItems.length} / ${state.items.length} 条报名记录`;
  renderTable(state.filteredItems);
}

function renderTags(tags) {
  if (!tags || tags.length === 0) {
    return '<span class="admin-subtext">未填写</span>';
  }

  return `<div class="admin-tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>`;
}

function renderTable(items) {
  if (items.length === 0) {
    tableBody.innerHTML = "";
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;
  tableBody.innerHTML = items
    .map(
      (item) => `
        <tr>
          <td>
            ${escapeHtml(formatLocalTime(item.submittedAt))}
            <span class="admin-subtext">#${item.id}</span>
          </td>
          <td>${escapeHtml(item.name)}</td>
          <td>${escapeHtml(item.className)}</td>
          <td>${escapeHtml(item.studentId)}</td>
          <td>${escapeHtml(item.major)}</td>
          <td><span class="admin-choice">${escapeHtml(item.firstChoice)}</span></td>
          <td><span class="admin-choice">${escapeHtml(item.secondChoice)}</span></td>
          <td><span class="admin-choice">${escapeHtml(item.thirdChoice)}</span></td>
          <td>${renderTags(item.skills)}</td>
          <td>${renderTags(item.awards)}</td>
          <td><div class="admin-copy">${escapeHtml(item.resume)}</div></td>
          <td><div class="admin-copy">${escapeHtml(item.message || "未填写")}</div></td>
        </tr>
      `
    )
    .join("");
}

async function fetchSignups() {
  refreshButton.disabled = true;
  refreshButton.textContent = "刷新中...";

  try {
    const response = await fetch("/api/admin/signups", {
      headers: {
        Accept: "application/json"
      }
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.message || "加载报名数据失败。");
    }

    state.items = payload.items || [];
    renderStats(state.items);
    filterItems();
    showToast("报名数据已刷新。");
  } catch (error) {
    resultMeta.textContent = error instanceof Error ? error.message : "加载报名数据失败。";
    renderStats([]);
    renderTable([]);
    showToast(resultMeta.textContent, "error");
  } finally {
    refreshButton.disabled = false;
    refreshButton.textContent = "刷新数据";
  }
}

searchInput.addEventListener("input", filterItems);
refreshButton.addEventListener("click", fetchSignups);

fetchSignups();
