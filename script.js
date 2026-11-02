const dateDisplay = document.getElementById("date-display");
const newTask = document.getElementById("new-task");
const addBtn = document.getElementById("add-btn");
const allBtn = document.getElementById("all-btn");
const activeBtn = document.getElementById("active-btn");
const overdueBtn = document.getElementById("overdue-btn");
const completedBtn = document.getElementById("completed-btn");

const startScreen = document.getElementById("start-screen");
const allScreen = document.getElementById("all-screen");
const activeScreen = document.getElementById("active-screen");
const overdueScreen = document.getElementById("overdue-screen");
const completedScreen = document.getElementById("completed-screen");

const taskLeft = document.getElementById("task-left");
const clear = document.getElementById("clear");
const taskDeadline = document.getElementById("task-deadline");

const taskAll = document.getElementById("task-all");
const taskAct = document.getElementById("task-act");
const taskOverdue = document.getElementById("task-overdue");
const taskComp = document.getElementById("task-comp");

// Alarm settings
const ALARM_IMAGE = "img/red-alarm-icon-png.webp";
const ALARM_WINDOW = 5 * 24 * 60 * 60 * 1000;

let audioContext = null;
let soundEnabled = false;
const alertedTasks = new Set();

// Enable sound after the user's first interaction
function enableAlarmSound() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) return;

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }

  audioContext
    .resume()
    .then(() => {
      soundEnabled = true;
      checkAlarmSounds();
    })
    .catch(() => {
      soundEnabled = false;
    });
}

document.addEventListener("click", enableAlarmSound, { once: true });
document.addEventListener("keydown", enableAlarmSound, { once: true });

// Play a short beep
function playBeep() {
  if (!soundEnabled || !audioContext) return;

  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = 880;

  gain.gain.setValueAtTime(0.001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.2, audioContext.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    audioContext.currentTime + 0.35,
  );

  oscillator.connect(gain);
  gain.connect(audioContext.destination);

  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.36);
}

// Display today's date
dateDisplay.textContent = new Date().toLocaleDateString("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

// Load saved tasks
let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
let listType = "all";

// Event listeners
addBtn.addEventListener("click", () => addEvent(newTask.value));

newTask.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addEvent(newTask.value);
});

clear.addEventListener("click", clearTask);

allBtn.addEventListener("click", filterAll);
activeBtn.addEventListener("click", filterActive);
overdueBtn.addEventListener("click", filterOverdue);
completedBtn.addEventListener("click", filterCompleted);

// Navigation styling
function updateSelectedButton(selectedButton) {
  [allBtn, activeBtn, overdueBtn, completedBtn].forEach((button) => {
    button.classList.toggle("selected", button === selectedButton);
    button.classList.toggle("unselected", button !== selectedButton);
  });
}

// Filters
function filterAll() {
  listType = "all";
  updateSelectedButton(allBtn);
  rendertasks();
}

function filterActive() {
  listType = "active";
  updateSelectedButton(activeBtn);
  rendertasks();
}

function filterOverdue() {
  listType = "overdue";
  updateSelectedButton(overdueBtn);
  rendertasks();
}

function filterCompleted() {
  listType = "comp";
  updateSelectedButton(completedBtn);
  rendertasks();
}

// Convert deadline to timestamp
function getDeadline(task) {
  if (!task.deadline) return null;

  const timestamp = new Date(task.deadline).getTime();

  return Number.isNaN(timestamp) ? null : timestamp;
}

// Determine task status
function isOverdue(task) {
  const deadline = getDeadline(task);

  return !task.completed && deadline !== null && deadline < Date.now();
}

function isPending(task) {
  return !task.completed && !isOverdue(task);
}

// Alarm appears for pending tasks due within five days
function needsAlarm(task) {
  const deadline = getDeadline(task);
  const remaining = deadline - Date.now();

  return (
    !task.completed &&
    deadline !== null &&
    remaining > 0 &&
    remaining <= ALARM_WINDOW
  );
}

