/*
Copyright 2014, KISSY v5.0.0
MIT Licensed
build time: Jul 18 13:55
*/
/*
combined modules:
dom/selector
dom/selector/parser
*/
KISSY.add('dom/selector', [
    'util',
    'logger-manager',
    './selector/parser',
    'dom/basic'
], function (S, require, exports, module) {
    /**
 * @ignore
 * css3 selector engine for ie6-8
 * @author yiminghe@gmail.com
 */
    var util = require('util');
    var LoggerManager = require('logger-manager');
    var logger = LoggerManager.getLogger('s/dom');
    var parser = require('./selector/parser');
    var Dom = require('dom/basic');
    logger.info('use KISSY css3 selector');    // ident === identifier
    // ident === identifier
    var EXPANDO_SELECTOR_KEY = '_ks_data_selector_id_', caches = {}, isContextXML, uuid = 0, subMatchesCache = {}, getAttr = function (el, name) {
            if (isContextXML) {
                return Dom._getSimpleAttr(el, name);
            } else {
                return Dom.attr(el, name);
            }
        }, hasSingleClass = Dom._hasSingleClass, isTag = Dom._isTag, aNPlusB = /^(([+-]?(?:\d+)?)?n)?([+-]?\d+)?$/;    // CSS escapes http://www.w3.org/TR/CSS21/syndata.html#escaped-characters
    // CSS escapes http://www.w3.org/TR/CSS21/syndata.html#escaped-characters
    var unescape = /\\([\da-fA-F]{1,6}[\x20\t\r\n\f]?|.)/g, unescapeFn = function (_, escaped) {
            var high = '0x' + escaped - 65536;    // NaN means non-codepoint
            // NaN means non-codepoint
            return isNaN(high) ? escaped : // BMP codepoint
            high < 0 ? String.fromCharCode(high + 65536) : // Supplemental Plane codepoint (surrogate pair)
            String.fromCharCode(high >> 10 | 55296, high & 1023 | 56320);
        };
    var matchExpr;
    var pseudoFnExpr = {
            'nth-child': function (el, param) {
                var ab = getAb(param), a = ab.a, b = ab.b;
                if (a === 0 && b === 0) {
                    return 0;
                }
                var index = 0, parent = el.parentNode;
                if (parent) {
                    var childNodes = parent.childNodes, count = 0, child, ret, len = childNodes.length;
                    for (; count < len; count++) {
                        child = childNodes[count];
                        if (child.nodeType === 1) {
                            index++;
                            ret = matchIndexByAb(index, a, b, child === el);
                            if (ret !== undefined) {
                                return ret;
                            }
                        }
                    }
                }
                return 0;
            },
            'nth-last-child': function (el, param) {
                var ab = getAb(param), a = ab.a, b = ab.b;
                if (a === 0 && b === 0) {
                    return 0;
                }
                var index = 0, parent = el.parentNode;
                if (parent) {
                    var childNodes = parent.childNodes, len = childNodes.length, count = len - 1, child, ret;
                    for (; count >= 0; count--) {
                        child = childNodes[count];
                        if (child.nodeType === 1) {
                            index++;
                            ret = matchIndexByAb(index, a, b, child === el);
                            if (ret !== undefined) {
                                return ret;
                            }
                        }
                    }
                }
                return 0;
            },
            'nth-of-type': function (el, param) {
                var ab = getAb(param), a = ab.a, b = ab.b;
                if (a === 0 && b === 0) {
                    return 0;
                }
                var index = 0, parent = el.parentNode;
                if (parent) {
                    var childNodes = parent.childNodes, elType = el.tagName, count = 0, child, ret, len = childNodes.length;
                    for (; count < len; count++) {
                        child = childNodes[count];
                        if (child.tagName === elType) {
                            index++;
                            ret = matchIndexByAb(index, a, b, child === el);
                            if (ret !== undefined) {
                                return ret;
                            }
                        }
                    }
                }
                return 0;
            },
            'nth-last-of-type': function (el, param) {
                var ab = getAb(param), a = ab.a, b = ab.b;
                if (a === 0 && b === 0) {
                    return 0;
                }
                var index = 0, parent = el.parentNode;
                if (parent) {
                    var childNodes = parent.childNodes, len = childNodes.length, elType = el.tagName, count = len - 1, child, ret;
                    for (; count >= 0; count--) {
                        child = childNodes[count];
                        if (child.tagName === elType) {
                            index++;
                            ret = matchIndexByAb(index, a, b, child === el);
                            if (ret !== undefined) {
                                return ret;
                            }
                        }
                    }
                }
                return 0;
            },
            lang: function (el, lang) {
                var elLang;
                lang = unEscape(lang.toLowerCase());
                do {
                    if (elLang = isContextXML ? el.getAttribute('xml:lang') || el.getAttribute('lang') : el.lang) {
                        elLang = elLang.toLowerCase();
                        return elLang === lang || elLang.indexOf(lang + '-') === 0;
                    }
                } while ((el = el.parentNode) && el.nodeType === 1);
                return false;
            },
            not: function (el, negationArg) {
                return !matchExpr[negationArg.t](el, negationArg.value);
            }
        };
    var pseudoIdentExpr = {
            empty: function (el) {
                var childNodes = el.childNodes, index = 0, len = childNodes.length - 1, child, nodeType;
                for (; index < len; index++) {
                    child = childNodes[index];
                    nodeType = child.nodeType;    // only element nodes and content nodes
                                                  // (such as Dom [Dom-LEVEL-3-CORE] text nodes,
                                                  // CDATA nodes, and entity references
                    // only element nodes and content nodes
                    // (such as Dom [Dom-LEVEL-3-CORE] text nodes,
                    // CDATA nodes, and entity references
                    if (nodeType === 1 || nodeType === 3 || nodeType === 4 || nodeType === 5) {
                        return 0;
                    }
                }
                return 1;
            },
            root: function (el) {
                return el.ownerDocument && el === el.ownerDocument.documentElement;
            },
            'first-child': function (el) {
                return pseudoFnExpr['nth-child'](el, 1);
            },
            'last-child': function (el) {
                return pseudoFnExpr['nth-last-child'](el, 1);
            },
            'first-of-type': function (el) {
                return pseudoFnExpr['nth-of-type'](el, 1);
            },
            'last-of-type': function (el) {
                return pseudoFnExpr['nth-last-of-type'](el, 1);
            },
            'only-child': function (el) {
                return pseudoIdentExpr['first-child'](el) && pseudoIdentExpr['last-child'](el);
            },
            'only-of-type': function (el) {
                return pseudoIdentExpr['first-of-type'](el) && pseudoIdentExpr['last-of-type'](el);
            },
            focus: function (el) {
                var doc = el.ownerDocument;
                return doc && el === doc.activeElement && (!doc.hasFocus || doc.hasFocus()) && !!(el.type || el.href || el.tabIndex >= 0);
            },
            target: function (el) {
                var hash = location.hash;
                return hash && hash.slice(1) === getAttr(el, 'id');
            },
            enabled: function (el) {
                return !el.disabled;
            },
            disabled: function (el) {
                return el.disabled;
            },
            checked: function (el) {
                var nodeName = el.nodeName.toLowerCase();
                return nodeName === 'input' && el.checked || nodeName === 'option' && el.selected;
            }
        };
    var attributeExpr = {
            '~=': function (elValue, value) {
                if (!value || value.indexOf(' ') > -1) {
                    return 0;
                }
                return (' ' + elValue + ' ').indexOf(' ' + value + ' ') !== -1;
            },
            '|=': function (elValue, value) {
                return (' ' + elValue).indexOf(' ' + value + '-') !== -1;
            },
            '^=': function (elValue, value) {
                return value && util.startsWith(elValue, value);
            },
            '$=': function (elValue, value) {
                return value && util.endsWith(elValue, value);
            },
            '*=': function (elValue, value) {
                return value && elValue.indexOf(value) !== -1;
            },
            '=': function (elValue, value) {
                return elValue === value;
            }
        };
    var relativeExpr = {
            '>': {
                dir: 'parentNode',
                immediate: 1
            },
            ' ': { dir: 'parentNode' },
            '+': {
                dir: 'previousSibling',
                immediate: 1
            },
            '~': { dir: 'previousSibling' }
        };
    matchExpr = {
        tag: isTag,
        cls: hasSingleClass,
        id: function (el, value) {
            return getAttr(el, 'id') === value;
        },
        attrib: function (el, value) {
            var name = value.ident;
            if (!isContextXML) {
                name = name.toLowerCase();
            }
            var elValue = getAttr(el, name);
            var match = value.match;
            if (!match && elValue !== undefined) {
                return 1;
            } else if (match) {
                if (elValue === undefined) {
                    return 0;
                }
                var matchFn = attributeExpr[match];
                if (matchFn) {
                    return matchFn(elValue + '', value.value + '');
                }
            }
            return 0;
        },
        pseudo: function (el, value) {
            var fn, fnStr, ident;
            if (fnStr = value.fn) {
                if (!(fn = pseudoFnExpr[fnStr])) {
                    throw new SyntaxError('Syntax error: not support pseudo: ' + fnStr);
                }
                return fn(el, value.param);
            }
            if (ident = value.ident) {
                if (!pseudoIdentExpr[ident]) {
                    throw new SyntaxError('Syntax error: not support pseudo: ' + ident);
                }
                return pseudoIdentExpr[ident](el);
            }
            return 0;
        }
    };
    function unEscape(str) {
        return str.replace(unescape, unescapeFn);
    }
    parser.lexer.yy = {
        trim: util.trim,
        unEscape: unEscape,
        unEscapeStr: function (str) {
            return this.unEscape(str.slice(1, -1));
        }
    };
    function resetStatus() {
        subMatchesCache = {};
    }
    function dir(el, direction) {
        do {
            el = el[direction];
        } while (el && el.nodeType !== 1);
        return el;
    }
    function getAb(param) {
        var a = 0, match, b = 0;
        if (typeof param === 'number') {
            b = param;
        } else if (param === 'odd') {
            a = 2;
            b = 1;
        } else if (param === 'even') {
            a = 2;
            b = 0;
        } else if (match = param.replace(/\s/g, '').match(aNPlusB)) {
            if (match[1]) {
                a = parseInt(match[2], 10);
                if (isNaN(a)) {
                    if (match[2] === '-') {
                        a = -1;
                    } else {
                        a = 1;
                    }
                }
            } else {
                a = 0;
            }
            b = parseInt(match[3], 10) || 0;
        }
        return {
            a: a,
            b: b
        };
    }
    function matchIndexByAb(index, a, b, eq) {
        if (a === 0) {
            if (index === b) {
                return eq;
            }
        } else {
            if ((index - b) / a >= 0 && (index - b) % a === 0 && eq) {
                return 1;
            }
        }
        return undefined;
    }
    function isXML(elem) {
        var documentElement = elem && (elem.ownerDocument || elem).documentElement;
        return documentElement ? documentElement.nodeName.toLowerCase() !== 'html' : false;
    }
    function matches(str, seeds) {
        return Dom._selectInternal(str, null, seeds);
    }
    Dom._matchesInternal = matches;
    function singleMatch(el, match) {
        if (!match) {
            return true;
        }
        if (!el) {
            return false;
        }
        if (el.nodeType === 9) {
            return false;
        }
        var matched = 1, matchSuffix = match.suffix, matchSuffixLen, matchSuffixIndex;
        if (match.t === 'tag') {
            matched &= matchExpr.tag(el, match.value);
        }
        if (matched && matchSuffix) {
            matchSuffixLen = matchSuffix.length;
            matchSuffixIndex = 0;
            for (; matched && matchSuffixIndex < matchSuffixLen; matchSuffixIndex++) {
                var singleMatchSuffix = matchSuffix[matchSuffixIndex], singleMatchSuffixType = singleMatchSuffix.t;
                if (matchExpr[singleMatchSuffixType]) {
                    matched &= matchExpr[singleMatchSuffixType](el, singleMatchSuffix.value);
                }
            }
        }
        return matched;
    }    // match by adjacent immediate single selector match
    // match by adjacent immediate single selector match
    function matchImmediate(el, match) {
        var matched = 1, startEl = el, relativeOp, startMatch = match;
        do {
            matched &= singleMatch(el, match);
            if (matched) {
                // advance
                match = match && match.prev;
                if (!match) {
                    return true;
                }
                relativeOp = relativeExpr[match.nextCombinator];
                el = dir(el, relativeOp.dir);
                if (!relativeOp.immediate) {
                    return {
                        // advance for non-immediate
                        el: el,
                        match: match
                    };
                }
            } else {
                relativeOp = relativeExpr[match.nextCombinator];
                if (relativeOp.immediate) {
                    // retreat but advance startEl
                    return {
                        el: dir(startEl, relativeExpr[startMatch.nextCombinator].dir),
                        match: startMatch
                    };
                } else {
                    // advance (before immediate match + jump unmatched)
                    return {
                        el: el && dir(el, relativeOp.dir),
                        match: match
                    };
                }
            }
        } while (el);    // only occur when match immediate
        // only occur when match immediate
        return {
            el: dir(startEl, relativeExpr[startMatch.nextCombinator].dir),
            match: startMatch
        };
    }    // find fixed part, fixed with seeds
    // find fixed part, fixed with seeds
    function findFixedMatchFromHead(el, head) {
        var relativeOp, cur = head;
        do {
            if (!singleMatch(el, cur)) {
                return null;
            }
            cur = cur.prev;
            if (!cur) {
                return true;
            }
            relativeOp = relativeExpr[cur.nextCombinator];
            el = dir(el, relativeOp.dir);
        } while (el && relativeOp.immediate);
        if (!el) {
            return null;
        }
        return {
            el: el,
            match: cur
        };
    }
    function genId(el) {
        var selectorId;
        if (isContextXML) {
            if (!(selectorId = el.getAttribute(EXPANDO_SELECTOR_KEY))) {
                el.setAttribute(EXPANDO_SELECTOR_KEY, selectorId = +new Date() + '_' + ++uuid);
            }
        } else {
            if (!(selectorId = el[EXPANDO_SELECTOR_KEY])) {
                selectorId = el[EXPANDO_SELECTOR_KEY] = +new Date() + '_' + ++uuid;
            }
        }
        return selectorId;
    }
    function matchSub(el, match) {
        var selectorId = genId(el), matchKey;
        matchKey = selectorId + '_' + (match.order || 0);
        if (matchKey in subMatchesCache) {
            return subMatchesCache[matchKey];
        }
        subMatchesCache[matchKey] = matchSubInternal(el, match);
        return subMatchesCache[matchKey];
    }    // recursive match by sub selector string from right to left
         // grouped by immediate selectors
    // recursive match by sub selector string from right to left
    // grouped by immediate selectors
    function matchSubInternal(el, match) {
        var matchImmediateRet = matchImmediate(el, match);
        if (matchImmediateRet === true) {
            return true;
        } else {
            el = matchImmediateRet.el;
            match = matchImmediateRet.match;
            while (el) {
                if (matchSub(el, match)) {
                    return true;
                }
                el = dir(el, relativeExpr[match.nextCombinator].dir);
            }
            return false;
        }
    }
    function select(str, context, seeds) {
        if (!caches[str]) {
            caches[str] = parser.parse(str);
        }
        var selector = caches[str], groupIndex = 0, groupLen = selector.length, contextDocument, group, ret = [];
        if (seeds) {
            context = context || seeds[0].ownerDocument;
        }
        contextDocument = context && context.ownerDocument || document;
        context = context || contextDocument;
        isContextXML = isXML(context);
        for (; groupIndex < groupLen; groupIndex++) {
            resetStatus();
            group = selector[groupIndex];
            var suffix = group.suffix, suffixIndex, suffixLen, seedsIndex, mySeeds = seeds, seedsLen, id = null;
            if (!mySeeds) {
                if (suffix && !isContextXML) {
                    suffixIndex = 0;
                    suffixLen = suffix.length;
                    for (; suffixIndex < suffixLen; suffixIndex++) {
                        var singleSuffix = suffix[suffixIndex];
                        if (singleSuffix.t === 'id') {
                            id = singleSuffix.value;
                            break;
                        }
                    }
                }
                if (id) {
                    // http://yiminghe.github.io/lab/playground/fragment-selector/selector.html
                    var doesNotHasById = !context.getElementById, contextInDom = Dom._contains(contextDocument, context), tmp = doesNotHasById ? contextInDom ? contextDocument.getElementById(id) : null : context.getElementById(id);    // id bug
                                                                                                                                                                                                                                           // https://github.com/kissyteam/kissy/issues/67
                    // id bug
                    // https://github.com/kissyteam/kissy/issues/67
                    if (!tmp && doesNotHasById || tmp && getAttr(tmp, 'id') !== id) {
                        var tmps = Dom._getElementsByTagName('*', context), tmpLen = tmps.length, tmpI = 0;
                        for (; tmpI < tmpLen; tmpI++) {
                            tmp = tmps[tmpI];
                            if (getAttr(tmp, 'id') === id) {
                                mySeeds = [tmp];
                                break;
                            }
                        }
                        if (tmpI === tmpLen) {
                            mySeeds = [];
                        }
                    } else {
                        if (contextInDom && tmp && context !== contextDocument) {
                            tmp = Dom._contains(context, tmp) ? tmp : null;
                        }
                        mySeeds = tmp ? [tmp] : [];
                    }
                } else {
                    mySeeds = Dom._getElementsByTagName(group.value || '*', context);
                }
            }
            seedsIndex = 0;
            seedsLen = mySeeds.length;
            if (!seedsLen) {
                continue;
            }
            for (; seedsIndex < seedsLen; seedsIndex++) {
                var seed = mySeeds[seedsIndex];
                var matchHead = findFixedMatchFromHead(seed, group);
                if (matchHead === true) {
                    ret.push(seed);
                } else if (matchHead) {
                    if (matchSub(matchHead.el, matchHead.match)) {
                        ret.push(seed);
                    }
                }
            }
        }
        if (groupLen > 1) {
            ret = Dom.unique(ret);
        }
        return ret;
    }
    Dom._selectInternal = select;
    module.exports = {
        parse: function (str) {
            return parser.parse(str);
        },
        select: select,
        matches: matches
    };    /**
 * @ignore
 * note 2013-03-28
 *  - use recursive call to replace backtracking algorithm
 *
 * refer
 *  - http://www.w3.org/TR/selectors/
 *  - http://www.impressivewebs.com/browser-support-css3-selectors/
 *  - http://blogs.msdn.com/ie/archive/2010/05/13/the-css-corner-css3-selectors.aspx
 *  - http://sizzlejs.com/
 */
});


