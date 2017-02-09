
// The Vec2/Vec3 data types are the same as in gl-matrix. But the functions
// (implemented at the bottom) are slightly different: They are all completely
// immutable. Meaning: gl-matrix functions take the 'out' parameter as the
// first argument, but our functions always return a new object. This is ok
// because we're not that performance sensitive.
export type Vec2 = [number, number];
export type Vec3 = [number, number, number];


export type Result = {
    squares: Square[];
    // ^ The individual squares. Has same length as the input array. The squares
    // are sorted by size, with the largest first and the smallest last.

    outline: Vec2[];
    // ^ The exact outline around all the squares. You can use this to compute
    // the extent of all the squares. Counter-clockwise (I think).

    centroid: Vec2;
    // ^ The centroid of the outline polygon. Provided mainly for debugging
    // purposes, but you could use it for label placement. Note that the
    // centroid is not the same as the center of the extent square, though
    // they usually are very close.

    extent: Square
    // ^ The extent of all the squares. You can use this to compute the scale
    // matrix if you want to fit the squares into a particular area.
}

// Each square is given as the x/y position of its top-left corner and
// width/height.
export type Square = {
    x: number;
    y: number;
    width: number;
    height: number;
};


const eps = 0.0001;


export const packSquares = (values: number[], maxValue: number): Result => {
    const max = Math.sqrt(maxValue);

    const square0Size = Math.sqrt(values[0]) / max;
    const squares = [{x: 0, y: 0, width: square0Size, height: square0Size}];

    // This is const, but only the ref. We splice the array as we
    // iterate through the data points, thus changing the value.
    const outline: Vec2[] = [[0, 0], [square0Size, 0], [square0Size, square0Size], [0, square0Size]];


    // Naming conventions:
    //
    // - v{0,1,2,3}: The four vertices of the square which will be inserted into the result list.
    // - n{1,2,...}: Vertices which are used to calculate the direction.
    // - d{1,2,...}: Normalised vectors in the direction vX -> nY

    values.slice(1).forEach(value => {
        const size = Math.sqrt(value) / max;
        const centroid = polygonCentroid(outline);

        // The closest vertex to that centroid is used as one of the vertices
        // for the current rectangle. Saved as the index into the 'outline'
        // list because we need its neighbours.
        const v0Index = outline.reduce((a, v, i) =>
            distance(v, centroid) < distance(outline[a], centroid) ? i : a, 0);

        const v0 = outline[v0Index];

        // Now we need to decide into which direction the rectangle grows. We
        // can pick one side arbitrarily towards one of the neighbours of the
        // closest index.
        // The n1 vertex is the /direction/ into which the side grows.
        // We still need to do some vector arithmetic to determine where the
        // actual vertex needs to be.
        const n1Index = (v0Index + 1) % outline.length;
        const n1 = outline[n1Index];

        // The unit vector from v0 in the direction towards n1.
        const d1 = normalize(subtract(n1, v0));

        // The second vertex of the rectangle.
        const v1 = add(v0, multiply(d1, [size, size]));

        // The third vertex is from 'v0' along the line towards
        // the other (previous) neighbour. But we may need to invert the direction so
        // that the vector points away from the centroid.
        //
        // We compute the direction, and add that the 'v0'. If the
        // result ends up on the same side of the line between 'v0'
        // and 'v1', it means the point is on the wrong side and we have to
        // invert the direction.
        //
        // In the degenerate case where the direction from v0 to n2 is parallel
        // to d1, rotate the vector 90 degrees to the right. This works because
        // the outline is always counter-clockwise (I think).
        const n2Index = (v0Index - 1 + outline.length) % outline.length;
        const n2 = outline[n2Index];

        // The vector along the line between v0 and v2. We may have to invert
        // it if it is rotated by 180 degrees.
        const d2 = (() => {
            // The unit vector from v0 towards n2.
            const d = normalize(subtract(n2, v0));

            const dot2v = dot2(d, d1);
            if (Math.abs(dot2v) < eps) {
                return d;
            } else if (dot2v < 0) {
                return <Vec2>[d[1], -d[0]]
            } else {
                return d;
            }
        })();

        // Direction from 'v0' to the centroid.
        const centroidDirection = subtract(centroid, v0);

        // For v2 we have two choices where to go. Use the direction which results in
        // the vertex being outside of the outline.
        const v2_a = add(v0, multiply(negate(d2), [size, size]));
        const v2_b = add(v0, multiply(d2, [size, size]));
        const d3_fwd = pointIsInside(v2_a, outline);
        const v2 = d3_fwd ? v2_b : v2_a;

        // Push the square into the result list.
        squares.push(<Square>{
            x: Math.min(Math.min(v0[0], v1[0]), v2[0]),
            y: Math.min(Math.min(v0[1], v1[1]), v2[1]),
            width: size,
            height: size
        });

        // Update the outline.
        const v4 = add(add(v0, subtract(v2, v0)), subtract(v1, v0));
        const toInsert: Vec2[] =
            [ distance(v2, n2) < eps ? undefined : v2
            , v4
            , distance(v1, n1) < eps ? undefined : v1
            ].filter(x => x !== undefined);

        if (!d3_fwd) {
            outline.splice(v0Index + 1, 0, ...toInsert);
        } else {
            outline.splice(v0Index, 1, ...toInsert);
        }
    });

    return {
        squares,
        outline,
        centroid: polygonCentroid(outline),
        extent: polygonExtent(outline),
    };
};

