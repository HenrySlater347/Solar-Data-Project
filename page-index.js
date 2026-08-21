window.__initGrid = async function(){

const [land, mapData, fuelMix, countries] = await Promise.all([
  d3.json('data/land-110m.json'),
  d3.json('data/plants_map.json'),
  d3.json('data/fuel_mix.json'),
  d3.json('data/top_countries.json')
]);

/* ===================== HERO DOT-GRID BUILD-UP ===================== */
(function(){
  const el = document.getElementById('heroViz');
  if (!el) return;
  const w = el.clientWidth || 900, h = 150;
  const svg = d3.select('#heroViz').attr('viewBox', `0 0 ${w} ${h}`);

  const totalDots = 360;
  const totalCount = d3.sum(fuelMix, d => d.count);
  let dotList = [];
  fuelMix.forEach(f => {
    const n = Math.max(1, Math.round(totalDots * f.count / totalCount));
    for (let i = 0; i < n; i++) dotList.push(f.fuel);
  });
  dotList = dotList.slice(0, totalDots);
  while (dotList.length < totalDots) dotList.push('Other');
  for (let i = dotList.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [dotList[i], dotList[j]] = [dotList[j], dotList[i]];
  }

  const cols = 36;
  const rows = Math.ceil(totalDots / cols);
  const cellW = w / cols, cellH = h / rows;
  const rTarget = Math.min(cellW, cellH) * 0.28;

  const dots = svg.selectAll('circle').data(dotList).enter().append('circle')
    .attr('class', 'hero-dot')
    .attr('cx', (d, i) => (i % cols + 0.5) * cellW)
    .attr('cy', (d, i) => (Math.floor(i / cols) + 0.5) * cellH)
    .attr('r', 0)
    .attr('fill', d => FUEL_COLORS[d])
    .attr('opacity', 0)
    .on('mousemove', (evt, d) => showTip(`<strong>${d}</strong><br>one of ${fmtNum(fuelMix.find(f=>f.fuel===d).count)} ${d.toLowerCase()} plants`, evt))
    .on('mouseleave', hideTip);

  dots.transition()
    .delay((d, i) => i * 4)
    .duration(500)
    .ease(d3.easeBackOut.overshoot(1.6))
    .attr('r', rTarget)
    .attr('opacity', 0.88);

  function pulse(){
    dots.transition().duration(1900).ease(d3.easeSinInOut)
      .attr('opacity', 0.5)
      .transition().duration(1900).ease(d3.easeSinInOut)
      .attr('opacity', 0.88)
      .on('end', function(d, i){ if (i === 0) pulse(); });
  }
  setTimeout(pulse, totalDots * 4 + 600);

  animateCounters('#heroStats .num', 1700);
})();

/* ===================== WORLD GRID MAP ===================== */
const mapW = 975, mapH = 500;
const svgMap = d3.select('#mapSvg').attr('viewBox', `0 0 ${mapW} ${mapH}`);
const projection = d3.geoNaturalEarth1().scale(155).translate([mapW/2, mapH/2 + 10]);
const path = d3.geoPath(projection);

const landFeature = topojson.feature(land, land.objects.land);
svgMap.append('path')
  .datum(landFeature)
  .attr('d', path)
  .attr('fill', '#DDE6E0')
  .attr('stroke', '#C4D2CA')
  .attr('stroke-width', 0.6);

const sqrtScale = d3.scaleSqrt()
  .domain([0, d3.max(mapData, d => d.cap)])
  .range([0.6, 15]);

const dotLayer = svgMap.append('g');

let activeFuels = new Set(FUEL_ORDER);

function drawDots(){
  const filtered = mapData.filter(d => activeFuels.has(d.fuel));
  // sort so smaller dots render on top of larger, and shuffle overlap a bit by fuel priority
  filtered.sort((a,b) => b.cap - a.cap);

  const sel = dotLayer.selectAll('circle').data(filtered, d => d.lat+','+d.lon+','+d.fuel);
  sel.exit().remove();
  sel.enter().append('circle')
      .attr('cx', d => projection([d.lon, d.lat])[0])
      .attr('cy', d => projection([d.lon, d.lat])[1])
      .attr('fill', d => FUEL_COLORS[d.fuel])
      .attr('fill-opacity', 0.72)
      .attr('stroke', d => FUEL_COLORS[d.fuel])
      .attr('stroke-opacity', 0.9)
      .attr('stroke-width', 0.4)
    .merge(sel)
      .attr('r', d => sqrtScale(d.cap))
      .on('mousemove', (evt,d) => {
        showTip(`<strong>${d.fuel}</strong><br>${fmtMW(d.cap)} across ${d.n} plant${d.n>1?'s':''}<br><span style="opacity:.6">grid cell ${d.lat}°, ${d.lon}°</span>`, evt);
      })
      .on('mouseleave', hideTip);

  const totalCap = d3.sum(filtered, d => d.cap);
  const totalN = d3.sum(filtered, d => d.n);
  d3.select('#mapCount').text(`Showing ${fmtNum(totalN)} plants · ${fmtGW(totalCap)}`);
}

/* fuel chips */
const chipRow = d3.select('#fuelChips');
FUEL_ORDER.forEach(f => {
  const chip = chipRow.append('div').attr('class','chip').attr('data-fuel', f)
    .on('click', function(){
      if (activeFuels.has(f)) { activeFuels.delete(f); d3.select(this).classed('off', true); }
      else { activeFuels.add(f); d3.select(this).classed('off', false); }
      drawDots();
    });
  chip.append('span').attr('class','swatch').style('background', FUEL_COLORS[f]);
  chip.append('span').text(f);
});
drawDots();

/* map legend */
const legend = d3.select('#mapLegend');
FUEL_ORDER.forEach(f => {
  const it = legend.append('div').attr('class','item');
  it.append('span').attr('class','sw').style('background', FUEL_COLORS[f]);
  it.append('span').text(f);
});

/* ===================== FUEL MIX (capacity) ===================== */
(function(){
  const data = fuelMix.slice().sort((a,b) => b.capacity_mw - a.capacity_mw);
  const w = document.getElementById('mixChart').clientWidth || 480, h = 340;
  const margin = {top:10, right:70, bottom:30, left:70};
  const svg = d3.select('#mixChart').attr('viewBox', `0 0 ${w} ${h}`);
  const iw = w - margin.left - margin.right, ih = h - margin.top - margin.bottom;
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const y = d3.scaleBand().domain(data.map(d=>d.fuel)).range([0, ih]).padding(0.32);
  const x = d3.scaleLinear().domain([0, d3.max(data,d=>d.capacity_mw)]).range([0, iw]);

  g.selectAll('rect').data(data).enter().append('rect')
    .attr('y', d => y(d.fuel))
    .attr('x', 0)
    .attr('height', y.bandwidth())
    .attr('width', d => x(d.capacity_mw))
    .attr('fill', d => FUEL_COLORS[d.fuel])
    .attr('rx', 2)
    .on('mousemove', (evt,d) => showTip(`<strong>${d.fuel}</strong><br>${fmtGW(d.capacity_mw)} installed<br>${fmtNum(d.count)} plants`, evt))
    .on('mouseleave', hideTip);

  g.selectAll('.lbl').data(data).enter().append('text')
    .attr('y', d => y(d.fuel) + y.bandwidth()/2)
    .attr('x', -8)
    .attr('text-anchor', 'end')
    .attr('dominant-baseline', 'middle')
    .attr('font-family', 'IBM Plex Mono')
    .attr('font-size', 12).attr('font-weight', 600)
    .attr('fill', 'var(--ink)')
    .text(d => d.fuel);

  g.selectAll('.val').data(data).enter().append('text')
    .attr('y', d => y(d.fuel) + y.bandwidth()/2)
    .attr('x', d => x(d.capacity_mw) + 8)
    .attr('dominant-baseline', 'middle')
    .attr('font-family', 'IBM Plex Mono')
    .attr('font-size', 11.5).attr('font-weight', 600)
    .attr('fill', 'var(--ink)')
    .text(d => fmtGW(d.capacity_mw));
})();

/* ===================== PLANT COUNT (by fuel) ===================== */
(function(){
  const data = fuelMix.slice().sort((a,b) => b.count - a.count);
  const w = document.getElementById('countChart').clientWidth || 480, h = 220;
  const margin = {top:6, right:14, bottom:26, left:70};
  const svg = d3.select('#countChart').attr('viewBox', `0 0 ${w} ${h}`);
  const iw = w - margin.left - margin.right, ih = h - margin.top - margin.bottom;
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const y = d3.scaleBand().domain(data.map(d=>d.fuel)).range([0, ih]).padding(0.28);
  const x = d3.scaleLinear().domain([0, d3.max(data,d=>d.count)]).range([0, iw]);

  g.selectAll('rect').data(data).enter().append('rect')
    .attr('y', d => y(d.fuel))
    .attr('x', 0)
    .attr('height', y.bandwidth())
    .attr('width', d => x(d.count))
    .attr('fill', d => FUEL_COLORS[d.fuel])
    .attr('fill-opacity', 0.85)
    .attr('rx', 2)
    .on('mousemove', (evt,d) => showTip(`<strong>${d.fuel}</strong><br>${fmtNum(d.count)} plants`, evt))
    .on('mouseleave', hideTip);

  g.selectAll('.lbl').data(data).enter().append('text')
    .attr('y', d => y(d.fuel) + y.bandwidth()/2)
    .attr('x', -8)
    .attr('text-anchor', 'end')
    .attr('dominant-baseline', 'middle')
    .attr('font-family', 'IBM Plex Mono')
    .attr('font-size', 11.5).attr('font-weight', 600)
    .attr('fill', 'var(--ink)')
    .text(d => d.fuel);

  g.selectAll('.val').data(data).enter().append('text')
    .attr('y', d => y(d.fuel) + y.bandwidth()/2)
    .attr('x', d => x(d.count) + 8)
    .attr('dominant-baseline', 'middle')
    .attr('font-family', 'IBM Plex Mono')
    .attr('font-size', 11).attr('font-weight', 600)
    .attr('fill', 'var(--ink)')
    .text(d => fmtNum(d.count));
})();

/* ===================== TOP COUNTRIES (stacked horizontal, sortable + click-to-pin) ===================== */
(function(){
  const w = document.getElementById('countryChart').clientWidth || 900, h = 640;
  const margin = {top:10, right:60, bottom:10, left:150};
  const svg = d3.select('#countryChart').attr('viewBox', `0 0 ${w} ${h}`);
  const iw = w - margin.left - margin.right, ih = h - margin.top - margin.bottom;
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
  const pinNote = d3.select('#countryPinNote');

  const x = d3.scaleLinear().domain([0, d3.max(countries, d=>d.total_mw)]).range([0, iw]);
  const y = d3.scaleBand().domain(countries.map(d=>d.country)).range([0, ih]).padding(0.28);

  let sortKey = 'total_mw';
  let pinned = null;

  function currentOrder(){
    return countries.slice().sort((a,b) => b[sortKey] - a[sortKey]).map(d => d.country);
  }
  y.domain(currentOrder());

  function opacityFor(country){
    if (!pinned) return 0.92;
    return country === pinned ? 0.97 : 0.16;
  }

  function render(){
    const stackGen = d3.stack().keys(FUEL_ORDER);
    const stacked = stackGen(countries);

    FUEL_ORDER.forEach(key => {
      const layerData = stacked.find(l => l.key === key);
      const sel = g.selectAll(`.layer-${key}`).data(layerData, d => d.data.country);

      sel.enter().append('rect')
          .attr('class', `layer-${key}`)
          .attr('x', d => x(d[0]))
          .attr('width', d => Math.max(0, x(d[1]) - x(d[0])))
          .attr('height', y.bandwidth())
          .attr('fill', FUEL_COLORS[key])
          .style('cursor', 'pointer')
          .attr('y', d => y(d.data.country))
          .attr('fill-opacity', d => opacityFor(d.data.country))
        .on('mousemove', (evt,d) => {
          const val = d.data[key];
          showTip(`<strong>${d.data.country}</strong> — ${key}<br>${fmtGW(val)}`, evt);
        })
        .on('mouseleave', hideTip)
        .on('click', (evt,d) => togglePin(d.data.country))
        .merge(sel)
        .transition().duration(650).ease(d3.easeCubicInOut)
          .attr('y', d => y(d.data.country))
          .attr('x', d => x(d[0]))
          .attr('width', d => Math.max(0, x(d[1]) - x(d[0])))
          .attr('height', y.bandwidth())
          .attr('fill-opacity', d => opacityFor(d.data.country));
    });

    const clbl = g.selectAll('.clbl').data(countries, d=>d.country);
    clbl.enter().append('text')
        .attr('class', 'clbl')
        .attr('x', -10)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('font-family', 'IBM Plex Mono')
        .attr('font-size', 12).attr('font-weight', 600)
        .attr('fill', 'var(--paper-on-dark)')
        .style('cursor', 'pointer')
        .attr('y', d => y(d.country) + y.bandwidth()/2)
        .text(d => d.country)
        .on('click', (evt,d) => togglePin(d.country))
      .merge(clbl)
      .transition().duration(650).ease(d3.easeCubicInOut)
        .attr('y', d => y(d.country) + y.bandwidth()/2)
        .style('opacity', d => pinned && d.country !== pinned ? 0.4 : 1);

    const ctot = g.selectAll('.ctot').data(countries, d=>d.country);
    ctot.enter().append('text')
        .attr('class', 'ctot')
        .attr('text-anchor', 'start')
        .attr('dominant-baseline', 'middle')
        .attr('font-family', 'IBM Plex Mono')
        .attr('font-size', 11).attr('font-weight', 600)
        .attr('fill', 'var(--paper-on-dark)')
        .attr('y', d => y(d.country) + y.bandwidth()/2)
        .attr('x', d => x(d.total_mw) + 8)
        .text(d => fmtGW(d.total_mw))
      .merge(ctot)
      .transition().duration(650).ease(d3.easeCubicInOut)
        .attr('y', d => y(d.country) + y.bandwidth()/2)
        .attr('x', d => x(d.total_mw) + 8)
        .style('opacity', d => pinned && d.country !== pinned ? 0.4 : 1);
  }

  function togglePin(country){
    pinned = (pinned === country) ? null : country;
    if (pinned){
      const rec = countries.find(c => c.country === pinned);
      const solarShare = ((rec.Solar / rec.total_mw) * 100).toFixed(1);
      const fossil = rec.Coal + rec.Gas + rec.Oil;
      const fossilShare = ((fossil / rec.total_mw) * 100).toFixed(1);
      pinNote.html(`<strong>${rec.country}</strong> — ${fmtGW(rec.total_mw)} total · ${solarShare}% solar · ${fossilShare}% fossil fuels. Click again to clear.`)
        .style('opacity', 1);
    } else {
      pinNote.style('opacity', 0);
    }
    render();
  }

  d3.selectAll('.country-sort').on('click', function(){
    sortKey = d3.select(this).attr('data-sort');
    d3.selectAll('.country-sort').classed('active', false);
    d3.select(this).classed('active', true);
    y.domain(currentOrder());
    render();
  });

  render();
})();

const legend2 = d3.select('#countryLegend');
FUEL_ORDER.forEach(f => {
  const it = legend2.append('div').attr('class','item');
  it.append('span').attr('class','sw').style('background', FUEL_COLORS[f]);
  it.append('span').text(f);
});

};
