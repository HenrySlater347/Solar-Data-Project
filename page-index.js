window.__initGrid = async function(){

const [land, mapData, fuelMix, countries, capByYear] = await Promise.all([
  d3.json('data/land-110m.json'),
  d3.json('data/plants_map.json'),
  d3.json('data/fuel_mix.json'),
  d3.json('data/top_countries.json'),
  d3.json('data/capacity_by_year.json')
]);

/* ===================== HERO: TIME-LAPSE GRID COMPOSITION, 1950 -> 2020, LOOPING ===================== */
(function(){
  const el = document.getElementById('heroViz');
  if (!el) return;
  const w = el.clientWidth || 900, h = 220;
  const barH = 70;
  const barY = (h - barH) / 2 - 6;

  const svg = d3.select('#heroViz').attr('viewBox', `0 0 ${w} ${h}`);

  const keyframeYears = [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];
  const stackGen = d3.stack().keys(FUEL_ORDER);

  function frameFor(year){
    const rec = capByYear.find(r => r.year === year);
    const total = FUEL_ORDER.reduce((s,f) => s + rec[f], 0);
    const stacked = stackGen([rec]);
    return stacked.map(layer => ({
      fuel: layer.key,
      x0: layer[0][0] / total * w,
      x1: layer[0][1] / total * w
    }));
  }

  const firstFrame = frameFor(keyframeYears[0]);

  const bars = svg.selectAll('rect').data(firstFrame, d => d.fuel).enter().append('rect')
    .attr('y', barY).attr('height', barH)
    .attr('x', d => d.x0)
    .attr('width', d => Math.max(0, d.x1 - d.x0))
    .attr('fill', d => FUEL_COLORS[d.fuel])
    .on('mousemove', (evt,d) => showTip(`<strong>${d.fuel}</strong>`, evt))
    .on('mouseleave', hideTip);

  const yearLabel = svg.append('text')
    .attr('x', w/2).attr('y', barY - 16)
    .attr('text-anchor','middle')
    .attr('font-family','Space Grotesk').attr('font-weight',700)
    .attr('font-size', 30).attr('fill','var(--ink)')
    .text(keyframeYears[0]);

  svg.append('text')
    .attr('x', w/2).attr('y', barY + barH + 26)
    .attr('text-anchor','middle')
    .attr('font-family','IBM Plex Mono').attr('font-size', 11).attr('fill','var(--ink-soft)')
    .text('World installed generating capacity, by fuel — watch it evolve, on repeat');

  function clearFinalLabels(){
    svg.selectAll('.finalLbl').remove();
  }

  function showFinalLabels(){
    const finalFrame = frameFor(2020);
    svg.selectAll('.finalLbl').data(finalFrame.filter(d => (d.x1 - d.x0) > 30)).enter().append('text')
      .attr('class', 'finalLbl')
      .attr('x', d => (d.x0 + d.x1) / 2)
      .attr('y', barY + barH/2 + 4)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'IBM Plex Mono').attr('font-weight', 700).attr('font-size', 10.5)
      .attr('fill', d => d.fuel === 'Solar' ? 'var(--ink)' : '#fff')
      .attr('opacity', 0)
      .text(d => d.fuel)
      .transition().duration(400).attr('opacity', 1);

    bars.filter(d => d.fuel === 'Solar')
      .transition().delay(150).duration(450).ease(d3.easeSinInOut)
      .attr('y', barY - 5).attr('height', barH + 10)
      .transition().duration(450)
      .attr('y', barY).attr('height', barH);
  }

  let idx = 0;

  function stepForward(){
    idx++;

    if (idx >= keyframeYears.length){
      // reached 2020 — hold on the final frame with labels, then rewind and loop forever
      showFinalLabels();
      setTimeout(() => {
        clearFinalLabels();
        idx = 0;
        const frame = frameFor(keyframeYears[0]);
        yearLabel.transition().duration(500).style('opacity', 0.3)
          .on('end', function(){ yearLabel.text(keyframeYears[0]).transition().duration(400).style('opacity', 1); });
        bars.data(frame, d => d.fuel)
          .transition().duration(700).ease(d3.easeCubicInOut)
          .attr('x', d => d.x0)
          .attr('width', d => Math.max(0, d.x1 - d.x0))
          .attr('y', barY).attr('height', barH)
          .on('end', function(d,i){ if (i === 0) setTimeout(stepForward, 900); });
      }, 2200);
      return;
    }

    const yr = keyframeYears[idx];
    const frame = frameFor(yr);
    yearLabel.transition().duration(280).style('opacity', 0.35)
      .on('end', function(){ yearLabel.text(yr).transition().duration(280).style('opacity', 1); });

    bars.data(frame, d => d.fuel)
      .transition().duration(850).ease(d3.easeCubicInOut)
      .attr('x', d => d.x0)
      .attr('width', d => Math.max(0, d.x1 - d.x0))
      .on('end', function(d,i){ if (i === 0) setTimeout(stepForward, 250); });
  }
  setTimeout(stepForward, 850);

  animateCounters('#heroStats .num', 1700);
})();

