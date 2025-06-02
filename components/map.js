class WorldMap {
    constructor(id) {
        this.id = id;
        this.width = 1000;
        this.height = 450;
    }

    async initialize() {
        console.log("Map: initialize");
        this.createSVG();
        this.createTooltip();
        await this.loadGeographicData();
        this.setupProjection();
    }

    createSVG() {
        const container = d3.select(this.id);
        this.svg = container
            .append("svg")
            .attr("width", this.width)
            .attr("height", this.height)
            .attr("preserveAspectRatio", "xMidYMid meet")
        this.chartGroup = this.svg.append("g");
    }

    setupProjection() {
        this.projection = d3.geoEqualEarth()
            .fitExtent([[10, 50], [this.width - 10, this.height - 10]], {type: "Sphere"})
            .scale(this.projection ? this.projection.scale() * 1.3 : 200);
        this.path = d3.geoPath(this.projection);
    }

    createTooltip() {
        this.tooltip = d3.select("body").append("div")
            .attr("class", "map-tooltip")
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

    async loadGeographicData() {
        try {
            const worldDataUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";
            const worldData = await d3.json(worldDataUrl);
            this.countries = topojson.feature(worldData, worldData.objects.countries);
        } catch (error) {
            this.countries = null;
        }
    }

    update(data) {
        console.log(`Map: update ${data.length}`);
        if (!this.countries) {
            this.showNoDataMessage("GEOJSON data is not available");
            return;
        }
        if (!data || data.length === 0) {
            this.showNoDataMessage();
            return;
        }

        // Aggregate Countries
        const countryErrorCounts = {};
        const dataCountryCodes = new Set();
        
        data.forEach(d => {
            const countryCode = d.context?.plmn?.country;
            if (countryCode) {
                dataCountryCodes.add(countryCode);
                countryErrorCounts[countryCode] = (countryErrorCounts[countryCode] || 0) + 1;
            }
        });
        if (Object.keys(countryErrorCounts).length === 0) {
            this.showNoDataMessage("");
            return;
        }
        // Object.entries(countryErrorCounts).forEach(([country, count]) => console.log(country, count));

        // Scaling
        const maxCount = Math.max(...Object.values(countryErrorCounts));
        const minCount = Math.min(...Object.values(countryErrorCounts).filter(count => count > 0));
        let colorScale;
        try {
            colorScale = d3.scaleLog()
                .domain([Math.max(1, minCount), maxCount])
                .range(["#fee5d9", "#a50f15"])
                .interpolate(d3.interpolateHsl);
        } catch (error) {
            colorScale = d3.scaleLinear()
                .domain([minCount, maxCount])
                .range(["#fee5d9", "#a50f15"]);
        }
        console.log(colorScale);

        // Render Countries
        this.svg.selectAll(".country").remove();
        this.svg.selectAll(".country-label").remove();
        this.svg.selectAll(".error-message").remove();

        // Draw countries
        const countries = this.chartGroup.selectAll(".country")
            .data(this.countries.features)
            .enter().append("path")
            .attr("class", "country")
            .attr("d", this.path)
            .style("fill", d => {
                const countryCode = d.properties.name;
                const count = countryErrorCounts[countryCode] || 0;
                return count > 0 ? colorScale(count) : "#f0f0f0";
            })
            .style("stroke", "#fff")
            .style("stroke-width", 0.5)
            .style("cursor", "pointer")
            .on("mouseover", (event, d) => {
                const countryCode = d.properties.name;
                const count = countryErrorCounts[countryCode] || 0;
                const countryName = d.properties.NAME || d.properties.name || d.properties.ADMIN || countryCode;
                
                d3.select(event.currentTarget)
                    .style("opacity", 0.7)
                    .style("stroke", "rgb(0, 0, 0)")
                    .style("stroke-width", 1);

                const tooltipText = `${countryCode}\n${count}(ea)`;
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
                    .style("stroke", "rgb(255, 255, 255)")
                    .style("stroke-width", 1);

                this.tooltip
                    .style("opacity", 0)
                    .style("visibility", "hidden");
            });
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