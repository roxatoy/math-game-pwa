const { useState, useEffect, useCallback } = React;

const LEVELS = [
  { name: "Лёгкий", max: 10, emoji: "🌱", color: "#4ade80" },
  { name: "Средний", max: 20, emoji: "🌟", color: "#facc15" },
  { name: "Трудный", max: 50, emoji: "🔥", color: "#f97316" },
  { name: "Безумный", max: 100, emoji: "💥", color: "#ef4444" },
];

const OPS = [
  { sign: "+", label: "Сложение", emoji: "➕" },
  { sign: "-", label: "Вычитание", emoji: "➖" },
  { sign: "×", label: "Умножение", emoji: "✖️" },
  { sign: "÷", label: "Деление", emoji: "➗" },
];

const GAME_MODES = [
  { name: "Тренировка", questions: 5, emoji: "🧑" },
  { name: "Нормально", questions: 10, emoji: "🎮" },
  { name: "Челлендж", questions: 20, emoji: "⚡" },
  { name: "Экстрим", questions: 30, emoji: "🚀" },
];

const ACHIEVEMENTS = [
  { id: "first", name: "Первый шаг", emoji: "👣", condition: "score >= 5" },
  { id: "perfect", name: "Идеально!", emoji: "👏", condition: "accuracy === 100" },
  { id: "speedster", name: "Молния", emoji: "⚡", condition: "fastestTime < 2" },
  { id: "streak10", name: "На волне", emoji: "🌊", condition: "maxStreak >= 10" },
  { id: "thousand", name: "Миллионер", emoji: "💰", condition: "totalScore >= 1000" },
  { id: "master", name: "Мастер", emoji: "🏆", condition: "gamesPlayed >= 50" },
];

function generateQuestion(op, max) {
  if (op.sign === "+") {
    const a = Math.floor(Math.random() * max) + 1;
    const b = Math.floor(Math.random() * max) + 1;
    return { text: `${a} + ${b}`, answer: a + b };
  }
  if (op.sign === "-") {
    const a = Math.floor(Math.random() * max) + 1;
    const b = Math.floor(Math.random() * a) + 1;
    return { text: `${a} − ${b}`, answer: a - b };
  }
  if (op.sign === "×") {
    const a = Math.floor(Math.random() * Math.min(max, 10)) + 1;
    const b = Math.floor(Math.random() * Math.min(max, 10)) + 1;
    return { text: `${a} × ${b}`, answer: a * b };
  }
  if (op.sign === "÷") {
    const b = Math.floor(Math.random() * Math.min(max, 10)) + 1;
    const answer = Math.floor(Math.random() * Math.min(max, 10)) + 1;
    return { text: `${b * answer} ÷ ${b}`, answer };
  }
}

function generateChoices(answer) {
  const choices = new Set([answer]);
  while (choices.size < 4) {
    const delta = Math.floor(Math.random() * 10) - 5;
    const c = answer + delta;
    if (c > 0 && c !== answer) choices.add(c);
  }
  return [...choices].sort(() => Math.random() - 0.5);
}

const STARS = ["⭐", "🌙", "☁️", "💫", "✨", "🎈", "🦋", "🌈"];

function playSound(type) {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  if (type === 'correct') {
    oscillator.frequency.value = 800;
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } else if (type === 'wrong') {
    oscillator.frequency.value = 300;
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  }
}