// Beep once per task during its five-day warning window
function checkAlarmSounds() {
  if (!soundEnabled) return;

  tasks.forEach((task) => {
    if (!needsAlarm(task)) return;
    if (alertedTasks.has(task.id)) return;

    alertedTasks.add(task.id);
    playBeep();
  });
}

// Add task
function addEvent(text) {
  text = text.trim();

  if (!text) {
    newTask.focus();
    return;
  }

  const task = {
    id: Date.now(),
    text,
    deadline: taskDeadline.value,
    completed: false,
  };

  tasks.push(task);

  newTask.value = "";
  taskDeadline.value = "";

  savetasks();
  rendertasks();
}

// Save tasks
function savetasks() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

// Create task row
function createTaskItem(task) {
  const li = document.createElement("li");

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = task.completed;
  checkbox.className = task.completed
    ? "checkbox checkbox-selected"
    : "checkbox checkbox-unselected";

  const taskName = document.createElement("span");
  taskName.textContent = task.text;

  if (task.completed) {
    taskName.classList.add("task-completed");
  }

  const deadlineText = document.createElement("span");
  deadlineText.className = "task-date";

  const deadline = getDeadline(task);

  if (deadline !== null) {
    deadlineText.textContent = `Due: ${new Date(deadline).toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short",
    })}`;
  }

  // Place the alarm immediately after the task name
  li.append(checkbox, taskName);

  if (needsAlarm(task)) {
    const alarm = document.createElement("img");

    alarm.src = ALARM_IMAGE;
    alarm.alt = "Deadline approaching";
    alarm.title = "This task is due within five days";
    alarm.className = "task-alarm";

    li.appendChild(alarm);
  }

  // Keep the deadline on the right
  li.appendChild(deadlineText);

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-btn";
  deleteBtn.innerHTML = "&times;";
  deleteBtn.setAttribute("aria-label", "Delete task");

  checkbox.addEventListener("change", (e) => {
    task.completed = e.target.checked;
    savetasks();
    rendertasks();
  });

  deleteBtn.addEventListener("click", () => {
    deleteTask(task.id);
  });

  li.appendChild(deleteBtn);

  return li;
}

// Render lists in earliest-deadline order
function rendertasks() {
  taskAll.innerHTML = "";
  taskAct.innerHTML = "";
  taskOverdue.innerHTML = "";
  taskComp.innerHTML = "";

  const sortedTasks = [...tasks].sort((a, b) => {
    const deadlineA = getDeadline(a);
    const deadlineB = getDeadline(b);

    if (deadlineA === null && deadlineB === null) return 0;
    if (deadlineA === null) return 1;
    if (deadlineB === null) return -1;

    return deadlineA - deadlineB;
  });

  sortedTasks.forEach((task) => {
    taskAll.appendChild(createTaskItem(task));

    if (task.completed) {
      taskComp.appendChild(createTaskItem(task));
    } else if (isOverdue(task)) {
      taskOverdue.appendChild(createTaskItem(task));
    } else {
      taskAct.appendChild(createTaskItem(task));
    }
  });

  checkType();
}

// Delete task
function deleteTask(taskId) {
  tasks = tasks.filter((task) => task.id !== taskId);

  savetasks();
  rendertasks();
}

// Clear completed tasks
function clearTask() {
  tasks = tasks.filter((task) => !task.completed);

  savetasks();
  rendertasks();
}

// Update visible screen and counter
function checkType() {
  [
    startScreen,
    allScreen,
    activeScreen,
    overdueScreen,
    completedScreen,
  ].forEach((screen) => screen.classList.remove("active"));

  const screenMap = {
    all: { screen: allScreen, list: taskAll },
    active: { screen: activeScreen, list: taskAct },
    overdue: { screen: overdueScreen, list: taskOverdue },
    comp: { screen: completedScreen, list: taskComp },
  };

  const current = screenMap[listType];
  const count = current.list.children.length;

  taskLeft.textContent = count;

  if (count === 0) {
    startScreen.classList.add("active");
  } else {
    current.screen.classList.add("active");
  }
}

// Initial display
filterAll();

// Refresh alarms and overdue status every 15 seconds
setInterval(() => {
  checkAlarmSounds();
  rendertasks();
}, 15000);
