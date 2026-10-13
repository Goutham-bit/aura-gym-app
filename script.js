/* ==========================================================================
   AURA Athletics - Core Web App Logic
   ========================================================================== */

// --- Audio Feedback Utility using Web Audio API ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(freq = 440, type = 'sine', duration = 0.15) {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

// --- Toast Messenger ---
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

// ==========================================================================
// 1. Active Workout Tracker Module
// ==========================================================================
let workoutSets = JSON.parse(localStorage.getItem('aura_workout_sets')) || [];

const exerciseNameInput = document.getElementById('exerciseNameInput');
const exerciseWeightInput = document.getElementById('exerciseWeightInput');
const exerciseRepsInput = document.getElementById('exerciseRepsInput');
const addSetBtn = document.getElementById('addSetBtn');
const workoutTableBody = document.getElementById('workoutTableBody');
const totalVolumeDisplay = document.getElementById('totalVolumeDisplay');
const completedSetsDisplay = document.getElementById('completedSetsDisplay');

function saveAndRenderWorkout() {
  localStorage.setItem('aura_workout_sets', JSON.stringify(workoutSets));
  workoutTableBody.innerHTML = '';

  let totalVolume = 0;
  let completedCount = 0;

  workoutSets.forEach((item, index) => {
    const volume = item.weight * item.reps;
    if (item.completed) {
      totalVolume += volume;
      completedCount++;
    }

    const tr = document.createElement('tr');
    if (item.completed) tr.classList.add('completed');

    tr.innerHTML = `
      <td><strong>${item.name}</strong></td>
      <td>${item.weight}</td>
      <td>${item.reps}</td>
      <td>${volume} kg</td>
      <td>
        <button class="check-btn" onclick="toggleSetStatus(${index})">
          ${item.completed ? '&#9989;' : '&#9744;'}
        </button>
      </td>
      <td>
        <button class="delete-btn" onclick="deleteSet(${index})">&#10005;</button>
      </td>
    `;
    workoutTableBody.appendChild(tr);
  });

  totalVolumeDisplay.textContent = `${totalVolume.toLocaleString()} kg`;
  completedSetsDisplay.textContent = completedCount;
}

function addWorkoutSet() {
  const name = exerciseNameInput.value.trim();
  const weight = parseFloat(exerciseWeightInput.value);
  const reps = parseInt(exerciseRepsInput.value, 10);

  if (!name || isNaN(weight) || isNaN(reps)) {
    showToast('Please fill out exercise name, weight, and reps.');
    return;
  }

  workoutSets.push({ name, weight, reps, completed: false });
  exerciseNameInput.value = '';
  exerciseWeightInput.value = '';
  exerciseRepsInput.value = '';

  playTone(520, 'sine', 0.1);
  saveAndRenderWorkout();
  showToast(`Added ${name} to session`);
}

window.toggleSetStatus = function(index) {
  workoutSets[index].completed = !workoutSets[index].completed;
  if (workoutSets[index].completed) playTone(780, 'triangle', 0.2);
  saveAndRenderWorkout();
};

window.deleteSet = function(index) {
  workoutSets.splice(index, 1);
  saveAndRenderWorkout();
};

addSetBtn.addEventListener('click', addWorkoutSet);

// ==========================================================================
// 2. Interval HIIT Timer Module
// ==========================================================================
let timerWorkDuration = 45;
let timerRestDuration = 15;
let timerTotalRounds = 6;

let timerCurrentRound = 1;
let timerPhase = 'WORK'; // 'WORK' or 'REST'
let timerSecondsRemaining = timerWorkDuration;
let timerInterval = null;
let timerRunning = false;

const ringCircle = document.getElementById('timerProgressRing');
const ringRadius = ringCircle.r.baseVal.value;
const ringCircumference = 2 * Math.PI * ringRadius;

ringCircle.style.strokeDasharray = `${ringCircumference} ${ringCircumference}`;

const timerClock = document.getElementById('timerClock');
const timerPhaseBadge = document.getElementById('timerPhaseBadge');
const timerRoundCount = document.getElementById('timerRoundCount');
const timerToggleBtn = document.getElementById('timerToggleBtn');
const timerResetBtn = document.getElementById('timerResetBtn');