/* ===================== WORLD GRID MAP ===================== */
const mapW = 975, mapH = 500;
const svgMap = d3.select('#mapSvg').attr('viewBox', `0 0 ${mapW} ${mapH}`);
const projection = d3.geoNaturalEarth1().scale(155).translate([mapW/2, mapH/2 + 10]);
const path = d3.geoPath(projection);

const landFeature = topojson.feature(land, land.objects.land);
const zoomG = svgMap.append('g').attr('class', 'zoomLayer');
zoomG.append('path')
  .datum(landFeature)
  .attr('d', path)
  .attr('fill', '#DDE6E0')
  .attr('stroke', '#C4D2CA')
  .attr('stroke-width', 0.6);

const sqrtScale = d3.scaleSqrt()
  .domain([0, d3.max(mapData, d => d.cap)])
  .range([0.6, 15]);

const dotLayer = zoomG.append('g');

const mapZoom = d3.zoom()
  .scaleExtent([1, 8])
  .translateExtent([[0, 0], [mapW, mapH]])
  .on('zoom', (evt) => {
    zoomG.attr('transform', evt.transform);
    dotLayer.selectAll('circle').attr('stroke-width', 0.4 / evt.transform.k);
  });
svgMap.call(mapZoom).style('cursor', 'grab');

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
        showTip(`<strong>${d.fuel}</strong><br>${fmtMW(d.cap)} across ${d.n} plant${d.n>1?'s':''}<br><span style="opacity:.6">Grid cell ${d.lat}°, ${d.lon}°</span>`, evt);
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

/* ===================== FUEL COUNT vs CAPACITY SCATTER ===================== */
(function(){
  const data = fuelMix;
  const totalCap = d3.sum(data, d => d.capacity_mw);
  const totalN = d3.sum(data, d => d.count);
  const w = document.getElementById('fuelScatter').clientWidth || 900, h = 420;
  const margin = {top:24, right:40, bottom:50, left:70};
  const svg = d3.select('#fuelScatter').attr('viewBox', `0 0 ${w} ${h}`);
  const iw = w - margin.left - margin.right, ih = h - margin.top - margin.bottom;
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const rScale = d3.scaleSqrt().domain([0, d3.max(data, d=>d.capacity_mw)]).range([14, 58]);
  const x = d3.scaleLog().domain([150, 12000]).range([0, iw]);
  const y = d3.scaleLog().domain([50000, 2200000]).range([ih, 0]);

  g.append('g').attr('class','axis')
    .attr('transform', `translate(0,${ih})`)
    .call(d3.axisBottom(x).ticks(5, '~s').tickSize(-ih))
    .call(gg => gg.selectAll('.tick line').attr('stroke-opacity', 0.12))
    .call(gg => gg.select('.domain').remove());

  g.append('g').attr('class','axis')
    .call(d3.axisLeft(y).ticks(5, '~s').tickSize(-iw))
    .call(gg => gg.selectAll('.tick line').attr('stroke-opacity', 0.12))
    .call(gg => gg.select('.domain').remove());

  g.append('text').attr('x', iw/2).attr('y', ih + 40)
    .attr('text-anchor','middle').attr('font-family','IBM Plex Mono').attr('font-size',11).attr('fill','var(--ink-soft)')
    .text('Number of plants (log scale) →');
  g.append('text').attr('transform', 'rotate(-90)').attr('x', -ih/2).attr('y', -52)
    .attr('text-anchor','middle').attr('font-family','IBM Plex Mono').attr('font-size',11).attr('fill','var(--ink-soft)')
    .text('Total installed capacity, MW (log scale) →');

  const detailNote = d3.select('#fuelDetailNote');
  let selected = null;

  const nodes = g.selectAll('.fuelNode').data(data).enter().append('g')
    .attr('class','fuelNode')
    .attr('transform', d => {
      const r = rScale(d.capacity_mw);
      const cx = Math.max(r, Math.min(iw - r, x(d.count)));
      const cy = Math.max(r, Math.min(ih - r, y(d.capacity_mw)));
      return `translate(${cx},${cy})`;
    })
    .style('cursor','pointer');

  nodes.append('circle')
    .attr('r', 0)
    .attr('fill', d => FUEL_COLORS[d.fuel])
    .attr('fill-opacity', 0.82)
    .attr('stroke', 'var(--panel)')
    .attr('stroke-width', 1.5)
    .on('mousemove', (evt,d) => showTip(`<strong>${d.fuel}</strong><br>${fmtNum(d.count)} plants · ${fmtGW(d.capacity_mw)}<br>Avg ${Math.round(d.capacity_mw/d.count)} MW/plant`, evt))
    .on('mouseleave', hideTip)
    .transition().delay((d,i)=>i*80).duration(500).ease(d3.easeBackOut.overshoot(1.4))
    .attr('r', d => rScale(d.capacity_mw));

  nodes.append('text')
    .attr('text-anchor','middle').attr('dominant-baseline','middle')
    .attr('font-family','IBM Plex Mono').attr('font-weight',700)
    .attr('font-size', d => Math.max(9, rScale(d.capacity_mw)*0.3))
    .attr('fill', d => (d.fuel==='Solar' ? 'var(--ink)' : '#fff'))
    .style('pointer-events','none')
    .attr('opacity', 0)
    .text(d => d.fuel)
    .transition().delay((d,i)=>i*80+300).duration(300).attr('opacity',1);

  nodes.on('click', function(evt, d){
    selected = (selected === d.fuel) ? null : d.fuel;
    nodes.select('circle').transition().duration(300)
      .attr('fill-opacity', dd => !selected || dd.fuel===selected ? 0.9 : 0.22)
      .attr('stroke-width', dd => dd.fuel===selected ? 3 : 1.5);
    if (selected){
      const capShare = ((d.capacity_mw/totalCap)*100).toFixed(1);
      const countShare = ((d.count/totalN)*100).toFixed(1);
      detailNote.html(`<strong>${d.fuel}</strong> — ${fmtGW(d.capacity_mw)} (${capShare}% of world capacity) across ${fmtNum(d.count)} plants (${countShare}% of all plants tracked). Average size: ${Math.round(d.capacity_mw/d.count)} MW. Click again to clear.`)
        .style('opacity',1);
    } else {
      detailNote.style('opacity',0);
    }
  });

  // idle breathing pulse, keeps the chart alive after the entrance animation settles
  function idlePulse(){
    nodes.select('circle').transition().duration(1700 + Math.random()*400).ease(d3.easeSinInOut)
      .attr('r', d => rScale(d.capacity_mw) * 1.055)
      .transition().duration(1700 + Math.random()*400).ease(d3.easeSinInOut)
      .attr('r', d => rScale(d.capacity_mw))
      .on('end', function(d, i){ if (i === 0 && !selected) idlePulse(); else if (i === 0) setTimeout(idlePulse, 1800); });
  }
  setTimeout(idlePulse, 1300);
})();

