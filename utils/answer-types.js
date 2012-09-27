(function() {

var inexactMessages = {
    unsimplified: "Your answer is almost correct, but it needs to be simplified.",
    missingPercentSign: "Your answer is almost correct, but it is missing a <code>\\%</code> at the end."
};

Khan.answerTypes = Khan.answerTypes || {};

$.extend(Khan.answerTypes, {
    text: {
        setup: function(solutionarea, solution) {
            var input = $('<input type="text">');
            $(solutionarea).append(input);

            var fallback = $(solution).data("fallback");

            return {
                validator: Khan.answerTypes.text.validatorCreator(solution),
                answer: function() {
                    return input.val().length > 0 ?
                        input.val() :
                        (fallback ? fallback : "");
                },
                solution: $.trim($(solution).text()),
                examples: [],
                showGuess: function(guess) {
                    input.val(guess);
                }
            };
        },
        validatorCreator: function(solution) {
            var correct = $.trim($(solution).text());

            return function(guess) {
                guess = $.trim(guess);
                return correct === guess;
            };
        }
    },

    number: {
        setup: function(solutionarea, solution) {
            var input;
            if (typeof userExercise !== "undefined" && userExercise.tablet) {
                input = $("<input type='number'/>");
            } else {
                input = $("<input type='text'>");
            }
            $(solutionarea).append(input);

            var options = $.extend({
                simplify: "required",
                ratio: false,
                maxError: Math.pow(2, -42),
                forms: "literal, integer, proper, improper, mixed, decimal"
            }, $(solution).data());
            var acceptableForms = options.forms.split(/\s*,\s*/);

            var exampleForms = {
                integer: "an integer, like <code>6</code>",

                proper: (function() {
                        if (options.simplify === "optional") {
                            return "a <em>proper</em> fraction, like <code>1/2</code> or <code>6/10</code>";
                        } else {
                            return "a <em>simplified proper</em> fraction, like <code>3/5</code>";
                        }
                    })(),

                improper: (function() {
                        if (options.simplify === "optional") {
                            return "an <em>improper</em> fraction, like <code>10/7</code> or <code>14/8</code>";
                        } else {
                            return "a <em>simplified improper</em> fraction, like <code>7/4</code>";
                        }
                    })(),

                pi: "a multiple of pi, like <code>12\\ \\text{pi}</code> or <code>2/3\\ \\text{pi}</code>",

                log: "an expression, like <code>\\log(100)</code>",

                percent: "a percent, like <code>12.34\\%</code>",

                dollar: "a money amount, like <code>$2.75</code>",

                mixed: "a mixed number, like <code>1\\ 3/4</code>",

                decimal: (function() {
                        if (options.inexact === undefined) {
                            return "an <em>exact</em> decimal, like <code>0.75</code>";
                        } else {
                            return "a decimal, like <code>0.75</code>";
                        }
                    })()
            };

            var examples = [];
            $.each(acceptableForms, function(i, form) {
                if (exampleForms[form] != null) {
                    examples.push(exampleForms[form]);
                }
            });

            var fallback = $(solution).data("fallback");

            return {
                validator: Khan.answerTypes.number.validatorCreator(solution),
                answer: function() {
                    return input.val().length > 0 ?
                        input.val() :
                        (fallback ? fallback : "");
                },
                solution: $.trim($(solution).text()),
                examples: examples,
                showGuess: function(guess) {
                    input.val(guess);
                }
            };
        },
        validatorCreator: function(solution) {
            var options = $.extend({
                simplify: "required",
                ratio: false,
                maxError: Math.pow(2, -42),
                forms: "literal, integer, proper, improper, mixed, decimal"
            }, $(solution).data());
            var acceptableForms = options.forms.split(/\s*,\s*/);

            var fractionTransformer = function(text) {
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

            var forms = {
                literal: function(text) {
                    // Prevent literal comparisons for decimal-looking-like strings
                    return [{ value: (/[^+-\u2212\d\.\s]/).test(text) ? text : null }];
                },

                integer: function(text) {
                    return forms.decimal(text);
                },

                proper: function(text) {
                    return $.map(fractionTransformer(text), function(o) {
                        if (Math.abs(o.value) < 1) {
                            return [o];
                        } else {
                            return [];
                        }
                    });
                },

                improper: function(text) {
                    return $.map(fractionTransformer(text), function(o) {
                        if (Math.abs(o.value) >= 1) {
                            return [o];
                        } else {
                            return [];
                        }
                    });
                },

                pi: function(text) {
                    var match, possibilities = [];

                    // Replace unicode minus sign with hyphen
                    text = text.replace(/\u2212/, "-");

                    // - pi
                    if (match = text.match(/^([+-]?)\s*(pi?|\u03c0|t(?:au)?|\u03c4)$/i)) {
                        possibilities = [{ value: parseFloat(match[1] + "1"), exact: true }];

                    // 5 / 6 pi
                    } else if (match = text.match(/^([+-]?\d+\s*(?:\/\s*[+-]?\d+)?)\s*\*?\s*(pi?|\u03c0|t(?:au)?|\u03c4)$/i)) {
                        possibilities = fractionTransformer(match[1]);

                    // 5 pi / 6
                    } else if (match = text.match(/^([+-]?\d+)\s*\*?\s*(pi?|\u03c0|t(?:au)?|\u03c4)\s*(?:\/\s*([+-]?\d+))?$/i)) {
                        possibilities = fractionTransformer(match[1] + "/" + match[3]);

                    // - pi / 4
                    } else if (match = text.match(/^([+-]?)\s*\*?\s*(pi?|\u03c0|t(?:au)?|\u03c4)\s*(?:\/\s*([+-]?\d+))?$/i)) {
                        possibilities = fractionTransformer(match[1] + "1/" + match[3]);

                    // 0
                    } else if (text === "0") {
                        possibilities = [{ value: 0, exact: true }];

                    // 0.5 pi (fallback)
                    } else if (match = text.match(/^(\S+)\s*\*?\s*(pi?|\u03c0|t(?:au)?|\u03c4)$/i)) {
                        possibilities = forms.decimal(match[1]);
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
                log: function(text) {
                    var match, possibilities = [];

                    // Replace unicode minus sign with hyphen
                    text = text.replace(/\u2212/, "-");
                    text = text.replace(/[ \(\)]/g, "");

                    if (match = text.match(/^log\s*(\S+)\s*$/i)) {
                        possibilities = forms.decimal(match[1]);
                    } else if (text === "0") {
                        possibilities = [{ value: 0, exact: true }];
                    }
                    return possibilities;
                },

                percent: function(text) {
                    text = $.trim(text);
                    var hasPercentSign = false;

                    if (text.indexOf("%") === (text.length - 1)) {
                        text = $.trim(text.substring(0, text.length - 1));
                        hasPercentSign = true;
                    }

                    var transformed = forms.decimal(text);
                    $.each(transformed, function(ix, t) {
                        t.exact = hasPercentSign;
                    });
                    return transformed;
                },

                dollar: function(text) {
                    text = $.trim(text.replace("$", ""));

                    return forms.decimal(text);
                },

                mixed: function(text) {
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
                        var simplified = num < denom && KhanUtil.getGCD(num, denom) === 1;

                        return [{
                            value: sign * (integ + num / denom),
                            exact: simplified
                        }];
                    }

                    return [];
                },

                decimal: function(text) {
                    var normal = function(text) {
                        var match = text

                            // Replace unicode minus sign with hyphen
                            .replace(/\u2212/, "-")

                            // Remove space after +, -
                            .replace(/([+-])\s+/g, "$1")

                            // Extract integer, numerator and denominator
                            // If commas or spaces are used, they must be in the "correct" places
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
                        text = text.replace(/([\.,])/g, function(_, c) { return (c === "." ? "," : "."); });
                        return normal(text);
                    };

                    return [
                        { value: normal(text), exact: true },
                        { value: commas(text), exact: true }
                    ];
                }
            };

            var correct = $.trim($(solution).text());
            var correctFloat = parseFloat(correct);

            return function(guess) {
                guess = $.trim(guess);
                var ret = false;

                $.each(acceptableForms, function(i, form) {
                    var transformed = forms[form](guess);

                    for (var j = 0, l = transformed.length; j < l; j++) {
                        var val = transformed[j].value;
                        var exact = transformed[j].exact;

                        if (typeof val === "string" &&
                                correct.toLowerCase() === val.toLowerCase()) {
                            ret = true;
                            return false; // break;
                        } if (typeof val === "number" &&
                                Math.abs(correctFloat - val) < options.maxError) {
                            if (exact || options.simplify === "optional") {
                                ret = true;
                            } else if (form === "percent") {
                                ret = inexactMessages.missingPercentSign;
                            } else {
                                ret = inexactMessages.unsimplified;
                            }

                            return false; // break;
                        }
                    }
                });

                return ret;
            };
        }
    },

    decimal: {
        setup: function(solutionarea, solution) {
            solution.data("forms", "decimal");
            return Khan.answerTypes.number.setup(solutionarea, solution);
        },
        validatorCreator: function(solution) {
            return Khan.answerTypes.number.validatorCreator(solution)
        }
    },

    rational: {
        setup: function(solutionarea, solution) {
            solution.data("forms", "decimal, proper, improper, mixed");
            return Khan.answerTypes.number.setup(solutionarea, solution);
        },
        validatorCreator: function(solution) {
            return Khan.answerTypes.number.validatorCreator(solution)
        }
    },

    // A little bit of a misnomer as proper fractions are also accepted
    improper: {
        setup: function(solutionarea, solution) {
            solution.data("forms", "integer, proper, improper");
            return Khan.answerTypes.number.setup(solutionarea, solution);
        },
        validatorCreator: function(solution) {
            return Khan.answerTypes.number.validatorCreator(solution)
        }
    },

    mixed: {
        setup: function(solutionarea, solution) {
            solution.data("forms", "integer, proper, mixed");
            return Khan.answerTypes.number.setup(solutionarea, solution);
        },
        validatorCreator: function(solution) {
            return Khan.answerTypes.number.validatorCreator(solution)
        }
    },

    regex: {
        setup: function(solutionarea, solution) {
            var input = $('<input type="text">');
            $(solutionarea).append(input);

            return {
                validator: Khan.answerTypes.regex.validatorCreator(solution),
                answer: function() {
                    return input.val().length > 0 ? input.val() : "";
                },
                solution: $.trim($(solution).text()),
                examples: [],
                showGuess: function(guess) {
                    input.val(guess);
                }
            };
        },
        validatorCreator: function(solution) {
            var correct = $.trim($(solution).text());

            return function(guess) {
                guess = $.trim(guess);
                return guess.match(correct) != null;
            };
        }
    },

    radical: {
        setup: function(solutionarea, solution) {
            var options = $.extend({
                simplify: "required"
            }, $(solution).data());
            var inte = $("<input type='text'>"), rad = $("<input type='text'>");
            solutionarea.addClass("radical")
                .append($("<span>").append(inte))
                .append('<span class="surd">&radic;</span>')
                .append($("<span>").append(rad).addClass("overline"));

            var ansSquared = parseFloat($(solution).text());
            var ans = KhanUtil.splitRadical(ansSquared);

            return {
                validator: Khan.answerTypes.radical.validatorCreator(solution),
                answer: function() {
                    return [
                        inte.val().length > 0 ? inte.val() : "1",
                        rad.val().length > 0 ? rad.val() : "1"
                    ];
                },
                solution: ans,
                examples: (options.simplify === "required") ?
                    ["a simplified radical, like <code>\\sqrt{2}</code> or <code>3\\sqrt{5}</code>"] :
                    ["a radical, like <code>\\sqrt{8}</code> or <code>2\\sqrt{2}</code>"],
                showGuess: function(guess) {
                    inte.val(guess ? guess[0] : "");
                    rad.val(guess ? guess[1] : "");
                }
            };
        },
        validatorCreator: function(solution) {
            var options = $.extend({
                simplify: "required"
            }, $(solution).data());
            var ansSquared = parseFloat($(solution).text());
            var ans = KhanUtil.splitRadical(ansSquared);

            return function(guess) {
                var inteGuess = parseFloat(guess[0]);
                var radGuess = parseFloat(guess[1]);

                var simplified = inteGuess === ans[0] && radGuess === ans[1];
                var correct = Math.abs(inteGuess) * inteGuess * radGuess === ansSquared;

                if (correct) {
                    if (simplified || options.simplify === "optional") {
                        return true;
                    } else {
                        return inexactMessages.unsimplified;
                    }
                } else {
                    return false;
                }
            };
        }
    },

    multiple: {
        setup: function(solutionarea, solution) {
            $(solutionarea).append($(solution).clone().contents().tmpl());

            var solutionArray = [];
            var answersArray = [];

            $(solutionarea).find(".sol").each(function() {
                var type = $(this).data("type");
                type = type != null ? type : "number";

                var sol = $(this).clone(),
                    solarea = $(this).empty();

                var validator = Khan.answerTypes[type].setup(solarea, sol);
                solutionArray.push(validator.solution);
                answersArray.push(validator.answer);
            });

            return {
                validator: Khan.answerTypes.multiple.validatorCreator(solution),
                answer: function() {
                    var answer = [];

                    $.each(answersArray, function(i, getAns) {
                        answer.push(getAns());
                    });

                    return answer;
                },
                solution: solutionArray,
                examples: [],
                showGuess: function(guess) {
                    input.val(guess);
                }
            };
        },
        validatorCreator: function(solution) {
            var validators = [];

            $(solution).find(".sol").each(function() {
                var sol = $(this);

                var type = sol.data("type");
                type = type != null ? type : "number";

                var validator = Khan.answerTypes[type].validatorCreator(sol);

                validators.push({
                    validator: validator,
                    required: sol.attr("required") != undefined
                });
            });

            return function(guess) {
                var valid = true;
                var missing_required_answer = false;
                var invalid_reason = "";

                $.each(guess, function(i, g) {
                    var pass = validators[i].validator(g);

                    if (pass === "" && validators[i].required) {
                        missing_required_answer = true;
                        return false;
                    } else if (typeof pass === "string") {
                        invalid_reason = pass;
                    } else {
                        valid = valid && pass;
                    }
                });

                if (missing_required_answer) {
                    return "";
                } else if (invalid_reason.length > 0) {
                    return invalid_reason;
                } else {
                    return valid;
                }
            };
        }
    },

    set: {
        setup: function(solutionarea, solution) {
            var showUnused = ($(solution).data("showUnused") === true);
            $(solutionarea).append(
                $(solution).find(".input-format").clone().contents().tmpl()
            );

            var inputArray = [];
            $(solutionarea).find(".entry").each(function() {
                var input = $(this), type = $(this).data("type");
                type = type != null ? type : "number";

                var validator = Khan.answerTypes[type]
                                    .setup(input, $(this).clone().empty());
                inputArray.push(validator.answer);
            });

            return {
                validator: Khan.answerTypes.set.validatorCreator(solution),
                answer: function() {
                    var answer = [];

                    $.each(inputArray, function(i, getAns) {
                        answer.push(getAns());
                    });

                    return answer;
                },
                solution: $.trim($(solution).text()),
                examples: [],
                showGuess: function(guess) {
                    input.val(guess);
                }
            };
        },
        validatorCreator: function(solution) {
            var validatorArray = [];

            // Fill validatorArray[] with validators for each acceptable answer
            $(solution).find(".set-sol").clone().each(function() {
                var type = $(this).data("type");
                type = type != null ? type : "number";

                var validator = Khan.answerTypes[type]
                                    .validatorCreator($(this));

                validatorArray.push(validator);
            });

            return function(guess) {
                var valid = true,
                    unusedValidators = validatorArray.slice(0);

                $.each(guess, function(i, g) {
                    var correct = false;

                    $.each(unusedValidators, function(i, validator) {
                        var pass = validator(g);

                        if (pass === true) {
                            unusedValidators.splice(i, 1);
                            correct = true;
                            return false;
                        }
                    });

                    if (!correct && $.trim([g].join("")) !== "") {
                        valid = false;
                        return false;
                    }

                    if (unusedValidators.length === 0) {
                        return false;
                    }
                });

                if (validatorArray.length > guess.length) {
                    if (unusedValidators.length >
                        validatorArray.length - guess.length) {
                        valid = false;
                    }
                } else if (unusedValidators.length > 0) {
                    valid = false;
                }

                return valid;
            };
        }
    },

    radio: {
        setup: function(solutionarea, solution) {
            var extractRawCode = function(solution) {
                return $(solution).clone()
                    .find(".MathJax").remove().end()
                    .find("code").removeAttr("id").end()
                    .html();
            };

            var list = $("<ul></ul>");
            list.on("click", "input:radio", function() {
                $(this).focus();
            });
            $(solutionarea).append(list);

            // Get all of the wrong choices
            var choices = $(solution).siblings(".choices");

            var solutionClone = $(solution).clone();

            // Set number of choices equal to all wrong plus one correct
            var numChoices = choices.children().length + 1;
            // Or set number as specified
            if (choices.data("show")) {
                numChoices = parseFloat(choices.data("show"));
            }

            // Optionally include none of the above as a choice
            var showNone = choices.data("none");
            var noneIsCorrect = false;
            if (showNone) {
                noneIsCorrect = KhanUtil.rand(numChoices) === 0;
                numChoices -= 1;
            }

            // If a category exercise, the correct answer is already included in .choices
            // and choices are always presented in the same order
            var isCategory = choices.data("category");
            var possibleChoices = choices.children().get();
            if (isCategory) {
                numChoices -= 1;
            } else {
                possibleChoices = KhanUtil.shuffle(possibleChoices);
            }

            // Add the correct answer
            if (!noneIsCorrect && !isCategory) {
                $(solutionClone).data("correct", true);
            }

            // Insert correct answer as first of possibleChoices
            if (!isCategory) {
                possibleChoices.splice(0, 0, $(solutionClone));
            }

            var dupes = {};
            var shownChoices = [];
            var solutionTextSquish = solutionClone.text().replace(/\s+/g, "");
            for (var i = 0; i < possibleChoices.length &&
                                shownChoices.length < numChoices; i++) {
                var choice = $(possibleChoices[i]);
                choice.runModules();
                var choiceTextSquish = choice.text().replace(/\s+/g, "");

                if (isCategory && solutionTextSquish === choiceTextSquish) {
                    choice.data("correct", true);
                }

                if (!dupes[choiceTextSquish]) {
                    dupes[choiceTextSquish] = true;

                    // i == 0 is the solution except in category mode; skip it
                    // when none is correct
                    if (!(noneIsCorrect && i === 0) || isCategory) {
                        shownChoices.push(choice);
                    }
                }
            }

            if (shownChoices.length < numChoices) {
                return false;
            }

            if (!isCategory) {
                shownChoices = KhanUtil.shuffle(shownChoices);
            }

            if (showNone) {
                var none = $("<span>None of the above.</span>");

                if (noneIsCorrect) {
                    none.data("correct", true);
                    solutionText = none.text();
                    list.data("real-answer",
                            $(solutionClone)
                                .runModules()
                                .contents()
                                .wrapAll('<span class="value""></span>')
                                .parent());
                }

                shownChoices.push(none);
            }

            $.each(shownChoices, function(i, choice) {
                if (choice.data("correct")) {
                    correctIndex = i + "";
                }
                choice.contents()
                    .wrapAll('<li><label><span class="value"></span></label></li>')
                    .parent()
                    .before('<input type="radio" name="solution" value="' + i + '">')
                    .parent().parent()
                    .appendTo(list);
            });

            return {
                validator: Khan.answerTypes.radio.validatorCreator(solution),
                answer: function() {
                    var choice = list.find("input:checked");

                    var choiceVal = choice.siblings(".value");

                    return [extractRawCode(choiceVal),
                            choice.val(),
                            noneIsCorrect];
                },
                solution: $.trim($(solution).text()),
                examples: [],
                showGuess: function(guess) {
                    input.val(guess);
                }
            };
        },
        validatorCreator: function(solution) {
            var extractRawCode = function(solution) {
                return $(solution).clone()
                    .find(".MathJax").remove().end()
                    .find("code").removeAttr("id").end()
                    .html();
            };
            var correct = extractRawCode(solution);

            return function(guess) {
                if (guess[2] && guess[0] === "None of the above.") {
                    // Hacky stuff to make the correct solution appear when
                    // "none of the above" is the correct answer
                    var solutionarea = $("#solutionarea");
                    var list = solutionarea.find("ul");
                    var choice = list.children().find("[value="+guess[1]+"]");
                    choice.next().fadeOut("fast", function() {
                            $(this).replaceWith(list.data("real-answer"))
                                .fadeIn("fast");
                        });
                    return true;
                } else if (guess[0] === correct) {
                    return true;
                }

                return false;
            };
        }
    },

    list: {
        setup: function(solutionarea, solution) {
            var input = $("<select></select>");
            $(solutionarea).append(input);

            var choices = $.tmpl.getVAR($(solution).data("choices"));

            $.each(choices, function(index, value) {
                input.append('<option value="' + value + '">'
                    + value + "</option>");
            });

            return {
                validator: Khan.answerTypes.list.validatorCreator(solution),
                answer: function() {
                    return input.val();
                },
                solution: $.trim($(solution).text()),
                examples: [],
                showGuess: function(guess) {
                    input.val(guess);
                }
            };
        },
        validatorCreator: function(solution) {
            var correct = $.trim($(solution).text());

            return function(guess) {
                guess = $.trim(guess);
                return correct === guess;
            };
        }
    },

    custom: {
        setup: function(solutionarea, solution) {
            solution.find(".instruction").clone().appendTo(solutionarea).tmpl();

            var guessCode = solution.find(".guess").text();

            return {
                validator: Khan.answerTypes.custom.validatorCreator(solution),
                answer: function() {
                    return KhanUtil.tmpl.getVAR(guessCode,
                                                KhanUtil.currentGraph);
                },
                solution: $.trim($(solution).text()),
                examples: solution.find(".example").map(function(i, el) {
                    return $(el).html();
                }),
                showGuess: function(guess) {
                    input.val(guess);
                }
            };
        },
        validatorCreator: function(solution) {
            var validatorCode = $(solution).find(".validator-function").text();

            var validator = function(guess) {
                var code = "(function() { " +
                                "var guess = " + JSON.stringify(guess) + ";" +
                                validatorCode +
                            "})()";
                return KhanUtil.tmpl.getVAR(code, KhanUtil.currentGraph);
            };

            return function(guess) {
                return validator(guess);
            };
        }
    },

    primeFactorization: {
        setup: function(solutionarea, solution) {
            var input = $('<input type="text">');
            $(solutionarea).append(input);

            var fallback = $(solution).data("fallback");

            return {
                validator: Khan.answerTypes
                               .primeFactorization.validatorCreator(solution),
                answer: function() {
                    return input.val().length > 0 ?
                        input.val() :
                        (fallback ? fallback : "");
                },
                solution: $.trim($(solution).text()),
                examples: [
                    "a product of prime factors, like <code>2 \\times 3</code>",
                    "a single prime number, like <code>5</code>"
                ],
                showGuess: function(guess) {
                    input.val(guess);
                }
            };
        },
        validatorCreator: function(solution) {
            var correct = $.trim($(solution).text());

            return function(guess) {
                guess = guess.split(" ").join("").toLowerCase();
                guess = KhanUtil.sortNumbers(guess.split(/x|\*|\u00d7/)).join("x");
                console.log(guess);
                return guess === correct;
            };
        }
    }
});

})();
