$.extend(KhanUtil, {
    addCongruency: function(options) {
        var congruency = $.extend(true, {
            x1: 0,
            x2: 10,
            y1: 0,
            y2: 3
        }, options);

        // ensure that x1 < x2, y1 < y2
        if (congruency.x1 > congruency.x2) {
            var hold = congruency.x1;
            congruency.x1 = congruency.x2;
            congruency.x2 = hold;
        }
        if (congruency.y1 > congruency.y2) {
            var hold = congruency.y1;
            congruency.y1 = congruency.y2;
            congruency.y2 = hold;
        }

        var graph = KhanUtil.currentGraph;

        congruency.lines = {};
        congruency.angles = {};
        congruency.points = {};

        congruency.addLine = function(options) {
            var line = $.extend(true, {
                startPt: "",
                endPt: "",
                start: [0, 0],
                extend: true,
                clickable: false,
                state: 0,
                max: 1,
                tickDiff: 0.15,
                tickLength: 0.2
            }, options);

            if (line.end != null) {
                line.radAngle = Math.atan2(line.end[1] - line.start[1],
                                           line.end[0] - line.start[0]);
                line.angle = KhanUtil.toDegrees(line.radAngle);
            } else if (line.angle != null) {
                line.radAngle = KhanUtil.toRadians(line.angle);
                line.end = [Math.cos(line.radAngle) + line.start[0],
                            Math.sin(line.radAngle) + line.start[1]];
            }

            line.slope = (line.end[1] - line.start[1]) /
                         (line.end[0] - line.start[0]);

            line.slope = Math.max(-999999, Math.min(999999, line.slope));

            line.func = function(x) {
                return line.start[1] + line.slope * (x - line.start[0]);
            };

            line.invfunc = function(y) {
                return line.start[0] + (y - line.start[1]) / line.slope;
            };

            if (line.extend === true) {
                var y1int = line.func(congruency.x1);

                if (y1int >= congruency.y1 && y1int <= congruency.y2) {
                    line.start = [congruency.x1, y1int];
                } else if (y1int > congruency.y2) {
                    line.start = [line.invfunc(congruency.y2), congruency.y2];
                } else {
                    line.start = [line.invfunc(congruency.y1), congruency.y1];
                }

                var y2int = line.func(congruency.x2);

                if (y2int >= congruency.y1 && y2int <= congruency.y2) {
                    line.end = [congruency.x2, y2int];
                } else if (y2int > congruency.y2) {
                    line.end = [line.invfunc(congruency.y2), congruency.y2];
                } else {
                    line.end = [line.invfunc(congruency.y1), congruency.y1];
                }
            }

            line.draw = function() {
                if (this.line != null) {
                    this.line.remove();
                }

                this.line = graph.raphael.set();

                var startDiff = this.tickDiff * (this.state - 1) / 2;

                var direction = [Math.cos(this.radAngle), Math.sin(this.radAngle)];
                var normalDir = [-direction[1]*this.tickLength,
                                  direction[0]*this.tickLength];

                var midpoint = [(this.start[0] + this.end[0]) / 2,
                                (this.start[1] + this.end[1]) / 2];

                var startPos = [midpoint[0] - startDiff * direction[0],
                                midpoint[1] - startDiff * direction[1]];

                for (var curr = 0; curr < this.state; curr += 1) {
                    var currPos = [startPos[0] + curr * direction[0] * this.tickDiff,
                                   startPos[1] + curr * direction[1] * this.tickDiff];
                    var start = [currPos[0] + normalDir[0],
                                 currPos[1] + normalDir[1]];
                    var end = [currPos[0] - normalDir[0],
                               currPos[1] - normalDir[1]];

                    this.line.push(graph.line(start, end));
                }

                this.line.push(graph.line(this.start, this.end));

                this.point.visibleShape = this.line;
            };

            var pointPos = [(line.start[0] + line.end[0]) / 2,
                            (line.start[1] + line.end[1]) / 2];

            line.point = KhanUtil.addMovablePoint({
                coord: pointPos
            });
            // Make it not move
            line.point.onMove = function(x, y) {
                return pointPos;
            };

            line.point.mouseTarget.attr({ r: graph.scale[0]/2 });

            line.point.visibleShape.remove();

            line.point.visibleShape = line.line;

            if (!line.clickable) {
                line.point.mouseTarget.remove();
            }

            line.normal = {
                stroke: "black",
                "stroke-width": 2
            };
            line.highlight = {
                stroke: "black",
                "stroke-width": 3
            };

            line.point.normalStyle = line.normal;
            line.point.highlightStyle = line.highlight;

            line.draw();

            line.set = function(state) {
                this.state = state;

                this.draw();
            };

            line.click = function(event) {
                line.set((line.state === line.max) ? 0 : line.state + 1);
            };

            if (line.clickable) {
                $(line.point.mouseTarget[0]).bind("vmouseup", line.click);
            }

            return line;
        };

        congruency.intersect = function(line1, line2, options) {
            var ang = $.extend(true, {
                line1: line1,
                line2: line2,
                radius: 0.6,
                show: [true, true, true, true],
                states: 1,
                point: ""
            }, options);

            if (ang.line1.slope === ang.line2.slope) {
                return false;
            }

            ang.coord = [0, 0];

            ang.coord[0] = (ang.line1.slope * ang.line1.start[0]
                            - ang.line2.slope * ang.line2.start[0]
                            + ang.line2.start[1] - ang.line1.start[1]) /
                           (ang.line1.slope - ang.line2.slope);
            ang.coord[1] = ang.line1.func(ang.coord[0]);

            ang.addArc = function(pos, radius, start, end) {
                var arc = {
                    pos: pos,
                    radius: radius,
                    start: start,
                    end: end,
                    state: 0,
                    max: ang.states,
                    shown: false,
                    stuck: false,
                    stateDiff: 0.15
                };

                if (arc.start > arc.end) {
                    var hold = arc.start;
                    arc.start = arc.end;
                    arc.end = hold;
                }

                arc.angle = arc.end - arc.start;

                // Add a movable point for clicking
                var aveAngle = KhanUtil.toRadians((arc.start + arc.end) / 2);

                var pointPos = arc.pos.slice();
                pointPos[0] += Math.cos(aveAngle) * arc.radius;
                pointPos[1] += Math.sin(aveAngle) * arc.radius;

                arc.point = KhanUtil.addMovablePoint({
                    coord: pointPos
                });
                // Make it not move
                arc.point.onMove = function(x, y) {
                    return false;
                };

                // Make a clicky pointer
                $(arc.point.mouseTarget[0]).css("cursor", "pointer");

                // Increase the point's size
                var pointRadius = Math.sin(KhanUtil.toRadians(arc.angle) / 2)
                                  * arc.radius * graph.scale[0];
                arc.point.mouseTarget.attr({ r: pointRadius });

                // Replace the shape with our arc
                arc.point.visibleShape.remove();

                // Styles for different mouse-over states
                // TODO: come up with a way to set different styles
                // for normal/highlight
                arc.unsetNormal = {
                    stroke: KhanUtil.GRAY,
                    "stroke-width": 2,
                    opacity: 0.1
                };
                arc.unsetHighlight = {
                    stroke: KhanUtil.GRAY,
                    "stroke-width": 2,
                    opacity: 0.4
                };
                arc.setNormal = {
                    stroke: KhanUtil.BLUE,
                    "stroke-width": 3,
                    opacity: 0.9
                };
                arc.setHighlight = {
                    stroke: KhanUtil.BLUE,
                    "stroke-width": 3,
                    opacity: 1.0
                };

                // Set the default styles
                arc.point.normalStyle = arc.unsetNormal;
                arc.point.highlightStyle = arc.unsetHighlight;

                // Draw the arc(s)
                arc.draw = function() {
                    // Remove any left over arcs
                    if (this.arc != null) {
                        this.arc.remove();
                    }

                    // Count how many arcs there should be
                    var arcs = (this.state === 0) ? 1 : this.state;
                    var startRad = this.radius - this.stateDiff * (arcs - 1) / 2;

                    // Create a raphael set
                    this.arc = graph.raphael.set();

                    // Put all the arcs in the set
                    for (var curr = 0; curr < arcs; curr += 1) {
                        var currRad = startRad + this.stateDiff * curr;
                        this.arc.push(graph.arc(this.pos, currRad,
                                                this.start, this.end));
                    }
                    // Attach it and style correctly
                    this.point.visibleShape = this.arc;
                    this.arc.attr(this.point.normalStyle);
                };

                // Ensure the arc gets drawn on creation
                arc.draw();

                // Set the state of an arc
                arc.set = function(state) {
                    arc.state = state;

                    if (arc.state === 0) {
                        arc.point.normalStyle = arc.unsetNormal;
                        arc.point.highlightStyle = arc.unsetHighlight;
                    } else {
                        arc.point.normalStyle = arc.setNormal;
                        arc.point.highlightStyle = arc.setHighlight;
                    }

                    arc.draw();
                }

                // Function called upon clicking
                arc.click = function(event) {
                    arc.set((arc.state === arc.max) ? 0 : arc.state + 1);
                };

                // Bind mouseclick
                $(arc.point.mouseTarget[0]).bind("vmouseup", arc.click);

                // Make an arc stick in its current state
                // by removing the clicky part
                arc.stick = function() {
                    $(arc.point.mouseTarget[0]).unbind();
                    this.point.mouseTarget.remove();
                };

                // Set the style of arcs when unset
                arc.styleUnset = function(options) {
                    $.extend(true, this.unsetNormal, options);
                    $.extend(true, this.unsetHighlight, options);
                    this.draw();
                };

                // Set the style of arcs when set
                arc.styleSet = function(options) {
                    $.extend(true, this.setNormal, options);
                    $.extend(true, this.setHighlight, options);
                    this.draw();
                };

                return arc;
            };

            // Pre-calculate some angles
            var startAngle = ang.line1.angle;
            var diffAngle = ang.line2.angle - ang.line1.angle;

            // Make the set of angles
            ang.ang = [];

            // Push the angles into the set
            if (ang.show[0]) {
                ang.ang[0] = ang.addArc(ang.coord, ang.radius,
                                        startAngle,
                                        startAngle + diffAngle);
            }
            if (ang.show[1]) {
                ang.ang[1] = ang.addArc(ang.coord, ang.radius,
                                        startAngle + diffAngle,
                                        startAngle + 180);
            }
            if (ang.show[2]) {
                ang.ang[2] = ang.addArc(ang.coord, ang.radius,
                                        startAngle + 180,
                                        startAngle + 180 + diffAngle);
            }
            if (ang.show[3]) {
                ang.ang[3] = ang.addArc(ang.coord, ang.radius,
                                        startAngle + 180 + diffAngle,
                                        startAngle + 360);
            }

            return ang;
        };

        return congruency;
    }
});
