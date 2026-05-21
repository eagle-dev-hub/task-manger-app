// ─────────────────────────────────────────
//  State
// ─────────────────────────────────────────
const STORAGE_KEY = "my_tasks_v1";
let tasks           = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let editingId       = null;
let selectedPriority = "low";
let currentFilter   = localStorage.getItem("my_tasks_filter") || "all";
let pendingDeleteId = null;
let deletedTaskBackup = null; // For undo functionality

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
const searchInput   = document.getElementById("search-input");
const markAllDoneBtn = document.getElementById("mark-all-done");
const clearAllDoneBtn = document.getElementById("clear-all-done");
const undoSnackbar  = document.getElementById("undo-snackbar");
const undoDeleteBtn = document.getElementById("undo-delete");

// ─────────────────────────────────────────
//  Helper Functions
// ─────────────────────────────────────────
function isOverdue(task) {
  if (!task.date || task.done) return false;
  const today = new Date().toISOString().split('T')[0];
  return task.date < today;
}

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
  titleInput.style.borderColor = "";
}

// ─────────────────────────────────────────
//  Add or Update Task
// ─────────────────────────────────────────
submitBtn.addEventListener("click", () => {
  const title = titleInput.value.trim();

  if (!title) {
    titleInput.focus();
    titleInput.style.borderColor = "#e94560";
    setTimeout(() => {
      titleInput.style.borderColor = "";
    }, 2000);
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
//  Delete Task (with confirm & undo)
// ─────────────────────────────────────────
function confirmDelete(id) {
  pendingDeleteId = id;
  confirmDialog.showModal();
}

dialogCancel.addEventListener("click", () => confirmDialog.close());

dialogConfirm.addEventListener("click", () => {
  if (pendingDeleteId) {
    // Backup the task for undo
    const taskToDelete = tasks.find(t => t.id === pendingDeleteId);
    if (taskToDelete) {
      deletedTaskBackup = { ...taskToDelete, deletedAt: Date.now() };
    }
    
    tasks = tasks.filter(t => t.id !== pendingDeleteId);
    pendingDeleteId = null;
    save();
    render();
    confirmDialog.close();
    
    // Show undo snackbar
    if (undoSnackbar) {
      undoSnackbar.classList.add("show");
      setTimeout(() => {
        undoSnackbar.classList.remove("show");
        deletedTaskBackup = null;
      }, 5000);
    }
  }
});

// Undo delete
if (undoDeleteBtn) {
  undoDeleteBtn.addEventListener("click", () => {
    if (deletedTaskBackup) {
      tasks.unshift(deletedTaskBackup);
      deletedTaskBackup = null;
      save();
      render();
      undoSnackbar.classList.remove("show");
    }
  });
}

// ─────────────────────────────────────────
//  Filter & Search
// ─────────────────────────────────────────
filterBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    currentFilter = btn.dataset.filter;
    localStorage.setItem("my_tasks_filter", currentFilter);
    filterBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    render();
  });
});

function getFilteredTasks() {
  let filtered = tasks;
  
  // Apply status/priority filter
  switch (currentFilter) {
    case "done":    filtered = tasks.filter(t => t.done); break;
    case "active":  filtered = tasks.filter(t => !t.done); break;
    case "high":    filtered = tasks.filter(t => t.priority === "high" && !t.done); break;
    case "overdue": filtered = tasks.filter(t => isOverdue(t)); break;
    default:        filtered = tasks;
  }
  
  // Apply search filter
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : "";
  if (searchTerm) {
    filtered = filtered.filter(t => 
      t.title.toLowerCase().includes(searchTerm) || 
      (t.desc && t.desc.toLowerCase().includes(searchTerm))
    );
  }
  
  // Sort: overdue first, then by date, then by priority
  return filtered.sort((a, b) => {
    if (isOverdue(a) && !isOverdue(b)) return -1;
    if (!isOverdue(a) && isOverdue(b)) return 1;
    if (a.date && b.date) return a.date.localeCompare(b.date);
    if (a.date) return -1;
    if (b.date) return 1;
    const priorityOrder = { high: 0, med: 1, low: 2 };
    return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
  });
}

// Search input listener
if (searchInput) {
  searchInput.addEventListener("input", () => render());
}

