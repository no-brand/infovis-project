class CorrelationMatrix {
    constructor(id) {
        this.id = id;
        this.width = 500;
        this.height = 800;
        this.config = {
            margin: { top: 60, right: 100, bottom: 130, left: 150 }, 
            cellPadding: 1,
            minCellSize: 25
        };
        this.chartWidth = this.width - this.config.margin.left - this.config.margin.right;
        this.chartHeight = this.height - this.config.margin.top - this.config.margin.bottom;
    }

    initialize() {
        console.log("Correlation: initialize");
        this.createSVG();
        this.createTooltip();
    }

    createSVG() {
        const container = d3.select(this.id);
        this.svg = container
            .append("svg")
            .attr("width", this.width)
            .attr("height", this.height)
            .attr("preserveAspectRatio", "xMidYMid meet")
        
        this.chartGroup = this.svg.append("g")
            .attr("transform", `translate(${this.config.margin.left}, ${this.config.margin.top})`);
        this.colorScale = d3.scaleSequential(d3.interpolateBlues).domain([0, 1]);
    }

    createTooltip() {
        this.tooltip = d3.select("body").append("div")
            .attr("class", "correlation-tooltip")
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

    processData(data) {
        if (!data || data.length === 0) {
            return { matrixData: [], topModels: [], topVersions: [], maxCount: 0 };
        }

        const matrix = {};
        const modelCounts = {};
        const versionCounts = {};

        data.forEach(d => {
            if (d.metadata && d.metadata.model && d.metadata.modem_version) {
                const model = d.metadata.model.trim();
                const version = d.metadata.modem_version.trim();

                if (!matrix[model]) matrix[model] = {};
                matrix[model][version] = (matrix[model][version] || 0) + 1;
                
                modelCounts[model] = (modelCounts[model] || 0) + 1;
                versionCounts[version] = (versionCounts[version] || 0) + 1;
            }
        });
        if (Object.keys(modelCounts).length === 0 || Object.keys(versionCounts).length === 0) {
            return { matrixData: [], topModels: [], topVersions: [], maxCount: 0 };
        }

        const allModels = Object.entries(modelCounts)
            .sort((a, b) => b[1] - a[1])  // Sort by count in descending order
            .map(d => d[0]);

        const allVersions = Object.entries(versionCounts)
            .sort((a, b) => b[1] - a[1])  // Sort by count in descending order
            .map(d => d[0]);

        const matrixData = [];
        let maxCount = 0;

        allVersions.forEach((version, i) => {
            allModels.forEach((model, j) => {
                const count = (matrix[model] && matrix[model][version]) || 0;
                maxCount = Math.max(maxCount, count);
                matrixData.push({
                    model,
                    version,
                    count,
                    row: i,
                    col: j
                });
            });
        });
        return {
            matrixData,
            topModels: allModels,
            topVersions: allVersions,
            maxCount
        };
    }

    createScales(models, versions) {
        const maxNumModel = Math.floor(this.chartWidth / this.config.minCellSize);
        const maxNumVersion = Math.floor(this.chartHeight / this.config.minCellSize);
        const targetModels = models.length > maxNumModel ? models.slice(0, maxNumModel) : models;
        const targetVersions = versions.length > maxNumVersion ? versions.slice(0, maxNumVersion) : versions;

        this.xScale = d3.scaleBand()
            .domain(targetModels)
            .range([0, this.chartWidth])
            .padding(0.05);

        this.yScale = d3.scaleBand()
            .domain(targetVersions)
            .range([0, this.chartHeight])
            .padding(0.05);

        this.displayModels = targetModels;
        this.displayVersions = targetVersions;
    }

    createAxes(models, versions) {
        const xAxisGroup = this.chartGroup.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0, ${this.chartHeight})`);
        const xAxis = d3.axisBottom(this.xScale)
            .tickFormat(d => d);

        xAxisGroup.call(xAxis);
        xAxisGroup.selectAll("text")
            .style("font-size", "12px")
            .style("font-family", "Arial")
            .style("fill", "rgb(100, 100, 100)")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end")
            .text(function(d) {
                const maxLength = Math.max(15, Math.floor(this.xScale.bandwidth() / 4));
                return d.length > maxLength ? d.substring(0, maxLength) + "..." : d;
            }.bind(this));

        const yAxisGroup = this.chartGroup.append("g")
            .attr("class", "y-axis");
        const yAxis = d3.axisLeft(this.yScale)
            .tickFormat(d => d);
        
        yAxisGroup.call(yAxis);
        yAxisGroup.selectAll("text")
            .style("font-size", "12px")
            .style("font-family", "Arial")
            .style("fill", "rgb(100, 100, 100)")
            .text(function(d) {
                const maxLength = Math.max(15, Math.floor(this.yScale.bandwidth() / 3));
                return d.length > maxLength ? d.substring(0, maxLength) + "..." : d;
            }.bind(this));

        this.svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 20)
            .attr("x", -(this.height / 2))
            .attr("text-anchor", "middle")
            .style("font-size", "12px") 
            .style("font-weight", "bold")
            .style("font-family", "Arial")
            .style("fill", "rgb(100, 100, 100)")
            .text("SW Version");

        this.svg.append("text")
            .attr("x", this.width / 2)
            .attr("y", this.height - 50)
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .style("font-weight", "bold")
            .style("font-family", "Arial")
            .style("fill", "rgb(100, 100, 100)")
            .text("Model");
    }

    createHeatmap(matrixData, maxCount) {
        this.colorScale.domain([0, maxCount]);

        // Calculate cell dimensions
        const cellWidth = this.xScale.bandwidth() * (1 - this.config.cellPadding / 100);
        const cellHeight = this.yScale.bandwidth() * (1 - this.config.cellPadding / 100);

        // Create cells (swapped coordinates for swapped axes)
        const cells = this.chartGroup.selectAll(".matrix-cell")
            .data(matrixData)
            .enter().append("rect")
            .attr("class", "matrix-cell")
            .attr("x", d => this.xScale(d.model))      // X is now model
            .attr("y", d => this.yScale(d.version))    // Y is now version
            .attr("width", cellWidth)
            .attr("height", cellHeight)
            .style("fill", d => this.colorScale(d.count))
            .style("stroke", "rgb(255, 255, 255)")
            .style("stroke-width", 1)
            .style("cursor", "pointer");

        const maxFontSize = Math.min(cellWidth, cellHeight) * 0.6;
        const minFontSize = 8;

        this.chartGroup.selectAll(".matrix-text")
            .data(matrixData)
            .enter().append("text")
            .attr("class", "matrix-text")
            .attr("x", d => this.xScale(d.model) + this.xScale.bandwidth() / 2)
            .attr("y", d => this.yScale(d.version) + this.yScale.bandwidth() / 2)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .style("font-size", d => {
                const numDigits = d.count.toString().length;
                let fontSize = maxFontSize / Math.max(1, Math.sqrt(numDigits * 0.8));
                
                if (cellWidth < 25 || cellHeight < 20) {
                    fontSize = Math.min(fontSize, 10);
                    if (d.count === 0 && (cellWidth < 15 || cellHeight < 12)) {
                        return "0px";
                    }
                }
                
                return Math.max(minFontSize, fontSize) + "px";
            })
            .style("font-family", "Arial")
            .style("fill", d => {
                if (d.count === 0) return "#aaa";
                return d.count > maxCount * 0.4 ? "white" : "#333";
            })
            .style("pointer-events", "none")
            .text(d => {
                if (cellWidth < 20 || cellHeight < 15) {
                    return d.count > 0 ? d.count : "0";
                }
                return d.count;
            });

        return cells;
    }

    createLegend(maxCount) {
        const legendWidth = 20;
        const legendHeight = this.height * 0.5;
        const legendX = this.width - legendWidth - 40;
        const legendY = (this.height - legendHeight) / 2;

        const legend = this.svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${legendX}, ${legendY})`);

        const defs = this.svg.select("defs").empty() ? this.svg.append("defs") : this.svg.select("defs");
        const gradient = defs.append("linearGradient")
            .attr("id", "matrix-legend-gradient")
            .attr("x1", "0%")
            .attr("y1", "100%")
            .attr("x2", "0%")
            .attr("y2", "0%");

        gradient.selectAll("stop")
            .data([
                { offset: "0%", color: this.colorScale(0) },
                { offset: "100%", color: this.colorScale(maxCount) }
            ])
            .enter().append("stop")
            .attr("offset", d => d.offset)
            .attr("stop-color", d => d.color);

        legend.append("rect")
            .attr("width", legendWidth)
            .attr("height", legendHeight)
            .style("fill", "url(#matrix-legend-gradient)")
            .style("stroke", "#333")
            .style("stroke-width", 1);

        legend.append("text")
            .attr("x", legendWidth + 5)
            .attr("y", legendHeight)
            .attr("dy", "0.3em")
            .style("font-size", "10px")
            .style("font-family", "Arial")
            .style("fill", "#333")
            .text("0");

        legend.append("text")
            .attr("x", legendWidth + 5)
            .attr("y", 0)
            .attr("dy", "0.3em")
            .style("font-size", "10px")
            .style("font-family", "Arial")
            .style("fill", "#333")
            .text(maxCount);

        legend.append("text")
            .attr("x", -legendHeight / 2)
            .attr("y", -10)
            .attr("transform", "rotate(-90)")
            .style("text-anchor", "middle")
            .style("font-size", "12px")
            .style("font-family", "Arial")
            .style("font-weight", "bold")
            .style("fill", "#666")
            .text("Error Count");
    }

    addInteractions(cells) {
        cells
            .on("mouseover", (event, d) => {
                d3.select(event.currentTarget)
                    .style("opacity", 0.7)
                    .style("stroke", "rgb(0, 0, 0)")
                    .style("stroke-width", 1);
                const tooltipText = `${d.model} [${d.version}]\n${d.count}(ea)`;
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
                    .style("stroke", "#fff")
                    .style("stroke-width", 1);
                this.tooltip
                    .style("opacity", 0)
                    .style("visibility", "hidden");
            });
    }

    showNoDataMessage(message = "No data available. Check your filter conditions") {
        this.chartGroup.selectAll("*").remove();
        this.chartGroup.append("text")
            .attr("x", this.chartWidth / 2)
            .attr("y", this.chartHeight / 2)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .style("font-size", "16px")
            .style("font-family", "Arial")
            .style("fill", "rgb(100, 100, 100)")
            .text(message);
    }

    update(data) {
        this.chartGroup.selectAll("*").remove();
        this.svg.selectAll(".legend").remove();

        const { matrixData, topModels, topVersions, maxCount } = this.processData(data);
        console.log(matrixData);
        console.log(topModels);
        console.log(topVersions);
        console.log(maxCount);

        if (matrixData.length === 0) {
            this.showNoDataMessage();
            return;
        }

        this.createScales(topModels, topVersions);
        this.createAxes(topModels, topVersions);

        const filteredMatrixData = matrixData.filter(d => 
            this.displayModels.includes(d.model) && this.displayVersions.includes(d.version)
        );

        const cells = this.createHeatmap(filteredMatrixData, maxCount);
        this.createLegend(maxCount);
        this.addInteractions(cells);
    }
} 