window.__initSolar = async function(){

const [econ, capByYear] = await Promise.all([
  d3.json('data/solar_econ.json'),
  d3.json('data/capacity_by_year.json')
]);

/* ===================== LCOE LINE CHART ===================== */
(function(){
  const data = econ.lcoe_usd_per_kwh;
  const w = document.getElementById('lcoeChart').clientWidth || 900, h = 420;
  const margin = {top:30, right:40, bottom:40, left:64};
  const svg = d3.select('#lcoeChart').attr('viewBox', `0 0 ${w} ${h}`);
  const iw = w - margin.left - margin.right, ih = h - margin.top - margin.bottom;
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear().domain([2010, 2024]).range([0, iw]);
  const y = d3.scaleLinear().domain([0, 0.45]).range([ih, 0]);

  // gridlines
  g.append('g').attr('class','axis')
    .attr('transform', `translate(0,${ih})`)
    .call(d3.axisBottom(x).ticks(8).tickFormat(d3.format('d')).tickSize(-ih))
    .call(g => g.selectAll('.tick line').attr('stroke-opacity', 0.15))
    .call(g => g.select('.domain').remove());

  g.append('g').attr('class','axis')
    .call(d3.axisLeft(y).ticks(5).tickFormat(d => '$' + d.toFixed(2)).tickSize(-iw))
    .call(g => g.selectAll('.tick line').attr('stroke-opacity', 0.15))
    .call(g => g.select('.domain').remove());

  const area = d3.area()
    .x(d => x(d.year))
    .y0(ih)
    .y1(d => y(d.value))
    .curve(d3.curveMonotoneX);

  const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.value))
    .curve(d3.curveMonotoneX);

  const grad = svg.append('defs').append('linearGradient')
    .attr('id', 'solarFade').attr('x1','0').attr('x2','0').attr('y1','0').attr('y2','1');
  grad.append('stop').attr('offset','0%').attr('stop-color', '#E8AA2E').attr('stop-opacity', 0.45);
  grad.append('stop').attr('offset','100%').attr('stop-color', '#E8AA2E').attr('stop-opacity', 0.02);

  g.append('path').datum(data).attr('d', area).attr('fill', 'url(#solarFade)');
  g.append('path').datum(data).attr('d', line)
    .attr('fill', 'none').attr('stroke', '#E8AA2E').attr('stroke-width', 2.5);

  g.selectAll('circle').data(data).enter().append('circle')
    .attr('cx', d => x(d.year)).attr('cy', d => y(d.value))
    .attr('r', 4.5).attr('fill', '#E8AA2E').attr('stroke', '#0E1815').attr('stroke-width', 1.5)
    .on('mousemove', (evt,d) => showTip(`<strong>${d.year}</strong><br>$${d.value.toFixed(3)} / kWh`, evt))
    .on('mouseleave', hideTip);

  // annotate first & last
  const first = data[0], last = data[data.length-1];
  g.append('text').attr('x', x(first.year)+8).attr('y', y(first.value)-14)
    .attr('font-family','IBM Plex Mono').attr('font-size', 13).attr('font-weight', 600).attr('fill','var(--ink)')
    .text(`${first.year}: $${first.value.toFixed(3)}`);
  g.append('text').attr('x', x(last.year)-8).attr('y', y(last.value)-16)
    .attr('text-anchor','end')
    .attr('font-family','IBM Plex Mono').attr('font-size', 13).attr('font-weight', 700).attr('fill','var(--ink)')
    .text(`${last.year}: $${last.value.toFixed(3)}`);
})();