const polygonExtent = (vertices: Vec2[]): Square => {
    const {min, max} = vertices.reduce(({min, max}, v) => ({
        min: min2(min, v),
        max: max2(max, v),
    }), {min: <Vec2>[999,999], max: <Vec2>[-999,-999]});

    return {
        x: min[0],
        y: min[1],
        width: max[0] - min[0],
        height: max[1] - min[1],
    };
};


// https://en.wikipedia.org/wiki/Centroid#Centroid_of_polygon
const polygonCentroid = (vertices: Vec2[]): Vec2 => {
    const {A, cx, cy} = vertices.reduce(({A, cx, cy}, [x1, y1], i) => {
        const [x2, y2] = vertices[(i + 1) % vertices.length];
        const f = (x1*y2 - x2*y1);

        return {
            A:  A  + f,
            cx: cx + (x1 + x2) * f,
            cy: cy + (y1 + y2) * f,
        };
    }, {A: 0, cx: 0, cy: 0});

    return multiply([1 / (6 * 0.5*A), 1 / (6 * 0.5*A)], [cx, cy]);
};

const pointIsInside = ([x,y]: Vec2, vs: Vec2[]): boolean => {
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        const [xi, yi] = vs[i];
        const [xj, yj] = vs[j];

        const intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }

    return inside;
};


// ----------------------------------------------------------------------------
// Vec2

const distance = ([x1, y1]: Vec2, [x2, y2]: Vec2): number =>
    Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));

const subtract = (a: Vec2, b: Vec2): Vec2 =>
    [a[0] - b[0], a[1] - b[1]];

const normalize = ([x,y]: Vec2): Vec2 => {
    let len = x*x + y*y;
    if (len > 0) {
        len = 1 / Math.sqrt(len);
        return [x * len, y * len];
    } else {
        return [0,0];
    }
};

const multiply = (a: Vec2, b: Vec2): Vec2 =>
    [a[0] * b[0], a[1] * b[1]];

const add = (a: Vec2, b: Vec2): Vec2 =>
    [a[0] + b[0], a[1] + b[1]];

const dot2 = (a: Vec2, b: Vec2): number =>
    a[0] * b[0] + a[1] * b[1];

const cross = (a: Vec2, b: Vec2): Vec3 =>
    [0, 0, a[0] * b[1] - a[1] * b[0]];

const negate = (a: Vec2): Vec2 =>
    [-a[0], -a[1]];

const min2 = (a: Vec2, b: Vec2): Vec2 =>
    [Math.min(a[0], b[0]), Math.min(a[1], b[1])];

const max2 = (a: Vec2, b: Vec2): Vec2 =>
    [Math.max(a[0], b[0]), Math.max(a[1], b[1])];

const colinear = (a: Vec2, b: Vec2, c: Vec2): boolean =>
    Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) < eps;


// ----------------------------------------------------------------------------
// Vec3

const dot3 = (a: Vec3, b: Vec3): number =>
    a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
