(function () {
  'use strict';
  const storage = window.DE01QuizStorage;
  const stats = storage.statistics();
  const history = storage.getHistory();
  const summary = document.getElementById('summaryCards');
  const root = document.documentElement;

  const cards = [
    ['Lượt làm bài', stats.attempts],
    ['Điểm trung bình', stats.averageScore + '%'],
    ['Độ chính xác', stats.answerAccuracy + '%'],
    ['Lượt đạt ≥70%', stats.passedAttempts]
  ];
  summary.innerHTML = cards.map(function (card) {
    return '<article class="stat-card"><strong>' + card[1] + '</strong><span>' + card[0] + '</span></article>';
  }).join('');

  const unitStats = document.getElementById('unitStats');
  for (let unit = 1; unit <= 18; unit += 1) {
    const item = stats.units[String(unit)] || { attempted: 0, correct: 0, accuracy: 0 };
    unitStats.insertAdjacentHTML('beforeend', '<div class="unit-row"><b>Unit ' + String(unit).padStart(2, '0') + '</b><div class="bar"><i style="width:' + item.accuracy + '%"></i></div><span>' + item.accuracy + '% · ' + item.correct + '/' + item.attempted + '</span></div>');
  }

  const weak = document.getElementById('weakTopics');
  weak.innerHTML = stats.weakTopics.length ? stats.weakTopics.map(function (item) {
    return '<article class="weak-card"><b>' + item.key.replace(/-/g, ' ') + '</b><span>' + item.accuracy + '% · ' + item.correct + '/' + item.attempted + ' câu đúng</span></article>';
  }).join('') : '<div class="empty-state">Chưa có topic yếu đủ dữ liệu. Hãy làm thêm quiz để hệ thống đánh giá.</div>';

  const list = document.getElementById('historyList');
  list.innerHTML = history.length ? history.map(function (attempt) {
    const incorrect = attempt.items.filter(function (item) { return !item.correct; }).length;
    const label = attempt.mode === 'exam' ? 'Full-course exam · ' + attempt.total + ' câu' : attempt.mode === 'retry' ? 'Retry câu sai' : 'Quiz Unit ' + String(attempt.unit).padStart(2, '0');
    const retry = incorrect ? '<a href="quiz.html?mode=retry&attempt=' + encodeURIComponent(attempt.id) + '">Làm lại ' + incorrect + ' câu sai →</a>' : '<span>Không có câu sai</span>';
    return '<article class="history-item"><div><b>' + label + '</b><span>' + new Date(attempt.submittedAt).toLocaleString('vi-VN') + '</span></div><strong>' + attempt.percentage + '%</strong>' + retry + '</article>';
  }).join('') : '<div class="empty-state">Chưa có kết quả. Hãy làm quiz ở một lesson hoặc thi thử toàn khóa.</div>';

  const storedTheme = localStorage.getItem('de01-theme');
  if (storedTheme) root.dataset.theme = storedTheme;
  document.getElementById('theme').addEventListener('click', function () {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('de01-theme', root.dataset.theme);
  });
}());
