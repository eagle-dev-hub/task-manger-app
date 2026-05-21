// ─────────────────────────────────────────
//  State
// ─────────────────────────────────────────
const STORAGE_KEY = "my_tasks_v1";
let tasks           = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let editingId       = null;
let selectedPriority = "low";
let currentFilter   = "all";
let pendingDeleteId = null;

// ─────────────────────────────────────────
//  DOM References
// ─────────────────────────────────────────
const openFormBtn   = document.getElementById("open-form-btn");
const taskForm      = document.getElementById("task-form");
const cancelFormBtn = document.getElementById("cancel-form-btn");
const submitBtn     = document.getElementById("submit-btn");
const titleInput    = document.getElementById("title-input");
const dateInput     = document.getElementById("date-input");
const descInput     = document.getElementById("desc-input");
const tasksList     = document.getElementById("tasks-list");
const confirmDialog = document.getElementById("confirm-dialog");
const dialogCancel  = document.getElementById("dialog-cancel");
const dialogConfirm = document.getElementById("dialog-confirm");
const priorityBtns  = document.querySelectorAll(".priority-btn");
const filterBtns    = document.querySelectorAll(".filter-btn");

// ─────────────────────────────────────────
//  Persist to localStorage
// ─────────────────────────────────────────
const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));

// ─────────────────────────────────────────
//  Priority Selector
// ─────────────────────────────────────────
priorityBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    selectedPriority = btn.dataset.p;
    priorityBtns.forEach(b => (b.className = "priority-btn"));
    btn.classList.add(`active-${selectedPriority}`);
  });
});

// ─────────────────────────────────────────
//  Open / Close Form
// ─────────────────────────────────────────
openFormBtn.addEventListener("click", () => {
  editingId = null;
  submitBtn.textContent = "Add Task";
  resetForm();
  taskForm.classList.add("visible");
  titleInput.focus();
});

cancelFormBtn.addEventListener("click", closeForm);

function closeForm() {
  taskForm.classList.remove("visible");
  resetForm();
  editingId = null;
}

function resetForm() {
  titleInput.value = "";
  dateInput.value  = "";
  descInput.value  = "";
  selectedPriority = "low";
  priorityBtns.forEach(b => (b.className = "priority-btn"));
  priorityBtns[0].classList.add("active-low");
}

// ─────────────────────────────────────────
//  Add or Update Task
// ─────────────────────────────────────────
submitBtn.addEventListener("click", () => {
  const title = titleInput.value.trim();

  if (!title) {
    titleInput.focus();
    titleInput.style.borderColor = "#e94560";
    return;
  }
  titleInput.style.borderColor = "";

  if (editingId) {
    // Update existing task
    const idx = tasks.findIndex(t => t.id === editingId);
    if (idx !== -1) {
      tasks[idx] = {
        ...tasks[idx],
        title,
        date: dateInput.value,
        desc: descInput.value,
        priority: selectedPriority,
      };
    }
    editingId = null;
  } else {
    // Add new task
    tasks.unshift({
      id: `task-${Date.now()}`,
      title,
      date: dateInput.value,
      desc: descInput.value,
      priority: selectedPriority,
      done: false,
      createdAt: new Date().toISOString(),
    });
  }

  save();
  closeForm();
  render();
});

// ─────────────────────────────────────────
//  Toggle Done
// ─────────────────────────────────────────
function toggleDone(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.done = !task.done;
    save();
    render();
  }
}

// ─────────────────────────────────────────
//  Edit Task
// ─────────────────────────────────────────
function editTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  editingId        = id;
  titleInput.value = task.title;
  dateInput.value  = task.date || "";
  descInput.value  = task.desc || "";
  selectedPriority = task.priority || "low";

  priorityBtns.forEach(b => (b.className = "priority-btn"));
  const activeBtn = [...priorityBtns].find(b => b.dataset.p === selectedPriority);
  if (activeBtn) activeBtn.classList.add(`active-${selectedPriority}`);

  submitBtn.textContent = "Update Task";
  taskForm.classList.add("visible");
  titleInput.focus();
}

// ─────────────────────────────────────────
//  Delete Task (with confirm dialog)
// ─────────────────────────────────────────
function confirmDelete(id) {
  pendingDeleteId = id;
  confirmDialog.showModal();
}

dialogCancel.addEventListener("click", () => confirmDialog.close());

dialogConfirm.addEventListener("click", () => {
  if (pendingDeleteId) {
    tasks = tasks.filter(t => t.id !== pendingDeleteId);
    pendingDeleteId = null;
    save();
    render();
  }
  confirmDialog.close();
});

// ─────────────────────────────────────────
//  Filter
// ─────────────────────────────────────────
filterBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    currentFilter = btn.dataset.filter;
    filterBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    render();
  });
});

function getFilteredTasks() {
  switch (currentFilter) {
    case "done":   return tasks.filter(t => t.done);
    case "active": return tasks.filter(t => !t.done);
    case "high":   return tasks.filter(t => t.priority === "high");
    default:       return tasks;
  }
}

// ─────────────────────────────────────────
//  XSS Protection
// ─────────────────────────────────────────
function escHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─────────────────────────────────────────
//  Render
// ─────────────────────────────────────────
function render() {
  const filtered = getFilteredTasks();

  // Update stats
  document.getElementById("stat-total").textContent = tasks.length;
  document.getElementById("stat-done").textContent  = tasks.filter(t => t.done).length;
  document.getElementById("stat-high").textContent  = tasks.filter(t => t.priority === "high" && !t.done).length;

  // Empty state
  if (!filtered.length) {
    tasksList.innerHTML = `
      <div class="empty-state">
        <div class="icon">📋</div>
        <p>No tasks here yet.</p>
      </div>`;
    return;
  }

  // Render task cards
  tasksList.innerHTML = filtered.map(task => `
    <div class="task-card priority-${task.priority} ${task.done ? "done" : ""}" id="${task.id}">
      <div class="task-header">
        <div>
          <div class="task-title">${escHtml(task.title)}</div>
          <div class="task-meta">
            ${task.date ? `📅 ${task.date}` : ""}
            ${task.date && task.priority ? " · " : ""}
            ${task.priority === "high" ? "🔴 High" : task.priority === "med" ? "🟡 Medium" : "🟢 Low"}
          </div>
          ${task.desc ? `<div class="task-desc">${escHtml(task.desc)}</div>` : ""}
        </div>
        <div class="task-actions">
          <button class="icon-btn" onclick="toggleDone('${task.id}')" title="${task.done ? "Undo" : "Complete"}">
            ${task.done ? "↩️" : "✅"}
          </button>
          <button class="icon-btn" onclick="editTask('${task.id}')" title="Edit">✏️</button>
          <button class="icon-btn" onclick="confirmDelete('${task.id}')" title="Delete">🗑️</button>
        </div>
      </div>
    </div>
  `).join("");
}

// ─────────────────────────────────────────
//  Init
// ─────────────────────────────────────────
render();
