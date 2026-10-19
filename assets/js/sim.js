/*
 * Kavros landing — shared SVG simulation engine ("run simulations").
 *
 * One animated enforcement loop per scenario, rendered in the same visual
 * language as the hero diagram (kg-diagram) on index.html:
 *
 *   caller → control plane (identity / policy chips) → the enclave (TEE) in
 *   your VPC → the target, with every step recorded live into an
 *   "Audit & evidence" band — the text layer that keeps concrete endpoints,
 *   rule names, and match counts in front of the reader.
 *
 * No libraries. Honours prefers-reduced-motion (final state rendered
 * instantly, no animation). Built for the landing site's static deploys.
 */
(function (global) {
    'use strict';

    var NS = 'http://www.w3.org/2000/svg';
    var REDUCED = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);

    var C = {
        border: '#cbd5e1', softBg: '#f8fafc', cardBg: '#ffffff', ink: '#0f172a',
        slate: '#64748b', grey: '#94a3b8',
        brand: '#3b82f6', brandInk: '#1d4ed8', brandSoft: '#dbeafe',
        green: '#22c55e', greenInk: '#16a34a', greenSoft: '#f0fdf4',
        red: '#ef4444', redInk: '#dc2626', redSoft: '#fdeaea',
        amberStroke: '#f59e0b', amberInk: '#b45309', amberSoft: '#fdf4de'
    };

    /* Geometry shared by every instance (viewBox 0 0 1000 560). */
    var G = {
        caller: { x: 20, y: 64, w: 220, h: 88 },
        plane: { x: 270, y: 40, w: 240, h: 240 },
        tee: { x: 540, y: 40, w: 220, h: 240 },
        target: { x: 790, y: 84, w: 190, h: 100 },
        chip: { w: 210, h: 26 }
    };
    /* Port points on the flow: caller→plane, plane→TEE, TEE→target. */
    var PORT = {
        callerOut: [240, 108], planeIn: [270, 108],
        planeOut: [510, 160], teeIn: [540, 160],
        teeOut: [760, 134], targetIn: [790, 134]
    };

    function make(tag, attrs, parent) {
        var node = global.document.createElementNS(NS, tag);
        for (var k in attrs) node.setAttribute(k, attrs[k]);
        if (parent) parent.appendChild(node);
        return node;
    }
    function txt(parent, attrs, content) {
        var node = make('text', attrs, parent);
        node.textContent = content;
        return node;
    }

    var inst = 0;

    function create(host, cfg) {
        if (!host || host._ksim) return null;
        host._ksim = true;
        host.classList.add('ksim-host');
        var uid = 'ksim' + (++inst);
        /* every config section defaults — scenarios only customise what they show */
        var callerCfg = cfg.caller || {}, targetCfg = cfg.target || {}, planeCfg = cfg.plane || {};

        var svg = make('svg', {
            viewBox: '0 0 1000 560',
            'class': 'ksim-svg w-full h-auto',
            'font-family': 'Inter, sans-serif',
            role: 'img',
            'aria-label': cfg.aria ||
                'Animated simulation: a request travels from the caller through the Kavros control plane and the enclave TEE to the target, and every decision is recorded in the audit and evidence band.'
        }, host);

        var style = make('style', {}, svg);
        style.textContent =
            '.' + uid + '-chip rect { transition: stroke .25s, fill .25s; } ' +
            '.' + uid + '-chip.on rect { stroke: ' + C.brand + '; fill: ' + C.brandSoft + '; stroke-opacity: 1; } ' +
            '.' + uid + '-chip.on text { fill: ' + C.brandInk + '; } ' +
            '.ksim-svg .ksim-chip text { transition: fill .25s; }';

        /* ---------- caller ---------- */
        var c = G.caller;
        var gCaller = make('g', {}, svg);
        var callerRect = make('rect', {
            x: c.x, y: c.y, width: c.w, height: c.h, rx: 10,
            fill: C.softBg, stroke: C.border, 'stroke-width': 1.5,
            'class': uid + '-caller-inner', style: 'transition: stroke .25s, fill .25s'
        }, gCaller);
        txt(gCaller, { x: c.x + c.w / 2, y: c.y + 36, 'text-anchor': 'middle', fill: C.ink, 'font-size': 13, 'font-weight': 700 }, callerCfg.title);
        txt(gCaller, { x: c.x + c.w / 2, y: c.y + 58, 'text-anchor': 'middle', fill: C.slate, 'font-size': 10.5 }, callerCfg.sub);

        /* quarantine overlay (hidden until the scenario applies it) */
        var gQuar = make('g', { style: 'opacity:0;transition:opacity .3s', 'pointer-events': 'none' }, svg);
        make('rect', {
            x: c.x, y: c.y, width: c.w, height: c.h, rx: 10,
            fill: C.redSoft, stroke: C.red, 'stroke-width': 1.5, 'stroke-dasharray': '5 4'
        }, gQuar);
        txt(gQuar, { x: c.x + 12, y: c.y + c.h - 14, fill: C.redInk, 'font-size': 9, 'font-weight': 700, 'letter-spacing': 1.2 }, cfg.quarantineTag || 'AUTO-QUARANTINED'); // annotation label

        /* ---------- action dot ---------- */
        var dotWrap = make('g', { opacity: 0 }, svg);
        var dotHalo = make('circle', { r: 9, fill: C.brand, opacity: .25 }, dotWrap);
        var dotCore = make('circle', { r: 4.5, fill: C.brand }, dotWrap);

        /* ---------- control plane ---------- */
        var p = G.plane, ch = G.chip;
        make('rect', { x: p.x, y: p.y, width: p.w, height: p.h, rx: 12, fill: C.cardBg, stroke: C.brand, 'stroke-width': 1.5 }, svg);
        txt(svg, { x: p.x + p.w / 2, y: p.y + 22, 'text-anchor': 'middle', fill: C.ink, 'font-size': 13, 'font-weight': 700 }, planeCfg.title || 'Kavros control plane');

        var chips = {};
        function chip(parent, box, label) {
            var g = make('g', { 'class': uid + '-chip' }, svg);
            make('rect', { x: box.x, y: box.y, width: box.w, height: box.h, rx: 6, fill: '#f1f5f9', stroke: C.brand, 'stroke-width': 1.2, 'stroke-opacity': .55 }, g);
            txt(g, { x: box.x + box.w / 2, y: box.y + box.h / 2 + 3.5, 'text-anchor': 'middle', fill: C.slate, 'font-size': 10.5 }, label);
            return g;
        }
        chips.identity = chip(svg, { x: p.x + 15, y: p.y + 44 }, planeCfg.chip1 || 'Identity · SSO · workload keys');
        chips.policy = chip(svg, { x: p.x + 15, y: p.y + 78 }, planeCfg.chip2 || 'Policy & DLP · Ed25519-signed');
        txt(svg, { x: p.x + p.w / 2, y: p.y + 132, 'text-anchor': 'middle', fill: C.grey, 'font-size': 9.5 }, 'signed policy · metering · incidents');

        /* ---------- TEE panel ---------- */
        var t = G.tee;
        make('rect', { x: t.x, y: t.y, width: t.w, height: t.h, rx: 12, fill: C.cardBg, stroke: C.brand, 'stroke-width': 1.5 }, svg);
        txt(svg, { x: t.x + t.w / 2, y: t.y + 22, 'text-anchor': 'middle', fill: C.ink, 'font-size': 13, 'font-weight': 700 }, 'Data plane — your VPC');
        make('rect', { x: t.x + 14, y: t.y + 34, width: t.w - 28, height: t.h - 40, rx: 8, fill: C.softBg, stroke: C.brand, 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }, svg);
        txt(svg, { x: t.x + t.w / 2, y: t.y + 58, 'text-anchor': 'middle', fill: C.brandInk, 'font-size': 12.5, 'font-weight': 700 }, cfg.teeTitle || 'Enclave (TEE)');
        chips.eval = chip(svg, { x: t.x + 42, y: t.y + 72 }, 'Policy evaluation');
        chips.dlp = chip(svg, { x: t.x + 42, y: t.y + 104 }, 'DLP inspection');
        txt(svg, { x: t.x + t.w / 2, y: t.y + 152, 'text-anchor': 'middle', fill: C.slate, 'font-size': 9.5 }, 'signed receipts · attestation · PCR0 pin');
        txt(svg, { x: t.x + t.w / 2, y: t.y + 170, 'text-anchor': 'middle', fill: C.grey, 'font-size': 9.5 }, 'fail closed before anything forwards');

        /* ---------- target ---------- */
        var tg = G.target;
        var gTarget = make('g', { 'class': uid + '-chip' }, svg);
        chips.target = gTarget;
        make('rect', { x: tg.x, y: tg.y, width: tg.w, height: tg.h, rx: 10, fill: C.cardBg, stroke: C.border, 'stroke-width': 1.5 }, gTarget);
        txt(gTarget, { x: tg.x + tg.w / 2, y: tg.y + 40, 'text-anchor': 'middle', fill: C.ink, 'font-size': 12.5, 'font-weight': 700 }, targetCfg.title);
        txt(gTarget, { x: tg.x + tg.w / 2, y: tg.y + 62, 'text-anchor': 'middle', fill: C.slate, 'font-size': 10 }, targetCfg.sub);

        /* ---------- connections ---------- */
        make('line', { x1: PORT.callerOut[0], y1: PORT.callerOut[1], x2: PORT.planeIn[0], y2: PORT.planeIn[1], stroke: C.brand, 'stroke-width': 2 }, svg);
        make('line', { x1: PORT.planeOut[0], y1: PORT.planeOut[1], x2: PORT.teeIn[0], y2: PORT.teeIn[1], stroke: C.brand, 'stroke-width': 2 }, svg);
        make('line', { x1: PORT.teeOut[0], y1: PORT.teeOut[1], x2: 783, y2: 134, stroke: C.green, 'stroke-width': 2, 'stroke-dasharray': '5 4' }, svg);

        /* ---------- verdict badge ---------- */
        var badge = make('g', { opacity: 0 }, svg);
        var badgeRect = make('rect', { x: 460, y: 6, width: 180, height: 30, rx: 8, 'stroke-width': 1.5 }, badge);
        var badgeText = txt(badge, { x: 550, y: 26, 'text-anchor': 'middle', 'font-size': 11.5, 'font-weight': 700, 'letter-spacing': 1 }, '');

        /* ---------- status line: the concrete egress text ---------- */
        var statusText = txt(svg, {
            x: 20, y: 312, 'font-family': 'Menlo, monospace', 'font-size': 10.5,
            fill: C.slate
        }, cfg.status0 || '// Click "Run Simulation".');

        /* ---------- audit band ---------- */
        var bandRect = make('rect', { x: 20, y: 336, width: 960, height: 200, rx: 12, fill: C.cardBg, stroke: C.border, 'stroke-width': 1.5 }, svg);
        txt(svg, { x: 500, y: 362, 'text-anchor': 'middle', fill: C.ink, 'font-size': 13.5, 'font-weight': 700 }, 'Audit & evidence');
        txt(svg, { x: 40, y: 362, fill: C.slate, 'font-size': 8.5, 'letter-spacing': 1.5 }, 'AUDIT LOG — EVERY DECISION');
        txt(svg, { x: 960, y: 362, 'text-anchor': 'end', fill: C.grey, 'font-size': 9.5 }, 'every decision hash-chained · exportable');

        var auditNodes = [];
        var AUDIT_Y0 = 396, AUDIT_STEP = 20, AUDIT_MAX = 7;

        function renderAudit() {
            auditNodes.forEach(function (node) { if (node.parentNode) node.parentNode.removeChild(node); });
            var view = auditNodes.slice(-AUDIT_MAX);
            view.forEach(function (node, i) {
                node.setAttribute('y', AUDIT_Y0 + i * AUDIT_STEP);
                svg.appendChild(node);
            });
        }
        function pushAudit(text, kind) {
            var col = C.grey;
            if (kind === 'bad') col = C.redInk;
            else if (kind === 'ok') col = C.greenInk;
            else if (kind === 'warn') col = C.amberInk;
            var node = txt(null, { x: 40, 'font-family': 'Menlo, monospace', 'font-size': 9.5, fill: col }, text);
            auditNodes.push(node);
            renderAudit();
            bandRect.setAttribute('stroke', C.brand);
            setTimeout(function () { bandRect.setAttribute('stroke', C.border); }, 500);
        }

        var paused = false, busy = false;

        function wait(ms) {
            if (REDUCED) return Promise.resolve();
            return new Promise(function (res) {
                var left = ms;
                /* First tick is a real timer: short holds (<50ms) must still
                 * yield at least one paint or consecutive quick steps
                 * overwrite each other before the browser ever renders. */
                setTimeout(function tick() {
                    if (!paused) left -= 50;
                    if (left > 0) setTimeout(tick, 50); else res();
                }, 50);
            });
        }
        function flash(chip, ms) {
            if (chip) chip.classList.add('on');
            return wait(ms || 420).then(function () { if (chip) chip.classList.remove('on'); });
        }
        function light(chip) { if (chip) chip.classList.add('on'); }
        function dim(chip) { if (chip) chip.classList.remove('on'); }

        function setDot(color) {
            dotHalo.setAttribute('fill', color);
            dotCore.setAttribute('fill', color);
        }
        function moveDot(points, color, msPerSeg) {
            if (REDUCED) return Promise.resolve();
            setDot(color || C.brand);
            dotWrap.setAttribute('opacity', 1);
            dotWrap.setAttribute('transform', 'translate(' + points[0][0] + ',' + points[0][1] + ')');
            return new Promise(function (res) {
                var seg = 0;
                function nextSeg() {
                    if (!points[seg + 1]) {
                        dotWrap.setAttribute('opacity', 0);
                        res();
                        return;
                    }
                    var a = points[seg], b = points[seg + 1];
                    var dur = msPerSeg || 500, left = dur;
                    setTimeout(function step() {
                        if (!paused) left -= 50;
                        var k = Math.max(0, Math.min(1, 1 - left / dur));
                        var e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
                        dotWrap.setAttribute('transform', 'translate(' + (a[0] + (b[0] - a[0]) * e) + ',' + (a[1] + (b[1] - a[1]) * e) + ')');
                        if (left > 0) setTimeout(step, 50); else { seg++; nextSeg(); }
                    }, 50);
                }
                nextSeg();
            });
        }

        function setStatus(s) { statusText.textContent = s; }
        function showBadge(text, kind) {
            badgeText.textContent = text;
            var stroke = C.green, fill = C.greenSoft, ink = C.greenInk;
            if (kind === 'bad') { stroke = C.red; fill = C.redSoft; ink = C.redInk; }
            else if (kind === 'warn') { stroke = C.amberStroke; fill = C.amberSoft; ink = C.amberInk; }
            badgeRect.setAttribute('stroke', stroke);
            badgeRect.setAttribute('fill', fill);
            badgeText.setAttribute('fill', ink);
            badge.setAttribute('opacity', 1);
        }
        function hideBadge() { badge.setAttribute('opacity', 0); }
        function setQuarantine(on) { gQuar.setAttribute('opacity', on ? 1 : 0); }

        function reset() {
            auditNodes.length = 0;
            renderAudit();
            hideBadge();
            setQuarantine(false);
            [chips.identity, chips.policy, chips.eval, chips.dlp, gTarget].forEach(function (el) { if (el) el.classList.remove('on'); });
            callerRect.setAttribute('stroke', C.border);
            callerRect.setAttribute('fill', C.softBg);
            dotWrap.setAttribute('opacity', 0);
            setStatus(cfg.status0 || '// Click "Run Simulation".');
        }

        /* Step primitives (all timing collapsed under reduced motion):
         *  ['status', text]                       current concrete action line
         *  ['audit', text, kind, holdMs]          kind: gray | ok | bad | warn
         *  ['chip', name, ms]                     flash one chip
         *  ['dot', pts, color, msPerSeg]          animate the dot along pts
         *  ['badge', text, kind, holdMs]
         *  ['quarantine', on|off]
         *  ['wait', ms]
         */
        function apply(step) {
            var kind = step[0];
            if (kind === 'status') { setStatus(step[1]); return wait(350); }
            if (kind === 'audit') { pushAudit(step[1], step[2]); return wait(step[3] || 350); }
            if (kind === 'chip') return flash(chips[step[1]], step[2] || 420);
            if (kind === 'dot') return moveDot(step[1], step[2], step[3]);
            if (kind === 'badge') { showBadge(step[1], step[2]); return wait(step[3] || 450); }
            if (kind === 'quarantine') { setQuarantine(!!step[1]); return wait(400); }
            if (kind === 'wait') return wait(step[1] || 500);
            return Promise.resolve();
        }

        function run(scenario, onDone) {
            if (busy) return Promise.resolve();
            busy = true;
            reset();
            var chain = Promise.resolve();
            scenario.forEach(function (st) { chain = chain.then(function () { return apply(st); }); });
            return chain.then(function () {
                busy = false;
                dim(chips.identity); dim(chips.policy);
                return true;
            }).then(function (v) { if (onDone) onDone(v); return v; });
        }

        return {
            run: run,
            red: C.red, brand: C.brand, green: C.green,
            /* port shortcuts for composing routes in page scripts */
            routes: function () {
                return {
                    callerToPlane: [PORT.callerOut.slice(), PORT.planeIn.slice()],
                    planeToTee: [PORT.planeOut.slice(), PORT.teeIn.slice()],
                    teeToTarget: [PORT.teeOut.slice(), PORT.targetIn.slice()],
                    callerToTee: [PORT.callerOut.slice(), PORT.planeIn.slice(), PORT.planeOut.slice(), PORT.teeIn.slice()],
                    callerToTarget: [PORT.callerOut.slice(), PORT.planeIn.slice(), PORT.planeOut.slice(), PORT.teeIn.slice(), PORT.teeOut.slice(), PORT.targetIn.slice()]
                };
            },
            button: function (btn, scenario, label) {
                btn.addEventListener('click', function () {
                    if (busy) return;
                    btn.disabled = true;
                    btn.textContent = 'Running...';
                    run(scenario, function () {
                        btn.disabled = false;
                        btn.textContent = label || 'Run again';
                    });
                });
            }
        };
    }

    global.KavrosSim = { create: create, REDUCED: REDUCED };
})(window);
