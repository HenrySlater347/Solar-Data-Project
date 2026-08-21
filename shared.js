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