function setTimerRingProgress(fraction) {
  const offset = ringCircumference - (fraction * ringCircumference);
  ringCircle.style.strokeDashoffset = offset;
}

function updateTimerInterface() {
  const mins = Math.floor(timerSecondsRemaining / 60);
  const secs = timerSecondsRemaining % 60;
  timerClock.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  timerPhaseBadge.textContent = timerPhase;
  timerRoundCount.textContent = `Round ${timerCurrentRound} / ${timerTotalRounds}`;

  const currentTotal = timerPhase === 'WORK' ? timerWorkDuration : timerRestDuration;
  setTimerRingProgress(timerSecondsRemaining / currentTotal);

  if (timerPhase === 'WORK') {
    timerPhaseBadge.style.color = 'var(--accent)';
    ringCircle.style.stroke = 'var(--accent)';
  } else {
    timerPhaseBadge.style.color = '#00d2d3';
    ringCircle.style.stroke = '#00d2d3';
  }
}

function timerStep() {
  if (timerSecondsRemaining > 0) {
    timerSecondsRemaining--;
    if (timerSecondsRemaining <= 3 && timerSecondsRemaining > 0) {
      playTone(400, 'square', 0.1); // Warning beep
    }
  } else {
    // Transition Phase
    if (timerPhase === 'WORK') {
      playTone(880, 'triangle', 0.3); // High alert for rest
      timerPhase = 'REST';
      timerSecondsRemaining = timerRestDuration;
    } else {
      if (timerCurrentRound < timerTotalRounds) {
        playTone(660, 'sine', 0.3);
        timerCurrentRound++;
        timerPhase = 'WORK';
        timerSecondsRemaining = timerWorkDuration;
      } else {
        // Complete
        clearInterval(timerInterval);
        timerRunning = false;
        timerToggleBtn.textContent = 'Start Interval';
        playTone(990, 'sine', 0.5);
        showToast('Interval Session Finished!');
        return;
      }
    }
  }
  updateTimerInterface();
}

timerToggleBtn.addEventListener('click', () => {
  if (!timerRunning) {
    timerRunning = true;
    timerToggleBtn.textContent = 'Pause';
    timerInterval = setInterval(timerStep, 1000);
    playTone(550, 'sine', 0.15);
  } else {
    timerRunning = false;
    timerToggleBtn.textContent = 'Resume';
    clearInterval(timerInterval);
  }
});

timerResetBtn.addEventListener('click', () => {
  clearInterval(timerInterval);
  timerRunning = false;
  timerToggleBtn.textContent = 'Start Interval';
  timerCurrentRound = 1;
  timerPhase = 'WORK';
  timerSecondsRemaining = timerWorkDuration;
  updateTimerInterface();
});

document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    clearInterval(timerInterval);
    timerRunning = false;
    timerToggleBtn.textContent = 'Start Interval';

    timerWorkDuration = parseInt(e.target.dataset.work, 10);
    timerRestDuration = parseInt(e.target.dataset.rest, 10);
    timerTotalRounds = parseInt(e.target.dataset.rounds, 10);

    timerCurrentRound = 1;
    timerPhase = 'WORK';
    timerSecondsRemaining = timerWorkDuration;
    updateTimerInterface();
    showToast(`Preset: ${e.target.textContent} loaded.`);
  });
});

// ==========================================================================
// 3. Movement / Exercise Catalog Module
// ==========================================================================
const exerciseLibrary = [
  { name: 'Barbell Back Squat', category: 'Legs', cues: 'Engage core, track knees over toes, maintain neutral lumbar posture.' },
  { name: 'Romanian Deadlift', category: 'Legs', cues: 'Hip hinge pattern, maintain slight knee flexion, load hamstrings.' },
  { name: 'Incline Dumbbell Press', category: 'Chest', cues: '30-degree bench angle, retract scapulae, drive through clavicular head.' },
  { name: 'Weighted Chest Dips', category: 'Chest', cues: 'Slight forward torso lean, 90-degree elbow flexion, lock out triceps.' },
  { name: 'Chest Supported Row', category: 'Back', cues: 'Protracted stretch at bottom, elbow drive leading with lats.' },
  { name: 'Lat Pulldown', category: 'Back', cues: 'Pronated grip, pull elbow downward towards iliac crest.' },
  { name: 'Overhead Barbell Press', category: 'Shoulders', cues: 'Brace abdominal wall, head passes through plane at apex.' },
  { name: 'Cable Lateral Raise', category: 'Shoulders', cues: 'Set pulley at wrist height, lead with elbows in the scapular plane.' }
];

