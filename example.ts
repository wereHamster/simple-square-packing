import {select} from 'd3-selection';
import {line} from 'd3-shape';
import {Square, packSquares} from './index';


const svg = select('svg');

const render = (data, width, height) => {
    svg.attr('width', width).attr('height', height);

    const svgNode = (<any>svg).node(0);
    while (svgNode.children.length > 0) { svgNode.removeChild(svgNode.children[0]); }

    if (data.length === 0) {
        return;
    }

    data.sort((a, b) => b - a);
    const result = packSquares(data, Math.max.apply(Math, data));

    // scale: Make it so that the diagonal fits into the container.
    const diag = Math.sqrt(Math.pow(result.extent.width, 2) + Math.pow(result.extent.height, 2));
    const sx = width / diag;
    const sy = height / diag;
    const scaleFactor = Math.min(sx, sy);

    // Rotation needs to be between 0 and PI/4. Otherwise the topY/leftX formula
    // will not work.
    const rot = Math.PI/4;

    // translation: center the thing inside the container. The rotation is 90deg
    // clock-wise. Hence the rotation matrix is [[0,1],[-1,0]]
    const topY = Math.sin(rot) * result.extent.x + (Math.cos(rot)) * (result.extent.y);
    const leftX = Math.cos(rot) * result.extent.x + (-Math.sin(rot))*(result.extent.y + result.extent.height);
    const dx = -leftX + ((width - diag * scaleFactor) / 2 / scaleFactor);
    const dy = -topY + ((height - diag * scaleFactor) / 2 / scaleFactor);


    const g = svg.selectAll('g.squares').data([1]).enter()
        .append('g').attr('transform', `scale(${scaleFactor} ${scaleFactor}) translate(${dx} ${dy}) rotate(${rot * 180 / Math.PI} 0 0)`);


    g.selectAll('circle.centroid').data([1]).enter()
        .append('circle')
            .attr('cx', result.centroid[0])
            .attr('cy', result.centroid[1])
            .attr('r', 4 / scaleFactor)
            .attr('fill', 'rgba(0,30,120,.4)');

    const closedOutline = result.outline.concat([result.outline[0]]);
    g.selectAll('path.outline').data([1]).enter()
        .append('path')
            .attr('d', () => line()(closedOutline))
            .attr('fill', 'none')
            .attr('stroke', 'rgba(160,0,20,.3)')
            .attr('stroke-width', 1 / scaleFactor);

    g.selectAll('circle.outline-vertex').data(result.outline).enter()
        .append('circle')
            .attr('cx', x => x[0])
            .attr('cy', x => x[1])
            .attr('r', 2 / scaleFactor)
            .attr('fill', 'rgba(160,0,20,.8)');

    g.selectAll('rect.extent').data([1]).enter()
        .append('rect')
            .attr('x', result.extent.x)
            .attr('y', result.extent.y)
            .attr('width', result.extent.width)
            .attr('height', result.extent.height)
            .attr('fill', 'none')
            .attr('stroke', 'rgba(60,160,0,.5)')
            .attr('stroke-width', 1 / scaleFactor);


    const offset = 3 / scaleFactor;

    const rects = g.selectAll('path.rectangles')
        .data(result.squares);
    rects.enter().append('path')
        .attr('d', ({x, y, width, height}: Square) => line()([
            [(x) + offset, (y) + offset],
            [(x + width) - offset, (y) + offset],
            [(x + width) - offset, (y + height) - offset],
            [(x) + offset, (y + height) - offset],
            [(x) + offset, (y) + offset]
        ]))
        .attr('fill', 'rgba(60,0,20,.08)')
        .attr('stroke', 'rgba(60,0,20,.8)')
        .attr('stroke-width', 1 / scaleFactor)
        .on("mouseover", function() {
            select(this)
                .attr("fill", 'rgba(160,0,20,.16)');
        })
        .on("mouseout", function(d, i) {
            select(this).attr("fill", function() {
                return 'rgba(60,0,20,.08)'
            });
        });

    // const labels = g.selectAll('text.label')
    //     .data(result.squares)
    // const text = labels.enter()
    //     .append('g')
    //         .attr('transform', ({x, y, width, height}: Square) => `translate(${x + width / 2} ${y + height / 2}) rotate(${-rot * 180 / Math.PI} 0 0)`)
    //     .append('text')
    //         .attr('x', 0)
    //         .attr('y', 0)
    //         .attr('text-anchor', 'middle')
    //         .attr('font-size', `${16 / scaleFactor}px`)
    //         .attr('pointer-events', 'none');
    //     text.append('tspan')
    //         .attr('x', 0)
    //         .attr('y', -14/scaleFactor)
    //         .text('Parent-child/');
    //     text.append('tspan')
    //         .attr('x', 0)
    //         .attr('y', 6/scaleFactor)
    //         .text('parent-child-school');
    //     text.append('tspan')
    //         .attr('x', 0)
    //         .attr('y', 26/scaleFactor)
    //         .text('programme');
};

const renderValue = (value) => {
    const data = value.split(/,/)
        .map(x => x.trim())
        .map(x => parseFloat(x))
        .filter(x => !isNaN(x) && x > 0);

    render(data, window.innerWidth - 80, window.innerHeight - 80 - 40);
};

const input = document.querySelector('input');

const valueFromHash = window.location.hash.substring(1);
if (valueFromHash) {
    input.value = valueFromHash;
}

renderValue(input.value);
input.addEventListener('keyup', () => {
    renderValue(input.value);
    window.location.hash = input.value;
}, true);

window.addEventListener('resize', () => {
    renderValue(input.value);
});