/* ===================== TOP COUNTRIES (stacked horizontal, sortable + click-to-pin) ===================== */
(function(){
  const w = document.getElementById('countryChart').clientWidth || 900, h = 640;
  const margin = {top:10, right:60, bottom:10, left:150};
  const svg = d3.select('#countryChart').attr('viewBox', `0 0 ${w} ${h}`);
  const iw = w - margin.left - margin.right, ih = h - margin.top - margin.bottom;
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
  const detailPanel = document.getElementById('countryDetailPanel');
  const detailLabel = d3.select('#countryDetailLabel');

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

  function renderCountryDetail(country){
    const rec = countries.find(c => c.country === country);
    const total = rec.total_mw;
    const segs = FUEL_ORDER.map(f => ({fuel: f, value: rec[f] || 0})).filter(d => d.value > 0);

    const dw = document.getElementById('countryDetailChart').clientWidth || 900, dh = 100;
    const dsvg = d3.select('#countryDetailChart').attr('viewBox', `0 0 ${dw} ${dh}`);
    dsvg.selectAll('*').remove();
    const dg = dsvg.append('g').attr('transform', 'translate(0,10)');

    const dx = d3.scaleLinear().domain([0, total]).range([0, dw]);
    let cursor = 0;
    const bars = dg.selectAll('rect').data(segs).enter().append('rect')
      .attr('x', d => { const xp = dx(cursor); cursor += d.value; return xp; })
      .attr('y', 0).attr('height', 34)
      .attr('width', 0)
      .attr('fill', d => FUEL_COLORS[d.fuel])
      .attr('fill-opacity', 0.92)
      .on('mousemove', (evt,d) => showTip(`<strong>${d.fuel}</strong><br>${fmtGW(d.value)} · ${((d.value/total)*100).toFixed(1)}%`, evt))
      .on('mouseleave', hideTip);

    bars.transition().duration(600).ease(d3.easeCubicOut)
      .attr('width', d => Math.max(0, dx(d.value)));

    let acc = 0;
    const withCenter = segs.map(d => {
      const centerX = dx(acc) + dx(d.value)/2;
      acc += d.value;
      return {...d, centerX};
    }).filter(d => d.value/total > 0.05);

    dg.selectAll('text').data(withCenter).enter().append('text')
      .attr('x', d => d.centerX).attr('y', 34 + 18)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'IBM Plex Mono').attr('font-size', 10.5).attr('font-weight', 600)
      .attr('fill', 'var(--soft-on-dark)')
      .attr('opacity', 0)
      .text(d => d.fuel)
      .transition().delay(500).duration(300).attr('opacity', 1);
  }

  function togglePin(country){
    pinned = (pinned === country) ? null : country;
    if (pinned){
      detailLabel.text(pinned);
      detailPanel.style.display = 'block';
      renderCountryDetail(pinned);
    } else {
      detailPanel.style.display = 'none';
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
