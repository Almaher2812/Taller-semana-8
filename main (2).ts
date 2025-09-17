// ===== Mini To-Do: 10 funcionalidades nuevas =====

// ---------- Tipos ----------
type Priority = "low" | "medium" | "high";
type Status = "active" | "done";

interface Task {
  id: string;
  title: string;
  status: Status;
  createdAt: number;
  due?: string;        // YYYY-MM-DD
  priority: Priority;
  selected?: boolean;  // para acciones masivas
}

// ---------- Estado ----------
const state = {
  tasks: [] as Task[],
  filter: (localStorage.getItem("filter") as Status | "all") ?? "all",
  search: localStorage.getItem("search") ?? "",
  sort: (localStorage.getItem("sort") as string) ?? "created",
  lastDeleted: [] as Task[], // para Undo
};

// ---------- Helpers ----------
const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T | null;
const $all = <T extends HTMLElement>(sel: string) => Array.from(document.querySelectorAll(sel)) as T[];

const uid = () => Math.random().toString(36).slice(2, 9);

// Persistencia
function save() {
  localStorage.setItem("tasks", JSON.stringify(state.tasks));
  localStorage.setItem("filter", state.filter);
  localStorage.setItem("search", state.search);
  localStorage.setItem("sort", state.sort);
}
function load() {
  const raw = localStorage.getItem("tasks");
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Task[];
      // Saneamiento mínimo
      state.tasks = parsed
        .filter(t => typeof t.id === "string" && typeof t.title === "string")
        .map(t => ({
          id: t.id,
          title: t.title,
          status: t.status === "done" ? "done" : "active",
          createdAt: typeof t.createdAt === "number" ? t.createdAt : Date.now(),
          due: t.due && /^\d{4}-\d{2}-\d{2}$/.test(t.due) ? t.due : undefined,
          priority: (["low","medium","high"] as Priority[]).includes(t.priority as Priority) ? (t.priority as Priority) : "medium",
          selected: false,
        }));
    } catch {}
  }
}

// Comparadores para ordenamiento
const compare = {
  created: (a: Task, b: Task) => a.createdAt - b.createdAt,
  title: (a: Task, b: Task) => a.title.localeCompare(b.title, "es", { sensitivity: "base" }),
  due: (a: Task, b: Task) => (a.due ?? "9999-12-31").localeCompare(b.due ?? "9999-12-31"),
  priority: (a: Task, b: Task) => priorityWeight(a) - priorityWeight(b),
  status: (a: Task, b: Task) => (a.status === b.status ? 0 : a.status === "active" ? -1 : 1),
};
function priorityWeight(t: Task) {
  return t.priority === "high" ? 0 : t.priority === "medium" ? 1 : 2; // high primero
}

// ---------- DOM refs ----------
const inputEl = $("#task-input")!;
const addBtn = $("#add-btn")!;
const listEl = $("#list")!;
const emptyEl = $("#empty")!;
const statActive = $("#stat-active")!;
const statDone = $("#stat-done")!;
const statTotal = $("#stat-total")!;
const counterEl = $("#counter")!;
const clearDoneBtn = $("#clear-done")!;
const filterBtns = $all<HTMLButtonElement>('[data-filter]');
const dueInput = $("#due-input") as HTMLInputElement;
const prioInput = $("#prio-input") as HTMLSelectElement;
const searchEl = $("#search") as HTMLInputElement;
const sortEl = $("#sort") as HTMLSelectElement;
const bulkCompleteBtn = $("#bulk-complete") as HTMLButtonElement;
const bulkDeleteBtn = $("#bulk-delete") as HTMLButtonElement;
const exportBtn = $("#export-json") as HTMLButtonElement;
const importInput = $("#import-json") as HTMLInputElement;
const undoWrap = $("#undo-wrap")!;
const undoBtn = $("#undo-delete") as HTMLButtonElement;

// Inyecta botón "Resetear lista" (mantenías un comentario en el HTML)
ensureResetButton();

