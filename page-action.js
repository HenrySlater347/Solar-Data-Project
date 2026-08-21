window.__initAction = async function(){

const data = await d3.json('data/period_share.json');

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

};
