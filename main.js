// =========================
// ====== ESTADO ===========
const state = { tasks: [], filter: "all" };
const uid = () => Math.random().toString(36).slice(2, 10);

// =========================
// ====== LOCALSTORAGE =====
// Guardar, cargar y limpiar tareas en almacenamiento local
const STORAGE_KEY = "todo-app-tasks";

function saveTasks() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks)); } catch { }
}

function loadTasks() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function clearAllStorage() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { }
}

// =========================
// ====== REFERENCIAS DOM ==
const $input = document.getElementById("task-input");
const $addBtn = document.getElementById("add-btn");       // BOTÓN ➝ Agregar
const $list = document.getElementById("list");
const $counter = document.getElementById("counter");
const $empty = document.getElementById("empty");
const $clearDone = document.getElementById("clear-done"); // BOTÓN ➝ Borrar completadas
const $filterButtons = Array.from(document.querySelectorAll("button[data-filter]")); // BOTONES ➝ Filtros (Todos / Activos / Completados)

// Stats (opcionales)
const $statActive = document.getElementById("stat-active");
const $statDone = document.getElementById("stat-done");
const $statTotal = document.getElementById("stat-total");

// =========================
// ====== CRUD DE TAREAS ===
function addTask(title) {
  // BOTÓN ➝ "Agregar tarea" (+ Enter en input)
  const trimmed = (title ?? "").trim();
  if (!trimmed) return;
  state.tasks.unshift({ id: uid(), title: trimmed, done: false, createdAt: Date.now() });
  render();
  $input.value = "";
  $input.focus();
}

function toggleTask(id) {
  // CHECKBOX ➝ marcar / desmarcar completada
  state.tasks = state.tasks.map(t => (t.id === id ? { ...t, done: !t.done } : t));
  render();
}

function removeTask(id) {
  // BOTÓN ➝ Eliminar (🗑️)
  state.tasks = state.tasks.filter(t => t.id !== id);
  render();
}

function clearDone() {
  // BOTÓN ➝ "Borrar completadas"
  state.tasks = state.tasks.filter(t => !t.done);
  render();
}

function setFilter(f) {
  // BOTONES ➝ Filtro (Todos, Activos, Completados)
  state.filter = f;
  render();
}

function viewTask(id) {
  // BOTÓN ➝ Ver (👁️)
  const t = state.tasks.find(x => x.id === id);
  if (!t) { alert("No se encontró la tarea."); return; }
  const created = new Date(t.createdAt).toLocaleString();
  alert(
    `📄 Detalle de la tarea\n\n` +
    `ID: ${t.id}\n` +
    `Título: ${t.title}\n` +
    `Estado: ${t.done ? "Completada" : "Activa"}\n` +
    `Creada: ${created}`
  );
}

function editTaskTitle(id) {
  // BOTÓN ➝ Editar (✏️)
  const t = state.tasks.find(x => x.id === id);
  if (!t) { alert("No se encontró la tarea."); return; }
  const nuevo = prompt("Nuevo título para la tarea:", t.title);
  if (nuevo === null) return;
  const trimmed = nuevo.trim();
  if (!trimmed) { alert("El título no puede estar vacío."); return; }
  state.tasks = state.tasks.map(x => (x.id === id ? { ...x, title: trimmed } : x));
  render();
}

// =========================
// ====== RESETEAR LISTA ===
function resetAll() {
  // BOTÓN ➝ Resetear lista (⚠️ Borra TODAS las tareas)
  const ok = confirm("¿Seguro que quieres borrar TODAS las tareas? Esta acción no se puede deshacer.");
  if (!ok) return;
  state.tasks = [];
  clearAllStorage();
  render();
}

// =========================
// ====== HELPERS ==========
function visibleTasks() {
  switch (state.filter) {
    case "active": return state.tasks.filter(t => !t.done);
    case "done": return state.tasks.filter(t => t.done);
    default: return state.tasks;
  }
}

function ensureResetButton() {
  // Inserta el BOTÓN ➝ Resetear lista si no existe
  const existing = document.getElementById("reset-all");
  if (existing) return;

  const container = $clearDone?.parentElement ?? document.body;
  const btn = document.createElement("button");
  btn.id = "reset-all";
  btn.type = "button";
  btn.className = "btn btn-outline-warning btn-sm";
  btn.innerHTML = '<i class="bi bi-x-circle me-1"></i> Resetear lista';
  btn.addEventListener("click", resetAll);

  const spacer = document.createElement("span");
  spacer.className = "d-inline-block";
  spacer.style.width = "6px";

  container.append(spacer, btn);
}