// ---------- Inicialización ----------
load();
hydrateControlsFromState();
render();

// ---------- Eventos globales ----------
addBtn.addEventListener("click", () => addTask());
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addTask();
});

filterBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    filterBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state.filter = (btn.getAttribute("data-filter") as Status | "all") ?? "all";
    save(); render();
  });
});
searchEl.addEventListener("input", () => {
  state.search = searchEl.value.trim();
  save(); render();
});
sortEl.addEventListener("change", () => {
  state.sort = sortEl.value;
  save(); render();
});

clearDoneBtn.addEventListener("click", () => {
  const toDelete = state.tasks.filter(t => t.status === "done");
  if (!toDelete.length) return;
  state.lastDeleted = toDelete;
  state.tasks = state.tasks.filter(t => t.status !== "done");
  showUndo();
  save(); render();
});

bulkCompleteBtn.addEventListener("click", () => {
  const selected = state.tasks.filter(t => t.selected);
  if (!selected.length) return;
  selected.forEach(t => t.status = "done");
  selected.forEach(t => (t.selected = false));
  save(); render();
});
bulkDeleteBtn.addEventListener("click", () => {
  const toDelete = state.tasks.filter(t => t.selected);
  if (!toDelete.length) return;
  state.lastDeleted = toDelete;
  state.tasks = state.tasks.filter(t => !t.selected);
  showUndo();
  save(); render();
});

undoBtn.addEventListener("click", () => {
  if (!state.lastDeleted.length) return;
  state.tasks.push(...state.lastDeleted);
  state.lastDeleted = [];
  hideUndo();
  save(); render();
});

exportBtn.addEventListener("click", () => downloadJSON());
importInput.addEventListener("change", () => importFromFile(importInput));

// Atajos de teclado
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && (e.key === "f" || e.key === "F")) {
    e.preventDefault(); searchEl.focus();
  }
  if (e.ctrlKey && (e.key === "s" || e.key === "S")) {
    e.preventDefault(); downloadJSON();
  }
  if (e.ctrlKey && e.key === "Backspace") {
    e.preventDefault(); clearDoneBtn.click();
  }
});

// ---------- Funciones principales ----------
function addTask() {
  const title = inputEl.value.trim();
  if (!title) return;

  const task: Task = {
    id: uid(),
    title,
    status: "active",
    createdAt: Date.now(),
    due: dueInput.value || undefined,
    priority: (prioInput.value as Priority) ?? "medium",
    selected: false,
  };
  state.tasks.push(task);

  // limpiar inputs
  inputEl.value = "";
  dueInput.value = "";
  prioInput.value = "medium";

  save(); render();
}