// Bulk actions
if (markAllDoneBtn) {
  markAllDoneBtn.addEventListener("click", () => {
    const activeTasks = tasks.filter(t => !t.done);
    if (activeTasks.length === 0) return;
    tasks.forEach(task => { if (!task.done) task.done = true; });
    save();
    render();
  });
}

if (clearAllDoneBtn) {
  clearAllDoneBtn.addEventListener("click", () => {
    const doneTasks = tasks.filter(t => t.done);
    if (doneTasks.length === 0) return;
    if (confirm(`Delete ${doneTasks.length} completed task(s) permanently?`)) {
      tasks = tasks.filter(task => !task.done);
      save();
      render();
    }
  });
}

// ─────────────────────────────────────────
//  XSS Protection
// ─────────────────────────────────────────
function escHtml(str) {
  if (!str) return "";
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
  const overdueCount = tasks.filter(t => isOverdue(t) && !t.done).length;

  // Update stats
  document.getElementById("stat-total").textContent = tasks.length;
  document.getElementById("stat-done").textContent  = tasks.filter(t => t.done).length;
  document.getElementById("stat-high").textContent  = tasks.filter(t => t.priority === "high" && !t.done).length;
  document.getElementById("stat-overdue").textContent = overdueCount;

  // Empty state
  if (!filtered.length) {
    tasksList.innerHTML = `
      <div class="empty-state">
        <div class="icon">📋</div>
        <p>No tasks here yet.</p>
        ${searchInput && searchInput.value ? '<p style="font-size: 0.8rem;">Try a different search term.</p>' : ''}
      </div>`;
    return;
  }

  // Render task cards
  tasksList.innerHTML = filtered.map(task => {
    const overdueClass = isOverdue(task) ? "overdue" : "";
    const priorityText = task.priority === "high" ? "🔴 High" : task.priority === "med" ? "🟡 Medium" : "🟢 Low";
    const dueDateClass = isOverdue(task) ? "overdue" : "";
    
    return `
      <div class="task-card priority-${task.priority} ${task.done ? "done" : ""} ${overdueClass}" data-task-id="${task.id}">
        <div class="task-header">
          <div style="flex: 1;">
            <div class="task-title">${escHtml(task.title)}</div>
            <div class="task-meta">
              ${task.date ? `<span class="due-date ${dueDateClass}">📅 ${task.date}${isOverdue(task) ? ' ⚠️ Overdue' : ''}</span>` : ""}
              <span class="priority-badge">${priorityText}</span>
            </div>
            ${task.desc ? `<div class="task-desc">${escHtml(task.desc)}</div>` : ""}
          </div>
          <div class="task-actions">
            <button class="icon-btn" onclick="window.toggleDone('${task.id}')" title="${task.done ? "Undo" : "Complete"}">
              ${task.done ? "↩️" : "✅"}
            </button>
            <button class="icon-btn" onclick="window.editTask('${task.id}')" title="Edit">✏️</button>
            <button class="icon-btn" onclick="window.confirmDelete('${task.id}')" title="Delete">🗑️</button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// ─────────────────────────────────────────
//  Keyboard Shortcuts
// ─────────────────────────────────────────
document.addEventListener("keydown", (e) => {
  // 'N' or 'n' to add new task
  if ((e.key === 'n' || e.key === 'N') && !taskForm.classList.contains("visible") && !confirmDialog.open) {
    e.preventDefault();
    openFormBtn.click();
  }
  // Escape to close form or dialog
  if (e.key === 'Escape') {
    if (taskForm.classList.contains("visible")) closeForm();
    if (confirmDialog.open) confirmDialog.close();
  }
  // '?' to show shortcut help
  if (e.key === '?' && !taskForm.classList.contains("visible")) {
    e.preventDefault();
    alert("Keyboard Shortcuts:\n• N - New task\n• Esc - Close form/dialog\n• ? - Show this help");
  }
});

// ─────────────────────────────────────────
//  Make functions global for inline handlers
// ─────────────────────────────────────────
window.toggleDone = toggleDone;
window.editTask = editTask;
window.confirmDelete = confirmDelete;

// ─────────────────────────────────────────
//  Init
// ─────────────────────────────────────────
// Set active filter button based on saved filter
filterBtns.forEach(btn => {
  if (btn.dataset.filter === currentFilter) {
    btn.classList.add("active");
  }
});

render();
