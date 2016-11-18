export default function compare(key, a, b) {
    try {
        return compare.rules[key](a, b);
    } catch (err) {
        return false;
    }
}

compare.rules = {
    $eq: function(a, b) {
        return a === b;
    },
    $ne: function(a, b) {
        return a !== b;
    },
    $gt: function(a, b) {
        return a > b;
    },
    $gte: function(a, b) {
        return a >= b;
    },
    $lt: function(a, b) {
        return a < b;
    },
    $lte: function(a, b) {
        return a <= b;
    },
    $in: function(a, b) {
        return b.indexOf(a) !== -1;
    },
    $nin: function(a, b) {
        return b.indexOf(a) === -1;
    },
    // $size: function(a, b) {
    //     if (Array.isArray(a)) {
    //         return a.length === b;
    //     }
    //     return false;
    // },
    // $len: function(a, b) {
    //     if (typeof a === 'string') {
    //         return a.length === b;
    //     }
    //     return false;
    // },
};