(function () {
  'use strict';

  const State = window.DE01ETLState;
  const stages = [
    { id:'contract', title:'Discover & Data Contract', units:[3,4,15], description:'Chốt câu hỏi business, owner, grain, key, schema, SLA, PII và chính sách schema change.', artifact:'Source inventory + data contract + source-to-target mapping', pass:'Mỗi field quan trọng có type, nullable, timezone, owner và update pattern.' },
    { id:'profile', title:'Profile dữ liệu nguồn', units:[3,6], description:'Đo volume, null, duplicate, cardinality, min/max time và referential integrity trước khi đặt rule.', artifact:'Profiling report và baseline metrics', pass:'Rule chất lượng có threshold và được suy ra từ dữ liệu hoặc yêu cầu business.' },
    { id:'model', title:'Thiết kế model đích', units:[3,5], description:'Chọn grain, fact, dimension, business key, surrogate key, SCD và cách xử lý late-arriving data.', artifact:'Star schema + data dictionary + KPI definitions', pass:'Một dòng fact được giải thích chính xác và measure không bị nhân khi join.' },
    { id:'foundation', title:'Dựng nền project', units:[1,2,16], description:'Tạo cấu trúc module, dependency, config theo môi trường, logging, test và workflow Git/PR.', artifact:'Repository chạy được bằng quick start', pass:'Không có secret trong Git; lint và unit test chạy lặp lại được.' },
    { id:'extract', title:'Extract theo contract', units:[4,6,11,12], description:'Chọn full, watermark, CDC hoặc event; ghi run_id, scope, count và chỉ commit checkpoint khi batch thành công.', artifact:'Extractor + control table/checkpoint', pass:'Timeout/retry có giới hạn; không mất record ở biên watermark.' },
    { id:'bronze', title:'Landing vào Bronze', units:[6,10,11], description:'Lưu raw gần nguyên trạng, replayable, có partition, manifest, checksum và ingestion metadata.', artifact:'Bronze dataset + batch manifest', pass:'Có thể xác định file/record thuộc run nào và replay một interval mà không cần source online.' },
    { id:'quarantine', title:'Validate & Quarantine', units:[6,11,15], description:'Tách lỗi hệ thống, schema và record; giữ raw payload, error code, reason và run_id cho dữ liệu bị loại.', artifact:'Quality gate + quarantine dataset', pass:'Bad record không biến mất và chính sách block/partial publish được ghi rõ.' },
    { id:'silver', title:'Transform Silver', units:[6,7,8], description:'Cast type, chuẩn hóa timezone/text, deduplicate, conform reference và tối ưu partition/join theo quy mô.', artifact:'Silver models + transformation tests', pass:'Logic deterministic; rerun cùng input tạo cùng output.' },
    { id:'gold', title:'Load Gold', units:[3,5,8], description:'Load dimension trước fact, áp dụng MERGE/upsert, SCD2, transaction boundary và xử lý late dimension.', artifact:'Fact/dimension + dbt lineage', pass:'Rerun cùng interval không duplicate; KPI khớp grain và định nghĩa.' },
    { id:'orchestrate', title:'Orchestrate workflow', units:[11,14], description:'Biểu diễn dependency, schedule/data interval, retry, timeout, trigger rule, catchup và backfill.', artifact:'Airflow DAG hoặc ADF pipeline', pass:'Backfill một ngày cụ thể; partial failure tiếp tục từ boundary an toàn.' },
    { id:'quality', title:'Test & Reconcile', units:[8,13,16], description:'Kết hợp schema, unique, not-null, relationship, business rules, source freshness và control totals.', artifact:'Test suite + reconciliation matrix', pass:'Source = valid + quarantine/exclusion; mọi chênh lệch có metric và lý do.' },
    { id:'operate', title:'Observe & Recover', units:[13,14], description:'Theo dõi duration, volume, freshness, rejection, lag; tạo alert, runbook, replay và incident walkthrough.', artifact:'Dashboard + alert + runbook', pass:'Tra được một run bằng run_id và phục hồi sau failure drill.' },
    { id:'govern', title:'Secure & Govern', units:[9,15], description:'Áp dụng identity, least privilege, secret management, masking PII, lineage, retention và audit.', artifact:'Access matrix + lineage + retention policy', pass:'Log không lộ PII/secret; quyền và vòng đời dữ liệu có owner.' },
    { id:'deliver', title:'CI/CD, Report & Demo', units:[1,16,17,18], description:'Tự động hóa checks, promotion và verification; ghi architecture decisions, limitation, evidence và demo script.', artifact:'CI pipeline + report + evidence pack', pass:'Một người khác setup, test, deploy, rerun và giải thích trade-off từ tài liệu.' }
  ];

  const drills = [
    { id:'duplicate', title:'Duplicate sau retry', detail:'Chứng minh batch identity + merge key giữ row count và KPI không đổi.' },
    { id:'schema', title:'Schema evolution', detail:'Source thêm nullable column; detect, validate và deploy tương thích.' },
    { id:'corrupt', title:'File/record hỏng', detail:'Quarantine payload lỗi, publish theo policy và reconciliation vẫn giải thích được.' },
    { id:'late', title:'Late-arriving data', detail:'Backfill/lookback đúng interval, dimension/fact không mất liên kết.' },
    { id:'outage', title:'Sink unavailable', detail:'Retry có giới hạn, không commit watermark sớm và recovery không duplicate.' },
    { id:'wrong-kpi', title:'Pipeline xanh, KPI sai', detail:'Trace source → Bronze → Silver → Gold bằng control total và run_id.' }
  ];

  const rubric = [
    { id:'correctness', name:'Correctness', max:25, hint:'Control totals, business rules, KPI đúng' },
    { id:'reliability', name:'Reliability & idempotency', max:20, hint:'Rerun, retry, backfill, partial failure' },
    { id:'modeling', name:'Data modeling', max:15, hint:'Grain, fact/dim, SCD, late data' },
    { id:'testing', name:'Testing & reconciliation', max:15, hint:'Test theo tầng và giải thích chênh lệch' },
    { id:'operations', name:'Operations & monitoring', max:10, hint:'Metrics, alert, runbook, recovery' },
    { id:'security', name:'Security & governance', max:5, hint:'Secret, PII, least privilege, lineage' },
    { id:'delivery', name:'Git & CI/CD', max:5, hint:'PR checks, environment, promotion' },
    { id:'documentation', name:'Documentation & demo', max:5, hint:'Quick start, decisions, evidence' }
  ];

  const coverage = [
    ['Git','Foundation, Deliver'],['Python Application','Foundation'],['SQL','Contract, Profile, Model, Gold'],['API','Contract, Extract'],
    ['Data Modeling','Model, Gold'],['Python DE','Profile, Extract, Bronze, Quarantine, Silver'],['Spark','Silver'],['dbt','Silver, Gold, Quality'],
    ['Azure Fundamentals','Govern'],['Azure Storage','Bronze'],['Azure Batch','Extract, Bronze, Quarantine, Orchestrate'],['Streaming','Extract'],
    ['Monitoring','Quality, Operate'],['Airflow','Orchestrate, Operate'],['Governance','Contract, Quarantine, Govern'],['DataOps','Foundation, Quality, Deliver'],
    ['Capstone','Deliver'],['Final Review','Deliver']
  ];

  let state = State.load(localStorage);
  const stageList = document.getElementById('stageList');
  const drillList = document.getElementById('drillList');
  const rubricList = document.getElementById('rubricList');
  const maxima = Object.fromEntries(rubric.map(function (item) { return [item.id, item.max]; }));

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, function (char) { return ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'})[char]; });
  }

  function renderStages() {
    const done = new Set(state.completedStages);
    stageList.innerHTML = stages.map(function (item, index) {
      const unitTags = item.units.map(function (unit) { return '<a class="unit-tag" href="lessons/unit-' + String(unit).padStart(2,'0') + '.html">Unit ' + unit + '</a>'; }).join('');
      return '<article class="stage-card"><span class="stage-check"><input type="checkbox" data-stage="' + item.id + '" aria-label="Hoàn thành ' + escapeHtml(item.title) + '" ' + (done.has(item.id) ? 'checked' : '') + '></span><div><div class="stage-top"><h3 class="stage-title"><span class="stage-num">' + String(index + 1).padStart(2,'0') + '</span>' + escapeHtml(item.title) + '</h3><span class="unit-tags">' + unitTags + '</span></div><p class="stage-description">' + escapeHtml(item.description) + '</p><div class="evidence"><div><b>Artifact</b>' + escapeHtml(item.artifact) + '</div><div><b>Gate để qua bước</b>' + escapeHtml(item.pass) + '</div></div></div></article>';
    }).join('');
  }

  function renderDrills() {
    const done = new Set(state.completedDrills);
    drillList.innerHTML = drills.map(function (item) {
      return '<label class="drill"><input type="checkbox" data-drill="' + item.id + '" ' + (done.has(item.id) ? 'checked' : '') + '><span><strong>' + escapeHtml(item.title) + '</strong><span>' + escapeHtml(item.detail) + '</span></span></label>';
    }).join('');
  }

  function renderRubric() {
    rubricList.innerHTML = rubric.map(function (item) {
      const score = Math.min(Number(state.rubric[item.id]) || 0, item.max);
      return '<div class="rubric-row"><label for="rubric-' + item.id + '">' + escapeHtml(item.name) + '<small>' + escapeHtml(item.hint) + '</small></label><input id="rubric-' + item.id + '" type="range" min="0" max="' + item.max + '" step="1" value="' + score + '" data-rubric="' + item.id + '"><output class="score-output" for="rubric-' + item.id + '">' + score + '/' + item.max + '</output></div>';
    }).join('');
  }

  function renderCoverage() {
    document.getElementById('coverageBody').innerHTML = coverage.map(function (item, index) {
      return '<tr><td><a href="lessons/unit-' + String(index + 1).padStart(2,'0') + '.html">Unit ' + (index + 1) + '</a></td><td>' + escapeHtml(item[0]) + '</td><td>' + escapeHtml(item[1]) + '</td></tr>';
    }).join('');
  }

  function recommendation() {
    const p = state.profile;
    const source = { database:'Database', files:'CSV / JSON / Parquet', api:'REST API', events:'Event stream' }[p.source] || 'Source';
    const extract = { full:'Full snapshot + batch manifest', incremental:'Watermark + lookback', cdc:'CDC + ordered change log', stream:'Consumer group + checkpoint' }[p.mode] || 'Incremental';
    const process = { small:'Python / SQL', medium:'dbt + SQL; Spark khi đo thấy cần', large:'Spark / distributed processing' }[p.scale] || 'Python / SQL';
    const target = { database:'Operational/serving database', warehouse:'Warehouse + star schema', lakehouse:'Bronze → Silver → Gold', files:'Partitioned Parquet' }[p.target] || 'Target';
    const orchestration = p.scale === 'small' ? 'Airflow local hoặc scheduler đơn giản' : 'Airflow hoặc ADF với monitoring';
    document.getElementById('route').innerHTML = [source, extract, process, target].map(function (value, index) { return (index ? '<i>→</i>' : '') + '<span>' + escapeHtml(value) + '</span>'; }).join('');
    document.getElementById('recommendationList').innerHTML = '<li><strong>Extract:</strong> ' + escapeHtml(extract) + '.</li><li><strong>Transform:</strong> ' + escapeHtml(process) + '; chỉ nâng engine sau khi đo bottleneck.</li><li><strong>Orchestrate:</strong> ' + escapeHtml(orchestration) + '.</li><li><strong>Definition of Done:</strong> rerun không trùng, reconciliation giải thích được và có failure drill.</li>';
  }

  function scoreMessage(score) {
    if (score >= 85) return 'Sẵn sàng demo DE01: tập trung hoàn thiện evidence và trả lời trade-off.';
    if (score >= 70) return 'Đạt nền tảng tốt: xử lý các hạng mục reliability/test còn thiếu trước khi demo.';
    if (score >= 50) return 'Pipeline đã thành hình nhưng chưa đủ bằng chứng production-style.';
    return 'Tiếp tục theo thứ tự stage; ưu tiên correctness trước khi thêm công nghệ.';
  }

  function renderSummary() {
    const progress = State.completion(state, stages.length, drills.length);
    document.getElementById('progressFill').style.width = progress.stagePercent + '%';
    document.getElementById('progressTrack').setAttribute('aria-valuenow', String(progress.stages));
    document.getElementById('progressNumber').textContent = progress.stages + '/' + stages.length;
    document.getElementById('progressCopy').textContent = progress.stagePercent + '% stage · ' + progress.drills + '/' + drills.length + ' failure drill';
    const score = State.rubricTotal(state, maxima);
    document.getElementById('scoreTotal').textContent = score + '/100';
    document.getElementById('scoreMessage').textContent = scoreMessage(score);
    const updated = document.getElementById('updatedAt');
    updated.textContent = state.updatedAt ? 'Lưu gần nhất: ' + new Date(state.updatedAt).toLocaleString('vi-VN') : 'Tiến độ được lưu cục bộ trên trình duyệt này.';
  }

  function persist() {
    state = State.save(state, localStorage);
    renderSummary();
  }

  ['source','target','mode','scale'].forEach(function (field) {
    const input = document.getElementById(field);
    input.value = state.profile[field];
    input.addEventListener('change', function () {
      state.profile[field] = input.value;
      persist();
      recommendation();
    });
  });

  stageList.addEventListener('change', function (event) {
    if (!event.target.matches('[data-stage]')) return;
    state = State.toggle(state, 'completedStages', event.target.dataset.stage);
    persist();
  });
  drillList.addEventListener('change', function (event) {
    if (!event.target.matches('[data-drill]')) return;
    state = State.toggle(state, 'completedDrills', event.target.dataset.drill);
    persist();
  });
  rubricList.addEventListener('input', function (event) {
    if (!event.target.matches('[data-rubric]')) return;
    state.rubric[event.target.dataset.rubric] = Number(event.target.value);
    event.target.nextElementSibling.textContent = event.target.value + '/' + event.target.max;
    persist();
  });

  document.getElementById('reset').addEventListener('click', function () {
    if (!window.confirm('Xóa toàn bộ tiến độ ETL Pipeline Coach trên trình duyệt này?')) return;
    localStorage.removeItem(State.key);
    state = State.emptyState();
    ['source','target','mode','scale'].forEach(function (field) { document.getElementById(field).value = state.profile[field]; });
    renderStages(); renderDrills(); renderRubric(); recommendation(); renderSummary();
  });
  document.getElementById('print').addEventListener('click', function () { window.print(); });
  const root = document.documentElement;
  const storedTheme = localStorage.getItem('de01-theme');
  if (storedTheme) root.dataset.theme = storedTheme;
  document.getElementById('theme').addEventListener('click', function () {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('de01-theme', root.dataset.theme);
  });

  renderStages(); renderDrills(); renderRubric(); renderCoverage(); recommendation(); renderSummary();
}());
