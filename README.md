# Simple Square Packing Algorithm

You can find an interactive example here: https://werehamster.github.io/simple-square-packing

```javascript
import {packSquares} from './index';

// The values which you want to show.
const values = [4, 3, 1, 0.2];

// The sizes of the squares are relative to this value. You can use it if you
// want to render multiple figures which need to be sized relatively
// to each other.
const maxValue = 7;

const result = packSquares(values, maxValue);
```

Consult the source file to see which fields are available in the result.
