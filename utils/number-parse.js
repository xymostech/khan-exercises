(function() {

// Take text looking like a fraction, and turn it into a number
var fractionTransformer = function(text, options) {
    text = text
        // Replace unicode minus sign with hyphen
        .replace(/\u2212/, "-")

        // Remove space after +, -
        .replace(/([+-])\s+/g, "$1")

        // Remove leading/trailing whitespace
        .replace(/(^\s*)|(\s*$)/gi, "");

        // Extract numerator and denominator
    var match = text.match(/^([+-]?\d+)\s*\/\s*([+-]?\d+)$/);
    var parsedInt = parseInt(text, 10);
    if (match) {
        var num = parseFloat(match[1]),
            denom = parseFloat(match[2]);
        var simplified = denom > 0 &&
            (options.ratio || match[2] !== "1") &&
            KhanUtil.getGCD(num, denom) === 1;
        return [{
            value: num / denom,
            exact: simplified
        }];
    } else if (!isNaN(parsedInt) && "" + parsedInt === text) {
        return [{
            value: parsedInt,
            exact: true
        }];
    }

    return [];
};

/*
 * Different forms of numbers
 *
 * Each function returns a list of objects of the form:
 *
 * {
 *    value: numerical value,
 *    exact: true/false
 * }
 */
var forms = {
    // a literal, decimal looking number
    literal: function(text, options) {
        // Prevent literal comparisons for decimal-looking-like
        // strings
        return [{
            value: (/[^+-\u2212\d\.\s]/).test(text) ? text : null
        }];
    },

    // integer, which is encompassed by decimal
    integer: function(text, options) {
        return forms.decimal(text, options);
    },

    // A proper fraction
    proper: function(text, options) {
        return $.map(fractionTransformer(text, options), function(o) {
            // All fractions that are less than 1
            if (Math.abs(o.value) < 1) {
                return [o];
            } else {
                return [];
            }
        });
    },

    // an improper fraction
    improper: function(text, options) {
        return $.map(fractionTransformer(text, options), function(o) {
            // All fractions that are greater than 1
            if (Math.abs(o.value) >= 1) {
                return [o];
            } else {
                return [];
            }
        });
    },

    // pi-like numbers
    pi: function(text, options) {
        var match, possibilities = [];

        // Replace unicode minus sign with hyphen
        text = text.replace(/\u2212/, "-");

        // - pi
        if (match = text.match(
                        /^([+-]?)\s*(pi?|\u03c0|t(?:au)?|\u03c4)$/i
                    )) {
            possibilities = [{ value: parseFloat(match[1] + "1"), exact: true }];

        // 5 / 6 pi
        } else if (match = text.match(/^([+-]?\d+\s*(?:\/\s*[+-]?\d+)?)\s*\*?\s*(pi?|\u03c0|t(?:au)?|\u03c4)$/i)) {
            possibilities = fractionTransformer(match[1], options);

        // 5 pi / 6
        } else if (match = text.match(/^([+-]?\d+)\s*\*?\s*(pi?|\u03c0|t(?:au)?|\u03c4)\s*(?:\/\s*([+-]?\d+))?$/i)) {
            possibilities = fractionTransformer(match[1] +
                                                "/" + match[3], options);

        // - pi / 4
        } else if (match = text.match(/^([+-]?)\s*\*?\s*(pi?|\u03c0|t(?:au)?|\u03c4)\s*(?:\/\s*([+-]?\d+))?$/i)) {
            possibilities = fractionTransformer(match[1] +
                                                "1/" + match[3], options);

        // 0
        } else if (text === "0") {
            possibilities = [{ value: 0, exact: true }];

        // 0.5 pi (fallback)
        } else if (match = text.match(
                    /^(\S+)\s*\*?\s*(pi?|\u03c0|t(?:au)?|\u03c4)$/i
                            )) {
            possibilities = forms.decimal(match[1], options);
        }

        var multiplier = Math.PI;
        if (match && match[2].match(/t(?:au)?|\u03c4/)) {
            multiplier = Math.PI * 2;
        }

        $.each(possibilities, function(ix, possibility) {
            possibility.value *= multiplier;
        });
        return possibilities;
    },

    // simple log(c) form
    log: function(text, options) {
        var match, possibilities = [];

        // Replace unicode minus sign with hyphen
        text = text.replace(/\u2212/, "-");
        text = text.replace(/[ \(\)]/g, "");

        if (match = text.match(/^log\s*(\S+)\s*$/i)) {
            possibilities = forms.decimal(match[1], options);
        } else if (text === "0") {
            possibilities = [{ value: 0, exact: true }];
        }
        return possibilities;
    },

    // Numbers with percent signs
    percent: function(text, options) {
        text = $.trim(text);
        // store whether or not there is a percent sign
        var hasPercentSign = false;

        if (text.indexOf("%") === (text.length - 1)) {
            text = $.trim(text.substring(0, text.length - 1));
            hasPercentSign = true;
        }

        var transformed = forms.decimal(text, options);
        $.each(transformed, function(ix, t) {
            t.exact = hasPercentSign;
        });
        return transformed;
    },

    // Numbers with dollar signs
    dollar: function(text, options) {
        text = $.trim(text.replace("$", ""));

        return forms.decimal(text, options);
    },

    // Mixed numbers, like 1 3/4
    mixed: function(text, options) {
        var match = text
            // Replace unicode minus sign with hyphen
            .replace(/\u2212/, "-")

            // Remove space after +, -
            .replace(/([+-])\s+/g, "$1")

            // Extract integer, numerator and denominator
            .match(/^([+-]?)(\d+)\s+(\d+)\s*\/\s*(\d+)$/);

        if (match) {
            var sign = parseFloat(match[1] + "1"),
                integ = parseFloat(match[2]),
                num = parseFloat(match[3]),
                denom = parseFloat(match[4]);
            var simplified = num < denom &&
                KhanUtil.getGCD(num, denom) === 1;

            return [{
                value: sign * (integ + num / denom),
                exact: simplified
            }];
        }

        return [];
    },

    // Decimal numbers
    decimal: function(text, options) {
        var normal = function(text) {
            var match = text

                // Replace unicode minus sign with hyphen
                .replace(/\u2212/, "-")

                // Remove space after +, -
                .replace(/([+-])\s+/g, "$1")

                // Extract integer, numerator and denominator If
                // commas or spaces are used, they must be in the
                // "correct" places
                .match(/^([+-]?(?:\d{1,3}(?:[, ]?\d{3})*\.?|\d{0,3}(?:[, ]?\d{3})*\.(?:\d{3}[, ]?)*\d{1,3}))$/);

            if (match) {
                var x = parseFloat(match[1].replace(/[, ]/g, ""));

                if (options.inexact === undefined) {
                    var factor = Math.pow(10, 10);
                    x = Math.round(x * factor) / factor;
                }

                return x;
            }
        };

        var commas = function(text) {
            text = text.replace(/([\.,])/g, function(_, c) {
                return (c === "." ? "," : ".");
            });
            return normal(text);
        };

        return [
            { value: normal(text), exact: true },
            { value: commas(text), exact: true }
        ];
    }
};

KhanUtil.parseNumber = function(number, parseForms, options) {
    parseForms = parseForms || [
        "decimal", "mixed", "dollar", "percent", "log", "pi", "improper",
        "proper", "integer", "literal"
    ];

    options = $.extend(options, { ratio: false });

    var parsed = [];

    $.each(parseForms, function(i, form) {
        $.each(forms[form](number, options), function(j, parse) {
            if (parse.value != null) {
                console.log(form, parse);
                parsed.push(parse);
            }
        });
    });

    return parsed;
};

})();