const exerciseGrid = document.getElementById('exerciseGrid');
const exerciseSearchInput = document.getElementById('exerciseSearchInput');
const categoryFilterContainer = document.getElementById('categoryFilterContainer');

function renderExerciseCards(filterCategory = 'all', searchQuery = '') {
  exerciseGrid.innerHTML = '';
  const filtered = exerciseLibrary.filter(item => {
    const matchesCat = filterCategory === 'all' || item.category === filterCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  filtered.forEach(ex => {
    const card = document.createElement('div');
    card.classList.add('exercise-card');
    card.innerHTML = `
      <div>
        <div class="exercise-card-header">
          <span class="exercise-category">${ex.category}</span>
        </div>
        <h4>${ex.name}</h4>
        <p class="exercise-cues">${ex.cues}</p>
      </div>
      <button class="btn btn-sm btn-outline" onclick="prefillTracker('${ex.name}')">+ Add to Session</button>
    `;
    exerciseGrid.appendChild(card);
  });
}

window.prefillTracker = function(name) {
  exerciseNameInput.value = name;
  window.location.hash = '#tracker';
  exerciseWeightInput.focus();
  showToast(`Loaded ${name} into session logger`);
};

exerciseSearchInput.addEventListener('input', (e) => {
  const currentActivePill = document.querySelector('.pill-btn.active');
  renderExerciseCards(currentActivePill.dataset.filter, e.target.value);
});

categoryFilterContainer.addEventListener('click', (e) => {
  if (e.target.classList.contains('pill-btn')) {
    document.querySelectorAll('.pill-btn').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    renderExerciseCards(e.target.dataset.filter, exerciseSearchInput.value);
  }
});

// ==========================================================================
// 4. Calculators Module
// ==========================================================================
// 1RM Calculation (Epley Formula)
document.getElementById('calc1RMBtn').addEventListener('click', () => {
  const w = parseFloat(document.getElementById('rmWeight').value);
  const r = parseInt(document.getElementById('rmReps').value, 10);
  if (isNaN(w) || isNaN(r) || r < 1) return;

  const oneRM = r === 1 ? w : w * (1 + r / 30);
  document.getElementById('estimated1RM').textContent = `${oneRM.toFixed(1)} kg`;
  showToast('1RM calculated successfully');
});

// TDEE Calculation (Mifflin-St Jeor)
document.getElementById('calcTDEEBtn').addEventListener('click', () => {
  const w = parseFloat(document.getElementById('tdeeWeight').value);
  const h = parseFloat(document.getElementById('tdeeHeight').value);
  const a = parseInt(document.getElementById('tdeeAge').value, 10);
  if (isNaN(w) || isNaN(h) || isNaN(a)) return;

  // Baseline assuming moderate active multiplier (x1.45)
  const bmr = (10 * w) + (6.25 * h) - (5 * a) + 5;
  const tdee = Math.round(bmr * 1.45);
  document.getElementById('tdeeDisplay').textContent = `${tdee.toLocaleString()} kcal`;
  showToast('Energy target updated');
});

// ==========================================================================
// 5. Booking & Memberships Interactivity
// ==========================================================================
document.querySelectorAll('.book-class-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    playTone(600, 'sine', 0.1);
    showToast(`Confirmed reservation: ${btn.dataset.class}`);
  });
});

document.querySelectorAll('.join-plan-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    playTone(720, 'sine', 0.15);
    showToast(`Tier selected: ${btn.dataset.plan}. Redirecting to portal...`);
  });
});

// ==========================================================================
// Initial Boot
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  saveAndRenderWorkout();
  updateTimerInterface();
  renderExerciseCards();
  if (window.lucide) lucide.createIcons();
});