document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("todoForm");
  const todoInput = document.getElementById("todoInput");
  const dateInput = document.getElementById("dateInput");
  const todoList = document.getElementById("todoList");
  const filterSelect = document.getElementById("filterSelect");
  const filterSegment = document.querySelector('.filter-segment');
  let tableBody = null; 

  const totalTasks = document.getElementById("totalTasks");
  const completedTasks = document.getElementById("completedTasks");
  const pendingTasks = document.getElementById("pendingTasks");
  const progressPercent = document.getElementById("progressPercent");
  const progressFill = document.getElementById("progressFill");

  let todos = loadTodos();
  let currentFilter = "all";

  function loadTodos() {
    try {
      const raw = localStorage.getItem("todos");
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = todoInput ? (todoInput.value || '').trim() : '';
      const date = dateInput ? dateInput.value : '';
      console.log('submit:', { text, date });
      if (!text) {
        alert('Isi tugas terlebih dahulu');
        return;
      } if (!date) {
        alert('Isi tanggal terlebih dahulu');
        return;
      }

      const todo = { id: Date.now(), text, date: date || null, completed: false };
      todos.push(todo);
      sortTodos();
      saveTodos();
      renderTodos();
      updateStats();

      if (todoInput) todoInput.value = '';
      if (dateInput) dateInput.value = '';
    });
  }

  function saveTodos() {
    localStorage.setItem("todos", JSON.stringify(todos));
  }

  function sortTodos() {
    todos.sort((a, b) => {
      const da = a.date ? new Date(a.date) : new Date(0);
      const db = b.date ? new Date(b.date) : new Date(0);
      return da - db;
    });
  }

  function renderTodos() {
    if (todoList) todoList.innerHTML = "";
      tableBody = document.querySelector("#todoTable tbody"); // query inside renderTodos to avoid stale/missing element
      if (tableBody) tableBody.innerHTML = "";

    let filtered = todos.slice();
    if (currentFilter === "completed") filtered = filtered.filter((t) => t.completed);
    if (currentFilter === "pending") filtered = filtered.filter((t) => !t.completed);

    filtered.forEach((todo, index) => {
      const id = todo.id;

      if (todoList) {
        const li = document.createElement("li");
        li.className = "todo-item" + (todo.completed ? " completed" : "");

        const dateText = todo.date ? new Date(todo.date).toLocaleDateString() : "-";

        li.innerHTML = `
          <div class="todo-main">
            <div class="todo-text">${escapeHtml(todo.text)}</div>
            <div class="todo-date">${dateText}</div>
          </div>
          <div class="buttons">
            <button class="action-toggle" data-id="${id}" data-action="toggle">${todo.completed ? 'Reopen' : 'Complete'}</button>
            <button class="action-edit" data-id="${id}" data-action="edit">Edit</button>
            <button class="action-delete" data-id="${id}" data-action="delete">Delete</button>
          </div>
        `;

        todoList.appendChild(li);
      }

      if (tableBody) {
        const tr = document.createElement("tr");
        tr.className = todo.completed ? "completed-row" : "";
        tr.innerHTML = `
          <td>${index + 1}</td>
          <td class="td-text">${escapeHtml(todo.text)}</td>
          <td class="td-date">${todo.date ? new Date(todo.date).toLocaleDateString() : "-"}</td>
          <td class="${todo.completed ? "status-complete" : "status-pending"}">${todo.completed ? "Completed" : "Pending"}</td>
          <td>
            <button class="action-toggle" data-id="${id}" data-action="toggle">${todo.completed ? 'Reopen' : 'Complete'}</button>
            <button class="action-edit" data-id="${id}" data-action="edit">Edit</button>
            <button class="action-delete" data-id="${id}" data-action="delete">Delete</button>
          </td>
        `;
        tableBody.appendChild(tr);
      }
    });

    if (filtered.length === 0) {
      if (todoList) {
        const emptyLi = document.createElement('div');
        emptyLi.className = 'empty-card';
        emptyLi.textContent = 'No tasks to show.';
        todoList.appendChild(emptyLi);
      }

      if (tableBody) {
        const tr = document.createElement('tr');
        tr.className = 'empty-row';
        tr.innerHTML = `<td colspan="5" style="text-align:center; padding:18px; color:rgba(255,255,255,0.7);">No tasks to show</td>`;
        tableBody.appendChild(tr);
      }
    }
  }

  function handleAction(id, action) {
    const numericId = Number(id);
    if (action === "toggle") return toggleTodo(numericId);
    if (action === "delete") return deleteTodo(numericId);
    if (action === "edit") return startEdit(numericId);
    if (action === "save") return saveEdit(numericId);
    if (action === "cancel") return cancelEdit(numericId);
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    handleAction(btn.dataset.id, btn.dataset.action);
  });

  function toggleTodo(id) {
    todos = todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
    saveTodos();
    renderTodos();
    updateStats();
  }

  function deleteTodo(id) {
    const ok = confirm("Hapus tugas ini?");
    if (!ok) return;
    todos = todos.filter((t) => t.id !== id);
    saveTodos();
    renderTodos();
    updateStats();
  }

  function startEdit(id) {
    const editBtn = document.querySelector(`button[data-id="${id}"][data-action="edit"]`);
    if (!editBtn) return;
    const li = editBtn.closest("li");
    const tr = editBtn.closest("tr");
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

    if (li) {
      const safeVal = (todo.text || "").replace(/"/g, '&quot;');
      li.innerHTML = `
        <div class="todo-main">
          <input class="edit-text" value="${safeVal}" />
          <input type="date" class="edit-date" value="${todo.date || ''}" />
        </div>
        <div class="buttons">
          <button class="action-save" data-id="${id}" data-action="save">Save</button>
          <button class="action-cancel" data-id="${id}" data-action="cancel">Cancel</button>
        </div>
      `;
    } else if (tr) {
      const idx = Array.from(tr.parentElement.children).indexOf(tr) + 1;
      const safeVal = (todo.text || "").replace(/"/g, '&quot;');
      tr.innerHTML = `
        <td>${idx}</td>
        <td><input class="edit-text" value="${safeVal}" /></td>
        <td><input type="date" class="edit-date" value="${todo.date || ''}" /></td>
        <td class="${todo.completed ? "status-complete" : "status-pending"}">${todo.completed ? "Completed" : "Pending"}</td>
        <td>
          <button class="action-save" data-id="${id}" data-action="save">Save</button>
          <button class="action-cancel" data-id="${id}" data-action="cancel">Cancel</button>
        </td>
      `;
    }
  }

  function saveEdit(id) {
    const saveBtn = document.querySelector(`button[data-id="${id}"][data-action="save"]`);
    if (!saveBtn) return;
    const li = saveBtn.closest("li");
    const tr = saveBtn.closest("tr");
    let newText = null;
    let newDate = null;

    if (li) {
      const input = li.querySelector(".edit-text");
      const dateInputEl = li.querySelector(".edit-date");
      if (!input) return;
      newText = input.value.trim();
      newDate = dateInputEl ? dateInputEl.value || null : null;
    } else if (tr) {
      const input = tr.querySelector(".edit-text");
      const dateInputEl = tr.querySelector(".edit-date");
      if (!input) return;
      newText = input.value.trim();
      newDate = dateInputEl ? dateInputEl.value || null : null;
    }

    if (!newText) {
      alert("Tugas tidak boleh kosong");
      return;
    }

    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    todo.text = newText;
    todo.date = newDate && newDate.trim() ? newDate.trim() : null;
    sortTodos();
    saveTodos();
    renderTodos();
    updateStats();
  }

  function cancelEdit() {
    renderTodos();
  }

  if (filterSelect) {
    filterSelect.addEventListener("change", function () {
      currentFilter = this.value;
      renderTodos();
    });
  }

  if (filterSegment) {
    const setActive = (name) => {
      filterSegment.querySelectorAll('.seg-btn').forEach((b) => {
        const is = b.dataset.filter === name;
        b.classList.toggle('active', is);
        b.setAttribute('aria-pressed', is ? 'true' : 'false');
      });
    };

    setActive(currentFilter);

    filterSegment.addEventListener('click', (e) => {
      const btn = e.target.closest('.seg-btn');
      if (!btn) return;
      const f = btn.dataset.filter;
      if (!f) return;
      currentFilter = f;
      setActive(f);
      renderTodos();
    });
  }

  function updateStats() {
    const total = todos.length;
    const completed = todos.filter((t) => t.completed).length;
    const pending = total - completed;
    const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

    if (totalTasks) totalTasks.textContent = total;
    if (completedTasks) completedTasks.textContent = completed;
    if (pendingTasks) pendingTasks.textContent = pending;
    if (progressPercent) progressPercent.textContent = progress + "%";
    if (progressFill) progressFill.style.width = progress + "%";
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  sortTodos();
  renderTodos();
  updateStats();
});