KISSY.add('dom/selector/parser', [], function (S, require, exports, module) {
    /*
  Generated by kison.*/
    var parser = function (undefined) {
            /*jshint quotmark:false, loopfunc:true, indent:false, unused:false, asi:true, boss:true*/
            /* Generated by kison */
            var parser = {}, GrammarConst = {
                    'SHIFT_TYPE': 1,
                    'REDUCE_TYPE': 2,
                    'ACCEPT_TYPE': 0,
                    'TYPE_INDEX': 0,
                    'PRODUCTION_INDEX': 1,
                    'TO_INDEX': 2
                };    /*jslint quotmark: false*/
            /*jslint quotmark: false*/
            function mix(to, from) {
                for (var f in from) {
                    to[f] = from[f];
                }
            }
            function isArray(obj) {
                return '[object Array]' === Object.prototype.toString.call(obj);
            }
            function each(object, fn, context) {
                if (object) {
                    var key, val, length, i = 0;
                    context = context || null;
                    if (!isArray(object)) {
                        for (key in object) {
                            // can not use hasOwnProperty
                            if (fn.call(context, object[key], key, object) === false) {
                                break;
                            }
                        }
                    } else {
                        length = object.length;
                        for (val = object[0]; i < length; val = object[++i]) {
                            if (fn.call(context, val, i, object) === false) {
                                break;
                            }
                        }
                    }
                }
            }
            function inArray(item, arr) {
                for (var i = 0, l = arr.length; i < l; i++) {
                    if (arr[i] === item) {
                        return true;
                    }
                }
                return false;
            }
            var Lexer = function Lexer(cfg) {
                var self = this;    /*
     lex rules.
     @type {Object[]}
     @example
     [
     {
     regexp:'\\w+',
     state:['xx'],
     token:'c',
     // this => lex
     action:function(){}
     }
     ]
     */
                /*
     lex rules.
     @type {Object[]}
     @example
     [
     {
     regexp:'\\w+',
     state:['xx'],
     token:'c',
     // this => lex
     action:function(){}
     }
     ]
     */
                self.rules = [];
                mix(self, cfg);    /*
     Input languages
     @type {String}
     */
                /*
     Input languages
     @type {String}
     */
                self.resetInput(self.input);
            };
            Lexer.prototype = {
                'resetInput': function (input) {
                    mix(this, {
                        input: input,
                        matched: '',
                        stateStack: [Lexer.STATIC.INITIAL],
                        match: '',
                        text: '',
                        firstLine: 1,
                        lineNumber: 1,
                        lastLine: 1,
                        firstColumn: 1,
                        lastColumn: 1
                    });
                },
                'getCurrentRules': function () {
                    var self = this, currentState = self.stateStack[self.stateStack.length - 1], rules = [];    //#JSCOVERAGE_IF
                    //#JSCOVERAGE_IF
                    if (self.mapState) {
                        currentState = self.mapState(currentState);
                    }
                    each(self.rules, function (r) {
                        var state = r.state || r[3];
                        if (!state) {
                            if (currentState === Lexer.STATIC.INITIAL) {
                                rules.push(r);
                            }
                        } else if (inArray(currentState, state)) {
                            rules.push(r);
                        }
                    });
                    return rules;
                },
                'pushState': function (state) {
                    this.stateStack.push(state);
                },
                'popState': function (num) {
                    num = num || 1;
                    var ret;
                    while (num--) {
                        ret = this.stateStack.pop();
                    }
                    return ret;
                },
                'showDebugInfo': function () {
                    var self = this, DEBUG_CONTEXT_LIMIT = Lexer.STATIC.DEBUG_CONTEXT_LIMIT, matched = self.matched, match = self.match, input = self.input;
                    matched = matched.slice(0, matched.length - match.length);    //#JSCOVERAGE_IF 0
                    //#JSCOVERAGE_IF 0
                    var past = (matched.length > DEBUG_CONTEXT_LIMIT ? '...' : '') + matched.slice(0 - DEBUG_CONTEXT_LIMIT).replace(/\n/, ' '), next = match + input;    //#JSCOVERAGE_ENDIF
                    //#JSCOVERAGE_ENDIF
                    next = next.slice(0, DEBUG_CONTEXT_LIMIT) + (next.length > DEBUG_CONTEXT_LIMIT ? '...' : '');
                    return past + next + '\n' + new Array(past.length + 1).join('-') + '^';
                },
                'mapSymbol': function mapSymbolForCodeGen(t) {
                    return this.symbolMap[t];
                },
                'mapReverseSymbol': function (rs) {
                    var self = this, symbolMap = self.symbolMap, i, reverseSymbolMap = self.reverseSymbolMap;
                    if (!reverseSymbolMap && symbolMap) {
                        reverseSymbolMap = self.reverseSymbolMap = {};
                        for (i in symbolMap) {
                            reverseSymbolMap[symbolMap[i]] = i;
                        }
                    }    //#JSCOVERAGE_IF
                    //#JSCOVERAGE_IF
                    if (reverseSymbolMap) {
                        return reverseSymbolMap[rs];
                    } else {
                        return rs;
                    }
                },
                'lex': function () {
                    var self = this, input = self.input, i, rule, m, ret, lines, rules = self.getCurrentRules();
                    self.match = self.text = '';
                    if (!input) {
                        return self.mapSymbol(Lexer.STATIC.END_TAG);
                    }
                    for (i = 0; i < rules.length; i++) {
                        rule = rules[i];    //#JSCOVERAGE_IF 0
                        //#JSCOVERAGE_IF 0
                        var regexp = rule.regexp || rule[1], token = rule.token || rule[0], action = rule.action || rule[2] || undefined;    //#JSCOVERAGE_ENDIF
                        //#JSCOVERAGE_ENDIF
                        if (m = input.match(regexp)) {
                            lines = m[0].match(/\n.*/g);
                            if (lines) {
                                self.lineNumber += lines.length;
                            }
                            mix(self, {
                                firstLine: self.lastLine,
                                lastLine: self.lineNumber + 1,
                                firstColumn: self.lastColumn,
                                lastColumn: lines ? lines[lines.length - 1].length - 1 : self.lastColumn + m[0].length
                            });
                            var match;    // for error report
                            // for error report
                            match = self.match = m[0];    // all matches
                            // all matches
                            self.matches = m;    // may change by user
                            // may change by user
                            self.text = match;    // matched content utils now
                            // matched content utils now
                            self.matched += match;
                            ret = action && action.call(self);
                            if (ret === undefined) {
                                ret = token;
                            } else {
                                ret = self.mapSymbol(ret);
                            }
                            input = input.slice(match.length);
                            self.input = input;
                            if (ret) {
                                return ret;
                            } else {
                                // ignore
                                return self.lex();
                            }
                        }
                    }
                }
            };
            Lexer.STATIC = {
                'INITIAL': 'I',
                'DEBUG_CONTEXT_LIMIT': 20,
                'END_TAG': '$EOF'
            };
            var lexer = new Lexer({
                    'rules': [
                        [
                            'b',
                            /^\[(?:[\t\r\n\f\x20]*)/,
                            function () {
                                this.text = this.yy.trim(this.text);
                            }
                        ],
                        [
                            'c',
                            /^(?:[\t\r\n\f\x20]*)\]/,
                            function () {
                                this.text = this.yy.trim(this.text);
                            }
                        ],
                        [
                            'd',
                            /^(?:[\t\r\n\f\x20]*)~=(?:[\t\r\n\f\x20]*)/,
                            function () {
                                this.text = this.yy.trim(this.text);
                            }
                        ],
                        [
                            'e',
                            /^(?:[\t\r\n\f\x20]*)\|=(?:[\t\r\n\f\x20]*)/,
                            function () {
                                this.text = this.yy.trim(this.text);
                            }
                        ],
                        [
                            'f',
                            /^(?:[\t\r\n\f\x20]*)\^=(?:[\t\r\n\f\x20]*)/,
                            function () {
                                this.text = this.yy.trim(this.text);
                            }
                        ],
                        [
                            'g',
                            /^(?:[\t\r\n\f\x20]*)\$=(?:[\t\r\n\f\x20]*)/,
                            function () {
                                this.text = this.yy.trim(this.text);
                            }
                        ],
                        [
                            'h',
                            /^(?:[\t\r\n\f\x20]*)\*=(?:[\t\r\n\f\x20]*)/,
                            function () {
                                this.text = this.yy.trim(this.text);
                            }
                        ],
                        [
                            'i',
                            /^(?:[\t\r\n\f\x20]*)\=(?:[\t\r\n\f\x20]*)/,
                            function () {
                                this.text = this.yy.trim(this.text);
                            }
                        ],
                        [
                            'j',
                            /^(?:(?:[\w]|[^\x00-\xa0]|(?:\\[^\n\r\f0-9a-f]))(?:[\w\d-]|[^\x00-\xa0]|(?:\\[^\n\r\f0-9a-f]))*)\(/,
                            function () {
                                this.text = this.yy.trim(this.text).slice(0, -1);
                                this.pushState('fn');
                            }
                        ],
                        [
                            'k',
                            /^[^\)]*/,
                            function () {
                                this.popState();
                            },
                            ['fn']
                        ],
                        [
                            'l',
                            /^(?:[\t\r\n\f\x20]*)\)/,
                            function () {
                                this.text = this.yy.trim(this.text);
                            }
                        ],
                        [
                            'm',
                            /^:not\((?:[\t\r\n\f\x20]*)/i,
                            function () {
                                this.text = this.yy.trim(this.text);
                            }
                        ],
                        [
                            'n',
                            /^(?:(?:[\w]|[^\x00-\xa0]|(?:\\[^\n\r\f0-9a-f]))(?:[\w\d-]|[^\x00-\xa0]|(?:\\[^\n\r\f0-9a-f]))*)/,
                            function () {
                                this.text = this.yy.unEscape(this.text);
                            }
                        ],
                        [
                            'o',
                            /^"(\\"|[^"])*"/,
                            function () {
                                this.text = this.yy.unEscapeStr(this.text);
                            }
                        ],
                        [
                            'o',
                            /^'(\\'|[^'])*'/,
                            function () {
                                this.text = this.yy.unEscapeStr(this.text);
                            }
                        ],
                        [
                            'p',
                            /^#(?:(?:[\w\d-]|[^\x00-\xa0]|(?:\\[^\n\r\f0-9a-f]))+)/,
                            function () {
                                this.text = this.yy.unEscape(this.text.slice(1));
                            }
                        ],
                        [
                            'q',
                            /^\.(?:(?:[\w]|[^\x00-\xa0]|(?:\\[^\n\r\f0-9a-f]))(?:[\w\d-]|[^\x00-\xa0]|(?:\\[^\n\r\f0-9a-f]))*)/,
                            function () {
                                this.text = this.yy.unEscape(this.text.slice(1));
                            }
                        ],
                        [
                            'r',
                            /^(?:[\t\r\n\f\x20]*),(?:[\t\r\n\f\x20]*)/,
                            function () {
                                this.text = this.yy.trim(this.text);
                            }
                        ],
                        [
                            's',
                            /^::?/,
                            0
                        ],
                        [
                            't',
                            /^(?:[\t\r\n\f\x20]*)\+(?:[\t\r\n\f\x20]*)/,
                            function () {
                                this.text = this.yy.trim(this.text);
                            }
                        ],
                        [
                            'u',
                            /^(?:[\t\r\n\f\x20]*)>(?:[\t\r\n\f\x20]*)/,
                            function () {
                                this.text = this.yy.trim(this.text);
                            }
                        ],
                        [
                            'v',
                            /^(?:[\t\r\n\f\x20]*)~(?:[\t\r\n\f\x20]*)/,
                            function () {
                                this.text = this.yy.trim(this.text);
                            }
                        ],
                        [
                            'w',
                            /^\*/,
                            0
                        ],
                        [
                            'x',
                            /^(?:[\t\r\n\f\x20]+)/,
                            0
                        ],
                        [
                            'y',
                            /^./,
                            0
                        ]
                    ]
                });
            parser.lexer = lexer;
            lexer.symbolMap = {
                '$EOF': 'a',
                'LEFT_BRACKET': 'b',
                'RIGHT_BRACKET': 'c',
                'INCLUDES': 'd',
                'DASH_MATCH': 'e',
                'PREFIX_MATCH': 'f',
                'SUFFIX_MATCH': 'g',
                'SUBSTRING_MATCH': 'h',
                'ALL_MATCH': 'i',
                'FUNCTION': 'j',
                'PARAMETER': 'k',
                'RIGHT_PARENTHESES': 'l',
                'NOT': 'm',
                'IDENT': 'n',
                'STRING': 'o',
                'HASH': 'p',
                'CLASS': 'q',
                'COMMA': 'r',
                'COLON': 's',
                'PLUS': 't',
                'GREATER': 'u',
                'TILDE': 'v',
                'UNIVERSAL': 'w',
                'S': 'x',
                'INVALID': 'y',
                '$START': 'z',
                'selectors_group': 'aa',
                'selector': 'ab',
                'simple_selector_sequence': 'ac',
                'combinator': 'ad',
                'type_selector': 'ae',
                'id_selector': 'af',
                'class_selector': 'ag',
                'attrib_match': 'ah',
                'attrib': 'ai',
                'attrib_val': 'aj',
                'pseudo': 'ak',
                'negation': 'al',
                'negation_arg': 'am',
                'suffix_selector': 'an',
                'suffix_selectors': 'ao'
            };
            parser.productions = [
                [
                    'z',
                    ['aa']
                ],
                [
                    'aa',
                    ['ab'],
                    function () {
                        return [this.$1];
                    }
                ],
                [
                    'aa',
                    [
                        'aa',
                        'r',
                        'ab'
                    ],
                    function () {
                        this.$1.push(this.$3);
                    }
                ],
                [
                    'ab',
                    ['ac']
                ],
                [
                    'ab',
                    [
                        'ab',
                        'ad',
                        'ac'
                    ],
                    function () {
                        // LinkedList
                        this.$1.nextCombinator = this.$3.prevCombinator = this.$2;
                        var order;
                        order = this.$1.order = this.$1.order || 0;
                        this.$3.order = order + 1;
                        this.$3.prev = this.$1;
                        this.$1.next = this.$3;
                        return this.$3;
                    }
                ],
                [
                    'ad',
                    ['t']
                ],
                [
                    'ad',
                    ['u']
                ],
                [
                    'ad',
                    ['v']
                ],
                [
                    'ad',
                    ['x'],
                    function () {
                        return ' ';
                    }
                ],
                [
                    'ae',
                    ['n'],
                    function () {
                        return {
                            t: 'tag',
                            value: this.$1
                        };
                    }
                ],
                [
                    'ae',
                    ['w'],
                    function () {
                        return {
                            t: 'tag',
                            value: this.$1
                        };
                    }
                ],
                [
                    'af',
                    ['p'],
                    function () {
                        return {
                            t: 'id',
                            value: this.$1
                        };
                    }
                ],
                [
                    'ag',
                    ['q'],
                    function () {
                        return {
                            t: 'cls',
                            value: this.$1
                        };
                    }
                ],
                [
                    'ah',
                    ['f']
                ],
                [
                    'ah',
                    ['g']
                ],
                [
                    'ah',
                    ['h']
                ],
                [
                    'ah',
                    ['i']
                ],
                [
                    'ah',
                    ['d']
                ],
                [
                    'ah',
                    ['e']
                ],
                [
                    'ai',
                    [
                        'b',
                        'n',
                        'c'
                    ],
                    function () {
                        return {
                            t: 'attrib',
                            value: { ident: this.$2 }
                        };
                    }
                ],
                [
                    'aj',
                    ['n']
                ],
                [
                    'aj',
                    ['o']
                ],
                [
                    'ai',
                    [
                        'b',
                        'n',
                        'ah',
                        'aj',
                        'c'
                    ],
                    function () {
                        return {
                            t: 'attrib',
                            value: {
                                ident: this.$2,
                                match: this.$3,
                                value: this.$4
                            }
                        };
                    }
                ],
                [
                    'ak',
                    [
                        's',
                        'j',
                        'k',
                        'l'
                    ],
                    function () {
                        return {
                            t: 'pseudo',
                            value: {
                                fn: this.$2.toLowerCase(),
                                param: this.$3
                            }
                        };
                    }
                ],
                [
                    'ak',
                    [
                        's',
                        'n'
                    ],
                    function () {
                        return {
                            t: 'pseudo',
                            value: { ident: this.$2.toLowerCase() }
                        };
                    }
                ],
                [
                    'al',
                    [
                        'm',
                        'am',
                        'l'
                    ],
                    function () {
                        return {
                            t: 'pseudo',
                            value: {
                                fn: 'not',
                                param: this.$2
                            }
                        };
                    }
                ],
                [
                    'am',
                    ['ae']
                ],
                [
                    'am',
                    ['af']
                ],
                [
                    'am',
                    ['ag']
                ],
                [
                    'am',
                    ['ai']
                ],
                [
                    'am',
                    ['ak']
                ],
                [
                    'an',
                    ['af']
                ],
                [
                    'an',
                    ['ag']
                ],
                [
                    'an',
                    ['ai']
                ],
                [
                    'an',
                    ['ak']
                ],
                [
                    'an',
                    ['al']
                ],
                [
                    'ao',
                    ['an'],
                    function () {
                        return [this.$1];
                    }
                ],
                [
                    'ao',
                    [
                        'ao',
                        'an'
                    ],
                    function () {
                        this.$1.push(this.$2);
                    }
                ],
                [
                    'ac',
                    ['ae']
                ],
                [
                    'ac',
                    ['ao'],
                    function () {
                        return { suffix: this.$1 };
                    }
                ],
                [
                    'ac',
                    [
                        'ae',
                        'ao'
                    ],
                    function () {
                        return {
                            t: 'tag',
                            value: this.$1.value,
                            suffix: this.$2
                        };
                    }
                ]
            ];
            parser.table = {
                'gotos': {
                    '0': {
                        'aa': 8,
                        'ab': 9,
                        'ae': 10,
                        'af': 11,
                        'ag': 12,
                        'ai': 13,
                        'ak': 14,
                        'al': 15,
                        'an': 16,
                        'ao': 17,
                        'ac': 18
                    },
                    '2': {
                        'ae': 20,
                        'af': 21,
                        'ag': 22,
                        'ai': 23,
                        'ak': 24,
                        'am': 25
                    },
                    '9': { 'ad': 33 },
                    '10': {
                        'af': 11,
                        'ag': 12,
                        'ai': 13,
                        'ak': 14,
                        'al': 15,
                        'an': 16,
                        'ao': 34
                    },
                    '17': {
                        'af': 11,
                        'ag': 12,
                        'ai': 13,
                        'ak': 14,
                        'al': 15,
                        'an': 35
                    },
                    '19': { 'ah': 43 },
                    '28': {
                        'ab': 46,
                        'ae': 10,
                        'af': 11,
                        'ag': 12,
                        'ai': 13,
                        'ak': 14,
                        'al': 15,
                        'an': 16,
                        'ao': 17,
                        'ac': 18
                    },
                    '33': {
                        'ae': 10,
                        'af': 11,
                        'ag': 12,
                        'ai': 13,
                        'ak': 14,
                        'al': 15,
                        'an': 16,
                        'ao': 17,
                        'ac': 47
                    },
                    '34': {
                        'af': 11,
                        'ag': 12,
                        'ai': 13,
                        'ak': 14,
                        'al': 15,
                        'an': 35
                    },
                    '43': { 'aj': 50 },
                    '46': { 'ad': 33 }
                },
                'action': {
                    '0': {
                        'b': [
                            1,
                            undefined,
                            1
                        ],
                        'm': [
                            1,
                            undefined,
                            2
                        ],
                        'n': [
                            1,
                            undefined,
                            3
                        ],
                        'p': [
                            1,
                            undefined,
                            4
                        ],
                        'q': [
                            1,
                            undefined,
                            5
                        ],
                        's': [
                            1,
                            undefined,
                            6
                        ],
                        'w': [
                            1,
                            undefined,
                            7
                        ]
                    },
                    '1': {
                        'n': [
                            1,
                            undefined,
                            19
                        ]
                    },
                    '2': {
                        'b': [
                            1,
                            undefined,
                            1
                        ],
                        'n': [
                            1,
                            undefined,
                            3
                        ],
                        'p': [
                            1,
                            undefined,
                            4
                        ],
                        'q': [
                            1,
                            undefined,
                            5
                        ],
                        's': [
                            1,
                            undefined,
                            6
                        ],
                        'w': [
                            1,
                            undefined,
                            7
                        ]
                    },
                    '3': {
                        'a': [
                            2,
                            9
                        ],
                        'r': [
                            2,
                            9
                        ],
                        't': [
                            2,
                            9
                        ],
                        'u': [
                            2,
                            9
                        ],
                        'v': [
                            2,
                            9
                        ],
                        'x': [
                            2,
                            9
                        ],
                        'p': [
                            2,
                            9
                        ],
                        'q': [
                            2,
                            9
                        ],
                        'b': [
                            2,
                            9
                        ],
                        's': [
                            2,
                            9
                        ],
                        'm': [
                            2,
                            9
                        ],
                        'l': [
                            2,
                            9
                        ]
                    },
                    '4': {
                        'a': [
                            2,
                            11
                        ],
                        'r': [
                            2,
                            11
                        ],
                        't': [
                            2,
                            11
                        ],
                        'u': [
                            2,
                            11
                        ],
                        'v': [
                            2,
                            11
                        ],
                        'x': [
                            2,
                            11
                        ],
                        'p': [
                            2,
                            11
                        ],
                        'q': [
                            2,
                            11
                        ],
                        'b': [
                            2,
                            11
                        ],
                        's': [
                            2,
                            11
                        ],
                        'm': [
                            2,
                            11
                        ],
                        'l': [
                            2,
                            11
                        ]
                    },
                    '5': {
                        'a': [
                            2,
                            12
                        ],
                        'r': [
                            2,
                            12
                        ],
                        't': [
                            2,
                            12
                        ],
                        'u': [
                            2,
                            12
                        ],
                        'v': [
                            2,
                            12
                        ],
                        'x': [
                            2,
                            12
                        ],
                        'p': [
                            2,
                            12
                        ],
                        'q': [
                            2,
                            12
                        ],
                        'b': [
                            2,
                            12
                        ],
                        's': [
                            2,
                            12
                        ],
                        'm': [
                            2,
                            12
                        ],
                        'l': [
                            2,
                            12
                        ]
                    },
                    '6': {
                        'j': [
                            1,
                            undefined,
                            26
                        ],
                        'n': [
                            1,
                            undefined,
                            27
                        ]
                    },
                    '7': {
                        'a': [
                            2,
                            10
                        ],
                        'r': [
                            2,
                            10
                        ],
                        't': [
                            2,
                            10
                        ],
                        'u': [
                            2,
                            10
                        ],
                        'v': [
                            2,
                            10
                        ],
                        'x': [
                            2,
                            10
                        ],
                        'p': [
                            2,
                            10
                        ],
                        'q': [
                            2,
                            10
                        ],
                        'b': [
                            2,
                            10
                        ],
                        's': [
                            2,
                            10
                        ],
                        'm': [
                            2,
                            10
                        ],
                        'l': [
                            2,
                            10
                        ]
                    },
                    '8': {
                        'a': [0],
                        'r': [
                            1,
                            undefined,
                            28
                        ]
                    },
                    '9': {
                        'a': [
                            2,
                            1
                        ],
                        'r': [
                            2,
                            1
                        ],
                        't': [
                            1,
                            undefined,
                            29
                        ],
                        'u': [
                            1,
                            undefined,
                            30
                        ],
                        'v': [
                            1,
                            undefined,
                            31
                        ],
                        'x': [
                            1,
                            undefined,
                            32
                        ]
                    },
                    '10': {
                        'a': [
                            2,
                            38
                        ],
                        'r': [
                            2,
                            38
                        ],
                        't': [
                            2,
                            38
                        ],
                        'u': [
                            2,
                            38
                        ],
                        'v': [
                            2,
                            38
                        ],
                        'x': [
                            2,
                            38
                        ],
                        'b': [
                            1,
                            undefined,
                            1
                        ],
                        'm': [
                            1,
                            undefined,
                            2
                        ],
                        'p': [
                            1,
                            undefined,
                            4
                        ],
                        'q': [
                            1,
                            undefined,
                            5
                        ],
                        's': [
                            1,
                            undefined,
                            6
                        ]
                    },
                    '11': {
                        'a': [
                            2,
                            31
                        ],
                        'r': [
                            2,
                            31
                        ],
                        't': [
                            2,
                            31
                        ],
                        'u': [
                            2,
                            31
                        ],
                        'v': [
                            2,
                            31
                        ],
                        'x': [
                            2,
                            31
                        ],
                        'p': [
                            2,
                            31
                        ],
                        'q': [
                            2,
                            31
                        ],
                        'b': [
                            2,
                            31
                        ],
                        's': [
                            2,
                            31
                        ],
                        'm': [
                            2,
                            31
                        ]
                    },
                    '12': {
                        'a': [
                            2,
                            32
                        ],
                        'r': [
                            2,
                            32
                        ],
                        't': [
                            2,
                            32
                        ],
                        'u': [
                            2,
                            32
                        ],
                        'v': [
                            2,
                            32
                        ],
                        'x': [
                            2,
                            32
                        ],
                        'p': [
                            2,
                            32
                        ],
                        'q': [
                            2,
                            32
                        ],
                        'b': [
                            2,
                            32
                        ],
                        's': [
                            2,
                            32
                        ],
                        'm': [
                            2,
                            32
                        ]
                    },
                    '13': {
                        'a': [
                            2,
                            33
                        ],
                        'r': [
                            2,
                            33
                        ],
                        't': [
                            2,
                            33
                        ],
                        'u': [
                            2,
                            33
                        ],
                        'v': [
                            2,
                            33
                        ],
                        'x': [
                            2,
                            33
                        ],
                        'p': [
                            2,
                            33
                        ],
                        'q': [
                            2,
                            33
                        ],
                        'b': [
                            2,
                            33
                        ],
                        's': [
                            2,
                            33
                        ],
                        'm': [
                            2,
                            33
                        ]
                    },
                    '14': {
                        'a': [
                            2,
                            34
                        ],
                        'r': [
                            2,
                            34
                        ],
                        't': [
                            2,
                            34
                        ],
                        'u': [
                            2,
                            34
                        ],
                        'v': [
                            2,
                            34
                        ],
                        'x': [
                            2,
                            34
                        ],
                        'p': [
                            2,
                            34
                        ],
                        'q': [
                            2,
                            34
                        ],
                        'b': [
                            2,
                            34
                        ],
                        's': [
                            2,
                            34
                        ],
                        'm': [
                            2,
                            34
                        ]
                    },
                    '15': {
                        'a': [
                            2,
                            35
                        ],
                        'r': [
                            2,
                            35
                        ],
                        't': [
                            2,
                            35
                        ],
                        'u': [
                            2,
                            35
                        ],
                        'v': [
                            2,
                            35
                        ],
                        'x': [
                            2,
                            35
                        ],
                        'p': [
                            2,
                            35
                        ],
                        'q': [
                            2,
                            35
                        ],
                        'b': [
                            2,
                            35
                        ],
                        's': [
                            2,
                            35
                        ],
                        'm': [
                            2,
                            35
                        ]
                    },
                    '16': {
                        'a': [
                            2,
                            36
                        ],
                        'r': [
                            2,
                            36
                        ],
                        't': [
                            2,
                            36
                        ],
                        'u': [
                            2,
                            36
                        ],
                        'v': [
                            2,
                            36
                        ],
                        'x': [
                            2,
                            36
                        ],
                        'p': [
                            2,
                            36
                        ],
                        'q': [
                            2,
                            36
                        ],
                        'b': [
                            2,
                            36
                        ],
                        's': [
                            2,
                            36
                        ],
                        'm': [
                            2,
                            36
                        ]
                    },
                    '17': {
                        'a': [
                            2,
                            39
                        ],
                        'r': [
                            2,
                            39
                        ],
                        't': [
                            2,
                            39
                        ],
                        'u': [
                            2,
                            39
                        ],
                        'v': [
                            2,
                            39
                        ],
                        'x': [
                            2,
                            39
                        ],
                        'b': [
                            1,
                            undefined,
                            1
                        ],
                        'm': [
                            1,
                            undefined,
                            2
                        ],
                        'p': [
                            1,
                            undefined,
                            4
                        ],
                        'q': [
                            1,
                            undefined,
                            5
                        ],
                        's': [
                            1,
                            undefined,
                            6
                        ]
                    },
                    '18': {
                        'a': [
                            2,
                            3
                        ],
                        'r': [
                            2,
                            3
                        ],
                        't': [
                            2,
                            3
                        ],
                        'u': [
                            2,
                            3
                        ],
                        'v': [
                            2,
                            3
                        ],
                        'x': [
                            2,
                            3
                        ]
                    },
                    '19': {
                        'c': [
                            1,
                            undefined,
                            36
                        ],
                        'd': [
                            1,
                            undefined,
                            37
                        ],
                        'e': [
                            1,
                            undefined,
                            38
                        ],
                        'f': [
                            1,
                            undefined,
                            39
                        ],
                        'g': [
                            1,
                            undefined,
                            40
                        ],
                        'h': [
                            1,
                            undefined,
                            41
                        ],
                        'i': [
                            1,
                            undefined,
                            42
                        ]
                    },
                    '20': {
                        'l': [
                            2,
                            26
                        ]
                    },
                    '21': {
                        'l': [
                            2,
                            27
                        ]
                    },
                    '22': {
                        'l': [
                            2,
                            28
                        ]
                    },
                    '23': {
                        'l': [
                            2,
                            29
                        ]
                    },
                    '24': {
                        'l': [
                            2,
                            30
                        ]
                    },
                    '25': {
                        'l': [
                            1,
                            undefined,
                            44
                        ]
                    },
                    '26': {
                        'k': [
                            1,
                            undefined,
                            45
                        ]
                    },
                    '27': {
                        'a': [
                            2,
                            24
                        ],
                        'r': [
                            2,
                            24
                        ],
                        't': [
                            2,
                            24
                        ],
                        'u': [
                            2,
                            24
                        ],
                        'v': [
                            2,
                            24
                        ],
                        'x': [
                            2,
                            24
                        ],
                        'p': [
                            2,
                            24
                        ],
                        'q': [
                            2,
                            24
                        ],
                        'b': [
                            2,
                            24
                        ],
                        's': [
                            2,
                            24
                        ],
                        'm': [
                            2,
                            24
                        ],
                        'l': [
                            2,
                            24
                        ]
                    },
                    '28': {
                        'b': [
                            1,
                            undefined,
                            1
                        ],
                        'm': [
                            1,
                            undefined,
                            2
                        ],
                        'n': [
                            1,
                            undefined,
                            3
                        ],
                        'p': [
                            1,
                            undefined,
                            4
                        ],
                        'q': [
                            1,
                            undefined,
                            5
                        ],
                        's': [
                            1,
                            undefined,
                            6
                        ],
                        'w': [
                            1,
                            undefined,
                            7
                        ]
                    },
                    '29': {
                        'n': [
                            2,
                            5
                        ],
                        'w': [
                            2,
                            5
                        ],
                        'p': [
                            2,
                            5
                        ],
                        'q': [
                            2,
                            5
                        ],
                        'b': [
                            2,
                            5
                        ],
                        's': [
                            2,
                            5
                        ],
                        'm': [
                            2,
                            5
                        ]
                    },
                    '30': {
                        'n': [
                            2,
                            6
                        ],
                        'w': [
                            2,
                            6
                        ],
                        'p': [
                            2,
                            6
                        ],
                        'q': [
                            2,
                            6
                        ],
                        'b': [
                            2,
                            6
                        ],
                        's': [
                            2,
                            6
                        ],
                        'm': [
                            2,
                            6
                        ]
                    },
                    '31': {
                        'n': [
                            2,
                            7
                        ],
                        'w': [
                            2,
                            7
                        ],
                        'p': [
                            2,
                            7
                        ],
                        'q': [
                            2,
                            7
                        ],
                        'b': [
                            2,
                            7
                        ],
                        's': [
                            2,
                            7
                        ],
                        'm': [
                            2,
                            7
                        ]
                    },
                    '32': {
                        'n': [
                            2,
                            8
                        ],
                        'w': [
                            2,
                            8
                        ],
                        'p': [
                            2,
                            8
                        ],
                        'q': [
                            2,
                            8
                        ],
                        'b': [
                            2,
                            8
                        ],
                        's': [
                            2,
                            8
                        ],
                        'm': [
                            2,
                            8
                        ]
                    },
                    '33': {
                        'b': [
                            1,
                            undefined,
                            1
                        ],
                        'm': [
                            1,
                            undefined,
                            2
                        ],
                        'n': [
                            1,
                            undefined,
                            3
                        ],
                        'p': [
                            1,
                            undefined,
                            4
                        ],
                        'q': [
                            1,
                            undefined,
                            5
                        ],
                        's': [
                            1,
                            undefined,
                            6
                        ],
                        'w': [
                            1,
                            undefined,
                            7
                        ]
                    },
                    '34': {
                        'a': [
                            2,
                            40
                        ],
                        'r': [
                            2,
                            40
                        ],
                        't': [
                            2,
                            40
                        ],
                        'u': [
                            2,
                            40
                        ],
                        'v': [
                            2,
                            40
                        ],
                        'x': [
                            2,
                            40
                        ],
                        'b': [
                            1,
                            undefined,
                            1
                        ],
                        'm': [
                            1,
                            undefined,
                            2
                        ],
                        'p': [
                            1,
                            undefined,
                            4
                        ],
                        'q': [
                            1,
                            undefined,
                            5
                        ],
                        's': [
                            1,
                            undefined,
                            6
                        ]
                    },
                    '35': {
                        'a': [
                            2,
                            37
                        ],
                        'r': [
                            2,
                            37
                        ],
                        't': [
                            2,
                            37
                        ],
                        'u': [
                            2,
                            37
                        ],
                        'v': [
                            2,
                            37
                        ],
                        'x': [
                            2,
                            37
                        ],
                        'p': [
                            2,
                            37
                        ],
                        'q': [
                            2,
                            37
                        ],
                        'b': [
                            2,
                            37
                        ],
                        's': [
                            2,
                            37
                        ],
                        'm': [
                            2,
                            37
                        ]
                    },
                    '36': {
                        'a': [
                            2,
                            19
                        ],
                        'r': [
                            2,
                            19
                        ],
                        't': [
                            2,
                            19
                        ],
                        'u': [
                            2,
                            19
                        ],
                        'v': [
                            2,
                            19
                        ],
                        'x': [
                            2,
                            19
                        ],
                        'p': [
                            2,
                            19
                        ],
                        'q': [
                            2,
                            19
                        ],
                        'b': [
                            2,
                            19
                        ],
                        's': [
                            2,
                            19
                        ],
                        'm': [
                            2,
                            19
                        ],
                        'l': [
                            2,
                            19
                        ]
                    },
                    '37': {
                        'n': [
                            2,
                            17
                        ],
                        'o': [
                            2,
                            17
                        ]
                    },
                    '38': {
                        'n': [
                            2,
                            18
                        ],
                        'o': [
                            2,
                            18
                        ]
                    },
                    '39': {
                        'n': [
                            2,
                            13
                        ],
                        'o': [
                            2,
                            13
                        ]
                    },
                    '40': {
                        'n': [
                            2,
                            14
                        ],
                        'o': [
                            2,
                            14
                        ]
                    },
                    '41': {
                        'n': [
                            2,
                            15
                        ],
                        'o': [
                            2,
                            15
                        ]
                    },
                    '42': {
                        'n': [
                            2,
                            16
                        ],
                        'o': [
                            2,
                            16
                        ]
                    },
                    '43': {
                        'n': [
                            1,
                            undefined,
                            48
                        ],
                        'o': [
                            1,
                            undefined,
                            49
                        ]
                    },
                    '44': {
                        'a': [
                            2,
                            25
                        ],
                        'r': [
                            2,
                            25
                        ],
                        't': [
                            2,
                            25
                        ],
                        'u': [
                            2,
                            25
                        ],
                        'v': [
                            2,
                            25
                        ],
                        'x': [
                            2,
                            25
                        ],
                        'p': [
                            2,
                            25
                        ],
                        'q': [
                            2,
                            25
                        ],
                        'b': [
                            2,
                            25
                        ],
                        's': [
                            2,
                            25
                        ],
                        'm': [
                            2,
                            25
                        ]
                    },
                    '45': {
                        'l': [
                            1,
                            undefined,
                            51
                        ]
                    },
                    '46': {
                        'a': [
                            2,
                            2
                        ],
                        'r': [
                            2,
                            2
                        ],
                        't': [
                            1,
                            undefined,
                            29
                        ],
                        'u': [
                            1,
                            undefined,
                            30
                        ],
                        'v': [
                            1,
                            undefined,
                            31
                        ],
                        'x': [
                            1,
                            undefined,
                            32
                        ]
                    },
                    '47': {
                        'a': [
                            2,
                            4
                        ],
                        'r': [
                            2,
                            4
                        ],
                        't': [
                            2,
                            4
                        ],
                        'u': [
                            2,
                            4
                        ],
                        'v': [
                            2,
                            4
                        ],
                        'x': [
                            2,
                            4
                        ]
                    },
                    '48': {
                        'c': [
                            2,
                            20
                        ]
                    },
                    '49': {
                        'c': [
                            2,
                            21
                        ]
                    },
                    '50': {
                        'c': [
                            1,
                            undefined,
                            52
                        ]
                    },
                    '51': {
                        'a': [
                            2,
                            23
                        ],
                        'r': [
                            2,
                            23
                        ],
                        't': [
                            2,
                            23
                        ],
                        'u': [
                            2,
                            23
                        ],
                        'v': [
                            2,
                            23
                        ],
                        'x': [
                            2,
                            23
                        ],
                        'p': [
                            2,
                            23
                        ],
                        'q': [
                            2,
                            23
                        ],
                        'b': [
                            2,
                            23
                        ],
                        's': [
                            2,
                            23
                        ],
                        'm': [
                            2,
                            23
                        ],
                        'l': [
                            2,
                            23
                        ]
                    },
                    '52': {
                        'a': [
                            2,
                            22
                        ],
                        'r': [
                            2,
                            22
                        ],
                        't': [
                            2,
                            22
                        ],
                        'u': [
                            2,
                            22
                        ],
                        'v': [
                            2,
                            22
                        ],
                        'x': [
                            2,
                            22
                        ],
                        'p': [
                            2,
                            22
                        ],
                        'q': [
                            2,
                            22
                        ],
                        'b': [
                            2,
                            22
                        ],
                        's': [
                            2,
                            22
                        ],
                        'm': [
                            2,
                            22
                        ],
                        'l': [
                            2,
                            22
                        ]
                    }
                }
            };
            parser.parse = function parse(input, filename) {
                var self = this, lexer = self.lexer, state, symbol, action, table = self.table, gotos = table.gotos, tableAction = table.action, productions = self.productions, valueStack = [null],
                    // for debug info
                    prefix = filename ? 'in file: ' + filename + ' ' : '', stack = [0];
                lexer.resetInput(input);
                while (1) {
                    // retrieve state number from top of stack
                    state = stack[stack.length - 1];
                    if (!symbol) {
                        symbol = lexer.lex();
                    }
                    if (symbol) {
                        // read action for current state and first input
                        action = tableAction[state] && tableAction[state][symbol];
                    } else {
                        action = null;
                    }
                    if (!action) {
                        var expected = [], error;    //#JSCOVERAGE_IF
                        //#JSCOVERAGE_IF
                        if (tableAction[state]) {
                            for (var symbolForState in tableAction[state]) {
                                expected.push(self.lexer.mapReverseSymbol(symbolForState));
                            }
                        }
                        error = prefix + 'syntax error at line ' + lexer.lineNumber + ':\n' + lexer.showDebugInfo() + '\n' + 'expect ' + expected.join(', ');
                        throw new Error(error);
                    }
                    switch (action[GrammarConst.TYPE_INDEX]) {
                    case GrammarConst.SHIFT_TYPE:
                        stack.push(symbol);
                        valueStack.push(lexer.text);    // push state
                        // push state
                        stack.push(action[GrammarConst.TO_INDEX]);    // allow to read more
                        // allow to read more
                        symbol = null;
                        break;
                    case GrammarConst.REDUCE_TYPE:
                        var production = productions[action[GrammarConst.PRODUCTION_INDEX]], reducedSymbol = production.symbol || production[0], reducedAction = production.action || production[2], reducedRhs = production.rhs || production[1], len = reducedRhs.length, i = 0, ret, $$ = valueStack[valueStack.length - len];    // default to $$ = $1
                        // default to $$ = $1
                        ret = undefined;
                        self.$$ = $$;
                        for (; i < len; i++) {
                            self['$' + (len - i)] = valueStack[valueStack.length - 1 - i];
                        }
                        if (reducedAction) {
                            ret = reducedAction.call(self);
                        }
                        if (ret !== undefined) {
                            $$ = ret;
                        } else {
                            $$ = self.$$;
                        }
                        stack = stack.slice(0, -1 * len * 2);
                        valueStack = valueStack.slice(0, -1 * len);
                        stack.push(reducedSymbol);
                        valueStack.push($$);
                        var newState = gotos[stack[stack.length - 2]][stack[stack.length - 1]];
                        stack.push(newState);
                        break;
                    case GrammarConst.ACCEPT_TYPE:
                        return $$;
                    }
                }
            };
            return parser;
        }();
    if (typeof module !== 'undefined') {
        module.exports = parser;
    }
});
