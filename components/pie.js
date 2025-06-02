class PieChart {
    constructor(id) {
        this.id = id;
        this.width = 500;
        this.height = 800;
        this.config = {
            margin: { top: 40, right: 40, bottom: 40, left: 40 },
            innerRadius: 0,
            outerRadius: 180,
            labelRadius: 220
        };
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;
    }

    initialize() {
        console.log("Pie: initialize");
        this.createSVG();
        this.createTooltip();
        this.setupPieGenerator();
        this.setupArcGenerator();
    }

    createSVG() {
        const container = d3.select(this.id);
        this.svg = container
            .append("svg")
            .attr("width", this.width)
            .attr("height", this.height)
            .attr("preserveAspectRatio", "xMidYMid meet");
        
        this.chartGroup = this.svg.append("g")
            .attr("transform", `translate(${this.centerX}, ${this.centerY})`);
    }

    createTooltip() {
        this.tooltip = d3.select("body").append("div")
            .attr("class", "pie-tooltip")
            .style("position", "absolute")
            .style("background", "rgba(0, 0, 0, 0.8)")
            .style("color", "white")
            .style("padding", "10px 10px")
            .style("border-radius", "10px")
            .style("font-size", "13px")
            .style("font-family", "Arial")
            .style("z-index", "1000")
            .style("box-shadow", "0 2px 8px rgba(0,0,0,0.8)")
            .style("white-space", "pre-line")
            .style("opacity", 0)
            .style("pointer-events", "none");
    }

    setupPieGenerator() {
        this.pie = d3.pie()
            .value(d => d.count)
            .sort((a, b) => b.count - a.count);
    }

    setupArcGenerator() {
        this.arc = d3.arc()
            .innerRadius(this.config.innerRadius)
            .outerRadius(this.config.outerRadius);

        this.labelArc = d3.arc()
            .innerRadius(this.config.labelRadius)
            .outerRadius(this.config.labelRadius);
    }

    processData(data) {
        const ratCounts = {};
        
        data.forEach(d => {
            if (d.context && d.context.rat) {
                const rat = d.context.rat.trim();
                ratCounts[rat] = (ratCounts[rat] || 0) + 1;
            }
        });

        const pieData = Object.entries(ratCounts).map(([rat, count]) => ({
            rat,
            count,
            percentage: 0
        }));

        pieData.sort((a, b) => b.count - a.count);
        const total = pieData.reduce((sum, d) => sum + d.count, 0);
        pieData.forEach(d => {
            d.percentage = ((d.count / total) * 100).toFixed(1);
        });
        return { pieData, total };
    }

    createColorScale(data) {
        const colors = d3.schemeSet3;
        return d3.scaleOrdinal()
            .domain(data.map(d => d.rat))
            .range(colors);
    }

    createPieSlices(pieData, colorScale) {
        const arcs = this.chartGroup.selectAll(".pie-slice")
            .data(this.pie(pieData))
            .enter().append("g")
            .attr("class", "pie-slice");

        arcs.append("path")
            .attr("d", this.arc)
            .style("fill", d => colorScale(d.data.rat))
            .style("stroke", "rgb(255, 255, 255)")
            .style("stroke-width", 1)
            .style("cursor", "pointer")
            .on("mouseover", (event, d) => {
                d3.select(event.currentTarget)
                    .style("opacity", 0.8)
                    .style("stroke-width", 1);
                const tooltipText = `${d.data.rat}\n${d.data.count}(ea), ${d.data.percentage}%`;
                this.tooltip
                    .style("opacity", 1)
                    .style("visibility", "visible")
                    .text(tooltipText);
            })
            .on("mousemove", (event) => {
                this.tooltip
                    .style("top", (event.pageY - 10) + "px")
                    .style("left", (event.pageX + 10) + "px");
            })
            .on("mouseout", (event) => {
                d3.select(event.currentTarget)
                    .style("opacity", 1)
                    .style("stroke-width", 1);

                this.tooltip
                    .style("opacity", 0)
                    .style("visibility", "hidden");
            });
        return arcs;
    }

    createLabels(arcs) {
        arcs.append("text")
            .attr("transform", d => `translate(${this.arc.centroid(d)})`)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .style("font-size", "12px")
            .style("font-family", "Arial")
            .style("fill", "rgb(100, 100, 100)")
            .style("pointer-events", "none")
            .text(d => d.data.percentage > 3 ? `${d.data.percentage}%` : "")
            .style("text-shadow", "1px 1px 2px rgba(255,255,255,0.8)");

        arcs.append("text")
            .attr("transform", d => {
                const pos = this.labelArc.centroid(d);
                return `translate(${pos})`;
            })
            .attr("text-anchor", d => {
                const pos = this.labelArc.centroid(d);
                return pos[0] > 0 ? "start" : "end";
            })
            .style("font-size", "11px")
            .style("font-family", "Arial")
            .style("font-weight", "bold")
            .style("fill", "rgb(100, 100, 100)")
            .text(d => d.data.rat);

        arcs.append("polyline")
            .attr("points", d => {
                const pos = this.labelArc.centroid(d);
                const midpos = this.arc.centroid(d);
                return [midpos, this.arc.centroid(d), pos];
            })
            .style("fill", "none")
            .style("stroke", "#999")
            .style("stroke-width", 1)
            .style("opacity", 0.5);
    }

    createLegend(pieData, colorScale) {
        const legend = this.svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${this.width - 150}, 80)`);

        const legendItems = legend.selectAll(".legend-item")
            .data(pieData)
            .enter().append("g")
            .attr("class", "legend-item")
            .attr("transform", (d, i) => `translate(0, ${i * 20})`);

        legendItems.append("rect")
            .attr("width", 15)
            .attr("height", 15)
            .style("fill", d => colorScale(d.rat))
            .style("stroke", "#ccc")
            .style("stroke-width", 1);

        legendItems.append("text")
            .attr("x", 20)
            .attr("y", 7.5)
            .attr("dominant-baseline", "middle")
            .style("font-size", "11px")
            .style("font-family", "Arial")
            .style("fill", "#333")
            .text(d => `${d.rat} (${d.count})`);
    }

    update(data) {
        this.chartGroup.selectAll("*").remove();
        this.svg.selectAll(".legend").remove();

        const { pieData, total } = this.processData(data);

        if (pieData.length === 0 || total === 0) {
            this.showNoDataMessage();
            return;
        }

        const colorScale = this.createColorScale(pieData);
        const arcs = this.createPieSlices(pieData, colorScale);
        this.createLabels(arcs);
        this.createLegend(pieData, colorScale);
        this.chartGroup.append("text")
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .style("font-size", "13px")
            .style("font-weight", "bold")
            .style("font-family", "Arial")
            .style("fill", "rgb(100, 100, 100)")
            .text(`Total: ${total}`);
    }

    showNoDataMessage(message = "No data available. Check your filter conditions") {
        this.chartGroup.selectAll("*").remove();
        this.chartGroup.append("text")
            .attr("class", "error-message")
            .attr("x", this.width / 2)
            .attr("y", this.height / 2)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .style("font-size", "16px")
            .style("font-family", "Arial")
            .style("fill", "rgb(100, 100, 100)")
            .text(message);
    }
} 