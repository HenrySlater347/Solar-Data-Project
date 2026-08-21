// Shared constants & helpers across all three pages

const FUEL_COLORS = {
  Coal:    '#C15B2B',
  Gas:     '#9C6B3E',
  Oil:     '#8A5A3B',
  Nuclear: '#4A6B8A',
  Hydro:   '#3E7C93',
  Wind:    '#1D8F6D',
  Solar:   '#E8AA2E',
  Other:   '#7C8B84'
};
const FUEL_ORDER = ['Coal','Gas','Oil','Nuclear','Hydro','Wind','Solar','Other'];

const tooltip = d3.select('#tooltip');
function showTip(html, evt){
  tooltip.html(html)
    .style('left', (evt.clientX + 16) + 'px')
    .style('top', (evt.clientY + 12) + 'px')
    .style('opacity', 1);
}
function moveTip(evt){
  tooltip.style('left', (evt.clientX + 16) + 'px')
         .style('top', (evt.clientY + 12) + 'px');
}
function hideTip(){
  tooltip.style('opacity', 0);
}

function fmtMW(mw){
  if (mw >= 1e6) return (mw/1e6).toFixed(2) + 'M MW';
  if (mw >= 1e3) return (mw/1e3).toFixed(1) + 'k MW';
  return Math.round(mw) + ' MW';
}
function fmtGW(mw){
  return Math.round(mw/1000).toLocaleString() + ' GW';
}
function fmtNum(n){
  return n.toLocaleString();
}

/* ---- count-up number animation, used on hero stat blocks ---- */
function formatCounterValue(v, fmt){
  if (fmt === 'mw') return (v/1e6).toFixed(1) + 'M MW';
  return Math.round(v).toLocaleString();
}
function animateCounters(selector, duration){
  duration = duration || 1400;
  d3.selectAll(selector).each(function(){
    const el = d3.select(this);
    const target = +el.attr('data-value');
    const fmt = el.attr('data-fmt') || 'int';
    if (isNaN(target)) return;
    el.transition().duration(duration).ease(d3.easeCubicOut)
      .tween('text', function(){
        const i = d3.interpolateNumber(0, target);
        return function(t){ this.textContent = formatCounterValue(i(t), fmt); };
      });
  });
}
