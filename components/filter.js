class FilterPanel {
    constructor(id) {
        this.id = id;
        this.currentFilters = {
            country: null,
            model: null
        };
        this.data = [];
        this.onFilterChange = null;
    }

    initialize() {
        this.createFilterPanel();
        this.setupEventListeners();
    }

    createFilterPanel() {
        const container = d3.select(this.id);
        container.selectAll("*").remove();

        const panel = container.append("div")
            .attr("class", "filter-div")
            .style("background", "white")
            .style("border-radius", "10px")
            .style("padding", "20px")
            .style("margin-bottom", "20px")
            .style("box-shadow", "0 2px 8px rgba(0,0,0,0)")
            .style("border", "2px solid #e0e0e0");

        panel.append("h5")
            .attr("class", "filter-title")
            .style("margin-bottom", "20px")
            .style("color", "rgb(0, 0, 0)")
            .style("font-weight", "bold")
            .text("Filters");

        this.createFilterGroup(panel, "country");
        this.createFilterGroup(panel, "model");

        panel.append("button")
            .attr("class", "btn btn-outline-secondary btn-sm")
            .style("margin-top", "20px")
            .style("width", "100%")
            .text("Clear Filters")
            .on("click", () => this.clearAllFilters());

        this.statusContainer = panel.append("div")
            .attr("class", "filter-status")
            .style("margin-top", "15px")
            .style("padding", "10px")
            .style("background", "rgba(240, 240, 240, 0.7)")
            .style("border-radius", "5px")
            .style("font-size", "12px")
            .style("color", "rgb(0, 0, 0)");

        this.updateFilterStatus();
    }

    createFilterGroup(parent, field) {
        const group = parent.append("div")
            .attr("class", "filter-group")
            .style("margin-bottom", "10px");

        group.append("label")
            .attr("for", `filter-${field}`)
            .attr("class", "form-label")
            .style("font-weight", "bold")
            .style("color", "rgb(0, 0, 0)")
            .style("margin-bottom", "5px")
            .style("display", "block")
            .text(field.charAt(0).toUpperCase() + field.slice(1).toLowerCase());

        group.append("select")
            .attr("id", `filter-${field}`)
            .attr("class", "form-select form-select-sm")
            .style("width", "100%")
            .append("option")
            .attr("value", "")
            .text(`ALL (Select ${field})`);
    }

    setupEventListeners() {
        d3.select(`#filter-country`).on("change", () => this.onFilterUpdate("country"));
        d3.select(`#filter-model`).on("change", () => this.onFilterUpdate("model"));
    }

    onFilterUpdate(field) {
        const value = d3.select(`#filter-${field}`).property("value");
        this.currentFilters[field] = value || null;
        
        this.updateFilterStatus();
        if (this.onFilterChange) {
            const dataToPass = this.hasActiveFilters() ? this.getFilteredData() : this.data;
            this.onFilterChange(dataToPass, this.currentFilters);
        }
    }

    updateData(data) {
        this.data = data;
        this.prepareFilterOptions();
        this.updateFilterStatus();
    }

    prepareFilterOptions() {
        const countries = [...new Set(this.data
            .map(d => d.context?.plmn?.country)
            .filter(country => country && country.trim())
        )].sort();

        const models = [...new Set(this.data
            .map(d => d.metadata?.model)
            .filter(model => model && model.trim())
        )].sort();

        this.setFilterOpeionDropdown("country", countries);
        this.setFilterOpeionDropdown("model", models);
    }

    setFilterOpeionDropdown(field, options) {
        const select = d3.select(`#filter-${field}`);
        select.selectAll("option:not(:first-child)").remove();
        select.selectAll("option.data-option")
            .data(options)
            .enter()
            .append("option")
            .attr("class", "data-option")
            .attr("value", d => d)
            .text(d => d);
    }

    getFilteredData() {
        if (!this.data || this.data.length === 0) return [];

        return this.data.filter(item => {
            if (this.currentFilters.country && 
                item.context?.plmn?.country !== this.currentFilters.country) {
                return false;
            }
            if (this.currentFilters.model && 
                item.metadata?.model !== this.currentFilters.model) {
                return false;
            }
            return true;
        });
    }

    clearAllFilters() {
        this.currentFilters = {
            country: null,
            model: null
        };
        d3.select("#filter-country").property("value", "");
        d3.select("#filter-model").property("value", "");
        this.updateFilterStatus();
        if (this.onFilterChange) {
            this.onFilterChange(this.data, this.currentFilters);
        }
    }

    updateFilterStatus() {
        const activeFilters = Object.entries(this.currentFilters)
            .filter(([key, value]) => value !== null)
            .map(([key, value]) => `${key}: ${value}`);

        const totalRecords = this.data.length;
        const filteredRecords = this.hasActiveFilters() ? this.getFilteredData().length : totalRecords;

        if (totalRecords === 0) {
            this.statusContainer.text("No data loaded");
            return;
        }

        let statusText = `Showing ${filteredRecords.toLocaleString()} of ${totalRecords.toLocaleString()} records`;
        
        if (activeFilters.length > 0) {
            statusText += `\nActive filters: ${activeFilters.join(', ')}`;
        } else {
            statusText += `\nNo filters active - showing all data`;
        }

        this.statusContainer.text(statusText);
    }

    // Method to set callback function for filter changes
    setFilterChangeCallback(callback) {
        this.onFilterChange = callback;
    }

    // Method to get current filter state
    getCurrentFilters() {
        return { ...this.currentFilters };
    }

    // Method to check if any filters are active
    hasActiveFilters() {
        return Object.values(this.currentFilters).some(value => value !== null);
    }

    // Method to get filter statistics
    getFilterStats() {
        return {
            total: this.data.length,
            filtered: this.getFilteredData().length,
            activeFilters: Object.values(this.currentFilters).filter(v => v !== null).length
        };
    }
} 