function render() {
  // activar botón filtro actual
  filterBtns.forEach(b => b.classList.toggle("active", (b.getAttribute("data-filter") ?? "all") === state.filter));

  const filtered = state.tasks
    .filter(t => state.filter === "all" ? true : t.status === state.filter)
    .filter(t => !state.search ? true : t.title.toLowerCase().includes(state.search.toLowerCase()));

  const sorted = filtered.sort(compare[state.sort as keyof typeof compare] ?? compare.created);

  // estadísticas
  const activeCount = state.tasks.filter(t => t.status === "active").length;
  const doneCount = state.tasks.filter(t => t.status === "done").length;
  const total = state.tasks.length;
  statActive.textContent = String(activeCount);
  statDone.textContent = String(doneCount);
  statTotal.textContent = String(total);
  counterEl.textContent = ${sorted.length} tareas;

  // vacío vs lista
  emptyEl.classList.toggle("d-none", sorted.length > 0);
  listEl.innerHTML = "";
  const frag = document.createDocumentFragment();

  for (const t of sorted) {
    const col = document.createElement("div");
    col.className = "col";

    const card = document.createElement("div");
    card.className = "card h-100";
    if (t.status === "done") card.classList.add("border-success", "opacity-75");

    const body = document.createElement("div");
    body.className = "card-body";

    // Checkbox selección masiva
    const selectWrap = document.createElement("div");
    selectWrap.className = "form-check float-end";
    const select = document.createElement("input");
    select.type = "checkbox";
    select.className = "form-check-input";
    select.checked = !!t.selected;
    select.title = "Seleccionar para acciones masivas";
    select.addEventListener("change", () => { t.selected = select.checked; save(); });
    selectWrap.appendChild(select);
    body.appendChild(selectWrap);

    // Título (editable)
    const titleEl = document.createElement("h2");
    titleEl.className = "h6 mb-2 task-title";
    titleEl.textContent = t.title;
    titleEl.title = "Doble clic para editar";
    titleEl.addEventListener("dblclick", () => enableInlineEdit(titleEl, t));
    body.appendChild(titleEl);

    // Badges: estado/fecha/prioridad
    const meta = document.createElement("div");
    meta.className = "d-flex flex-wrap gap-2 align-items-center";

    // Estado
    const st = document.createElement("span");
    st.className = badge ${t.status === "done" ? "text-bg-success" : "text-bg-secondary"};
    st.textContent = t.status === "done" ? "Completada" : "Activa";
    meta.appendChild(st);

    // Fecha
    if (t.due) {
      const due = document.createElement("span");
      const overdue = isOverdue(t);
      due.className = badge ${overdue ? "text-bg-danger" : "text-bg-light"};
      due.innerHTML = <i class="bi bi-calendar-event me-1"></i>${t.due}${overdue ? " • vencida" : ""};
      meta.appendChild(due);
    }

    // Prioridad
    const pr = document.createElement("span");
    pr.className = "badge";
    pr.innerHTML = <i class="bi bi-flag-fill me-1"></i>${labelPriority(t.priority)};
    pr.classList.add(
      t.priority === "high" ? "text-bg-danger" : t.priority === "medium" ? "text-bg-warning" : "text-bg-info"
    );
    meta.appendChild(pr);

    body.appendChild(meta);

    // Footer acciones
    const footer = document.createElement("div");
    footer.className = "card-footer d-flex justify-content-between";

    const left = document.createElement("div");
    left.className = "btn-group";
    const toggleBtn = button("btn btn-sm btn-outline-success", t.status === "done" ? "Reabrir" : "Completar", "check2");
    toggleBtn.addEventListener("click", () => {
      t.status = t.status === "done" ? "active" : "done";
      save(); render();
    });
    const editBtn = button("btn btn-sm btn-outline-primary", "Editar", "pencil-square");
    editBtn.addEventListener("click", () => enableInlineEdit(titleEl, t));
    const dateBtn = button("btn btn-sm btn-outline-secondary", "Fecha", "calendar-event");
    dateBtn.addEventListener("click", () => promptDue(t));
    left.append(toggleBtn, editBtn, dateBtn);

    const right = document.createElement("div");
    right.className = "btn-group";
    const prioBtn = button("btn btn-sm btn-outline-warning", "Prioridad", "flag");
    prioBtn.addEventListener("click", () => cyclePriority(t));
    const delBtn = button("btn btn-sm btn-outline-danger", "Eliminar", "trash3");
    delBtn.addEventListener("click", () => removeTask(t.id, /recordForUndo/ true));
    right.append(prioBtn, delBtn);

    footer.append(left, right);

    card.append(body, footer);
    col.appendChild(card);
    frag.appendChild(col);
  }

  listEl.appendChild(frag);
}

function labelPriority(p: Priority) {
  return p === "high" ? "Alta" : p === "medium" ? "Media" : "Baja";
}
function isOverdue(t: Task) {
  if (!t.due) return false;
  const today = new Date(); today.setHours(0,0,0,0);
  return new Date(t.due + "T00:00:00").getTime() < today.getTime() && t.status !== "done";
}

