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
                solutionArray.unshift(validator.solution);
                answersArray.unshift(validator.answer);
            });

            return {
                validator: Khan.answerTypes.multiple.validatorCreator(solution),
                answer: function() {
                    var answer = [];

                    $.each(answersArray, function(i, getAns) {
                        answer.unshift(getAns());
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
    }

    // UNUSED
    //graphic: function(solutionarea, solution, fallback) {
            //var verifier = function(correct, guess) {
                    //return Math.abs(correct - guess) < 0.3;
                //};
        //return Khan.answerTypes.text(solutionarea, solution, fallback, verifier);
    //},

    // UNUSED
    //line: function(solutionarea, solution, fallback) {

        //var verifier = function(correct, guess) {
            //var result = true;
            //for (var i = 0; i < 5; i++) {
                //var sampleX = KhanUtil.randRange(-100, 100);
                //if (guess.match(/[A-W]|[a-w]|[y-z]|[Y-Z]/) !== null) {
                    //return false;
                //}

                //var newGuess = guess
                        //.replace(/\u2212/, "-")
                        //.replace(/(\d)(x)/, "$1 * $2")
                        //.replace("x", sampleX)
                        //.replace(/(\d)(\()/, "$1 * $2");
                //var newCorrect = correct
                        //.replace(/(\d)(x)/, "$1 * $2")
                        //.replace("x", sampleX)
                        //.replace(/(\d)(\()/, "$1 * $2")
                        //.replace(/-\s?-/, "");
                //result = result && (eval(newCorrect) === eval(newGuess));
            //}
            //return result;
        //};
        //verifier.examples = "An equation of a line, like 3(x+1)/2 or 2x + 1";
        //return Khan.answerTypes.text(solutionarea, solution, fallback, verifier);

    //},




    //set: function(solutionarea, solution) {
        //var solutionarea = $(solutionarea),
            //showUnused = ($(solution).data("showUnused") === true);
        //solutionarea.append($(solution).find(".input-format").clone().contents().tmpl());

        //var validatorArray = [],
            //solutionArray = [],
            //inputArray = [];
            //checkboxArray = [];

        //// Fill validatorArray[] with validators for each acceptable answer
        //$(solution).find(".set-sol").clone().each(function() {
            //var type = $(this).data("type");
            //type = type != null ? type : "number";
            //// We don't want the validators to build the solutionarea. The point
            //// here is to decouple the UI from the validator. Passing null
            //// generally works.
            //var solarea = null;
            //if (type == "multiple") {
                //// Multiple is special. It has dragons that don't like null. This distracts them.
                //solarea = $(this).clone().empty();
            //}
            //var sol = $(this).clone(),
                //fallback = sol.data("fallback"),
                //validator = Khan.answerTypes[type](solarea, sol, fallback);

            //validatorArray.push(validator);
            //solutionArray.push(validator.solution);
        //});


        //// Create throwaway validators for each "entry" on the answer form
        //// and store the resulting UI fragments in inputArray[]
        //solutionarea.find(".entry").each(function() {
            //var input = $(this),
                //type = $(this).data("type");
            //type = type != null ? type : "number";

            //// We're just using this validator to paint the UI, so we pass it a bogus solution.
            //Khan.answerTypes[type](input, $(this).clone().empty(), null);
            //inputArray.push($(input).find(":input"));
        //});

        //// Also keep track of any checkboxes
        //solutionarea.find(".checkbox").each(function() {
            //var sol = $(this).clone();
            //var solarea = $(this).empty(),
                //input = $('<input type="checkbox"/>');
            //solarea.append(input);
            //var solution = KhanUtil.tmpl.getVAR(sol.text());
            //$(input).data("solution", solution);
            //checkboxArray.push(input);
            //solutionArray.push(solution);
        //});

        //var ret = function() {
            //var valid = true,
                //// Make a copy of the validators, so we can delete each as it's used
                //unusedValidators = validatorArray.slice(0),
                //allguesses = [];

            //// iterate over each input area
            //$(inputArray).each(function() {
                //var guess = [],
                    //correct = false,
                    //validatorIdx = 0;

                //// Scrape the raw inputs out of the UI elements
                //$(this).each(function() {
                    //guess.push($(this).val());
                //});

                //if (guess.length == 1) {
                    //allguesses.push(guess[0]);
                //} else {
                    //allguesses.push(guess);
                //}

                //// Iterate over each validator
                //while (validatorIdx < unusedValidators.length && !correct) {
                    //// Push the actual guess into the validator's hidden input
                    //unusedValidators[validatorIdx].showGuess(guess);
                    //// And validate it
                    //correct = unusedValidators[validatorIdx]();
                    //++validatorIdx;
                //}

                //if (correct) {
                    //// remove the matching validator from the list so duplicate inputs don't match
                    //unusedValidators.splice(validatorIdx - 1, 1);
                //} else if ($.trim(guess.join("")) !== "") {
                    //// Not correct and not empty; the entire answer is wrong :(
                    //valid = false;
                //}

            //});

            //if ((validatorArray.length > inputArray.length)) {
                //// if there are more valid answers than inputs, make sure that as many answers as possible were entered
                //if (unusedValidators.length > validatorArray.length - inputArray.length) {
                    //valid = false;
                //}
            //// otherwise, make sure every possible answer was entered
            //} else if (unusedValidators.length > 0) {
                //valid = false;
            //}

            //// now check that all the checkboxes are selected appropriately
            //$(checkboxArray).each(function() {
                //var guess = $(this).is(":checked"),
                    //answer = $(this).data("solution"),
                    //label_text = $(this).closest("label").text();
                //if (label_text === "") {
                    //label_text = "checked";
                //}
                //// un-checked boxes are recorded as "" to prevent the question from
                //// being graded if submit is clicked before anything is entered
                //allguesses.push(guess ? label_text : "");
                //if (guess != answer) {
                    //valid = false;
                //}
            //});

            //ret.guess = allguesses;

            //// If data-show-unused="true" is set and the question was answered correctly,
            //// show the list of additional answers (if any) that would also have been accepted.
            ////
            //// TODO: Ideally this should be shown below the green button so the button doesn't jump around.
            ////       perhaps reuse the check-answer-message area
            //if (showUnused && valid && unusedValidators.length) {
                //var otherSolutions = $("<p>").appendTo(solutionarea);
                //$(unusedValidators).each(function(i, el) {
                    //other_solution = el.solution;
                    //if (i > 0) {
                        //$("<span>").text(" and ").appendTo(otherSolutions);
                    //}
                    //$.each(other_solution, function(i, el) {
                        //if ($.isArray(el)) {
                            //var subAnswer = $("<span>").appendTo(otherSolutions);
                            //$.each(el, function(i, el) {
                                //$("<span>").text(el + " ").appendTo(subAnswer);
                            //});
                        //} else {
                            //$("<span> ").text(el + " ").appendTo(otherSolutions);
                        //}
                    //});
                //});
                //if (unusedValidators.length == 1) {
                    //$("<span>").text(" is also correct").appendTo(otherSolutions);
                //} else {
                    //$("<span>").text(" are also correct").appendTo(otherSolutions);
                //}
            //}

            //return valid;
        //};

        //ret.showGuess = function(guess) {
            //guess = $.extend(true, [], guess);
            //$(inputArray).each(function() {
                //var item = guess.shift();
                //if (item instanceof Array) {
                    //$(this).each(function() {
                        //$(this).val(item.shift());
                    //});
                //} else {
                    //this.val(item);
                //}
            //});
            //solutionarea.find(".checkbox input:checkbox").each(function() {
                //var ans = guess.shift();
                //$(this).attr("checked", ans !== undefined && ans !== "");
            //});
        //};

        //ret.examples = solution.find(".example").remove()
            //.map(function(i, el) {
                //return $(el).html();
            //});
        //ret.solution = solutionArray;

        //return ret;
    //},

    //radio: function(solutionarea, solution) {
        //var extractRawCode = function(solution) {
            //return $(solution).find(".value").clone()
                //.find(".MathJax").remove().end()
                //.find("code").removeAttr("id").end()
                //.html();
        //};
        //// Without this we get numbers twice and things sometimes
        //var solutionText = extractRawCode(solution);

        //var list = $("<ul></ul>");
        //list.on("click", "input:radio", function() {
            //$(this).focus();
        //});
        //$(solutionarea).append(list);

        //// Get all of the wrong choices
        //var choices = $(solution).siblings(".choices");

        //// Set number of choices equal to all wrong plus one correct
        //var numChoices = choices.children().length + 1;
        //// Or set number as specified
        //if (choices.data("show")) {
            //numChoices = parseFloat(choices.data("show"));
        //}

        //// Optionally include none of the above as a choice
        //var showNone = choices.data("none");
        //var noneIsCorrect = false;
        //if (showNone) {
            //noneIsCorrect = KhanUtil.rand(numChoices) === 0;
            //numChoices -= 1;
        //}

        //// If a category exercise, the correct answer is already included in .choices
        //// and choices are always presented in the same order
        //var isCategory = choices.data("category");
        //var possibleChoices = choices.children().get();
        //if (isCategory) {
            //numChoices -= 1;
        //} else {
            //possibleChoices = KhanUtil.shuffle(possibleChoices);
        //}

        //// Add the correct answer
        //if (!noneIsCorrect && !isCategory) {
            //$(solution).data("correct", true);
        //}

        //// Insert correct answer as first of possibleChoices
        //if (!isCategory) {
            //possibleChoices.splice(0, 0, solution);
        //}

        //var dupes = {};
        //var shownChoices = [];
        //var solutionTextSquish = solution.text().replace(/\s+/g, "");
        //for (var i = 0; i < possibleChoices.length && shownChoices.length < numChoices; i++) {
            //var choice = $(possibleChoices[i]);
            //choice.runModules();
            //var choiceTextSquish = choice.text().replace(/\s+/g, "");

            //if (isCategory && solutionTextSquish === choiceTextSquish) {
                //choice.data("correct", true);
            //}

            //if (!dupes[choiceTextSquish]) {
                //dupes[choiceTextSquish] = true;

                //// i == 0 is the solution except in category mode; skip it when none is correct
                //if (!(noneIsCorrect && i === 0) || isCategory) {
                    //shownChoices.push(choice);
                //}
            //}
        //}

        //if (shownChoices.length < numChoices) {
            //return false;
        //}

        //if (!isCategory) {
            //shownChoices = KhanUtil.shuffle(shownChoices);
        //}

        //if (showNone) {
            //var none = $("<span>None of the above.</span>");

            //if (noneIsCorrect) {
                //none.data("correct", true);
                //solutionText = none.text();
                //list.data("real-answer",
                        //$(solution).runModules()
                            //.contents()
                            //.wrapAll('<span class="value""></span>')
                            //.parent());
            //}

            //shownChoices.push(none);
        //}

        //var correctIndex = -1;

        //$.each(shownChoices, function(i, choice) {
            //if (choice.data("correct")) {
                //correctIndex = i + "";
            //}
            //choice.contents().wrapAll('<li><label><span class="value"></span></label></li>')
                //.parent().before('<input type="radio" name="solution" value="' + i + '">')
                //.parent().parent()
                //.appendTo(list);
        //});

        //var ret = function() {
            //var choice = list.find("input:checked");

            //if (noneIsCorrect && choice.val() === correctIndex) {
                //choice.next()
                    //.fadeOut("fast", function() {
                        //$(this).replaceWith(list.data("real-answer"))
                            //.fadeIn("fast");
                    //});
            //}

            //ret.guess = $.trim(extractRawCode(choice.closest("li")));

            //return choice.val() === correctIndex;
        //};

        //ret.solution = $.trim(solutionText);
        //ret.showGuess = function(guess) {
            //list.find("input:checked").prop("checked", false);

            //var li = list.children().filter(function() {
                //return $.trim(extractRawCode(this)) === guess;
            //});
            //li.find("input[name=solution]").prop("checked", true);
        //};
        //return ret;
    //},

    //list: function(solutionarea, solution) {
        //var input = $("<select></select>");
        //$(solutionarea).append(input);

        //var choices = $.tmpl.getVAR($(solution).data("choices"));

        //$.each(choices, function(index, value) {
            //input.append('<option value="' + value + '">'
                //+ value + "</option>");
        //});

        //var correct = $(solution).text();

        //var verifier = function(correct, guess) {
            //correct = $.trim(correct);
            //guess = $.trim(guess);
            //return correct === guess;
        //};

        //var ret = function() {
            //ret.guess = input.val();

            //return verifier(correct, ret.guess);
        //};

        //ret.solution = $.trim(correct);

        //ret.showGuess = function(guess) {
            //input.val(guess);
        //};

        //return ret;
    //},

    //primeFactorization: function(solutionarea, solution, fallback) {
        //var verifier = function(correct, guess) {
            //guess = guess.split(" ").join("").toLowerCase();
            //guess = KhanUtil.sortNumbers(guess.split(/x|\*|\u00d7/)).join("x");
            //return guess === correct;
        //};
        //verifier.examples = [
            //"a product of prime factors, like <code>2 \\times 3</code>",
            //"a single prime number, like <code>5</code>"
        //];

        //return Khan.answerTypes.text(solutionarea, solution, fallback, verifier);
    //},

    //// The user is asked to enter the separate parts of a complex number in 2 textboxes.
    //// Expected solution: [real part, imaginary part]
    //complexNumberSeparate: function(solutionarea, solution) {
        //solutionarea = $(solutionarea);

        //var json = typeof solution === "object" ? $(solution).text() : solution;
        //var correct = eval(json);

        //var solutionArray = [];

        //var realArea = $("<p />").html("Real part: ");
        //var realControl = $('<span data-inexact data-max-error="0.01" />').html(correct[0]);
        //var realValidator = Khan.answerTypes["number"](realArea, realControl, 0);

        //var imagArea = $("<p />").html("Imaginary part: ");
        //var imagControl = $('<span data-inexact data-max-error="0.01" />').html(correct[1]);
        //var imagValidator = Khan.answerTypes["number"](imagArea, imagControl, 0);

        //var area = $("<div />");
        //area.append(realArea).append(imagArea).tmpl();
        //area.find("input").css("width", "50px");
        //solutionarea.append(area);

        //var ret = function() {
            //var valid = true;
            //var guess = [];
            //if (realValidator != null) {
                //valid = realValidator() && valid;
                //guess.push(realValidator.guess);
            //}
            //if (imagValidator != null) {
                //valid = imagValidator() && valid;
                //guess.push(imagValidator.guess);
            //}
            //ret.guess = guess;
            //return valid;
        //};

        //ret.showGuess = function(guess) {
            //realValidator.showGuess(guess[0]);
            //imagValidator.showGuess(guess[1]);
        //};

        //ret.examples = [
            //"the separate parts of a complex number (<code>5.3 - 3i</code> has real part 5.3 and imaginary part -3)"
        //];

        //ret.solution = [realValidator.solution, imagValidator.solution];

        //return ret;
    //},

    //// To be used with ComplexPolarForm in graphie-helpers.js
    //// (see The complex plane for an example)
    //// The solution argument is expected to be [angle, magnitude]
    //complexNumberPolarForm: function(solutionarea, solution) {
        //var isTimeline = !(solutionarea.attr("id") === "solutionarea" || solutionarea.parent().attr("id") === "solutionarea");
        //solutionarea = $(solutionarea);

        //var json = typeof solution === "object" ? $(solution).text() : solution;
        //var correct = eval(json);
        //var table = $("<table />");
        //var row = $("<tr />");
        //row.append('<td style="width: 100px">\n' +
            //'Radius: <span id="current-radius"><code>1</code></span>\n' +
            //"</td>")
            //.append("<td>\n" +
            //'<input type="button" class="simple-button mini-button" value="+" onclick="updateComplexPolarForm( 0, 1 )" />\n' +
            //'<input type="button" class="simple-button mini-button" style="margin-left: 5px;" value="-" onclick="updateComplexPolarForm( 0, -1 )" />\n' +
            //"</td>").tmpl();
        //table.append(row);

        //row = $("<tr />");
        //row.append('<td style="width: 100px">\n' +
            //'Angle: <span id="current-angle"><code>0</code></span>\n' +
            //"</td>")
            //.append("<td>\n" +
            //'<input type="button" class="simple-button mini-button" value="+" onclick="updateComplexPolarForm( 1, 0 )" />\n' +
            //'<input type="button" class="simple-button mini-button" style="margin-left: 5px;" value="-" onclick="updateComplexPolarForm( -1, 0 )" />\n' +
            //"</td>").tmpl();
        //table.append(row);

        //var numberLabel = $('<p id="number-label" style="margin: 8px 0 2px 0" />');
        //var guessCorrect = false;

        //var validator = function(guess) {
            //return (guess[0] === correct[0]) && (guess[1] === correct[1]);
        //};

        //solutionarea.append(table, numberLabel);
        //redrawComplexPolarForm();

        //var ret = function() {
            //var cplx = KhanUtil.currentGraph.graph.currComplexPolar;
            //ret.guess = [cplx.getAngleNumerator(), cplx.getRadius()];

            //if (isTimeline) {
                //return guessCorrect;
            //} else {
                //return validator(ret.guess);
            //}
        //};

        //ret.showGuess = function(guess) {
            //if (typeof guess === "undefined") {
                //guess = [0, 1]; // magic: default complex polar form value
            //}
            //if (isTimeline) {
                //guessCorrect = validator(guess);
                //$(solutionarea).empty();
                //$(solutionarea).append(guessCorrect === true ? "Answer correct" : "Answer incorrect");
            //} else {
                //redrawComplexPolarForm(guess[0], guess[1]);
            //}
        //};

        //ret.showCustomGuess = function(guess) {
            //var code = "(function() { var guess = " + (JSON.stringify(guess) || "[]") + ";" +
                //"graph.currComplexPolar.update( guess[0], guess[1] );" +
                //"})()";
            //KhanUtil.tmpl.getVAR(code, KhanUtil.currentGraph);
        //};

        //ret.solution = solution;

        //return ret;
    //},

    //custom: function(solutionarea, solution) {
        //var isTimeline = !(solutionarea.attr("id") === "solutionarea" || solutionarea.parent().attr("id") === "solutionarea");
        //var guessCorrect = false;
        //solution.find(".instruction").appendTo(solutionarea);
        //var guessCode = solution.find(".guess").text();

        //var validatorCode = solution.find(".validator-function").text();
        //var validator = function(guess) {
            //var code = "(function() { var guess = " + JSON.stringify(guess) + ";" + validatorCode + "})()";
            //return KhanUtil.tmpl.getVAR(code, KhanUtil.currentGraph);
        //};

        //ret = function() {
            //ret.guess = KhanUtil.tmpl.getVAR(guessCode, KhanUtil.currentGraph);
            //if (isTimeline) {
                //return guessCorrect;
            //} else {
                //var result = validator(ret.guess);
                //if (result === "") {
                    //ret.guess = "";
                //}
                //return result;
            //}
        //};

        //ret.examples = solution.find(".example").map(function(i, el) {
            //return $(el).html();
        //});
        //ret.solution = "custom";
        //var showGuessSolutionCode = $(solution).find(".show-guess-solutionarea").text() || "";
        //ret.showGuess = function(guess) {
            //if (isTimeline) {
                //guessCorrect = validator(guess);
                //$(solutionarea).empty();
                //$(solutionarea).append(guessCorrect === true ? "Answer correct" : "Answer incorrect");
            //} else {
                //var code = "(function() { var guess = " + (JSON.stringify(guess) || "[]") + ";" + showGuessSolutionCode + "})()";
                //KhanUtil.tmpl.getVAR(code, KhanUtil.currentGraph);
            //}
        //};

        //var showGuessCode = $(solution).find(".show-guess").text();
        //ret.showCustomGuess = function(guess) {
            //var code = "(function() { var guess = " + JSON.stringify(guess) + ";" + showGuessCode + "})()";
            //KhanUtil.tmpl.getVAR(code, KhanUtil.currentGraph);
        //};

        //return ret;
    //}
});

})();
