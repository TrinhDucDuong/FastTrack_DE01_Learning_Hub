(function(){
  const root=document.documentElement;
  const unit=String(document.body.dataset.unit||'');
  const saved=new Set(JSON.parse(localStorage.getItem('de01-progress')||'[]'));
  const button=document.getElementById('doneButton');
  const fill=document.getElementById('courseProgress');
  const meta=document.querySelector('.lesson-meta');
  if(meta&&unit){
    const quizLink=document.createElement('a');
    quizLink.className='pill quiz-pill';
    quizLink.href='../quiz.html?mode=lesson&unit='+unit;
    quizLink.textContent='Làm quiz Unit '+unit+' →';
    meta.appendChild(quizLink);
  }
  function renderProgress(){
    const done=saved.has(unit);
    button.textContent=done?'✓ Đã hoàn thành':'○ Đánh dấu đã học';
    button.classList.toggle('done',done);
    button.setAttribute('aria-pressed',String(done));
    fill.style.width=((saved.size/18)*100)+'%';
  }
  button.addEventListener('click',function(){
    if(saved.has(unit)) saved.delete(unit); else saved.add(unit);
    localStorage.setItem('de01-progress',JSON.stringify(Array.from(saved)));
    renderProgress();
  });
  const storedTheme=localStorage.getItem('de01-theme');
  if(storedTheme) root.dataset.theme=storedTheme;
  document.getElementById('theme').addEventListener('click',function(){
    root.dataset.theme=root.dataset.theme==='dark'?'light':'dark';
    localStorage.setItem('de01-theme',root.dataset.theme);
  });
  document.getElementById('print').addEventListener('click',function(){window.print()});
  const headings=Array.from(document.querySelectorAll('.content h2,.content h3'));
  const toc=document.getElementById('tocNav');
  headings.forEach(function(h,index){
    if(!h.id) h.id='section-'+(index+1);
    const a=document.createElement('a');
    a.href='#'+h.id;a.textContent=h.textContent;
    if(h.tagName==='H3') a.className='sub';
    toc.appendChild(a);
  });
  const observer=new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(!entry.isIntersecting)return;
      toc.querySelectorAll('a').forEach(function(a){a.classList.remove('active')});
      const active=toc.querySelector('[href="#'+entry.target.id+'"]');
      if(active) active.classList.add('active');
    });
  },{rootMargin:'-22% 0px -70% 0px'});
  headings.forEach(function(h){observer.observe(h)});
  renderProgress();
}());
