(function () {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  const requestedMode = params.get('mode');
  const mode = ['lesson', 'exam', 'retry'].includes(requestedMode) ? requestedMode : 'setup';
  const unit = Number(params.get('unit'));
  const examCount = Math.max(1, Math.min(Math.floor(Number(params.get('count')) || 40), 360));
  const sourceAttemptId = params.get('attempt');
  const forceRestart = params.get('restart') === '1';
  const loader = window.DE01QuestionLoader;
  const engine = window.DE01QuizEngine;
  const storage = window.DE01QuizStorage;
  const root = document.documentElement;
  let questions = [];
  let attempt = null;
  let result = null;

  const els = {
    setup: document.getElementById('quizSetup'),
    topTitle: document.getElementById('topTitle'), modeLabel: document.getElementById('modeLabel'),
    title: document.getElementById('quizTitle'), description: document.getElementById('quizDescription'),
    meta: document.getElementById('quizMeta'), quizView: document.getElementById('quizView'),
    palette: document.getElementById('questionPalette'), counter: document.getElementById('questionCounter'),
    topic: document.getElementById('questionTopic'), prompt: document.getElementById('questionPrompt'),
    choices: document.getElementById('choices'), previous: document.getElementById('previous'),
    next: document.getElementById('next'), submit: document.getElementById('submit'),
    validation: document.getElementById('validation'), resultView: document.getElementById('resultView'),
    scoreRing: document.getElementById('scoreRing'), scorePercent: document.getElementById('scorePercent'),
    scoreFraction: document.getElementById('scoreFraction'), resultTitle: document.getElementById('resultTitle'),
    resultMessage: document.getElementById('resultMessage'), reviewButton: document.getElementById('reviewButton'),
    reviewList: document.getElementById('reviewList'), restartLink: document.getElementById('restartLink'),
    retryIncorrect: document.getElementById('retryIncorrect'), errorView: document.getElementById('errorView'),
    errorMessage: document.getElementById('errorMessage')
  };

  function fail(message) {
    els.setup.hidden = true;
    els.quizView.hidden = true;
    document.getElementById('quizIntro').hidden = true;
    els.errorMessage.textContent = message;
    els.errorView.hidden = false;
  }

  function persistAttempt() {
    try { storage.saveActive(attempt); } catch (error) {
      els.validation.textContent = 'Trình duyệt không thể lưu tiến trình. Bạn vẫn có thể tiếp tục lượt làm bài này.';
    }
  }

  function currentQuestion() { return questions[attempt.currentIndex]; }
  function choiceText(question, id) {
    const choice = question.choices.find(function (item) { return item.id === id; });
    return choice ? choice.text : 'Chưa trả lời';
  }

  function moveTo(index) {
    engine.moveTo(attempt, index);
    persistAttempt();
    renderQuestion();
  }

  function renderPalette() {
    els.palette.innerHTML = '';
    questions.forEach(function (question, index) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = index + 1;
      button.classList.toggle('current', index === attempt.currentIndex);
      button.classList.toggle('has-answer', Boolean(attempt.answers[question.id]));
      button.setAttribute('aria-label', 'Đi đến câu ' + (index + 1));
      button.addEventListener('click', function () { moveTo(index); });
      els.palette.appendChild(button);
    });
  }

  function renderQuestion() {
    const question = currentQuestion();
    els.counter.textContent = 'Câu ' + (attempt.currentIndex + 1) + ' / ' + questions.length;
    els.topic.textContent = 'Unit ' + String(question.unit).padStart(2, '0') + ' · ' + question.topic.replace(/-/g, ' ');
    els.prompt.textContent = question.prompt;
    els.choices.innerHTML = '<legend class="sr-only">Chọn một đáp án</legend>';
    question.choices.forEach(function (choice) {
      const label = document.createElement('label');
      label.className = 'choice';
      const input = document.createElement('input');
      input.type = 'radio'; input.name = 'answer'; input.value = choice.id;
      input.checked = attempt.answers[question.id] === choice.id;
      input.addEventListener('change', function () {
        engine.answerQuestion(attempt, question.id, choice.id);
        els.validation.textContent = '';
        persistAttempt();
        renderPalette();
      });
      const key = document.createElement('span'); key.className = 'choice-key'; key.textContent = choice.id.toUpperCase() + '.';
      const text = document.createElement('span'); text.textContent = choice.text;
      label.append(input, key, text); els.choices.appendChild(label);
    });
    els.previous.disabled = attempt.currentIndex === 0;
    els.next.disabled = attempt.currentIndex === questions.length - 1;
    els.submit.textContent = engine.isComplete(attempt) ? 'Nộp bài' : 'Nộp bài · còn ' + engine.unansweredIds(attempt).length + ' câu';
    renderPalette();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderReview() {
    els.reviewList.innerHTML = '<h2>Review từng câu</h2>';
    result.items.forEach(function (item, index) {
      const question = questions.find(function (candidate) { return candidate.id === item.questionId; });
      const article = document.createElement('article');
      article.className = 'review-item ' + (item.correct ? 'correct' : 'incorrect');
      article.innerHTML = '<h3>Câu ' + (index + 1) + ': ' + question.prompt + '</h3>' +
        '<p class="answer">Bạn chọn: ' + choiceText(question, item.selected) + '</p>' +
        '<p class="answer">Đáp án đúng: ' + choiceText(question, item.correctChoice) + '</p>' +
        '<p class="explanation">' + question.explanation + '</p>' +
        '<a href="' + question.lessonUrl + '">Ôn lại phần kiến thức →</a>';
      els.reviewList.appendChild(article);
    });
  }

  function showResult() {
    result = engine.submitAttempt(attempt, questions);
    document.getElementById('quizIntro').hidden = true;
    els.quizView.hidden = true; els.resultView.hidden = false;
    els.scorePercent.textContent = result.percentage + '%';
    els.scoreFraction.textContent = result.correct + '/' + result.total + ' câu đúng';
    els.scoreRing.classList.add(result.passed ? 'pass' : 'fail');
    els.resultTitle.textContent = result.passed ? 'Đạt mục tiêu' : 'Cần ôn thêm';
    els.resultMessage.textContent = result.passed ? 'Bạn đã đạt ngưỡng 70%. Hãy review cả câu đúng để củng cố lý do.' : 'Hãy xem phần giải thích, ôn lại lesson rồi thử lại.';
    try { storage.recordResult(attempt, result); } catch (error) {
      els.resultMessage.textContent += ' Trình duyệt không thể lưu kết quả này.';
    }
    const restartParams = new URLSearchParams(window.location.search);
    restartParams.set('restart', '1');
    els.restartLink.href = 'quiz.html?' + restartParams.toString();
    const incorrect = result.items.filter(function (item) { return !item.correct; });
    if (incorrect.length) {
      els.retryIncorrect.hidden = false;
      els.retryIncorrect.href = 'quiz.html?mode=retry&attempt=' + encodeURIComponent(attempt.id);
      els.retryIncorrect.textContent = 'Làm lại ' + incorrect.length + ' câu sai';
    }
    renderReview();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  els.previous.addEventListener('click', function () { moveTo(attempt.currentIndex - 1); });
  els.next.addEventListener('click', function () { moveTo(attempt.currentIndex + 1); });
  els.submit.addEventListener('click', function () {
    const missing = engine.unansweredIds(attempt);
    if (missing.length) {
      els.validation.textContent = 'Bạn còn ' + missing.length + ' câu chưa trả lời. Các câu đó chưa được tô màu trong danh sách.';
      return;
    }
    showResult();
  });
  els.reviewButton.addEventListener('click', function () {
    els.reviewList.hidden = !els.reviewList.hidden;
    els.reviewButton.textContent = els.reviewList.hidden ? 'Xem lại đáp án' : 'Ẩn phần review';
  });

  const storedTheme = localStorage.getItem('de01-theme');
  if (storedTheme) root.dataset.theme = storedTheme;
  document.getElementById('theme').addEventListener('click', function () {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('de01-theme', root.dataset.theme);
  });

  const validation = loader.validateBank();
  if (!validation.valid) { fail('Ngân hàng câu hỏi không hợp lệ: ' + validation.errors[0]); return; }
  if (mode === 'setup') {
    const lessonTitles = [
      'Git & collaboration', 'Python for Data Engineering', 'SQL & relational database', 'API & FastAPI',
      'Data Warehouse & dimensional modeling', 'Python pipeline engineering', 'Apache Spark', 'dbt & analytics engineering',
      'Azure fundamentals', 'Cloud storage & data lake', 'Batch pipeline & Azure Data Factory', 'Streaming & Event Hubs',
      'Observability & incident response', 'Apache Airflow', 'Governance & security', 'DataOps & CI/CD',
      'Capstone implementation', 'Review, report & technical defense'
    ];
    const lessonSelect = document.getElementById('lessonUnit');
    lessonTitles.forEach(function (title, index) {
      const option = document.createElement('option');
      option.value = index + 1;
      option.textContent = 'Unit ' + String(index + 1).padStart(2, '0') + ' · ' + title;
      lessonSelect.appendChild(option);
    });
    document.getElementById('quizIntro').hidden = true;
    els.setup.hidden = false;
    els.topTitle.textContent = 'Chế độ kiểm tra';
    return;
  }
  if (mode === 'lesson' && (!Number.isInteger(unit) || unit < 1 || unit > 18)) { fail('Unit không hợp lệ.'); return; }
  if (mode === 'retry' && !sourceAttemptId) { fail('Không tìm thấy lượt làm bài cần ôn lại.'); return; }

  if (mode === 'retry') {
    const sourceAttempt = storage.findHistory(sourceAttemptId);
    if (!sourceAttempt) { fail('Lượt làm bài cũ không còn trong lịch sử trình duyệt này.'); return; }
    const incorrectIds = sourceAttempt.items.filter(function (item) { return !item.correct; }).map(function (item) { return item.questionId; });
    questions = loader.byIds(incorrectIds);
    if (!questions.length) { fail('Lượt làm bài này không có câu sai để làm lại.'); return; }
  } else {
    questions = mode === 'exam' ? loader.forExam({ count: examCount }) : loader.forLesson(unit);
  }
  if (!questions.length) { fail('Chưa có câu hỏi cho bài học này.'); return; }

  if (forceRestart) storage.clearActive();
  const active = storage.getActive();
  const sameContext = active && !active.submittedAt && active.mode === mode &&
    (mode !== 'lesson' || active.unit === unit) &&
    (mode !== 'exam' || active.questionIds.length === examCount) &&
    (mode !== 'retry' || active.sourceAttemptId === sourceAttemptId);
  if (sameContext) {
    const restoredQuestions = loader.byIds(active.questionIds);
    if (restoredQuestions.length === active.questionIds.length) {
      attempt = active;
      questions = restoredQuestions;
      els.validation.textContent = 'Đã khôi phục tiến trình làm bài gần nhất trên trình duyệt này.';
    }
  }
  if (!attempt) {
    attempt = engine.createAttempt({ mode: mode, unit: mode === 'lesson' ? unit : null, sourceAttemptId: sourceAttemptId }, questions);
    persistAttempt();
  }

  const labels = { exam: 'Full-course exam', lesson: 'Lesson quiz', retry: 'Retry incorrect' };
  const titles = {
    exam: 'Bài thi tổng hợp DE01',
    lesson: 'Quiz Unit ' + String(unit).padStart(2, '0'),
    retry: 'Ôn lại các câu trả lời sai'
  };
  const descriptions = {
    exam: examCount + ' câu được lấy ngẫu nhiên từ ngân hàng toàn khóa. Hoàn thành toàn bộ trước khi nộp bài.',
    lesson: 'Toàn bộ câu hỏi của unit này, bao phủ từ khái niệm đến tình huống ứng dụng.',
    retry: 'Tập trung vào các câu chưa đúng trong lượt làm bài đã chọn.'
  };
  els.modeLabel.textContent = labels[mode]; els.title.textContent = titles[mode]; els.topTitle.textContent = titles[mode];
  els.description.textContent = descriptions[mode];
  els.meta.innerHTML = '<span>' + questions.length + ' câu hỏi</span><span>Đạt từ 70%</span><span>Tự động lưu tiến trình</span>';
  els.quizView.hidden = false;
  renderQuestion();
}());
