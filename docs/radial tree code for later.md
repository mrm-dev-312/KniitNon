* radial tree viewof radialTree = {
  const root = tree(d3.hierarchy(treeData));
  const linkWidth = d3
    .scaleLinear()
    .domain([root.height, 0])
    .range([1, 7]);

  const svg = d3
    .create("svg")
    .style("max-width", `${targetWidth}px`)
    .attr("font-size", 14)
    .attr("font-family", "var(--sans-serif)");
  const element = svg.node();
  element.value = [];
  const g = svg.append("g").on("mouseleave", () => update(null));

  g.append("circle")
    .attr("r", radius)
    .attr("fill", "white");

  const linksGroup = g
    .append("g")
    .attr("fill", "none")
    .selectAll("g")
    .data(root.links())
    .join("g")
    .on("mouseenter", (event, d) => update(d.target));

  const links = linksGroup
    .append("path")
    .attr(
      "d",
      d3
        .linkRadial()
        .angle(d => d.x)
        .radius(d => d.y)
    )
    .attr("stroke-width", d => linkWidth(d.target.depth))
    .attr("stroke-opacity", d => strokeOpacity(d.target.data.pruned, false))
    .attr("stroke", d => partyColor(d.target.data));

  links
    .clone(true)
    .lower()
    .attr("stroke-opacity", 0)
    .attr("stroke-width", d => linkWidth(d.target.depth) + 10);

  const circlesGroup = g
    .append("g")
    .selectAll("g")
    .data(root.descendants())
    .join("g")
    .attr(
      "transform",
      d => `
        rotate(${(d.x * 180) / Math.PI - 90})
        translate(${d.y},0)
      `
    )
    .on("mouseenter", (event, d) => update(d));

  const circles = circlesGroup
    .append("circle")
    .attr("stroke", d => partyColor(d.data))
    .attr("stroke-opacity", d => strokeOpacity(d.data.pruned, winner(d.data)))
    .attr("stroke-width", 1.5)
    .attr("fill", d => (winner(d.data) ? partyColor(d.data) : "white"))
    .attr("fill-opacity", d => (d.data.pruned && !d.children ? 0.1 : 1))
    .attr("r", d => (d.data.votes ? circleSize(d.data.votes) : 16));

  circles
    .clone(true)
    .lower()
    .attr("stroke-opacity", 0)
    .attr("fill-opacity", 0)
    .attr("r", d => (d.data.votes ? circleSize(d.data.votes) * 2 : 0));

  const labelGroup = g
    .append("g")
    .attr("pointer-events", "none")
    .selectAll("g")
    .data(root.descendants())
    .join("g")
    .attr(
      "transform",
      d =>
        `translate(${Math.cos(d.x - Math.PI / 2) *
          (d.children ? d.y : d.y + 10)},${Math.sin(d.x - Math.PI / 2) *
          (d.children ? d.y : d.y + 10)})`
    )
    .attr("visibility", "hidden");

  const labels = labelGroup
    .append("text")
    .attr("dy", d =>
      !d.children ? `${Math.cos(d.x) * -0.4 + 0.31}em` : "0.31em"
    )
    .attr("dx", d => {
      const dx = circleSize(d.data.votes) + 4;
      return !d.children ? 0 : d.x < Math.PI === !d.children ? dx : -dx;
    })
    .attr("text-anchor", d => (d.x < Math.PI === !d.children ? "start" : "end"))
    .attr("fill", d => partyColor(d.data))
    .attr("font-weight", d => (winner(d.data) ? "bold" : "normal"))
    .text(d =>
      winner(d.data) ? stateLabel(d.data) + " ✓" : stateLabel(d.data)
    );

  labels
    .clone(true)
    .lower()
    .attr("stroke-linejoin", "round")
    .attr("stroke-width", 3)
    .attr("stroke", "white");

  g.append("text")
    .attr("font-size", 12)
    .attr("text-anchor", "middle")
    .attr("fill", "#888")
    .attr("dy", "0.31em")
    .text("Start");

  function update(d) {
    if (d && d.data && d.data.pruned) return;
    const sequence = d ? d.ancestors().map(d => d.data) : [];
    links.attr("stroke-opacity", link =>
      strokeOpacity(
        link.target.data.pruned,
        sequence.indexOf(link.target.data) >= 0
      )
    );
    circles.attr("stroke-opacity", node =>
      strokeOpacity(
        node.data.pruned,
        sequence.indexOf(node.data) >= 0 || winner(node.data)
      )
    );
    labelGroup.attr("visibility", node =>
      sequence.indexOf(node.data) >= 0 ? null : "hidden"
    );
    element.value = sequence.reverse().slice(1);
    element.dispatchEvent(new CustomEvent("input"));
  } 