// =========================
// ====== RENDER ===========
function render() {
  const tasks = visibleTasks();

  // Vacío / listado
  $empty.classList.toggle("d-none", tasks.length !== 0);
  $list.innerHTML = "";

  for (const t of tasks) {
    const col = document.createElement("div");
    col.className = "col";

    const card = document.createElement("div");
    card.className = "card h-100 shadow-sm";
    if (t.done) card.classList.add("border-success", "opacity-75");

    // Encabezado ➝ CHECKBOX y título
    const header = document.createElement("div");
    header.className = "card-header bg-transparent d-flex align-items-center gap-2";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "form-check-input";
    checkbox.checked = t.done;
    checkbox.addEventListener("change", () => toggleTask(t.id));

    const title = document.createElement("div");
    title.className = "ms-1 fw-semibold task-title";
    title.textContent = t.title;
    if (t.done) title.classList.add("text-decoration-line-through");

    header.append(checkbox, title);

    // Cuerpo ➝ fecha de creación
    const body = document.createElement("div");
    body.className = "card-body py-2";
    const meta = document.createElement("div");
    meta.className = "text-secondary small";
    meta.textContent = "Creada: " + new Date(t.createdAt).toLocaleString();
    body.appendChild(meta);

    // Footer ➝ BOTONES (Ver, Editar, Eliminar)
    const footer = document.createElement("div");
    footer.className = "card-footer bg-transparent d-flex justify-content-end gap-2";

    const viewBtn = document.createElement("button"); // BOTÓN ➝ Ver
    viewBtn.className = "btn btn-sm btn-outline-secondary";
    viewBtn.innerHTML = '<i class="bi bi-eye me-1"></i>Ver';
    viewBtn.addEventListener("click", () => viewTask(t.id));

    const editBtn = document.createElement("button"); // BOTÓN ➝ Editar
    editBtn.className = "btn btn-sm btn-outline-primary";
    editBtn.innerHTML = '<i class="bi bi-pencil-square me-1"></i>Editar';
    editBtn.addEventListener("click", () => editTaskTitle(t.id));

    const removeBtn = document.createElement("button"); // BOTÓN ➝ Eliminar
    removeBtn.className = "btn btn-sm btn-outline-danger";
    removeBtn.innerHTML = '<i class="bi bi-trash3 me-1"></i>Eliminar';
    removeBtn.addEventListener("click", () => removeTask(t.id));

    footer.append(viewBtn, editBtn, removeBtn);
    card.append(header, body, footer);
    col.appendChild(card);
    $list.appendChild(col);
  }

  // Contadores
  const total = state.tasks.length;
  const done = state.tasks.filter(t => t.done).length;
  const active = total - done;

  $counter.textContent = `${total} tareas • ${done} completadas`;
  if ($statActive) $statActive.textContent = String(active);
  if ($statDone) $statDone.textContent = String(done);
  if ($statTotal) $statTotal.textContent = String(total);

  for (const b of $filterButtons) {
    b.classList.toggle("active", b.dataset.filter === state.filter);
  }

  ensureResetButton();
  saveTasks();
}

// =========================
// ====== EVENTOS ==========
$addBtn.addEventListener("click", () => addTask($input.value)); // BOTÓN Agregar
$input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addTask($input.value); // ENTER ➝ Agregar
});
$clearDone.addEventListener("click", clearDone); // BOTÓN Borrar completadas
for (const b of $filterButtons) {
  b.addEventListener("click", () => setFilter(b.dataset.filter ?? "all")); // BOTONES Filtro
}

// Atajo teclado ➝ Ctrl+Shift+R ➝ Resetear lista
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.shiftKey && (e.key.toLowerCase() === "r")) {
    e.preventDefault();
    resetAll();
  }
});

// =========================
// ====== INICIALIZACIÓN ===
state.tasks = loadTasks();
if (state.tasks.length === 0) {
  // Tareas iniciales por defecto
  state.tasks = [
    { id: uid(), title: "Revisar JavaScript", done: true, createdAt: Date.now() - 60000 },
    { id: uid(), title: "Agregar validación", done: false, createdAt: Date.now() - 40000 },
    { id: uid(), title: "Probar filtros y cards", done: false, createdAt: Date.now() - 20000 },
  ];
}

render();
