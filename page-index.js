window.__initGrid = async function(){

const [land, mapData, fuelMix, countries] = await Promise.all([
  d3.json('data/land-110m.json'),
  d3.json('data/plants_map.json'),
  d3.json('data/fuel_mix.json'),
  d3.json('data/top_countries.json')
]);

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

/* ===================== TOP COUNTRIES (stacked horizontal) ===================== */
(function(){
  const w = document.getElementById('countryChart').clientWidth || 900, h = 640;
  const margin = {top:10, right:60, bottom:10, left:150};
  const svg = d3.select('#countryChart').attr('viewBox', `0 0 ${w} ${h}`);
  const iw = w - margin.left - margin.right, ih = h - margin.top - margin.bottom;
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const stackGen = d3.stack().keys(FUEL_ORDER);
  const stacked = stackGen(countries);

  const y = d3.scaleBand().domain(countries.map(d=>d.country)).range([0, ih]).padding(0.28);
  const x = d3.scaleLinear().domain([0, d3.max(countries, d=>d.total_mw)]).range([0, iw]);

  stacked.forEach(layer => {
    g.selectAll(`.layer-${layer.key}`)
      .data(layer)
      .enter().append('rect')
      .attr('y', d => y(d.data.country))
      .attr('x', d => x(d[0]))
      .attr('width', d => Math.max(0, x(d[1]) - x(d[0])))
      .attr('height', y.bandwidth())
      .attr('fill', FUEL_COLORS[layer.key])
      .attr('fill-opacity', 0.92)
      .on('mousemove', (evt,d) => {
        const val = d.data[layer.key];
        showTip(`<strong>${d.data.country}</strong> — ${layer.key}<br>${fmtGW(val)}`, evt);
      })
      .on('mouseleave', hideTip);
  });

  g.selectAll('.clbl').data(countries).enter().append('text')
    .attr('y', d => y(d.country) + y.bandwidth()/2)
    .attr('x', -10)
    .attr('text-anchor', 'end')
    .attr('dominant-baseline', 'middle')
    .attr('font-family', 'IBM Plex Mono')
    .attr('font-size', 12).attr('font-weight', 600)
    .attr('fill', 'var(--paper-on-dark)')
    .text(d => d.country);

  g.selectAll('.ctot').data(countries).enter().append('text')
    .attr('y', d => y(d.country) + y.bandwidth()/2)
    .attr('x', d => x(d.total_mw) + 8)
    .attr('dominant-baseline', 'middle')
    .attr('font-family', 'IBM Plex Mono')
    .attr('font-size', 11).attr('font-weight', 600)
    .attr('fill', 'var(--paper-on-dark)')
    .text(d => fmtGW(d.total_mw));
})();

const legend2 = d3.select('#countryLegend');
FUEL_ORDER.forEach(f => {
  const it = legend2.append('div').attr('class','item');
  it.append('span').attr('class','sw').style('background', FUEL_COLORS[f]);
  it.append('span').text(f);
});

};
