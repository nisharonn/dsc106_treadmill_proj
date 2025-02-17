// Set the dimensions and margins of the graph
const margin = {top: 40, right: 30, bottom: 50, left: 60};
const width = 800 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

// Create filter button container divs
const filterContainer = d3.select("#visualization")
    .append("div")
    .attr("class", "filters");

// Create the SVG container
const svg = d3.select("#visualization")
    .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
    .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

// Load and process the data
d3.csv("./output.csv").then(function(data) {
    // Convert string values to numbers
    data.forEach(d => {
        d.Speed = +d.Speed;
        d.Age = +d.Age;
        d.Weight = +d.Weight;
        d.Height = +d.Height;
        d.Sex = +d.Sex; // Assuming 0 and 1 for gender
    });

    // Create filter ranges
    const ageRanges = [
        {min: 10, max: 20},
        {min: 20, max: 35},
        {min: 35, max: 60}
    ];

    const weightRanges = [
        {min: 40, max: 65},
        {min: 65, max: 80},
        {min: 80, max: 135}
    ];

    const heightRanges = [
        {min: 150, max: 170},
        {min: 170, max: 180},
        {min: 180, max: 205}
    ];

    // Create filter buttons
    createFilterButtons("Age", ageRanges);
    createFilterButtons("Weight", weightRanges);
    createFilterButtons("Height", heightRanges);
    createGenderButtons();

    // Initial histogram with all data
    updateHistogram(data);

    function createFilterButtons(category, ranges) {
        const container = filterContainer.append("div")
            .attr("class", "filter-category");
        
        container.append("h3")
            .text(category);

        container.append("button")
            .text("All")
            .attr("class", `filter-button ${category.toLowerCase()}-all active`)
            .on("click", function() {
                // When "All" is clicked, deactivate all other buttons in this category
                d3.selectAll(`.${category.toLowerCase()}-button`).classed("active", false);
                d3.select(`.${category.toLowerCase()}-all`).classed("active", true);
                updateFilters();
            });

        ranges.forEach(range => {
            container.append("button")
                .text(`${range.min}-${range.max}`)
                .attr("class", `filter-button ${category.toLowerCase()}-button`)
                .on("click", function() {
                    // Deactivate "All" button when a specific range is selected
                    d3.select(`.${category.toLowerCase()}-all`).classed("active", false);
                    // Toggle this button's active state
                    d3.select(this).classed("active", !d3.select(this).classed("active"));
                    
                    // Check if all range buttons are selected
                    const totalRangeButtons = ranges.length;
                    const selectedRangeButtons = d3.selectAll(`.${category.toLowerCase()}-button.active`).size();
                    
                    if (selectedRangeButtons === totalRangeButtons) {
                        // If all ranges are selected, activate "All" and deactivate others
                        d3.selectAll(`.${category.toLowerCase()}-button`).classed("active", false);
                        d3.select(`.${category.toLowerCase()}-all`).classed("active", true);
                    } else if (selectedRangeButtons === 0) {
                        // If no ranges are selected, activate "All"
                        d3.select(`.${category.toLowerCase()}-all`).classed("active", true);
                    }
                    
                    updateFilters();
                });
        });
    }

    function createGenderButtons() {
        const container = filterContainer.append("div")
            .attr("class", "filter-category");
        
        container.append("h3")
            .text("Gender");

        container.append("button")
            .text("All")
            .attr("class", "filter-button gender-all active")
            .on("click", function() {
                d3.selectAll(".gender-button").classed("active", false);
                d3.select(".gender-all").classed("active", true);
                updateFilters();
            });

        ["Male", "Female"].forEach(gender => {
            container.append("button")
                .text(gender)
                .attr("class", "filter-button gender-button")
                .on("click", function() {
                    d3.select(".gender-all").classed("active", false);
                    d3.select(this).classed("active", !d3.select(this).classed("active"));
                    
                    // Check if both gender buttons are selected
                    const selectedGenderButtons = d3.selectAll(".gender-button.active").size();
                    
                    if (selectedGenderButtons === 2) {
                        // If both genders are selected, activate "All" and deactivate others
                        d3.selectAll(".gender-button").classed("active", false);
                        d3.select(".gender-all").classed("active", true);
                    } else if (selectedGenderButtons === 0) {
                        // If no genders are selected, activate "All"
                        d3.select(".gender-all").classed("active", true);
                    }
                    
                    updateFilters();
                });
        });
    }

    function updateFilters() {
        let filteredData = [...data];  // Create a fresh copy of the original data

        // Get all filter categories
        const categories = ["Age", "Weight", "Height", "Gender"];
        
        categories.forEach(category => {
            // Skip if "All" is selected for this category
            if (d3.select(`.${category.toLowerCase()}-all`).classed("active")) {
                return;
            }

            // Get all active filters for this category
            const activeFilters = d3.selectAll(`.${category.toLowerCase()}-button.active`).nodes();
            
            if (activeFilters.length > 0) {
                filteredData = filteredData.filter(d => {
                    return activeFilters.some(button => {
                        const filterText = button.textContent;
                        if (category === "Gender") {
                            return d.Sex === (filterText === "Male" ? 0 : 1);
                        } else {
                            const [min, max] = filterText.split("-").map(Number);
                            return d[category] >= min && d[category] <= max;
                        }
                    });
                });
            }
        });

        // Add console logs for debugging
        console.log("Active filters:", d3.selectAll(".filter-button.active").nodes().map(n => n.textContent));
        console.log("Filtered data length:", filteredData.length);
        
        updateHistogram(filteredData);
    }

    function updateHistogram(filteredData) {
        // Clear previous histogram
        svg.selectAll("*").remove();

        // Calculate mean speed
        const meanSpeed = d3.mean(filteredData, d => d.Speed);

        // Create scales
        const x = d3.scaleLinear()
            .domain([0, d3.max(filteredData, d => d.Speed)])
            .range([0, width]);

        const histogram = d3.histogram()
            .value(d => d.Speed)
            .domain(x.domain())
            .thresholds(x.ticks(20));

        const bins = histogram(filteredData);

        // Calculate density (proportion) for each bin
        const totalCount = filteredData.length;
        bins.forEach(bin => {
            bin.density = bin.length / totalCount;
        });

        const y = d3.scaleLinear()
            .domain([0, d3.max(bins, d => d.density)])
            .range([height, 0]);

        // Add X axis
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .append("text")
            .attr("x", width / 2)
            .attr("y", 40)
            .attr("fill", "black")
            .text("Speed (mph)");

        // Add Y axis with percentage format
        svg.append("g")
            .call(d3.axisLeft(y).tickFormat(d => `${(d * 100).toFixed(1)}%`))
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -40)
            .attr("x", -height / 2)
            .attr("fill", "black")
            .text("Percentage of Runners");

        // Add the bars
        svg.selectAll("rect")
            .data(bins)
            .join("rect")
            .attr("x", d => x(d.x0))
            .attr("y", d => y(d.density))
            .attr("width", d => x(d.x1) - x(d.x0))
            .attr("height", d => height - y(d.density))
            .style("fill", "#007BFF")
            .style("opacity", 0.7);

        // Add mean line
        svg.append("line")
            .attr("x1", x(meanSpeed))
            .attr("x2", x(meanSpeed))
            .attr("y1", 0)
            .attr("y2", height)
            .style("stroke", "red")
            .style("stroke-width", 2)
            .style("stroke-dasharray", "4");

        // Add mean label
        svg.append("text")
            .attr("x", x(meanSpeed))
            .attr("y", -5)
            .attr("text-anchor", "middle")
            .style("fill", "red")
            .text(`Mean: ${meanSpeed.toFixed(1)} mph`);

        // Add interactive tooltip
        const tooltip = d3.select("body")
            .append("div")
            .style("position", "absolute")
            .style("background-color", "white")
            .style("padding", "10px")
            .style("border", "1px solid #ddd")
            .style("border-radius", "4px")
            .style("opacity", 0);

        // Add hover effects
        svg.selectAll("rect")
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .style("opacity", 1);
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltip.html(`Speed: ${d.x0.toFixed(1)} - ${d.x1.toFixed(1)} mph<br>Percentage: ${(d.density * 100).toFixed(1)}%`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                d3.select(this)
                    .style("opacity", 0.7);
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });
    }
}).catch(function(error) {
    // Add error handling
    console.error("Error loading the data:", error);
    document.getElementById("visualization").innerHTML = "Error loading the data. Check console for details.";
});