export default function MathGame() {
  const [screen, setScreen] = useState("home");
  const [selectedOps, setSelectedOps] = useState([0, 1]);
  const [levelIdx, setLevelIdx] = useState(0);
  const [modeIdx, setModeIdx] = useState(1);
  const [question, setQuestion] = useState(null);
  const [choices, setChoices] = useState([]);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [total, setTotal] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [shaking, setShaking] = useState(false);
  const [bouncing, setBouncing] = useState(false);
  const [stars, setStars] = useState([]);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [questionsLeft, setQuestionsLeft] = useState(10);
  const [timeLeft, setTimeLeft] = useState(10);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [stats, setStats] = useState({
    totalScore: 0,
    gamesPlayed: 0,
    maxStreak: 0,
    fastestTime: Infinity,
    unlockedAchievements: []
  });
  const [showAchievements, setShowAchievements] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [answerTime, setAnswerTime] = useState(10);

  // Загрузка статистики из localStorage
  useEffect(() => {
    const saved = localStorage.getItem('mathGameStats');
    if (saved) {
      setStats(JSON.parse(saved));
    }
  }, []);

  // Сохранение статистики в localStorage
  useEffect(() => {
    localStorage.setItem('mathGameStats', JSON.stringify(stats));
  }, [stats]);

  const newQuestion = useCallback(() => {
    const op = OPS[selectedOps[Math.floor(Math.random() * selectedOps.length)]];
    const level = LEVELS[levelIdx];
    const q = generateQuestion(op, level.max);
    setQuestion(q);
    setChoices(generateChoices(q.answer));
    setFeedback(null);
    setSelectedChoice(null);
    setTimeLeft(10);
    setAnswerTime(10);
  }, [selectedOps, levelIdx]);

  useEffect(() => {
    if (screen === "game") newQuestion();
  }, [screen]);

  // Countdown timer
  useEffect(() => {
    if (screen !== "game" || feedback) return;
    if (timeLeft <= 0) {
      setFeedback("timeout");
      setStreak(0);
      setTotal((t) => t + 1);
      setShaking(true);
      if (soundEnabled) playSound('wrong');
      setTimeout(() => setShaking(false), 500);
      setTimeout(() => {
        setQuestionsLeft((prev) => {
          const next = prev - 1;
          if (next <= 0) setScreen("result");
          else newQuestion();
          return next;
        });
      }, 900);
      return;
    }
    const id = setTimeout(() => {
      setTimeLeft((t) => t - 1);
      setAnswerTime((t) => t - 1);
    }, 1000);
    return () => clearTimeout(id);
  }, [screen, timeLeft, feedback, soundEnabled]);

  const spawnStars = () => {
    const newStars = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      emoji: STARS[Math.floor(Math.random() * STARS.length)],
      x: Math.random() * 80 + 10,
      y: Math.random() * 60 + 10,
    }));
    setStars(newStars);
    setTimeout(() => setStars([]), 1200);
  };

  const checkAchievements = (newScore, newAccuracy, newMaxStreak, newFastestTime) => {
    const newUnlocked = [...stats.unlockedAchievements];
    
    ACHIEVEMENTS.forEach(ach => {
      if (!newUnlocked.includes(ach.id)) {
        let isUnlocked = false;
        if (ach.id === "first" && newScore >= 5) isUnlocked = true;
        if (ach.id === "perfect" && newAccuracy === 100) isUnlocked = true;
        if (ach.id === "speedster" && newFastestTime < 2) isUnlocked = true;
        if (ach.id === "streak10" && newMaxStreak >= 10) isUnlocked = true;
        if (ach.id === "thousand" && newScore >= 1000) isUnlocked = true;
        if (ach.id === "master" && stats.gamesPlayed >= 50) isUnlocked = true;
        
        if (isUnlocked) {
          newUnlocked.push(ach.id);
        }
      }
    });
    
    return newUnlocked;
  };

  const handleAnswer = (choice) => {
    if (feedback) return;
    setSelectedChoice(choice);
    const correct = choice === question.answer;
    setFeedback(correct ? "correct" : "wrong");
    setTotal((t) => t + 1);
    setTimeLeft(0);

    if (correct) {
      const bonus = streak >= 2 ? 2 : 1;
      const timeBonus = answerTime >= 8 ? 1 : 0;
      const totalPoints = bonus + timeBonus;
      setScore((s) => s + totalPoints);
      setStreak((s) => s + 1);
      setBouncing(true);
      spawnStars();
      if (soundEnabled) playSound('correct');
      setTimeout(() => setBouncing(false), 600);
    } else {
      setStreak(0);
      setShaking(true);
      if (soundEnabled) playSound('wrong');
      setTimeout(() => setShaking(false), 500);
    }

    setTimeout(() => {
      const next = questionsLeft - 1;
      setQuestionsLeft(next);
      if (next <= 0) {
        setScreen("result");
      } else {
        newQuestion();
      }
    }, 900);
  };

  const toggleOp = (idx) => {
    setSelectedOps((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const level = LEVELS[levelIdx];
  const accuracy = total > 0 ? Math.round((score / total) * 100) : 0;

  const medal =
    accuracy >= 90 ? "🥇" : accuracy >= 70 ? "🥈" : accuracy >= 50 ? "🥉" : "🎈";

  const finishGame = () => {
    const newMaxStreak = Math.max(stats.maxStreak, streak);
    const newFastestTime = Math.min(stats.fastestTime, answerTime);
    const newUnlocked = checkAchievements(score, accuracy, newMaxStreak, newFastestTime);
    
    setStats(prev => ({
      ...prev,
      totalScore: prev.totalScore + score,
      gamesPlayed: prev.gamesPlayed + 1,
      maxStreak: newMaxStreak,
      fastestTime: newFastestTime,
      unlockedAchievements: newUnlocked
    }));
  };

  return (
    <div style={styles.root}>
      <style>{css}</style>

      {stars.map((s) => (
        <div
          key={s.id}
          style={{ ...styles.floatingStar, left: `${s.x}%`, top: `${s.y}%` }}
          className="float-star"
        >
          {s.emoji}
        </div>
      ))}

      {/* HOME */}
      {screen === "home" && (
        <div style={styles.card} className="fade-in">
          <div style={styles.titleRow}>
            <span style={styles.logo}>🧮</span>
            <h1 style={styles.title}>МатИгра</h1>
          </div>
          <p style={styles.subtitle}>Считай быстро — зарабатывай звёзды!</p>

          {/* Быстрая статистика */}
          <div style={styles.statsRow}>
            <div style={styles.statBox}>
              <div style={styles.statValue}>{stats.totalScore}</div>
              <div style={styles.statLabel}>Всего очков</div>
            </div>
            <div style={styles.statBox}>
              <div style={styles.statValue}>{stats.gamesPlayed}</div>
              <div style={styles.statLabel}>Игр</div>
            </div>
            <div style={styles.statBox}>
              <div style={styles.statValue}>{stats.maxStreak}</div>
              <div style={styles.statLabel}>Макс стрик</div>
            </div>
          </div>

          <div style={styles.section}>
            <p style={styles.label}>Выбери действия:</p>
            <div style={styles.opsGrid}>
              {OPS.map((op, i) => (
                <button
                  key={i}
                  onClick={() => toggleOp(i)}
                  style={{
                    ...styles.opBtn,
                    background: selectedOps.includes(i) ? "#6c63ff" : "#1e1b4b",
                    border: selectedOps.includes(i)
                      ? "3px solid #a78bfa"
                      : "3px solid #312e81",
                    transform: selectedOps.includes(i) ? "scale(1.05)" : "scale(1)",
                  }}
                >
                  <span style={{ fontSize: 24 }}>{op.emoji}</span>
                  <span style={styles.opLabel}>{op.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={styles.section}>
            <p style={styles.label}>Уровень сложности:</p>
            <div style={styles.levelRow}>
              {LEVELS.map((lv, i) => (
                <button
                  key={i}
                  onClick={() => setLevelIdx(i)}
                  style={{
                    ...styles.levelBtn,
                    background: levelIdx === i ? lv.color : "#1e1b4b",
                    color: levelIdx === i ? "#1e1b4b" : "#a5b4fc",
                    fontWeight: levelIdx === i ? 800 : 600,
                  }}
                >
                  {lv.emoji} {lv.name}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.section}>
            <p style={styles.label}>Режим игры:</p>
            <div style={styles.modesGrid}>
              {GAME_MODES.map((mode, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setModeIdx(i);
                    if (selectedOps.length > 0) {
                      setScore(0);
                      setStreak(0);
                      setTotal(0);
                      setQuestionsLeft(mode.questions);
                      setTimeLeft(10);
                      setScreen("game");
                    }
                  }}
                  style={{
                    ...styles.modeBtn,
                    opacity: selectedOps.length === 0 ? 0.4 : 1,
                    pointerEvents: selectedOps.length === 0 ? 'none' : 'auto'
                  }}
                >
                  {mode.emoji} {mode.name}
                  <br />
                  <span style={{ fontSize: 12, opacity: 0.8 }}>{mode.questions} вопросов</span>
                </button>
              ))}
            </div>
          </div>

          <div style={styles.bottomButtons}>
            <button onClick={() => setShowAchievements(true)} style={styles.iconBtn}>
              🏆 Достижения
            </button>
            <button onClick={() => setShowSettings(true)} style={styles.iconBtn}>
              ⚙️ Настройки
            </button>
          </div>
        </div>
      )}

      {/* ACHIEVEMENTS MODAL */}
      {showAchievements && (
        <div style={styles.modal} onClick={() => setShowAchievements(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: "#e0d7ff", marginBottom: 20 }}>🏆 Достижения</h2>
            <div style={styles.achievementsGrid}>
              {ACHIEVEMENTS.map(ach => {
                const isUnlocked = stats.unlockedAchievements.includes(ach.id);
                return (
                  <div key={ach.id} style={{
                    ...styles.achievement,
                    opacity: isUnlocked ? 1 : 0.4
                  }}>
                    <div style={{ fontSize: 32 }}>{ach.emoji}</div>
                    <div style={{ fontSize: 12, color: "#a5b4fc", textAlign: "center" }}>{ach.name}</div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => setShowAchievements(false)} style={styles.closeBtn}>✕ Закрыть</button>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div style={styles.modal} onClick={() => setShowSettings(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: "#e0d7ff", marginBottom: 20 }}>⚙️ Настройки</h2>
            <div style={styles.settingItem}>
              <span style={{ color: "#c4b5fd" }}>🔊 Звук</span>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                style={{
                  ...styles.toggle,
                  background: soundEnabled ? "#4ade80" : "#1e1b4b"
                }}
              >
                {soundEnabled ? "✓" : "✕"}
              </button>
            </div>
            <div style={styles.settingItem}>
              <span style={{ color: "#c4b5fd" }}>📊 Статистика</span>
            </div>
            <div style={styles.statsDetail}>
              <div>⭐ Всего очков: <strong>{stats.totalScore}</strong></div>
              <div>🎮 Игр сыграно: <strong>{stats.gamesPlayed}</strong></div>
              <div>🔥 Макс стрик: <strong>{stats.maxStreak}</strong></div>
              <div>⚡ Самый быстрый: <strong>{stats.fastestTime === Infinity ? '-' : stats.fastestTime + 'с'}</strong></div>
            </div>
            <button
              onClick={() => {
                if (confirm('Вы уверены? Это удалит всю статистику!')) {
                  setStats({
                    totalScore: 0,
                    gamesPlayed: 0,
                    maxStreak: 0,
                    fastestTime: Infinity,
                    unlockedAchievements: []
                  });
                  setShowSettings(false);
                }
              }}
              style={styles.resetBtn}
            >
              🗑️ Сброс данных
            </button>
            <button onClick={() => setShowSettings(false)} style={styles.closeBtn}>✕ Закрыть</button>
          </div>
        </div>
      )}

      {/* GAME */}
      {screen === "game" && question && (
        <div style={styles.card} className="fade-in">
          <div style={styles.gameHeader}>
            <div style={styles.scoreBox}>
              <span style={styles.scoreNum}>⭐ {score}</span>
              {streak >= 2 && (
                <span style={styles.streakBadge}>🔥 ×{streak}</span>
              )}
            </div>
            <div style={styles.progressBar}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${((GAME_MODES[modeIdx].questions - questionsLeft) / GAME_MODES[modeIdx].questions) * 100}%`,
                }}
              />
            </div>
            <div style={{
              ...styles.timerCircle,
              background: timeLeft <= 3 ? "#7f1d1d" : timeLeft <= 5 ? "#78350f" : "#1e1b4b",
              border: `3px solid ${timeLeft <= 3 ? "#f87171" : timeLeft <= 5 ? "#fbbf24" : "#4338ca"}`,
              color: timeLeft <= 3 ? "#f87171" : timeLeft <= 5 ? "#fbbf24" : "#a5b4fc",
              animation: timeLeft <= 3 && !feedback ? "timerPulse 0.5s infinite" : "none",
            }}>
              ⏱ {timeLeft}
            </div>
          </div>

          <div
            style={{
              ...styles.questionBox,
              background:
                feedback === "correct"
                  ? "#14532d"
                  : feedback === "wrong" || feedback === "timeout"
                  ? "#450a0a"
                  : "#1e1b4b",
              border:
                feedback === "correct"
                  ? "3px solid #4ade80"
                  : feedback === "wrong" || feedback === "timeout"
                  ? "3px solid #f87171"
                  : "3px solid #4338ca",
            }}
            className={bouncing ? "bounce" : shaking ? "shake" : ""}
          >
            <p style={styles.questionText}>{question.text} = ?</p>
            {feedback === "correct" && (
              <p style={{ color: "#4ade80", fontSize: 28, margin: 0 }}>✓ Верно!</p>
            )}
            {feedback === "wrong" && (
              <p style={{ color: "#f87171", fontSize: 22, margin: 0 }}>
                Ответ: {question.answer}
              </p>
            )}
            {feedback === "timeout" && (
              <p style={{ color: "#f87171", fontSize: 22, margin: 0 }}>
                ⏰ Время вышло! Ответ: {question.answer}
              </p>
            )}
          </div>

          <div style={styles.choicesGrid}>
            {choices.map((c, i) => {
              let bg = "#1e1b4b";
              let border = "3px solid #4338ca";
              if (selectedChoice !== null) {
                if (c === question.answer) {
                  bg = "#14532d";
                  border = "3px solid #4ade80";
                } else if (c === selectedChoice && c !== question.answer) {
                  bg = "#450a0a";
                  border = "3px solid #f87171";
                }
              }
              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(c)}
                  style={{ ...styles.choiceBtn, background: bg, border }}
                  className="choice-btn"
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* RESULT */}
      {screen === "result" && (
        <div style={styles.card} className="fade-in">
          <div style={styles.resultEmoji}>{medal}</div>
          <h2 style={styles.resultTitle}>Молодец!</h2>
          <div style={styles.resultStats}>
            <div style={styles.statItem}>
              <span style={styles.statNum}>⭐ {score}</span>
              <span style={styles.statLabel}>Очки</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statNum}>{total}</span>
              <span style={styles.statLabel}>Вопросов</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statNum}>{accuracy}%</span>
              <span style={styles.statLabel}>Точность</span>
            </div>
          </div>

          <div style={styles.resultMsg}>
            {accuracy >= 90
              ? "🏆 Ты настоящий математик!"
              : accuracy >= 70
              ? "🌟 Отличный результат!"
              : accuracy >= 50
              ? "👍 Неплохо, продолжай!"
              : "💪 Ещё немного практики!"}
          </div>

          <div style={styles.resultBtns}>
            <button
              onClick={() => {
                finishGame();
                setQuestionsLeft(GAME_MODES[modeIdx].questions);
                setScore(0);
                setStreak(0);
                setTotal(0);
                setTimeLeft(10);
                setScreen("game");
                setTimeout(newQuestion, 50);
              }}
              style={styles.replayBtn}
            >
              🔄 Ещё раз
            </button>
            <button
              onClick={() => {
                finishGame();
                setScreen("home");
              }}
              style={styles.homeBtn}
            >
              🏠 Меню
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  root: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Nunito', 'Comic Sans MS', cursive",
    padding: 16,
    position: "relative",
    overflow: "hidden",
  },
  card: {
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(20px)",
    borderRadius: 32,
    padding: "32px 28px",
    maxWidth: 440,
    width: "100%",
    border: "1.5px solid rgba(255,255,255,0.12)",
    boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
    position: "relative",
    zIndex: 1,
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 4,
  },
  logo: { fontSize: 48 },
  title: {
    fontSize: 42,
    fontWeight: 900,
    color: "#e0d7ff",
    margin: 0,
    letterSpacing: -1,
    textShadow: "0 0 30px #6c63ff88",
  },
  subtitle: {
    textAlign: "center",
    color: "#a5b4fc",
    fontSize: 16,
    marginBottom: 20,
    marginTop: 4,
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 8,
    marginBottom: 20,
    padding: 12,
    background: "rgba(255,255,255,0.05)",
    borderRadius: 16,
  },
  statBox: {
    textAlign: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: 900,
    color: "#facc15",
  },
  statLabel: {
    fontSize: 11,
    color: "#a5b4fc",
    fontWeight: 700,
  },
  section: { marginBottom: 24 },
  label: {
    color: "#c4b5fd",
    fontSize: 15,
    fontWeight: 700,
    marginBottom: 10,
    marginTop: 0,
  },
  opsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },
  opBtn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    padding: "14px 8px",
    borderRadius: 16,
    cursor: "pointer",
    color: "#e0d7ff",
    transition: "all 0.2s",
    fontSize: 13,
    fontFamily: "inherit",
  },
  opLabel: { fontWeight: 700 },
  levelRow: { display: "flex", gap: 10, flexWrap: "wrap" },
  levelBtn: {
    flex: 1,
    minWidth: "80px",
    padding: "12px 6px",
    borderRadius: 14,
    border: "none",
    cursor: "pointer",
    fontSize: 13,
    transition: "all 0.2s",
    fontWeight: 600,
    fontFamily: "inherit",
  },
  modesGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },
  modeBtn: {
    padding: "16px 12px",
    borderRadius: 16,
    border: "2px solid #4338ca",
    background: "rgba(67, 56, 202, 0.2)",
    color: "#e0d7ff",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 700,
    transition: "all 0.2s",
    fontFamily: "inherit",
  },
  bottomButtons: {
    display: "flex",
    gap: 12,
    marginTop: 20,
  },
  iconBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    border: "2px solid #4338ca",
    background: "rgba(67, 56, 202, 0.2)",
    color: "#a5b4fc",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 700,
    transition: "all 0.2s",
    fontFamily: "inherit",
  },
  modal: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modalContent: {
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(20px)",
    borderRadius: 32,
    padding: 28,
    maxWidth: 400,
    width: "90%",
    border: "1.5px solid rgba(255,255,255,0.12)",
    boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
    maxHeight: "80vh",
    overflowY: "auto",
  },
  achievementsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 12,
    marginBottom: 20,
  },
  achievement: {
    padding: 16,
    background: "rgba(67, 56, 202, 0.2)",
    borderRadius: 16,
    textAlign: "center",
    border: "1px solid #4338ca",
  },
  settingItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    marginBottom: 12,
    background: "rgba(67, 56, 202, 0.2)",
    borderRadius: 12,
  },
  toggle: {
    width: 40,
    height: 40,
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    color: "#fff",
    fontWeight: 900,
    fontSize: 20,
    transition: "all 0.2s",
  },
  statsDetail: {
    background: "rgba(67, 56, 202, 0.2)",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    color: "#a5b4fc",
    fontSize: 13,
    lineHeight: "1.8",
  },
  resetBtn: {
    width: "100%",
    padding: 12,
    borderRadius: 12,
    border: "2px solid #f87171",
    background: "rgba(248, 113, 113, 0.1)",
    color: "#f87171",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13,
    marginBottom: 12,
    transition: "all 0.2s",
    fontFamily: "inherit",
  },
  closeBtn: {
    width: "100%",
    padding: 12,
    borderRadius: 12,
    border: "none",
    background: "linear-gradient(135deg, #6c63ff, #a855f7)",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13,
    transition: "all 0.2s",
    fontFamily: "inherit",
  },
  gameHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  scoreBox: { display: "flex", alignItems: "center", gap: 8 },
  scoreNum: {
    fontSize: 22,
    fontWeight: 800,
    color: "#facc15",
  },
  streakBadge: {
    background: "#f97316",
    color: "#fff",
    borderRadius: 20,
    padding: "2px 10px",
    fontSize: 13,
    fontWeight: 800,
  },
  progressBar: {
    flex: 1,
    height: 10,
    background: "#1e1b4b",
    borderRadius: 10,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "linear-gradient(90deg, #6c63ff, #a855f7)",
    borderRadius: 10,
    transition: "width 0.4s",
  },
  timerCircle: {
    minWidth: 52,
    height: 36,
    borderRadius: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    fontSize: 14,
    transition: "background 0.3s, border 0.3s, color 0.3s",
    padding: "0 10px",
  },
  questionBox: {
    borderRadius: 24,
    padding: "28px 16px",
    textAlign: "center",
    marginBottom: 24,
    transition: "background 0.3s, border 0.3s",
    minHeight: 110,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  questionText: {
    fontSize: 44,
    fontWeight: 900,
    color: "#e0d7ff",
    margin: "0 0 8px",
    letterSpacing: -1,
  },
  choicesGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  choiceBtn: {
    padding: "22px 8px",
    borderRadius: 18,
    cursor: "pointer",
    color: "#e0d7ff",
    fontSize: 28,
    fontWeight: 900,
    transition: "all 0.2s",
    fontFamily: "inherit",
  },
  floatingStar: {
    position: "fixed",
    fontSize: 28,
    pointerEvents: "none",
    zIndex: 999,
    animation: "floatUp 1.2s ease-out forwards",
  },
  resultEmoji: {
    fontSize: 80,
    textAlign: "center",
    marginBottom: 8,
    animation: "bounce 0.6s ease",
  },
  resultTitle: {
    textAlign: "center",
    color: "#e0d7ff",
    fontSize: 32,
    fontWeight: 900,
    margin: "0 0 24px",
  },
  resultStats: {
    display: "flex",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  statItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
  },
  statNum: { fontSize: 28, fontWeight: 900, color: "#facc15" },
  statLabel: { fontSize: 13, color: "#a5b4fc", fontWeight: 700 },
  resultMsg: {
    textAlign: "center",
    fontSize: 18,
    color: "#c4b5fd",
    fontWeight: 700,
    marginBottom: 28,
    padding: "14px",
    background: "rgba(255,255,255,0.05)",
    borderRadius: 16,
  },
  resultBtns: { display: "flex", gap: 12 },
  replayBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    border: "none",
    background: "linear-gradient(135deg, #6c63ff, #a855f7)",
    color: "#fff",
    fontSize: 16,
    fontWeight: 800,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  homeBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    border: "2px solid #4338ca",
    background: "transparent",
    color: "#a5b4fc",
    fontSize: 16,
    fontWeight: 800,
    cursor: "pointer",
    fontFamily: "inherit",
  },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&display=swap');
  
  * { box-sizing: border-box; }
  body { margin: 0; }

  .fade-in { animation: fadeIn 0.4s ease; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }

  .bounce { animation: bounce 0.5s ease; }
  @keyframes bounce {
    0%   { transform: scale(1); }
    30%  { transform: scale(1.08); }
    60%  { transform: scale(0.96); }
    100% { transform: scale(1); }
  }

  .shake { animation: shake 0.4s ease; }
  @keyframes shake {
    0%,100% { transform: translateX(0); }
    20%      { transform: translateX(-8px); }
    40%      { transform: translateX(8px); }
    60%      { transform: translateX(-6px); }
    80%      { transform: translateX(6px); }
  }

  .float-star { animation: floatUp 1.2s ease-out forwards; }
  @keyframes floatUp {
    0%   { opacity: 1; transform: translateY(0) scale(1); }
    100% { opacity: 0; transform: translateY(-80px) scale(1.5); }
  }

  .choice-btn:hover:not(:disabled) { transform: scale(1.06); filter: brightness(1.15); }
  .choice-btn:active { transform: scale(0.97); }

  @keyframes timerPulse {
    0%,100% { transform: scale(1); }
    50%      { transform: scale(1.15); }
  }

  .modeBtn:hover { transform: scale(1.05); background: rgba(67, 56, 202, 0.4); }
  .iconBtn:hover { transform: scale(1.05); background: rgba(67, 56, 202, 0.4); }
  .resetBtn:hover { background: rgba(248, 113, 113, 0.2); }
  .closeBtn:hover { filter: brightness(1.1); }
`;