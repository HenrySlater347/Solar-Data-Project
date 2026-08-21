(function(){

const TABS = ['grid', 'solar', 'action'];
const initialized = {grid:false, solar:false, action:false};
const initFns = {
  grid:   () => window.__initGrid && window.__initGrid(),
  solar:  () => window.__initSolar && window.__initSolar(),
  action: () => window.__initAction && window.__initAction()
};

function showTab(name, opts){
  opts = opts || {};
  if (!TABS.includes(name)) name = 'grid';

  TABS.forEach(t => {
    const panel = document.getElementById('tab-' + t);
    if (panel) panel.hidden = (t !== name);
  });

  document.querySelectorAll('.tabbtn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === name);
  });

  if (!initialized[name]) {
    initialized[name] = true;
    Promise.resolve(initFns[name]()).catch(err => console.error('Tab init error:', name, err));
  }

  if (location.hash.replace('#','') !== name) {
    history.replaceState(null, '', '#' + name);
  }

  if (!opts.skipScroll) {
    window.scrollTo({top: 0, behavior: 'smooth'});
  }
}

document.querySelectorAll('.tabbtn').forEach(btn => {
  btn.addEventListener('click', () => showTab(btn.dataset.tab));
});

window.addEventListener('hashchange', () => {
  showTab(location.hash.replace('#',''), {skipScroll:true});
});

const startTab = TABS.includes(location.hash.replace('#','')) ? location.hash.replace('#','') : 'grid';
showTab(startTab, {skipScroll:true});

})();
