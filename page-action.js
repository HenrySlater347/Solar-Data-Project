window.__initAction = async function(){

const [data, annual] = await Promise.all([
  d3.json('data/period_share.json'),
  d3.json('data/annual_additions.json')
]);

const PERIOD_YEARS = {
  '2000–09': [2000, 2009],
  '2010–19': [2010, 2019],
  '2015–19': [2015, 2019]
};

const w = document.getElementById('shareChart').clientWidth || 900, h = 280;
const margin = {top:20, right:30, bottom:34, left:110};
const svg = d3.select('#shareChart').attr('viewBox', `0 0 ${w} ${h}`);
const iw = w - margin.left - margin.right, ih = h - margin.top - margin.bottom;
const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

const y = d3.scaleBand().domain(data.map(d=>d.label)).range([0, ih]).padding(0.38);
const x = d3.scaleLinear().domain([0,100]).range([0, iw]);

// baseline gridline at 0/50/100
[0,25,50,75,100].forEach(v => {
  g.append('line').attr('x1', x(v)).attr('x2', x(v)).attr('y1', 0).attr('y2', ih)
    .attr('stroke', 'var(--hair)').attr('stroke-width', 0.6);
});

const rows = g.selectAll('.row').data(data).enter().append('g')
  .attr('transform', d => `translate(0,${y(d.label)})`);

rows.append('rect')
  .attr('x', 0).attr('width', d => x(d.fossil)).attr('height', y.bandwidth())
  .attr('fill', 'var(--fossil)').attr('fill-opacity', 0.88)
  .on('mousemove', (evt,d) => showTip(`<strong>${d.label}</strong><br>Fossil fuels: ${d.fossil}%`, evt))
  .on('mouseleave', hideTip);

rows.append('rect')
  .attr('x', d => x(d.fossil)).attr('width', d => x(d.renew)).attr('height', y.bandwidth())
  .attr('fill', 'var(--solar)').attr('fill-opacity', 0.95)
  .on('mousemove', (evt,d) => showTip(`<strong>${d.label}</strong><br>Wind + solar: ${d.renew}%`, evt))
  .on('mouseleave', hideTip);

rows.append('text')
  .attr('x', -12).attr('y', y.bandwidth()/2)
  .attr('text-anchor','end').attr('dominant-baseline','middle')
  .attr('font-family','IBM Plex Mono').attr('font-size', 13.5).attr('font-weight', 600).attr('fill', 'var(--ink)')
  .text(d => d.label);

rows.append('text')
  .attr('x', d => x(d.fossil) + x(d.renew) + 10).attr('y', y.bandwidth()/2)
  .attr('dominant-baseline','middle')
  .attr('font-family','IBM Plex Mono').attr('font-size', 13).attr('font-weight', 700).attr('fill', 'var(--ink)')
  .text(d => d.renew + '% wind + solar');

g.append('g').attr('class','axis')
  .attr('transform', `translate(0,${ih})`)
  .call(d3.axisBottom(x).ticks(5).tickFormat(d => d + '%'));

/* ---- click a row to expand the full fuel breakdown for that period ---- */
const detailPanel = document.getElementById('periodDetailPanel');
const detailLabel = d3.select('#periodDetailLabel');
let expandedLabel = null;

function fuelTotalsForPeriod(label){
  const [startYr, endYr] = PERIOD_YEARS[label] || [];
  const years = annual.filter(r => r.year >= startYr && r.year <= endYr);
  return FUEL_ORDER.map(f => ({
    fuel: f,
    value: d3.sum(years, r => r[f] || 0)
  }));
}

function renderDetail(label){
  const totals = fuelTotalsForPeriod(label);
  const grandTotal = d3.sum(totals, d => d.value);

  const dw = document.getElementById('periodDetailChart').clientWidth || 900, dh = 100;
  const dmargin = {top:10, right:10, bottom:24, left:10};
  const dsvg = d3.select('#periodDetailChart').attr('viewBox', `0 0 ${dw} ${dh}`);
  dsvg.selectAll('*').remove();
  const diw = dw - dmargin.left - dmargin.right;
  const dg = dsvg.append('g').attr('transform', `translate(${dmargin.left},${dmargin.top})`);

  const dx = d3.scaleLinear().domain([0, grandTotal]).range([0, diw]);
  let cursor = 0;
  const segs = totals.filter(d => d.value > 0);

  const bars = dg.selectAll('rect').data(segs).enter().append('rect')
    .attr('x', d => { const xp = dx(cursor); cursor += d.value; return xp; })
    .attr('y', 0).attr('height', 34)
    .attr('width', 0)
    .attr('fill', d => FUEL_COLORS[d.fuel])
    .attr('fill-opacity', 0.92)
    .on('mousemove', (evt,d) => showTip(`<strong>${d.fuel}</strong><br>${fmtGW(d.value)} added · ${((d.value/grandTotal)*100).toFixed(1)}%`, evt))
    .on('mouseleave', hideTip);

  bars.transition().duration(600).ease(d3.easeCubicOut)
    .attr('width', d => Math.max(0, dx(d.value)));

  let acc = 0;
  const segsWithCenter = segs.map(d => {
    const centerX = dx(acc) + dx(d.value) / 2;
    acc += d.value;
    return {fuel: d.fuel, value: d.value, centerX};
  }).filter(d => d.value / grandTotal > 0.04);

  dg.selectAll('text').data(segsWithCenter).enter().append('text')
    .attr('y', 34 + 18)
    .attr('x', d => d.centerX)
    .attr('text-anchor', 'middle')
    .attr('font-family', 'IBM Plex Mono').attr('font-size', 10.5).attr('font-weight', 600)
    .attr('fill', 'var(--ink-soft)')
    .attr('opacity', 0)
    .text(d => d.fuel)
    .transition().delay(500).duration(300).attr('opacity', 1);
}

rows.selectAll('rect').style('cursor', 'pointer').on('click', function(evt, d){
  if (expandedLabel === d.label) {
    expandedLabel = null;
    detailPanel.style.display = 'none';
  } else {
    expandedLabel = d.label;
    detailLabel.text(d.label);
    detailPanel.style.display = 'block';
    renderDetail(d.label);
  }
});

};