/* ===================== MODULE PRICE COMPARISON ===================== */
(function(){
  const data = econ.module_price_usd_per_watt; // [{year:1976,value:106},{year:2019,value:0.38}]
  const w = document.getElementById('moduleChart').clientWidth || 900, h = 200;
  const svg = d3.select('#moduleChart').attr('viewBox', `0 0 ${w} ${h}`);

  const edgePad = 78;
  // range reversed so the larger, older value (1976 · $106/W) renders first/left,
  // and the smaller, newer value (2019 · $0.38/W) renders second/right
  const logScale = d3.scaleLog().domain([0.2, 130]).range([w-edgePad, edgePad]);
  const cy = h/2 + 6;

  // baseline
  svg.append('line').attr('x1', logScale(0.2)).attr('x2', logScale(130))
    .attr('y1', cy).attr('y2', cy).attr('stroke', 'var(--hair)').attr('stroke-width', 1);

  const rScale = d3.scaleSqrt().domain([0, 106]).range([4, 58]);

  data.forEach((d,i) => {
    const gsel = svg.append('g');
    gsel.append('circle')
      .attr('cx', logScale(d.value)).attr('cy', cy)
      .attr('r', rScale(d.value))
      .attr('fill', i===0 ? 'var(--other)' : 'var(--solar)')
      .attr('fill-opacity', 0.85);
    gsel.append('text')
      .attr('x', logScale(d.value)).attr('y', cy - rScale(d.value) - 14)
      .attr('text-anchor','middle')
      .attr('font-family', 'Space Grotesk').attr('font-weight', 700)
      .attr('font-size', 23).attr('fill', 'var(--ink)')
      .text('$' + (d.value >= 1 ? d.value : d.value.toFixed(2)) + '/W');
    gsel.append('text')
      .attr('x', logScale(d.value)).attr('y', cy + rScale(d.value) + 25)
      .attr('text-anchor','middle')
      .attr('font-family', 'IBM Plex Mono').attr('font-weight', 600)
      .attr('font-size', 13.5).attr('fill', 'var(--ink)')
      .text(d.year);
  });

  svg.append('text')
    .attr('x', (logScale(data[0].value)+logScale(data[1].value))/2)
    .attr('y', cy + 4)
    .attr('text-anchor','middle')
    .attr('font-family','IBM Plex Mono').attr('font-weight', 600)
    .attr('font-size', 12).attr('fill', 'var(--ink-soft)')
    .text('↓ 99.6% decline');
})();

/* ===================== CUMULATIVE STACKED AREA ===================== */
(function(){
  const w = document.getElementById('areaChart').clientWidth || 900, h = 460;
  const margin = {top:20, right:110, bottom:34, left:64};
  const svg = d3.select('#areaChart').attr('viewBox', `0 0 ${w} ${h}`);
  const iw = w - margin.left - margin.right, ih = h - margin.top - margin.bottom;
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear().domain(d3.extent(capByYear, d=>d.year)).range([0, iw]);
  const stackGen = d3.stack().keys(FUEL_ORDER);
  const stacked = stackGen(capByYear);
  const maxY = d3.max(stacked[stacked.length-1], d => d[1]);
  const y = d3.scaleLinear().domain([0, maxY]).range([ih, 0]);

  g.append('g').attr('class','axis')
    .attr('transform', `translate(0,${ih})`)
    .call(d3.axisBottom(x).ticks(8).tickFormat(d3.format('d')));

  g.append('g').attr('class','axis')
    .call(d3.axisLeft(y).ticks(6).tickFormat(d => fmtGW(d)));

  const areaGen = d3.area()
    .x(d => x(d.data.year))
    .y0(d => y(d[0]))
    .y1(d => y(d[1]))
    .curve(d3.curveMonotoneX);

  g.selectAll('.layer').data(stacked).enter().append('path')
    .attr('d', areaGen)
    .attr('fill', d => FUEL_COLORS[d.key])
    .attr('fill-opacity', 0.88)
    .attr('stroke', 'var(--dark)')
    .attr('stroke-width', 0.4)
    .on('mousemove', function(evt, d){
      const [mx] = d3.pointer(evt, g.node());
      const yr = Math.round(x.invert(mx));
      const rec = capByYear.find(r => r.year === yr);
      if (rec) showTip(`<strong>${d.key}</strong> · ${yr}<br>${fmtGW(rec[d.key])} cumulative`, evt);
    })
    .on('mouseleave', hideTip);

  // 2010 marker
  g.append('line')
    .attr('x1', x(2010)).attr('x2', x(2010))
    .attr('y1', 0).attr('y2', ih)
    .attr('stroke', 'var(--solar)').attr('stroke-width', 1.2).attr('stroke-dasharray', '3,3');
  g.append('text')
    .attr('x', x(2010)+7).attr('y', 16)
    .attr('font-family', 'IBM Plex Mono').attr('font-weight', 700).attr('font-size', 12.5).attr('fill', 'var(--solar)')
    .text('2010 →');
})();

const legend = d3.select('#areaLegend');
FUEL_ORDER.forEach(f => {
  const it = legend.append('div').attr('class','item');
  it.append('span').attr('class','sw').style('background', FUEL_COLORS[f]);
  it.append('span').text(f);
});

};