function enableInlineEdit(titleEl: HTMLElement, task: Task) {
  const input = document.createElement("input");
  input.type = "text";
  input.className = "form-control form-control-sm";
  input.value = task.title;
  titleEl.replaceWith(input);
  input.focus();
  input.select();

  const commit = () => {
    const v = input.value.trim();
    task.title = v || task.title;
    save(); render();
  };
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") render();
  });
  input.addEventListener("blur", commit);
}

function promptDue(task: Task) {
  const v = prompt("Fecha límite (YYYY-MM-DD), o vacío para quitar:", task.due ?? "");
  if (v === null) return;
  const val = v.trim();
  if (!val) { task.due = undefined; save(); render(); return; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) { alert("Formato inválido"); return; }
  task.due = val; save(); render();
}

function cyclePriority(t: Task) {
  t.priority = t.priority === "low" ? "medium" : t.priority === "medium" ? "high" : "low";
  save(); render();
}

function removeTask(id: string, recordForUndo = false) {
  const target = state.tasks.find(t => t.id === id);
  if (!target) return;
  if (recordForUndo) {
    state.lastDeleted = [target];
    showUndo();
  }
  state.tasks = state.tasks.filter(t => t.id !== id);
  save(); render();
}

function showUndo() {
  undoWrap.classList.remove("d-none");
  // se oculta solo si no hay nada para deshacer
}
function hideUndo() {
  if (!state.lastDeleted.length) undoWrap.classList.add("d-none");
}

// Export / Import
function downloadJSON() {
  const blob = new Blob([JSON.stringify({
    tasks: state.tasks, filter: state.filter, search: state.search, sort: state.sort
  }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "todo-export.json";
  a.click();
  URL.revokeObjectURL(url);
}
async function importFromFile(input: HTMLInputElement) {
  const f = input.files?.[0];
  if (!f) return;
  try {
    const text = await f.text();
    const data = JSON.parse(text);
    if (!Array.isArray(data.tasks)) throw new Error("Estructura inválida");
    const imported: Task[] = data.tasks.map((t: any) => ({
      id: typeof t.id === "string" ? t.id : uid(),
      title: String(t.title ?? ""),
      status: t.status === "done" ? "done" : "active",
      createdAt: typeof t.createdAt === "number" ? t.createdAt : Date.now(),
      due: t.due && /^\d{4}-\d{2}-\d{2}$/.test(t.due) ? t.due : undefined,
      priority: (["low","medium","high"] as Priority[]).includes(t.priority) ? t.priority : "medium",
      selected: false,
    }));
    state.tasks = imported;
    state.filter = (data.filter === "all" || data.filter === "active" || data.filter === "done") ? data.filter : "all";
    state.search = typeof data.search === "string" ? data.search : "";
    state.sort = typeof data.sort === "string" ? data.sort : "created";
    hydrateControlsFromState();
    save(); render();
  } catch (e) {
    alert("No se pudo importar el JSON.");
  } finally {
    input.value = "";
  }
}

function hydrateControlsFromState() {
  // filtros
  filterBtns.forEach(b => b.classList.toggle("active", (b.getAttribute("data-filter") ?? "all") === state.filter));
  searchEl.value = state.search;
  sortEl.value = state.sort;
}

// Inyecta botón "Resetear lista" en la fila de acciones
function ensureResetButton() {
  const container = document.querySelector(".card .card-body") as HTMLElement;
  if (!container) return;
  if (document.getElementById("reset-list")) return;

  const btn = document.createElement("button");
  btn.id = "reset-list";
  btn.className = "btn btn-outline-secondary btn-sm ms-2";
  btn.innerHTML = <i class="bi bi-arrow-clockwise me-1"></i>Resetear lista;
  btn.addEventListener("click", () => {
    if (!confirm("¿Seguro que quieres vaciar todas las tareas?")) return;
    state.lastDeleted = [...state.tasks];
    state.tasks = [];
    showUndo();
    save(); render();
  });

  // lo pegamos junto a los botones Export/Import
  const exportRow = $("#export-json")?.parentElement;
  exportRow?.insertBefore(btn, exportRow.firstChild);
}