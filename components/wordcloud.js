class WordCloud {
    constructor(id) {
        this.id = id;
        this.width = 1000;
        this.height = 450;
        this.handlers = {};
    }

    initialize() {
        console.log("WordCloud: initialize");
        const container = d3.select(this.id);
        
        // Tooltip div 생성
        this.tooltip = d3.select("body").append("div")
            .attr("class", "wordcloud-tooltip")
            .style("position", "absolute")
            .style("visibility", "hidden")
            .style("background", "rgba(0, 0, 0, 0.8)")
            .style("color", "white")
            .style("padding", "10px 10px")
            .style("border-radius", "10px")
            .style("font-size", "13px")
            .style("font-family", "Arial")
            .style("z-index", "1000")
            .style("box-shadow", "0 2px 8px rgba(0,0,0,0.8)")
            .style("white-space", "pre-line");
            
        this.svg = container
            .append("svg")
            .attr("width", this.width)
            .attr("height", this.height)
            .attr("preserveAspectRatio", "xMidYMid meet")
    }

    update(data) {
        console.log(`WordCloud: update ${data.length}`);
        if (!data || data.length === 0) {
            this.showNoDataMessage();
            return;
        }

        // Aggregate Messages
        const errorMessages = data.map(d => d.error.error_message);
        const sentenceCounts = {};
        errorMessages.forEach(msg => {
            if (msg && msg.trim().length > 0) {
                const sentence = msg.trim();
                
                if (sentence.startsWith("Assertion 0 failed") 
                    || sentence.startsWith("Assertion (0) failed[") 
                    || sentence.startsWith("Assertion 0 failed")
                    || sentence.startsWith("Assert[B_")) {
                    return;
                }
                
                const displaySentence = sentence;
                sentenceCounts[displaySentence] = (sentenceCounts[displaySentence] || 0) + 1;
            }
        });
        if (Object.keys(sentenceCounts).length === 0) {
            this.showNoDataMessage();
            return;
        }

        const sentences = Object.entries(sentenceCounts).map(([text, size]) => ({
            text,
            size,
        }));

        // Render Messages
        this.svg.selectAll("*").remove();

        const svg = this.svg;
        const width = this.width;
        const height = this.height;
        const dynamicFontScale = (sentences.length > 1000 ? 50.0 : 20.0) / Math.sqrt(sentences.length)
        console.log(`WordCloud: dynamicScale: ${sentences.length}ea -> ${dynamicFontScale}`);

        const self = this;

        const layout = d3.layout.cloud()
            .size([width, height])
            .words(sentences)
            .padding(0)
            .rotate(() => 0)
            .font("Arial")
            .fontSize(d => Math.sqrt(d.size) * dynamicFontScale)
            // .on("word", word => console.log("Placed:", word.text, word.size))
            .on("end", draw);

        layout.start();

        function draw(sentences) {
            const sentenceCloud = svg
                .append("g")
                .attr("transform", `translate(${width / 2},${height / 2})`);
            sentenceCloud.selectAll("text")
                .data(sentences)
                .enter().append("text")
                .style("font-size", d => `${d.size}px`)
                .style("font-family", "Arial")
                .style("font-weight", "bold")
                .style("fill", d => {
                    const maxSize = Math.max(...sentences.map(s => s.size));
                    const t = d.size / maxSize;
                    return d3.interpolateReds(t * 0.9 + 0.1);
                })
                .style("cursor", "pointer")
                .attr("text-anchor", "middle")
                .attr("transform", d => `translate(${d.x},${d.y}) rotate(${d.rotate})`)
                .text(d => d.text)
                .on("mouseover", function(event, d) {
                    d3.select(this).style("opacity", 0.7);
                    const count = sentenceCounts[d.text] || 0;
                    const tooltipText = `${d.text}\n${count}(ea)`;
                    self.tooltip
                        .style("visibility", "visible")
                        .text(tooltipText);
                })
                .on("mousemove", function(event) {
                    self.tooltip
                        .style("top", (event.pageY - 10) + "px")
                        .style("left", (event.pageX + 10) + "px");
                })
                .on("mouseout", function() {
                    d3.select(this).style("opacity", 1);
                    self.tooltip.style("visibility", "hidden");
                })
                .on("click", function(event, d) {
                    self.handlers.click(event, d);
                });
        }
    }

    showNoDataMessage(message = "No data available. Check your filter conditions") {
        this.svg.selectAll("*").remove();
        this.svg.append("text")
            .attr("x", this.width / 2)
            .attr("y", this.height / 2)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .style("font-size", "16px")
            .style("font-family", "Arial")
            .style("fill", "rgb(100, 100, 100)")
            .text(message);
    }

    on(eventType, handler) {
        this.handlers[eventType] = handler;
    }
}
