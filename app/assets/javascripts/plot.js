function draw_plot(url, parameter_set_base_url) {

  var margin = {top: 10, right: 100, bottom: 100, left: 100},
    width = 560;
    height = 460;

  var row = d3.select("#plot").insert("div","div").attr("class", "row");
  var plot_region = row.append("div").attr("class", "span8");
  var description = row.append("div").attr("class", "span4");

  var svg = plot_region.insert("svg")
    .attr({
      "width": width + margin.left + margin.right,
      "height": height + margin.top + margin.bottom
    })
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  function show_spin_arc() {
    var progress = svg.append("g")
      .attr("transform", "translate(" + width/2 + "," + height/2 + ")")
      .attr("id", "progress-spin");
    var radius = Math.min(width, height) / 2;
    var arc = d3.svg.arc()
      .innerRadius(radius*0.5)
      .outerRadius(radius*0.9)
      .startAngle(0);
    progress.append("path")
      .datum({endAngle: 0.66*Math.PI})
      .style("fill", "#4D4D4D")
      .attr("d", arc)
      .call(spin, 1500);
    progress.append("text")
      .style({
        "text-anchor": "middle",
        "font-size": radius*0.1
      })
      .text("LOADING");

    function spin(selection, duration) {
      selection.transition()
        .ease("linear")
        .duration(duration)
        .attrTween("transform", function() {
          return d3.interpolateString("rotate(0)", "rotate(360)");
        });
      setTimeout( function() { spin(selection, duration); }, duration);
    };
    return progress;
  }

  var progress = show_spin_arc();

  d3.json(url, function(dat) {
    progress.remove();

    var xScale = d3.scale.linear().range([0, width]);
    var yScale = d3.scale.linear().range([height, 0]);

    xScale.domain([
      d3.min( dat.data, function(r) { return d3.min(r, function(v) { return v[0];})}),
      d3.max( dat.data, function(r) { return d3.max(r, function(v) { return v[0];})})
    ]).nice();
    yScale.domain([
      d3.min( dat.data, function(r) { return d3.min(r, function(v) { return v[1] - v[2];}) }),
      d3.max( dat.data, function(r) { return d3.max(r, function(v) { return v[1] + v[2];}) })
    ]).nice();

    // X-Axis
    var xAxis = d3.svg.axis()
      .scale(xScale)
      .orient("bottom");
    svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis)
      .append("text")
        .style("text-anchor", "middle")
        .attr("x", width / 2.0)
        .attr("y", 50.0)
        .text(dat.xlabel);

    // Y-Axis
    var yAxis = d3.svg.axis()
      .scale(yScale)
      .orient("left");
    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
      .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height/2)
        .attr("y", -50.0)
        .style("text-anchor", "middle")
        .text(dat.ylabel);

    // group for each series
    var series = svg
      .selectAll(".series")
      .data(dat.data)
      .enter().append("g")
        .attr("class", "series");

    // draw line plot
    var colorScale = d3.scale.category10();
    var line = d3.svg.line()
      .x( function(d) { return xScale(d[0]);} )
      .y( function(d) { return yScale(d[1]);} );
    series.append("path")
      .attr("class", "line")
      .attr("d", function(d) { return line(d);} )
      .style({
        "stroke": function(d, i) { return colorScale(i);},
        "fill": "none",
        "stroke-width": "1.5px"
      });

    // draw circles
    var tooltip = d3.select("#plot-tooltip");
    var point = series.selectAll("circle")
      .data(function(d,i) {
        return d.map(function(v) {
          return {
            x: v[0], y: v[1], yerror: v[2],
            series_index: i, series_value: dat.series_values[i], psid: v[3]
          };
        });
      }).enter();
    point.append("circle")
      .attr("cx", function(d) { return xScale(d.x);})
      .attr("cy", function(d) { return yScale(d.y);})
      .style("fill", function(d) { return colorScale(d.series_index);})
      .attr("r", 3)
      .on("mouseover", function(d) {
        tooltip.transition()
          .duration(200)
          .style("opacity", .8);
        tooltip.html(
          dat.xlabel + " : " + d.x + "<br/>" +
          dat.ylabel + " : " + Math.round(d.y*1000000)/1000000 +
          " (" + Math.round(d.yerror*1000000)/1000000 + ")<br/>" +
          (dat.series ? (dat.series + " : " + d.series_value + "<br/>") : "") +
          "ID: " + d.psid);
      })
      .on("mousemove", function() {
        tooltip
          .style("top", (d3.event.pageY-10) + "px")
          .style("left", (d3.event.pageX+10) + "px");
      })
      .on("mouseout", function() {
        tooltip.transition()
          .duration(300)
          .style("opacity", 0);
      })
      .on("dblclick", function(d) {
        // open a link in a background window
        window.open(parameter_set_base_url + d.psid, '_blank');
      });

    // draw error bar
    point.insert("line", "circle")
      .filter(function(d) { return d.yerror;})
      .attr({
        x1: function(d) { return xScale(d.x);},
        x2: function(d) { return xScale(d.x);},
        y1: function(d) { return yScale(d.y - d.yerror);},
        y2: function(d) { return yScale(d.y + d.yerror);},
        stroke: function(d) { return colorScale(d.series_index); }
      });
    point.insert("line", "circle")
      .filter(function(d) { return d.yerror;})
      .attr({
        x1: function(d) { return xScale(d.x) - 3;},
        x2: function(d) { return xScale(d.x) + 3;},
        y1: function(d) { return yScale(d.y - d.yerror);},
        y2: function(d) { return yScale(d.y - d.yerror);},
        stroke: function(d) { return colorScale(d.series_index); }
      });
    point.insert("line", "circle")
      .filter(function(d) { return d.yerror;})
      .attr({
        x1: function(d) { return xScale(d.x) - 3;},
        x2: function(d) { return xScale(d.x) + 3;},
        y1: function(d) { return yScale(d.y + d.yerror);},
        y2: function(d) { return yScale(d.y + d.yerror);},
        stroke: function(d) { return colorScale(d.series_index); }
      });

    // draw legend title
    svg.append("text")
      .attr({
        x: width,
        y: 0,
        dx: ".8em",
        dy: ".8em"
      })
      .text(dat.series);

    // draw legend
    var legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", "translate(" + width + "," + 20 + ")");
    var legendItem = legend.selectAll("g")
      .data(dat.series_values)
      .enter().append("g")
      .attr("class", "legend-item")
      .attr("transform", function(d,i) {
        return "translate(10," + (i*20) + ")";
      });
    legendItem.append("rect")
      .attr("width", 15)
      .attr("height", 15)
      .style("fill", function(d,i) { return colorScale(i);});
    legendItem.append("text")
      .attr("x", 20)
      .attr("y", 7.5)
      .attr("dy", "0.3em")
      .text( function(d,i) { return d; });

    // description for the specification of the plot
    var dl = description.append("dl");
    dl.append("dt").text("X-Axis");
    dl.append("dd").text(dat.xlabel);
    dl.append("dt").text("Y-Axis");
    dl.append("dd").text(dat.ylabel);
    if(dat.series) {
      dl.append("dt").text("Series");
      dl.append("dd").text(dat.series);
    }
    description.append("a").attr({target: "_blank", href: url}).text("show data");
    description.append("br");
    description.append("a").text("delete plot").on("click", function() {
      row.remove();
    });
  });
}
