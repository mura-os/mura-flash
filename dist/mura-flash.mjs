function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var _2020 = {exports: {}};

var core$1 = {};

var validate = {};

var boolSchema = {};

var errors = {};

var codegen = {};

var code$1 = {};

var hasRequiredCode$1;

function requireCode$1 () {
	if (hasRequiredCode$1) return code$1;
	hasRequiredCode$1 = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.regexpCode = exports.getEsmExportName = exports.getProperty = exports.safeStringify = exports.stringify = exports.strConcat = exports.addCodeArg = exports.str = exports._ = exports.nil = exports._Code = exports.Name = exports.IDENTIFIER = exports._CodeOrName = void 0;
		// eslint-disable-next-line @typescript-eslint/no-extraneous-class
		class _CodeOrName {
		}
		exports._CodeOrName = _CodeOrName;
		exports.IDENTIFIER = /^[a-z$_][a-z$_0-9]*$/i;
		class Name extends _CodeOrName {
		    constructor(s) {
		        super();
		        if (!exports.IDENTIFIER.test(s))
		            throw new Error("CodeGen: name must be a valid identifier");
		        this.str = s;
		    }
		    toString() {
		        return this.str;
		    }
		    emptyStr() {
		        return false;
		    }
		    get names() {
		        return { [this.str]: 1 };
		    }
		}
		exports.Name = Name;
		class _Code extends _CodeOrName {
		    constructor(code) {
		        super();
		        this._items = typeof code === "string" ? [code] : code;
		    }
		    toString() {
		        return this.str;
		    }
		    emptyStr() {
		        if (this._items.length > 1)
		            return false;
		        const item = this._items[0];
		        return item === "" || item === '""';
		    }
		    get str() {
		        var _a;
		        return ((_a = this._str) !== null && _a !== void 0 ? _a : (this._str = this._items.reduce((s, c) => `${s}${c}`, "")));
		    }
		    get names() {
		        var _a;
		        return ((_a = this._names) !== null && _a !== void 0 ? _a : (this._names = this._items.reduce((names, c) => {
		            if (c instanceof Name)
		                names[c.str] = (names[c.str] || 0) + 1;
		            return names;
		        }, {})));
		    }
		}
		exports._Code = _Code;
		exports.nil = new _Code("");
		function _(strs, ...args) {
		    const code = [strs[0]];
		    let i = 0;
		    while (i < args.length) {
		        addCodeArg(code, args[i]);
		        code.push(strs[++i]);
		    }
		    return new _Code(code);
		}
		exports._ = _;
		const plus = new _Code("+");
		function str(strs, ...args) {
		    const expr = [safeStringify(strs[0])];
		    let i = 0;
		    while (i < args.length) {
		        expr.push(plus);
		        addCodeArg(expr, args[i]);
		        expr.push(plus, safeStringify(strs[++i]));
		    }
		    optimize(expr);
		    return new _Code(expr);
		}
		exports.str = str;
		function addCodeArg(code, arg) {
		    if (arg instanceof _Code)
		        code.push(...arg._items);
		    else if (arg instanceof Name)
		        code.push(arg);
		    else
		        code.push(interpolate(arg));
		}
		exports.addCodeArg = addCodeArg;
		function optimize(expr) {
		    let i = 1;
		    while (i < expr.length - 1) {
		        if (expr[i] === plus) {
		            const res = mergeExprItems(expr[i - 1], expr[i + 1]);
		            if (res !== undefined) {
		                expr.splice(i - 1, 3, res);
		                continue;
		            }
		            expr[i++] = "+";
		        }
		        i++;
		    }
		}
		function mergeExprItems(a, b) {
		    if (b === '""')
		        return a;
		    if (a === '""')
		        return b;
		    if (typeof a == "string") {
		        if (b instanceof Name || a[a.length - 1] !== '"')
		            return;
		        if (typeof b != "string")
		            return `${a.slice(0, -1)}${b}"`;
		        if (b[0] === '"')
		            return a.slice(0, -1) + b.slice(1);
		        return;
		    }
		    if (typeof b == "string" && b[0] === '"' && !(a instanceof Name))
		        return `"${a}${b.slice(1)}`;
		    return;
		}
		function strConcat(c1, c2) {
		    return c2.emptyStr() ? c1 : c1.emptyStr() ? c2 : str `${c1}${c2}`;
		}
		exports.strConcat = strConcat;
		// TODO do not allow arrays here
		function interpolate(x) {
		    return typeof x == "number" || typeof x == "boolean" || x === null
		        ? x
		        : safeStringify(Array.isArray(x) ? x.join(",") : x);
		}
		function stringify(x) {
		    return new _Code(safeStringify(x));
		}
		exports.stringify = stringify;
		function safeStringify(x) {
		    return JSON.stringify(x)
		        .replace(/\u2028/g, "\\u2028")
		        .replace(/\u2029/g, "\\u2029");
		}
		exports.safeStringify = safeStringify;
		function getProperty(key) {
		    return typeof key == "string" && exports.IDENTIFIER.test(key) ? new _Code(`.${key}`) : _ `[${key}]`;
		}
		exports.getProperty = getProperty;
		//Does best effort to format the name properly
		function getEsmExportName(key) {
		    if (typeof key == "string" && exports.IDENTIFIER.test(key)) {
		        return new _Code(`${key}`);
		    }
		    throw new Error(`CodeGen: invalid export name: ${key}, use explicit $id name mapping`);
		}
		exports.getEsmExportName = getEsmExportName;
		function regexpCode(rx) {
		    return new _Code(rx.toString());
		}
		exports.regexpCode = regexpCode;
		
	} (code$1));
	return code$1;
}

var scope = {};

var hasRequiredScope;

function requireScope () {
	if (hasRequiredScope) return scope;
	hasRequiredScope = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.ValueScope = exports.ValueScopeName = exports.Scope = exports.varKinds = exports.UsedValueState = void 0;
		const code_1 = /*@__PURE__*/ requireCode$1();
		class ValueError extends Error {
		    constructor(name) {
		        super(`CodeGen: "code" for ${name} not defined`);
		        this.value = name.value;
		    }
		}
		var UsedValueState;
		(function (UsedValueState) {
		    UsedValueState[UsedValueState["Started"] = 0] = "Started";
		    UsedValueState[UsedValueState["Completed"] = 1] = "Completed";
		})(UsedValueState || (exports.UsedValueState = UsedValueState = {}));
		exports.varKinds = {
		    const: new code_1.Name("const"),
		    let: new code_1.Name("let"),
		    var: new code_1.Name("var"),
		};
		class Scope {
		    constructor({ prefixes, parent } = {}) {
		        this._names = {};
		        this._prefixes = prefixes;
		        this._parent = parent;
		    }
		    toName(nameOrPrefix) {
		        return nameOrPrefix instanceof code_1.Name ? nameOrPrefix : this.name(nameOrPrefix);
		    }
		    name(prefix) {
		        return new code_1.Name(this._newName(prefix));
		    }
		    _newName(prefix) {
		        const ng = this._names[prefix] || this._nameGroup(prefix);
		        return `${prefix}${ng.index++}`;
		    }
		    _nameGroup(prefix) {
		        var _a, _b;
		        if (((_b = (_a = this._parent) === null || _a === void 0 ? void 0 : _a._prefixes) === null || _b === void 0 ? void 0 : _b.has(prefix)) || (this._prefixes && !this._prefixes.has(prefix))) {
		            throw new Error(`CodeGen: prefix "${prefix}" is not allowed in this scope`);
		        }
		        return (this._names[prefix] = { prefix, index: 0 });
		    }
		}
		exports.Scope = Scope;
		class ValueScopeName extends code_1.Name {
		    constructor(prefix, nameStr) {
		        super(nameStr);
		        this.prefix = prefix;
		    }
		    setValue(value, { property, itemIndex }) {
		        this.value = value;
		        this.scopePath = (0, code_1._) `.${new code_1.Name(property)}[${itemIndex}]`;
		    }
		}
		exports.ValueScopeName = ValueScopeName;
		const line = (0, code_1._) `\n`;
		class ValueScope extends Scope {
		    constructor(opts) {
		        super(opts);
		        this._values = {};
		        this._scope = opts.scope;
		        this.opts = { ...opts, _n: opts.lines ? line : code_1.nil };
		    }
		    get() {
		        return this._scope;
		    }
		    name(prefix) {
		        return new ValueScopeName(prefix, this._newName(prefix));
		    }
		    value(nameOrPrefix, value) {
		        var _a;
		        if (value.ref === undefined)
		            throw new Error("CodeGen: ref must be passed in value");
		        const name = this.toName(nameOrPrefix);
		        const { prefix } = name;
		        const valueKey = (_a = value.key) !== null && _a !== void 0 ? _a : value.ref;
		        let vs = this._values[prefix];
		        if (vs) {
		            const _name = vs.get(valueKey);
		            if (_name)
		                return _name;
		        }
		        else {
		            vs = this._values[prefix] = new Map();
		        }
		        vs.set(valueKey, name);
		        const s = this._scope[prefix] || (this._scope[prefix] = []);
		        const itemIndex = s.length;
		        s[itemIndex] = value.ref;
		        name.setValue(value, { property: prefix, itemIndex });
		        return name;
		    }
		    getValue(prefix, keyOrRef) {
		        const vs = this._values[prefix];
		        if (!vs)
		            return;
		        return vs.get(keyOrRef);
		    }
		    scopeRefs(scopeName, values = this._values) {
		        return this._reduceValues(values, (name) => {
		            if (name.scopePath === undefined)
		                throw new Error(`CodeGen: name "${name}" has no value`);
		            return (0, code_1._) `${scopeName}${name.scopePath}`;
		        });
		    }
		    scopeCode(values = this._values, usedValues, getCode) {
		        return this._reduceValues(values, (name) => {
		            if (name.value === undefined)
		                throw new Error(`CodeGen: name "${name}" has no value`);
		            return name.value.code;
		        }, usedValues, getCode);
		    }
		    _reduceValues(values, valueCode, usedValues = {}, getCode) {
		        let code = code_1.nil;
		        for (const prefix in values) {
		            const vs = values[prefix];
		            if (!vs)
		                continue;
		            const nameSet = (usedValues[prefix] = usedValues[prefix] || new Map());
		            vs.forEach((name) => {
		                if (nameSet.has(name))
		                    return;
		                nameSet.set(name, UsedValueState.Started);
		                let c = valueCode(name);
		                if (c) {
		                    const def = this.opts.es5 ? exports.varKinds.var : exports.varKinds.const;
		                    code = (0, code_1._) `${code}${def} ${name} = ${c};${this.opts._n}`;
		                }
		                else if ((c = getCode === null || getCode === void 0 ? void 0 : getCode(name))) {
		                    code = (0, code_1._) `${code}${c}${this.opts._n}`;
		                }
		                else {
		                    throw new ValueError(name);
		                }
		                nameSet.set(name, UsedValueState.Completed);
		            });
		        }
		        return code;
		    }
		}
		exports.ValueScope = ValueScope;
		
	} (scope));
	return scope;
}

var hasRequiredCodegen;

function requireCodegen () {
	if (hasRequiredCodegen) return codegen;
	hasRequiredCodegen = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.or = exports.and = exports.not = exports.CodeGen = exports.operators = exports.varKinds = exports.ValueScopeName = exports.ValueScope = exports.Scope = exports.Name = exports.regexpCode = exports.stringify = exports.getProperty = exports.nil = exports.strConcat = exports.str = exports._ = void 0;
		const code_1 = /*@__PURE__*/ requireCode$1();
		const scope_1 = /*@__PURE__*/ requireScope();
		var code_2 = /*@__PURE__*/ requireCode$1();
		Object.defineProperty(exports, "_", { enumerable: true, get: function () { return code_2._; } });
		Object.defineProperty(exports, "str", { enumerable: true, get: function () { return code_2.str; } });
		Object.defineProperty(exports, "strConcat", { enumerable: true, get: function () { return code_2.strConcat; } });
		Object.defineProperty(exports, "nil", { enumerable: true, get: function () { return code_2.nil; } });
		Object.defineProperty(exports, "getProperty", { enumerable: true, get: function () { return code_2.getProperty; } });
		Object.defineProperty(exports, "stringify", { enumerable: true, get: function () { return code_2.stringify; } });
		Object.defineProperty(exports, "regexpCode", { enumerable: true, get: function () { return code_2.regexpCode; } });
		Object.defineProperty(exports, "Name", { enumerable: true, get: function () { return code_2.Name; } });
		var scope_2 = /*@__PURE__*/ requireScope();
		Object.defineProperty(exports, "Scope", { enumerable: true, get: function () { return scope_2.Scope; } });
		Object.defineProperty(exports, "ValueScope", { enumerable: true, get: function () { return scope_2.ValueScope; } });
		Object.defineProperty(exports, "ValueScopeName", { enumerable: true, get: function () { return scope_2.ValueScopeName; } });
		Object.defineProperty(exports, "varKinds", { enumerable: true, get: function () { return scope_2.varKinds; } });
		exports.operators = {
		    GT: new code_1._Code(">"),
		    GTE: new code_1._Code(">="),
		    LT: new code_1._Code("<"),
		    LTE: new code_1._Code("<="),
		    EQ: new code_1._Code("==="),
		    NEQ: new code_1._Code("!=="),
		    NOT: new code_1._Code("!"),
		    OR: new code_1._Code("||"),
		    AND: new code_1._Code("&&"),
		    ADD: new code_1._Code("+"),
		};
		class Node {
		    optimizeNodes() {
		        return this;
		    }
		    optimizeNames(_names, _constants) {
		        return this;
		    }
		}
		class Def extends Node {
		    constructor(varKind, name, rhs) {
		        super();
		        this.varKind = varKind;
		        this.name = name;
		        this.rhs = rhs;
		    }
		    render({ es5, _n }) {
		        const varKind = es5 ? scope_1.varKinds.var : this.varKind;
		        const rhs = this.rhs === undefined ? "" : ` = ${this.rhs}`;
		        return `${varKind} ${this.name}${rhs};` + _n;
		    }
		    optimizeNames(names, constants) {
		        if (!names[this.name.str])
		            return;
		        if (this.rhs)
		            this.rhs = optimizeExpr(this.rhs, names, constants);
		        return this;
		    }
		    get names() {
		        return this.rhs instanceof code_1._CodeOrName ? this.rhs.names : {};
		    }
		}
		class Assign extends Node {
		    constructor(lhs, rhs, sideEffects) {
		        super();
		        this.lhs = lhs;
		        this.rhs = rhs;
		        this.sideEffects = sideEffects;
		    }
		    render({ _n }) {
		        return `${this.lhs} = ${this.rhs};` + _n;
		    }
		    optimizeNames(names, constants) {
		        if (this.lhs instanceof code_1.Name && !names[this.lhs.str] && !this.sideEffects)
		            return;
		        this.rhs = optimizeExpr(this.rhs, names, constants);
		        return this;
		    }
		    get names() {
		        const names = this.lhs instanceof code_1.Name ? {} : { ...this.lhs.names };
		        return addExprNames(names, this.rhs);
		    }
		}
		class AssignOp extends Assign {
		    constructor(lhs, op, rhs, sideEffects) {
		        super(lhs, rhs, sideEffects);
		        this.op = op;
		    }
		    render({ _n }) {
		        return `${this.lhs} ${this.op}= ${this.rhs};` + _n;
		    }
		}
		class Label extends Node {
		    constructor(label) {
		        super();
		        this.label = label;
		        this.names = {};
		    }
		    render({ _n }) {
		        return `${this.label}:` + _n;
		    }
		}
		class Break extends Node {
		    constructor(label) {
		        super();
		        this.label = label;
		        this.names = {};
		    }
		    render({ _n }) {
		        const label = this.label ? ` ${this.label}` : "";
		        return `break${label};` + _n;
		    }
		}
		class Throw extends Node {
		    constructor(error) {
		        super();
		        this.error = error;
		    }
		    render({ _n }) {
		        return `throw ${this.error};` + _n;
		    }
		    get names() {
		        return this.error.names;
		    }
		}
		class AnyCode extends Node {
		    constructor(code) {
		        super();
		        this.code = code;
		    }
		    render({ _n }) {
		        return `${this.code};` + _n;
		    }
		    optimizeNodes() {
		        return `${this.code}` ? this : undefined;
		    }
		    optimizeNames(names, constants) {
		        this.code = optimizeExpr(this.code, names, constants);
		        return this;
		    }
		    get names() {
		        return this.code instanceof code_1._CodeOrName ? this.code.names : {};
		    }
		}
		class ParentNode extends Node {
		    constructor(nodes = []) {
		        super();
		        this.nodes = nodes;
		    }
		    render(opts) {
		        return this.nodes.reduce((code, n) => code + n.render(opts), "");
		    }
		    optimizeNodes() {
		        const { nodes } = this;
		        let i = nodes.length;
		        while (i--) {
		            const n = nodes[i].optimizeNodes();
		            if (Array.isArray(n))
		                nodes.splice(i, 1, ...n);
		            else if (n)
		                nodes[i] = n;
		            else
		                nodes.splice(i, 1);
		        }
		        return nodes.length > 0 ? this : undefined;
		    }
		    optimizeNames(names, constants) {
		        const { nodes } = this;
		        let i = nodes.length;
		        while (i--) {
		            // iterating backwards improves 1-pass optimization
		            const n = nodes[i];
		            if (n.optimizeNames(names, constants))
		                continue;
		            subtractNames(names, n.names);
		            nodes.splice(i, 1);
		        }
		        return nodes.length > 0 ? this : undefined;
		    }
		    get names() {
		        return this.nodes.reduce((names, n) => addNames(names, n.names), {});
		    }
		}
		class BlockNode extends ParentNode {
		    render(opts) {
		        return "{" + opts._n + super.render(opts) + "}" + opts._n;
		    }
		}
		class Root extends ParentNode {
		}
		class Else extends BlockNode {
		}
		Else.kind = "else";
		class If extends BlockNode {
		    constructor(condition, nodes) {
		        super(nodes);
		        this.condition = condition;
		    }
		    render(opts) {
		        let code = `if(${this.condition})` + super.render(opts);
		        if (this.else)
		            code += "else " + this.else.render(opts);
		        return code;
		    }
		    optimizeNodes() {
		        super.optimizeNodes();
		        const cond = this.condition;
		        if (cond === true)
		            return this.nodes; // else is ignored here
		        let e = this.else;
		        if (e) {
		            const ns = e.optimizeNodes();
		            e = this.else = Array.isArray(ns) ? new Else(ns) : ns;
		        }
		        if (e) {
		            if (cond === false)
		                return e instanceof If ? e : e.nodes;
		            if (this.nodes.length)
		                return this;
		            return new If(not(cond), e instanceof If ? [e] : e.nodes);
		        }
		        if (cond === false || !this.nodes.length)
		            return undefined;
		        return this;
		    }
		    optimizeNames(names, constants) {
		        var _a;
		        this.else = (_a = this.else) === null || _a === void 0 ? void 0 : _a.optimizeNames(names, constants);
		        if (!(super.optimizeNames(names, constants) || this.else))
		            return;
		        this.condition = optimizeExpr(this.condition, names, constants);
		        return this;
		    }
		    get names() {
		        const names = super.names;
		        addExprNames(names, this.condition);
		        if (this.else)
		            addNames(names, this.else.names);
		        return names;
		    }
		}
		If.kind = "if";
		class For extends BlockNode {
		}
		For.kind = "for";
		class ForLoop extends For {
		    constructor(iteration) {
		        super();
		        this.iteration = iteration;
		    }
		    render(opts) {
		        return `for(${this.iteration})` + super.render(opts);
		    }
		    optimizeNames(names, constants) {
		        if (!super.optimizeNames(names, constants))
		            return;
		        this.iteration = optimizeExpr(this.iteration, names, constants);
		        return this;
		    }
		    get names() {
		        return addNames(super.names, this.iteration.names);
		    }
		}
		class ForRange extends For {
		    constructor(varKind, name, from, to) {
		        super();
		        this.varKind = varKind;
		        this.name = name;
		        this.from = from;
		        this.to = to;
		    }
		    render(opts) {
		        const varKind = opts.es5 ? scope_1.varKinds.var : this.varKind;
		        const { name, from, to } = this;
		        return `for(${varKind} ${name}=${from}; ${name}<${to}; ${name}++)` + super.render(opts);
		    }
		    get names() {
		        const names = addExprNames(super.names, this.from);
		        return addExprNames(names, this.to);
		    }
		}
		class ForIter extends For {
		    constructor(loop, varKind, name, iterable) {
		        super();
		        this.loop = loop;
		        this.varKind = varKind;
		        this.name = name;
		        this.iterable = iterable;
		    }
		    render(opts) {
		        return `for(${this.varKind} ${this.name} ${this.loop} ${this.iterable})` + super.render(opts);
		    }
		    optimizeNames(names, constants) {
		        if (!super.optimizeNames(names, constants))
		            return;
		        this.iterable = optimizeExpr(this.iterable, names, constants);
		        return this;
		    }
		    get names() {
		        return addNames(super.names, this.iterable.names);
		    }
		}
		class Func extends BlockNode {
		    constructor(name, args, async) {
		        super();
		        this.name = name;
		        this.args = args;
		        this.async = async;
		    }
		    render(opts) {
		        const _async = this.async ? "async " : "";
		        return `${_async}function ${this.name}(${this.args})` + super.render(opts);
		    }
		}
		Func.kind = "func";
		class Return extends ParentNode {
		    render(opts) {
		        return "return " + super.render(opts);
		    }
		}
		Return.kind = "return";
		class Try extends BlockNode {
		    render(opts) {
		        let code = "try" + super.render(opts);
		        if (this.catch)
		            code += this.catch.render(opts);
		        if (this.finally)
		            code += this.finally.render(opts);
		        return code;
		    }
		    optimizeNodes() {
		        var _a, _b;
		        super.optimizeNodes();
		        (_a = this.catch) === null || _a === void 0 ? void 0 : _a.optimizeNodes();
		        (_b = this.finally) === null || _b === void 0 ? void 0 : _b.optimizeNodes();
		        return this;
		    }
		    optimizeNames(names, constants) {
		        var _a, _b;
		        super.optimizeNames(names, constants);
		        (_a = this.catch) === null || _a === void 0 ? void 0 : _a.optimizeNames(names, constants);
		        (_b = this.finally) === null || _b === void 0 ? void 0 : _b.optimizeNames(names, constants);
		        return this;
		    }
		    get names() {
		        const names = super.names;
		        if (this.catch)
		            addNames(names, this.catch.names);
		        if (this.finally)
		            addNames(names, this.finally.names);
		        return names;
		    }
		}
		class Catch extends BlockNode {
		    constructor(error) {
		        super();
		        this.error = error;
		    }
		    render(opts) {
		        return `catch(${this.error})` + super.render(opts);
		    }
		}
		Catch.kind = "catch";
		class Finally extends BlockNode {
		    render(opts) {
		        return "finally" + super.render(opts);
		    }
		}
		Finally.kind = "finally";
		class CodeGen {
		    constructor(extScope, opts = {}) {
		        this._values = {};
		        this._blockStarts = [];
		        this._constants = {};
		        this.opts = { ...opts, _n: opts.lines ? "\n" : "" };
		        this._extScope = extScope;
		        this._scope = new scope_1.Scope({ parent: extScope });
		        this._nodes = [new Root()];
		    }
		    toString() {
		        return this._root.render(this.opts);
		    }
		    // returns unique name in the internal scope
		    name(prefix) {
		        return this._scope.name(prefix);
		    }
		    // reserves unique name in the external scope
		    scopeName(prefix) {
		        return this._extScope.name(prefix);
		    }
		    // reserves unique name in the external scope and assigns value to it
		    scopeValue(prefixOrName, value) {
		        const name = this._extScope.value(prefixOrName, value);
		        const vs = this._values[name.prefix] || (this._values[name.prefix] = new Set());
		        vs.add(name);
		        return name;
		    }
		    getScopeValue(prefix, keyOrRef) {
		        return this._extScope.getValue(prefix, keyOrRef);
		    }
		    // return code that assigns values in the external scope to the names that are used internally
		    // (same names that were returned by gen.scopeName or gen.scopeValue)
		    scopeRefs(scopeName) {
		        return this._extScope.scopeRefs(scopeName, this._values);
		    }
		    scopeCode() {
		        return this._extScope.scopeCode(this._values);
		    }
		    _def(varKind, nameOrPrefix, rhs, constant) {
		        const name = this._scope.toName(nameOrPrefix);
		        if (rhs !== undefined && constant)
		            this._constants[name.str] = rhs;
		        this._leafNode(new Def(varKind, name, rhs));
		        return name;
		    }
		    // `const` declaration (`var` in es5 mode)
		    const(nameOrPrefix, rhs, _constant) {
		        return this._def(scope_1.varKinds.const, nameOrPrefix, rhs, _constant);
		    }
		    // `let` declaration with optional assignment (`var` in es5 mode)
		    let(nameOrPrefix, rhs, _constant) {
		        return this._def(scope_1.varKinds.let, nameOrPrefix, rhs, _constant);
		    }
		    // `var` declaration with optional assignment
		    var(nameOrPrefix, rhs, _constant) {
		        return this._def(scope_1.varKinds.var, nameOrPrefix, rhs, _constant);
		    }
		    // assignment code
		    assign(lhs, rhs, sideEffects) {
		        return this._leafNode(new Assign(lhs, rhs, sideEffects));
		    }
		    // `+=` code
		    add(lhs, rhs) {
		        return this._leafNode(new AssignOp(lhs, exports.operators.ADD, rhs));
		    }
		    // appends passed SafeExpr to code or executes Block
		    code(c) {
		        if (typeof c == "function")
		            c();
		        else if (c !== code_1.nil)
		            this._leafNode(new AnyCode(c));
		        return this;
		    }
		    // returns code for object literal for the passed argument list of key-value pairs
		    object(...keyValues) {
		        const code = ["{"];
		        for (const [key, value] of keyValues) {
		            if (code.length > 1)
		                code.push(",");
		            code.push(key);
		            if (key !== value || this.opts.es5) {
		                code.push(":");
		                (0, code_1.addCodeArg)(code, value);
		            }
		        }
		        code.push("}");
		        return new code_1._Code(code);
		    }
		    // `if` clause (or statement if `thenBody` and, optionally, `elseBody` are passed)
		    if(condition, thenBody, elseBody) {
		        this._blockNode(new If(condition));
		        if (thenBody && elseBody) {
		            this.code(thenBody).else().code(elseBody).endIf();
		        }
		        else if (thenBody) {
		            this.code(thenBody).endIf();
		        }
		        else if (elseBody) {
		            throw new Error('CodeGen: "else" body without "then" body');
		        }
		        return this;
		    }
		    // `else if` clause - invalid without `if` or after `else` clauses
		    elseIf(condition) {
		        return this._elseNode(new If(condition));
		    }
		    // `else` clause - only valid after `if` or `else if` clauses
		    else() {
		        return this._elseNode(new Else());
		    }
		    // end `if` statement (needed if gen.if was used only with condition)
		    endIf() {
		        return this._endBlockNode(If, Else);
		    }
		    _for(node, forBody) {
		        this._blockNode(node);
		        if (forBody)
		            this.code(forBody).endFor();
		        return this;
		    }
		    // a generic `for` clause (or statement if `forBody` is passed)
		    for(iteration, forBody) {
		        return this._for(new ForLoop(iteration), forBody);
		    }
		    // `for` statement for a range of values
		    forRange(nameOrPrefix, from, to, forBody, varKind = this.opts.es5 ? scope_1.varKinds.var : scope_1.varKinds.let) {
		        const name = this._scope.toName(nameOrPrefix);
		        return this._for(new ForRange(varKind, name, from, to), () => forBody(name));
		    }
		    // `for-of` statement (in es5 mode replace with a normal for loop)
		    forOf(nameOrPrefix, iterable, forBody, varKind = scope_1.varKinds.const) {
		        const name = this._scope.toName(nameOrPrefix);
		        if (this.opts.es5) {
		            const arr = iterable instanceof code_1.Name ? iterable : this.var("_arr", iterable);
		            return this.forRange("_i", 0, (0, code_1._) `${arr}.length`, (i) => {
		                this.var(name, (0, code_1._) `${arr}[${i}]`);
		                forBody(name);
		            });
		        }
		        return this._for(new ForIter("of", varKind, name, iterable), () => forBody(name));
		    }
		    // `for-in` statement.
		    // With option `ownProperties` replaced with a `for-of` loop for object keys
		    forIn(nameOrPrefix, obj, forBody, varKind = this.opts.es5 ? scope_1.varKinds.var : scope_1.varKinds.const) {
		        if (this.opts.ownProperties) {
		            return this.forOf(nameOrPrefix, (0, code_1._) `Object.keys(${obj})`, forBody);
		        }
		        const name = this._scope.toName(nameOrPrefix);
		        return this._for(new ForIter("in", varKind, name, obj), () => forBody(name));
		    }
		    // end `for` loop
		    endFor() {
		        return this._endBlockNode(For);
		    }
		    // `label` statement
		    label(label) {
		        return this._leafNode(new Label(label));
		    }
		    // `break` statement
		    break(label) {
		        return this._leafNode(new Break(label));
		    }
		    // `return` statement
		    return(value) {
		        const node = new Return();
		        this._blockNode(node);
		        this.code(value);
		        if (node.nodes.length !== 1)
		            throw new Error('CodeGen: "return" should have one node');
		        return this._endBlockNode(Return);
		    }
		    // `try` statement
		    try(tryBody, catchCode, finallyCode) {
		        if (!catchCode && !finallyCode)
		            throw new Error('CodeGen: "try" without "catch" and "finally"');
		        const node = new Try();
		        this._blockNode(node);
		        this.code(tryBody);
		        if (catchCode) {
		            const error = this.name("e");
		            this._currNode = node.catch = new Catch(error);
		            catchCode(error);
		        }
		        if (finallyCode) {
		            this._currNode = node.finally = new Finally();
		            this.code(finallyCode);
		        }
		        return this._endBlockNode(Catch, Finally);
		    }
		    // `throw` statement
		    throw(error) {
		        return this._leafNode(new Throw(error));
		    }
		    // start self-balancing block
		    block(body, nodeCount) {
		        this._blockStarts.push(this._nodes.length);
		        if (body)
		            this.code(body).endBlock(nodeCount);
		        return this;
		    }
		    // end the current self-balancing block
		    endBlock(nodeCount) {
		        const len = this._blockStarts.pop();
		        if (len === undefined)
		            throw new Error("CodeGen: not in self-balancing block");
		        const toClose = this._nodes.length - len;
		        if (toClose < 0 || (nodeCount !== undefined && toClose !== nodeCount)) {
		            throw new Error(`CodeGen: wrong number of nodes: ${toClose} vs ${nodeCount} expected`);
		        }
		        this._nodes.length = len;
		        return this;
		    }
		    // `function` heading (or definition if funcBody is passed)
		    func(name, args = code_1.nil, async, funcBody) {
		        this._blockNode(new Func(name, args, async));
		        if (funcBody)
		            this.code(funcBody).endFunc();
		        return this;
		    }
		    // end function definition
		    endFunc() {
		        return this._endBlockNode(Func);
		    }
		    optimize(n = 1) {
		        while (n-- > 0) {
		            this._root.optimizeNodes();
		            this._root.optimizeNames(this._root.names, this._constants);
		        }
		    }
		    _leafNode(node) {
		        this._currNode.nodes.push(node);
		        return this;
		    }
		    _blockNode(node) {
		        this._currNode.nodes.push(node);
		        this._nodes.push(node);
		    }
		    _endBlockNode(N1, N2) {
		        const n = this._currNode;
		        if (n instanceof N1 || (N2 && n instanceof N2)) {
		            this._nodes.pop();
		            return this;
		        }
		        throw new Error(`CodeGen: not in block "${N2 ? `${N1.kind}/${N2.kind}` : N1.kind}"`);
		    }
		    _elseNode(node) {
		        const n = this._currNode;
		        if (!(n instanceof If)) {
		            throw new Error('CodeGen: "else" without "if"');
		        }
		        this._currNode = n.else = node;
		        return this;
		    }
		    get _root() {
		        return this._nodes[0];
		    }
		    get _currNode() {
		        const ns = this._nodes;
		        return ns[ns.length - 1];
		    }
		    set _currNode(node) {
		        const ns = this._nodes;
		        ns[ns.length - 1] = node;
		    }
		}
		exports.CodeGen = CodeGen;
		function addNames(names, from) {
		    for (const n in from)
		        names[n] = (names[n] || 0) + (from[n] || 0);
		    return names;
		}
		function addExprNames(names, from) {
		    return from instanceof code_1._CodeOrName ? addNames(names, from.names) : names;
		}
		function optimizeExpr(expr, names, constants) {
		    if (expr instanceof code_1.Name)
		        return replaceName(expr);
		    if (!canOptimize(expr))
		        return expr;
		    return new code_1._Code(expr._items.reduce((items, c) => {
		        if (c instanceof code_1.Name)
		            c = replaceName(c);
		        if (c instanceof code_1._Code)
		            items.push(...c._items);
		        else
		            items.push(c);
		        return items;
		    }, []));
		    function replaceName(n) {
		        const c = constants[n.str];
		        if (c === undefined || names[n.str] !== 1)
		            return n;
		        delete names[n.str];
		        return c;
		    }
		    function canOptimize(e) {
		        return (e instanceof code_1._Code &&
		            e._items.some((c) => c instanceof code_1.Name && names[c.str] === 1 && constants[c.str] !== undefined));
		    }
		}
		function subtractNames(names, from) {
		    for (const n in from)
		        names[n] = (names[n] || 0) - (from[n] || 0);
		}
		function not(x) {
		    return typeof x == "boolean" || typeof x == "number" || x === null ? !x : (0, code_1._) `!${par(x)}`;
		}
		exports.not = not;
		const andCode = mappend(exports.operators.AND);
		// boolean AND (&&) expression with the passed arguments
		function and(...args) {
		    return args.reduce(andCode);
		}
		exports.and = and;
		const orCode = mappend(exports.operators.OR);
		// boolean OR (||) expression with the passed arguments
		function or(...args) {
		    return args.reduce(orCode);
		}
		exports.or = or;
		function mappend(op) {
		    return (x, y) => (x === code_1.nil ? y : y === code_1.nil ? x : (0, code_1._) `${par(x)} ${op} ${par(y)}`);
		}
		function par(x) {
		    return x instanceof code_1.Name ? x : (0, code_1._) `(${x})`;
		}
		
	} (codegen));
	return codegen;
}

var util = {};

var hasRequiredUtil;

function requireUtil () {
	if (hasRequiredUtil) return util;
	hasRequiredUtil = 1;
	Object.defineProperty(util, "__esModule", { value: true });
	util.checkStrictMode = util.getErrorPath = util.Type = util.useFunc = util.setEvaluated = util.evaluatedPropsToName = util.mergeEvaluated = util.eachItem = util.unescapeJsonPointer = util.escapeJsonPointer = util.escapeFragment = util.unescapeFragment = util.schemaRefOrVal = util.schemaHasRulesButRef = util.schemaHasRules = util.checkUnknownRules = util.alwaysValidSchema = util.toHash = void 0;
	const codegen_1 = /*@__PURE__*/ requireCodegen();
	const code_1 = /*@__PURE__*/ requireCode$1();
	// TODO refactor to use Set
	function toHash(arr) {
	    const hash = {};
	    for (const item of arr)
	        hash[item] = true;
	    return hash;
	}
	util.toHash = toHash;
	function alwaysValidSchema(it, schema) {
	    if (typeof schema == "boolean")
	        return schema;
	    if (Object.keys(schema).length === 0)
	        return true;
	    checkUnknownRules(it, schema);
	    return !schemaHasRules(schema, it.self.RULES.all);
	}
	util.alwaysValidSchema = alwaysValidSchema;
	function checkUnknownRules(it, schema = it.schema) {
	    const { opts, self } = it;
	    if (!opts.strictSchema)
	        return;
	    if (typeof schema === "boolean")
	        return;
	    const rules = self.RULES.keywords;
	    for (const key in schema) {
	        if (!rules[key])
	            checkStrictMode(it, `unknown keyword: "${key}"`);
	    }
	}
	util.checkUnknownRules = checkUnknownRules;
	function schemaHasRules(schema, rules) {
	    if (typeof schema == "boolean")
	        return !schema;
	    for (const key in schema)
	        if (rules[key])
	            return true;
	    return false;
	}
	util.schemaHasRules = schemaHasRules;
	function schemaHasRulesButRef(schema, RULES) {
	    if (typeof schema == "boolean")
	        return !schema;
	    for (const key in schema)
	        if (key !== "$ref" && RULES.all[key])
	            return true;
	    return false;
	}
	util.schemaHasRulesButRef = schemaHasRulesButRef;
	function schemaRefOrVal({ topSchemaRef, schemaPath }, schema, keyword, $data) {
	    if (!$data) {
	        if (typeof schema == "number" || typeof schema == "boolean")
	            return schema;
	        if (typeof schema == "string")
	            return (0, codegen_1._) `${schema}`;
	    }
	    return (0, codegen_1._) `${topSchemaRef}${schemaPath}${(0, codegen_1.getProperty)(keyword)}`;
	}
	util.schemaRefOrVal = schemaRefOrVal;
	function unescapeFragment(str) {
	    return unescapeJsonPointer(decodeURIComponent(str));
	}
	util.unescapeFragment = unescapeFragment;
	function escapeFragment(str) {
	    return encodeURIComponent(escapeJsonPointer(str));
	}
	util.escapeFragment = escapeFragment;
	function escapeJsonPointer(str) {
	    if (typeof str == "number")
	        return `${str}`;
	    return str.replace(/~/g, "~0").replace(/\//g, "~1");
	}
	util.escapeJsonPointer = escapeJsonPointer;
	function unescapeJsonPointer(str) {
	    return str.replace(/~1/g, "/").replace(/~0/g, "~");
	}
	util.unescapeJsonPointer = unescapeJsonPointer;
	function eachItem(xs, f) {
	    if (Array.isArray(xs)) {
	        for (const x of xs)
	            f(x);
	    }
	    else {
	        f(xs);
	    }
	}
	util.eachItem = eachItem;
	function makeMergeEvaluated({ mergeNames, mergeToName, mergeValues, resultToName, }) {
	    return (gen, from, to, toName) => {
	        const res = to === undefined
	            ? from
	            : to instanceof codegen_1.Name
	                ? (from instanceof codegen_1.Name ? mergeNames(gen, from, to) : mergeToName(gen, from, to), to)
	                : from instanceof codegen_1.Name
	                    ? (mergeToName(gen, to, from), from)
	                    : mergeValues(from, to);
	        return toName === codegen_1.Name && !(res instanceof codegen_1.Name) ? resultToName(gen, res) : res;
	    };
	}
	util.mergeEvaluated = {
	    props: makeMergeEvaluated({
	        mergeNames: (gen, from, to) => gen.if((0, codegen_1._) `${to} !== true && ${from} !== undefined`, () => {
	            gen.if((0, codegen_1._) `${from} === true`, () => gen.assign(to, true), () => gen.assign(to, (0, codegen_1._) `${to} || {}`).code((0, codegen_1._) `Object.assign(${to}, ${from})`));
	        }),
	        mergeToName: (gen, from, to) => gen.if((0, codegen_1._) `${to} !== true`, () => {
	            if (from === true) {
	                gen.assign(to, true);
	            }
	            else {
	                gen.assign(to, (0, codegen_1._) `${to} || {}`);
	                setEvaluated(gen, to, from);
	            }
	        }),
	        mergeValues: (from, to) => (from === true ? true : { ...from, ...to }),
	        resultToName: evaluatedPropsToName,
	    }),
	    items: makeMergeEvaluated({
	        mergeNames: (gen, from, to) => gen.if((0, codegen_1._) `${to} !== true && ${from} !== undefined`, () => gen.assign(to, (0, codegen_1._) `${from} === true ? true : ${to} > ${from} ? ${to} : ${from}`)),
	        mergeToName: (gen, from, to) => gen.if((0, codegen_1._) `${to} !== true`, () => gen.assign(to, from === true ? true : (0, codegen_1._) `${to} > ${from} ? ${to} : ${from}`)),
	        mergeValues: (from, to) => (from === true ? true : Math.max(from, to)),
	        resultToName: (gen, items) => gen.var("items", items),
	    }),
	};
	function evaluatedPropsToName(gen, ps) {
	    if (ps === true)
	        return gen.var("props", true);
	    const props = gen.var("props", (0, codegen_1._) `{}`);
	    if (ps !== undefined)
	        setEvaluated(gen, props, ps);
	    return props;
	}
	util.evaluatedPropsToName = evaluatedPropsToName;
	function setEvaluated(gen, props, ps) {
	    Object.keys(ps).forEach((p) => gen.assign((0, codegen_1._) `${props}${(0, codegen_1.getProperty)(p)}`, true));
	}
	util.setEvaluated = setEvaluated;
	const snippets = {};
	function useFunc(gen, f) {
	    return gen.scopeValue("func", {
	        ref: f,
	        code: snippets[f.code] || (snippets[f.code] = new code_1._Code(f.code)),
	    });
	}
	util.useFunc = useFunc;
	var Type;
	(function (Type) {
	    Type[Type["Num"] = 0] = "Num";
	    Type[Type["Str"] = 1] = "Str";
	})(Type || (util.Type = Type = {}));
	function getErrorPath(dataProp, dataPropType, jsPropertySyntax) {
	    // let path
	    if (dataProp instanceof codegen_1.Name) {
	        const isNumber = dataPropType === Type.Num;
	        return jsPropertySyntax
	            ? isNumber
	                ? (0, codegen_1._) `"[" + ${dataProp} + "]"`
	                : (0, codegen_1._) `"['" + ${dataProp} + "']"`
	            : isNumber
	                ? (0, codegen_1._) `"/" + ${dataProp}`
	                : (0, codegen_1._) `"/" + ${dataProp}.replace(/~/g, "~0").replace(/\\//g, "~1")`; // TODO maybe use global escapePointer
	    }
	    return jsPropertySyntax ? (0, codegen_1.getProperty)(dataProp).toString() : "/" + escapeJsonPointer(dataProp);
	}
	util.getErrorPath = getErrorPath;
	function checkStrictMode(it, msg, mode = it.opts.strictSchema) {
	    if (!mode)
	        return;
	    msg = `strict mode: ${msg}`;
	    if (mode === true)
	        throw new Error(msg);
	    it.self.logger.warn(msg);
	}
	util.checkStrictMode = checkStrictMode;
	
	return util;
}

var names = {};

var hasRequiredNames;

function requireNames () {
	if (hasRequiredNames) return names;
	hasRequiredNames = 1;
	Object.defineProperty(names, "__esModule", { value: true });
	const codegen_1 = /*@__PURE__*/ requireCodegen();
	const names$1 = {
	    // validation function arguments
	    data: new codegen_1.Name("data"), // data passed to validation function
	    // args passed from referencing schema
	    valCxt: new codegen_1.Name("valCxt"), // validation/data context - should not be used directly, it is destructured to the names below
	    instancePath: new codegen_1.Name("instancePath"),
	    parentData: new codegen_1.Name("parentData"),
	    parentDataProperty: new codegen_1.Name("parentDataProperty"),
	    rootData: new codegen_1.Name("rootData"), // root data - same as the data passed to the first/top validation function
	    dynamicAnchors: new codegen_1.Name("dynamicAnchors"), // used to support recursiveRef and dynamicRef
	    // function scoped variables
	    vErrors: new codegen_1.Name("vErrors"), // null or array of validation errors
	    errors: new codegen_1.Name("errors"), // counter of validation errors
	    this: new codegen_1.Name("this"),
	    // "globals"
	    self: new codegen_1.Name("self"),
	    scope: new codegen_1.Name("scope"),
	    // JTD serialize/parse name for JSON string and position
	    json: new codegen_1.Name("json"),
	    jsonPos: new codegen_1.Name("jsonPos"),
	    jsonLen: new codegen_1.Name("jsonLen"),
	    jsonPart: new codegen_1.Name("jsonPart"),
	};
	names.default = names$1;
	
	return names;
}

var hasRequiredErrors;

function requireErrors () {
	if (hasRequiredErrors) return errors;
	hasRequiredErrors = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.extendErrors = exports.resetErrorsCount = exports.reportExtraError = exports.reportError = exports.keyword$DataError = exports.keywordError = void 0;
		const codegen_1 = /*@__PURE__*/ requireCodegen();
		const util_1 = /*@__PURE__*/ requireUtil();
		const names_1 = /*@__PURE__*/ requireNames();
		exports.keywordError = {
		    message: ({ keyword }) => (0, codegen_1.str) `must pass "${keyword}" keyword validation`,
		};
		exports.keyword$DataError = {
		    message: ({ keyword, schemaType }) => schemaType
		        ? (0, codegen_1.str) `"${keyword}" keyword must be ${schemaType} ($data)`
		        : (0, codegen_1.str) `"${keyword}" keyword is invalid ($data)`,
		};
		function reportError(cxt, error = exports.keywordError, errorPaths, overrideAllErrors) {
		    const { it } = cxt;
		    const { gen, compositeRule, allErrors } = it;
		    const errObj = errorObjectCode(cxt, error, errorPaths);
		    if (overrideAllErrors !== null && overrideAllErrors !== void 0 ? overrideAllErrors : (compositeRule || allErrors)) {
		        addError(gen, errObj);
		    }
		    else {
		        returnErrors(it, (0, codegen_1._) `[${errObj}]`);
		    }
		}
		exports.reportError = reportError;
		function reportExtraError(cxt, error = exports.keywordError, errorPaths) {
		    const { it } = cxt;
		    const { gen, compositeRule, allErrors } = it;
		    const errObj = errorObjectCode(cxt, error, errorPaths);
		    addError(gen, errObj);
		    if (!(compositeRule || allErrors)) {
		        returnErrors(it, names_1.default.vErrors);
		    }
		}
		exports.reportExtraError = reportExtraError;
		function resetErrorsCount(gen, errsCount) {
		    gen.assign(names_1.default.errors, errsCount);
		    gen.if((0, codegen_1._) `${names_1.default.vErrors} !== null`, () => gen.if(errsCount, () => gen.assign((0, codegen_1._) `${names_1.default.vErrors}.length`, errsCount), () => gen.assign(names_1.default.vErrors, null)));
		}
		exports.resetErrorsCount = resetErrorsCount;
		function extendErrors({ gen, keyword, schemaValue, data, errsCount, it, }) {
		    /* istanbul ignore if */
		    if (errsCount === undefined)
		        throw new Error("ajv implementation error");
		    const err = gen.name("err");
		    gen.forRange("i", errsCount, names_1.default.errors, (i) => {
		        gen.const(err, (0, codegen_1._) `${names_1.default.vErrors}[${i}]`);
		        gen.if((0, codegen_1._) `${err}.instancePath === undefined`, () => gen.assign((0, codegen_1._) `${err}.instancePath`, (0, codegen_1.strConcat)(names_1.default.instancePath, it.errorPath)));
		        gen.assign((0, codegen_1._) `${err}.schemaPath`, (0, codegen_1.str) `${it.errSchemaPath}/${keyword}`);
		        if (it.opts.verbose) {
		            gen.assign((0, codegen_1._) `${err}.schema`, schemaValue);
		            gen.assign((0, codegen_1._) `${err}.data`, data);
		        }
		    });
		}
		exports.extendErrors = extendErrors;
		function addError(gen, errObj) {
		    const err = gen.const("err", errObj);
		    gen.if((0, codegen_1._) `${names_1.default.vErrors} === null`, () => gen.assign(names_1.default.vErrors, (0, codegen_1._) `[${err}]`), (0, codegen_1._) `${names_1.default.vErrors}.push(${err})`);
		    gen.code((0, codegen_1._) `${names_1.default.errors}++`);
		}
		function returnErrors(it, errs) {
		    const { gen, validateName, schemaEnv } = it;
		    if (schemaEnv.$async) {
		        gen.throw((0, codegen_1._) `new ${it.ValidationError}(${errs})`);
		    }
		    else {
		        gen.assign((0, codegen_1._) `${validateName}.errors`, errs);
		        gen.return(false);
		    }
		}
		const E = {
		    keyword: new codegen_1.Name("keyword"),
		    schemaPath: new codegen_1.Name("schemaPath"), // also used in JTD errors
		    params: new codegen_1.Name("params"),
		    propertyName: new codegen_1.Name("propertyName"),
		    message: new codegen_1.Name("message"),
		    schema: new codegen_1.Name("schema"),
		    parentSchema: new codegen_1.Name("parentSchema"),
		};
		function errorObjectCode(cxt, error, errorPaths) {
		    const { createErrors } = cxt.it;
		    if (createErrors === false)
		        return (0, codegen_1._) `{}`;
		    return errorObject(cxt, error, errorPaths);
		}
		function errorObject(cxt, error, errorPaths = {}) {
		    const { gen, it } = cxt;
		    const keyValues = [
		        errorInstancePath(it, errorPaths),
		        errorSchemaPath(cxt, errorPaths),
		    ];
		    extraErrorProps(cxt, error, keyValues);
		    return gen.object(...keyValues);
		}
		function errorInstancePath({ errorPath }, { instancePath }) {
		    const instPath = instancePath
		        ? (0, codegen_1.str) `${errorPath}${(0, util_1.getErrorPath)(instancePath, util_1.Type.Str)}`
		        : errorPath;
		    return [names_1.default.instancePath, (0, codegen_1.strConcat)(names_1.default.instancePath, instPath)];
		}
		function errorSchemaPath({ keyword, it: { errSchemaPath } }, { schemaPath, parentSchema }) {
		    let schPath = parentSchema ? errSchemaPath : (0, codegen_1.str) `${errSchemaPath}/${keyword}`;
		    if (schemaPath) {
		        schPath = (0, codegen_1.str) `${schPath}${(0, util_1.getErrorPath)(schemaPath, util_1.Type.Str)}`;
		    }
		    return [E.schemaPath, schPath];
		}
		function extraErrorProps(cxt, { params, message }, keyValues) {
		    const { keyword, data, schemaValue, it } = cxt;
		    const { opts, propertyName, topSchemaRef, schemaPath } = it;
		    keyValues.push([E.keyword, keyword], [E.params, typeof params == "function" ? params(cxt) : params || (0, codegen_1._) `{}`]);
		    if (opts.messages) {
		        keyValues.push([E.message, typeof message == "function" ? message(cxt) : message]);
		    }
		    if (opts.verbose) {
		        keyValues.push([E.schema, schemaValue], [E.parentSchema, (0, codegen_1._) `${topSchemaRef}${schemaPath}`], [names_1.default.data, data]);
		    }
		    if (propertyName)
		        keyValues.push([E.propertyName, propertyName]);
		}
		
	} (errors));
	return errors;
}

var hasRequiredBoolSchema;

function requireBoolSchema () {
	if (hasRequiredBoolSchema) return boolSchema;
	hasRequiredBoolSchema = 1;
	Object.defineProperty(boolSchema, "__esModule", { value: true });
	boolSchema.boolOrEmptySchema = boolSchema.topBoolOrEmptySchema = void 0;
	const errors_1 = /*@__PURE__*/ requireErrors();
	const codegen_1 = /*@__PURE__*/ requireCodegen();
	const names_1 = /*@__PURE__*/ requireNames();
	const boolError = {
	    message: "boolean schema is false",
	};
	function topBoolOrEmptySchema(it) {
	    const { gen, schema, validateName } = it;
	    if (schema === false) {
	        falseSchemaError(it, false);
	    }
	    else if (typeof schema == "object" && schema.$async === true) {
	        gen.return(names_1.default.data);
	    }
	    else {
	        gen.assign((0, codegen_1._) `${validateName}.errors`, null);
	        gen.return(true);
	    }
	}
	boolSchema.topBoolOrEmptySchema = topBoolOrEmptySchema;
	function boolOrEmptySchema(it, valid) {
	    const { gen, schema } = it;
	    if (schema === false) {
	        gen.var(valid, false); // TODO var
	        falseSchemaError(it);
	    }
	    else {
	        gen.var(valid, true); // TODO var
	    }
	}
	boolSchema.boolOrEmptySchema = boolOrEmptySchema;
	function falseSchemaError(it, overrideAllErrors) {
	    const { gen, data } = it;
	    // TODO maybe some other interface should be used for non-keyword validation errors...
	    const cxt = {
	        gen,
	        keyword: "false schema",
	        data,
	        schema: false,
	        schemaCode: false,
	        schemaValue: false,
	        params: {},
	        it,
	    };
	    (0, errors_1.reportError)(cxt, boolError, undefined, overrideAllErrors);
	}
	
	return boolSchema;
}

var dataType = {};

var rules = {};

var hasRequiredRules;

function requireRules () {
	if (hasRequiredRules) return rules;
	hasRequiredRules = 1;
	Object.defineProperty(rules, "__esModule", { value: true });
	rules.getRules = rules.isJSONType = void 0;
	const _jsonTypes = ["string", "number", "integer", "boolean", "null", "object", "array"];
	const jsonTypes = new Set(_jsonTypes);
	function isJSONType(x) {
	    return typeof x == "string" && jsonTypes.has(x);
	}
	rules.isJSONType = isJSONType;
	function getRules() {
	    const groups = {
	        number: { type: "number", rules: [] },
	        string: { type: "string", rules: [] },
	        array: { type: "array", rules: [] },
	        object: { type: "object", rules: [] },
	    };
	    return {
	        types: { ...groups, integer: true, boolean: true, null: true },
	        rules: [{ rules: [] }, groups.number, groups.string, groups.array, groups.object],
	        post: { rules: [] },
	        all: {},
	        keywords: {},
	    };
	}
	rules.getRules = getRules;
	
	return rules;
}

var applicability = {};

var hasRequiredApplicability;

function requireApplicability () {
	if (hasRequiredApplicability) return applicability;
	hasRequiredApplicability = 1;
	Object.defineProperty(applicability, "__esModule", { value: true });
	applicability.shouldUseRule = applicability.shouldUseGroup = applicability.schemaHasRulesForType = void 0;
	function schemaHasRulesForType({ schema, self }, type) {
	    const group = self.RULES.types[type];
	    return group && group !== true && shouldUseGroup(schema, group);
	}
	applicability.schemaHasRulesForType = schemaHasRulesForType;
	function shouldUseGroup(schema, group) {
	    return group.rules.some((rule) => shouldUseRule(schema, rule));
	}
	applicability.shouldUseGroup = shouldUseGroup;
	function shouldUseRule(schema, rule) {
	    var _a;
	    return (schema[rule.keyword] !== undefined ||
	        ((_a = rule.definition.implements) === null || _a === void 0 ? void 0 : _a.some((kwd) => schema[kwd] !== undefined)));
	}
	applicability.shouldUseRule = shouldUseRule;
	
	return applicability;
}

var hasRequiredDataType;

function requireDataType () {
	if (hasRequiredDataType) return dataType;
	hasRequiredDataType = 1;
	Object.defineProperty(dataType, "__esModule", { value: true });
	dataType.reportTypeError = dataType.checkDataTypes = dataType.checkDataType = dataType.coerceAndCheckDataType = dataType.getJSONTypes = dataType.getSchemaTypes = dataType.DataType = void 0;
	const rules_1 = /*@__PURE__*/ requireRules();
	const applicability_1 = /*@__PURE__*/ requireApplicability();
	const errors_1 = /*@__PURE__*/ requireErrors();
	const codegen_1 = /*@__PURE__*/ requireCodegen();
	const util_1 = /*@__PURE__*/ requireUtil();
	var DataType;
	(function (DataType) {
	    DataType[DataType["Correct"] = 0] = "Correct";
	    DataType[DataType["Wrong"] = 1] = "Wrong";
	})(DataType || (dataType.DataType = DataType = {}));
	function getSchemaTypes(schema) {
	    const types = getJSONTypes(schema.type);
	    const hasNull = types.includes("null");
	    if (hasNull) {
	        if (schema.nullable === false)
	            throw new Error("type: null contradicts nullable: false");
	    }
	    else {
	        if (!types.length && schema.nullable !== undefined) {
	            throw new Error('"nullable" cannot be used without "type"');
	        }
	        if (schema.nullable === true)
	            types.push("null");
	    }
	    return types;
	}
	dataType.getSchemaTypes = getSchemaTypes;
	// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
	function getJSONTypes(ts) {
	    const types = Array.isArray(ts) ? ts : ts ? [ts] : [];
	    if (types.every(rules_1.isJSONType))
	        return types;
	    throw new Error("type must be JSONType or JSONType[]: " + types.join(","));
	}
	dataType.getJSONTypes = getJSONTypes;
	function coerceAndCheckDataType(it, types) {
	    const { gen, data, opts } = it;
	    const coerceTo = coerceToTypes(types, opts.coerceTypes);
	    const checkTypes = types.length > 0 &&
	        !(coerceTo.length === 0 && types.length === 1 && (0, applicability_1.schemaHasRulesForType)(it, types[0]));
	    if (checkTypes) {
	        const wrongType = checkDataTypes(types, data, opts.strictNumbers, DataType.Wrong);
	        gen.if(wrongType, () => {
	            if (coerceTo.length)
	                coerceData(it, types, coerceTo);
	            else
	                reportTypeError(it);
	        });
	    }
	    return checkTypes;
	}
	dataType.coerceAndCheckDataType = coerceAndCheckDataType;
	const COERCIBLE = new Set(["string", "number", "integer", "boolean", "null"]);
	function coerceToTypes(types, coerceTypes) {
	    return coerceTypes
	        ? types.filter((t) => COERCIBLE.has(t) || (coerceTypes === "array" && t === "array"))
	        : [];
	}
	function coerceData(it, types, coerceTo) {
	    const { gen, data, opts } = it;
	    const dataType = gen.let("dataType", (0, codegen_1._) `typeof ${data}`);
	    const coerced = gen.let("coerced", (0, codegen_1._) `undefined`);
	    if (opts.coerceTypes === "array") {
	        gen.if((0, codegen_1._) `${dataType} == 'object' && Array.isArray(${data}) && ${data}.length == 1`, () => gen
	            .assign(data, (0, codegen_1._) `${data}[0]`)
	            .assign(dataType, (0, codegen_1._) `typeof ${data}`)
	            .if(checkDataTypes(types, data, opts.strictNumbers), () => gen.assign(coerced, data)));
	    }
	    gen.if((0, codegen_1._) `${coerced} !== undefined`);
	    for (const t of coerceTo) {
	        if (COERCIBLE.has(t) || (t === "array" && opts.coerceTypes === "array")) {
	            coerceSpecificType(t);
	        }
	    }
	    gen.else();
	    reportTypeError(it);
	    gen.endIf();
	    gen.if((0, codegen_1._) `${coerced} !== undefined`, () => {
	        gen.assign(data, coerced);
	        assignParentData(it, coerced);
	    });
	    function coerceSpecificType(t) {
	        switch (t) {
	            case "string":
	                gen
	                    .elseIf((0, codegen_1._) `${dataType} == "number" || ${dataType} == "boolean"`)
	                    .assign(coerced, (0, codegen_1._) `"" + ${data}`)
	                    .elseIf((0, codegen_1._) `${data} === null`)
	                    .assign(coerced, (0, codegen_1._) `""`);
	                return;
	            case "number":
	                gen
	                    .elseIf((0, codegen_1._) `${dataType} == "boolean" || ${data} === null
              || (${dataType} == "string" && ${data} && ${data} == +${data})`)
	                    .assign(coerced, (0, codegen_1._) `+${data}`);
	                return;
	            case "integer":
	                gen
	                    .elseIf((0, codegen_1._) `${dataType} === "boolean" || ${data} === null
              || (${dataType} === "string" && ${data} && ${data} == +${data} && !(${data} % 1))`)
	                    .assign(coerced, (0, codegen_1._) `+${data}`);
	                return;
	            case "boolean":
	                gen
	                    .elseIf((0, codegen_1._) `${data} === "false" || ${data} === 0 || ${data} === null`)
	                    .assign(coerced, false)
	                    .elseIf((0, codegen_1._) `${data} === "true" || ${data} === 1`)
	                    .assign(coerced, true);
	                return;
	            case "null":
	                gen.elseIf((0, codegen_1._) `${data} === "" || ${data} === 0 || ${data} === false`);
	                gen.assign(coerced, null);
	                return;
	            case "array":
	                gen
	                    .elseIf((0, codegen_1._) `${dataType} === "string" || ${dataType} === "number"
              || ${dataType} === "boolean" || ${data} === null`)
	                    .assign(coerced, (0, codegen_1._) `[${data}]`);
	        }
	    }
	}
	function assignParentData({ gen, parentData, parentDataProperty }, expr) {
	    // TODO use gen.property
	    gen.if((0, codegen_1._) `${parentData} !== undefined`, () => gen.assign((0, codegen_1._) `${parentData}[${parentDataProperty}]`, expr));
	}
	function checkDataType(dataType, data, strictNums, correct = DataType.Correct) {
	    const EQ = correct === DataType.Correct ? codegen_1.operators.EQ : codegen_1.operators.NEQ;
	    let cond;
	    switch (dataType) {
	        case "null":
	            return (0, codegen_1._) `${data} ${EQ} null`;
	        case "array":
	            cond = (0, codegen_1._) `Array.isArray(${data})`;
	            break;
	        case "object":
	            cond = (0, codegen_1._) `${data} && typeof ${data} == "object" && !Array.isArray(${data})`;
	            break;
	        case "integer":
	            cond = numCond((0, codegen_1._) `!(${data} % 1) && !isNaN(${data})`);
	            break;
	        case "number":
	            cond = numCond();
	            break;
	        default:
	            return (0, codegen_1._) `typeof ${data} ${EQ} ${dataType}`;
	    }
	    return correct === DataType.Correct ? cond : (0, codegen_1.not)(cond);
	    function numCond(_cond = codegen_1.nil) {
	        return (0, codegen_1.and)((0, codegen_1._) `typeof ${data} == "number"`, _cond, strictNums ? (0, codegen_1._) `isFinite(${data})` : codegen_1.nil);
	    }
	}
	dataType.checkDataType = checkDataType;
	function checkDataTypes(dataTypes, data, strictNums, correct) {
	    if (dataTypes.length === 1) {
	        return checkDataType(dataTypes[0], data, strictNums, correct);
	    }
	    let cond;
	    const types = (0, util_1.toHash)(dataTypes);
	    if (types.array && types.object) {
	        const notObj = (0, codegen_1._) `typeof ${data} != "object"`;
	        cond = types.null ? notObj : (0, codegen_1._) `!${data} || ${notObj}`;
	        delete types.null;
	        delete types.array;
	        delete types.object;
	    }
	    else {
	        cond = codegen_1.nil;
	    }
	    if (types.number)
	        delete types.integer;
	    for (const t in types)
	        cond = (0, codegen_1.and)(cond, checkDataType(t, data, strictNums, correct));
	    return cond;
	}
	dataType.checkDataTypes = checkDataTypes;
	const typeError = {
	    message: ({ schema }) => `must be ${schema}`,
	    params: ({ schema, schemaValue }) => typeof schema == "string" ? (0, codegen_1._) `{type: ${schema}}` : (0, codegen_1._) `{type: ${schemaValue}}`,
	};
	function reportTypeError(it) {
	    const cxt = getTypeErrorContext(it);
	    (0, errors_1.reportError)(cxt, typeError);
	}
	dataType.reportTypeError = reportTypeError;
	function getTypeErrorContext(it) {
	    const { gen, data, schema } = it;
	    const schemaCode = (0, util_1.schemaRefOrVal)(it, schema, "type");
	    return {
	        gen,
	        keyword: "type",
	        data,
	        schema: schema.type,
	        schemaCode,
	        schemaValue: schemaCode,
	        parentSchema: schema,
	        params: {},
	        it,
	    };
	}
	
	return dataType;
}

var defaults = {};

var hasRequiredDefaults;

function requireDefaults () {
	if (hasRequiredDefaults) return defaults;
	hasRequiredDefaults = 1;
	Object.defineProperty(defaults, "__esModule", { value: true });
	defaults.assignDefaults = void 0;
	const codegen_1 = /*@__PURE__*/ requireCodegen();
	const util_1 = /*@__PURE__*/ requireUtil();
	function assignDefaults(it, ty) {
	    const { properties, items } = it.schema;
	    if (ty === "object" && properties) {
	        for (const key in properties) {
	            assignDefault(it, key, properties[key].default);
	        }
	    }
	    else if (ty === "array" && Array.isArray(items)) {
	        items.forEach((sch, i) => assignDefault(it, i, sch.default));
	    }
	}
	defaults.assignDefaults = assignDefaults;
	function assignDefault(it, prop, defaultValue) {
	    const { gen, compositeRule, data, opts } = it;
	    if (defaultValue === undefined)
	        return;
	    const childData = (0, codegen_1._) `${data}${(0, codegen_1.getProperty)(prop)}`;
	    if (compositeRule) {
	        (0, util_1.checkStrictMode)(it, `default is ignored for: ${childData}`);
	        return;
	    }
	    let condition = (0, codegen_1._) `${childData} === undefined`;
	    if (opts.useDefaults === "empty") {
	        condition = (0, codegen_1._) `${condition} || ${childData} === null || ${childData} === ""`;
	    }
	    // `${childData} === undefined` +
	    // (opts.useDefaults === "empty" ? ` || ${childData} === null || ${childData} === ""` : "")
	    gen.if(condition, (0, codegen_1._) `${childData} = ${(0, codegen_1.stringify)(defaultValue)}`);
	}
	
	return defaults;
}

var keyword = {};

var code = {};

var hasRequiredCode;

function requireCode () {
	if (hasRequiredCode) return code;
	hasRequiredCode = 1;
	Object.defineProperty(code, "__esModule", { value: true });
	code.validateUnion = code.validateArray = code.usePattern = code.callValidateCode = code.schemaProperties = code.allSchemaProperties = code.noPropertyInData = code.propertyInData = code.isOwnProperty = code.hasPropFunc = code.reportMissingProp = code.checkMissingProp = code.checkReportMissingProp = void 0;
	const codegen_1 = /*@__PURE__*/ requireCodegen();
	const util_1 = /*@__PURE__*/ requireUtil();
	const names_1 = /*@__PURE__*/ requireNames();
	const util_2 = /*@__PURE__*/ requireUtil();
	function checkReportMissingProp(cxt, prop) {
	    const { gen, data, it } = cxt;
	    gen.if(noPropertyInData(gen, data, prop, it.opts.ownProperties), () => {
	        cxt.setParams({ missingProperty: (0, codegen_1._) `${prop}` }, true);
	        cxt.error();
	    });
	}
	code.checkReportMissingProp = checkReportMissingProp;
	function checkMissingProp({ gen, data, it: { opts } }, properties, missing) {
	    return (0, codegen_1.or)(...properties.map((prop) => (0, codegen_1.and)(noPropertyInData(gen, data, prop, opts.ownProperties), (0, codegen_1._) `${missing} = ${prop}`)));
	}
	code.checkMissingProp = checkMissingProp;
	function reportMissingProp(cxt, missing) {
	    cxt.setParams({ missingProperty: missing }, true);
	    cxt.error();
	}
	code.reportMissingProp = reportMissingProp;
	function hasPropFunc(gen) {
	    return gen.scopeValue("func", {
	        // eslint-disable-next-line @typescript-eslint/unbound-method
	        ref: Object.prototype.hasOwnProperty,
	        code: (0, codegen_1._) `Object.prototype.hasOwnProperty`,
	    });
	}
	code.hasPropFunc = hasPropFunc;
	function isOwnProperty(gen, data, property) {
	    return (0, codegen_1._) `${hasPropFunc(gen)}.call(${data}, ${property})`;
	}
	code.isOwnProperty = isOwnProperty;
	function propertyInData(gen, data, property, ownProperties) {
	    const cond = (0, codegen_1._) `${data}${(0, codegen_1.getProperty)(property)} !== undefined`;
	    return ownProperties ? (0, codegen_1._) `${cond} && ${isOwnProperty(gen, data, property)}` : cond;
	}
	code.propertyInData = propertyInData;
	function noPropertyInData(gen, data, property, ownProperties) {
	    const cond = (0, codegen_1._) `${data}${(0, codegen_1.getProperty)(property)} === undefined`;
	    return ownProperties ? (0, codegen_1.or)(cond, (0, codegen_1.not)(isOwnProperty(gen, data, property))) : cond;
	}
	code.noPropertyInData = noPropertyInData;
	function allSchemaProperties(schemaMap) {
	    return schemaMap ? Object.keys(schemaMap).filter((p) => p !== "__proto__") : [];
	}
	code.allSchemaProperties = allSchemaProperties;
	function schemaProperties(it, schemaMap) {
	    return allSchemaProperties(schemaMap).filter((p) => !(0, util_1.alwaysValidSchema)(it, schemaMap[p]));
	}
	code.schemaProperties = schemaProperties;
	function callValidateCode({ schemaCode, data, it: { gen, topSchemaRef, schemaPath, errorPath }, it }, func, context, passSchema) {
	    const dataAndSchema = passSchema ? (0, codegen_1._) `${schemaCode}, ${data}, ${topSchemaRef}${schemaPath}` : data;
	    const valCxt = [
	        [names_1.default.instancePath, (0, codegen_1.strConcat)(names_1.default.instancePath, errorPath)],
	        [names_1.default.parentData, it.parentData],
	        [names_1.default.parentDataProperty, it.parentDataProperty],
	        [names_1.default.rootData, names_1.default.rootData],
	    ];
	    if (it.opts.dynamicRef)
	        valCxt.push([names_1.default.dynamicAnchors, names_1.default.dynamicAnchors]);
	    const args = (0, codegen_1._) `${dataAndSchema}, ${gen.object(...valCxt)}`;
	    return context !== codegen_1.nil ? (0, codegen_1._) `${func}.call(${context}, ${args})` : (0, codegen_1._) `${func}(${args})`;
	}
	code.callValidateCode = callValidateCode;
	const newRegExp = (0, codegen_1._) `new RegExp`;
	function usePattern({ gen, it: { opts } }, pattern) {
	    const u = opts.unicodeRegExp ? "u" : "";
	    const { regExp } = opts.code;
	    const rx = regExp(pattern, u);
	    return gen.scopeValue("pattern", {
	        key: rx.toString(),
	        ref: rx,
	        code: (0, codegen_1._) `${regExp.code === "new RegExp" ? newRegExp : (0, util_2.useFunc)(gen, regExp)}(${pattern}, ${u})`,
	    });
	}
	code.usePattern = usePattern;
	function validateArray(cxt) {
	    const { gen, data, keyword, it } = cxt;
	    const valid = gen.name("valid");
	    if (it.allErrors) {
	        const validArr = gen.let("valid", true);
	        validateItems(() => gen.assign(validArr, false));
	        return validArr;
	    }
	    gen.var(valid, true);
	    validateItems(() => gen.break());
	    return valid;
	    function validateItems(notValid) {
	        const len = gen.const("len", (0, codegen_1._) `${data}.length`);
	        gen.forRange("i", 0, len, (i) => {
	            cxt.subschema({
	                keyword,
	                dataProp: i,
	                dataPropType: util_1.Type.Num,
	            }, valid);
	            gen.if((0, codegen_1.not)(valid), notValid);
	        });
	    }
	}
	code.validateArray = validateArray;
	function validateUnion(cxt) {
	    const { gen, schema, keyword, it } = cxt;
	    /* istanbul ignore if */
	    if (!Array.isArray(schema))
	        throw new Error("ajv implementation error");
	    const alwaysValid = schema.some((sch) => (0, util_1.alwaysValidSchema)(it, sch));
	    if (alwaysValid && !it.opts.unevaluated)
	        return;
	    const valid = gen.let("valid", false);
	    const schValid = gen.name("_valid");
	    gen.block(() => schema.forEach((_sch, i) => {
	        const schCxt = cxt.subschema({
	            keyword,
	            schemaProp: i,
	            compositeRule: true,
	        }, schValid);
	        gen.assign(valid, (0, codegen_1._) `${valid} || ${schValid}`);
	        const merged = cxt.mergeValidEvaluated(schCxt, schValid);
	        // can short-circuit if `unevaluatedProperties/Items` not supported (opts.unevaluated !== true)
	        // or if all properties and items were evaluated (it.props === true && it.items === true)
	        if (!merged)
	            gen.if((0, codegen_1.not)(valid));
	    }));
	    cxt.result(valid, () => cxt.reset(), () => cxt.error(true));
	}
	code.validateUnion = validateUnion;
	
	return code;
}

var hasRequiredKeyword;

function requireKeyword () {
	if (hasRequiredKeyword) return keyword;
	hasRequiredKeyword = 1;
	Object.defineProperty(keyword, "__esModule", { value: true });
	keyword.validateKeywordUsage = keyword.validSchemaType = keyword.funcKeywordCode = keyword.macroKeywordCode = void 0;
	const codegen_1 = /*@__PURE__*/ requireCodegen();
	const names_1 = /*@__PURE__*/ requireNames();
	const code_1 = /*@__PURE__*/ requireCode();
	const errors_1 = /*@__PURE__*/ requireErrors();
	function macroKeywordCode(cxt, def) {
	    const { gen, keyword, schema, parentSchema, it } = cxt;
	    const macroSchema = def.macro.call(it.self, schema, parentSchema, it);
	    const schemaRef = useKeyword(gen, keyword, macroSchema);
	    if (it.opts.validateSchema !== false)
	        it.self.validateSchema(macroSchema, true);
	    const valid = gen.name("valid");
	    cxt.subschema({
	        schema: macroSchema,
	        schemaPath: codegen_1.nil,
	        errSchemaPath: `${it.errSchemaPath}/${keyword}`,
	        topSchemaRef: schemaRef,
	        compositeRule: true,
	    }, valid);
	    cxt.pass(valid, () => cxt.error(true));
	}
	keyword.macroKeywordCode = macroKeywordCode;
	function funcKeywordCode(cxt, def) {
	    var _a;
	    const { gen, keyword, schema, parentSchema, $data, it } = cxt;
	    checkAsyncKeyword(it, def);
	    const validate = !$data && def.compile ? def.compile.call(it.self, schema, parentSchema, it) : def.validate;
	    const validateRef = useKeyword(gen, keyword, validate);
	    const valid = gen.let("valid");
	    cxt.block$data(valid, validateKeyword);
	    cxt.ok((_a = def.valid) !== null && _a !== void 0 ? _a : valid);
	    function validateKeyword() {
	        if (def.errors === false) {
	            assignValid();
	            if (def.modifying)
	                modifyData(cxt);
	            reportErrs(() => cxt.error());
	        }
	        else {
	            const ruleErrs = def.async ? validateAsync() : validateSync();
	            if (def.modifying)
	                modifyData(cxt);
	            reportErrs(() => addErrs(cxt, ruleErrs));
	        }
	    }
	    function validateAsync() {
	        const ruleErrs = gen.let("ruleErrs", null);
	        gen.try(() => assignValid((0, codegen_1._) `await `), (e) => gen.assign(valid, false).if((0, codegen_1._) `${e} instanceof ${it.ValidationError}`, () => gen.assign(ruleErrs, (0, codegen_1._) `${e}.errors`), () => gen.throw(e)));
	        return ruleErrs;
	    }
	    function validateSync() {
	        const validateErrs = (0, codegen_1._) `${validateRef}.errors`;
	        gen.assign(validateErrs, null);
	        assignValid(codegen_1.nil);
	        return validateErrs;
	    }
	    function assignValid(_await = def.async ? (0, codegen_1._) `await ` : codegen_1.nil) {
	        const passCxt = it.opts.passContext ? names_1.default.this : names_1.default.self;
	        const passSchema = !(("compile" in def && !$data) || def.schema === false);
	        gen.assign(valid, (0, codegen_1._) `${_await}${(0, code_1.callValidateCode)(cxt, validateRef, passCxt, passSchema)}`, def.modifying);
	    }
	    function reportErrs(errors) {
	        var _a;
	        gen.if((0, codegen_1.not)((_a = def.valid) !== null && _a !== void 0 ? _a : valid), errors);
	    }
	}
	keyword.funcKeywordCode = funcKeywordCode;
	function modifyData(cxt) {
	    const { gen, data, it } = cxt;
	    gen.if(it.parentData, () => gen.assign(data, (0, codegen_1._) `${it.parentData}[${it.parentDataProperty}]`));
	}
	function addErrs(cxt, errs) {
	    const { gen } = cxt;
	    gen.if((0, codegen_1._) `Array.isArray(${errs})`, () => {
	        gen
	            .assign(names_1.default.vErrors, (0, codegen_1._) `${names_1.default.vErrors} === null ? ${errs} : ${names_1.default.vErrors}.concat(${errs})`)
	            .assign(names_1.default.errors, (0, codegen_1._) `${names_1.default.vErrors}.length`);
	        (0, errors_1.extendErrors)(cxt);
	    }, () => cxt.error());
	}
	function checkAsyncKeyword({ schemaEnv }, def) {
	    if (def.async && !schemaEnv.$async)
	        throw new Error("async keyword in sync schema");
	}
	function useKeyword(gen, keyword, result) {
	    if (result === undefined)
	        throw new Error(`keyword "${keyword}" failed to compile`);
	    return gen.scopeValue("keyword", typeof result == "function" ? { ref: result } : { ref: result, code: (0, codegen_1.stringify)(result) });
	}
	function validSchemaType(schema, schemaType, allowUndefined = false) {
	    // TODO add tests
	    return (!schemaType.length ||
	        schemaType.some((st) => st === "array"
	            ? Array.isArray(schema)
	            : st === "object"
	                ? schema && typeof schema == "object" && !Array.isArray(schema)
	                : typeof schema == st || (allowUndefined && typeof schema == "undefined")));
	}
	keyword.validSchemaType = validSchemaType;
	function validateKeywordUsage({ schema, opts, self, errSchemaPath }, def, keyword) {
	    /* istanbul ignore if */
	    if (Array.isArray(def.keyword) ? !def.keyword.includes(keyword) : def.keyword !== keyword) {
	        throw new Error("ajv implementation error");
	    }
	    const deps = def.dependencies;
	    if (deps === null || deps === void 0 ? void 0 : deps.some((kwd) => !Object.prototype.hasOwnProperty.call(schema, kwd))) {
	        throw new Error(`parent schema must have dependencies of ${keyword}: ${deps.join(",")}`);
	    }
	    if (def.validateSchema) {
	        const valid = def.validateSchema(schema[keyword]);
	        if (!valid) {
	            const msg = `keyword "${keyword}" value is invalid at path "${errSchemaPath}": ` +
	                self.errorsText(def.validateSchema.errors);
	            if (opts.validateSchema === "log")
	                self.logger.error(msg);
	            else
	                throw new Error(msg);
	        }
	    }
	}
	keyword.validateKeywordUsage = validateKeywordUsage;
	
	return keyword;
}

var subschema = {};

var hasRequiredSubschema;

function requireSubschema () {
	if (hasRequiredSubschema) return subschema;
	hasRequiredSubschema = 1;
	Object.defineProperty(subschema, "__esModule", { value: true });
	subschema.extendSubschemaMode = subschema.extendSubschemaData = subschema.getSubschema = void 0;
	const codegen_1 = /*@__PURE__*/ requireCodegen();
	const util_1 = /*@__PURE__*/ requireUtil();
	function getSubschema(it, { keyword, schemaProp, schema, schemaPath, errSchemaPath, topSchemaRef }) {
	    if (keyword !== undefined && schema !== undefined) {
	        throw new Error('both "keyword" and "schema" passed, only one allowed');
	    }
	    if (keyword !== undefined) {
	        const sch = it.schema[keyword];
	        return schemaProp === undefined
	            ? {
	                schema: sch,
	                schemaPath: (0, codegen_1._) `${it.schemaPath}${(0, codegen_1.getProperty)(keyword)}`,
	                errSchemaPath: `${it.errSchemaPath}/${keyword}`,
	            }
	            : {
	                schema: sch[schemaProp],
	                schemaPath: (0, codegen_1._) `${it.schemaPath}${(0, codegen_1.getProperty)(keyword)}${(0, codegen_1.getProperty)(schemaProp)}`,
	                errSchemaPath: `${it.errSchemaPath}/${keyword}/${(0, util_1.escapeFragment)(schemaProp)}`,
	            };
	    }
	    if (schema !== undefined) {
	        if (schemaPath === undefined || errSchemaPath === undefined || topSchemaRef === undefined) {
	            throw new Error('"schemaPath", "errSchemaPath" and "topSchemaRef" are required with "schema"');
	        }
	        return {
	            schema,
	            schemaPath,
	            topSchemaRef,
	            errSchemaPath,
	        };
	    }
	    throw new Error('either "keyword" or "schema" must be passed');
	}
	subschema.getSubschema = getSubschema;
	function extendSubschemaData(subschema, it, { dataProp, dataPropType: dpType, data, dataTypes, propertyName }) {
	    if (data !== undefined && dataProp !== undefined) {
	        throw new Error('both "data" and "dataProp" passed, only one allowed');
	    }
	    const { gen } = it;
	    if (dataProp !== undefined) {
	        const { errorPath, dataPathArr, opts } = it;
	        const nextData = gen.let("data", (0, codegen_1._) `${it.data}${(0, codegen_1.getProperty)(dataProp)}`, true);
	        dataContextProps(nextData);
	        subschema.errorPath = (0, codegen_1.str) `${errorPath}${(0, util_1.getErrorPath)(dataProp, dpType, opts.jsPropertySyntax)}`;
	        subschema.parentDataProperty = (0, codegen_1._) `${dataProp}`;
	        subschema.dataPathArr = [...dataPathArr, subschema.parentDataProperty];
	    }
	    if (data !== undefined) {
	        const nextData = data instanceof codegen_1.Name ? data : gen.let("data", data, true); // replaceable if used once?
	        dataContextProps(nextData);
	        if (propertyName !== undefined)
	            subschema.propertyName = propertyName;
	        // TODO something is possibly wrong here with not changing parentDataProperty and not appending dataPathArr
	    }
	    if (dataTypes)
	        subschema.dataTypes = dataTypes;
	    function dataContextProps(_nextData) {
	        subschema.data = _nextData;
	        subschema.dataLevel = it.dataLevel + 1;
	        subschema.dataTypes = [];
	        it.definedProperties = new Set();
	        subschema.parentData = it.data;
	        subschema.dataNames = [...it.dataNames, _nextData];
	    }
	}
	subschema.extendSubschemaData = extendSubschemaData;
	function extendSubschemaMode(subschema, { jtdDiscriminator, jtdMetadata, compositeRule, createErrors, allErrors }) {
	    if (compositeRule !== undefined)
	        subschema.compositeRule = compositeRule;
	    if (createErrors !== undefined)
	        subschema.createErrors = createErrors;
	    if (allErrors !== undefined)
	        subschema.allErrors = allErrors;
	    subschema.jtdDiscriminator = jtdDiscriminator; // not inherited
	    subschema.jtdMetadata = jtdMetadata; // not inherited
	}
	subschema.extendSubschemaMode = extendSubschemaMode;
	
	return subschema;
}

var resolve = {};

var fastDeepEqual;
var hasRequiredFastDeepEqual;

function requireFastDeepEqual () {
	if (hasRequiredFastDeepEqual) return fastDeepEqual;
	hasRequiredFastDeepEqual = 1;

	// do not edit .js files directly - edit src/index.jst



	fastDeepEqual = function equal(a, b) {
	  if (a === b) return true;

	  if (a && b && typeof a == 'object' && typeof b == 'object') {
	    if (a.constructor !== b.constructor) return false;

	    var length, i, keys;
	    if (Array.isArray(a)) {
	      length = a.length;
	      if (length != b.length) return false;
	      for (i = length; i-- !== 0;)
	        if (!equal(a[i], b[i])) return false;
	      return true;
	    }



	    if (a.constructor === RegExp) return a.source === b.source && a.flags === b.flags;
	    if (a.valueOf !== Object.prototype.valueOf) return a.valueOf() === b.valueOf();
	    if (a.toString !== Object.prototype.toString) return a.toString() === b.toString();

	    keys = Object.keys(a);
	    length = keys.length;
	    if (length !== Object.keys(b).length) return false;

	    for (i = length; i-- !== 0;)
	      if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;

	    for (i = length; i-- !== 0;) {
	      var key = keys[i];

	      if (!equal(a[key], b[key])) return false;
	    }

	    return true;
	  }

	  // true if both NaN, false otherwise
	  return a!==a && b!==b;
	};
	return fastDeepEqual;
}

var jsonSchemaTraverse = {exports: {}};

var hasRequiredJsonSchemaTraverse;

function requireJsonSchemaTraverse () {
	if (hasRequiredJsonSchemaTraverse) return jsonSchemaTraverse.exports;
	hasRequiredJsonSchemaTraverse = 1;

	var traverse = jsonSchemaTraverse.exports = function (schema, opts, cb) {
	  // Legacy support for v0.3.1 and earlier.
	  if (typeof opts == 'function') {
	    cb = opts;
	    opts = {};
	  }

	  cb = opts.cb || cb;
	  var pre = (typeof cb == 'function') ? cb : cb.pre || function() {};
	  var post = cb.post || function() {};

	  _traverse(opts, pre, post, schema, '', schema);
	};


	traverse.keywords = {
	  additionalItems: true,
	  items: true,
	  contains: true,
	  additionalProperties: true,
	  propertyNames: true,
	  not: true,
	  if: true,
	  then: true,
	  else: true
	};

	traverse.arrayKeywords = {
	  items: true,
	  allOf: true,
	  anyOf: true,
	  oneOf: true
	};

	traverse.propsKeywords = {
	  $defs: true,
	  definitions: true,
	  properties: true,
	  patternProperties: true,
	  dependencies: true
	};

	traverse.skipKeywords = {
	  default: true,
	  enum: true,
	  const: true,
	  required: true,
	  maximum: true,
	  minimum: true,
	  exclusiveMaximum: true,
	  exclusiveMinimum: true,
	  multipleOf: true,
	  maxLength: true,
	  minLength: true,
	  pattern: true,
	  format: true,
	  maxItems: true,
	  minItems: true,
	  uniqueItems: true,
	  maxProperties: true,
	  minProperties: true
	};


	function _traverse(opts, pre, post, schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex) {
	  if (schema && typeof schema == 'object' && !Array.isArray(schema)) {
	    pre(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
	    for (var key in schema) {
	      var sch = schema[key];
	      if (Array.isArray(sch)) {
	        if (key in traverse.arrayKeywords) {
	          for (var i=0; i<sch.length; i++)
	            _traverse(opts, pre, post, sch[i], jsonPtr + '/' + key + '/' + i, rootSchema, jsonPtr, key, schema, i);
	        }
	      } else if (key in traverse.propsKeywords) {
	        if (sch && typeof sch == 'object') {
	          for (var prop in sch)
	            _traverse(opts, pre, post, sch[prop], jsonPtr + '/' + key + '/' + escapeJsonPtr(prop), rootSchema, jsonPtr, key, schema, prop);
	        }
	      } else if (key in traverse.keywords || (opts.allKeys && !(key in traverse.skipKeywords))) {
	        _traverse(opts, pre, post, sch, jsonPtr + '/' + key, rootSchema, jsonPtr, key, schema);
	      }
	    }
	    post(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
	  }
	}


	function escapeJsonPtr(str) {
	  return str.replace(/~/g, '~0').replace(/\//g, '~1');
	}
	return jsonSchemaTraverse.exports;
}

var hasRequiredResolve;

function requireResolve () {
	if (hasRequiredResolve) return resolve;
	hasRequiredResolve = 1;
	Object.defineProperty(resolve, "__esModule", { value: true });
	resolve.getSchemaRefs = resolve.resolveUrl = resolve.normalizeId = resolve._getFullPath = resolve.getFullPath = resolve.inlineRef = void 0;
	const util_1 = /*@__PURE__*/ requireUtil();
	const equal = /*@__PURE__*/ requireFastDeepEqual();
	const traverse = /*@__PURE__*/ requireJsonSchemaTraverse();
	// TODO refactor to use keyword definitions
	const SIMPLE_INLINED = new Set([
	    "type",
	    "format",
	    "pattern",
	    "maxLength",
	    "minLength",
	    "maxProperties",
	    "minProperties",
	    "maxItems",
	    "minItems",
	    "maximum",
	    "minimum",
	    "uniqueItems",
	    "multipleOf",
	    "required",
	    "enum",
	    "const",
	]);
	function inlineRef(schema, limit = true) {
	    if (typeof schema == "boolean")
	        return true;
	    if (limit === true)
	        return !hasRef(schema);
	    if (!limit)
	        return false;
	    return countKeys(schema) <= limit;
	}
	resolve.inlineRef = inlineRef;
	const REF_KEYWORDS = new Set([
	    "$ref",
	    "$recursiveRef",
	    "$recursiveAnchor",
	    "$dynamicRef",
	    "$dynamicAnchor",
	]);
	function hasRef(schema) {
	    for (const key in schema) {
	        if (REF_KEYWORDS.has(key))
	            return true;
	        const sch = schema[key];
	        if (Array.isArray(sch) && sch.some(hasRef))
	            return true;
	        if (typeof sch == "object" && hasRef(sch))
	            return true;
	    }
	    return false;
	}
	function countKeys(schema) {
	    let count = 0;
	    for (const key in schema) {
	        if (key === "$ref")
	            return Infinity;
	        count++;
	        if (SIMPLE_INLINED.has(key))
	            continue;
	        if (typeof schema[key] == "object") {
	            (0, util_1.eachItem)(schema[key], (sch) => (count += countKeys(sch)));
	        }
	        if (count === Infinity)
	            return Infinity;
	    }
	    return count;
	}
	function getFullPath(resolver, id = "", normalize) {
	    if (normalize !== false)
	        id = normalizeId(id);
	    const p = resolver.parse(id);
	    return _getFullPath(resolver, p);
	}
	resolve.getFullPath = getFullPath;
	function _getFullPath(resolver, p) {
	    const serialized = resolver.serialize(p);
	    return serialized.split("#")[0] + "#";
	}
	resolve._getFullPath = _getFullPath;
	const TRAILING_SLASH_HASH = /#\/?$/;
	function normalizeId(id) {
	    return id ? id.replace(TRAILING_SLASH_HASH, "") : "";
	}
	resolve.normalizeId = normalizeId;
	function resolveUrl(resolver, baseId, id) {
	    id = normalizeId(id);
	    return resolver.resolve(baseId, id);
	}
	resolve.resolveUrl = resolveUrl;
	const ANCHOR = /^[a-z_][-a-z0-9._]*$/i;
	function getSchemaRefs(schema, baseId) {
	    if (typeof schema == "boolean")
	        return {};
	    const { schemaId, uriResolver } = this.opts;
	    const schId = normalizeId(schema[schemaId] || baseId);
	    const baseIds = { "": schId };
	    const pathPrefix = getFullPath(uriResolver, schId, false);
	    const localRefs = {};
	    const schemaRefs = new Set();
	    traverse(schema, { allKeys: true }, (sch, jsonPtr, _, parentJsonPtr) => {
	        if (parentJsonPtr === undefined)
	            return;
	        const fullPath = pathPrefix + jsonPtr;
	        let innerBaseId = baseIds[parentJsonPtr];
	        if (typeof sch[schemaId] == "string")
	            innerBaseId = addRef.call(this, sch[schemaId]);
	        addAnchor.call(this, sch.$anchor);
	        addAnchor.call(this, sch.$dynamicAnchor);
	        baseIds[jsonPtr] = innerBaseId;
	        function addRef(ref) {
	            // eslint-disable-next-line @typescript-eslint/unbound-method
	            const _resolve = this.opts.uriResolver.resolve;
	            ref = normalizeId(innerBaseId ? _resolve(innerBaseId, ref) : ref);
	            if (schemaRefs.has(ref))
	                throw ambiguos(ref);
	            schemaRefs.add(ref);
	            let schOrRef = this.refs[ref];
	            if (typeof schOrRef == "string")
	                schOrRef = this.refs[schOrRef];
	            if (typeof schOrRef == "object") {
	                checkAmbiguosRef(sch, schOrRef.schema, ref);
	            }
	            else if (ref !== normalizeId(fullPath)) {
	                if (ref[0] === "#") {
	                    checkAmbiguosRef(sch, localRefs[ref], ref);
	                    localRefs[ref] = sch;
	                }
	                else {
	                    this.refs[ref] = fullPath;
	                }
	            }
	            return ref;
	        }
	        function addAnchor(anchor) {
	            if (typeof anchor == "string") {
	                if (!ANCHOR.test(anchor))
	                    throw new Error(`invalid anchor "${anchor}"`);
	                addRef.call(this, `#${anchor}`);
	            }
	        }
	    });
	    return localRefs;
	    function checkAmbiguosRef(sch1, sch2, ref) {
	        if (sch2 !== undefined && !equal(sch1, sch2))
	            throw ambiguos(ref);
	    }
	    function ambiguos(ref) {
	        return new Error(`reference "${ref}" resolves to more than one schema`);
	    }
	}
	resolve.getSchemaRefs = getSchemaRefs;
	
	return resolve;
}

var hasRequiredValidate;

function requireValidate () {
	if (hasRequiredValidate) return validate;
	hasRequiredValidate = 1;
	Object.defineProperty(validate, "__esModule", { value: true });
	validate.getData = validate.KeywordCxt = validate.validateFunctionCode = void 0;
	const boolSchema_1 = /*@__PURE__*/ requireBoolSchema();
	const dataType_1 = /*@__PURE__*/ requireDataType();
	const applicability_1 = /*@__PURE__*/ requireApplicability();
	const dataType_2 = /*@__PURE__*/ requireDataType();
	const defaults_1 = /*@__PURE__*/ requireDefaults();
	const keyword_1 = /*@__PURE__*/ requireKeyword();
	const subschema_1 = /*@__PURE__*/ requireSubschema();
	const codegen_1 = /*@__PURE__*/ requireCodegen();
	const names_1 = /*@__PURE__*/ requireNames();
	const resolve_1 = /*@__PURE__*/ requireResolve();
	const util_1 = /*@__PURE__*/ requireUtil();
	const errors_1 = /*@__PURE__*/ requireErrors();
	// schema compilation - generates validation function, subschemaCode (below) is used for subschemas
	function validateFunctionCode(it) {
	    if (isSchemaObj(it)) {
	        checkKeywords(it);
	        if (schemaCxtHasRules(it)) {
	            topSchemaObjCode(it);
	            return;
	        }
	    }
	    validateFunction(it, () => (0, boolSchema_1.topBoolOrEmptySchema)(it));
	}
	validate.validateFunctionCode = validateFunctionCode;
	function validateFunction({ gen, validateName, schema, schemaEnv, opts }, body) {
	    if (opts.code.es5) {
	        gen.func(validateName, (0, codegen_1._) `${names_1.default.data}, ${names_1.default.valCxt}`, schemaEnv.$async, () => {
	            gen.code((0, codegen_1._) `"use strict"; ${funcSourceUrl(schema, opts)}`);
	            destructureValCxtES5(gen, opts);
	            gen.code(body);
	        });
	    }
	    else {
	        gen.func(validateName, (0, codegen_1._) `${names_1.default.data}, ${destructureValCxt(opts)}`, schemaEnv.$async, () => gen.code(funcSourceUrl(schema, opts)).code(body));
	    }
	}
	function destructureValCxt(opts) {
	    return (0, codegen_1._) `{${names_1.default.instancePath}="", ${names_1.default.parentData}, ${names_1.default.parentDataProperty}, ${names_1.default.rootData}=${names_1.default.data}${opts.dynamicRef ? (0, codegen_1._) `, ${names_1.default.dynamicAnchors}={}` : codegen_1.nil}}={}`;
	}
	function destructureValCxtES5(gen, opts) {
	    gen.if(names_1.default.valCxt, () => {
	        gen.var(names_1.default.instancePath, (0, codegen_1._) `${names_1.default.valCxt}.${names_1.default.instancePath}`);
	        gen.var(names_1.default.parentData, (0, codegen_1._) `${names_1.default.valCxt}.${names_1.default.parentData}`);
	        gen.var(names_1.default.parentDataProperty, (0, codegen_1._) `${names_1.default.valCxt}.${names_1.default.parentDataProperty}`);
	        gen.var(names_1.default.rootData, (0, codegen_1._) `${names_1.default.valCxt}.${names_1.default.rootData}`);
	        if (opts.dynamicRef)
	            gen.var(names_1.default.dynamicAnchors, (0, codegen_1._) `${names_1.default.valCxt}.${names_1.default.dynamicAnchors}`);
	    }, () => {
	        gen.var(names_1.default.instancePath, (0, codegen_1._) `""`);
	        gen.var(names_1.default.parentData, (0, codegen_1._) `undefined`);
	        gen.var(names_1.default.parentDataProperty, (0, codegen_1._) `undefined`);
	        gen.var(names_1.default.rootData, names_1.default.data);
	        if (opts.dynamicRef)
	            gen.var(names_1.default.dynamicAnchors, (0, codegen_1._) `{}`);
	    });
	}
	function topSchemaObjCode(it) {
	    const { schema, opts, gen } = it;
	    validateFunction(it, () => {
	        if (opts.$comment && schema.$comment)
	            commentKeyword(it);
	        checkNoDefault(it);
	        gen.let(names_1.default.vErrors, null);
	        gen.let(names_1.default.errors, 0);
	        if (opts.unevaluated)
	            resetEvaluated(it);
	        typeAndKeywords(it);
	        returnResults(it);
	    });
	    return;
	}
	function resetEvaluated(it) {
	    // TODO maybe some hook to execute it in the end to check whether props/items are Name, as in assignEvaluated
	    const { gen, validateName } = it;
	    it.evaluated = gen.const("evaluated", (0, codegen_1._) `${validateName}.evaluated`);
	    gen.if((0, codegen_1._) `${it.evaluated}.dynamicProps`, () => gen.assign((0, codegen_1._) `${it.evaluated}.props`, (0, codegen_1._) `undefined`));
	    gen.if((0, codegen_1._) `${it.evaluated}.dynamicItems`, () => gen.assign((0, codegen_1._) `${it.evaluated}.items`, (0, codegen_1._) `undefined`));
	}
	function funcSourceUrl(schema, opts) {
	    const schId = typeof schema == "object" && schema[opts.schemaId];
	    return schId && (opts.code.source || opts.code.process) ? (0, codegen_1._) `/*# sourceURL=${schId} */` : codegen_1.nil;
	}
	// schema compilation - this function is used recursively to generate code for sub-schemas
	function subschemaCode(it, valid) {
	    if (isSchemaObj(it)) {
	        checkKeywords(it);
	        if (schemaCxtHasRules(it)) {
	            subSchemaObjCode(it, valid);
	            return;
	        }
	    }
	    (0, boolSchema_1.boolOrEmptySchema)(it, valid);
	}
	function schemaCxtHasRules({ schema, self }) {
	    if (typeof schema == "boolean")
	        return !schema;
	    for (const key in schema)
	        if (self.RULES.all[key])
	            return true;
	    return false;
	}
	function isSchemaObj(it) {
	    return typeof it.schema != "boolean";
	}
	function subSchemaObjCode(it, valid) {
	    const { schema, gen, opts } = it;
	    if (opts.$comment && schema.$comment)
	        commentKeyword(it);
	    updateContext(it);
	    checkAsyncSchema(it);
	    const errsCount = gen.const("_errs", names_1.default.errors);
	    typeAndKeywords(it, errsCount);
	    // TODO var
	    gen.var(valid, (0, codegen_1._) `${errsCount} === ${names_1.default.errors}`);
	}
	function checkKeywords(it) {
	    (0, util_1.checkUnknownRules)(it);
	    checkRefsAndKeywords(it);
	}
	function typeAndKeywords(it, errsCount) {
	    if (it.opts.jtd)
	        return schemaKeywords(it, [], false, errsCount);
	    const types = (0, dataType_1.getSchemaTypes)(it.schema);
	    const checkedTypes = (0, dataType_1.coerceAndCheckDataType)(it, types);
	    schemaKeywords(it, types, !checkedTypes, errsCount);
	}
	function checkRefsAndKeywords(it) {
	    const { schema, errSchemaPath, opts, self } = it;
	    if (schema.$ref && opts.ignoreKeywordsWithRef && (0, util_1.schemaHasRulesButRef)(schema, self.RULES)) {
	        self.logger.warn(`$ref: keywords ignored in schema at path "${errSchemaPath}"`);
	    }
	}
	function checkNoDefault(it) {
	    const { schema, opts } = it;
	    if (schema.default !== undefined && opts.useDefaults && opts.strictSchema) {
	        (0, util_1.checkStrictMode)(it, "default is ignored in the schema root");
	    }
	}
	function updateContext(it) {
	    const schId = it.schema[it.opts.schemaId];
	    if (schId)
	        it.baseId = (0, resolve_1.resolveUrl)(it.opts.uriResolver, it.baseId, schId);
	}
	function checkAsyncSchema(it) {
	    if (it.schema.$async && !it.schemaEnv.$async)
	        throw new Error("async schema in sync schema");
	}
	function commentKeyword({ gen, schemaEnv, schema, errSchemaPath, opts }) {
	    const msg = schema.$comment;
	    if (opts.$comment === true) {
	        gen.code((0, codegen_1._) `${names_1.default.self}.logger.log(${msg})`);
	    }
	    else if (typeof opts.$comment == "function") {
	        const schemaPath = (0, codegen_1.str) `${errSchemaPath}/$comment`;
	        const rootName = gen.scopeValue("root", { ref: schemaEnv.root });
	        gen.code((0, codegen_1._) `${names_1.default.self}.opts.$comment(${msg}, ${schemaPath}, ${rootName}.schema)`);
	    }
	}
	function returnResults(it) {
	    const { gen, schemaEnv, validateName, ValidationError, opts } = it;
	    if (schemaEnv.$async) {
	        // TODO assign unevaluated
	        gen.if((0, codegen_1._) `${names_1.default.errors} === 0`, () => gen.return(names_1.default.data), () => gen.throw((0, codegen_1._) `new ${ValidationError}(${names_1.default.vErrors})`));
	    }
	    else {
	        gen.assign((0, codegen_1._) `${validateName}.errors`, names_1.default.vErrors);
	        if (opts.unevaluated)
	            assignEvaluated(it);
	        gen.return((0, codegen_1._) `${names_1.default.errors} === 0`);
	    }
	}
	function assignEvaluated({ gen, evaluated, props, items }) {
	    if (props instanceof codegen_1.Name)
	        gen.assign((0, codegen_1._) `${evaluated}.props`, props);
	    if (items instanceof codegen_1.Name)
	        gen.assign((0, codegen_1._) `${evaluated}.items`, items);
	}
	function schemaKeywords(it, types, typeErrors, errsCount) {
	    const { gen, schema, data, allErrors, opts, self } = it;
	    const { RULES } = self;
	    if (schema.$ref && (opts.ignoreKeywordsWithRef || !(0, util_1.schemaHasRulesButRef)(schema, RULES))) {
	        gen.block(() => keywordCode(it, "$ref", RULES.all.$ref.definition)); // TODO typecast
	        return;
	    }
	    if (!opts.jtd)
	        checkStrictTypes(it, types);
	    gen.block(() => {
	        for (const group of RULES.rules)
	            groupKeywords(group);
	        groupKeywords(RULES.post);
	    });
	    function groupKeywords(group) {
	        if (!(0, applicability_1.shouldUseGroup)(schema, group))
	            return;
	        if (group.type) {
	            gen.if((0, dataType_2.checkDataType)(group.type, data, opts.strictNumbers));
	            iterateKeywords(it, group);
	            if (types.length === 1 && types[0] === group.type && typeErrors) {
	                gen.else();
	                (0, dataType_2.reportTypeError)(it);
	            }
	            gen.endIf();
	        }
	        else {
	            iterateKeywords(it, group);
	        }
	        // TODO make it "ok" call?
	        if (!allErrors)
	            gen.if((0, codegen_1._) `${names_1.default.errors} === ${errsCount || 0}`);
	    }
	}
	function iterateKeywords(it, group) {
	    const { gen, schema, opts: { useDefaults }, } = it;
	    if (useDefaults)
	        (0, defaults_1.assignDefaults)(it, group.type);
	    gen.block(() => {
	        for (const rule of group.rules) {
	            if ((0, applicability_1.shouldUseRule)(schema, rule)) {
	                keywordCode(it, rule.keyword, rule.definition, group.type);
	            }
	        }
	    });
	}
	function checkStrictTypes(it, types) {
	    if (it.schemaEnv.meta || !it.opts.strictTypes)
	        return;
	    checkContextTypes(it, types);
	    if (!it.opts.allowUnionTypes)
	        checkMultipleTypes(it, types);
	    checkKeywordTypes(it, it.dataTypes);
	}
	function checkContextTypes(it, types) {
	    if (!types.length)
	        return;
	    if (!it.dataTypes.length) {
	        it.dataTypes = types;
	        return;
	    }
	    types.forEach((t) => {
	        if (!includesType(it.dataTypes, t)) {
	            strictTypesError(it, `type "${t}" not allowed by context "${it.dataTypes.join(",")}"`);
	        }
	    });
	    narrowSchemaTypes(it, types);
	}
	function checkMultipleTypes(it, ts) {
	    if (ts.length > 1 && !(ts.length === 2 && ts.includes("null"))) {
	        strictTypesError(it, "use allowUnionTypes to allow union type keyword");
	    }
	}
	function checkKeywordTypes(it, ts) {
	    const rules = it.self.RULES.all;
	    for (const keyword in rules) {
	        const rule = rules[keyword];
	        if (typeof rule == "object" && (0, applicability_1.shouldUseRule)(it.schema, rule)) {
	            const { type } = rule.definition;
	            if (type.length && !type.some((t) => hasApplicableType(ts, t))) {
	                strictTypesError(it, `missing type "${type.join(",")}" for keyword "${keyword}"`);
	            }
	        }
	    }
	}
	function hasApplicableType(schTs, kwdT) {
	    return schTs.includes(kwdT) || (kwdT === "number" && schTs.includes("integer"));
	}
	function includesType(ts, t) {
	    return ts.includes(t) || (t === "integer" && ts.includes("number"));
	}
	function narrowSchemaTypes(it, withTypes) {
	    const ts = [];
	    for (const t of it.dataTypes) {
	        if (includesType(withTypes, t))
	            ts.push(t);
	        else if (withTypes.includes("integer") && t === "number")
	            ts.push("integer");
	    }
	    it.dataTypes = ts;
	}
	function strictTypesError(it, msg) {
	    const schemaPath = it.schemaEnv.baseId + it.errSchemaPath;
	    msg += ` at "${schemaPath}" (strictTypes)`;
	    (0, util_1.checkStrictMode)(it, msg, it.opts.strictTypes);
	}
	class KeywordCxt {
	    constructor(it, def, keyword) {
	        (0, keyword_1.validateKeywordUsage)(it, def, keyword);
	        this.gen = it.gen;
	        this.allErrors = it.allErrors;
	        this.keyword = keyword;
	        this.data = it.data;
	        this.schema = it.schema[keyword];
	        this.$data = def.$data && it.opts.$data && this.schema && this.schema.$data;
	        this.schemaValue = (0, util_1.schemaRefOrVal)(it, this.schema, keyword, this.$data);
	        this.schemaType = def.schemaType;
	        this.parentSchema = it.schema;
	        this.params = {};
	        this.it = it;
	        this.def = def;
	        if (this.$data) {
	            this.schemaCode = it.gen.const("vSchema", getData(this.$data, it));
	        }
	        else {
	            this.schemaCode = this.schemaValue;
	            if (!(0, keyword_1.validSchemaType)(this.schema, def.schemaType, def.allowUndefined)) {
	                throw new Error(`${keyword} value must be ${JSON.stringify(def.schemaType)}`);
	            }
	        }
	        if ("code" in def ? def.trackErrors : def.errors !== false) {
	            this.errsCount = it.gen.const("_errs", names_1.default.errors);
	        }
	    }
	    result(condition, successAction, failAction) {
	        this.failResult((0, codegen_1.not)(condition), successAction, failAction);
	    }
	    failResult(condition, successAction, failAction) {
	        this.gen.if(condition);
	        if (failAction)
	            failAction();
	        else
	            this.error();
	        if (successAction) {
	            this.gen.else();
	            successAction();
	            if (this.allErrors)
	                this.gen.endIf();
	        }
	        else {
	            if (this.allErrors)
	                this.gen.endIf();
	            else
	                this.gen.else();
	        }
	    }
	    pass(condition, failAction) {
	        this.failResult((0, codegen_1.not)(condition), undefined, failAction);
	    }
	    fail(condition) {
	        if (condition === undefined) {
	            this.error();
	            if (!this.allErrors)
	                this.gen.if(false); // this branch will be removed by gen.optimize
	            return;
	        }
	        this.gen.if(condition);
	        this.error();
	        if (this.allErrors)
	            this.gen.endIf();
	        else
	            this.gen.else();
	    }
	    fail$data(condition) {
	        if (!this.$data)
	            return this.fail(condition);
	        const { schemaCode } = this;
	        this.fail((0, codegen_1._) `${schemaCode} !== undefined && (${(0, codegen_1.or)(this.invalid$data(), condition)})`);
	    }
	    error(append, errorParams, errorPaths) {
	        if (errorParams) {
	            this.setParams(errorParams);
	            this._error(append, errorPaths);
	            this.setParams({});
	            return;
	        }
	        this._error(append, errorPaths);
	    }
	    _error(append, errorPaths) {
	        (append ? errors_1.reportExtraError : errors_1.reportError)(this, this.def.error, errorPaths);
	    }
	    $dataError() {
	        (0, errors_1.reportError)(this, this.def.$dataError || errors_1.keyword$DataError);
	    }
	    reset() {
	        if (this.errsCount === undefined)
	            throw new Error('add "trackErrors" to keyword definition');
	        (0, errors_1.resetErrorsCount)(this.gen, this.errsCount);
	    }
	    ok(cond) {
	        if (!this.allErrors)
	            this.gen.if(cond);
	    }
	    setParams(obj, assign) {
	        if (assign)
	            Object.assign(this.params, obj);
	        else
	            this.params = obj;
	    }
	    block$data(valid, codeBlock, $dataValid = codegen_1.nil) {
	        this.gen.block(() => {
	            this.check$data(valid, $dataValid);
	            codeBlock();
	        });
	    }
	    check$data(valid = codegen_1.nil, $dataValid = codegen_1.nil) {
	        if (!this.$data)
	            return;
	        const { gen, schemaCode, schemaType, def } = this;
	        gen.if((0, codegen_1.or)((0, codegen_1._) `${schemaCode} === undefined`, $dataValid));
	        if (valid !== codegen_1.nil)
	            gen.assign(valid, true);
	        if (schemaType.length || def.validateSchema) {
	            gen.elseIf(this.invalid$data());
	            this.$dataError();
	            if (valid !== codegen_1.nil)
	                gen.assign(valid, false);
	        }
	        gen.else();
	    }
	    invalid$data() {
	        const { gen, schemaCode, schemaType, def, it } = this;
	        return (0, codegen_1.or)(wrong$DataType(), invalid$DataSchema());
	        function wrong$DataType() {
	            if (schemaType.length) {
	                /* istanbul ignore if */
	                if (!(schemaCode instanceof codegen_1.Name))
	                    throw new Error("ajv implementation error");
	                const st = Array.isArray(schemaType) ? schemaType : [schemaType];
	                return (0, codegen_1._) `${(0, dataType_2.checkDataTypes)(st, schemaCode, it.opts.strictNumbers, dataType_2.DataType.Wrong)}`;
	            }
	            return codegen_1.nil;
	        }
	        function invalid$DataSchema() {
	            if (def.validateSchema) {
	                const validateSchemaRef = gen.scopeValue("validate$data", { ref: def.validateSchema }); // TODO value.code for standalone
	                return (0, codegen_1._) `!${validateSchemaRef}(${schemaCode})`;
	            }
	            return codegen_1.nil;
	        }
	    }
	    subschema(appl, valid) {
	        const subschema = (0, subschema_1.getSubschema)(this.it, appl);
	        (0, subschema_1.extendSubschemaData)(subschema, this.it, appl);
	        (0, subschema_1.extendSubschemaMode)(subschema, appl);
	        const nextContext = { ...this.it, ...subschema, items: undefined, props: undefined };
	        subschemaCode(nextContext, valid);
	        return nextContext;
	    }
	    mergeEvaluated(schemaCxt, toName) {
	        const { it, gen } = this;
	        if (!it.opts.unevaluated)
	            return;
	        if (it.props !== true && schemaCxt.props !== undefined) {
	            it.props = util_1.mergeEvaluated.props(gen, schemaCxt.props, it.props, toName);
	        }
	        if (it.items !== true && schemaCxt.items !== undefined) {
	            it.items = util_1.mergeEvaluated.items(gen, schemaCxt.items, it.items, toName);
	        }
	    }
	    mergeValidEvaluated(schemaCxt, valid) {
	        const { it, gen } = this;
	        if (it.opts.unevaluated && (it.props !== true || it.items !== true)) {
	            gen.if(valid, () => this.mergeEvaluated(schemaCxt, codegen_1.Name));
	            return true;
	        }
	    }
	}
	validate.KeywordCxt = KeywordCxt;
	function keywordCode(it, keyword, def, ruleType) {
	    const cxt = new KeywordCxt(it, def, keyword);
	    if ("code" in def) {
	        def.code(cxt, ruleType);
	    }
	    else if (cxt.$data && def.validate) {
	        (0, keyword_1.funcKeywordCode)(cxt, def);
	    }
	    else if ("macro" in def) {
	        (0, keyword_1.macroKeywordCode)(cxt, def);
	    }
	    else if (def.compile || def.validate) {
	        (0, keyword_1.funcKeywordCode)(cxt, def);
	    }
	}
	const JSON_POINTER = /^\/(?:[^~]|~0|~1)*$/;
	const RELATIVE_JSON_POINTER = /^([0-9]+)(#|\/(?:[^~]|~0|~1)*)?$/;
	function getData($data, { dataLevel, dataNames, dataPathArr }) {
	    let jsonPointer;
	    let data;
	    if ($data === "")
	        return names_1.default.rootData;
	    if ($data[0] === "/") {
	        if (!JSON_POINTER.test($data))
	            throw new Error(`Invalid JSON-pointer: ${$data}`);
	        jsonPointer = $data;
	        data = names_1.default.rootData;
	    }
	    else {
	        const matches = RELATIVE_JSON_POINTER.exec($data);
	        if (!matches)
	            throw new Error(`Invalid JSON-pointer: ${$data}`);
	        const up = +matches[1];
	        jsonPointer = matches[2];
	        if (jsonPointer === "#") {
	            if (up >= dataLevel)
	                throw new Error(errorMsg("property/index", up));
	            return dataPathArr[dataLevel - up];
	        }
	        if (up > dataLevel)
	            throw new Error(errorMsg("data", up));
	        data = dataNames[dataLevel - up];
	        if (!jsonPointer)
	            return data;
	    }
	    let expr = data;
	    const segments = jsonPointer.split("/");
	    for (const segment of segments) {
	        if (segment) {
	            data = (0, codegen_1._) `${data}${(0, codegen_1.getProperty)((0, util_1.unescapeJsonPointer)(segment))}`;
	            expr = (0, codegen_1._) `${expr} && ${data}`;
	        }
	    }
	    return expr;
	    function errorMsg(pointerType, up) {
	        return `Cannot access ${pointerType} ${up} levels up, current level is ${dataLevel}`;
	    }
	}
	validate.getData = getData;
	
	return validate;
}

var validation_error = {};

var hasRequiredValidation_error;

function requireValidation_error () {
	if (hasRequiredValidation_error) return validation_error;
	hasRequiredValidation_error = 1;
	Object.defineProperty(validation_error, "__esModule", { value: true });
	class ValidationError extends Error {
	    constructor(errors) {
	        super("validation failed");
	        this.errors = errors;
	        this.ajv = this.validation = true;
	    }
	}
	validation_error.default = ValidationError;
	
	return validation_error;
}

var ref_error = {};

var hasRequiredRef_error;

function requireRef_error () {
	if (hasRequiredRef_error) return ref_error;
	hasRequiredRef_error = 1;
	Object.defineProperty(ref_error, "__esModule", { value: true });
	const resolve_1 = /*@__PURE__*/ requireResolve();
	class MissingRefError extends Error {
	    constructor(resolver, baseId, ref, msg) {
	        super(msg || `can't resolve reference ${ref} from id ${baseId}`);
	        this.missingRef = (0, resolve_1.resolveUrl)(resolver, baseId, ref);
	        this.missingSchema = (0, resolve_1.normalizeId)((0, resolve_1.getFullPath)(resolver, this.missingRef));
	    }
	}
	ref_error.default = MissingRefError;
	
	return ref_error;
}

var compile = {};

var hasRequiredCompile;

function requireCompile () {
	if (hasRequiredCompile) return compile;
	hasRequiredCompile = 1;
	Object.defineProperty(compile, "__esModule", { value: true });
	compile.resolveSchema = compile.getCompilingSchema = compile.resolveRef = compile.compileSchema = compile.SchemaEnv = void 0;
	const codegen_1 = /*@__PURE__*/ requireCodegen();
	const validation_error_1 = /*@__PURE__*/ requireValidation_error();
	const names_1 = /*@__PURE__*/ requireNames();
	const resolve_1 = /*@__PURE__*/ requireResolve();
	const util_1 = /*@__PURE__*/ requireUtil();
	const validate_1 = /*@__PURE__*/ requireValidate();
	class SchemaEnv {
	    constructor(env) {
	        var _a;
	        this.refs = {};
	        this.dynamicAnchors = {};
	        let schema;
	        if (typeof env.schema == "object")
	            schema = env.schema;
	        this.schema = env.schema;
	        this.schemaId = env.schemaId;
	        this.root = env.root || this;
	        this.baseId = (_a = env.baseId) !== null && _a !== void 0 ? _a : (0, resolve_1.normalizeId)(schema === null || schema === void 0 ? void 0 : schema[env.schemaId || "$id"]);
	        this.schemaPath = env.schemaPath;
	        this.localRefs = env.localRefs;
	        this.meta = env.meta;
	        this.$async = schema === null || schema === void 0 ? void 0 : schema.$async;
	        this.refs = {};
	    }
	}
	compile.SchemaEnv = SchemaEnv;
	// let codeSize = 0
	// let nodeCount = 0
	// Compiles schema in SchemaEnv
	function compileSchema(sch) {
	    // TODO refactor - remove compilations
	    const _sch = getCompilingSchema.call(this, sch);
	    if (_sch)
	        return _sch;
	    const rootId = (0, resolve_1.getFullPath)(this.opts.uriResolver, sch.root.baseId); // TODO if getFullPath removed 1 tests fails
	    const { es5, lines } = this.opts.code;
	    const { ownProperties } = this.opts;
	    const gen = new codegen_1.CodeGen(this.scope, { es5, lines, ownProperties });
	    let _ValidationError;
	    if (sch.$async) {
	        _ValidationError = gen.scopeValue("Error", {
	            ref: validation_error_1.default,
	            code: (0, codegen_1._) `require("ajv/dist/runtime/validation_error").default`,
	        });
	    }
	    const validateName = gen.scopeName("validate");
	    sch.validateName = validateName;
	    const schemaCxt = {
	        gen,
	        allErrors: this.opts.allErrors,
	        data: names_1.default.data,
	        parentData: names_1.default.parentData,
	        parentDataProperty: names_1.default.parentDataProperty,
	        dataNames: [names_1.default.data],
	        dataPathArr: [codegen_1.nil], // TODO can its length be used as dataLevel if nil is removed?
	        dataLevel: 0,
	        dataTypes: [],
	        definedProperties: new Set(),
	        topSchemaRef: gen.scopeValue("schema", this.opts.code.source === true
	            ? { ref: sch.schema, code: (0, codegen_1.stringify)(sch.schema) }
	            : { ref: sch.schema }),
	        validateName,
	        ValidationError: _ValidationError,
	        schema: sch.schema,
	        schemaEnv: sch,
	        rootId,
	        baseId: sch.baseId || rootId,
	        schemaPath: codegen_1.nil,
	        errSchemaPath: sch.schemaPath || (this.opts.jtd ? "" : "#"),
	        errorPath: (0, codegen_1._) `""`,
	        opts: this.opts,
	        self: this,
	    };
	    let sourceCode;
	    try {
	        this._compilations.add(sch);
	        (0, validate_1.validateFunctionCode)(schemaCxt);
	        gen.optimize(this.opts.code.optimize);
	        // gen.optimize(1)
	        const validateCode = gen.toString();
	        sourceCode = `${gen.scopeRefs(names_1.default.scope)}return ${validateCode}`;
	        // console.log((codeSize += sourceCode.length), (nodeCount += gen.nodeCount))
	        if (this.opts.code.process)
	            sourceCode = this.opts.code.process(sourceCode, sch);
	        // console.log("\n\n\n *** \n", sourceCode)
	        const makeValidate = new Function(`${names_1.default.self}`, `${names_1.default.scope}`, sourceCode);
	        const validate = makeValidate(this, this.scope.get());
	        this.scope.value(validateName, { ref: validate });
	        validate.errors = null;
	        validate.schema = sch.schema;
	        validate.schemaEnv = sch;
	        if (sch.$async)
	            validate.$async = true;
	        if (this.opts.code.source === true) {
	            validate.source = { validateName, validateCode, scopeValues: gen._values };
	        }
	        if (this.opts.unevaluated) {
	            const { props, items } = schemaCxt;
	            validate.evaluated = {
	                props: props instanceof codegen_1.Name ? undefined : props,
	                items: items instanceof codegen_1.Name ? undefined : items,
	                dynamicProps: props instanceof codegen_1.Name,
	                dynamicItems: items instanceof codegen_1.Name,
	            };
	            if (validate.source)
	                validate.source.evaluated = (0, codegen_1.stringify)(validate.evaluated);
	        }
	        sch.validate = validate;
	        return sch;
	    }
	    catch (e) {
	        delete sch.validate;
	        delete sch.validateName;
	        if (sourceCode)
	            this.logger.error("Error compiling schema, function code:", sourceCode);
	        // console.log("\n\n\n *** \n", sourceCode, this.opts)
	        throw e;
	    }
	    finally {
	        this._compilations.delete(sch);
	    }
	}
	compile.compileSchema = compileSchema;
	function resolveRef(root, baseId, ref) {
	    var _a;
	    ref = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, ref);
	    const schOrFunc = root.refs[ref];
	    if (schOrFunc)
	        return schOrFunc;
	    let _sch = resolve.call(this, root, ref);
	    if (_sch === undefined) {
	        const schema = (_a = root.localRefs) === null || _a === void 0 ? void 0 : _a[ref]; // TODO maybe localRefs should hold SchemaEnv
	        const { schemaId } = this.opts;
	        if (schema)
	            _sch = new SchemaEnv({ schema, schemaId, root, baseId });
	    }
	    if (_sch === undefined)
	        return;
	    return (root.refs[ref] = inlineOrCompile.call(this, _sch));
	}
	compile.resolveRef = resolveRef;
	function inlineOrCompile(sch) {
	    if ((0, resolve_1.inlineRef)(sch.schema, this.opts.inlineRefs))
	        return sch.schema;
	    return sch.validate ? sch : compileSchema.call(this, sch);
	}
	// Index of schema compilation in the currently compiled list
	function getCompilingSchema(schEnv) {
	    for (const sch of this._compilations) {
	        if (sameSchemaEnv(sch, schEnv))
	            return sch;
	    }
	}
	compile.getCompilingSchema = getCompilingSchema;
	function sameSchemaEnv(s1, s2) {
	    return s1.schema === s2.schema && s1.root === s2.root && s1.baseId === s2.baseId;
	}
	// resolve and compile the references ($ref)
	// TODO returns AnySchemaObject (if the schema can be inlined) or validation function
	function resolve(root, // information about the root schema for the current schema
	ref // reference to resolve
	) {
	    let sch;
	    while (typeof (sch = this.refs[ref]) == "string")
	        ref = sch;
	    return sch || this.schemas[ref] || resolveSchema.call(this, root, ref);
	}
	// Resolve schema, its root and baseId
	function resolveSchema(root, // root object with properties schema, refs TODO below SchemaEnv is assigned to it
	ref // reference to resolve
	) {
	    const p = this.opts.uriResolver.parse(ref);
	    const refPath = (0, resolve_1._getFullPath)(this.opts.uriResolver, p);
	    let baseId = (0, resolve_1.getFullPath)(this.opts.uriResolver, root.baseId, undefined);
	    // TODO `Object.keys(root.schema).length > 0` should not be needed - but removing breaks 2 tests
	    if (Object.keys(root.schema).length > 0 && refPath === baseId) {
	        return getJsonPointer.call(this, p, root);
	    }
	    const id = (0, resolve_1.normalizeId)(refPath);
	    const schOrRef = this.refs[id] || this.schemas[id];
	    if (typeof schOrRef == "string") {
	        const sch = resolveSchema.call(this, root, schOrRef);
	        if (typeof (sch === null || sch === void 0 ? void 0 : sch.schema) !== "object")
	            return;
	        return getJsonPointer.call(this, p, sch);
	    }
	    if (typeof (schOrRef === null || schOrRef === void 0 ? void 0 : schOrRef.schema) !== "object")
	        return;
	    if (!schOrRef.validate)
	        compileSchema.call(this, schOrRef);
	    if (id === (0, resolve_1.normalizeId)(ref)) {
	        const { schema } = schOrRef;
	        const { schemaId } = this.opts;
	        const schId = schema[schemaId];
	        if (schId)
	            baseId = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schId);
	        return new SchemaEnv({ schema, schemaId, root, baseId });
	    }
	    return getJsonPointer.call(this, p, schOrRef);
	}
	compile.resolveSchema = resolveSchema;
	const PREVENT_SCOPE_CHANGE = new Set([
	    "properties",
	    "patternProperties",
	    "enum",
	    "dependencies",
	    "definitions",
	]);
	function getJsonPointer(parsedRef, { baseId, schema, root }) {
	    var _a;
	    if (((_a = parsedRef.fragment) === null || _a === void 0 ? void 0 : _a[0]) !== "/")
	        return;
	    for (const part of parsedRef.fragment.slice(1).split("/")) {
	        if (typeof schema === "boolean")
	            return;
	        const partSchema = schema[(0, util_1.unescapeFragment)(part)];
	        if (partSchema === undefined)
	            return;
	        schema = partSchema;
	        // TODO PREVENT_SCOPE_CHANGE could be defined in keyword def?
	        const schId = typeof schema === "object" && schema[this.opts.schemaId];
	        if (!PREVENT_SCOPE_CHANGE.has(part) && schId) {
	            baseId = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schId);
	        }
	    }
	    let env;
	    if (typeof schema != "boolean" && schema.$ref && !(0, util_1.schemaHasRulesButRef)(schema, this.RULES)) {
	        const $ref = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schema.$ref);
	        env = resolveSchema.call(this, root, $ref);
	    }
	    // even though resolution failed we need to return SchemaEnv to throw exception
	    // so that compileAsync loads missing schema.
	    const { schemaId } = this.opts;
	    env = env || new SchemaEnv({ schema, schemaId, root, baseId });
	    if (env.schema !== env.root.schema)
	        return env;
	    return undefined;
	}
	
	return compile;
}

var $id$a = "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#";
var description = "Meta-schema for $data reference (JSON AnySchema extension proposal)";
var type$a = "object";
var required$3 = [
	"$data"
];
var properties$b = {
	$data: {
		type: "string",
		anyOf: [
			{
				format: "relative-json-pointer"
			},
			{
				format: "json-pointer"
			}
		]
	}
};
var additionalProperties$3 = false;
var require$$9 = {
	$id: $id$a,
	description: description,
	type: type$a,
	required: required$3,
	properties: properties$b,
	additionalProperties: additionalProperties$3
};

var uri = {};

var fastUri = {exports: {}};

var utils;
var hasRequiredUtils;

function requireUtils () {
	if (hasRequiredUtils) return utils;
	hasRequiredUtils = 1;

	/** @type {(value: string) => boolean} */
	const isUUID = RegExp.prototype.test.bind(/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu);

	/** @type {(value: string) => boolean} */
	const isIPv4 = RegExp.prototype.test.bind(/^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)$/u);

	/** @type {(value: string) => boolean} */
	const isPort = RegExp.prototype.test.bind(/^\d*$/u);

	/** @type {(value: string) => boolean} */
	const isHexPair = RegExp.prototype.test.bind(/^[\da-f]{2}$/iu);

	/** @type {(value: string) => boolean} */
	const isUnreserved = RegExp.prototype.test.bind(/^[\da-z\-._~]$/iu);

	/** @type {(value: string) => boolean} */
	const isPathCharacter = RegExp.prototype.test.bind(/^[A-Za-z0-9\-._~!$&'()*+,;=:@/]$/u);

	/** @type {(value: string) => boolean} */
	const isQueryFragmentCharacter = RegExp.prototype.test.bind(/^[A-Za-z0-9\-._~!$&'()*+,;=:@/?]$/u);

	/** @type {(value: string) => boolean} */
	const isUserinfoCharacter = RegExp.prototype.test.bind(/^[A-Za-z0-9\-._~!$&'()*+,;=:]$/u);

	const BYTE_HEX = new Array(256);
	{
	  const HEX_DIGITS = '0123456789ABCDEF';
	  for (let i = 0; i < 256; i++) {
	    BYTE_HEX[i] = '%' + HEX_DIGITS[i >> 4] + HEX_DIGITS[i & 0xF];
	  }
	}
	function percentEncodeNonAscii (cp) {
	  if (cp < 0x800) {
	    return BYTE_HEX[0xC0 | (cp >> 6)] +
	           BYTE_HEX[0x80 | (cp & 0x3F)]
	  }
	  if (cp < 0x10000) {
	    return BYTE_HEX[0xE0 | (cp >> 12)] +
	           BYTE_HEX[0x80 | ((cp >> 6) & 0x3F)] +
	           BYTE_HEX[0x80 | (cp & 0x3F)]
	  }
	  return BYTE_HEX[0xF0 | (cp >> 18)] +
	         BYTE_HEX[0x80 | ((cp >> 12) & 0x3F)] +
	         BYTE_HEX[0x80 | ((cp >> 6) & 0x3F)] +
	         BYTE_HEX[0x80 | (cp & 0x3F)]
	}

	/**
	 * @param {Array<string>} input
	 * @returns {string}
	 */
	function stringArrayToHexStripped (input) {
	  let acc = '';
	  let code = 0;
	  let i = 0;

	  for (i = 0; i < input.length; i++) {
	    code = input[i].charCodeAt(0);
	    if (code === 48) {
	      continue
	    }
	    if (!((code >= 48 && code <= 57) || (code >= 65 && code <= 70) || (code >= 97 && code <= 102))) {
	      return ''
	    }
	    acc += input[i];
	    break
	  }

	  for (i += 1; i < input.length; i++) {
	    code = input[i].charCodeAt(0);
	    if (!((code >= 48 && code <= 57) || (code >= 65 && code <= 70) || (code >= 97 && code <= 102))) {
	      return ''
	    }
	    acc += input[i];
	  }
	  return acc
	}

	/** @type {(value: string) => boolean} */
	const isHextet = RegExp.prototype.test.bind(/^[\dA-Fa-f]{1,4}$/);

	/** @type {(value: string) => boolean} */
	const isIPvFuture = RegExp.prototype.test.bind(/^[vV][\dA-Fa-f]+\.[A-Za-z\d\-._~!$&'()*+,;=:]+$/);

	/** @type {(value: string) => boolean} */
	const isZoneCharacter = RegExp.prototype.test.bind(/^[A-Za-z\d\-._~]$/);

	/**
	 * @param {string} value
	 * @returns {boolean}
	 */
	const nonSimpleDomain = RegExp.prototype.test.bind(/[^!"$&'()*+,\-.;=_`a-z{}~]/u);

	/**
	 * @param {string} zone
	 * @returns {boolean}
	 */
	function isZoneIdentifier (zone) {
	  if (zone.length === 0) return false

	  for (let i = 0; i < zone.length; i++) {
	    if (isZoneCharacter(zone[i])) continue
	    if (zone[i] === '%' && i + 2 < zone.length && isHexPair(zone.slice(i + 1, i + 3))) {
	      i += 2;
	      continue
	    }
	    return false
	  }

	  return true
	}

	/**
	 * Compresses the longest run of zero hextets to "::" per RFC 5952. A run of a
	 * single zero hextet is left uncompressed. On ties the leftmost run wins.
	 *
	 * @param {string[]} hextets
	 * @returns {string}
	 */
	function compressIPv6ZeroRun (hextets) {
	  let bestStart = -1;
	  let bestLength = 0;
	  let runStart = -1;
	  let runLength = 0;
	  for (let i = 0; i < hextets.length; i++) {
	    if (hextets[i] === '0') {
	      if (runStart === -1) runStart = i;
	      runLength++;
	      if (runLength > bestLength) {
	        bestLength = runLength;
	        bestStart = runStart;
	      }
	    } else {
	      runStart = -1;
	      runLength = 0;
	    }
	  }

	  if (bestLength < 2) return hextets.join(':')

	  const head = hextets.slice(0, bestStart).join(':');
	  const tail = hextets.slice(bestStart + bestLength).join(':');
	  return head + '::' + tail
	}

	/**
	 * Validates an IPv6 address against the alternatives in RFC 3986 section
	 * 3.2.2 and returns the same address with leading hextet zeroes removed.
	 * An embedded IPv4 address counts as two hextets and is only valid at the end.
	 *
	 * @param {string} input
	 * @returns {string|undefined}
	 */
	function normalizeIPv6Address (input) {
	  const compression = input.indexOf('::');
	  if (compression !== -1 && input.indexOf('::', compression + 1) !== -1) return undefined

	  const left = compression === -1 ? input.split(':') : input.slice(0, compression).split(':');
	  const right = compression === -1 ? [] : input.slice(compression + 2).split(':');
	  if (compression !== -1) {
	    if (left.length === 1 && left[0] === '') left.length = 0;
	    if (right.length === 1 && right[0] === '') right.length = 0;
	  }

	  const parts = left.concat(right);
	  let hextetCount = 0;
	  for (let i = 0; i < parts.length; i++) {
	    const part = parts[i];
	    if (part === '') return undefined

	    if (part.indexOf('.') !== -1) {
	      if (i !== parts.length - 1 || (compression !== -1 && right.length === 0) || !isIPv4(part)) return undefined
	      hextetCount += 2;
	      continue
	    }

	    if (!isHextet(part)) return undefined
	    parts[i] = parseInt(part, 16).toString(16);
	    hextetCount++;
	  }

	  if (compression === -1) {
	    if (hextetCount !== 8) return undefined
	    return compressIPv6ZeroRun(parts)
	  }
	  if (hextetCount >= 8) return undefined

	  // expand "::" then re-compress the longest run for a canonical result
	  const expanded = parts.slice(0, left.length);
	  for (let i = hextetCount; i < 8; i++) expanded.push('0');
	  for (let i = left.length; i < parts.length; i++) expanded.push(parts[i]);
	  return compressIPv6ZeroRun(expanded)
	}

	/**
	 * @typedef {Object} NormalizeIPv6Result
	 * @property {string} host - The normalized host.
	 * @property {string} [escapedHost] - The escaped host.
	 * @property {boolean} isIPV6 - Indicates if the host is an IPv6 address.
	 * @property {boolean} [isIPVFuture] - Indicates if the host is an IPvFuture literal.
	 * @property {boolean} [error] - Indicates if a bracketed IP literal is malformed.
	 */

	/**
	 * Validates and normalizes a bracketed IP literal. Raw zone separators remain
	 * accepted for backwards compatibility, while encoded separators and zone
	 * contents follow RFC 6874.
	 *
	 * @param {string} host
	 * @returns {NormalizeIPv6Result}
	 */
	function normalizeIPv6 (host) {
	  const bracketed = host[0] === '[' && host[host.length - 1] === ']';
	  const hasBracket = host[0] === '[' || host[host.length - 1] === ']';
	  if (hasBracket && !bracketed) return { host, isIPV6: false, error: true }

	  let input = bracketed ? host.slice(1, -1) : host;
	  if (bracketed && isIPvFuture(input)) {
	    input = input.toLowerCase();
	    return { host: `[${input}]`, escapedHost: input, isIPV6: false, isIPVFuture: true }
	  }

	  if (findToken(input, ':') < 2) {
	    return { host, isIPV6: false, error: bracketed }
	  }

	  let zoneIdentifier = '';
	  const zoneSeparator = input.indexOf('%');
	  if (zoneSeparator !== -1) {
	    const separatorLength = input.slice(zoneSeparator, zoneSeparator + 3).toLowerCase() === '%25' ? 3 : 1;
	    zoneIdentifier = input.slice(zoneSeparator + separatorLength);
	    if (!isZoneIdentifier(zoneIdentifier)) return { host, isIPV6: false, error: true }
	    input = input.slice(0, zoneSeparator);
	  }

	  const address = normalizeIPv6Address(input);
	  if (address === undefined) return { host, isIPV6: false, error: true }

	  return {
	    host: address + (zoneIdentifier ? '%' + zoneIdentifier : ''),
	    escapedHost: address + (zoneIdentifier ? '%25' + zoneIdentifier : ''),
	    isIPV6: true
	  }
	}

	/**
	 * @param {string} str
	 * @param {string} token
	 * @returns {number}
	 */
	function findToken (str, token) {
	  let ind = 0;
	  for (let i = 0; i < str.length; i++) {
	    if (str[i] === token) ind++;
	  }
	  return ind
	}

	/**
	 * @param {string} path
	 * @returns {string}
	 *
	 * @see https://datatracker.ietf.org/doc/html/rfc3986#section-5.2.4
	 */
	function removeDotSegments (path) {
	  let input = path;
	  const output = [];
	  let nextSlash = -1;
	  let len = 0;

	  // eslint-disable-next-line no-cond-assign
	  while (len = input.length) {
	    if (len === 1) {
	      if (input === '.') {
	        break
	      } else if (input === '/') {
	        output.push('/');
	        break
	      } else {
	        output.push(input);
	        break
	      }
	    } else if (len === 2) {
	      if (input[0] === '.') {
	        if (input[1] === '.') {
	          break
	        } else if (input[1] === '/') {
	          input = input.slice(2);
	          continue
	        }
	      } else if (input[0] === '/') {
	        if (input[1] === '.' || input[1] === '/') {
	          output.push('/');
	          break
	        }
	      }
	    } else if (len === 3) {
	      if (input === '/..') {
	        if (output.length !== 0) {
	          output.pop();
	        }
	        output.push('/');
	        break
	      }
	    }
	    if (input[0] === '.') {
	      if (input[1] === '.') {
	        if (input[2] === '/') {
	          input = input.slice(3);
	          continue
	        }
	      } else if (input[1] === '/') {
	        input = input.slice(2);
	        continue
	      }
	    } else if (input[0] === '/') {
	      if (input[1] === '.') {
	        if (input[2] === '/') {
	          input = input.slice(2);
	          continue
	        } else if (input[2] === '.') {
	          if (input[3] === '/') {
	            input = input.slice(3);
	            if (output.length !== 0) {
	              output.pop();
	            }
	            continue
	          }
	        }
	      }
	    }

	    // Rule 2E: Move normal path segment to output
	    if ((nextSlash = input.indexOf('/', 1)) === -1) {
	      output.push(input);
	      break
	    } else {
	      output.push(input.slice(0, nextSlash));
	      input = input.slice(nextSlash);
	    }
	  }

	  return output.join('')
	}

	/**
	 * Re-escape RFC 3986 gen-delims that must not appear literally in the host.
	 * After the URI regex parses, these characters cannot be literal in the host
	 * field, so any that appear after decoding came from percent-encoding and
	 * must be restored to prevent authority structure changes.
	 *
	 * @param {string} host
	 * @param {boolean} isIP - true for IPv4/IPv6 hosts (skip colon re-escaping)
	 * @returns {string}
	 */
	const HOST_DELIMS = { '@': '%40', '/': '%2F', '?': '%3F', '#': '%23', ':': '%3A' };
	const HOST_DELIM_RE = /[@/?#:]/g;
	const HOST_DELIM_NO_COLON_RE = /[@/?#]/g;

	function reescapeHostDelimiters (host, isIP) {
	  const re = isIP ? HOST_DELIM_NO_COLON_RE : HOST_DELIM_RE;
	  re.lastIndex = 0;
	  return host.replace(re, (ch) => HOST_DELIMS[ch])
	}

	/**
	 * Normalizes percent escapes and optionally decodes only unreserved ASCII bytes.
	 * Reserved delimiters such as `%2F` stay escaped; `%2E` is unreserved.
	 *
	 * @param {string} input
	 * @param {boolean} [decodeUnreserved=false]
	 * @returns {string}
	 */
	function normalizePercentEncoding (input, decodeUnreserved = false) {
	  if (input.indexOf('%') === -1) {
	    return input
	  }

	  let output = '';

	  for (let i = 0; i < input.length; i++) {
	    if (input[i] === '%' && i + 2 < input.length) {
	      const hex = input.slice(i + 1, i + 3);
	      if (isHexPair(hex)) {
	        const normalizedHex = hex.toUpperCase();
	        const decoded = String.fromCharCode(parseInt(normalizedHex, 16));

	        if (decodeUnreserved && isUnreserved(decoded)) {
	          output += decoded;
	        } else {
	          output += '%' + normalizedHex;
	        }

	        i += 2;
	        continue
	      }
	    }

	    output += input[i];
	  }

	  return output
	}

	/**
	 * Normalizes path data without turning reserved escapes into live path syntax.
	 * Valid escapes are uppercased, raw unsafe characters are escaped, and only
	 * unreserved bytes that are not `.` are decoded.
	 *
	 * @param {string} input
	 * @returns {string}
	 */
	function normalizePathEncoding (input) {
	  let output = '';

	  for (let i = 0; i < input.length; i++) {
	    const ch = input[i];
	    if (ch === '%' && i + 2 < input.length) {
	      const hex = input.slice(i + 1, i + 3);
	      if (isHexPair(hex)) {
	        const normalizedHex = hex.toUpperCase();
	        const decoded = String.fromCharCode(parseInt(normalizedHex, 16));

	        if (decoded !== '.' && isUnreserved(decoded)) {
	          output += decoded;
	        } else {
	          output += '%' + normalizedHex;
	        }

	        i += 2;
	        continue
	      }
	    }

	    if (isPathCharacter(ch)) {
	      output += ch;
	    } else {
	      const code = input.charCodeAt(i);
	      if (code < 0x80) {
	        output += isEscapeSafe(code) ? ch : BYTE_HEX[code];
	      } else if (code < 0xD800 || code > 0xDFFF) {
	        output += percentEncodeNonAscii(code);
	      } else if (code <= 0xDBFF && i + 1 < input.length) {
	        const low = input.charCodeAt(i + 1);
	        if (low >= 0xDC00 && low <= 0xDFFF) {
	          output += percentEncodeNonAscii(0x10000 + ((code - 0xD800) << 10) + (low - 0xDC00));
	          i++;
	        } else {
	          output += percentEncodeNonAscii(0xFFFD);
	        }
	      } else {
	        output += percentEncodeNonAscii(0xFFFD);
	      }
	    }
	  }

	  return output
	}

	/**
	 * Serializes a path without rewriting reserved data. Raw RFC 3986 path
	 * characters remain literal, valid escapes are preserved and uppercased, and
	 * everything else is UTF-8 percent-encoded. In a path-noscheme, a colon in the
	 * first segment must be escaped so the result cannot be parsed as a scheme.
	 *
	 * @param {string} input
	 * @param {boolean} [pathNoScheme=false]
	 * @returns {string}
	 */
	function serializePathEncoding (input, pathNoScheme = false) {
	  let output = '';
	  let firstSegment = pathNoScheme && input[0] !== '/';

	  for (let i = 0; i < input.length; i++) {
	    const ch = input[i];
	    if (ch === '%' && i + 2 < input.length) {
	      const hex = input.slice(i + 1, i + 3);
	      if (isHexPair(hex)) {
	        output += '%' + hex.toUpperCase();
	        i += 2;
	        continue
	      }
	    }

	    if (ch === '/') {
	      firstSegment = false;
	    }

	    if (isPathCharacter(ch) && (ch !== ':' || !firstSegment)) {
	      output += ch;
	    } else {
	      const code = input.charCodeAt(i);
	      if (code < 0x80) {
	        output += BYTE_HEX[code];
	      } else if (code < 0xD800 || code > 0xDFFF) {
	        output += percentEncodeNonAscii(code);
	      } else if (code <= 0xDBFF && i + 1 < input.length) {
	        const low = input.charCodeAt(i + 1);
	        if (low >= 0xDC00 && low <= 0xDFFF) {
	          output += percentEncodeNonAscii(0x10000 + ((code - 0xD800) << 10) + (low - 0xDC00));
	          i++;
	        } else {
	          output += percentEncodeNonAscii(0xFFFD);
	        }
	      } else {
	        output += percentEncodeNonAscii(0xFFFD);
	      }
	    }
	  }

	  return output
	}

	/**
	 * Percent-encodes a URI component using its RFC 3986 literal character set.
	 * Existing valid escapes are preserved and normalized to uppercase hex.
	 *
	 * @param {string} input
	 * @param {(value: string) => boolean} isAllowed
	 * @returns {string}
	 */
	function encodeComponent (input, isAllowed) {
	  let output = '';

	  for (let i = 0; i < input.length; i++) {
	    const ch = input[i];
	    if (ch === '%' && i + 2 < input.length) {
	      const hex = input.slice(i + 1, i + 3);
	      if (isHexPair(hex)) {
	        output += '%' + hex.toUpperCase();
	        i += 2;
	        continue
	      }
	    }

	    if (isAllowed(ch)) {
	      output += ch;
	    } else {
	      const code = input.charCodeAt(i);
	      if (code < 0x80) {
	        output += BYTE_HEX[code];
	      } else if (code < 0xD800 || code > 0xDFFF) {
	        output += percentEncodeNonAscii(code);
	      } else if (code <= 0xDBFF && i + 1 < input.length) {
	        const low = input.charCodeAt(i + 1);
	        if (low >= 0xDC00 && low <= 0xDFFF) {
	          output += percentEncodeNonAscii(0x10000 + ((code - 0xD800) << 10) + (low - 0xDC00));
	          i++;
	        } else {
	          output += percentEncodeNonAscii(0xFFFD);
	        }
	      } else {
	        output += percentEncodeNonAscii(0xFFFD);
	      }
	    }
	  }

	  return output
	}

	/**
	 * Encodes userinfo while preserving its RFC 3986 §3.2.1 literal characters.
	 * In particular, authority delimiters such as `@`, `/`, `?`, and `#` are data.
	 *
	 * @param {string} input
	 * @returns {string}
	 */
	function encodeUserinfo (input) {
	  return encodeComponent(input, isUserinfoCharacter)
	}

	/**
	 * Encodes query data using the RFC 3986 §3.4 grammar. A literal `#` must be
	 * escaped because it would otherwise begin the fragment component.
	 *
	 * @param {string} input
	 * @returns {string}
	 */
	function encodeQuery (input) {
	  return encodeComponent(input, isQueryFragmentCharacter)
	}

	/**
	 * Encodes fragment data using the RFC 3986 §3.5 grammar.
	 *
	 * @param {string} input
	 * @returns {string}
	 */
	function encodeFragment (input) {
	  return encodeComponent(input, isQueryFragmentCharacter)
	}

	function isEscapeSafe (cp) {
	  return (
	    (cp >= 0x30 && cp <= 0x39) ||
	    (cp >= 0x41 && cp <= 0x5A) ||
	    (cp >= 0x61 && cp <= 0x7A) ||
	    cp === 0x2A || cp === 0x2B || cp === 0x2D || cp === 0x2E ||
	    cp === 0x2F || cp === 0x40 || cp === 0x5F
	  )
	}

	/**
	 * Normalizes the percent-encoding of a query or fragment component.
	 *
	 * Like `normalizePathEncoding`, but uses the query/fragment character set
	 * (which additionally allows `?`) and decodes `.` since it has no dot-segment
	 * meaning outside of a path.
	 *
	 * @param {string} input
	 * @returns {string}
	 */
	function normalizeQueryFragmentEncoding (input) {
	  let output = '';

	  for (let i = 0; i < input.length; i++) {
	    const ch = input[i];
	    if (ch === '%' && i + 2 < input.length) {
	      const hex = input.slice(i + 1, i + 3);
	      if (isHexPair(hex)) {
	        const normalizedHex = hex.toUpperCase();
	        const decoded = String.fromCharCode(parseInt(normalizedHex, 16));

	        if (isUnreserved(decoded)) {
	          output += decoded;
	        } else {
	          output += '%' + normalizedHex;
	        }

	        i += 2;
	        continue
	      }
	    }

	    if (isQueryFragmentCharacter(ch)) {
	      output += ch;
	    } else {
	      const code = input.charCodeAt(i);
	      if (code < 0x80) {
	        output += isEscapeSafe(code) ? ch : BYTE_HEX[code];
	      } else if (code < 0xD800 || code > 0xDFFF) {
	        output += percentEncodeNonAscii(code);
	      } else if (code <= 0xDBFF && i + 1 < input.length) {
	        const low = input.charCodeAt(i + 1);
	        if (low >= 0xDC00 && low <= 0xDFFF) {
	          output += percentEncodeNonAscii(0x10000 + ((code - 0xD800) << 10) + (low - 0xDC00));
	          i++;
	        } else {
	          output += percentEncodeNonAscii(0xFFFD);
	        }
	      } else {
	        output += percentEncodeNonAscii(0xFFFD);
	      }
	    }
	  }

	  return output
	}

	/**
	 * Escapes a component while preserving existing valid percent escapes.
	 *
	 * @param {string} input
	 * @returns {string}
	 */
	function escapePreservingEscapes (input) {
	  let output = '';

	  for (let i = 0; i < input.length; i++) {
	    if (input[i] === '%' && i + 2 < input.length) {
	      const hex = input.slice(i + 1, i + 3);
	      if (isHexPair(hex)) {
	        output += '%' + hex.toUpperCase();
	        i += 2;
	        continue
	      }
	    }

	    output += escape(input[i]);
	  }

	  return output
	}

	/**
	 * @param {import('../types/index').URIComponent} component
	 * @returns {string|undefined}
	 */
	function recomposeAuthority (component) {
	  const uriTokens = [];

	  if (component.userinfo !== undefined) {
	    uriTokens.push(encodeUserinfo(component.userinfo));
	    uriTokens.push('@');
	  }

	  if (component.host !== undefined) {
	    let host = component.host;
	    if (!isIPv4(host)) {
	      let ipV6res = normalizeIPv6(host);
	      if (ipV6res.isIPV6 !== true && ipV6res.isIPVFuture !== true) {
	        // Decode only unreserved bytes, once. In particular, keep %25 encoded
	        // so it cannot introduce a second escape during recomposition.
	        host = normalizePercentEncoding(host, true);
	        ipV6res = normalizeIPv6(host);
	      }
	      if (ipV6res.isIPV6 === true || ipV6res.isIPVFuture === true) {
	        host = `[${ipV6res.escapedHost}]`;
	      } else {
	        host = reescapeHostDelimiters(host, false);
	      }
	    }
	    uriTokens.push(host);
	  }

	  if (typeof component.port === 'number' || typeof component.port === 'string') {
	    const port = String(component.port);
	    if (!isPort(port)) {
	      throw new TypeError('URI port is malformed.')
	    }
	    uriTokens.push(':');
	    uriTokens.push(port);
	  }

	  return uriTokens.length ? uriTokens.join('') : undefined
	}
	utils = {
	  nonSimpleDomain,
	  recomposeAuthority,
	  reescapeHostDelimiters,
	  normalizePercentEncoding,
	  normalizePathEncoding,
	  serializePathEncoding,
	  normalizeQueryFragmentEncoding,
	  encodeUserinfo,
	  encodeQuery,
	  encodeFragment,
	  escapePreservingEscapes,
	  removeDotSegments,
	  isIPv4,
	  isUUID,
	  normalizeIPv6,
	  stringArrayToHexStripped
	};
	return utils;
}

var schemes;
var hasRequiredSchemes;

function requireSchemes () {
	if (hasRequiredSchemes) return schemes;
	hasRequiredSchemes = 1;

	const { isUUID } = /*@__PURE__*/ requireUtils();
	const URN_REG = /^([\da-z][\d\-a-z]{0,31}):((?:[\w!$'()*+,\-./:;=@]|%[\da-f]{2})+)$/iu;

	const supportedSchemeNames = /** @type {const} */ (['http', 'https', 'ws',
	  'wss', 'urn', 'urn:uuid']);

	/** @typedef {supportedSchemeNames[number]} SchemeName */

	/**
	 * @param {string} name
	 * @returns {name is SchemeName}
	 */
	function isValidSchemeName (name) {
	  return supportedSchemeNames.indexOf(/** @type {*} */ (name)) !== -1
	}

	/**
	 * @callback SchemeFn
	 * @param {import('../types/index').URIComponent} component
	 * @param {import('../types/index').Options} options
	 * @returns {import('../types/index').URIComponent}
	 */

	/**
	 * @typedef {Object} SchemeHandler
	 * @property {SchemeName} scheme - The scheme name.
	 * @property {boolean} [domainHost] - Indicates if the scheme supports domain hosts.
	 * @property {SchemeFn} parse - Function to parse the URI component for this scheme.
	 * @property {SchemeFn} serialize - Function to serialize the URI component for this scheme.
	 * @property {boolean} [skipNormalize] - Indicates if normalization should be skipped for this scheme.
	 * @property {boolean} [absolutePath] - Indicates if the scheme uses absolute paths.
	 * @property {boolean} [unicodeSupport] - Indicates if the scheme supports Unicode.
	 */

	/**
	 * @param {import('../types/index').URIComponent} wsComponent
	 * @returns {boolean}
	 */
	function wsIsSecure (wsComponent) {
	  if (wsComponent.secure === true) {
	    return true
	  } else if (wsComponent.secure === false) {
	    return false
	  } else if (wsComponent.scheme) {
	    return (
	      wsComponent.scheme.length === 3 &&
	      (wsComponent.scheme[0] === 'w' || wsComponent.scheme[0] === 'W') &&
	      (wsComponent.scheme[1] === 's' || wsComponent.scheme[1] === 'S') &&
	      (wsComponent.scheme[2] === 's' || wsComponent.scheme[2] === 'S')
	    )
	  } else {
	    return false
	  }
	}

	/** @type {SchemeFn} */
	function httpParse (component) {
	  if (!component.host) {
	    component.error = component.error || 'HTTP URIs must have a host.';
	  }

	  return component
	}

	/** @type {SchemeFn} */
	function httpSerialize (component) {
	  const secure = String(component.scheme).toLowerCase() === 'https';

	  // normalize the default port
	  if (component.port === (secure ? 443 : 80) || component.port === '') {
	    component.port = undefined;
	  }

	  // normalize the empty path
	  if (!component.path) {
	    component.path = '/';
	  }

	  // NOTE: We do not parse query strings for HTTP URIs
	  // as WWW Form Url Encoded query strings are part of the HTML4+ spec,
	  // and not the HTTP spec.

	  return component
	}

	/** @type {SchemeFn} */
	function wsParse (wsComponent) {
	// indicate if the secure flag is set
	  wsComponent.secure = wsIsSecure(wsComponent);

	  // construct resouce name
	  wsComponent.resourceName = (wsComponent.path || '/') + (wsComponent.query ? '?' + wsComponent.query : '');
	  wsComponent.path = undefined;
	  wsComponent.query = undefined;

	  return wsComponent
	}

	/** @type {SchemeFn} */
	function wsSerialize (wsComponent) {
	// normalize the default port
	  if (wsComponent.port === (wsIsSecure(wsComponent) ? 443 : 80) || wsComponent.port === '') {
	    wsComponent.port = undefined;
	  }

	  // ensure scheme matches secure flag
	  if (typeof wsComponent.secure === 'boolean') {
	    wsComponent.scheme = (wsComponent.secure ? 'wss' : 'ws');
	    wsComponent.secure = undefined;
	  }

	  // reconstruct path from resource name
	  if (wsComponent.resourceName) {
	    const queryIndex = wsComponent.resourceName.indexOf('?');
	    const path = queryIndex === -1
	      ? wsComponent.resourceName
	      : wsComponent.resourceName.slice(0, queryIndex);
	    wsComponent.path = (path && path !== '/' ? path : undefined);
	    wsComponent.query = queryIndex === -1
	      ? undefined
	      : wsComponent.resourceName.slice(queryIndex + 1);
	    wsComponent.resourceName = undefined;
	  }

	  // forbid fragment component
	  wsComponent.fragment = undefined;

	  return wsComponent
	}

	/** @type {SchemeFn} */
	function urnParse (urnComponent, options) {
	  if (!urnComponent.path) {
	    urnComponent.error = 'URN can not be parsed';
	    return urnComponent
	  }
	  const matches = urnComponent.path.match(URN_REG);
	  if (matches && matches[0] === urnComponent.path) {
	    const scheme = options.scheme || urnComponent.scheme || 'urn';
	    urnComponent.nid = matches[1].toLowerCase();
	    urnComponent.nss = matches[2];
	    const urnScheme = `${scheme}:${options.nid || urnComponent.nid}`;
	    const schemeHandler = getSchemeHandler(urnScheme);
	    urnComponent.path = undefined;

	    if (schemeHandler) {
	      urnComponent = schemeHandler.parse(urnComponent, options);
	    }
	  } else {
	    urnComponent.error = urnComponent.error || 'URN can not be parsed.';
	  }

	  return urnComponent
	}

	/** @type {SchemeFn} */
	function urnSerialize (urnComponent, options) {
	  if (urnComponent.nid === undefined) {
	    throw new Error('URN without nid cannot be serialized')
	  }
	  const scheme = options.scheme || urnComponent.scheme || 'urn';
	  const nid = urnComponent.nid.toLowerCase();
	  const urnScheme = `${scheme}:${options.nid || nid}`;
	  const schemeHandler = getSchemeHandler(urnScheme);

	  if (schemeHandler) {
	    urnComponent = schemeHandler.serialize(urnComponent, options);
	  }

	  const uriComponent = urnComponent;
	  const nss = urnComponent.nss;
	  uriComponent.path = `${nid || options.nid}:${nss}`;

	  options.skipEscape = true;
	  return uriComponent
	}

	/** @type {SchemeFn} */
	function urnuuidParse (urnComponent, options) {
	  const uuidComponent = urnComponent;
	  uuidComponent.uuid = uuidComponent.nss;
	  uuidComponent.nss = undefined;

	  if (!options.tolerant && (!uuidComponent.uuid || !isUUID(uuidComponent.uuid))) {
	    uuidComponent.error = uuidComponent.error || 'UUID is not valid.';
	  }

	  return uuidComponent
	}

	/** @type {SchemeFn} */
	function urnuuidSerialize (uuidComponent) {
	  const urnComponent = uuidComponent;
	  // normalize UUID
	  urnComponent.nss = (uuidComponent.uuid || '').toLowerCase();
	  return urnComponent
	}

	const http = /** @type {SchemeHandler} */ ({
	  scheme: 'http',
	  domainHost: true,
	  parse: httpParse,
	  serialize: httpSerialize
	});

	const https = /** @type {SchemeHandler} */ ({
	  scheme: 'https',
	  domainHost: http.domainHost,
	  parse: httpParse,
	  serialize: httpSerialize
	});

	const ws = /** @type {SchemeHandler} */ ({
	  scheme: 'ws',
	  domainHost: true,
	  parse: wsParse,
	  serialize: wsSerialize
	});

	const wss = /** @type {SchemeHandler} */ ({
	  scheme: 'wss',
	  domainHost: ws.domainHost,
	  parse: ws.parse,
	  serialize: ws.serialize
	});

	const urn = /** @type {SchemeHandler} */ ({
	  scheme: 'urn',
	  parse: urnParse,
	  serialize: urnSerialize,
	  skipNormalize: true
	});

	const urnuuid = /** @type {SchemeHandler} */ ({
	  scheme: 'urn:uuid',
	  parse: urnuuidParse,
	  serialize: urnuuidSerialize,
	  skipNormalize: true
	});

	const SCHEMES = /** @type {Record<SchemeName, SchemeHandler>} */ ({
	  http,
	  https,
	  ws,
	  wss,
	  urn,
	  'urn:uuid': urnuuid
	});

	Object.setPrototypeOf(SCHEMES, null);

	/**
	 * @param {string|undefined} scheme
	 * @returns {SchemeHandler|undefined}
	 */
	function getSchemeHandler (scheme) {
	  return (
	    scheme && (
	      SCHEMES[/** @type {SchemeName} */ (scheme)] ||
	      SCHEMES[/** @type {SchemeName} */(scheme.toLowerCase())])
	  ) ||
	    undefined
	}

	schemes = {
	  wsIsSecure,
	  SCHEMES,
	  isValidSchemeName,
	  getSchemeHandler,
	};
	return schemes;
}

var hasRequiredFastUri;

function requireFastUri () {
	if (hasRequiredFastUri) return fastUri.exports;
	hasRequiredFastUri = 1;

	const { normalizeIPv6, removeDotSegments, recomposeAuthority, normalizePercentEncoding, normalizePathEncoding, serializePathEncoding, normalizeQueryFragmentEncoding, encodeQuery, encodeFragment, reescapeHostDelimiters, isIPv4, nonSimpleDomain } = /*@__PURE__*/ requireUtils();
	const { SCHEMES, getSchemeHandler } = /*@__PURE__*/ requireSchemes();

	const VALID_SCHEME = /^[A-Za-z][A-Za-z0-9+.-]*$/u;
	const MALFORMED_SCHEME_ERROR = 'URI scheme is malformed.';

	/**
	 * @param {string} scheme
	 * @returns {string}
	 */
	function decodeValidScheme (scheme) {
	  const decodedScheme = unescape(String(scheme));
	  if (!VALID_SCHEME.test(decodedScheme)) {
	    throw new TypeError(MALFORMED_SCHEME_ERROR)
	  }
	  return decodedScheme
	}

	/**
	 * @template {import('./types/index').URIComponent|string} T
	 * @param {T} uri
	 * @param {import('./types/index').Options} [options]
	 * @returns {T}
	 */
	function normalize (uri, options) {
	  if (typeof uri === 'string') {
	    uri = /** @type {T} */ (normalizeString(uri, options));
	  } else if (typeof uri === 'object') {
	    uri = /** @type {T} */ (parse(serialize(uri, options), options));
	  }
	  return uri
	}

	/**
	 * @param {string} baseURI
	 * @param {string} relativeURI
	 * @param {import('./types/index').Options} [options]
	 * @returns {string}
	 */
	function resolve (baseURI, relativeURI, options) {
	  const schemelessOptions = options ? Object.assign({ scheme: 'null' }, options) : { scheme: 'null' };
	  const {
	    parsed: baseParsed,
	    malformedAuthorityOrPort: baseMalformed,
	    malformedPercentEncoding: baseMalformedPercentEncoding,
	    malformedSchemeSpecific: baseMalformedSchemeSpecific,
	    malformedHost: baseMalformedHost,
	    malformedScheme: baseMalformedScheme
	  } = parseWithStatus(baseURI, schemelessOptions);
	  const {
	    parsed: relativeParsed,
	    malformedAuthorityOrPort: relativeMalformed,
	    malformedPercentEncoding: relativeMalformedPercentEncoding,
	    malformedSchemeSpecific: relativeMalformedSchemeSpecific,
	    malformedHost: relativeMalformedHost,
	    malformedScheme: relativeMalformedScheme
	  } = parseWithStatus(relativeURI, schemelessOptions);
	  if (
	    baseMalformed ||
	    relativeMalformed ||
	    baseMalformedPercentEncoding ||
	    relativeMalformedPercentEncoding ||
	    baseMalformedSchemeSpecific ||
	    relativeMalformedSchemeSpecific ||
	    baseMalformedHost ||
	    relativeMalformedHost ||
	    baseMalformedScheme ||
	    relativeMalformedScheme
	  ) {
	    throw new Error(baseParsed.error || relativeParsed.error || 'URI is malformed.')
	  }
	  const resolved = resolveComponent(baseParsed, relativeParsed, schemelessOptions, true);
	  const resolvedSchemeHandler = getSchemeHandler((options && options.scheme) || resolved.scheme);
	  const resolvedHost = resolved.host;
	  const resolvedHostIsIP = resolvedHost !== undefined && resolvedHost !== '' &&
	    (isIPv4(resolvedHost) || normalizeIPv6(resolvedHost).isIPV6);
	  canonicalizeHost(resolved, options || {}, resolvedSchemeHandler, resolvedHostIsIP);
	  // Percent escapes in an ASCII reg-name are encoded data. The WHATWG hostname
	  // parser can reject them even though fast-uri preserves them safely as RFC
	  // 3986 data. A raw non-ASCII host must still fail closed if conversion fails.
	  const encodedASCIIHost = resolvedHost && resolvedHost.indexOf('%') !== -1 &&
	    !/\P{ASCII}/u.test(resolvedHost);
	  if (resolved.error && !encodedASCIIHost) {
	    throw new Error(resolved.error)
	  }
	  schemelessOptions.skipEscape = true;
	  return serialize(resolved, schemelessOptions)
	}

	/**
	 * @param {import ('./types/index').URIComponent} base
	 * @param {import ('./types/index').URIComponent} relative
	 * @param {import('./types/index').Options} [options]
	 * @param {boolean} [skipNormalization=false]
	 * @returns {import ('./types/index').URIComponent}
	 */
	function resolveComponent (base, relative, options, skipNormalization) {
	  /** @type {import('./types/index').URIComponent} */
	  const target = {};
	  if (!skipNormalization) {
	    base = parse(serialize(base, options), options); // normalize base component
	    relative = parse(serialize(relative, options), options); // normalize relative component
	  }
	  options = options || {};

	  if (!options.tolerant && relative.scheme) {
	    target.scheme = relative.scheme;
	    // target.authority = relative.authority;
	    target.userinfo = relative.userinfo;
	    target.host = relative.host;
	    target.port = relative.port;
	    target.path = removeDotSegments(relative.path || '');
	    target.query = relative.query;
	  } else {
	    if (relative.userinfo !== undefined || relative.host !== undefined || relative.port !== undefined) {
	      // target.authority = relative.authority;
	      target.userinfo = relative.userinfo;
	      target.host = relative.host;
	      target.port = relative.port;
	      target.path = removeDotSegments(relative.path || '');
	      target.query = relative.query;
	    } else {
	      if (!relative.path) {
	        target.path = base.path;
	        if (relative.query !== undefined) {
	          target.query = relative.query;
	        } else {
	          target.query = base.query;
	        }
	      } else {
	        if (relative.path[0] === '/') {
	          target.path = removeDotSegments(relative.path);
	        } else {
	          if ((base.userinfo !== undefined || base.host !== undefined || base.port !== undefined) && !base.path) {
	            target.path = '/' + relative.path;
	          } else if (!base.path) {
	            target.path = relative.path;
	          } else {
	            target.path = base.path.slice(0, base.path.lastIndexOf('/') + 1) + relative.path;
	          }
	          target.path = removeDotSegments(target.path);
	        }
	        target.query = relative.query;
	      }
	      // target.authority = base.authority;
	      target.userinfo = base.userinfo;
	      target.host = base.host;
	      target.port = base.port;
	    }
	    target.scheme = base.scheme;
	  }

	  target.fragment = relative.fragment;

	  return target
	}

	/**
	 * @param {import ('./types/index').URIComponent|string} uriA
	 * @param {import ('./types/index').URIComponent|string} uriB
	 * @param {import ('./types/index').Options} options
	 * @returns {boolean}
	 */
	function equal (uriA, uriB, options) {
	  const normalizedA = normalizeComparableURI(uriA, options);
	  const normalizedB = normalizeComparableURI(uriB, options);

	  return normalizedA !== undefined && normalizedB !== undefined && normalizedA === normalizedB
	}

	/**
	 * @param {Readonly<import('./types/index').URIComponent>} cmpts
	 * @param {import('./types/index').Options} [opts]
	 * @returns {string}
	 */
	function serialize (cmpts, opts) {
	  const component = {
	    host: cmpts.host,
	    scheme: cmpts.scheme,
	    userinfo: cmpts.userinfo,
	    port: cmpts.port,
	    path: cmpts.path,
	    query: cmpts.query,
	    nid: cmpts.nid,
	    nss: cmpts.nss,
	    uuid: cmpts.uuid,
	    fragment: cmpts.fragment,
	    reference: cmpts.reference,
	    resourceName: cmpts.resourceName,
	    secure: cmpts.secure,
	    error: ''
	  };
	  const options = Object.assign({}, opts);
	  const uriTokens = [];

	  if (component.scheme) {
	    component.scheme = decodeValidScheme(component.scheme);
	  }

	  // find scheme handler
	  const schemeHandler = getSchemeHandler(options.scheme || component.scheme);

	  // perform scheme specific serialization
	  if (schemeHandler && schemeHandler.serialize) schemeHandler.serialize(component, options);

	  const hasAuthority = component.userinfo !== undefined || component.host !== undefined || component.port !== undefined;
	  const pathNoScheme = !options.skipEscape && component.scheme === undefined && !hasAuthority;

	  if (component.path !== undefined) {
	    if (!options.skipEscape) {
	      component.path = serializePathEncoding(component.path, pathNoScheme);
	    } else {
	      component.path = normalizePercentEncoding(component.path);
	    }
	  }

	  if (options.reference !== 'suffix' && component.scheme) {
	    // Scheme handlers may replace the scheme during serialization.
	    component.scheme = decodeValidScheme(component.scheme);
	    uriTokens.push(component.scheme, ':');
	  }

	  const authority = recomposeAuthority(component);
	  if (authority !== undefined) {
	    if (options.reference !== 'suffix') {
	      uriTokens.push('//');
	    }

	    uriTokens.push(authority);

	    if (component.path && component.path[0] !== '/') {
	      uriTokens.push('/');
	    }
	  }
	  if (component.path !== undefined) {
	    let s = component.path;

	    if (!options.absolutePath && (!schemeHandler || !schemeHandler.absolutePath)) {
	      s = removeDotSegments(s);
	    }

	    // Dot-segment removal can expose a colon that was not originally in the
	    // first segment (for example, "./a:b"). Reapply path-noscheme encoding so
	    // the serialized relative reference cannot be reparsed as a URI scheme.
	    if (pathNoScheme) {
	      s = serializePathEncoding(s, true);
	    }

	    if (
	      authority === undefined &&
	      s[0] === '/' &&
	      s[1] === '/'
	    ) {
	      // don't allow the path to start with "//"
	      s = '/%2F' + s.slice(2);
	    }

	    uriTokens.push(s);
	  }

	  if (component.query !== undefined) {
	    uriTokens.push('?', encodeQuery(component.query));
	  }

	  if (component.fragment !== undefined) {
	    uriTokens.push('#', encodeFragment(component.fragment));
	  }
	  return uriTokens.join('')
	}

	const URI_PARSE = /^(?:([^#/:?]+):)?(?:\/\/((?:([^#/?@]*)@)?(\[[^#/?\]]+\]|[^#/:?]*)(?::(\d*))?))?([^#?]*)(?:\?([^#]*))?(?:#((?:.|[\n\r])*))?/u;

	// Captures the authority component (between "//" and the next "/", "?" or "#"),
	// with or without a scheme prefix, for the literal-backslash rejection below.
	const AUTHORITY_PREFIX = /^(?:[^#/:?]+:)?\/\/([^/?#]*)/;

	// Captures the leading authority-introducer region after an optional scheme: a
	// run of forward slashes, backslashes, and the characters the WHATWG URL parser
	// removes before parsing (TAB U+0009, LF U+000A, CR U+000D). A valid introducer
	// is exactly "//". Node treats "\" as "/" on special schemes and strips those
	// characters first, so forms like "\\", "/\", "\/", "/<TAB>/", or a leading
	// "<TAB>//" reach an authority in Node while fast-uri's URI_PARSE folds them into
	// the path group (host confusion / SSRF / redirect bypass).
	const AUTHORITY_INTRODUCER_REGION = /^(?:[^#/:?]+:)?([/\\\t\n\r]*)/;

	/**
	 * @param {import('./types/index').URIComponent} parsed
	 * @param {RegExpMatchArray} matches
	 * @returns {string|undefined}
	 */
	function getParseError (parsed, matches) {
	  if (matches[2] !== undefined && parsed.path && parsed.path[0] !== '/') {
	    return 'URI path must start with "/" when authority is present.'
	  }

	  if (typeof parsed.port === 'number' && (parsed.port < 0 || parsed.port > 65535)) {
	    return 'URI port is malformed.'
	  }

	  return undefined
	}

	/**
	 * Checks percent syntax without decoding the represented octets. RFC 3986
	 * percent-encoding is byte-oriented, so sequences such as `%FF` are valid even
	 * though they are not independently valid UTF-8.
	 *
	 * @param {string|undefined} component
	 * @returns {boolean}
	 */
	function hasMalformedPercentEncoding (component) {
	  if (component === undefined) return false

	  let percent = component.indexOf('%');
	  while (percent !== -1) {
	    if (percent + 2 >= component.length || !/^[\da-f]{2}$/iu.test(component.slice(percent + 1, percent + 3))) {
	      return true
	    }
	    percent = component.indexOf('%', percent + 3);
	  }

	  return false
	}

	/**
	 * Whether the host is a bracketed IP literal (RFC 3986 `IP-literal`).
	 * An unterminated `[` is not a literal, so it must still be validated as a
	 * reg-name instead of being waved through as an IP.
	 *
	 * @param {string} host
	 * @returns {boolean}
	 */
	function isIPLiteral (host) {
	  return host[0] === '[' && host[host.length - 1] === ']'
	}

	/**
	 * @param {RegExpMatchArray} matches
	 * @returns {boolean}
	 */
	function hasMalformedComponentPercentEncoding (matches) {
	  // Bracketed IP literals use a raw "%" as the zone separator for historical
	  // compatibility. Their parsing is intentionally left to normalizeIPv6.
	  const host = matches[4];
	  return hasMalformedPercentEncoding(matches[3]) ||
	    (host !== undefined && !isIPLiteral(host) && hasMalformedPercentEncoding(host)) ||
	    hasMalformedPercentEncoding(matches[6]) ||
	    hasMalformedPercentEncoding(matches[7]) ||
	    hasMalformedPercentEncoding(matches[8])
	}

	/**
	 * @param {import('./types/index').URIComponent} parsed
	 * @param {import('./types/index').Options} options
	 * @param {{ domainHost?: boolean, unicodeSupport?: boolean }|undefined} schemeHandler
	 * @param {boolean} isIP
	 * @returns {boolean} whether host conversion failed
	 */
	function canonicalizeHost (parsed, options, schemeHandler, isIP) {
	  if (
	    !options.unicodeSupport &&
	    (!schemeHandler || !schemeHandler.unicodeSupport) &&
	    parsed.host &&
	    !isIPLiteral(parsed.host) &&
	    (options.domainHost || (schemeHandler && schemeHandler.domainHost)) &&
	    isIP === false &&
	    nonSimpleDomain(parsed.host)
	  ) {
	    try {
	      parsed.host = new URL('http://' + parsed.host).hostname;
	    } catch (e) {
	      parsed.error = parsed.error || "Host's domain name can not be converted to ASCII: " + e;
	      return true
	    }
	  }
	  return false
	}

	/**
	 * @param {string} uri
	 * @param {import('./types/index').Options} [opts]
	 * @returns {{ parsed: import('./types/index').URIComponent, malformedAuthorityOrPort: boolean, malformedPercentEncoding: boolean, malformedSchemeSpecific: boolean, malformedHost: boolean, malformedScheme: boolean }}
	 */
	function parseWithStatus (uri, opts) {
	  const options = Object.assign({}, opts);
	  /** @type {import('./types/index').URIComponent} */
	  const parsed = {
	    scheme: undefined,
	    userinfo: undefined,
	    host: '',
	    port: undefined,
	    path: '',
	    query: undefined,
	    fragment: undefined
	  };

	  let malformedAuthorityOrPort = false;
	  let malformedPercentEncoding = false;
	  let malformedSchemeSpecific = false;
	  let malformedHost = false;
	  let malformedIPLiteral = false;
	  let malformedScheme = false;

	  let isIP = false;
	  if (options.reference === 'suffix') {
	    if (options.scheme) {
	      uri = options.scheme + ':' + uri;
	    } else {
	      uri = '//' + uri;
	    }
	  }

	  // A literal backslash (U+005C) is not a valid RFC 3986 URI character and is
	  // not an authority delimiter. Reject it in the authority rather than
	  // rewriting it: normalizing "\" -> "/" (WHATWG error recovery) could silently
	  // change the resource identified by an otherwise-invalid input, and lets "\"
	  // act as a host delimiter here while Node's native URL parses a different
	  // host (SSRF / redirect / origin-allowlist bypass). Percent-encoded %5C is
	  // untouched and remains valid encoded data.
	  const authorityMatch = uri.match(AUTHORITY_PREFIX);
	  if (authorityMatch !== null && authorityMatch[1].indexOf('\\') !== -1) {
	    parsed.error = 'URI authority must not contain a literal backslash.';
	    malformedAuthorityOrPort = true;
	  }

	  // Reject a malformed or whitespace-smuggled authority introducer. fast-uri
	  // only recognizes a literal "//"; anything else in the leading separator run
	  // (a backslash, or a "//" that appears only after removing the TAB/LF/CR that
	  // Node strips) means the authority fast-uri parses differs from the one Node's
	  // URL resolves. Reject rather than rewrite, mirroring the literal-backslash
	  // guard above. Percent-encoded forms (%5C, %09) are untouched, valid data.
	  const introducerMatch = uri.match(AUTHORITY_INTRODUCER_REGION);
	  if (introducerMatch !== null) {
	    const region = introducerMatch[1];
	    const normalizedRegion = region.replace(/[\t\n\r]/g, '');
	    // Two or more leading separators introduce an authority.
	    if (normalizedRegion.length >= 2) {
	      if (normalizedRegion.slice(0, 2) !== '//') {
	        parsed.error = parsed.error || 'URI authority must not contain a literal backslash.';
	        malformedAuthorityOrPort = true;
	      } else if (region.length !== normalizedRegion.length) {
	        parsed.error = parsed.error || 'URI authority introducer must not contain whitespace.';
	        malformedAuthorityOrPort = true;
	      }
	    }
	  }

	  const matches = uri.match(URI_PARSE);

	  if (matches) {
	    // store each component
	    parsed.scheme = matches[1];
	    parsed.userinfo = matches[3];
	    parsed.host = matches[4];
	    parsed.port = parseInt(matches[5], 10);
	    parsed.path = matches[6] || '';
	    parsed.query = matches[7];
	    parsed.fragment = matches[8];

	    if (parsed.scheme !== undefined) {
	      const decodedScheme = unescape(parsed.scheme);
	      if (VALID_SCHEME.test(decodedScheme)) {
	        parsed.scheme = decodedScheme.toLowerCase();
	      } else {
	        parsed.error = parsed.error || MALFORMED_SCHEME_ERROR;
	        malformedScheme = true;
	      }
	    }

	    malformedPercentEncoding = hasMalformedComponentPercentEncoding(matches);
	    if (malformedPercentEncoding) {
	      parsed.error = parsed.error || 'URI contains malformed percent-encoding.';
	    }

	    // fix port number
	    if (isNaN(parsed.port)) {
	      parsed.port = matches[5];
	    }

	    const parseError = getParseError(parsed, matches);
	    if (parseError !== undefined) {
	      parsed.error = parsed.error || parseError;
	      malformedAuthorityOrPort = true;
	    }

	    if (parsed.host) {
	      const ipv4result = isIPv4(parsed.host);
	      if (ipv4result === false) {
	        const bracketedIPLiteral = isIPLiteral(parsed.host);
	        const hasIPLiteralBracket = parsed.host.indexOf('[') !== -1 || parsed.host.indexOf(']') !== -1;
	        const ipv6result = normalizeIPv6(parsed.host);
	        isIP = ipv6result.isIPV6 || ipv6result.isIPVFuture === true;
	        malformedIPLiteral = hasIPLiteralBracket && (!bracketedIPLiteral || ipv6result.error === true);
	        parsed.host = isIP ? ipv6result.host : ipv6result.host.toLowerCase();

	        if (malformedIPLiteral) {
	          parsed.error = parsed.error || 'URI host is malformed.';
	          malformedAuthorityOrPort = true;
	        }
	      } else {
	        isIP = true;
	      }
	    }
	    if (parsed.scheme === undefined && parsed.userinfo === undefined && parsed.host === undefined && parsed.port === undefined && parsed.query === undefined && !parsed.path) {
	      parsed.reference = 'same-document';
	    } else if (parsed.scheme === undefined) {
	      parsed.reference = 'relative';
	    } else if (parsed.fragment === undefined) {
	      parsed.reference = 'absolute';
	    } else {
	      parsed.reference = 'uri';
	    }

	    // check for reference errors
	    if (options.reference && options.reference !== 'suffix' && options.reference !== parsed.reference) {
	      parsed.error = parsed.error || 'URI is not a ' + options.reference + ' reference.';
	    }

	    // find scheme handler
	    const schemeHandler = getSchemeHandler(options.scheme || parsed.scheme);

	    // convert Unicode IDN -> ASCII IDN when the effective scheme uses domain hosts
	    if (!malformedIPLiteral) {
	      malformedHost = canonicalizeHost(parsed, options, schemeHandler, isIP);
	    }

	    if (uri.indexOf('%') !== -1 && parsed.host !== undefined && !malformedIPLiteral) {
	      let host = isIP ? parsed.host : normalizePercentEncoding(parsed.host, true);
	      if (!isIP) {
	        // Fold reg-name case after decoding unreserved octets. The second
	        // pass only restores uppercase hex in escapes that remain encoded.
	        host = normalizePercentEncoding(host.toLowerCase());
	      }
	      parsed.host = reescapeHostDelimiters(host, isIP);
	    }

	    if (!schemeHandler || (schemeHandler && !schemeHandler.skipNormalize)) {
	      if (parsed.path) {
	        parsed.path = normalizePathEncoding(parsed.path);
	      }
	      if (parsed.query) {
	        parsed.query = normalizeQueryFragmentEncoding(parsed.query);
	      }
	      if (parsed.fragment) {
	        parsed.fragment = normalizeQueryFragmentEncoding(parsed.fragment);
	      }
	    }

	    // perform scheme specific parsing
	    if (schemeHandler && schemeHandler.parse) {
	      schemeHandler.parse(parsed, options);
	      if (schemeHandler === SCHEMES.urn && parsed.nid === undefined) {
	        malformedSchemeSpecific = true;
	      }
	    }
	  } else {
	    parsed.error = parsed.error || 'URI can not be parsed.';
	  }
	  return { parsed, malformedAuthorityOrPort, malformedPercentEncoding, malformedSchemeSpecific, malformedHost, malformedScheme }
	}

	/**
	 * @param {string} uri
	 * @param {import('./types/index').Options} [opts]
	 * @returns
	 */
	function parse (uri, opts) {
	  return parseWithStatus(uri, opts).parsed
	}

	/**
	 * @param {string} uri
	 * @param {import('./types/index').Options} [opts]
	 * @returns {string}
	 */
	function normalizeString (uri, opts) {
	  return normalizeStringWithStatus(uri, opts).normalized
	}

	/**
	 * @param {string} uri
	 * @param {import('./types/index').Options} [opts]
	 * @returns {{ normalized: string, malformedAuthorityOrPort: boolean, malformedPercentEncoding: boolean, malformedSchemeSpecific: boolean, malformedHost: boolean, malformedScheme: boolean }}
	 */
	function normalizeStringWithStatus (uri, opts) {
	  const { parsed, malformedAuthorityOrPort, malformedPercentEncoding, malformedSchemeSpecific, malformedHost, malformedScheme } = parseWithStatus(uri, opts);
	  return {
	    normalized: malformedAuthorityOrPort || malformedPercentEncoding || malformedSchemeSpecific || malformedHost || malformedScheme ? uri : serialize(parsed, opts),
	    malformedAuthorityOrPort,
	    malformedPercentEncoding,
	    malformedSchemeSpecific,
	    malformedHost,
	    malformedScheme
	  }
	}

	/**
	 * @param {import ('./types/index').URIComponent|string} uri
	 * @param {import('./types/index').Options} [opts]
	 * @returns {string|undefined}
	 */
	function normalizeComparableURI (uri, opts) {
	  if (typeof uri !== 'string' && typeof uri !== 'object') {
	    return undefined
	  }

	  let value;
	  try {
	    value = typeof uri === 'string' ? uri : serialize(uri, opts);
	  } catch {
	    return undefined
	  }
	  const { normalized, malformedAuthorityOrPort, malformedPercentEncoding, malformedSchemeSpecific, malformedHost, malformedScheme } = normalizeStringWithStatus(value, opts);
	  return malformedAuthorityOrPort || malformedPercentEncoding || malformedSchemeSpecific || malformedHost || malformedScheme ? undefined : normalized
	}

	const fastUri$1 = {
	  SCHEMES,
	  normalize,
	  resolve,
	  resolveComponent,
	  equal,
	  serialize,
	  parse
	};

	fastUri.exports = fastUri$1;
	fastUri.exports.default = fastUri$1;
	fastUri.exports.fastUri = fastUri$1;
	return fastUri.exports;
}

var hasRequiredUri;

function requireUri () {
	if (hasRequiredUri) return uri;
	hasRequiredUri = 1;
	Object.defineProperty(uri, "__esModule", { value: true });
	const uri$1 = /*@__PURE__*/ requireFastUri();
	uri$1.code = 'require("ajv/dist/runtime/uri").default';
	uri.default = uri$1;
	
	return uri;
}

var hasRequiredCore$1;

function requireCore$1 () {
	if (hasRequiredCore$1) return core$1;
	hasRequiredCore$1 = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.CodeGen = exports.Name = exports.nil = exports.stringify = exports.str = exports._ = exports.KeywordCxt = void 0;
		var validate_1 = /*@__PURE__*/ requireValidate();
		Object.defineProperty(exports, "KeywordCxt", { enumerable: true, get: function () { return validate_1.KeywordCxt; } });
		var codegen_1 = /*@__PURE__*/ requireCodegen();
		Object.defineProperty(exports, "_", { enumerable: true, get: function () { return codegen_1._; } });
		Object.defineProperty(exports, "str", { enumerable: true, get: function () { return codegen_1.str; } });
		Object.defineProperty(exports, "stringify", { enumerable: true, get: function () { return codegen_1.stringify; } });
		Object.defineProperty(exports, "nil", { enumerable: true, get: function () { return codegen_1.nil; } });
		Object.defineProperty(exports, "Name", { enumerable: true, get: function () { return codegen_1.Name; } });
		Object.defineProperty(exports, "CodeGen", { enumerable: true, get: function () { return codegen_1.CodeGen; } });
		const validation_error_1 = /*@__PURE__*/ requireValidation_error();
		const ref_error_1 = /*@__PURE__*/ requireRef_error();
		const rules_1 = /*@__PURE__*/ requireRules();
		const compile_1 = /*@__PURE__*/ requireCompile();
		const codegen_2 = /*@__PURE__*/ requireCodegen();
		const resolve_1 = /*@__PURE__*/ requireResolve();
		const dataType_1 = /*@__PURE__*/ requireDataType();
		const util_1 = /*@__PURE__*/ requireUtil();
		const $dataRefSchema = require$$9;
		const uri_1 = /*@__PURE__*/ requireUri();
		const defaultRegExp = (str, flags) => new RegExp(str, flags);
		defaultRegExp.code = "new RegExp";
		const META_IGNORE_OPTIONS = ["removeAdditional", "useDefaults", "coerceTypes"];
		const EXT_SCOPE_NAMES = new Set([
		    "validate",
		    "serialize",
		    "parse",
		    "wrapper",
		    "root",
		    "schema",
		    "keyword",
		    "pattern",
		    "formats",
		    "validate$data",
		    "func",
		    "obj",
		    "Error",
		]);
		const removedOptions = {
		    errorDataPath: "",
		    format: "`validateFormats: false` can be used instead.",
		    nullable: '"nullable" keyword is supported by default.',
		    jsonPointers: "Deprecated jsPropertySyntax can be used instead.",
		    extendRefs: "Deprecated ignoreKeywordsWithRef can be used instead.",
		    missingRefs: "Pass empty schema with $id that should be ignored to ajv.addSchema.",
		    processCode: "Use option `code: {process: (code, schemaEnv: object) => string}`",
		    sourceCode: "Use option `code: {source: true}`",
		    strictDefaults: "It is default now, see option `strict`.",
		    strictKeywords: "It is default now, see option `strict`.",
		    uniqueItems: '"uniqueItems" keyword is always validated.',
		    unknownFormats: "Disable strict mode or pass `true` to `ajv.addFormat` (or `formats` option).",
		    cache: "Map is used as cache, schema object as key.",
		    serialize: "Map is used as cache, schema object as key.",
		    ajvErrors: "It is default now.",
		};
		const deprecatedOptions = {
		    ignoreKeywordsWithRef: "",
		    jsPropertySyntax: "",
		    unicode: '"minLength"/"maxLength" account for unicode characters by default.',
		};
		const MAX_EXPRESSION = 200;
		// eslint-disable-next-line complexity
		function requiredOptions(o) {
		    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0;
		    const s = o.strict;
		    const _optz = (_a = o.code) === null || _a === void 0 ? void 0 : _a.optimize;
		    const optimize = _optz === true || _optz === undefined ? 1 : _optz || 0;
		    const regExp = (_c = (_b = o.code) === null || _b === void 0 ? void 0 : _b.regExp) !== null && _c !== void 0 ? _c : defaultRegExp;
		    const uriResolver = (_d = o.uriResolver) !== null && _d !== void 0 ? _d : uri_1.default;
		    return {
		        strictSchema: (_f = (_e = o.strictSchema) !== null && _e !== void 0 ? _e : s) !== null && _f !== void 0 ? _f : true,
		        strictNumbers: (_h = (_g = o.strictNumbers) !== null && _g !== void 0 ? _g : s) !== null && _h !== void 0 ? _h : true,
		        strictTypes: (_k = (_j = o.strictTypes) !== null && _j !== void 0 ? _j : s) !== null && _k !== void 0 ? _k : "log",
		        strictTuples: (_m = (_l = o.strictTuples) !== null && _l !== void 0 ? _l : s) !== null && _m !== void 0 ? _m : "log",
		        strictRequired: (_p = (_o = o.strictRequired) !== null && _o !== void 0 ? _o : s) !== null && _p !== void 0 ? _p : false,
		        code: o.code ? { ...o.code, optimize, regExp } : { optimize, regExp },
		        loopRequired: (_q = o.loopRequired) !== null && _q !== void 0 ? _q : MAX_EXPRESSION,
		        loopEnum: (_r = o.loopEnum) !== null && _r !== void 0 ? _r : MAX_EXPRESSION,
		        meta: (_s = o.meta) !== null && _s !== void 0 ? _s : true,
		        messages: (_t = o.messages) !== null && _t !== void 0 ? _t : true,
		        inlineRefs: (_u = o.inlineRefs) !== null && _u !== void 0 ? _u : true,
		        schemaId: (_v = o.schemaId) !== null && _v !== void 0 ? _v : "$id",
		        addUsedSchema: (_w = o.addUsedSchema) !== null && _w !== void 0 ? _w : true,
		        validateSchema: (_x = o.validateSchema) !== null && _x !== void 0 ? _x : true,
		        validateFormats: (_y = o.validateFormats) !== null && _y !== void 0 ? _y : true,
		        unicodeRegExp: (_z = o.unicodeRegExp) !== null && _z !== void 0 ? _z : true,
		        int32range: (_0 = o.int32range) !== null && _0 !== void 0 ? _0 : true,
		        uriResolver: uriResolver,
		    };
		}
		class Ajv {
		    constructor(opts = {}) {
		        this.schemas = {};
		        this.refs = {};
		        this.formats = Object.create(null);
		        this._compilations = new Set();
		        this._loading = {};
		        this._cache = new Map();
		        opts = this.opts = { ...opts, ...requiredOptions(opts) };
		        const { es5, lines } = this.opts.code;
		        this.scope = new codegen_2.ValueScope({ scope: {}, prefixes: EXT_SCOPE_NAMES, es5, lines });
		        this.logger = getLogger(opts.logger);
		        const formatOpt = opts.validateFormats;
		        opts.validateFormats = false;
		        this.RULES = (0, rules_1.getRules)();
		        checkOptions.call(this, removedOptions, opts, "NOT SUPPORTED");
		        checkOptions.call(this, deprecatedOptions, opts, "DEPRECATED", "warn");
		        this._metaOpts = getMetaSchemaOptions.call(this);
		        if (opts.formats)
		            addInitialFormats.call(this);
		        this._addVocabularies();
		        this._addDefaultMetaSchema();
		        if (opts.keywords)
		            addInitialKeywords.call(this, opts.keywords);
		        if (typeof opts.meta == "object")
		            this.addMetaSchema(opts.meta);
		        addInitialSchemas.call(this);
		        opts.validateFormats = formatOpt;
		    }
		    _addVocabularies() {
		        this.addKeyword("$async");
		    }
		    _addDefaultMetaSchema() {
		        const { $data, meta, schemaId } = this.opts;
		        let _dataRefSchema = $dataRefSchema;
		        if (schemaId === "id") {
		            _dataRefSchema = { ...$dataRefSchema };
		            _dataRefSchema.id = _dataRefSchema.$id;
		            delete _dataRefSchema.$id;
		        }
		        if (meta && $data)
		            this.addMetaSchema(_dataRefSchema, _dataRefSchema[schemaId], false);
		    }
		    defaultMeta() {
		        const { meta, schemaId } = this.opts;
		        return (this.opts.defaultMeta = typeof meta == "object" ? meta[schemaId] || meta : undefined);
		    }
		    validate(schemaKeyRef, // key, ref or schema object
		    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
		    data // to be validated
		    ) {
		        let v;
		        if (typeof schemaKeyRef == "string") {
		            v = this.getSchema(schemaKeyRef);
		            if (!v)
		                throw new Error(`no schema with key or ref "${schemaKeyRef}"`);
		        }
		        else {
		            v = this.compile(schemaKeyRef);
		        }
		        const valid = v(data);
		        if (!("$async" in v))
		            this.errors = v.errors;
		        return valid;
		    }
		    compile(schema, _meta) {
		        const sch = this._addSchema(schema, _meta);
		        return (sch.validate || this._compileSchemaEnv(sch));
		    }
		    compileAsync(schema, meta) {
		        if (typeof this.opts.loadSchema != "function") {
		            throw new Error("options.loadSchema should be a function");
		        }
		        const { loadSchema } = this.opts;
		        return runCompileAsync.call(this, schema, meta);
		        async function runCompileAsync(_schema, _meta) {
		            await loadMetaSchema.call(this, _schema.$schema);
		            const sch = this._addSchema(_schema, _meta);
		            return sch.validate || _compileAsync.call(this, sch);
		        }
		        async function loadMetaSchema($ref) {
		            if ($ref && !this.getSchema($ref)) {
		                await runCompileAsync.call(this, { $ref }, true);
		            }
		        }
		        async function _compileAsync(sch) {
		            try {
		                return this._compileSchemaEnv(sch);
		            }
		            catch (e) {
		                if (!(e instanceof ref_error_1.default))
		                    throw e;
		                checkLoaded.call(this, e);
		                await loadMissingSchema.call(this, e.missingSchema);
		                return _compileAsync.call(this, sch);
		            }
		        }
		        function checkLoaded({ missingSchema: ref, missingRef }) {
		            if (this.refs[ref]) {
		                throw new Error(`AnySchema ${ref} is loaded but ${missingRef} cannot be resolved`);
		            }
		        }
		        async function loadMissingSchema(ref) {
		            const _schema = await _loadSchema.call(this, ref);
		            if (!this.refs[ref])
		                await loadMetaSchema.call(this, _schema.$schema);
		            if (!this.refs[ref])
		                this.addSchema(_schema, ref, meta);
		        }
		        async function _loadSchema(ref) {
		            const p = this._loading[ref];
		            if (p)
		                return p;
		            try {
		                return await (this._loading[ref] = loadSchema(ref));
		            }
		            finally {
		                delete this._loading[ref];
		            }
		        }
		    }
		    // Adds schema to the instance
		    addSchema(schema, // If array is passed, `key` will be ignored
		    key, // Optional schema key. Can be passed to `validate` method instead of schema object or id/ref. One schema per instance can have empty `id` and `key`.
		    _meta, // true if schema is a meta-schema. Used internally, addMetaSchema should be used instead.
		    _validateSchema = this.opts.validateSchema // false to skip schema validation. Used internally, option validateSchema should be used instead.
		    ) {
		        if (Array.isArray(schema)) {
		            for (const sch of schema)
		                this.addSchema(sch, undefined, _meta, _validateSchema);
		            return this;
		        }
		        let id;
		        if (typeof schema === "object") {
		            const { schemaId } = this.opts;
		            id = schema[schemaId];
		            if (id !== undefined && typeof id != "string") {
		                throw new Error(`schema ${schemaId} must be string`);
		            }
		        }
		        key = (0, resolve_1.normalizeId)(key || id);
		        this._checkUnique(key);
		        this.schemas[key] = this._addSchema(schema, _meta, key, _validateSchema, true);
		        return this;
		    }
		    // Add schema that will be used to validate other schemas
		    // options in META_IGNORE_OPTIONS are alway set to false
		    addMetaSchema(schema, key, // schema key
		    _validateSchema = this.opts.validateSchema // false to skip schema validation, can be used to override validateSchema option for meta-schema
		    ) {
		        this.addSchema(schema, key, true, _validateSchema);
		        return this;
		    }
		    //  Validate schema against its meta-schema
		    validateSchema(schema, throwOrLogError) {
		        if (typeof schema == "boolean")
		            return true;
		        let $schema;
		        $schema = schema.$schema;
		        if ($schema !== undefined && typeof $schema != "string") {
		            throw new Error("$schema must be a string");
		        }
		        $schema = $schema || this.opts.defaultMeta || this.defaultMeta();
		        if (!$schema) {
		            this.logger.warn("meta-schema not available");
		            this.errors = null;
		            return true;
		        }
		        const valid = this.validate($schema, schema);
		        if (!valid && throwOrLogError) {
		            const message = "schema is invalid: " + this.errorsText();
		            if (this.opts.validateSchema === "log")
		                this.logger.error(message);
		            else
		                throw new Error(message);
		        }
		        return valid;
		    }
		    // Get compiled schema by `key` or `ref`.
		    // (`key` that was passed to `addSchema` or full schema reference - `schema.$id` or resolved id)
		    getSchema(keyRef) {
		        let sch;
		        while (typeof (sch = getSchEnv.call(this, keyRef)) == "string")
		            keyRef = sch;
		        if (sch === undefined) {
		            const { schemaId } = this.opts;
		            const root = new compile_1.SchemaEnv({ schema: {}, schemaId });
		            sch = compile_1.resolveSchema.call(this, root, keyRef);
		            if (!sch)
		                return;
		            this.refs[keyRef] = sch;
		        }
		        return (sch.validate || this._compileSchemaEnv(sch));
		    }
		    // Remove cached schema(s).
		    // If no parameter is passed all schemas but meta-schemas are removed.
		    // If RegExp is passed all schemas with key/id matching pattern but meta-schemas are removed.
		    // Even if schema is referenced by other schemas it still can be removed as other schemas have local references.
		    removeSchema(schemaKeyRef) {
		        if (schemaKeyRef instanceof RegExp) {
		            this._removeAllSchemas(this.schemas, schemaKeyRef);
		            this._removeAllSchemas(this.refs, schemaKeyRef);
		            return this;
		        }
		        switch (typeof schemaKeyRef) {
		            case "undefined":
		                this._removeAllSchemas(this.schemas);
		                this._removeAllSchemas(this.refs);
		                this._cache.clear();
		                return this;
		            case "string": {
		                const sch = getSchEnv.call(this, schemaKeyRef);
		                if (typeof sch == "object")
		                    this._cache.delete(sch.schema);
		                delete this.schemas[schemaKeyRef];
		                delete this.refs[schemaKeyRef];
		                return this;
		            }
		            case "object": {
		                const cacheKey = schemaKeyRef;
		                this._cache.delete(cacheKey);
		                let id = schemaKeyRef[this.opts.schemaId];
		                if (id) {
		                    id = (0, resolve_1.normalizeId)(id);
		                    delete this.schemas[id];
		                    delete this.refs[id];
		                }
		                return this;
		            }
		            default:
		                throw new Error("ajv.removeSchema: invalid parameter");
		        }
		    }
		    // add "vocabulary" - a collection of keywords
		    addVocabulary(definitions) {
		        for (const def of definitions)
		            this.addKeyword(def);
		        return this;
		    }
		    addKeyword(kwdOrDef, def // deprecated
		    ) {
		        let keyword;
		        if (typeof kwdOrDef == "string") {
		            keyword = kwdOrDef;
		            if (typeof def == "object") {
		                this.logger.warn("these parameters are deprecated, see docs for addKeyword");
		                def.keyword = keyword;
		            }
		        }
		        else if (typeof kwdOrDef == "object" && def === undefined) {
		            def = kwdOrDef;
		            keyword = def.keyword;
		            if (Array.isArray(keyword) && !keyword.length) {
		                throw new Error("addKeywords: keyword must be string or non-empty array");
		            }
		        }
		        else {
		            throw new Error("invalid addKeywords parameters");
		        }
		        checkKeyword.call(this, keyword, def);
		        if (!def) {
		            (0, util_1.eachItem)(keyword, (kwd) => addRule.call(this, kwd));
		            return this;
		        }
		        keywordMetaschema.call(this, def);
		        const definition = {
		            ...def,
		            type: (0, dataType_1.getJSONTypes)(def.type),
		            schemaType: (0, dataType_1.getJSONTypes)(def.schemaType),
		        };
		        (0, util_1.eachItem)(keyword, definition.type.length === 0
		            ? (k) => addRule.call(this, k, definition)
		            : (k) => definition.type.forEach((t) => addRule.call(this, k, definition, t)));
		        return this;
		    }
		    getKeyword(keyword) {
		        const rule = this.RULES.all[keyword];
		        return typeof rule == "object" ? rule.definition : !!rule;
		    }
		    // Remove keyword
		    removeKeyword(keyword) {
		        // TODO return type should be Ajv
		        const { RULES } = this;
		        delete RULES.keywords[keyword];
		        delete RULES.all[keyword];
		        for (const group of RULES.rules) {
		            const i = group.rules.findIndex((rule) => rule.keyword === keyword);
		            if (i >= 0)
		                group.rules.splice(i, 1);
		        }
		        return this;
		    }
		    // Add format
		    addFormat(name, format) {
		        if (typeof format == "string")
		            format = new RegExp(format);
		        this.formats[name] = format;
		        return this;
		    }
		    errorsText(errors = this.errors, // optional array of validation errors
		    { separator = ", ", dataVar = "data" } = {} // optional options with properties `separator` and `dataVar`
		    ) {
		        if (!errors || errors.length === 0)
		            return "No errors";
		        return errors
		            .map((e) => `${dataVar}${e.instancePath} ${e.message}`)
		            .reduce((text, msg) => text + separator + msg);
		    }
		    $dataMetaSchema(metaSchema, keywordsJsonPointers) {
		        const rules = this.RULES.all;
		        metaSchema = JSON.parse(JSON.stringify(metaSchema));
		        for (const jsonPointer of keywordsJsonPointers) {
		            const segments = jsonPointer.split("/").slice(1); // first segment is an empty string
		            let keywords = metaSchema;
		            for (const seg of segments)
		                keywords = keywords[seg];
		            for (const key in rules) {
		                const rule = rules[key];
		                if (typeof rule != "object")
		                    continue;
		                const { $data } = rule.definition;
		                const schema = keywords[key];
		                if ($data && schema)
		                    keywords[key] = schemaOrData(schema);
		            }
		        }
		        return metaSchema;
		    }
		    _removeAllSchemas(schemas, regex) {
		        for (const keyRef in schemas) {
		            const sch = schemas[keyRef];
		            if (!regex || regex.test(keyRef)) {
		                if (typeof sch == "string") {
		                    delete schemas[keyRef];
		                }
		                else if (sch && !sch.meta) {
		                    this._cache.delete(sch.schema);
		                    delete schemas[keyRef];
		                }
		            }
		        }
		    }
		    _addSchema(schema, meta, baseId, validateSchema = this.opts.validateSchema, addSchema = this.opts.addUsedSchema) {
		        let id;
		        const { schemaId } = this.opts;
		        if (typeof schema == "object") {
		            id = schema[schemaId];
		        }
		        else {
		            if (this.opts.jtd)
		                throw new Error("schema must be object");
		            else if (typeof schema != "boolean")
		                throw new Error("schema must be object or boolean");
		        }
		        let sch = this._cache.get(schema);
		        if (sch !== undefined)
		            return sch;
		        baseId = (0, resolve_1.normalizeId)(id || baseId);
		        const localRefs = resolve_1.getSchemaRefs.call(this, schema, baseId);
		        sch = new compile_1.SchemaEnv({ schema, schemaId, meta, baseId, localRefs });
		        this._cache.set(sch.schema, sch);
		        if (addSchema && !baseId.startsWith("#")) {
		            // TODO atm it is allowed to overwrite schemas without id (instead of not adding them)
		            if (baseId)
		                this._checkUnique(baseId);
		            this.refs[baseId] = sch;
		        }
		        if (validateSchema)
		            this.validateSchema(schema, true);
		        return sch;
		    }
		    _checkUnique(id) {
		        if (this.schemas[id] || this.refs[id]) {
		            throw new Error(`schema with key or id "${id}" already exists`);
		        }
		    }
		    _compileSchemaEnv(sch) {
		        if (sch.meta)
		            this._compileMetaSchema(sch);
		        else
		            compile_1.compileSchema.call(this, sch);
		        /* istanbul ignore if */
		        if (!sch.validate)
		            throw new Error("ajv implementation error");
		        return sch.validate;
		    }
		    _compileMetaSchema(sch) {
		        const currentOpts = this.opts;
		        this.opts = this._metaOpts;
		        try {
		            compile_1.compileSchema.call(this, sch);
		        }
		        finally {
		            this.opts = currentOpts;
		        }
		    }
		}
		Ajv.ValidationError = validation_error_1.default;
		Ajv.MissingRefError = ref_error_1.default;
		exports.default = Ajv;
		function checkOptions(checkOpts, options, msg, log = "error") {
		    for (const key in checkOpts) {
		        const opt = key;
		        if (opt in options)
		            this.logger[log](`${msg}: option ${key}. ${checkOpts[opt]}`);
		    }
		}
		function getSchEnv(keyRef) {
		    keyRef = (0, resolve_1.normalizeId)(keyRef); // TODO tests fail without this line
		    return this.schemas[keyRef] || this.refs[keyRef];
		}
		function addInitialSchemas() {
		    const optsSchemas = this.opts.schemas;
		    if (!optsSchemas)
		        return;
		    if (Array.isArray(optsSchemas))
		        this.addSchema(optsSchemas);
		    else
		        for (const key in optsSchemas)
		            this.addSchema(optsSchemas[key], key);
		}
		function addInitialFormats() {
		    for (const name in this.opts.formats) {
		        const format = this.opts.formats[name];
		        if (format)
		            this.addFormat(name, format);
		    }
		}
		function addInitialKeywords(defs) {
		    if (Array.isArray(defs)) {
		        this.addVocabulary(defs);
		        return;
		    }
		    this.logger.warn("keywords option as map is deprecated, pass array");
		    for (const keyword in defs) {
		        const def = defs[keyword];
		        if (!def.keyword)
		            def.keyword = keyword;
		        this.addKeyword(def);
		    }
		}
		function getMetaSchemaOptions() {
		    const metaOpts = { ...this.opts };
		    for (const opt of META_IGNORE_OPTIONS)
		        delete metaOpts[opt];
		    return metaOpts;
		}
		const noLogs = { log() { }, warn() { }, error() { } };
		function getLogger(logger) {
		    if (logger === false)
		        return noLogs;
		    if (logger === undefined)
		        return console;
		    if (logger.log && logger.warn && logger.error)
		        return logger;
		    throw new Error("logger must implement log, warn and error methods");
		}
		const KEYWORD_NAME = /^[a-z_$][a-z0-9_$:-]*$/i;
		function checkKeyword(keyword, def) {
		    const { RULES } = this;
		    (0, util_1.eachItem)(keyword, (kwd) => {
		        if (RULES.keywords[kwd])
		            throw new Error(`Keyword ${kwd} is already defined`);
		        if (!KEYWORD_NAME.test(kwd))
		            throw new Error(`Keyword ${kwd} has invalid name`);
		    });
		    if (!def)
		        return;
		    if (def.$data && !("code" in def || "validate" in def)) {
		        throw new Error('$data keyword must have "code" or "validate" function');
		    }
		}
		function addRule(keyword, definition, dataType) {
		    var _a;
		    const post = definition === null || definition === void 0 ? void 0 : definition.post;
		    if (dataType && post)
		        throw new Error('keyword with "post" flag cannot have "type"');
		    const { RULES } = this;
		    let ruleGroup = post ? RULES.post : RULES.rules.find(({ type: t }) => t === dataType);
		    if (!ruleGroup) {
		        ruleGroup = { type: dataType, rules: [] };
		        RULES.rules.push(ruleGroup);
		    }
		    RULES.keywords[keyword] = true;
		    if (!definition)
		        return;
		    const rule = {
		        keyword,
		        definition: {
		            ...definition,
		            type: (0, dataType_1.getJSONTypes)(definition.type),
		            schemaType: (0, dataType_1.getJSONTypes)(definition.schemaType),
		        },
		    };
		    if (definition.before)
		        addBeforeRule.call(this, ruleGroup, rule, definition.before);
		    else
		        ruleGroup.rules.push(rule);
		    RULES.all[keyword] = rule;
		    (_a = definition.implements) === null || _a === void 0 ? void 0 : _a.forEach((kwd) => this.addKeyword(kwd));
		}
		function addBeforeRule(ruleGroup, rule, before) {
		    const i = ruleGroup.rules.findIndex((_rule) => _rule.keyword === before);
		    if (i >= 0) {
		        ruleGroup.rules.splice(i, 0, rule);
		    }
		    else {
		        ruleGroup.rules.push(rule);
		        this.logger.warn(`rule ${before} is not defined`);
		    }
		}
		function keywordMetaschema(def) {
		    let { metaSchema } = def;
		    if (metaSchema === undefined)
		        return;
		    if (def.$data && this.opts.$data)
		        metaSchema = schemaOrData(metaSchema);
		    def.validateSchema = this.compile(metaSchema, true);
		}
		const $dataRef = {
		    $ref: "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#",
		};
		function schemaOrData(schema) {
		    return { anyOf: [schema, $dataRef] };
		}
		
	} (core$1));
	return core$1;
}

var draft2020 = {};

var core = {};

var id = {};

var hasRequiredId;

function requireId () {
	if (hasRequiredId) return id;
	hasRequiredId = 1;
	Object.defineProperty(id, "__esModule", { value: true });
	const def = {
	    keyword: "id",
	    code() {
	        throw new Error('NOT SUPPORTED: keyword "id", use "$id" for schema ID');
	    },
	};
	id.default = def;
	
	return id;
}

var ref = {};

var hasRequiredRef;

function requireRef () {
	if (hasRequiredRef) return ref;
	hasRequiredRef = 1;
	Object.defineProperty(ref, "__esModule", { value: true });
	ref.callRef = ref.getValidate = void 0;
	const ref_error_1 = /*@__PURE__*/ requireRef_error();
	const code_1 = /*@__PURE__*/ requireCode();
	const codegen_1 = /*@__PURE__*/ requireCodegen();
	const names_1 = /*@__PURE__*/ requireNames();
	const compile_1 = /*@__PURE__*/ requireCompile();
	const util_1 = /*@__PURE__*/ requireUtil();
	const def = {
	    keyword: "$ref",
	    schemaType: "string",
	    code(cxt) {
	        const { gen, schema: $ref, it } = cxt;
	        const { baseId, schemaEnv: env, validateName, opts, self } = it;
	        const { root } = env;
	        if (($ref === "#" || $ref === "#/") && baseId === root.baseId)
	            return callRootRef();
	        const schOrEnv = compile_1.resolveRef.call(self, root, baseId, $ref);
	        if (schOrEnv === undefined)
	            throw new ref_error_1.default(it.opts.uriResolver, baseId, $ref);
	        if (schOrEnv instanceof compile_1.SchemaEnv)
	            return callValidate(schOrEnv);
	        return inlineRefSchema(schOrEnv);
	        function callRootRef() {
	            if (env === root)
	                return callRef(cxt, validateName, env, env.$async);
	            const rootName = gen.scopeValue("root", { ref: root });
	            return callRef(cxt, (0, codegen_1._) `${rootName}.validate`, root, root.$async);
	        }
	        function callValidate(sch) {
	            const v = getValidate(cxt, sch);
	            callRef(cxt, v, sch, sch.$async);
	        }
	        function inlineRefSchema(sch) {
	            const schName = gen.scopeValue("schema", opts.code.source === true ? { ref: sch, code: (0, codegen_1.stringify)(sch) } : { ref: sch });
	            const valid = gen.name("valid");
	            const schCxt = cxt.subschema({
	                schema: sch,
	                dataTypes: [],
	                schemaPath: codegen_1.nil,
	                topSchemaRef: schName,
	                errSchemaPath: $ref,
	            }, valid);
	            cxt.mergeEvaluated(schCxt);
	            cxt.ok(valid);
	        }
	    },
	};
	function getValidate(cxt, sch) {
	    const { gen } = cxt;
	    return sch.validate
	        ? gen.scopeValue("validate", { ref: sch.validate })
	        : (0, codegen_1._) `${gen.scopeValue("wrapper", { ref: sch })}.validate`;
	}
	ref.getValidate = getValidate;
	function callRef(cxt, v, sch, $async) {
	    const { gen, it } = cxt;
	    const { allErrors, schemaEnv: env, opts } = it;
	    const passCxt = opts.passContext ? names_1.default.this : codegen_1.nil;
	    if ($async)
	        callAsyncRef();
	    else
	        callSyncRef();
	    function callAsyncRef() {
	        if (!env.$async)
	            throw new Error("async schema referenced by sync schema");
	        const valid = gen.let("valid");
	        gen.try(() => {
	            gen.code((0, codegen_1._) `await ${(0, code_1.callValidateCode)(cxt, v, passCxt)}`);
	            addEvaluatedFrom(v); // TODO will not work with async, it has to be returned with the result
	            if (!allErrors)
	                gen.assign(valid, true);
	        }, (e) => {
	            gen.if((0, codegen_1._) `!(${e} instanceof ${it.ValidationError})`, () => gen.throw(e));
	            addErrorsFrom(e);
	            if (!allErrors)
	                gen.assign(valid, false);
	        });
	        cxt.ok(valid);
	    }
	    function callSyncRef() {
	        cxt.result((0, code_1.callValidateCode)(cxt, v, passCxt), () => addEvaluatedFrom(v), () => addErrorsFrom(v));
	    }
	    function addErrorsFrom(source) {
	        const errs = (0, codegen_1._) `${source}.errors`;
	        gen.assign(names_1.default.vErrors, (0, codegen_1._) `${names_1.default.vErrors} === null ? ${errs} : ${names_1.default.vErrors}.concat(${errs})`); // TODO tagged
	        gen.assign(names_1.default.errors, (0, codegen_1._) `${names_1.default.vErrors}.length`);
	    }
	    function addEvaluatedFrom(source) {
	        var _a;
	        if (!it.opts.unevaluated)
	            return;
	        const schEvaluated = (_a = sch === null || sch === void 0 ? void 0 : sch.validate) === null || _a === void 0 ? void 0 : _a.evaluated;
	        // TODO refactor
	        if (it.props !== true) {
	            if (schEvaluated && !schEvaluated.dynamicProps) {
	                if (schEvaluated.props !== undefined) {
	                    it.props = util_1.mergeEvaluated.props(gen, schEvaluated.props, it.props);
	                }
	            }
	            else {
	                const props = gen.var("props", (0, codegen_1._) `${source}.evaluated.props`);
	                it.props = util_1.mergeEvaluated.props(gen, props, it.props, codegen_1.Name);
	            }
	        }
	        if (it.items !== true) {
	            if (schEvaluated && !schEvaluated.dynamicItems) {
	                if (schEvaluated.items !== undefined) {
	                    it.items = util_1.mergeEvaluated.items(gen, schEvaluated.items, it.items);
	                }
	            }
	            else {
	                const items = gen.var("items", (0, codegen_1._) `${source}.evaluated.items`);
	                it.items = util_1.mergeEvaluated.items(gen, items, it.items, codegen_1.Name);
	            }
	        }
	    }
	}
	ref.callRef = callRef;
	ref.default = def;
	
	return ref;
}

var hasRequiredCore;

function requireCore () {
	if (hasRequiredCore) return core;
	hasRequiredCore = 1;
	Object.defineProperty(core, "__esModule", { value: true });
	const id_1 = /*@__PURE__*/ requireId();
	const ref_1 = /*@__PURE__*/ requireRef();
	const core$1 = [
	    "$schema",
	    "$id",
	    "$defs",
	    "$vocabulary",
	    { keyword: "$comment" },
	    "definitions",
	    id_1.default,
	    ref_1.default,
	];
	core.default = core$1;
	
	return core;
}

var validation = {};

var limitNumber = {};

var hasRequiredLimitNumber;

function requireLimitNumber () {
	if (hasRequiredLimitNumber) return limitNumber;
	hasRequiredLimitNumber = 1;
	Object.defineProperty(limitNumber, "__esModule", { value: true });
	const codegen_1 = /*@__PURE__*/ requireCodegen();
	const ops = codegen_1.operators;
	const KWDs = {
	    maximum: { okStr: "<=", ok: ops.LTE, fail: ops.GT },
	    minimum: { okStr: ">=", ok: ops.GTE, fail: ops.LT },
	    exclusiveMaximum: { okStr: "<", ok: ops.LT, fail: ops.GTE },
	    exclusiveMinimum: { okStr: ">", ok: ops.GT, fail: ops.LTE },
	};
	const error = {
	    message: ({ keyword, schemaCode }) => (0, codegen_1.str) `must be ${KWDs[keyword].okStr} ${schemaCode}`,
	    params: ({ keyword, schemaCode }) => (0, codegen_1._) `{comparison: ${KWDs[keyword].okStr}, limit: ${schemaCode}}`,
	};
	const def = {
	    keyword: Object.keys(KWDs),
	    type: "number",
	    schemaType: "number",
	    $data: true,
	    error,
	    code(cxt) {
	        const { keyword, data, schemaCode } = cxt;
	        cxt.fail$data((0, codegen_1._) `${data} ${KWDs[keyword].fail} ${schemaCode} || isNaN(${data})`);
	    },
	};
	limitNumber.default = def;
	
	return limitNumber;
}

var multipleOf = {};

var hasRequiredMultipleOf;

function requireMultipleOf () {
	if (hasRequiredMultipleOf) return multipleOf;
	hasRequiredMultipleOf = 1;
	Object.defineProperty(multipleOf, "__esModule", { value: true });
	const codegen_1 = /*@__PURE__*/ requireCodegen();
	const error = {
	    message: ({ schemaCode }) => (0, codegen_1.str) `must be multiple of ${schemaCode}`,
	    params: ({ schemaCode }) => (0, codegen_1._) `{multipleOf: ${schemaCode}}`,
	};
	const def = {
	    keyword: "multipleOf",
	    type: "number",
	    schemaType: "number",
	    $data: true,
	    error,
	    code(cxt) {
	        const { gen, data, schemaCode, it } = cxt;
	        // const bdt = bad$DataType(schemaCode, <string>def.schemaType, $data)
	        const prec = it.opts.multipleOfPrecision;
	        const res = gen.let("res");
	        const invalid = prec
	            ? (0, codegen_1._) `Math.abs(Math.round(${res}) - ${res}) > 1e-${prec}`
	            : (0, codegen_1._) `${res} !== parseInt(${res})`;
	        cxt.fail$data((0, codegen_1._) `(${schemaCode} === 0 || (${res} = ${data}/${schemaCode}, ${invalid}))`);
	    },
	};
	multipleOf.default = def;
	
	return multipleOf;
}

var limitLength = {};

var ucs2length = {};

var hasRequiredUcs2length;

function requireUcs2length () {
	if (hasRequiredUcs2length) return ucs2length;
	hasRequiredUcs2length = 1;
	Object.defineProperty(ucs2length, "__esModule", { value: true });
	// https://mathiasbynens.be/notes/javascript-encoding
	// https://github.com/bestiejs/punycode.js - punycode.ucs2.decode
	function ucs2length$1(str) {
	    const len = str.length;
	    let length = 0;
	    let pos = 0;
	    let value;
	    while (pos < len) {
	        length++;
	        value = str.charCodeAt(pos++);
	        if (value >= 0xd800 && value <= 0xdbff && pos < len) {
	            // high surrogate, and there is a next character
	            value = str.charCodeAt(pos);
	            if ((value & 0xfc00) === 0xdc00)
	                pos++; // low surrogate
	        }
	    }
	    return length;
	}
	ucs2length.default = ucs2length$1;
	ucs2length$1.code = 'require("ajv/dist/runtime/ucs2length").default';
	
	return ucs2length;
}

var hasRequiredLimitLength;

function requireLimitLength () {
	if (hasRequiredLimitLength) return limitLength;
	hasRequiredLimitLength = 1;
	Object.defineProperty(limitLength, "__esModule", { value: true });
	const codegen_1 = /*@__PURE__*/ requireCodegen();
	const util_1 = /*@__PURE__*/ requireUtil();
	const ucs2length_1 = /*@__PURE__*/ requireUcs2length();
	const error = {
	    message({ keyword, schemaCode }) {
	        const comp = keyword === "maxLength" ? "more" : "fewer";
	        return (0, codegen_1.str) `must NOT have ${comp} than ${schemaCode} characters`;
	    },
	    params: ({ schemaCode }) => (0, codegen_1._) `{limit: ${schemaCode}}`,
	};
	const def = {
	    keyword: ["maxLength", "minLength"],
	    type: "string",
	    schemaType: "number",
	    $data: true,
	    error,
	    code(cxt) {
	        const { keyword, data, schemaCode, it } = cxt;
	        const op = keyword === "maxLength" ? codegen_1.operators.GT : codegen_1.operators.LT;
	        const len = it.opts.unicode === false ? (0, codegen_1._) `${data}.length` : (0, codegen_1._) `${(0, util_1.useFunc)(cxt.gen, ucs2length_1.default)}(${data})`;
	        cxt.fail$data((0, codegen_1._) `${len} ${op} ${schemaCode}`);
	    },
	};
	limitLength.default = def;
	
	return limitLength;
}

var pattern = {};

var hasRequiredPattern;

function requirePattern () {
	if (hasRequiredPattern) return pattern;
	hasRequiredPattern = 1;
	Object.defineProperty(pattern, "__esModule", { value: true });
	const code_1 = /*@__PURE__*/ requireCode();
	const util_1 = /*@__PURE__*/ requireUtil();
	const codegen_1 = /*@__PURE__*/ requireCodegen();
	const error = {
	    message: ({ schemaCode }) => (0, codegen_1.str) `must match pattern "${schemaCode}"`,
	    params: ({ schemaCode }) => (0, codegen_1._) `{pattern: ${schemaCode}}`,
	};
	const def = {
	    keyword: "pattern",
	    type: "string",
	    schemaType: "string",
	    $data: true,
	    error,
	    code(cxt) {
	        const { gen, data, $data, schema, schemaCode, it } = cxt;
	        const u = it.opts.unicodeRegExp ? "u" : "";
	        if ($data) {
	            const { regExp } = it.opts.code;
	            const regExpCode = regExp.code === "new RegExp" ? (0, codegen_1._) `new RegExp` : (0, util_1.useFunc)(gen, regExp);
	            const valid = gen.let("valid");
	            gen.try(() => gen.assign(valid, (0, codegen_1._) `${regExpCode}(${schemaCode}, ${u}).test(${data})`), () => gen.assign(valid, false));
	            cxt.fail$data((0, codegen_1._) `!${valid}`);
	        }
	        else {
	            const regExp = (0, code_1.usePattern)(cxt, schema);
	            cxt.fail$data((0, codegen_1._) `!${regExp}.test(${data})`);
	        }
	    },
	};
	pattern.default = def;
	
	return pattern;
}

var limitProperties = {};

var hasRequiredLimitProperties;

function requireLimitProperties () {
	if (hasRequiredLimitProperties) return limitProperties;
	hasRequiredLimitProperties = 1;
	Object.defineProperty(limitProperties, "__esModule", { value: true });
	const codegen_1 = /*@__PURE__*/ requireCodegen();
	const error = {
	    message({ keyword, schemaCode }) {
	        const comp = keyword === "maxProperties" ? "more" : "fewer";
	        return (0, codegen_1.str) `must NOT have ${comp} than ${schemaCode} properties`;
	    },
	    params: ({ schemaCode }) => (0, codegen_1._) `{limit: ${schemaCode}}`,
	};
	const def = {
	    keyword: ["maxProperties", "minProperties"],
	    type: "object",
	    schemaType: "number",
	    $data: true,
	    error,
	    code(cxt) {
	        const { keyword, data, schemaCode } = cxt;
	        const op = keyword === "maxProperties" ? codegen_1.operators.GT : codegen_1.operators.LT;
	        cxt.fail$data((0, codegen_1._) `Object.keys(${data}).length ${op} ${schemaCode}`);
	    },
	};
	limitProperties.default = def;
	
	return limitProperties;
}

var required$2 = {};

var hasRequiredRequired;

function requireRequired () {
	if (hasRequiredRequired) return required$2;
	hasRequiredRequired = 1;
	Object.defineProperty(required$2, "__esModule", { value: true });
	const code_1 = /*@__PURE__*/ requireCode();
	const codegen_1 = /*@__PURE__*/ requireCodegen();
	const util_1 = /*@__PURE__*/ requireUtil();
	const error = {
	    message: ({ params: { missingProperty } }) => (0, codegen_1.str) `must have required property '${missingProperty}'`,
	    params: ({ params: { missingProperty } }) => (0, codegen_1._) `{missingProperty: ${missingProperty}}`,
	};
	const def = {
	    keyword: "required",
	    type: "object",
	    schemaType: "array",
	    $data: true,
	    error,
	    code(cxt) {
	        const { gen, schema, schemaCode, data, $data, it } = cxt;
	        const { opts } = it;
	        if (!$data && schema.length === 0)
	            return;
	        const useLoop = schema.length >= opts.loopRequired;
	        if (it.allErrors)
	            allErrorsMode();
	        else
	            exitOnErrorMode();
	        if (opts.strictRequired) {
	            const props = cxt.parentSchema.properties;
	            const { definedProperties } = cxt.it;
	            for (const requiredKey of schema) {
	                if ((props === null || props === void 0 ? void 0 : props[requiredKey]) === undefined && !definedProperties.has(requiredKey)) {
	                    const schemaPath = it.schemaEnv.baseId + it.errSchemaPath;
	                    const msg = `required property "${requiredKey}" is not defined at "${schemaPath}" (strictRequired)`;
	                    (0, util_1.checkStrictMode)(it, msg, it.opts.strictRequired);
	                }
	            }
	        }
	        function allErrorsMode() {
	            if (useLoop || $data) {
	                cxt.block$data(codegen_1.nil, loopAllRequired);
	            }
	            else {
	                for (const prop of schema) {
	                    (0, code_1.checkReportMissingProp)(cxt, prop);
	                }
	            }
	        }
	        function exitOnErrorMode() {
	            const missing = gen.let("missing");
	            if (useLoop || $data) {
	                const valid = gen.let("valid", true);
	                cxt.block$data(valid, () => loopUntilMissing(missing, valid));
	                cxt.ok(valid);
	            }
	            else {
	                gen.if((0, code_1.checkMissingProp)(cxt, schema, missing));
	                (0, code_1.reportMissingProp)(cxt, missing);
	                gen.else();
	            }
	        }
	        function loopAllRequired() {
	            gen.forOf("prop", schemaCode, (prop) => {
	                cxt.setParams({ missingProperty: prop });
	                gen.if((0, code_1.noPropertyInData)(gen, data, prop, opts.ownProperties), () => cxt.error());
	            });
	        }
	        function loopUntilMissing(missing, valid) {
	            cxt.setParams({ missingProperty: missing });
	            gen.forOf(missing, schemaCode, () => {
	                gen.assign(valid, (0, code_1.propertyInData)(gen, data, missing, opts.ownProperties));
	                gen.if((0, codegen_1.not)(valid), () => {
	                    cxt.error();
	                    gen.break();
	                });
	            }, codegen_1.nil);
	        }
	    },
	};
	required$2.default = def;
	
	return required$2;
}

var limitItems = {};

var hasRequiredLimitItems;

function requireLimitItems () {
	if (hasRequiredLimitItems) return limitItems;
	hasRequiredLimitItems = 1;
	Object.defineProperty(limitItems, "__esModule", { value: true });
	const codegen_1 = /*@__PURE__*/ requireCodegen();
	const error = {
	    message({ keyword, schemaCode }) {
	        const comp = keyword === "maxItems" ? "more" : "fewer";
	        return (0, codegen_1.str) `must NOT have ${comp} than ${schemaCode} items`;
	    },
	    params: ({ schemaCode }) => (0, codegen_1._) `{limit: ${schemaCode}}`,
	};
	const def = {
	    keyword: ["maxItems", "minItems"],
	    type: "array",
	    schemaType: "number",
	    $data: true,
	    error,
	    code(cxt) {
	        const { keyword, data, schemaCode } = cxt;
	        const op = keyword === "maxItems" ? codegen_1.operators.GT : codegen_1.operators.LT;
	        cxt.fail$data((0, codegen_1._) `${data}.length ${op} ${schemaCode}`);
	    },
	};
	limitItems.default = def;
	
	return limitItems;
}

var uniqueItems = {};

var equal = {};

var hasRequiredEqual;

function requireEqual () {
	if (hasRequiredEqual) return equal;
	hasRequiredEqual = 1;
	Object.defineProperty(equal, "__esModule", { value: true });
	// https://github.com/ajv-validator/ajv/issues/889
	const equal$1 = /*@__PURE__*/ requireFastDeepEqual();
	equal$1.code = 'require("ajv/dist/runtime/equal").default';
	equal.default = equal$1;
	
	return equal;
}

var hasRequiredUniqueItems;

function requireUniqueItems () {
	if (hasRequiredUniqueItems) return uniqueItems;
	hasRequiredUniqueItems = 1;
	Object.defineProperty(uniqueItems, "__esModule", { value: true });
	const dataType_1 = /*@__PURE__*/ requireDataType();
	const codegen_1 = /*@__PURE__*/ requireCodegen();
	const util_1 = /*@__PURE__*/ requireUtil();
	const equal_1 = /*@__PURE__*/ requireEqual();
	const error = {
	    message: ({ params: { i, j } }) => (0, codegen_1.str) `must NOT have duplicate items (items ## ${j} and ${i} are identical)`,
	    params: ({ params: { i, j } }) => (0, codegen_1._) `{i: ${i}, j: ${j}}`,
	};
	const def = {
	    keyword: "uniqueItems",
	    type: "array",
	    schemaType: "boolean",
	    $data: true,
	    error,
	    code(cxt) {
	        const { gen, data, $data, schema, parentSchema, schemaCode, it } = cxt;
	        if (!$data && !schema)
	            return;
	        const valid = gen.let("valid");
	        const itemTypes = parentSchema.items ? (0, dataType_1.getSchemaTypes)(parentSchema.items) : [];
	        cxt.block$data(valid, validateUniqueItems, (0, codegen_1._) `${schemaCode} === false`);
	        cxt.ok(valid);
	        function validateUniqueItems() {
	            const i = gen.let("i", (0, codegen_1._) `${data}.length`);
	            const j = gen.let("j");
	            cxt.setParams({ i, j });
	            gen.assign(valid, true);
	            gen.if((0, codegen_1._) `${i} > 1`, () => (canOptimize() ? loopN : loopN2)(i, j));
	        }
	        function canOptimize() {
	            return itemTypes.length > 0 && !itemTypes.some((t) => t === "object" || t === "array");
	        }
	        function loopN(i, j) {
	            const item = gen.name("item");
	            const wrongType = (0, dataType_1.checkDataTypes)(itemTypes, item, it.opts.strictNumbers, dataType_1.DataType.Wrong);
	            const indices = gen.const("indices", (0, codegen_1._) `{}`);
	            gen.for((0, codegen_1._) `;${i}--;`, () => {
	                gen.let(item, (0, codegen_1._) `${data}[${i}]`);
	                gen.if(wrongType, (0, codegen_1._) `continue`);
	                if (itemTypes.length > 1)
	                    gen.if((0, codegen_1._) `typeof ${item} == "string"`, (0, codegen_1._) `${item} += "_"`);
	                gen
	                    .if((0, codegen_1._) `typeof ${indices}[${item}] == "number"`, () => {
	                    gen.assign(j, (0, codegen_1._) `${indices}[${item}]`);
	                    cxt.error();
	                    gen.assign(valid, false).break();
	                })
	                    .code((0, codegen_1._) `${indices}[${item}] = ${i}`);
	            });
	        }
	        function loopN2(i, j) {
	            const eql = (0, util_1.useFunc)(gen, equal_1.default);
	            const outer = gen.name("outer");
	            gen.label(outer).for((0, codegen_1._) `;${i}--;`, () => gen.for((0, codegen_1._) `${j} = ${i}; ${j}--;`, () => gen.if((0, codegen_1._) `${eql}(${data}[${i}], ${data}[${j}])`, () => {
	                cxt.error();
	                gen.assign(valid, false).break(outer);
	            })));
	        }
	    },
	};
	uniqueItems.default = def;
	
	return uniqueItems;
}

var _const = {};

var hasRequired_const;

function require_const () {
	if (hasRequired_const) return _const;
	hasRequired_const = 1;
	Object.defineProperty(_const, "__esModule", { value: true });
	const codegen_1 = /*@__PURE__*/ requireCodegen();
	const util_1 = /*@__PURE__*/ requireUtil();
	const equal_1 = /*@__PURE__*/ requireEqual();
	const error = {
	    message: "must be equal to constant",
	    params: ({ schemaCode }) => (0, codegen_1._) `{allowedValue: ${schemaCode}}`,
	};
	const def = {
	    keyword: "const",
	    $data: true,
	    error,
	    code(cxt) {
	        const { gen, data, $data, schemaCode, schema } = cxt;
	        if ($data || (schema && typeof schema == "object")) {
	            cxt.fail$data((0, codegen_1._) `!${(0, util_1.useFunc)(gen, equal_1.default)}(${data}, ${schemaCode})`);
	        }
	        else {
	            cxt.fail((0, codegen_1._) `${schema} !== ${data}`);
	        }
	    },
	};
	_const.default = def;
	
	return _const;
}

var _enum = {};

var hasRequired_enum;

function require_enum () {
	if (hasRequired_enum) return _enum;
	hasRequired_enum = 1;
	Object.defineProperty(_enum, "__esModule", { value: true });
	const codegen_1 = /*@__PURE__*/ requireCodegen();
	const util_1 = /*@__PURE__*/ requireUtil();
	const equal_1 = /*@__PURE__*/ requireEqual();
	const error = {
	    message: "must be equal to one of the allowed values",
	    params: ({ schemaCode }) => (0, codegen_1._) `{allowedValues: ${schemaCode}}`,
	};
	const def = {
	    keyword: "enum",
	    schemaType: "array",
	    $data: true,
	    error,
	    code(cxt) {
	        const { gen, data, $data, schema, schemaCode, it } = cxt;
	        if (!$data && schema.length === 0)
	            throw new Error("enum must have non-empty array");
	        const useLoop = schema.length >= it.opts.loopEnum;
	        let eql;
	        const getEql = () => (eql !== null && eql !== void 0 ? eql : (eql = (0, util_1.useFunc)(gen, equal_1.default)));
	        let valid;
	        if (useLoop || $data) {
	            valid = gen.let("valid");
	            cxt.block$data(valid, loopEnum);
	        }
	        else {
	            /* istanbul ignore if */
	            if (!Array.isArray(schema))
	                throw new Error("ajv implementation error");
	            const vSchema = gen.const("vSchema", schemaCode);
	            valid = (0, codegen_1.or)(...schema.map((_x, i) => equalCode(vSchema, i)));
	        }
	        cxt.pass(valid);
	        function loopEnum() {
	            gen.assign(valid, false);
	            gen.forOf("v", schemaCode, (v) => gen.if((0, codegen_1._) `${getEql()}(${data}, ${v})`, () => gen.assign(valid, true).break()));
	        }
	        function equalCode(vSchema, i) {
	            const sch = schema[i];
	            return typeof sch === "object" && sch !== null
	                ? (0, codegen_1._) `${getEql()}(${data}, ${vSchema}[${i}])`
	                : (0, codegen_1._) `${data} === ${sch}`;
	        }
	    },
	};
	_enum.default = def;
	
	return _enum;
}

var hasRequiredValidation;

function requireValidation () {
	if (hasRequiredValidation) return validation;
	hasRequiredValidation = 1;
	Object.defineProperty(validation, "__esModule", { value: true });
	const limitNumber_1 = /*@__PURE__*/ requireLimitNumber();
	const multipleOf_1 = /*@__PURE__*/ requireMultipleOf();
	const limitLength_1 = /*@__PURE__*/ requireLimitLength();
	const pattern_1 = /*@__PURE__*/ requirePattern();
	const limitProperties_1 = /*@__PURE__*/ requireLimitProperties();
	const required_1 = /*@__PURE__*/ requireRequired();
	const limitItems_1 = /*@__PURE__*/ requireLimitItems();
	const uniqueItems_1 = /*@__PURE__*/ requireUniqueItems();
	const const_1 = /*@__PURE__*/ require_const();
	const enum_1 = /*@__PURE__*/ require_enum();
	const validation$1 = [
	    // number
	    limitNumber_1.default,
	    multipleOf_1.default,
	    // string
	    limitLength_1.default,
	    pattern_1.default,
	    // object
	    limitProperties_1.default,
	    required_1.default,
	    // array
	    limitItems_1.default,
	    uniqueItems_1.default,
	    // any
	    { keyword: "type", schemaType: ["string", "array"] },
	    { keyword: "nullable", schemaType: "boolean" },
	    const_1.default,
	    enum_1.default,
	];
	validation.default = validation$1;
	
	return validation;
}

var applicator = {};

var additionalItems = {};

var hasRequiredAdditionalItems;

function requireAdditionalItems () {
	if (hasRequiredAdditionalItems) return additionalItems;
	hasRequiredAdditionalItems = 1;
	Object.defineProperty(additionalItems, "__esModule", { value: true });
	additionalItems.validateAdditionalItems = void 0;
	const codegen_1 = /*@__PURE__*/ requireCodegen();
	const util_1 = /*@__PURE__*/ requireUtil();
	const error = {
	    message: ({ params: { len } }) => (0, codegen_1.str) `must NOT have more than ${len} items`,
	    params: ({ params: { len } }) => (0, codegen_1._) `{limit: ${len}}`,
	};
	const def = {
	    keyword: "additionalItems",
	    type: "array",
	    schemaType: ["boolean", "object"],
	    before: "uniqueItems",
	    error,
	    code(cxt) {
	        const { parentSchema, it } = cxt;
	        const { items } = parentSchema;
	        if (!Array.isArray(items)) {
	            (0, util_1.checkStrictMode)(it, '"additionalItems" is ignored when "items" is not an array of schemas');
	            return;
	        }
	        validateAdditionalItems(cxt, items);
	    },
	};
	function validateAdditionalItems(cxt, items) {
	    const { gen, schema, data, keyword, it } = cxt;
	    it.items = true;
	    const len = gen.const("len", (0, codegen_1._) `${data}.length`);
	    if (schema === false) {
	        cxt.setParams({ len: items.length });
	        cxt.pass((0, codegen_1._) `${len} <= ${items.length}`);
	    }
	    else if (typeof schema == "object" && !(0, util_1.alwaysValidSchema)(it, schema)) {
	        const valid = gen.var("valid", (0, codegen_1._) `${len} <= ${items.length}`); // TODO var
	        gen.if((0, codegen_1.not)(valid), () => validateItems(valid));
	        cxt.ok(valid);
	    }
	    function validateItems(valid) {
	        gen.forRange("i", items.length, len, (i) => {
	            cxt.subschema({ keyword, dataProp: i, dataPropType: util_1.Type.Num }, valid);
	            if (!it.allErrors)
	                gen.if((0, codegen_1.not)(valid), () => gen.break());
	        });
	    }
	}
	additionalItems.validateAdditionalItems = validateAdditionalItems;
	additionalItems.default = def;
	
	return additionalItems;
}

var prefixItems = {};

var items = {};

var hasRequiredItems;

function requireItems () {
	if (hasRequiredItems) return items;
	hasRequiredItems = 1;
	Object.defineProperty(items, "__esModule", { value: true });
	items.validateTuple = void 0;
	const codegen_1 = /*@__PURE__*/ requireCodegen();
	const util_1 = /*@__PURE__*/ requireUtil();
	const code_1 = /*@__PURE__*/ requireCode();
	const def = {
	    keyword: "items",
	    type: "array",
	    schemaType: ["object", "array", "boolean"],
	    before: "uniqueItems",
	    code(cxt) {
	        const { schema, it } = cxt;
	        if (Array.isArray(schema))
	            return validateTuple(cxt, "additionalItems", schema);
	        it.items = true;
	        if ((0, util_1.alwaysValidSchema)(it, schema))
	            return;
	        cxt.ok((0, code_1.validateArray)(cxt));
	    },
	};
	function validateTuple(cxt, extraItems, schArr = cxt.schema) {
	    const { gen, parentSchema, data, keyword, it } = cxt;
	    checkStrictTuple(parentSchema);
	    if (it.opts.unevaluated && schArr.length && it.items !== true) {
	        it.items = util_1.mergeEvaluated.items(gen, schArr.length, it.items);
	    }
	    const valid = gen.name("valid");
	    const len = gen.const("len", (0, codegen_1._) `${data}.length`);
	    schArr.forEach((sch, i) => {
	        if ((0, util_1.alwaysValidSchema)(it, sch))
	            return;
	        gen.if((0, codegen_1._) `${len} > ${i}`, () => cxt.subschema({
	            keyword,
	            schemaProp: i,
	            dataProp: i,
	        }, valid));
	        cxt.ok(valid);
	    });
	    function checkStrictTuple(sch) {
	        const { opts, errSchemaPath } = it;
	        const l = schArr.length;
	        const fullTuple = l === sch.minItems && (l === sch.maxItems || sch[extraItems] === false);
	        if (opts.strictTuples && !fullTuple) {
	            const msg = `"${keyword}" is ${l}-tuple, but minItems or maxItems/${extraItems} are not specified or different at path "${errSchemaPath}"`;
	            (0, util_1.checkStrictMode)(it, msg, opts.strictTuples);
	        }
	    }
	}
	items.validateTuple = validateTuple;
	items.default = def;
	
	return items;
}

var hasRequiredPrefixItems;

function requirePrefixItems () {
	if (hasRequiredPrefixItems) return prefixItems;
	hasRequiredPrefixItems = 1;
	Object.defineProperty(prefixItems, "__esModule", { value: true });
	const items_1 = /*@__PURE__*/ requireItems();
	const def = {
	    keyword: "prefixItems",
	    type: "array",
	    schemaType: ["array"],
	    before: "uniqueItems",
	    code: (cxt) => (0, items_1.validateTuple)(cxt, "items"),
	};
	prefixItems.default = def;
	
	return prefixItems;
}

var items2020 = {};

var hasRequiredItems2020;

function requireItems2020 () {
	if (hasRequiredItems2020) return items2020;
	hasRequiredItems2020 = 1;
	Object.defineProperty(items2020, "__esModule", { value: true });
	const codegen_1 = /*@__PURE__*/ requireCodegen();
	const util_1 = /*@__PURE__*/ requireUtil();
	const code_1 = /*@__PURE__*/ requireCode();
	const additionalItems_1 = /*@__PURE__*/ requireAdditionalItems();
	const error = {
	    message: ({ params: { len } }) => (0, codegen_1.str) `must NOT have more than ${len} items`,
	    params: ({ params: { len } }) => (0, codegen_1._) `{limit: ${len}}`,
	};
	const def = {
	    keyword: "items",
	    type: "array",
	    schemaType: ["object", "boolean"],
	    before: "uniqueItems",
	    error,
	    code(cxt) {
	        const { schema, parentSchema, it } = cxt;
	        const { prefixItems } = parentSchema;
	        it.items = true;
	        if ((0, util_1.alwaysValidSchema)(it, schema))
	            return;
	        if (prefixItems)
	            (0, additionalItems_1.validateAdditionalItems)(cxt, prefixItems);
	        else
	            cxt.ok((0, code_1.validateArray)(cxt));
	    },
	};
	items2020.default = def;
	
	return items2020;
}

var contains = {};

var hasRequiredContains;

function requireContains () {
	if (hasRequiredContains) return contains;
	hasRequiredContains = 1;
	Object.defineProperty(contains, "__esModule", { value: true });
	const codegen_1 = /*@__PURE__*/ requireCodegen();
	const util_1 = /*@__PURE__*/ requireUtil();
	const error = {
	    message: ({ params: { min, max } }) => max === undefined
	        ? (0, codegen_1.str) `must contain at least ${min} valid item(s)`
	        : (0, codegen_1.str) `must contain at least ${min} and no more than ${max} valid item(s)`,
	    params: ({ params: { min, max } }) => max === undefined ? (0, codegen_1._) `{minContains: ${min}}` : (0, codegen_1._) `{minContains: ${min}, maxContains: ${max}}`,
	};
	const def = {
	    keyword: "contains",
	    type: "array",
	    schemaType: ["object", "boolean"],
	    before: "uniqueItems",
	    trackErrors: true,
	    error,
	    code(cxt) {
	        const { gen, schema, parentSchema, data, it } = cxt;
	        let min;
	        let max;
	        const { minContains, maxContains } = parentSchema;
	        if (it.opts.next) {
	            min = minContains === undefined ? 1 : minContains;
	            max = maxContains;
	        }
	        else {
	            min = 1;
	        }
	        const len = gen.const("len", (0, codegen_1._) `${data}.length`);
	        cxt.setParams({ min, max });
	        if (max === undefined && min === 0) {
	            (0, util_1.checkStrictMode)(it, `"minContains" == 0 without "maxContains": "contains" keyword ignored`);
	            return;
	        }
	        if (max !== undefined && min > max) {
	            (0, util_1.checkStrictMode)(it, `"minContains" > "maxContains" is always invalid`);
	            cxt.fail();
	            return;
	        }
	        if ((0, util_1.alwaysValidSchema)(it, schema)) {
	            let cond = (0, codegen_1._) `${len} >= ${min}`;
	            if (max !== undefined)
	                cond = (0, codegen_1._) `${cond} && ${len} <= ${max}`;
	            cxt.pass(cond);
	            return;
	        }
	        it.items = true;
	        const valid = gen.name("valid");
	        if (max === undefined && min === 1) {
	            validateItems(valid, () => gen.if(valid, () => gen.break()));
	        }
	        else if (min === 0) {
	            gen.let(valid, true);
	            if (max !== undefined)
	                gen.if((0, codegen_1._) `${data}.length > 0`, validateItemsWithCount);
	        }
	        else {
	            gen.let(valid, false);
	            validateItemsWithCount();
	        }
	        cxt.result(valid, () => cxt.reset());
	        function validateItemsWithCount() {
	            const schValid = gen.name("_valid");
	            const count = gen.let("count", 0);
	            validateItems(schValid, () => gen.if(schValid, () => checkLimits(count)));
	        }
	        function validateItems(_valid, block) {
	            gen.forRange("i", 0, len, (i) => {
	                cxt.subschema({
	                    keyword: "contains",
	                    dataProp: i,
	                    dataPropType: util_1.Type.Num,
	                    compositeRule: true,
	                }, _valid);
	                block();
	            });
	        }
	        function checkLimits(count) {
	            gen.code((0, codegen_1._) `${count}++`);
	            if (max === undefined) {
	                gen.if((0, codegen_1._) `${count} >= ${min}`, () => gen.assign(valid, true).break());
	            }
	            else {
	                gen.if((0, codegen_1._) `${count} > ${max}`, () => gen.assign(valid, false).break());
	                if (min === 1)
	                    gen.assign(valid, true);
	                else
	                    gen.if((0, codegen_1._) `${count} >= ${min}`, () => gen.assign(valid, true));
	            }
	        }
	    },
	};
	contains.default = def;
	
	return contains;
}

var dependencies = {};

var hasRequiredDependencies;

function requireDependencies () {
	if (hasRequiredDependencies) return dependencies;
	hasRequiredDependencies = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.validateSchemaDeps = exports.validatePropertyDeps = exports.error = void 0;
		const codegen_1 = /*@__PURE__*/ requireCodegen();
		const util_1 = /*@__PURE__*/ requireUtil();
		const code_1 = /*@__PURE__*/ requireCode();
		exports.error = {
		    message: ({ params: { property, depsCount, deps } }) => {
		        const property_ies = depsCount === 1 ? "property" : "properties";
		        return (0, codegen_1.str) `must have ${property_ies} ${deps} when property ${property} is present`;
		    },
		    params: ({ params: { property, depsCount, deps, missingProperty } }) => (0, codegen_1._) `{property: ${property},
    missingProperty: ${missingProperty},
    depsCount: ${depsCount},
    deps: ${deps}}`, // TODO change to reference
		};
		const def = {
		    keyword: "dependencies",
		    type: "object",
		    schemaType: "object",
		    error: exports.error,
		    code(cxt) {
		        const [propDeps, schDeps] = splitDependencies(cxt);
		        validatePropertyDeps(cxt, propDeps);
		        validateSchemaDeps(cxt, schDeps);
		    },
		};
		function splitDependencies({ schema }) {
		    const propertyDeps = {};
		    const schemaDeps = {};
		    for (const key in schema) {
		        if (key === "__proto__")
		            continue;
		        const deps = Array.isArray(schema[key]) ? propertyDeps : schemaDeps;
		        deps[key] = schema[key];
		    }
		    return [propertyDeps, schemaDeps];
		}
		function validatePropertyDeps(cxt, propertyDeps = cxt.schema) {
		    const { gen, data, it } = cxt;
		    if (Object.keys(propertyDeps).length === 0)
		        return;
		    const missing = gen.let("missing");
		    for (const prop in propertyDeps) {
		        const deps = propertyDeps[prop];
		        if (deps.length === 0)
		            continue;
		        const hasProperty = (0, code_1.propertyInData)(gen, data, prop, it.opts.ownProperties);
		        cxt.setParams({
		            property: prop,
		            depsCount: deps.length,
		            deps: deps.join(", "),
		        });
		        if (it.allErrors) {
		            gen.if(hasProperty, () => {
		                for (const depProp of deps) {
		                    (0, code_1.checkReportMissingProp)(cxt, depProp);
		                }
		            });
		        }
		        else {
		            gen.if((0, codegen_1._) `${hasProperty} && (${(0, code_1.checkMissingProp)(cxt, deps, missing)})`);
		            (0, code_1.reportMissingProp)(cxt, missing);
		            gen.else();
		        }
		    }
		}
		exports.validatePropertyDeps = validatePropertyDeps;
		function validateSchemaDeps(cxt, schemaDeps = cxt.schema) {
		    const { gen, data, keyword, it } = cxt;
		    const valid = gen.name("valid");
		    for (const prop in schemaDeps) {
		        if ((0, util_1.alwaysValidSchema)(it, schemaDeps[prop]))
		            continue;
		        gen.if((0, code_1.propertyInData)(gen, data, prop, it.opts.ownProperties), () => {
		            const schCxt = cxt.subschema({ keyword, schemaProp: prop }, valid);
		            cxt.mergeValidEvaluated(schCxt, valid);
		        }, () => gen.var(valid, true) // TODO var
		        );
		        cxt.ok(valid);
		    }
		}
		exports.validateSchemaDeps = validateSchemaDeps;
		exports.default = def;
		
	} (dependencies));
	return dependencies;
}

var propertyNames = {};

var hasRequiredPropertyNames;

function requirePropertyNames () {
	if (hasRequiredPropertyNames) return propertyNames;
	hasRequiredPropertyNames = 1;
	Object.defineProperty(propertyNames, "__esModule", { value: true });
	const codegen_1 = /*@__PURE__*/ requireCodegen();
	const util_1 = /*@__PURE__*/ requireUtil();
	const error = {
	    message: "property name must be valid",
	    params: ({ params }) => (0, codegen_1._) `{propertyName: ${params.propertyName}}`,
	};
	const def = {
	    keyword: "propertyNames",
	    type: "object",
	    schemaType: ["object", "boolean"],
	    error,
	    code(cxt) {
	        const { gen, schema, data, it } = cxt;
	        if ((0, util_1.alwaysValidSchema)(it, schema))
	            return;
	        const valid = gen.name("valid");
	        gen.forIn("key", data, (key) => {
	            cxt.setParams({ propertyName: key });
	            cxt.subschema({
	                keyword: "propertyNames",
	                data: key,
	                dataTypes: ["string"],
	                propertyName: key,
	                compositeRule: true,
	            }, valid);
	            gen.if((0, codegen_1.not)(valid), () => {
	                cxt.error(true);
	                if (!it.allErrors)
	                    gen.break();
	            });
	        });
	        cxt.ok(valid);
	    },
	};
	propertyNames.default = def;
	
	return propertyNames;
}

var additionalProperties$2 = {};

var hasRequiredAdditionalProperties;

function requireAdditionalProperties () {
	if (hasRequiredAdditionalProperties) return additionalProperties$2;
	hasRequiredAdditionalProperties = 1;
	Object.defineProperty(additionalProperties$2, "__esModule", { value: true });
	const code_1 = /*@__PURE__*/ requireCode();
	const codegen_1 = /*@__PURE__*/ requireCodegen();
	const names_1 = /*@__PURE__*/ requireNames();
	const util_1 = /*@__PURE__*/ requireUtil();
	const error = {
	    message: "must NOT have additional properties",
	    params: ({ params }) => (0, codegen_1._) `{additionalProperty: ${params.additionalProperty}}`,
	};
	const def = {
	    keyword: "additionalProperties",
	    type: ["object"],
	    schemaType: ["boolean", "object"],
	    allowUndefined: true,
	    trackErrors: true,
	    error,
	    code(cxt) {
	        const { gen, schema, parentSchema, data, errsCount, it } = cxt;
	        /* istanbul ignore if */
	        if (!errsCount)
	            throw new Error("ajv implementation error");
	        const { allErrors, opts } = it;
	        it.props = true;
	        if (opts.removeAdditional !== "all" && (0, util_1.alwaysValidSchema)(it, schema))
	            return;
	        const props = (0, code_1.allSchemaProperties)(parentSchema.properties);
	        const patProps = (0, code_1.allSchemaProperties)(parentSchema.patternProperties);
	        checkAdditionalProperties();
	        cxt.ok((0, codegen_1._) `${errsCount} === ${names_1.default.errors}`);
	        function checkAdditionalProperties() {
	            gen.forIn("key", data, (key) => {
	                if (!props.length && !patProps.length)
	                    additionalPropertyCode(key);
	                else
	                    gen.if(isAdditional(key), () => additionalPropertyCode(key));
	            });
	        }
	        function isAdditional(key) {
	            let definedProp;
	            if (props.length > 8) {
	                // TODO maybe an option instead of hard-coded 8?
	                const propsSchema = (0, util_1.schemaRefOrVal)(it, parentSchema.properties, "properties");
	                definedProp = (0, code_1.isOwnProperty)(gen, propsSchema, key);
	            }
	            else if (props.length) {
	                definedProp = (0, codegen_1.or)(...props.map((p) => (0, codegen_1._) `${key} === ${p}`));
	            }
	            else {
	                definedProp = codegen_1.nil;
	            }
	            if (patProps.length) {
	                definedProp = (0, codegen_1.or)(definedProp, ...patProps.map((p) => (0, codegen_1._) `${(0, code_1.usePattern)(cxt, p)}.test(${key})`));
	            }
	            return (0, codegen_1.not)(definedProp);
	        }
	        function deleteAdditional(key) {
	            gen.code((0, codegen_1._) `delete ${data}[${key}]`);
	        }
	        function additionalPropertyCode(key) {
	            if (opts.removeAdditional === "all" || (opts.removeAdditional && schema === false)) {
	                deleteAdditional(key);
	                return;
	            }
	            if (schema === false) {
	                cxt.setParams({ additionalProperty: key });
	                cxt.error();
	                if (!allErrors)
	                    gen.break();
	                return;
	            }
	            if (typeof schema == "object" && !(0, util_1.alwaysValidSchema)(it, schema)) {
	                const valid = gen.name("valid");
	                if (opts.removeAdditional === "failing") {
	                    applyAdditionalSchema(key, valid, false);
	                    gen.if((0, codegen_1.not)(valid), () => {
	                        cxt.reset();
	                        deleteAdditional(key);
	                    });
	                }
	                else {
	                    applyAdditionalSchema(key, valid);
	                    if (!allErrors)
	                        gen.if((0, codegen_1.not)(valid), () => gen.break());
	                }
	            }
	        }
	        function applyAdditionalSchema(key, valid, errors) {
	            const subschema = {
	                keyword: "additionalProperties",
	                dataProp: key,
	                dataPropType: util_1.Type.Str,
	            };
	            if (errors === false) {
	                Object.assign(subschema, {
	                    compositeRule: true,
	                    createErrors: false,
	                    allErrors: false,
	                });
	            }
	            cxt.subschema(subschema, valid);
	        }
	    },
	};
	additionalProperties$2.default = def;
	
	return additionalProperties$2;
}

var properties$a = {};

var hasRequiredProperties;

function requireProperties () {
	if (hasRequiredProperties) return properties$a;
	hasRequiredProperties = 1;
	Object.defineProperty(properties$a, "__esModule", { value: true });
	const validate_1 = /*@__PURE__*/ requireValidate();
	const code_1 = /*@__PURE__*/ requireCode();
	const util_1 = /*@__PURE__*/ requireUtil();
	const additionalProperties_1 = /*@__PURE__*/ requireAdditionalProperties();
	const def = {
	    keyword: "properties",
	    type: "object",
	    schemaType: "object",
	    code(cxt) {
	        const { gen, schema, parentSchema, data, it } = cxt;
	        if (it.opts.removeAdditional === "all" && parentSchema.additionalProperties === undefined) {
	            additionalProperties_1.default.code(new validate_1.KeywordCxt(it, additionalProperties_1.default, "additionalProperties"));
	        }
	        const allProps = (0, code_1.allSchemaProperties)(schema);
	        for (const prop of allProps) {
	            it.definedProperties.add(prop);
	        }
	        if (it.opts.unevaluated && allProps.length && it.props !== true) {
	            it.props = util_1.mergeEvaluated.props(gen, (0, util_1.toHash)(allProps), it.props);
	        }
	        const properties = allProps.filter((p) => !(0, util_1.alwaysValidSchema)(it, schema[p]));
	        if (properties.length === 0)
	            return;
	        const valid = gen.name("valid");
	        for (const prop of properties) {
	            if (hasDefault(prop)) {
	                applyPropertySchema(prop);
	            }
	            else {
	                gen.if((0, code_1.propertyInData)(gen, data, prop, it.opts.ownProperties));
	                applyPropertySchema(prop);
	                if (!it.allErrors)
	                    gen.else().var(valid, true);
	                gen.endIf();
	            }
	            cxt.it.definedProperties.add(prop);
	            cxt.ok(valid);
	        }
	        function hasDefault(prop) {
	            return it.opts.useDefaults && !it.compositeRule && schema[prop].default !== undefined;
	        }
	        function applyPropertySchema(prop) {
	            cxt.subschema({
	                keyword: "properties",
	                schemaProp: prop,
	                dataProp: prop,
	            }, valid);
	        }
	    },
	};
	properties$a.default = def;
	
	return properties$a;
}

var patternProperties = {};

var hasRequiredPatternProperties;

function requirePatternProperties () {
	if (hasRequiredPatternProperties) return patternProperties;
	hasRequiredPatternProperties = 1;
	Object.defineProperty(patternProperties, "__esModule", { value: true });
	const code_1 = /*@__PURE__*/ requireCode();
	const codegen_1 = /*@__PURE__*/ requireCodegen();
	const util_1 = /*@__PURE__*/ requireUtil();
	const util_2 = /*@__PURE__*/ requireUtil();
	const def = {
	    keyword: "patternProperties",
	    type: "object",
	    schemaType: "object",
	    code(cxt) {
	        const { gen, schema, data, parentSchema, it } = cxt;
	        const { opts } = it;
	        const patterns = (0, code_1.allSchemaProperties)(schema);
	        const alwaysValidPatterns = patterns.filter((p) => (0, util_1.alwaysValidSchema)(it, schema[p]));
	        if (patterns.length === 0 ||
	            (alwaysValidPatterns.length === patterns.length &&
	                (!it.opts.unevaluated || it.props === true))) {
	            return;
	        }
	        const checkProperties = opts.strictSchema && !opts.allowMatchingProperties && parentSchema.properties;
	        const valid = gen.name("valid");
	        if (it.props !== true && !(it.props instanceof codegen_1.Name)) {
	            it.props = (0, util_2.evaluatedPropsToName)(gen, it.props);
	        }
	        const { props } = it;
	        validatePatternProperties();
	        function validatePatternProperties() {
	            for (const pat of patterns) {
	                if (checkProperties)
	                    checkMatchingProperties(pat);
	                if (it.allErrors) {
	                    validateProperties(pat);
	                }
	                else {
	                    gen.var(valid, true); // TODO var
	                    validateProperties(pat);
	                    gen.if(valid);
	                }
	            }
	        }
	        function checkMatchingProperties(pat) {
	            for (const prop in checkProperties) {
	                if (new RegExp(pat).test(prop)) {
	                    (0, util_1.checkStrictMode)(it, `property ${prop} matches pattern ${pat} (use allowMatchingProperties)`);
	                }
	            }
	        }
	        function validateProperties(pat) {
	            gen.forIn("key", data, (key) => {
	                gen.if((0, codegen_1._) `${(0, code_1.usePattern)(cxt, pat)}.test(${key})`, () => {
	                    const alwaysValid = alwaysValidPatterns.includes(pat);
	                    if (!alwaysValid) {
	                        cxt.subschema({
	                            keyword: "patternProperties",
	                            schemaProp: pat,
	                            dataProp: key,
	                            dataPropType: util_2.Type.Str,
	                        }, valid);
	                    }
	                    if (it.opts.unevaluated && props !== true) {
	                        gen.assign((0, codegen_1._) `${props}[${key}]`, true);
	                    }
	                    else if (!alwaysValid && !it.allErrors) {
	                        // can short-circuit if `unevaluatedProperties` is not supported (opts.next === false)
	                        // or if all properties were evaluated (props === true)
	                        gen.if((0, codegen_1.not)(valid), () => gen.break());
	                    }
	                });
	            });
	        }
	    },
	};
	patternProperties.default = def;
	
	return patternProperties;
}

var not = {};

var hasRequiredNot;

function requireNot () {
	if (hasRequiredNot) return not;
	hasRequiredNot = 1;
	Object.defineProperty(not, "__esModule", { value: true });
	const util_1 = /*@__PURE__*/ requireUtil();
	const def = {
	    keyword: "not",
	    schemaType: ["object", "boolean"],
	    trackErrors: true,
	    code(cxt) {
	        const { gen, schema, it } = cxt;
	        if ((0, util_1.alwaysValidSchema)(it, schema)) {
	            cxt.fail();
	            return;
	        }
	        const valid = gen.name("valid");
	        cxt.subschema({
	            keyword: "not",
	            compositeRule: true,
	            createErrors: false,
	            allErrors: false,
	        }, valid);
	        cxt.failResult(valid, () => cxt.reset(), () => cxt.error());
	    },
	    error: { message: "must NOT be valid" },
	};
	not.default = def;
	
	return not;
}

var anyOf = {};

var hasRequiredAnyOf;

function requireAnyOf () {
	if (hasRequiredAnyOf) return anyOf;
	hasRequiredAnyOf = 1;
	Object.defineProperty(anyOf, "__esModule", { value: true });
	const code_1 = /*@__PURE__*/ requireCode();
	const def = {
	    keyword: "anyOf",
	    schemaType: "array",
	    trackErrors: true,
	    code: code_1.validateUnion,
	    error: { message: "must match a schema in anyOf" },
	};
	anyOf.default = def;
	
	return anyOf;
}

var oneOf = {};

var hasRequiredOneOf;

function requireOneOf () {
	if (hasRequiredOneOf) return oneOf;
	hasRequiredOneOf = 1;
	Object.defineProperty(oneOf, "__esModule", { value: true });
	const codegen_1 = /*@__PURE__*/ requireCodegen();
	const util_1 = /*@__PURE__*/ requireUtil();
	const error = {
	    message: "must match exactly one schema in oneOf",
	    params: ({ params }) => (0, codegen_1._) `{passingSchemas: ${params.passing}}`,
	};
	const def = {
	    keyword: "oneOf",
	    schemaType: "array",
	    trackErrors: true,
	    error,
	    code(cxt) {
	        const { gen, schema, parentSchema, it } = cxt;
	        /* istanbul ignore if */
	        if (!Array.isArray(schema))
	            throw new Error("ajv implementation error");
	        if (it.opts.discriminator && parentSchema.discriminator)
	            return;
	        const schArr = schema;
	        const valid = gen.let("valid", false);
	        const passing = gen.let("passing", null);
	        const schValid = gen.name("_valid");
	        cxt.setParams({ passing });
	        // TODO possibly fail straight away (with warning or exception) if there are two empty always valid schemas
	        gen.block(validateOneOf);
	        cxt.result(valid, () => cxt.reset(), () => cxt.error(true));
	        function validateOneOf() {
	            schArr.forEach((sch, i) => {
	                let schCxt;
	                if ((0, util_1.alwaysValidSchema)(it, sch)) {
	                    gen.var(schValid, true);
	                }
	                else {
	                    schCxt = cxt.subschema({
	                        keyword: "oneOf",
	                        schemaProp: i,
	                        compositeRule: true,
	                    }, schValid);
	                }
	                if (i > 0) {
	                    gen
	                        .if((0, codegen_1._) `${schValid} && ${valid}`)
	                        .assign(valid, false)
	                        .assign(passing, (0, codegen_1._) `[${passing}, ${i}]`)
	                        .else();
	                }
	                gen.if(schValid, () => {
	                    gen.assign(valid, true);
	                    gen.assign(passing, i);
	                    if (schCxt)
	                        cxt.mergeEvaluated(schCxt, codegen_1.Name);
	                });
	            });
	        }
	    },
	};
	oneOf.default = def;
	
	return oneOf;
}

var allOf$1 = {};

var hasRequiredAllOf;

function requireAllOf () {
	if (hasRequiredAllOf) return allOf$1;
	hasRequiredAllOf = 1;
	Object.defineProperty(allOf$1, "__esModule", { value: true });
	const util_1 = /*@__PURE__*/ requireUtil();
	const def = {
	    keyword: "allOf",
	    schemaType: "array",
	    code(cxt) {
	        const { gen, schema, it } = cxt;
	        /* istanbul ignore if */
	        if (!Array.isArray(schema))
	            throw new Error("ajv implementation error");
	        const valid = gen.name("valid");
	        schema.forEach((sch, i) => {
	            if ((0, util_1.alwaysValidSchema)(it, sch))
	                return;
	            const schCxt = cxt.subschema({ keyword: "allOf", schemaProp: i }, valid);
	            cxt.ok(valid);
	            cxt.mergeEvaluated(schCxt);
	        });
	    },
	};
	allOf$1.default = def;
	
	return allOf$1;
}

var _if = {};

var hasRequired_if;

function require_if () {
	if (hasRequired_if) return _if;
	hasRequired_if = 1;
	Object.defineProperty(_if, "__esModule", { value: true });
	const codegen_1 = /*@__PURE__*/ requireCodegen();
	const util_1 = /*@__PURE__*/ requireUtil();
	const error = {
	    message: ({ params }) => (0, codegen_1.str) `must match "${params.ifClause}" schema`,
	    params: ({ params }) => (0, codegen_1._) `{failingKeyword: ${params.ifClause}}`,
	};
	const def = {
	    keyword: "if",
	    schemaType: ["object", "boolean"],
	    trackErrors: true,
	    error,
	    code(cxt) {
	        const { gen, parentSchema, it } = cxt;
	        if (parentSchema.then === undefined && parentSchema.else === undefined) {
	            (0, util_1.checkStrictMode)(it, '"if" without "then" and "else" is ignored');
	        }
	        const hasThen = hasSchema(it, "then");
	        const hasElse = hasSchema(it, "else");
	        if (!hasThen && !hasElse)
	            return;
	        const valid = gen.let("valid", true);
	        const schValid = gen.name("_valid");
	        validateIf();
	        cxt.reset();
	        if (hasThen && hasElse) {
	            const ifClause = gen.let("ifClause");
	            cxt.setParams({ ifClause });
	            gen.if(schValid, validateClause("then", ifClause), validateClause("else", ifClause));
	        }
	        else if (hasThen) {
	            gen.if(schValid, validateClause("then"));
	        }
	        else {
	            gen.if((0, codegen_1.not)(schValid), validateClause("else"));
	        }
	        cxt.pass(valid, () => cxt.error(true));
	        function validateIf() {
	            const schCxt = cxt.subschema({
	                keyword: "if",
	                compositeRule: true,
	                createErrors: false,
	                allErrors: false,
	            }, schValid);
	            cxt.mergeEvaluated(schCxt);
	        }
	        function validateClause(keyword, ifClause) {
	            return () => {
	                const schCxt = cxt.subschema({ keyword }, schValid);
	                gen.assign(valid, schValid);
	                cxt.mergeValidEvaluated(schCxt, valid);
	                if (ifClause)
	                    gen.assign(ifClause, (0, codegen_1._) `${keyword}`);
	                else
	                    cxt.setParams({ ifClause: keyword });
	            };
	        }
	    },
	};
	function hasSchema(it, keyword) {
	    const schema = it.schema[keyword];
	    return schema !== undefined && !(0, util_1.alwaysValidSchema)(it, schema);
	}
	_if.default = def;
	
	return _if;
}

var thenElse = {};

var hasRequiredThenElse;

function requireThenElse () {
	if (hasRequiredThenElse) return thenElse;
	hasRequiredThenElse = 1;
	Object.defineProperty(thenElse, "__esModule", { value: true });
	const util_1 = /*@__PURE__*/ requireUtil();
	const def = {
	    keyword: ["then", "else"],
	    schemaType: ["object", "boolean"],
	    code({ keyword, parentSchema, it }) {
	        if (parentSchema.if === undefined)
	            (0, util_1.checkStrictMode)(it, `"${keyword}" without "if" is ignored`);
	    },
	};
	thenElse.default = def;
	
	return thenElse;
}

var hasRequiredApplicator;

function requireApplicator () {
	if (hasRequiredApplicator) return applicator;
	hasRequiredApplicator = 1;
	Object.defineProperty(applicator, "__esModule", { value: true });
	const additionalItems_1 = /*@__PURE__*/ requireAdditionalItems();
	const prefixItems_1 = /*@__PURE__*/ requirePrefixItems();
	const items_1 = /*@__PURE__*/ requireItems();
	const items2020_1 = /*@__PURE__*/ requireItems2020();
	const contains_1 = /*@__PURE__*/ requireContains();
	const dependencies_1 = /*@__PURE__*/ requireDependencies();
	const propertyNames_1 = /*@__PURE__*/ requirePropertyNames();
	const additionalProperties_1 = /*@__PURE__*/ requireAdditionalProperties();
	const properties_1 = /*@__PURE__*/ requireProperties();
	const patternProperties_1 = /*@__PURE__*/ requirePatternProperties();
	const not_1 = /*@__PURE__*/ requireNot();
	const anyOf_1 = /*@__PURE__*/ requireAnyOf();
	const oneOf_1 = /*@__PURE__*/ requireOneOf();
	const allOf_1 = /*@__PURE__*/ requireAllOf();
	const if_1 = /*@__PURE__*/ require_if();
	const thenElse_1 = /*@__PURE__*/ requireThenElse();
	function getApplicator(draft2020 = false) {
	    const applicator = [
	        // any
	        not_1.default,
	        anyOf_1.default,
	        oneOf_1.default,
	        allOf_1.default,
	        if_1.default,
	        thenElse_1.default,
	        // object
	        propertyNames_1.default,
	        additionalProperties_1.default,
	        dependencies_1.default,
	        properties_1.default,
	        patternProperties_1.default,
	    ];
	    // array
	    if (draft2020)
	        applicator.push(prefixItems_1.default, items2020_1.default);
	    else
	        applicator.push(additionalItems_1.default, items_1.default);
	    applicator.push(contains_1.default);
	    return applicator;
	}
	applicator.default = getApplicator;
	
	return applicator;
}

var dynamic = {};

var dynamicAnchor = {};

var hasRequiredDynamicAnchor;

function requireDynamicAnchor () {
	if (hasRequiredDynamicAnchor) return dynamicAnchor;
	hasRequiredDynamicAnchor = 1;
	Object.defineProperty(dynamicAnchor, "__esModule", { value: true });
	dynamicAnchor.dynamicAnchor = void 0;
	const codegen_1 = /*@__PURE__*/ requireCodegen();
	const names_1 = /*@__PURE__*/ requireNames();
	const compile_1 = /*@__PURE__*/ requireCompile();
	const ref_1 = /*@__PURE__*/ requireRef();
	const def = {
	    keyword: "$dynamicAnchor",
	    schemaType: "string",
	    code: (cxt) => dynamicAnchor$1(cxt, cxt.schema),
	};
	function dynamicAnchor$1(cxt, anchor) {
	    const { gen, it } = cxt;
	    it.schemaEnv.root.dynamicAnchors[anchor] = true;
	    const v = (0, codegen_1._) `${names_1.default.dynamicAnchors}${(0, codegen_1.getProperty)(anchor)}`;
	    const validate = it.errSchemaPath === "#" ? it.validateName : _getValidate(cxt);
	    gen.if((0, codegen_1._) `!${v}`, () => gen.assign(v, validate));
	}
	dynamicAnchor.dynamicAnchor = dynamicAnchor$1;
	function _getValidate(cxt) {
	    const { schemaEnv, schema, self } = cxt.it;
	    const { root, baseId, localRefs, meta } = schemaEnv.root;
	    const { schemaId } = self.opts;
	    const sch = new compile_1.SchemaEnv({ schema, schemaId, root, baseId, localRefs, meta });
	    compile_1.compileSchema.call(self, sch);
	    return (0, ref_1.getValidate)(cxt, sch);
	}
	dynamicAnchor.default = def;
	
	return dynamicAnchor;
}

var dynamicRef = {};

var hasRequiredDynamicRef;

function requireDynamicRef () {
	if (hasRequiredDynamicRef) return dynamicRef;
	hasRequiredDynamicRef = 1;
	Object.defineProperty(dynamicRef, "__esModule", { value: true });
	dynamicRef.dynamicRef = void 0;
	const codegen_1 = /*@__PURE__*/ requireCodegen();
	const names_1 = /*@__PURE__*/ requireNames();
	const ref_1 = /*@__PURE__*/ requireRef();
	const def = {
	    keyword: "$dynamicRef",
	    schemaType: "string",
	    code: (cxt) => dynamicRef$1(cxt, cxt.schema),
	};
	function dynamicRef$1(cxt, ref) {
	    const { gen, keyword, it } = cxt;
	    if (ref[0] !== "#")
	        throw new Error(`"${keyword}" only supports hash fragment reference`);
	    const anchor = ref.slice(1);
	    if (it.allErrors) {
	        _dynamicRef();
	    }
	    else {
	        const valid = gen.let("valid", false);
	        _dynamicRef(valid);
	        cxt.ok(valid);
	    }
	    function _dynamicRef(valid) {
	        // TODO the assumption here is that `recursiveRef: #` always points to the root
	        // of the schema object, which is not correct, because there may be $id that
	        // makes # point to it, and the target schema may not contain dynamic/recursiveAnchor.
	        // Because of that 2 tests in recursiveRef.json fail.
	        // This is a similar problem to #815 (`$id` doesn't alter resolution scope for `{ "$ref": "#" }`).
	        // (This problem is not tested in JSON-Schema-Test-Suite)
	        if (it.schemaEnv.root.dynamicAnchors[anchor]) {
	            const v = gen.let("_v", (0, codegen_1._) `${names_1.default.dynamicAnchors}${(0, codegen_1.getProperty)(anchor)}`);
	            gen.if(v, _callRef(v, valid), _callRef(it.validateName, valid));
	        }
	        else {
	            _callRef(it.validateName, valid)();
	        }
	    }
	    function _callRef(validate, valid) {
	        return valid
	            ? () => gen.block(() => {
	                (0, ref_1.callRef)(cxt, validate);
	                gen.let(valid, true);
	            })
	            : () => (0, ref_1.callRef)(cxt, validate);
	    }
	}
	dynamicRef.dynamicRef = dynamicRef$1;
	dynamicRef.default = def;
	
	return dynamicRef;
}

var recursiveAnchor = {};

var hasRequiredRecursiveAnchor;

function requireRecursiveAnchor () {
	if (hasRequiredRecursiveAnchor) return recursiveAnchor;
	hasRequiredRecursiveAnchor = 1;
	Object.defineProperty(recursiveAnchor, "__esModule", { value: true });
	const dynamicAnchor_1 = /*@__PURE__*/ requireDynamicAnchor();
	const util_1 = /*@__PURE__*/ requireUtil();
	const def = {
	    keyword: "$recursiveAnchor",
	    schemaType: "boolean",
	    code(cxt) {
	        if (cxt.schema)
	            (0, dynamicAnchor_1.dynamicAnchor)(cxt, "");
	        else
	            (0, util_1.checkStrictMode)(cxt.it, "$recursiveAnchor: false is ignored");
	    },
	};
	recursiveAnchor.default = def;
	
	return recursiveAnchor;
}

var recursiveRef = {};

var hasRequiredRecursiveRef;

function requireRecursiveRef () {
	if (hasRequiredRecursiveRef) return recursiveRef;
	hasRequiredRecursiveRef = 1;
	Object.defineProperty(recursiveRef, "__esModule", { value: true });
	const dynamicRef_1 = /*@__PURE__*/ requireDynamicRef();
	const def = {
	    keyword: "$recursiveRef",
	    schemaType: "string",
	    code: (cxt) => (0, dynamicRef_1.dynamicRef)(cxt, cxt.schema),
	};
	recursiveRef.default = def;
	
	return recursiveRef;
}

var hasRequiredDynamic;

function requireDynamic () {
	if (hasRequiredDynamic) return dynamic;
	hasRequiredDynamic = 1;
	Object.defineProperty(dynamic, "__esModule", { value: true });
	const dynamicAnchor_1 = /*@__PURE__*/ requireDynamicAnchor();
	const dynamicRef_1 = /*@__PURE__*/ requireDynamicRef();
	const recursiveAnchor_1 = /*@__PURE__*/ requireRecursiveAnchor();
	const recursiveRef_1 = /*@__PURE__*/ requireRecursiveRef();
	const dynamic$1 = [dynamicAnchor_1.default, dynamicRef_1.default, recursiveAnchor_1.default, recursiveRef_1.default];
	dynamic.default = dynamic$1;
	
	return dynamic;
}

var next = {};

var dependentRequired = {};

var hasRequiredDependentRequired;

function requireDependentRequired () {
	if (hasRequiredDependentRequired) return dependentRequired;
	hasRequiredDependentRequired = 1;
	Object.defineProperty(dependentRequired, "__esModule", { value: true });
	const dependencies_1 = /*@__PURE__*/ requireDependencies();
	const def = {
	    keyword: "dependentRequired",
	    type: "object",
	    schemaType: "object",
	    error: dependencies_1.error,
	    code: (cxt) => (0, dependencies_1.validatePropertyDeps)(cxt),
	};
	dependentRequired.default = def;
	
	return dependentRequired;
}

var dependentSchemas = {};

var hasRequiredDependentSchemas;

function requireDependentSchemas () {
	if (hasRequiredDependentSchemas) return dependentSchemas;
	hasRequiredDependentSchemas = 1;
	Object.defineProperty(dependentSchemas, "__esModule", { value: true });
	const dependencies_1 = /*@__PURE__*/ requireDependencies();
	const def = {
	    keyword: "dependentSchemas",
	    type: "object",
	    schemaType: "object",
	    code: (cxt) => (0, dependencies_1.validateSchemaDeps)(cxt),
	};
	dependentSchemas.default = def;
	
	return dependentSchemas;
}

var limitContains = {};

var hasRequiredLimitContains;

function requireLimitContains () {
	if (hasRequiredLimitContains) return limitContains;
	hasRequiredLimitContains = 1;
	Object.defineProperty(limitContains, "__esModule", { value: true });
	const util_1 = /*@__PURE__*/ requireUtil();
	const def = {
	    keyword: ["maxContains", "minContains"],
	    type: "array",
	    schemaType: "number",
	    code({ keyword, parentSchema, it }) {
	        if (parentSchema.contains === undefined) {
	            (0, util_1.checkStrictMode)(it, `"${keyword}" without "contains" is ignored`);
	        }
	    },
	};
	limitContains.default = def;
	
	return limitContains;
}

var hasRequiredNext;

function requireNext () {
	if (hasRequiredNext) return next;
	hasRequiredNext = 1;
	Object.defineProperty(next, "__esModule", { value: true });
	const dependentRequired_1 = /*@__PURE__*/ requireDependentRequired();
	const dependentSchemas_1 = /*@__PURE__*/ requireDependentSchemas();
	const limitContains_1 = /*@__PURE__*/ requireLimitContains();
	const next$1 = [dependentRequired_1.default, dependentSchemas_1.default, limitContains_1.default];
	next.default = next$1;
	
	return next;
}

var unevaluated = {};

var unevaluatedProperties = {};

var hasRequiredUnevaluatedProperties;

function requireUnevaluatedProperties () {
	if (hasRequiredUnevaluatedProperties) return unevaluatedProperties;
	hasRequiredUnevaluatedProperties = 1;
	Object.defineProperty(unevaluatedProperties, "__esModule", { value: true });
	const codegen_1 = /*@__PURE__*/ requireCodegen();
	const util_1 = /*@__PURE__*/ requireUtil();
	const names_1 = /*@__PURE__*/ requireNames();
	const error = {
	    message: "must NOT have unevaluated properties",
	    params: ({ params }) => (0, codegen_1._) `{unevaluatedProperty: ${params.unevaluatedProperty}}`,
	};
	const def = {
	    keyword: "unevaluatedProperties",
	    type: "object",
	    schemaType: ["boolean", "object"],
	    trackErrors: true,
	    error,
	    code(cxt) {
	        const { gen, schema, data, errsCount, it } = cxt;
	        /* istanbul ignore if */
	        if (!errsCount)
	            throw new Error("ajv implementation error");
	        const { allErrors, props } = it;
	        if (props instanceof codegen_1.Name) {
	            gen.if((0, codegen_1._) `${props} !== true`, () => gen.forIn("key", data, (key) => gen.if(unevaluatedDynamic(props, key), () => unevaluatedPropCode(key))));
	        }
	        else if (props !== true) {
	            gen.forIn("key", data, (key) => props === undefined
	                ? unevaluatedPropCode(key)
	                : gen.if(unevaluatedStatic(props, key), () => unevaluatedPropCode(key)));
	        }
	        it.props = true;
	        cxt.ok((0, codegen_1._) `${errsCount} === ${names_1.default.errors}`);
	        function unevaluatedPropCode(key) {
	            if (schema === false) {
	                cxt.setParams({ unevaluatedProperty: key });
	                cxt.error();
	                if (!allErrors)
	                    gen.break();
	                return;
	            }
	            if (!(0, util_1.alwaysValidSchema)(it, schema)) {
	                const valid = gen.name("valid");
	                cxt.subschema({
	                    keyword: "unevaluatedProperties",
	                    dataProp: key,
	                    dataPropType: util_1.Type.Str,
	                }, valid);
	                if (!allErrors)
	                    gen.if((0, codegen_1.not)(valid), () => gen.break());
	            }
	        }
	        function unevaluatedDynamic(evaluatedProps, key) {
	            return (0, codegen_1._) `!${evaluatedProps} || !${evaluatedProps}[${key}]`;
	        }
	        function unevaluatedStatic(evaluatedProps, key) {
	            const ps = [];
	            for (const p in evaluatedProps) {
	                if (evaluatedProps[p] === true)
	                    ps.push((0, codegen_1._) `${key} !== ${p}`);
	            }
	            return (0, codegen_1.and)(...ps);
	        }
	    },
	};
	unevaluatedProperties.default = def;
	
	return unevaluatedProperties;
}

var unevaluatedItems = {};

var hasRequiredUnevaluatedItems;

function requireUnevaluatedItems () {
	if (hasRequiredUnevaluatedItems) return unevaluatedItems;
	hasRequiredUnevaluatedItems = 1;
	Object.defineProperty(unevaluatedItems, "__esModule", { value: true });
	const codegen_1 = /*@__PURE__*/ requireCodegen();
	const util_1 = /*@__PURE__*/ requireUtil();
	const error = {
	    message: ({ params: { len } }) => (0, codegen_1.str) `must NOT have more than ${len} items`,
	    params: ({ params: { len } }) => (0, codegen_1._) `{limit: ${len}}`,
	};
	const def = {
	    keyword: "unevaluatedItems",
	    type: "array",
	    schemaType: ["boolean", "object"],
	    error,
	    code(cxt) {
	        const { gen, schema, data, it } = cxt;
	        const items = it.items || 0;
	        if (items === true)
	            return;
	        const len = gen.const("len", (0, codegen_1._) `${data}.length`);
	        if (schema === false) {
	            cxt.setParams({ len: items });
	            cxt.fail((0, codegen_1._) `${len} > ${items}`);
	        }
	        else if (typeof schema == "object" && !(0, util_1.alwaysValidSchema)(it, schema)) {
	            const valid = gen.var("valid", (0, codegen_1._) `${len} <= ${items}`);
	            gen.if((0, codegen_1.not)(valid), () => validateItems(valid, items));
	            cxt.ok(valid);
	        }
	        it.items = true;
	        function validateItems(valid, from) {
	            gen.forRange("i", from, len, (i) => {
	                cxt.subschema({ keyword: "unevaluatedItems", dataProp: i, dataPropType: util_1.Type.Num }, valid);
	                if (!it.allErrors)
	                    gen.if((0, codegen_1.not)(valid), () => gen.break());
	            });
	        }
	    },
	};
	unevaluatedItems.default = def;
	
	return unevaluatedItems;
}

var hasRequiredUnevaluated;

function requireUnevaluated () {
	if (hasRequiredUnevaluated) return unevaluated;
	hasRequiredUnevaluated = 1;
	Object.defineProperty(unevaluated, "__esModule", { value: true });
	const unevaluatedProperties_1 = /*@__PURE__*/ requireUnevaluatedProperties();
	const unevaluatedItems_1 = /*@__PURE__*/ requireUnevaluatedItems();
	const unevaluated$1 = [unevaluatedProperties_1.default, unevaluatedItems_1.default];
	unevaluated.default = unevaluated$1;
	
	return unevaluated;
}

var format$1 = {};

var format = {};

var hasRequiredFormat$1;

function requireFormat$1 () {
	if (hasRequiredFormat$1) return format;
	hasRequiredFormat$1 = 1;
	Object.defineProperty(format, "__esModule", { value: true });
	const codegen_1 = /*@__PURE__*/ requireCodegen();
	const error = {
	    message: ({ schemaCode }) => (0, codegen_1.str) `must match format "${schemaCode}"`,
	    params: ({ schemaCode }) => (0, codegen_1._) `{format: ${schemaCode}}`,
	};
	const def = {
	    keyword: "format",
	    type: ["number", "string"],
	    schemaType: "string",
	    $data: true,
	    error,
	    code(cxt, ruleType) {
	        const { gen, data, $data, schema, schemaCode, it } = cxt;
	        const { opts, errSchemaPath, schemaEnv, self } = it;
	        if (!opts.validateFormats)
	            return;
	        if ($data)
	            validate$DataFormat();
	        else
	            validateFormat();
	        function validate$DataFormat() {
	            const fmts = gen.scopeValue("formats", {
	                ref: self.formats,
	                code: opts.code.formats,
	            });
	            const fDef = gen.const("fDef", (0, codegen_1._) `${fmts}[${schemaCode}]`);
	            const fType = gen.let("fType");
	            const format = gen.let("format");
	            // TODO simplify
	            gen.if((0, codegen_1._) `typeof ${fDef} == "object" && !(${fDef} instanceof RegExp)`, () => gen.assign(fType, (0, codegen_1._) `${fDef}.type || "string"`).assign(format, (0, codegen_1._) `${fDef}.validate`), () => gen.assign(fType, (0, codegen_1._) `"string"`).assign(format, fDef));
	            cxt.fail$data((0, codegen_1.or)(unknownFmt(), invalidFmt()));
	            function unknownFmt() {
	                if (opts.strictSchema === false)
	                    return codegen_1.nil;
	                return (0, codegen_1._) `${schemaCode} && !${format}`;
	            }
	            function invalidFmt() {
	                const callFormat = schemaEnv.$async
	                    ? (0, codegen_1._) `(${fDef}.async ? await ${format}(${data}) : ${format}(${data}))`
	                    : (0, codegen_1._) `${format}(${data})`;
	                const validData = (0, codegen_1._) `(typeof ${format} == "function" ? ${callFormat} : ${format}.test(${data}))`;
	                return (0, codegen_1._) `${format} && ${format} !== true && ${fType} === ${ruleType} && !${validData}`;
	            }
	        }
	        function validateFormat() {
	            const formatDef = self.formats[schema];
	            if (!formatDef) {
	                unknownFormat();
	                return;
	            }
	            if (formatDef === true)
	                return;
	            const [fmtType, format, fmtRef] = getFormat(formatDef);
	            if (fmtType === ruleType)
	                cxt.pass(validCondition());
	            function unknownFormat() {
	                if (opts.strictSchema === false) {
	                    self.logger.warn(unknownMsg());
	                    return;
	                }
	                throw new Error(unknownMsg());
	                function unknownMsg() {
	                    return `unknown format "${schema}" ignored in schema at path "${errSchemaPath}"`;
	                }
	            }
	            function getFormat(fmtDef) {
	                const code = fmtDef instanceof RegExp
	                    ? (0, codegen_1.regexpCode)(fmtDef)
	                    : opts.code.formats
	                        ? (0, codegen_1._) `${opts.code.formats}${(0, codegen_1.getProperty)(schema)}`
	                        : undefined;
	                const fmt = gen.scopeValue("formats", { key: schema, ref: fmtDef, code });
	                if (typeof fmtDef == "object" && !(fmtDef instanceof RegExp)) {
	                    return [fmtDef.type || "string", fmtDef.validate, (0, codegen_1._) `${fmt}.validate`];
	                }
	                return ["string", fmtDef, fmt];
	            }
	            function validCondition() {
	                if (typeof formatDef == "object" && !(formatDef instanceof RegExp) && formatDef.async) {
	                    if (!schemaEnv.$async)
	                        throw new Error("async format in sync schema");
	                    return (0, codegen_1._) `await ${fmtRef}(${data})`;
	                }
	                return typeof format == "function" ? (0, codegen_1._) `${fmtRef}(${data})` : (0, codegen_1._) `${fmtRef}.test(${data})`;
	            }
	        }
	    },
	};
	format.default = def;
	
	return format;
}

var hasRequiredFormat;

function requireFormat () {
	if (hasRequiredFormat) return format$1;
	hasRequiredFormat = 1;
	Object.defineProperty(format$1, "__esModule", { value: true });
	const format_1 = /*@__PURE__*/ requireFormat$1();
	const format = [format_1.default];
	format$1.default = format;
	
	return format$1;
}

var metadata = {};

var hasRequiredMetadata;

function requireMetadata () {
	if (hasRequiredMetadata) return metadata;
	hasRequiredMetadata = 1;
	Object.defineProperty(metadata, "__esModule", { value: true });
	metadata.contentVocabulary = metadata.metadataVocabulary = void 0;
	metadata.metadataVocabulary = [
	    "title",
	    "description",
	    "default",
	    "deprecated",
	    "readOnly",
	    "writeOnly",
	    "examples",
	];
	metadata.contentVocabulary = [
	    "contentMediaType",
	    "contentEncoding",
	    "contentSchema",
	];
	
	return metadata;
}

var hasRequiredDraft2020;

function requireDraft2020 () {
	if (hasRequiredDraft2020) return draft2020;
	hasRequiredDraft2020 = 1;
	Object.defineProperty(draft2020, "__esModule", { value: true });
	const core_1 = /*@__PURE__*/ requireCore();
	const validation_1 = /*@__PURE__*/ requireValidation();
	const applicator_1 = /*@__PURE__*/ requireApplicator();
	const dynamic_1 = /*@__PURE__*/ requireDynamic();
	const next_1 = /*@__PURE__*/ requireNext();
	const unevaluated_1 = /*@__PURE__*/ requireUnevaluated();
	const format_1 = /*@__PURE__*/ requireFormat();
	const metadata_1 = /*@__PURE__*/ requireMetadata();
	const draft2020Vocabularies = [
	    dynamic_1.default,
	    core_1.default,
	    validation_1.default,
	    (0, applicator_1.default)(true),
	    format_1.default,
	    metadata_1.metadataVocabulary,
	    metadata_1.contentVocabulary,
	    next_1.default,
	    unevaluated_1.default,
	];
	draft2020.default = draft2020Vocabularies;
	
	return draft2020;
}

var discriminator = {};

var types = {};

var hasRequiredTypes;

function requireTypes () {
	if (hasRequiredTypes) return types;
	hasRequiredTypes = 1;
	Object.defineProperty(types, "__esModule", { value: true });
	types.DiscrError = void 0;
	var DiscrError;
	(function (DiscrError) {
	    DiscrError["Tag"] = "tag";
	    DiscrError["Mapping"] = "mapping";
	})(DiscrError || (types.DiscrError = DiscrError = {}));
	
	return types;
}

var hasRequiredDiscriminator;

function requireDiscriminator () {
	if (hasRequiredDiscriminator) return discriminator;
	hasRequiredDiscriminator = 1;
	Object.defineProperty(discriminator, "__esModule", { value: true });
	const codegen_1 = /*@__PURE__*/ requireCodegen();
	const types_1 = /*@__PURE__*/ requireTypes();
	const compile_1 = /*@__PURE__*/ requireCompile();
	const ref_error_1 = /*@__PURE__*/ requireRef_error();
	const util_1 = /*@__PURE__*/ requireUtil();
	const error = {
	    message: ({ params: { discrError, tagName } }) => discrError === types_1.DiscrError.Tag
	        ? `tag "${tagName}" must be string`
	        : `value of tag "${tagName}" must be in oneOf`,
	    params: ({ params: { discrError, tag, tagName } }) => (0, codegen_1._) `{error: ${discrError}, tag: ${tagName}, tagValue: ${tag}}`,
	};
	const def = {
	    keyword: "discriminator",
	    type: "object",
	    schemaType: "object",
	    error,
	    code(cxt) {
	        const { gen, data, schema, parentSchema, it } = cxt;
	        const { oneOf } = parentSchema;
	        if (!it.opts.discriminator) {
	            throw new Error("discriminator: requires discriminator option");
	        }
	        const tagName = schema.propertyName;
	        if (typeof tagName != "string")
	            throw new Error("discriminator: requires propertyName");
	        if (schema.mapping)
	            throw new Error("discriminator: mapping is not supported");
	        if (!oneOf)
	            throw new Error("discriminator: requires oneOf keyword");
	        const valid = gen.let("valid", false);
	        const tag = gen.const("tag", (0, codegen_1._) `${data}${(0, codegen_1.getProperty)(tagName)}`);
	        gen.if((0, codegen_1._) `typeof ${tag} == "string"`, () => validateMapping(), () => cxt.error(false, { discrError: types_1.DiscrError.Tag, tag, tagName }));
	        cxt.ok(valid);
	        function validateMapping() {
	            const mapping = getMapping();
	            gen.if(false);
	            for (const tagValue in mapping) {
	                gen.elseIf((0, codegen_1._) `${tag} === ${tagValue}`);
	                gen.assign(valid, applyTagSchema(mapping[tagValue]));
	            }
	            gen.else();
	            cxt.error(false, { discrError: types_1.DiscrError.Mapping, tag, tagName });
	            gen.endIf();
	        }
	        function applyTagSchema(schemaProp) {
	            const _valid = gen.name("valid");
	            const schCxt = cxt.subschema({ keyword: "oneOf", schemaProp }, _valid);
	            cxt.mergeEvaluated(schCxt, codegen_1.Name);
	            return _valid;
	        }
	        function getMapping() {
	            var _a;
	            const oneOfMapping = {};
	            const topRequired = hasRequired(parentSchema);
	            let tagRequired = true;
	            for (let i = 0; i < oneOf.length; i++) {
	                let sch = oneOf[i];
	                if ((sch === null || sch === void 0 ? void 0 : sch.$ref) && !(0, util_1.schemaHasRulesButRef)(sch, it.self.RULES)) {
	                    const ref = sch.$ref;
	                    sch = compile_1.resolveRef.call(it.self, it.schemaEnv.root, it.baseId, ref);
	                    if (sch instanceof compile_1.SchemaEnv)
	                        sch = sch.schema;
	                    if (sch === undefined)
	                        throw new ref_error_1.default(it.opts.uriResolver, it.baseId, ref);
	                }
	                const propSch = (_a = sch === null || sch === void 0 ? void 0 : sch.properties) === null || _a === void 0 ? void 0 : _a[tagName];
	                if (typeof propSch != "object") {
	                    throw new Error(`discriminator: oneOf subschemas (or referenced schemas) must have "properties/${tagName}"`);
	                }
	                tagRequired = tagRequired && (topRequired || hasRequired(sch));
	                addMappings(propSch, i);
	            }
	            if (!tagRequired)
	                throw new Error(`discriminator: "${tagName}" must be required`);
	            return oneOfMapping;
	            function hasRequired({ required }) {
	                return Array.isArray(required) && required.includes(tagName);
	            }
	            function addMappings(sch, i) {
	                if (sch.const) {
	                    addMapping(sch.const, i);
	                }
	                else if (sch.enum) {
	                    for (const tagValue of sch.enum) {
	                        addMapping(tagValue, i);
	                    }
	                }
	                else {
	                    throw new Error(`discriminator: "properties/${tagName}" must have "const" or "enum"`);
	                }
	            }
	            function addMapping(tagValue, i) {
	                if (typeof tagValue != "string" || tagValue in oneOfMapping) {
	                    throw new Error(`discriminator: "${tagName}" values must be unique strings`);
	                }
	                oneOfMapping[tagValue] = i;
	            }
	        }
	    },
	};
	discriminator.default = def;
	
	return discriminator;
}

var jsonSchema202012 = {};

var $schema$9 = "https://json-schema.org/draft/2020-12/schema";
var $id$9 = "https://json-schema.org/draft/2020-12/schema";
var $vocabulary$7 = {
	"https://json-schema.org/draft/2020-12/vocab/core": true,
	"https://json-schema.org/draft/2020-12/vocab/applicator": true,
	"https://json-schema.org/draft/2020-12/vocab/unevaluated": true,
	"https://json-schema.org/draft/2020-12/vocab/validation": true,
	"https://json-schema.org/draft/2020-12/vocab/meta-data": true,
	"https://json-schema.org/draft/2020-12/vocab/format-annotation": true,
	"https://json-schema.org/draft/2020-12/vocab/content": true
};
var $dynamicAnchor$7 = "meta";
var title$9 = "Core and Validation specifications meta-schema";
var allOf = [
	{
		$ref: "meta/core"
	},
	{
		$ref: "meta/applicator"
	},
	{
		$ref: "meta/unevaluated"
	},
	{
		$ref: "meta/validation"
	},
	{
		$ref: "meta/meta-data"
	},
	{
		$ref: "meta/format-annotation"
	},
	{
		$ref: "meta/content"
	}
];
var type$9 = [
	"object",
	"boolean"
];
var $comment = "This meta-schema also defines keywords that have appeared in previous drafts in order to prevent incompatible extensions as they remain in common use.";
var properties$9 = {
	definitions: {
		$comment: "\"definitions\" has been replaced by \"$defs\".",
		type: "object",
		additionalProperties: {
			$dynamicRef: "#meta"
		},
		deprecated: true,
		"default": {
		}
	},
	dependencies: {
		$comment: "\"dependencies\" has been split and replaced by \"dependentSchemas\" and \"dependentRequired\" in order to serve their differing semantics.",
		type: "object",
		additionalProperties: {
			anyOf: [
				{
					$dynamicRef: "#meta"
				},
				{
					$ref: "meta/validation#/$defs/stringArray"
				}
			]
		},
		deprecated: true,
		"default": {
		}
	},
	$recursiveAnchor: {
		$comment: "\"$recursiveAnchor\" has been replaced by \"$dynamicAnchor\".",
		$ref: "meta/core#/$defs/anchorString",
		deprecated: true
	},
	$recursiveRef: {
		$comment: "\"$recursiveRef\" has been replaced by \"$dynamicRef\".",
		$ref: "meta/core#/$defs/uriReferenceString",
		deprecated: true
	}
};
var require$$0 = {
	$schema: $schema$9,
	$id: $id$9,
	$vocabulary: $vocabulary$7,
	$dynamicAnchor: $dynamicAnchor$7,
	title: title$9,
	allOf: allOf,
	type: type$9,
	$comment: $comment,
	properties: properties$9
};

var $schema$8 = "https://json-schema.org/draft/2020-12/schema";
var $id$8 = "https://json-schema.org/draft/2020-12/meta/applicator";
var $vocabulary$6 = {
	"https://json-schema.org/draft/2020-12/vocab/applicator": true
};
var $dynamicAnchor$6 = "meta";
var title$8 = "Applicator vocabulary meta-schema";
var type$8 = [
	"object",
	"boolean"
];
var properties$8 = {
	prefixItems: {
		$ref: "#/$defs/schemaArray"
	},
	items: {
		$dynamicRef: "#meta"
	},
	contains: {
		$dynamicRef: "#meta"
	},
	additionalProperties: {
		$dynamicRef: "#meta"
	},
	properties: {
		type: "object",
		additionalProperties: {
			$dynamicRef: "#meta"
		},
		"default": {
		}
	},
	patternProperties: {
		type: "object",
		additionalProperties: {
			$dynamicRef: "#meta"
		},
		propertyNames: {
			format: "regex"
		},
		"default": {
		}
	},
	dependentSchemas: {
		type: "object",
		additionalProperties: {
			$dynamicRef: "#meta"
		},
		"default": {
		}
	},
	propertyNames: {
		$dynamicRef: "#meta"
	},
	"if": {
		$dynamicRef: "#meta"
	},
	then: {
		$dynamicRef: "#meta"
	},
	"else": {
		$dynamicRef: "#meta"
	},
	allOf: {
		$ref: "#/$defs/schemaArray"
	},
	anyOf: {
		$ref: "#/$defs/schemaArray"
	},
	oneOf: {
		$ref: "#/$defs/schemaArray"
	},
	not: {
		$dynamicRef: "#meta"
	}
};
var $defs$4 = {
	schemaArray: {
		type: "array",
		minItems: 1,
		items: {
			$dynamicRef: "#meta"
		}
	}
};
var require$$1 = {
	$schema: $schema$8,
	$id: $id$8,
	$vocabulary: $vocabulary$6,
	$dynamicAnchor: $dynamicAnchor$6,
	title: title$8,
	type: type$8,
	properties: properties$8,
	$defs: $defs$4
};

var $schema$7 = "https://json-schema.org/draft/2020-12/schema";
var $id$7 = "https://json-schema.org/draft/2020-12/meta/unevaluated";
var $vocabulary$5 = {
	"https://json-schema.org/draft/2020-12/vocab/unevaluated": true
};
var $dynamicAnchor$5 = "meta";
var title$7 = "Unevaluated applicator vocabulary meta-schema";
var type$7 = [
	"object",
	"boolean"
];
var properties$7 = {
	unevaluatedItems: {
		$dynamicRef: "#meta"
	},
	unevaluatedProperties: {
		$dynamicRef: "#meta"
	}
};
var require$$2 = {
	$schema: $schema$7,
	$id: $id$7,
	$vocabulary: $vocabulary$5,
	$dynamicAnchor: $dynamicAnchor$5,
	title: title$7,
	type: type$7,
	properties: properties$7
};

var $schema$6 = "https://json-schema.org/draft/2020-12/schema";
var $id$6 = "https://json-schema.org/draft/2020-12/meta/content";
var $vocabulary$4 = {
	"https://json-schema.org/draft/2020-12/vocab/content": true
};
var $dynamicAnchor$4 = "meta";
var title$6 = "Content vocabulary meta-schema";
var type$6 = [
	"object",
	"boolean"
];
var properties$6 = {
	contentEncoding: {
		type: "string"
	},
	contentMediaType: {
		type: "string"
	},
	contentSchema: {
		$dynamicRef: "#meta"
	}
};
var require$$3 = {
	$schema: $schema$6,
	$id: $id$6,
	$vocabulary: $vocabulary$4,
	$dynamicAnchor: $dynamicAnchor$4,
	title: title$6,
	type: type$6,
	properties: properties$6
};

var $schema$5 = "https://json-schema.org/draft/2020-12/schema";
var $id$5 = "https://json-schema.org/draft/2020-12/meta/core";
var $vocabulary$3 = {
	"https://json-schema.org/draft/2020-12/vocab/core": true
};
var $dynamicAnchor$3 = "meta";
var title$5 = "Core vocabulary meta-schema";
var type$5 = [
	"object",
	"boolean"
];
var properties$5 = {
	$id: {
		$ref: "#/$defs/uriReferenceString",
		$comment: "Non-empty fragments not allowed.",
		pattern: "^[^#]*#?$"
	},
	$schema: {
		$ref: "#/$defs/uriString"
	},
	$ref: {
		$ref: "#/$defs/uriReferenceString"
	},
	$anchor: {
		$ref: "#/$defs/anchorString"
	},
	$dynamicRef: {
		$ref: "#/$defs/uriReferenceString"
	},
	$dynamicAnchor: {
		$ref: "#/$defs/anchorString"
	},
	$vocabulary: {
		type: "object",
		propertyNames: {
			$ref: "#/$defs/uriString"
		},
		additionalProperties: {
			type: "boolean"
		}
	},
	$comment: {
		type: "string"
	},
	$defs: {
		type: "object",
		additionalProperties: {
			$dynamicRef: "#meta"
		}
	}
};
var $defs$3 = {
	anchorString: {
		type: "string",
		pattern: "^[A-Za-z_][-A-Za-z0-9._]*$"
	},
	uriString: {
		type: "string",
		format: "uri"
	},
	uriReferenceString: {
		type: "string",
		format: "uri-reference"
	}
};
var require$$4 = {
	$schema: $schema$5,
	$id: $id$5,
	$vocabulary: $vocabulary$3,
	$dynamicAnchor: $dynamicAnchor$3,
	title: title$5,
	type: type$5,
	properties: properties$5,
	$defs: $defs$3
};

var $schema$4 = "https://json-schema.org/draft/2020-12/schema";
var $id$4 = "https://json-schema.org/draft/2020-12/meta/format-annotation";
var $vocabulary$2 = {
	"https://json-schema.org/draft/2020-12/vocab/format-annotation": true
};
var $dynamicAnchor$2 = "meta";
var title$4 = "Format vocabulary meta-schema for annotation results";
var type$4 = [
	"object",
	"boolean"
];
var properties$4 = {
	format: {
		type: "string"
	}
};
var require$$5 = {
	$schema: $schema$4,
	$id: $id$4,
	$vocabulary: $vocabulary$2,
	$dynamicAnchor: $dynamicAnchor$2,
	title: title$4,
	type: type$4,
	properties: properties$4
};

var $schema$3 = "https://json-schema.org/draft/2020-12/schema";
var $id$3 = "https://json-schema.org/draft/2020-12/meta/meta-data";
var $vocabulary$1 = {
	"https://json-schema.org/draft/2020-12/vocab/meta-data": true
};
var $dynamicAnchor$1 = "meta";
var title$3 = "Meta-data vocabulary meta-schema";
var type$3 = [
	"object",
	"boolean"
];
var properties$3 = {
	title: {
		type: "string"
	},
	description: {
		type: "string"
	},
	"default": true,
	deprecated: {
		type: "boolean",
		"default": false
	},
	readOnly: {
		type: "boolean",
		"default": false
	},
	writeOnly: {
		type: "boolean",
		"default": false
	},
	examples: {
		type: "array",
		items: true
	}
};
var require$$6 = {
	$schema: $schema$3,
	$id: $id$3,
	$vocabulary: $vocabulary$1,
	$dynamicAnchor: $dynamicAnchor$1,
	title: title$3,
	type: type$3,
	properties: properties$3
};

var $schema$2 = "https://json-schema.org/draft/2020-12/schema";
var $id$2 = "https://json-schema.org/draft/2020-12/meta/validation";
var $vocabulary = {
	"https://json-schema.org/draft/2020-12/vocab/validation": true
};
var $dynamicAnchor = "meta";
var title$2 = "Validation vocabulary meta-schema";
var type$2 = [
	"object",
	"boolean"
];
var properties$2 = {
	type: {
		anyOf: [
			{
				$ref: "#/$defs/simpleTypes"
			},
			{
				type: "array",
				items: {
					$ref: "#/$defs/simpleTypes"
				},
				minItems: 1,
				uniqueItems: true
			}
		]
	},
	"const": true,
	"enum": {
		type: "array",
		items: true
	},
	multipleOf: {
		type: "number",
		exclusiveMinimum: 0
	},
	maximum: {
		type: "number"
	},
	exclusiveMaximum: {
		type: "number"
	},
	minimum: {
		type: "number"
	},
	exclusiveMinimum: {
		type: "number"
	},
	maxLength: {
		$ref: "#/$defs/nonNegativeInteger"
	},
	minLength: {
		$ref: "#/$defs/nonNegativeIntegerDefault0"
	},
	pattern: {
		type: "string",
		format: "regex"
	},
	maxItems: {
		$ref: "#/$defs/nonNegativeInteger"
	},
	minItems: {
		$ref: "#/$defs/nonNegativeIntegerDefault0"
	},
	uniqueItems: {
		type: "boolean",
		"default": false
	},
	maxContains: {
		$ref: "#/$defs/nonNegativeInteger"
	},
	minContains: {
		$ref: "#/$defs/nonNegativeInteger",
		"default": 1
	},
	maxProperties: {
		$ref: "#/$defs/nonNegativeInteger"
	},
	minProperties: {
		$ref: "#/$defs/nonNegativeIntegerDefault0"
	},
	required: {
		$ref: "#/$defs/stringArray"
	},
	dependentRequired: {
		type: "object",
		additionalProperties: {
			$ref: "#/$defs/stringArray"
		}
	}
};
var $defs$2 = {
	nonNegativeInteger: {
		type: "integer",
		minimum: 0
	},
	nonNegativeIntegerDefault0: {
		$ref: "#/$defs/nonNegativeInteger",
		"default": 0
	},
	simpleTypes: {
		"enum": [
			"array",
			"boolean",
			"integer",
			"null",
			"number",
			"object",
			"string"
		]
	},
	stringArray: {
		type: "array",
		items: {
			type: "string"
		},
		uniqueItems: true,
		"default": [
		]
	}
};
var require$$7 = {
	$schema: $schema$2,
	$id: $id$2,
	$vocabulary: $vocabulary,
	$dynamicAnchor: $dynamicAnchor,
	title: title$2,
	type: type$2,
	properties: properties$2,
	$defs: $defs$2
};

var hasRequiredJsonSchema202012;

function requireJsonSchema202012 () {
	if (hasRequiredJsonSchema202012) return jsonSchema202012;
	hasRequiredJsonSchema202012 = 1;
	Object.defineProperty(jsonSchema202012, "__esModule", { value: true });
	const metaSchema = require$$0;
	const applicator = require$$1;
	const unevaluated = require$$2;
	const content = require$$3;
	const core = require$$4;
	const format = require$$5;
	const metadata = require$$6;
	const validation = require$$7;
	const META_SUPPORT_DATA = ["/properties"];
	function addMetaSchema2020($data) {
	    [
	        metaSchema,
	        applicator,
	        unevaluated,
	        content,
	        core,
	        with$data(this, format),
	        metadata,
	        with$data(this, validation),
	    ].forEach((sch) => this.addMetaSchema(sch, undefined, false));
	    return this;
	    function with$data(ajv, sch) {
	        return $data ? ajv.$dataMetaSchema(sch, META_SUPPORT_DATA) : sch;
	    }
	}
	jsonSchema202012.default = addMetaSchema2020;
	
	return jsonSchema202012;
}

var hasRequired_2020;

function require_2020 () {
	if (hasRequired_2020) return _2020.exports;
	hasRequired_2020 = 1;
	(function (module, exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.MissingRefError = exports.ValidationError = exports.CodeGen = exports.Name = exports.nil = exports.stringify = exports.str = exports._ = exports.KeywordCxt = exports.Ajv2020 = void 0;
		const core_1 = /*@__PURE__*/ requireCore$1();
		const draft2020_1 = /*@__PURE__*/ requireDraft2020();
		const discriminator_1 = /*@__PURE__*/ requireDiscriminator();
		const json_schema_2020_12_1 = /*@__PURE__*/ requireJsonSchema202012();
		const META_SCHEMA_ID = "https://json-schema.org/draft/2020-12/schema";
		class Ajv2020 extends core_1.default {
		    constructor(opts = {}) {
		        super({
		            ...opts,
		            dynamicRef: true,
		            next: true,
		            unevaluated: true,
		        });
		    }
		    _addVocabularies() {
		        super._addVocabularies();
		        draft2020_1.default.forEach((v) => this.addVocabulary(v));
		        if (this.opts.discriminator)
		            this.addKeyword(discriminator_1.default);
		    }
		    _addDefaultMetaSchema() {
		        super._addDefaultMetaSchema();
		        const { $data, meta } = this.opts;
		        if (!meta)
		            return;
		        json_schema_2020_12_1.default.call(this, $data);
		        this.refs["http://json-schema.org/schema"] = META_SCHEMA_ID;
		    }
		    defaultMeta() {
		        return (this.opts.defaultMeta =
		            super.defaultMeta() || (this.getSchema(META_SCHEMA_ID) ? META_SCHEMA_ID : undefined));
		    }
		}
		exports.Ajv2020 = Ajv2020;
		module.exports = exports = Ajv2020;
		module.exports.Ajv2020 = Ajv2020;
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.default = Ajv2020;
		var validate_1 = /*@__PURE__*/ requireValidate();
		Object.defineProperty(exports, "KeywordCxt", { enumerable: true, get: function () { return validate_1.KeywordCxt; } });
		var codegen_1 = /*@__PURE__*/ requireCodegen();
		Object.defineProperty(exports, "_", { enumerable: true, get: function () { return codegen_1._; } });
		Object.defineProperty(exports, "str", { enumerable: true, get: function () { return codegen_1.str; } });
		Object.defineProperty(exports, "stringify", { enumerable: true, get: function () { return codegen_1.stringify; } });
		Object.defineProperty(exports, "nil", { enumerable: true, get: function () { return codegen_1.nil; } });
		Object.defineProperty(exports, "Name", { enumerable: true, get: function () { return codegen_1.Name; } });
		Object.defineProperty(exports, "CodeGen", { enumerable: true, get: function () { return codegen_1.CodeGen; } });
		var validation_error_1 = /*@__PURE__*/ requireValidation_error();
		Object.defineProperty(exports, "ValidationError", { enumerable: true, get: function () { return validation_error_1.default; } });
		var ref_error_1 = /*@__PURE__*/ requireRef_error();
		Object.defineProperty(exports, "MissingRefError", { enumerable: true, get: function () { return ref_error_1.default; } });
		
	} (_2020, _2020.exports));
	return _2020.exports;
}

var _2020Exports = /*@__PURE__*/ require_2020();
var Ajv2020 = /*@__PURE__*/getDefaultExportFromCjs(_2020Exports);

var schema = "org.mura.flash.contract/v0";
var targetIds = [
	"htc-vive-xr-elite-kyoto",
	"lynx-r1",
	"oculus-go-pacific",
	"pico-4-enterprise-phoenix",
	"pico-4-phoenix",
	"pico-4-pro-phoenix",
	"pico-neo-3",
	"play-for-dream-mr-mrd3a0",
	"quest-1-monterey",
	"quest-2-hollywood",
	"quest-3-eureka",
	"quest-3s-panther",
	"quest-pro-cambria",
	"samsung-galaxy-xr-sm-i610",
	"valve-steam-frame-deckard"
];
var probeIds = [
	{
		id: "adb.boot-devices",
		transport: "adb",
		fact: "boot-devices"
	},
	{
		id: "adb.build-fingerprint",
		transport: "adb",
		fact: "build-fingerprint"
	},
	{
		id: "adb.build-id",
		transport: "adb",
		fact: "build-id"
	},
	{
		id: "adb.build-incremental",
		transport: "adb",
		fact: "build-incremental"
	},
	{
		id: "adb.device",
		transport: "adb",
		fact: "device"
	},
	{
		id: "adb.flash-locked",
		transport: "adb",
		fact: "flash-locked"
	},
	{
		id: "adb.hardware-sku",
		transport: "adb",
		fact: "hardware-sku"
	},
	{
		id: "adb.manufacturer",
		transport: "adb",
		fact: "manufacturer"
	},
	{
		id: "adb.model",
		transport: "adb",
		fact: "model"
	},
	{
		id: "adb.security-patch",
		transport: "adb",
		fact: "security-patch"
	},
	{
		id: "adb.slot-suffix",
		transport: "adb",
		fact: "slot-suffix"
	},
	{
		id: "adb.vbmeta-device-state",
		transport: "adb",
		fact: "vbmeta-device-state"
	},
	{
		id: "adb.vbmeta-digest",
		transport: "adb",
		fact: "vbmeta-digest",
		sensitive: true
	},
	{
		id: "adb.verified-boot-state",
		transport: "adb",
		fact: "verified-boot-state"
	},
	{
		id: "fastboot.battery-soc-ok",
		transport: "fastboot",
		fact: "battery-soc-ok"
	},
	{
		id: "fastboot.bootloader-version",
		transport: "fastboot",
		fact: "bootloader-version"
	},
	{
		id: "fastboot.current-slot",
		transport: "fastboot",
		fact: "current-slot"
	},
	{
		id: "fastboot.hardware-revision",
		transport: "fastboot",
		fact: "hardware-revision"
	},
	{
		id: "fastboot.is-userspace",
		transport: "fastboot",
		fact: "is-userspace"
	},
	{
		id: "fastboot.max-download-size",
		transport: "fastboot",
		fact: "max-download-size"
	},
	{
		id: "fastboot.product",
		transport: "fastboot",
		fact: "product"
	},
	{
		id: "fastboot.secure",
		transport: "fastboot",
		fact: "secure"
	},
	{
		id: "fastboot.slot-count",
		transport: "fastboot",
		fact: "slot-count"
	},
	{
		id: "fastboot.snapshot-status",
		transport: "fastboot",
		fact: "snapshot-status"
	},
	{
		id: "fastboot.super-partition-name",
		transport: "fastboot",
		fact: "super-partition-name"
	},
	{
		id: "fastboot.unlocked",
		transport: "fastboot",
		fact: "unlocked"
	},
	{
		id: "fastboot.variant",
		transport: "fastboot",
		fact: "variant"
	}
];
var deniedOperationClasses = [
	"arbitrary-command",
	"device-code-execution",
	"device-transition",
	"device-write"
];
var limits = {
	probeTimeoutSeconds: 10,
	reconnectTimeoutSeconds: 10,
	maxOutputBytes: 1048576,
	maxDevices: 1
};
var errorCodes = {
	usage: 2,
	"recipe-invalid": 2,
	"device-missing": 3,
	"device-ambiguous": 3,
	"probe-failed": 4,
	"probe-timeout": 4,
	"safety-refusal": 5
};
var cli = {
	commands: [
		"targets",
		"show",
		"validate",
		"inspect"
	],
	jsonFlag: "--json"
};
var esmExports = [
	"loadCatalog",
	"getTarget",
	"validateRecipe",
	"createBrowserSession",
	"redactTranscript"
];
var contractJson = {
	schema: schema,
	targetIds: targetIds,
	probeIds: probeIds,
	deniedOperationClasses: deniedOperationClasses,
	limits: limits,
	errorCodes: errorCodes,
	cli: cli,
	esmExports: esmExports
};

var $schema$1 = "https://json-schema.org/draft/2020-12/schema";
var $id$1 = "https://mura.dev/schemas/flash-contract-v0.schema.json";
var title$1 = "Mura Flash v0 contract";
var type$1 = "object";
var additionalProperties$1 = false;
var required$1 = [
	"schema",
	"targetIds",
	"probeIds",
	"deniedOperationClasses",
	"limits",
	"errorCodes",
	"cli",
	"esmExports"
];
var properties$1 = {
	schema: {
		"const": "org.mura.flash.contract/v0"
	},
	targetIds: {
		type: "array",
		minItems: 1,
		uniqueItems: true,
		items: {
			$ref: "#/$defs/id"
		}
	},
	probeIds: {
		type: "array",
		minItems: 1,
		uniqueItems: true,
		items: {
			type: "object",
			additionalProperties: false,
			required: [
				"id",
				"transport",
				"fact"
			],
			properties: {
				id: {
					$ref: "#/$defs/id"
				},
				transport: {
					"enum": [
						"adb",
						"fastboot"
					]
				},
				fact: {
					$ref: "#/$defs/id"
				},
				sensitive: {
					type: "boolean",
					"default": false
				}
			}
		}
	},
	deniedOperationClasses: {
		type: "array",
		minItems: 1,
		uniqueItems: true,
		items: {
			"enum": [
				"device-transition",
				"device-code-execution",
				"device-write",
				"arbitrary-command"
			]
		}
	},
	limits: {
		type: "object",
		additionalProperties: false,
		required: [
			"probeTimeoutSeconds",
			"reconnectTimeoutSeconds",
			"maxOutputBytes",
			"maxDevices"
		],
		properties: {
			probeTimeoutSeconds: {
				"const": 10
			},
			reconnectTimeoutSeconds: {
				"const": 10
			},
			maxOutputBytes: {
				"const": 1048576
			},
			maxDevices: {
				"const": 1
			}
		}
	},
	errorCodes: {
		type: "object",
		minProperties: 1,
		additionalProperties: {
			type: "integer",
			minimum: 2,
			maximum: 5
		}
	},
	cli: {
		type: "object",
		additionalProperties: false,
		required: [
			"commands",
			"jsonFlag"
		],
		properties: {
			commands: {
				"const": [
					"targets",
					"show",
					"validate",
					"inspect"
				]
			},
			jsonFlag: {
				"const": "--json"
			}
		}
	},
	esmExports: {
		"const": [
			"loadCatalog",
			"getTarget",
			"validateRecipe",
			"createBrowserSession",
			"redactTranscript"
		]
	}
};
var $defs$1 = {
	id: {
		type: "string",
		pattern: "^[a-z][a-z0-9.-]{0,79}$"
	}
};
var contractSchema = {
	$schema: $schema$1,
	$id: $id$1,
	title: title$1,
	type: type$1,
	additionalProperties: additionalProperties$1,
	required: required$1,
	properties: properties$1,
	$defs: $defs$1
};

var $schema = "https://json-schema.org/draft/2020-12/schema";
var $id = "https://mura.dev/schemas/inspection-recipe-v1.schema.json";
var title = "Mura inspection target recipe";
var type = "object";
var additionalProperties = false;
var required = [
	"schema",
	"id",
	"displayName",
	"vendor",
	"models",
	"codenames",
	"builds",
	"evidenceLevel",
	"hardwareStatus",
	"authenticationStatus",
	"writesEnabled",
	"frontends",
	"transports",
	"probes",
	"redactFacts",
	"blockers",
	"unknowns",
	"sources"
];
var properties = {
	schema: {
		"const": "org.mura.flash.inspection-recipe/v1"
	},
	id: {
		$ref: "#/$defs/id"
	},
	displayName: {
		type: "string",
		minLength: 1,
		maxLength: 100
	},
	vendor: {
		type: "string",
		minLength: 1,
		maxLength: 80
	},
	models: {
		$ref: "#/$defs/stringList"
	},
	codenames: {
		$ref: "#/$defs/stringList"
	},
	builds: {
		type: "array",
		items: {
			type: "object",
			additionalProperties: false,
			required: [
				"id",
				"status"
			],
			properties: {
				id: {
					type: "string",
					minLength: 1,
					maxLength: 100
				},
				status: {
					"enum": [
						"eligible-reported",
						"ineligible-reported",
						"inspect-only",
						"unknown",
						"unsupported"
					]
				},
				note: {
					type: "string",
					maxLength: 500
				}
			}
		}
	},
	evidenceLevel: {
		"enum": [
			"source-documented",
			"vendor-documented",
			"community-reproduced",
			"community-reported"
		]
	},
	hardwareStatus: {
		"enum": [
			"unqualified",
			"unsupported"
		]
	},
	authenticationStatus: {
		"const": "test-only"
	},
	writesEnabled: {
		"const": false
	},
	frontends: {
		type: "array",
		minItems: 1,
		uniqueItems: true,
		items: {
			"enum": [
				"python",
				"webusb"
			]
		}
	},
	transports: {
		type: "array",
		minItems: 1,
		uniqueItems: true,
		items: {
			"enum": [
				"adb",
				"fastboot",
				"manual"
			]
		}
	},
	probes: {
		type: "array",
		uniqueItems: true,
		items: {
			$ref: "#/$defs/id"
		}
	},
	redactFacts: {
		type: "array",
		uniqueItems: true,
		items: {
			$ref: "#/$defs/id"
		}
	},
	blockers: {
		$ref: "#/$defs/stringList"
	},
	unknowns: {
		$ref: "#/$defs/stringList"
	},
	sources: {
		type: "array",
		minItems: 1,
		uniqueItems: true,
		items: {
			type: "string",
			format: "uri"
		}
	}
};
var $defs = {
	id: {
		type: "string",
		pattern: "^[a-z][a-z0-9.-]{0,79}$"
	},
	stringList: {
		type: "array",
		uniqueItems: true,
		items: {
			type: "string",
			minLength: 1,
			maxLength: 500
		}
	}
};
var recipeSchema = {
	$schema: $schema,
	$id: $id,
	title: title,
	type: type,
	additionalProperties: additionalProperties,
	required: required,
	properties: properties,
	$defs: $defs
};

var builtInRecipeTexts = ["{\n  \"schema\": \"org.mura.flash.inspection-recipe/v1\",\n  \"id\": \"htc-vive-xr-elite-kyoto\",\n  \"displayName\": \"HTC VIVE XR Elite\",\n  \"vendor\": \"HTC\",\n  \"models\": [\"VIVE XR Elite\"],\n  \"codenames\": [\"kyoto\"],\n  \"builds\": [\n    {\n      \"id\": \"1.0.999.738\",\n      \"status\": \"inspect-only\",\n      \"note\": \"Unlock is a single-author community report tied only to this displayed software release; the full fingerprint and hardware identity were not captured.\"\n    },\n    {\n      \"id\": \"2.0.999.960\",\n      \"status\": \"unsupported\",\n      \"note\": \"The vendor documents this release, but relock and downgrade-corruption behavior remain single-author reports and no safe write path exists.\"\n    }\n  ],\n  \"evidenceLevel\": \"community-reported\",\n  \"hardwareStatus\": \"unqualified\",\n  \"authenticationStatus\": \"test-only\",\n  \"writesEnabled\": false,\n  \"frontends\": [\"python\", \"webusb\"],\n  \"transports\": [\"adb\", \"fastboot\", \"manual\"],\n  \"probes\": [\n    \"adb.build-fingerprint\",\n    \"adb.build-id\",\n    \"adb.device\",\n    \"adb.hardware-sku\",\n    \"adb.manufacturer\",\n    \"adb.model\",\n    \"fastboot.bootloader-version\",\n    \"fastboot.hardware-revision\",\n    \"fastboot.product\",\n    \"fastboot.unlocked\"\n  ],\n  \"redactFacts\": [],\n  \"blockers\": [\n    \"No vendor unlock procedure or exact factory package has been found.\",\n    \"No complete partition, AVB, rollback, calibration, or stock-restore evidence exists.\"\n  ],\n  \"unknowns\": [\n    \"Exact fingerprint, SKU, bootloader revision, USB identities, and persistent unlock behavior.\",\n    \"Whether any build beyond the one reported is unlock-eligible.\"\n  ],\n  \"sources\": [\n    \"https://xdaforums.com/t/htc-vive-xr-elite-bootloader-unlock-guide.4777618/\",\n    \"https://www.vive.com/release-notes/vive-xr-elite/vive-xr-elite-software-10999738/\",\n    \"https://www.vive.com/release-notes/vive-xr-elite/vive-xr-elite-software-20999960/\"\n  ]\n}\n","{\n  \"schema\": \"org.mura.flash.inspection-recipe/v1\",\n  \"id\": \"lynx-r1\",\n  \"displayName\": \"Lynx R1\",\n  \"vendor\": \"Lynx\",\n  \"models\": [\"R1\"],\n  \"codenames\": [],\n  \"builds\": [\n    {\n      \"id\": \"1.4.1\",\n      \"status\": \"inspect-only\",\n      \"note\": \"The official portal records this build, but its tested download redirect returned 404 and the stock artifact could not be inspected.\"\n    }\n  ],\n  \"evidenceLevel\": \"vendor-documented\",\n  \"hardwareStatus\": \"unqualified\",\n  \"authenticationStatus\": \"test-only\",\n  \"writesEnabled\": false,\n  \"frontends\": [\"python\", \"webusb\"],\n  \"transports\": [\"adb\", \"fastboot\", \"manual\"],\n  \"probes\": [\n    \"adb.build-fingerprint\",\n    \"adb.build-id\",\n    \"adb.device\",\n    \"adb.manufacturer\",\n    \"adb.model\",\n    \"adb.slot-suffix\",\n    \"fastboot.bootloader-version\",\n    \"fastboot.current-slot\",\n    \"fastboot.product\",\n    \"fastboot.slot-count\",\n    \"fastboot.unlocked\"\n  ],\n  \"redactFacts\": [],\n  \"blockers\": [\n    \"The current official 1.4.1 firmware download is unavailable.\",\n    \"Protected-state backup coverage and a hardware-qualified Mura write boundary do not exist.\"\n  ],\n  \"unknowns\": [\n    \"Exact stock boot header, protected partitions, USB identities, and persistent open-state transcript.\",\n    \"Complete stock partition and AVB inventory.\"\n  ],\n  \"sources\": [\n    \"https://portal.lynx-r.com/documentation/view/getting-started?version=30\",\n    \"https://portal.lynx-r.com/documentation/view/updating-your-device?version=15\",\n    \"https://portal.lynx-r.com/downloads/firmware/lynx-r-1/\",\n    \"https://raw.githubusercontent.com/ellyq/lynx-mainline/main/dumps/partitions.log\"\n  ]\n}\n","{\n  \"schema\": \"org.mura.flash.inspection-recipe/v1\",\n  \"id\": \"oculus-go-pacific\",\n  \"displayName\": \"Oculus Go\",\n  \"vendor\": \"Meta\",\n  \"models\": [\"Oculus Go\"],\n  \"codenames\": [\"pacific\"],\n  \"builds\": [],\n  \"evidenceLevel\": \"vendor-documented\",\n  \"hardwareStatus\": \"unqualified\",\n  \"authenticationStatus\": \"test-only\",\n  \"writesEnabled\": false,\n  \"frontends\": [\"python\", \"webusb\"],\n  \"transports\": [\"adb\", \"fastboot\", \"manual\"],\n  \"probes\": [\n    \"adb.build-fingerprint\",\n    \"adb.build-id\",\n    \"adb.device\",\n    \"adb.manufacturer\",\n    \"adb.model\",\n    \"adb.verified-boot-state\",\n    \"fastboot.bootloader-version\",\n    \"fastboot.product\",\n    \"fastboot.secure\",\n    \"fastboot.unlocked\"\n  ],\n  \"redactFacts\": [],\n  \"blockers\": [\n    \"The official unlock package lacks a reproduced durable URL and digest in a Mura artifact manifest.\",\n    \"No complete partition, protected-state, or tested stock-restoration record exists.\"\n  ],\n  \"unknowns\": [\n    \"Exact retail revision behavior, USB descriptors, partition map, and protected state.\",\n    \"Stock restoration behavior after the permanent software unlock.\"\n  ],\n  \"sources\": [\n    \"https://developers.meta.com/horizon/downloads/package/oculus-go-sw-unlock/\",\n    \"https://developers.meta.com/horizon/blog/unlocking-oculus-go/\"\n  ]\n}\n","{\n  \"schema\": \"org.mura.flash.inspection-recipe/v1\",\n  \"id\": \"pico-4-enterprise-phoenix\",\n  \"displayName\": \"PICO 4 Enterprise\",\n  \"vendor\": \"PICO\",\n  \"models\": [\"PICO 4 Enterprise\"],\n  \"codenames\": [\"phoenix\"],\n  \"builds\": [\n    {\n      \"id\": \"5.13.8-and-below\",\n      \"status\": \"unsupported\",\n      \"note\": \"The tool's Enterprise programmer selection conflicts with vendor memory specifications and pinned recovery documentation.\"\n    }\n  ],\n  \"evidenceLevel\": \"source-documented\",\n  \"hardwareStatus\": \"unsupported\",\n  \"authenticationStatus\": \"test-only\",\n  \"writesEnabled\": false,\n  \"frontends\": [\"python\", \"webusb\"],\n  \"transports\": [\"adb\", \"fastboot\", \"manual\"],\n  \"probes\": [\n    \"adb.build-fingerprint\",\n    \"adb.build-incremental\",\n    \"adb.device\",\n    \"adb.hardware-sku\",\n    \"adb.manufacturer\",\n    \"adb.model\",\n    \"adb.slot-suffix\",\n    \"fastboot.hardware-revision\",\n    \"fastboot.product\",\n    \"fastboot.unlocked\",\n    \"fastboot.variant\"\n  ],\n  \"redactFacts\": [],\n  \"blockers\": [\n    \"EDL operations are unsupported because programmer selection conflicts with the documented LPDDR5 hardware.\",\n    \"No accepted-loader evidence, Enterprise transcript, or qualified recovery path exists.\"\n  ],\n  \"unknowns\": [\n    \"Exact SKU/build coverage and accepted programmer.\",\n    \"Enterprise-specific storage geometry, partition map, protected state, and unlock persistence.\"\n  ],\n  \"sources\": [\n    \"https://github.com/chaixshot/more-picohaxx-tool/tree/29591aec1b2babab3c3c26239e85576da556e968\",\n    \"https://github.com/thoricelli/PICO-documentation/tree/99face1b92ccf8350e30268089e2da5b2682010e\",\n    \"https://www.picoxr.com/sg/products/pico4e/specs\"\n  ]\n}\n","{\n  \"schema\": \"org.mura.flash.inspection-recipe/v1\",\n  \"id\": \"pico-4-phoenix\",\n  \"displayName\": \"PICO 4\",\n  \"vendor\": \"PICO\",\n  \"models\": [\"PICO 4\"],\n  \"codenames\": [\"phoenix\"],\n  \"builds\": [\n    {\n      \"id\": \"5.13.8-and-below\",\n      \"status\": \"inspect-only\",\n      \"note\": \"Pinned tooling claims this ceiling, but no public per-device transcript independently proves every exact build.\"\n    }\n  ],\n  \"evidenceLevel\": \"source-documented\",\n  \"hardwareStatus\": \"unqualified\",\n  \"authenticationStatus\": \"test-only\",\n  \"writesEnabled\": false,\n  \"frontends\": [\"python\", \"webusb\"],\n  \"transports\": [\"adb\", \"fastboot\", \"manual\"],\n  \"probes\": [\n    \"adb.build-fingerprint\",\n    \"adb.build-incremental\",\n    \"adb.device\",\n    \"adb.hardware-sku\",\n    \"adb.manufacturer\",\n    \"adb.model\",\n    \"adb.slot-suffix\",\n    \"fastboot.hardware-revision\",\n    \"fastboot.product\",\n    \"fastboot.secure\",\n    \"fastboot.unlocked\",\n    \"fastboot.variant\"\n  ],\n  \"redactFacts\": [],\n  \"blockers\": [\n    \"No Mura hardware qualification, authenticated engineering payload closure, or protected-state-safe recovery exists.\",\n    \"The public 5.13.8 boundary has not been independently reproduced per model and build.\"\n  ],\n  \"unknowns\": [\n    \"Exact programmer acceptance, UFS geometry, GPT, AVB indexes, and protected calibration partitions.\",\n    \"Unlock persistence and stock ABL/devinfo restoration on a bound retail specimen.\"\n  ],\n  \"sources\": [\n    \"https://github.com/chaixshot/more-picohaxx-tool/tree/29591aec1b2babab3c3c26239e85576da556e968\",\n    \"https://pico4.wiki/guides/root/01-root/\"\n  ]\n}\n","{\n  \"schema\": \"org.mura.flash.inspection-recipe/v1\",\n  \"id\": \"pico-4-pro-phoenix\",\n  \"displayName\": \"PICO 4 Pro\",\n  \"vendor\": \"PICO\",\n  \"models\": [\"PICO 4 Pro\"],\n  \"codenames\": [\"phoenix\"],\n  \"builds\": [\n    {\n      \"id\": \"5.13.8-and-below\",\n      \"status\": \"inspect-only\",\n      \"note\": \"Pinned tooling claims this ceiling and maps Pro to its Lite programmer, but no complete public per-build transcript exists.\"\n    }\n  ],\n  \"evidenceLevel\": \"source-documented\",\n  \"hardwareStatus\": \"unqualified\",\n  \"authenticationStatus\": \"test-only\",\n  \"writesEnabled\": false,\n  \"frontends\": [\"python\", \"webusb\"],\n  \"transports\": [\"adb\", \"fastboot\", \"manual\"],\n  \"probes\": [\n    \"adb.build-fingerprint\",\n    \"adb.build-incremental\",\n    \"adb.device\",\n    \"adb.hardware-sku\",\n    \"adb.manufacturer\",\n    \"adb.model\",\n    \"adb.slot-suffix\",\n    \"fastboot.hardware-revision\",\n    \"fastboot.product\",\n    \"fastboot.secure\",\n    \"fastboot.unlocked\",\n    \"fastboot.variant\"\n  ],\n  \"redactFacts\": [],\n  \"blockers\": [\n    \"The source proves a model-to-loader mapping, not independent physical-memory or loader-interchangeability evidence.\",\n    \"No Mura hardware qualification, payload provenance closure, or protected-state-safe recovery exists.\"\n  ],\n  \"unknowns\": [\n    \"Exact programmer acceptance, UFS geometry, GPT, AVB indexes, and protected calibration partitions.\",\n    \"Unlock persistence and stock ABL/devinfo restoration on a bound retail specimen.\"\n  ],\n  \"sources\": [\n    \"https://github.com/chaixshot/more-picohaxx-tool/tree/29591aec1b2babab3c3c26239e85576da556e968\",\n    \"https://pico4.wiki/guides/root/01-root/\"\n  ]\n}\n","{\n  \"schema\": \"org.mura.flash.inspection-recipe/v1\",\n  \"id\": \"pico-neo-3\",\n  \"displayName\": \"PICO Neo 3\",\n  \"vendor\": \"PICO\",\n  \"models\": [\"PICO Neo 3\"],\n  \"codenames\": [],\n  \"builds\": [\n    {\n      \"id\": \"5.11.2-and-below\",\n      \"status\": \"inspect-only\",\n      \"note\": \"This ceiling is maintainer-reported; the original discoverer tested only PICO 4 and did not reproduce Neo 3.\"\n    }\n  ],\n  \"evidenceLevel\": \"community-reported\",\n  \"hardwareStatus\": \"unqualified\",\n  \"authenticationStatus\": \"test-only\",\n  \"writesEnabled\": false,\n  \"frontends\": [\"python\", \"webusb\"],\n  \"transports\": [\"adb\", \"fastboot\", \"manual\"],\n  \"probes\": [\n    \"adb.build-fingerprint\",\n    \"adb.build-incremental\",\n    \"adb.device\",\n    \"adb.hardware-sku\",\n    \"adb.manufacturer\",\n    \"adb.model\",\n    \"adb.slot-suffix\",\n    \"fastboot.hardware-revision\",\n    \"fastboot.product\",\n    \"fastboot.unlocked\",\n    \"fastboot.variant\"\n  ],\n  \"redactFacts\": [],\n  \"blockers\": [\n    \"Neo 3 has no independently reproduced target/build/programmer and partition closure.\",\n    \"PICO 4 partition and recovery assumptions cannot be transferred to Neo 3.\"\n  ],\n  \"unknowns\": [\n    \"Exact supported SKUs, regional builds, programmer, descriptors, and storage geometry.\",\n    \"Partition map, protected calibration, A/B behavior, unlock persistence, and stock restore.\"\n  ],\n  \"sources\": [\n    \"https://github.com/chaixshot/more-picohaxx-tool/tree/29591aec1b2babab3c3c26239e85576da556e968\"\n  ]\n}\n","{\n  \"schema\": \"org.mura.flash.inspection-recipe/v1\",\n  \"id\": \"play-for-dream-mr-mrd3a0\",\n  \"displayName\": \"Play For Dream MR\",\n  \"vendor\": \"Play For Dream\",\n  \"models\": [\"MRD3A0\"],\n  \"codenames\": [\"anorak\"],\n  \"builds\": [],\n  \"evidenceLevel\": \"community-reported\",\n  \"hardwareStatus\": \"unqualified\",\n  \"authenticationStatus\": \"test-only\",\n  \"writesEnabled\": false,\n  \"frontends\": [\"python\", \"webusb\"],\n  \"transports\": [\"adb\", \"fastboot\", \"manual\"],\n  \"probes\": [\n    \"adb.build-fingerprint\",\n    \"adb.build-id\",\n    \"adb.device\",\n    \"adb.hardware-sku\",\n    \"adb.manufacturer\",\n    \"adb.model\",\n    \"adb.slot-suffix\",\n    \"fastboot.bootloader-version\",\n    \"fastboot.current-slot\",\n    \"fastboot.product\",\n    \"fastboot.secure\",\n    \"fastboot.unlocked\",\n    \"fastboot.variant\"\n  ],\n  \"redactFacts\": [],\n  \"blockers\": [\n    \"Only one apparently unfused unit is publicly shown unlocked; no retail eligibility matrix exists.\",\n    \"There is no complete stock firmware, protected-state map, or safe recovery path.\"\n  ],\n  \"unknowns\": [\n    \"Retail fuse and authorization state, mode-specific USB identities, and OEM unlock method.\",\n    \"Complete GPT, AVB, rollback, protected calibration, stock recovery, and regional differences.\"\n  ],\n  \"sources\": [\n    \"https://github.com/FreeXR/FreeXR/tree/1046c159c726bb2d0f8e5a3205ae82efa96c46df/targets/anorak\",\n    \"https://developer.yvrdream.com/yvrdoc/unity/UserManual/GetStartedXR/BuildXRScene.html\",\n    \"https://mastodon.social/api/v1/statuses/114027425822225840\"\n  ]\n}\n","{\n  \"schema\": \"org.mura.flash.inspection-recipe/v1\",\n  \"id\": \"quest-1-monterey\",\n  \"displayName\": \"Meta Quest 1\",\n  \"vendor\": \"Meta\",\n  \"models\": [\"Quest 1\"],\n  \"codenames\": [\"monterey\"],\n  \"builds\": [\n    {\n      \"id\": \"49845030443200410\",\n      \"status\": \"inspect-only\",\n      \"note\": \"The current community flow starts from this final Quest 1 build, but Mura has no hardware qualification or authenticated stock acquisition.\"\n    },\n    {\n      \"id\": \"16476800119700000\",\n      \"status\": \"inspect-only\",\n      \"note\": \"The source uses this v29 boot-chain build only on the inactive slot; this recipe authorizes no transition or write.\"\n    }\n  ],\n  \"evidenceLevel\": \"source-documented\",\n  \"hardwareStatus\": \"unqualified\",\n  \"authenticationStatus\": \"test-only\",\n  \"writesEnabled\": false,\n  \"frontends\": [\"python\", \"webusb\"],\n  \"transports\": [\"adb\", \"fastboot\", \"manual\"],\n  \"probes\": [\n    \"adb.build-fingerprint\",\n    \"adb.build-id\",\n    \"adb.build-incremental\",\n    \"adb.device\",\n    \"adb.manufacturer\",\n    \"adb.model\",\n    \"adb.slot-suffix\",\n    \"fastboot.bootloader-version\",\n    \"fastboot.current-slot\",\n    \"fastboot.product\",\n    \"fastboot.slot-count\",\n    \"fastboot.unlocked\"\n  ],\n  \"redactFacts\": [],\n  \"blockers\": [\n    \"Final-stock packages are community mirrored rather than authenticated by Meta.\",\n    \"No Mura hardware record proves both-slot recovery, protected-state backup, or persistent unlock.\"\n  ],\n  \"unknowns\": [\n    \"Complete LUN/GPT map, protected state, USB Update Mode descriptors, and fuse rollback floors.\",\n    \"Official final-stock acquisition and recovery after loss of both bootable slots.\"\n  ],\n  \"sources\": [\n    \"https://github.com/darknight1050/quest1-bootloader-unlocker-web/tree/7f34276ecef9021771e7bf4a2d53f10b26243334\",\n    \"https://www.meta.com/help/quest/software_update/\"\n  ]\n}\n","{\n  \"schema\": \"org.mura.flash.inspection-recipe/v1\",\n  \"id\": \"quest-2-hollywood\",\n  \"displayName\": \"Meta Quest 2\",\n  \"vendor\": \"Meta\",\n  \"models\": [\"Quest 2\"],\n  \"codenames\": [\"hollywood\"],\n  \"builds\": [\n    {\n      \"id\": \"16476800118700000\",\n      \"status\": \"inspect-only\",\n      \"note\": \"This exact v29 build has a source-documented direct exploit path, but this recipe authorizes inspection only.\"\n    },\n    {\n      \"id\": \"50670960048600150\",\n      \"status\": \"inspect-only\",\n      \"note\": \"The inactive-slot flow is source-bounded and deployed with pinned assets, but remains community deployment evidence rather than Mura hardware qualification.\"\n    }\n  ],\n  \"evidenceLevel\": \"source-documented\",\n  \"hardwareStatus\": \"unqualified\",\n  \"authenticationStatus\": \"test-only\",\n  \"writesEnabled\": false,\n  \"frontends\": [\"python\", \"webusb\"],\n  \"transports\": [\"adb\", \"fastboot\", \"manual\"],\n  \"probes\": [\n    \"adb.build-fingerprint\",\n    \"adb.build-id\",\n    \"adb.build-incremental\",\n    \"adb.device\",\n    \"adb.manufacturer\",\n    \"adb.model\",\n    \"adb.slot-suffix\",\n    \"fastboot.bootloader-version\",\n    \"fastboot.current-slot\",\n    \"fastboot.product\",\n    \"fastboot.slot-count\",\n    \"fastboot.unlocked\"\n  ],\n  \"redactFacts\": [],\n  \"blockers\": [\n    \"Ordinary current retail firmware has no matching public entry path.\",\n    \"Quest 1 partition, payload, and rollback assumptions do not transfer to Quest 2.\"\n  ],\n  \"unknowns\": [\n    \"Storage/revision variants, exact Quest 2 partition set, root ceiling, protected state, and stock recovery.\",\n    \"Independent reproduction of the newer-build inactive-slot path.\"\n  ],\n  \"sources\": [\n    \"https://github.com/darknight1050/quest-bootloader-unlocker/tree/e171bbee61e754863fd3a82fe9dc35cd18adf3ac\",\n    \"https://github.com/darknight1050/quest1-bootloader-unlocker-web/tree/7f34276ecef9021771e7bf4a2d53f10b26243334\"\n  ]\n}\n","{\n  \"schema\": \"org.mura.flash.inspection-recipe/v1\",\n  \"id\": \"quest-3-eureka\",\n  \"displayName\": \"Meta Quest 3\",\n  \"vendor\": \"Meta\",\n  \"models\": [\"Quest 3\"],\n  \"codenames\": [\"eureka\"],\n  \"builds\": [\n    {\n      \"id\": \"52433670036000520\",\n      \"status\": \"unsupported\",\n      \"note\": \"Public source provides temporary post-boot root only; it does not change the persistent boot trust root.\"\n    },\n    {\n      \"id\": \"52433670048800520\",\n      \"status\": \"unsupported\",\n      \"note\": \"Pinned source identifies this as the first build patched against the temporary-root exploit.\"\n    }\n  ],\n  \"evidenceLevel\": \"source-documented\",\n  \"hardwareStatus\": \"unsupported\",\n  \"authenticationStatus\": \"test-only\",\n  \"writesEnabled\": false,\n  \"frontends\": [\"python\", \"webusb\"],\n  \"transports\": [\"adb\", \"manual\"],\n  \"probes\": [\n    \"adb.build-fingerprint\",\n    \"adb.build-id\",\n    \"adb.build-incremental\",\n    \"adb.device\",\n    \"adb.hardware-sku\",\n    \"adb.manufacturer\",\n    \"adb.model\",\n    \"adb.security-patch\",\n    \"adb.verified-boot-state\"\n  ],\n  \"redactFacts\": [],\n  \"blockers\": [\n    \"No public persistent retail bootloader unlock exists.\",\n    \"No matching public Firehose recovery or accepted alternate trust root is known.\"\n  ],\n  \"unknowns\": [\n    \"Persistent owner-controlled unlock mechanism and independently recoverable write boundary.\",\n    \"Exact retail partition, rollback, and protected-state maps.\"\n  ],\n  \"sources\": [\n    \"https://github.com/Henry1887/fuguquest/tree/53cbd602d7a3978e4a5eac089096015ae756c24c\",\n    \"https://github.com/FreeXR/FreeXR/tree/1046c159c726bb2d0f8e5a3205ae82efa96c46df\"\n  ]\n}\n","{\n  \"schema\": \"org.mura.flash.inspection-recipe/v1\",\n  \"id\": \"quest-3s-panther\",\n  \"displayName\": \"Meta Quest 3S\",\n  \"vendor\": \"Meta\",\n  \"models\": [\"Quest 3S\"],\n  \"codenames\": [\"panther\"],\n  \"builds\": [\n    {\n      \"id\": \"52433670036000520\",\n      \"status\": \"unsupported\",\n      \"note\": \"Public source provides temporary post-boot root only; it does not change the persistent boot trust root.\"\n    },\n    {\n      \"id\": \"52433670048800520\",\n      \"status\": \"unsupported\",\n      \"note\": \"Pinned source identifies this as the first build patched against the temporary-root exploit.\"\n    }\n  ],\n  \"evidenceLevel\": \"source-documented\",\n  \"hardwareStatus\": \"unsupported\",\n  \"authenticationStatus\": \"test-only\",\n  \"writesEnabled\": false,\n  \"frontends\": [\"python\", \"webusb\"],\n  \"transports\": [\"adb\", \"manual\"],\n  \"probes\": [\n    \"adb.build-fingerprint\",\n    \"adb.build-id\",\n    \"adb.build-incremental\",\n    \"adb.device\",\n    \"adb.hardware-sku\",\n    \"adb.manufacturer\",\n    \"adb.model\",\n    \"adb.security-patch\",\n    \"adb.verified-boot-state\"\n  ],\n  \"redactFacts\": [],\n  \"blockers\": [\n    \"No public persistent retail bootloader unlock exists.\",\n    \"No matching public Firehose recovery or accepted alternate trust root is known.\"\n  ],\n  \"unknowns\": [\n    \"Persistent owner-controlled unlock mechanism and independently recoverable write boundary.\",\n    \"Exact retail partition, rollback, and protected-state maps.\"\n  ],\n  \"sources\": [\n    \"https://github.com/Henry1887/fuguquest/tree/53cbd602d7a3978e4a5eac089096015ae756c24c\",\n    \"https://github.com/FreeXR/FreeXR/tree/1046c159c726bb2d0f8e5a3205ae82efa96c46df\"\n  ]\n}\n","{\n  \"schema\": \"org.mura.flash.inspection-recipe/v1\",\n  \"id\": \"quest-pro-cambria\",\n  \"displayName\": \"Meta Quest Pro\",\n  \"vendor\": \"Meta\",\n  \"models\": [\"Quest Pro\"],\n  \"codenames\": [\"cambria\"],\n  \"builds\": [\n    {\n      \"id\": \"52433670036000520\",\n      \"status\": \"unsupported\",\n      \"note\": \"Public source provides temporary post-boot root only; it does not change the persistent boot trust root.\"\n    },\n    {\n      \"id\": \"52433670048800520\",\n      \"status\": \"unsupported\",\n      \"note\": \"Pinned source identifies this as the first build patched against the temporary-root exploit.\"\n    }\n  ],\n  \"evidenceLevel\": \"source-documented\",\n  \"hardwareStatus\": \"unsupported\",\n  \"authenticationStatus\": \"test-only\",\n  \"writesEnabled\": false,\n  \"frontends\": [\"python\", \"webusb\"],\n  \"transports\": [\"adb\", \"manual\"],\n  \"probes\": [\n    \"adb.build-fingerprint\",\n    \"adb.build-id\",\n    \"adb.build-incremental\",\n    \"adb.device\",\n    \"adb.hardware-sku\",\n    \"adb.manufacturer\",\n    \"adb.model\",\n    \"adb.security-patch\",\n    \"adb.verified-boot-state\"\n  ],\n  \"redactFacts\": [],\n  \"blockers\": [\n    \"No public persistent retail bootloader unlock exists.\",\n    \"Temporary root is RAM-only and disappears fully on reboot.\"\n  ],\n  \"unknowns\": [\n    \"Persistent owner-controlled unlock mechanism and independently recoverable write boundary.\",\n    \"Exact retail partition, rollback, and protected-state maps.\"\n  ],\n  \"sources\": [\n    \"https://github.com/Henry1887/fuguquest/tree/53cbd602d7a3978e4a5eac089096015ae756c24c\"\n  ]\n}\n","{\n  \"schema\": \"org.mura.flash.inspection-recipe/v1\",\n  \"id\": \"samsung-galaxy-xr-sm-i610\",\n  \"displayName\": \"Samsung Galaxy XR\",\n  \"vendor\": \"Samsung\",\n  \"models\": [\"SM-I610\"],\n  \"codenames\": [],\n  \"builds\": [\n    {\n      \"id\": \"I610UEU1AYIA\",\n      \"status\": \"unknown\",\n      \"note\": \"AYIA is separately reported as the launch build, but no preserved capture binds a successful unlock event to this full build identity.\"\n    },\n    {\n      \"id\": \"I610UEU1AYKE\",\n      \"status\": \"unsupported\",\n      \"note\": \"Unlock removal is community-reported; a safe return to AYIA is not established.\"\n    },\n    {\n      \"id\": \"I610UEU2AZCI\",\n      \"status\": \"unsupported\",\n      \"note\": \"This is the first ledgered U2 build; no complete public custom-image path exists.\"\n    },\n    {\n      \"id\": \"I610UEU2AZD8\",\n      \"status\": \"unsupported\"\n    },\n    {\n      \"id\": \"I610UEU2AZF3\",\n      \"status\": \"unsupported\"\n    }\n  ],\n  \"evidenceLevel\": \"community-reported\",\n  \"hardwareStatus\": \"unqualified\",\n  \"authenticationStatus\": \"test-only\",\n  \"writesEnabled\": false,\n  \"frontends\": [\"python\", \"webusb\"],\n  \"transports\": [\"adb\", \"manual\"],\n  \"probes\": [\n    \"adb.boot-devices\",\n    \"adb.build-fingerprint\",\n    \"adb.build-id\",\n    \"adb.build-incremental\",\n    \"adb.device\",\n    \"adb.flash-locked\",\n    \"adb.hardware-sku\",\n    \"adb.manufacturer\",\n    \"adb.model\",\n    \"adb.security-patch\",\n    \"adb.slot-suffix\",\n    \"adb.vbmeta-device-state\",\n    \"adb.verified-boot-state\"\n  ],\n  \"redactFacts\": [],\n  \"blockers\": [\n    \"No successful launch unlock capture is bound to a full build, SKU, and bootloader revision.\",\n    \"No complete PIT/GPT, AVB, stock artifact, protected-state backup, or restore plan exists.\"\n  ],\n  \"unknowns\": [\n    \"Whether SM-I610 exposes fastboot or fastbootd rather than only Samsung Download.\",\n    \"Exact downgrade floors, update relock behavior, Knox effects, partition layout, and AYIA package availability.\"\n  ],\n  \"sources\": [\n    \"https://doc.samsungmobile.com/SM-I610/036371251209/eng.html\",\n    \"https://www.androidauthority.com/samsung-galaxy-xr-bootloader-unlocking-3609841/\",\n    \"https://www.sammobile.com/news/galaxy-xr-bootloader-unlock-is-possible-at-least-for-now/\"\n  ]\n}\n","{\n  \"schema\": \"org.mura.flash.inspection-recipe/v1\",\n  \"id\": \"valve-steam-frame-deckard\",\n  \"displayName\": \"Valve Steam Frame\",\n  \"vendor\": \"Valve\",\n  \"models\": [\"Steam Frame\"],\n  \"codenames\": [\"deckard\"],\n  \"builds\": [\n    {\n      \"id\": \"20260921.6090922-0.5.0\",\n      \"status\": \"inspect-only\",\n      \"note\": \"This is the pinned donor specimen inspected by Mura, not a channel-independent latest release or hardware qualification.\"\n    }\n  ],\n  \"evidenceLevel\": \"source-documented\",\n  \"hardwareStatus\": \"unqualified\",\n  \"authenticationStatus\": \"test-only\",\n  \"writesEnabled\": false,\n  \"frontends\": [\"python\"],\n  \"transports\": [\"manual\"],\n  \"probes\": [],\n  \"redactFacts\": [],\n  \"blockers\": [\n    \"Administrator access in the stock OS is not proof of cryptographic bootloader unlock.\",\n    \"No alternate-OS procedure, independently bootable rescue path, or complete lower-boot-chain policy is known.\"\n  ],\n  \"unknowns\": [\n    \"Secure-boot fuse and U-Boot policy, external boot, EDL programmer, physical-LUN map, and rescue image.\",\n    \"Boot-firmware update transaction, persistent UEFI variables, and factory or calibration partitions.\"\n  ],\n  \"sources\": [\n    \"https://partner.steamgames.com/doc/steamhardware/steamframe/debugging\"\n  ]\n}\n"];

const contract$1 = contractJson;
class MuraFlashError extends Error {
    code;
    exitCode;
    constructor(code, detail, cause) {
        super(`${code}: ${detail}`, cause === undefined ? undefined : { cause });
        this.name = "MuraFlashError";
        this.code = code;
        this.exitCode = contract$1.errorCodes[code] ?? 5;
    }
}
function fail(code, detail, cause) {
    return new MuraFlashError(code, detail, cause);
}

class DuplicateKeyScanner {
    #text;
    #offset = 0;
    constructor(text) {
        this.#text = text;
    }
    scan() {
        this.#skipWhitespace();
        this.#value("$");
        this.#skipWhitespace();
        if (this.#offset !== this.#text.length) {
            throw fail("recipe-invalid", "invalid JSON after root value");
        }
    }
    #value(path) {
        this.#skipWhitespace();
        const token = this.#text[this.#offset];
        if (token === "{") {
            this.#object(path);
        }
        else if (token === "[") {
            this.#array(path);
        }
        else if (token === '"') {
            this.#string();
        }
        else if (token === "t") {
            this.#literal("true");
        }
        else if (token === "f") {
            this.#literal("false");
        }
        else if (token === "n") {
            this.#literal("null");
        }
        else if (token === "-" || (token !== undefined && /[0-9]/u.test(token))) {
            this.#number();
        }
        else {
            throw fail("recipe-invalid", `invalid JSON value at ${path}`);
        }
    }
    #object(path) {
        this.#offset += 1;
        this.#skipWhitespace();
        const keys = new Set();
        if (this.#consume("}")) {
            return;
        }
        while (true) {
            this.#skipWhitespace();
            if (this.#text[this.#offset] !== '"') {
                throw fail("recipe-invalid", `invalid JSON object at ${path}`);
            }
            const key = this.#string();
            if (keys.has(key)) {
                throw fail("recipe-invalid", `duplicate key ${JSON.stringify(key)} at ${path}`);
            }
            keys.add(key);
            this.#skipWhitespace();
            this.#expect(":");
            this.#value(`${path}.${key}`);
            this.#skipWhitespace();
            if (this.#consume("}")) {
                return;
            }
            this.#expect(",");
        }
    }
    #array(path) {
        this.#offset += 1;
        this.#skipWhitespace();
        if (this.#consume("]")) {
            return;
        }
        let index = 0;
        while (true) {
            this.#value(`${path}[${index}]`);
            index += 1;
            this.#skipWhitespace();
            if (this.#consume("]")) {
                return;
            }
            this.#expect(",");
        }
    }
    #string() {
        const start = this.#offset;
        this.#offset += 1;
        while (this.#offset < this.#text.length) {
            const character = this.#text[this.#offset];
            if (character === '"') {
                this.#offset += 1;
                const token = this.#text.slice(start, this.#offset);
                try {
                    return JSON.parse(token);
                }
                catch (error) {
                    throw fail("recipe-invalid", "invalid JSON string", error);
                }
            }
            if (character === "\\") {
                this.#offset += 2;
            }
            else {
                if (character === undefined ||
                    character.charCodeAt(0) < 0x20) {
                    throw fail("recipe-invalid", "invalid control character in JSON string");
                }
                this.#offset += 1;
            }
        }
        throw fail("recipe-invalid", "unterminated JSON string");
    }
    #number() {
        const rest = this.#text.slice(this.#offset);
        const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/u.exec(rest);
        if (match === null) {
            throw fail("recipe-invalid", "invalid JSON number");
        }
        this.#offset += match[0].length;
    }
    #literal(literal) {
        if (!this.#text.startsWith(literal, this.#offset)) {
            throw fail("recipe-invalid", "invalid JSON literal");
        }
        this.#offset += literal.length;
    }
    #skipWhitespace() {
        while (this.#offset < this.#text.length &&
            /[\t\n\r ]/u.test(this.#text[this.#offset] ?? "")) {
            this.#offset += 1;
        }
    }
    #consume(character) {
        if (this.#text[this.#offset] !== character) {
            return false;
        }
        this.#offset += 1;
        return true;
    }
    #expect(character) {
        if (!this.#consume(character)) {
            throw fail("recipe-invalid", `expected ${JSON.stringify(character)} in JSON`);
        }
    }
}
function parseJsonStrict(text) {
    new DuplicateKeyScanner(text).scan();
    try {
        return JSON.parse(text);
    }
    catch (error) {
        throw fail("recipe-invalid", "invalid JSON", error);
    }
}

const expectedExports = [
    "loadCatalog",
    "getTarget",
    "validateRecipe",
    "createBrowserSession",
    "redactTranscript",
];
function uriIsValid(value) {
    try {
        const url = new URL(value);
        return url.protocol.length > 1;
    }
    catch {
        return false;
    }
}
function validator(schema) {
    const ajv = new Ajv2020({
        allErrors: true,
        strict: true,
        validateFormats: true,
        formats: {
            uri: {
                type: "string",
                validate: uriIsValid,
            },
        },
    });
    return ajv.compile(schema);
}
const validateContractSchema = validator(contractSchema);
const validateRecipeSchema = validator(recipeSchema);
const contract = contractJson;
function formatValidationErrors(errors) {
    return [...(errors ?? [])]
        .sort((left, right) => {
        const byPath = left.instancePath.localeCompare(right.instancePath);
        return byPath === 0
            ? left.keyword.localeCompare(right.keyword)
            : byPath;
    })
        .map((error) => {
        const path = error.instancePath.length === 0 ? "$" : `$${error.instancePath}`;
        if (error.keyword === "additionalProperties" &&
            "additionalProperty" in error.params) {
            return `${path}: unknown field ${JSON.stringify(error.params["additionalProperty"])}`;
        }
        return `${path}: ${error.message ?? error.keyword}`;
    })
        .join("; ");
}
if (!validateContractSchema(contractJson)) {
    throw fail("safety-refusal", `invalid embedded contract: ${formatValidationErrors(validateContractSchema.errors)}`);
}
if (contract.esmExports.length !== expectedExports.length ||
    !contract.esmExports.every((name, index) => name === expectedExports[index])) {
    throw fail("safety-refusal", "embedded contract export surface mismatch");
}
const probesById = new Map(contract.probeIds.map((probe) => [probe.id, probe]));
function deepFreeze(value) {
    if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
        for (const child of Object.values(value)) {
            deepFreeze(child);
        }
        Object.freeze(value);
    }
    return value;
}
function validateSemantics(recipe) {
    if (!contract.targetIds.includes(recipe.id)) {
        throw fail("recipe-invalid", `$.id: target ${JSON.stringify(recipe.id)} is not in the v0 contract`);
    }
    const selectedFacts = new Set();
    for (const [index, probeId] of recipe.probes.entries()) {
        const probe = probesById.get(probeId);
        if (probe === undefined) {
            throw fail("recipe-invalid", `$.probes[${index}]: probe ${JSON.stringify(probeId)} is not allowlisted`);
        }
        if (!recipe.transports.includes(probe.transport)) {
            throw fail("recipe-invalid", `$.probes[${index}]: ${probe.transport} is absent from transports`);
        }
        selectedFacts.add(probe.fact);
        if (probe.sensitive === true && !recipe.redactFacts.includes(probe.fact)) {
            throw fail("recipe-invalid", `$.redactFacts: sensitive fact ${JSON.stringify(probe.fact)} is missing`);
        }
    }
    for (const [index, fact] of recipe.redactFacts.entries()) {
        if (!selectedFacts.has(fact)) {
            throw fail("recipe-invalid", `$.redactFacts[${index}]: fact ${JSON.stringify(fact)} is not collected by this recipe`);
        }
    }
}
function validateRecipe(input) {
    const value = typeof input === "string" ? parseJsonStrict(input) : input;
    if (!validateRecipeSchema(value)) {
        throw fail("recipe-invalid", formatValidationErrors(validateRecipeSchema.errors));
    }
    const recipe = value;
    validateSemantics(recipe);
    return deepFreeze(recipe);
}
function normalizeSources(sources) {
    return Array.isArray(sources) ? sources : [sources];
}
let defaultCatalog;
function loadCatalog(sources) {
    if (sources === undefined && defaultCatalog !== undefined) {
        return defaultCatalog;
    }
    const usingBuiltIns = sources === undefined;
    const recipes = normalizeSources(sources ?? builtInRecipeTexts).map((source) => validateRecipe(source));
    const seen = new Set();
    for (const recipe of recipes) {
        if (seen.has(recipe.id)) {
            throw fail("recipe-invalid", `duplicate target recipe ${JSON.stringify(recipe.id)}`);
        }
        seen.add(recipe.id);
    }
    if (usingBuiltIns) {
        const missing = contract.targetIds.filter((id) => !seen.has(id));
        if (missing.length > 0) {
            throw fail("recipe-invalid", `catalog is missing contract targets: ${missing.join(", ")}`);
        }
    }
    const catalog = deepFreeze([...recipes].sort((left, right) => left.id.localeCompare(right.id)));
    if (usingBuiltIns) {
        defaultCatalog = catalog;
    }
    return catalog;
}
function getTarget(idOrCatalog, catalogOrId) {
    const id = typeof idOrCatalog === "string" ? idOrCatalog : catalogOrId;
    const catalog = typeof idOrCatalog === "string"
        ? catalogOrId ?? loadCatalog()
        : idOrCatalog;
    if (typeof id !== "string") {
        throw fail("usage", "target ID is required");
    }
    const target = catalog.find((recipe) => recipe.id === id);
    if (target === undefined) {
        throw fail("usage", `unknown target ${JSON.stringify(id)}`);
    }
    return target;
}

const redaction = "[REDACTED]";
const sensitiveKeys = /^(?:authorization|credential|privateKey|secret|serial|serialNumber|token)$/iu;
const privateKeyPattern = /-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/gu;
const labeledSecretPattern = /\b(authorization|credential|secret|serial|token)(\s*[:=]\s*)([^\s,;]+)/giu;
function redactString(value) {
    return value
        .replace(privateKeyPattern, redaction)
        .replace(labeledSecretPattern, `$1$2${redaction}`);
}
function redactValue(value, redactFacts, seen) {
    if (typeof value === "string") {
        return redactString(value);
    }
    if (value === null || typeof value !== "object") {
        return value;
    }
    const previous = seen.get(value);
    if (previous !== undefined) {
        return previous;
    }
    if (Array.isArray(value)) {
        const result = [];
        seen.set(value, result);
        for (const item of value) {
            result.push(redactValue(item, redactFacts, seen));
        }
        return result;
    }
    const source = value;
    const result = {};
    seen.set(value, result);
    const fact = typeof source["fact"] === "string" ? source["fact"] : undefined;
    for (const [key, child] of Object.entries(source)) {
        if (sensitiveKeys.test(key) ||
            (key === "value" && fact !== undefined && redactFacts.has(fact))) {
            result[key] = redaction;
        }
        else {
            result[key] = redactValue(child, redactFacts, seen);
        }
    }
    return result;
}
function redactTranscript(transcript, additionalFacts = []) {
    const sensitiveFacts = new Set(contract.probeIds
        .filter((probe) => probe.sensitive === true)
        .map((probe) => probe.fact));
    for (const fact of additionalFacts) {
        sensitiveFacts.add(fact);
    }
    return redactValue(transcript, sensitiveFacts, new WeakMap());
}

class PromiseResolver {
    #promise;
    get promise() { return this.#promise; }
    #resolve;
    #reject;
    #state = 'running';
    get state() { return this.#state; }
    constructor() {
        this.#promise = new Promise((resolve, reject) => {
            this.#resolve = resolve;
            this.#reject = reject;
        });
    }
    resolve = (value) => {
        this.#resolve(value);
        this.#state = 'resolved';
    };
    reject = (reason) => {
        this.#reject(reason);
        this.#state = 'rejected';
    };
}

class AsyncOperationManager {
    nextId;
    pendingResolvers = new Map();
    constructor(startId = 0) {
        this.nextId = startId;
    }
    add() {
        const id = this.nextId++;
        const resolver = new PromiseResolver();
        this.pendingResolvers.set(id, resolver);
        return [id, resolver.promise];
    }
    getResolver(id) {
        if (!this.pendingResolvers.has(id)) {
            return null;
        }
        const resolver = this.pendingResolvers.get(id);
        this.pendingResolvers.delete(id);
        return resolver;
    }
    resolve(id, result) {
        const resolver = this.getResolver(id);
        if (resolver !== null) {
            resolver.resolve(result);
            return true;
        }
        return false;
    }
    reject(id, reason) {
        const resolver = this.getResolver(id);
        if (resolver !== null) {
            resolver.reject(reason);
            return true;
        }
        return false;
    }
}

function delay(time) {
    return new Promise(resolve => {
        globalThis.setTimeout(() => resolve(), time);
    });
}

function isPromiseLike(value) {
    return typeof value === "object" && value !== null && "then" in value;
}

function advance(iterator, next) {
    while (true) {
        const { done, value } = iterator.next(next);
        if (done) {
            return value;
        }
        if (isPromiseLike(value)) {
            return value.then((value) => advance(iterator, { resolved: value }), (error) => advance(iterator, { error }));
        }
        next = value;
    }
}
/* #__NO_SIDE_EFFECTS__ */
function bipedal(fn, bindThis) {
    function result(...args) {
        const iterator = fn.call(this, function* (value) {
            if (isPromiseLike(value)) {
                const result = yield value;
                if ("resolved" in result) {
                    return result.resolved;
                }
                else {
                    throw result.error;
                }
            }
            return value;
        }, ...args);
        return advance(iterator, undefined);
    }
    {
        return result;
    }
}

/* Adapt default field serializer to universal field serializer */
function defaultFieldSerializer(serializer) {
    return (source, context) => {
        if ("buffer" in context) {
            const buffer = serializer(source, context);
            context.buffer.set(buffer, context.index);
            return buffer.length;
        }
        else {
            return serializer(source, context);
        }
    };
}
/* Adapt byob field serializer to universal field serializer */
function byobFieldSerializer(size, serializer) {
    return (source, context) => {
        if ("buffer" in context) {
            context.index ??= 0;
            serializer(source, context);
            return size;
        }
        else {
            const buffer = new Uint8Array(size);
            serializer(source, {
                buffer,
                index: 0,
                littleEndian: context.littleEndian,
            });
            return buffer;
        }
    };
}

/* #__NO_SIDE_EFFECTS__ */
// eslint-disable-next-line @typescript-eslint/max-params
function _field(size, type, serialize, deserialize, options) {
    const field = {
        size,
        type: type,
        serialize: type === "default"
            ? defaultFieldSerializer(serialize)
            : byobFieldSerializer(size, serialize),
        deserialize: bipedal(deserialize),
        omitInit: options?.omitInit,
    };
    if (options?.init) {
        field.init = options.init;
    }
    return field;
}
const field = _field;

const EmptyUint8Array = new Uint8Array(0);
function copyMaybeDifferentLength(dest, source, index, length) {
    if (source.length < length) {
        dest.set(source, index);
        // Clear trailing bytes
        dest.fill(0, index + source.length, index + length);
    }
    else if (source.length === length) {
        dest.set(source, index);
    }
    else {
        dest.set(source.subarray(0, length), index);
    }
}
/* #__NO_SIDE_EFFECTS__ */
function buffer(lengthOrField, converter) {
    // Fixed length
    if (typeof lengthOrField === "number") {
        let serialize;
        let deserialize;
        let init;
        if (lengthOrField === 0) {
            serialize = () => { };
            if (converter) {
                // eslint-disable-next-line require-yield
                deserialize = function* () {
                    return converter.convert(EmptyUint8Array);
                };
            }
            else {
                // eslint-disable-next-line require-yield
                deserialize = function* () {
                    return EmptyUint8Array;
                };
            }
        }
        else {
            serialize = (value, { buffer, index }) => copyMaybeDifferentLength(buffer, value, index, lengthOrField);
            if (converter) {
                deserialize = function* (then, reader) {
                    const array = reader.readExactly(lengthOrField);
                    return converter.convert(yield* then(array));
                };
                init = (value) => converter.back(value);
            }
            else {
                // eslint-disable-next-line require-yield
                deserialize = function* (_then, reader) {
                    const array = reader.readExactly(lengthOrField);
                    return array;
                };
            }
        }
        return field(lengthOrField, "byob", serialize, deserialize, { init });
    }
    // Declare length field
    // Some field types are `function`s
    if ((typeof lengthOrField === "object" ||
        typeof lengthOrField === "function") &&
        "serialize" in lengthOrField) {
        let deserialize;
        let init;
        if (converter) {
            deserialize = function* (then, reader, context) {
                const length = yield* then(lengthOrField.deserialize(reader, context));
                const array = length !== 0 ? reader.readExactly(length) : EmptyUint8Array;
                return converter.convert(yield* then(array));
            };
            init = (value) => converter.back(value);
        }
        else {
            deserialize = function* (then, reader, context) {
                const length = yield* then(lengthOrField.deserialize(reader, context));
                const array = length !== 0 ? reader.readExactly(length) : EmptyUint8Array;
                return array;
            };
        }
        return field(lengthOrField.size, "default", (value, { littleEndian }) => {
            if (lengthOrField.type === "default") {
                const lengthBuffer = lengthOrField.serialize(value.length, {
                    littleEndian,
                });
                if (value.length === 0) {
                    return lengthBuffer;
                }
                const result = new Uint8Array(lengthBuffer.length + value.length);
                result.set(lengthBuffer, 0);
                result.set(value, lengthBuffer.length);
                return result;
            }
            else {
                const result = new Uint8Array(lengthOrField.size + value.length);
                lengthOrField.serialize(value.length, {
                    buffer: result,
                    index: 0,
                    littleEndian,
                });
                result.set(value, lengthOrField.size);
                return result;
            }
        }, deserialize, { init });
    }
    // Reference existing length field
    if (typeof lengthOrField === "string") {
        let deserialize;
        let init;
        if (converter) {
            deserialize = function* (then, reader, { dependencies }) {
                const length = dependencies[lengthOrField];
                const array = length !== 0 ? reader.readExactly(length) : EmptyUint8Array;
                return converter.convert(yield* then(array));
            };
            init = (value, dependencies) => {
                const array = converter.back(value);
                dependencies[lengthOrField] = array.length;
                return array;
            };
        }
        else {
            // eslint-disable-next-line require-yield
            deserialize = function* (_then, reader, { dependencies }) {
                const length = dependencies[lengthOrField];
                const array = length !== 0 ? reader.readExactly(length) : EmptyUint8Array;
                return array;
            };
            init = (value, dependencies) => {
                const array = value;
                dependencies[lengthOrField] = array.length;
                return array;
            };
        }
        return field(0, "default", (source) => source, deserialize, { init });
    }
    let deserialize;
    let init;
    // Reference existing length field + length converter
    if (converter) {
        deserialize = function* (then, reader, { dependencies }) {
            const rawLength = dependencies[lengthOrField.field];
            const length = lengthOrField.convert(rawLength);
            const array = length !== 0 ? reader.readExactly(length) : EmptyUint8Array;
            return converter.convert(yield* then(array));
        };
        init = (value, dependencies) => {
            const array = converter.back(value);
            dependencies[lengthOrField.field] = lengthOrField.back(array.length);
            return array;
        };
    }
    else {
        // eslint-disable-next-line require-yield
        deserialize = function* (_then, reader, { dependencies }) {
            const rawLength = dependencies[lengthOrField.field];
            const length = lengthOrField.convert(rawLength);
            const array = length !== 0 ? reader.readExactly(length) : EmptyUint8Array;
            return array;
        };
        init = (value, dependencies) => {
            const array = value;
            dependencies[lengthOrField.field] = lengthOrField.back(array.length);
            return array;
        };
    }
    return field(0, "default", (source) => source, deserialize, { init });
}

// TODO: allow over reading (returning a `Uint8Array`, an `offset` and a `length`) to avoid copying
class ExactReadableEndedError extends Error {
    constructor() {
        super("ExactReadable ended");
    }
}
class Uint8ArrayExactReadable {
    #data;
    #position;
    get position() {
        return this.#position;
    }
    constructor(data) {
        this.#data = data;
        this.#position = 0;
    }
    readExactly(length) {
        if (this.#position + length > this.#data.length) {
            throw new ExactReadableEndedError();
        }
        const result = this.#data.subarray(this.#position, this.#position + length);
        this.#position += length;
        return result;
    }
}

class StructDeserializeError extends Error {
    constructor(message) {
        super(message);
    }
}
class StructNotEnoughDataError extends StructDeserializeError {
    constructor() {
        super("The underlying readable was ended before the struct was fully deserialized");
    }
}
class StructEmptyError extends StructDeserializeError {
    constructor() {
        super("The underlying readable doesn't contain any more struct");
    }
}
/* #__NO_SIDE_EFFECTS__ */
function struct(fields, options) {
    const fieldList = Object.entries(fields);
    let size = 0;
    let byob = true;
    for (const [, field] of fieldList) {
        size += field.size;
        if (byob && field.type !== "byob") {
            byob = false;
        }
    }
    const littleEndian = options.littleEndian;
    const extra = options.extra
        ? Object.getOwnPropertyDescriptors(options.extra)
        : undefined;
    return {
        littleEndian,
        fields,
        extra: options.extra,
        type: byob ? "byob" : "default",
        size,
        serialize(source, bufferOrContext) {
            const temp = { ...source };
            for (const [key, field] of fieldList) {
                if (key in temp && "init" in field) {
                    const result = field.init?.(temp[key], temp);
                    temp[key] = result;
                }
            }
            const sizes = new Array(fieldList.length);
            const buffers = new Array(fieldList.length);
            {
                const context = { littleEndian };
                for (const [index, [key, field]] of fieldList.entries()) {
                    if (field.type === "byob") {
                        sizes[index] = field.size;
                    }
                    else {
                        buffers[index] = field.serialize(temp[key], context);
                        sizes[index] = buffers[index].length;
                    }
                }
            }
            const size = sizes.reduce((sum, size) => sum + size, 0);
            let externalBuffer;
            let buffer;
            let index;
            if (bufferOrContext instanceof Uint8Array) {
                if (bufferOrContext.length < size) {
                    throw new Error("Buffer too small");
                }
                externalBuffer = true;
                buffer = bufferOrContext;
                index = 0;
            }
            else if (typeof bufferOrContext === "object" &&
                "buffer" in bufferOrContext) {
                externalBuffer = true;
                buffer = bufferOrContext.buffer;
                index = bufferOrContext.index ?? 0;
                if (buffer.length - index < size) {
                    throw new Error("Buffer too small");
                }
            }
            else {
                externalBuffer = false;
                buffer = new Uint8Array(size);
                index = 0;
            }
            const context = {
                buffer,
                index,
                littleEndian,
            };
            for (const [index, [key, field]] of fieldList.entries()) {
                if (buffers[index]) {
                    buffer.set(buffers[index], context.index);
                }
                else {
                    field.serialize(temp[key], context);
                }
                context.index += sizes[index];
            }
            if (externalBuffer) {
                return size;
            }
            else {
                return buffer;
            }
        },
        deserialize: bipedal(function* (then, reader) {
            const startPosition = reader.position;
            const result = {};
            const context = {
                dependencies: result,
                littleEndian: littleEndian,
            };
            try {
                for (const [key, field] of fieldList) {
                    result[key] = yield* then(field.deserialize(reader, context));
                }
            }
            catch (e) {
                if (!(e instanceof ExactReadableEndedError)) {
                    throw e;
                }
                if (reader.position === startPosition) {
                    throw new StructEmptyError();
                }
                else {
                    throw new StructNotEnoughDataError();
                }
            }
            if (extra) {
                Object.defineProperties(result, extra);
            }
            if (options.postDeserialize) {
                return options.postDeserialize.call(result, result);
            }
            else {
                return result;
            }
        }),
    };
}

/* #__NO_SIDE_EFFECTS__ */
function extend(base, fields, options) {
    return struct(Object.assign({}, base.fields, fields), {
        littleEndian: options?.littleEndian ?? base.littleEndian,
        extra: base.extra,
        postDeserialize: options?.postDeserialize,
    });
}

/* #__NO_SIDE_EFFECTS__ */
function getInt32$1(buffer, offset, littleEndian) {
    return littleEndian
        ? buffer[offset] |
            (buffer[offset + 1] << 8) |
            (buffer[offset + 2] << 16) |
            (buffer[offset + 3] << 24)
        : (buffer[offset] << 24) |
            (buffer[offset + 1] << 16) |
            (buffer[offset + 2] << 8) |
            buffer[offset + 3];
}
function setInt32(buffer, offset, value, littleEndian) {
    if (littleEndian) {
        buffer[offset] = value;
        buffer[offset + 1] = value >> 8;
        buffer[offset + 2] = value >> 16;
        buffer[offset + 3] = value >> 24;
    }
    else {
        buffer[offset] = value >> 24;
        buffer[offset + 1] = value >> 16;
        buffer[offset + 2] = value >> 8;
        buffer[offset + 3] = value;
    }
}

function setInt64LittleEndian(buffer, offset, value) {
    buffer[offset] = Number(value & 0xffn);
    buffer[offset + 1] = Number((value >> 8n) & 0xffn);
    buffer[offset + 2] = Number((value >> 16n) & 0xffn);
    buffer[offset + 3] = Number((value >> 24n) & 0xffn);
    buffer[offset + 4] = Number((value >> 32n) & 0xffn);
    buffer[offset + 5] = Number((value >> 40n) & 0xffn);
    buffer[offset + 6] = Number((value >> 48n) & 0xffn);
    buffer[offset + 7] = Number((value >> 56n) & 0xffn);
}
function setInt64BigEndian(buffer, offset, value) {
    buffer[offset] = Number((value >> 56n) & 0xffn);
    buffer[offset + 1] = Number((value >> 48n) & 0xffn);
    buffer[offset + 2] = Number((value >> 40n) & 0xffn);
    buffer[offset + 3] = Number((value >> 32n) & 0xffn);
    buffer[offset + 4] = Number((value >> 24n) & 0xffn);
    buffer[offset + 5] = Number((value >> 16n) & 0xffn);
    buffer[offset + 6] = Number((value >> 8n) & 0xffn);
    buffer[offset + 7] = Number(value & 0xffn);
}

/* #__NO_SIDE_EFFECTS__ */
function getUint32LittleEndian(buffer, offset) {
    return ((buffer[offset] |
        (buffer[offset + 1] << 8) |
        (buffer[offset + 2] << 16) |
        (buffer[offset + 3] << 24)) >>>
        0);
}
/* #__NO_SIDE_EFFECTS__ */
function getUint32$1(buffer, offset, littleEndian) {
    return littleEndian
        ? (buffer[offset] |
            (buffer[offset + 1] << 8) |
            (buffer[offset + 2] << 16) |
            (buffer[offset + 3] << 24)) >>>
            0
        : ((buffer[offset] << 24) |
            (buffer[offset + 1] << 16) |
            (buffer[offset + 2] << 8) |
            buffer[offset + 3]) >>>
            0;
}
function setUint32LittleEndian(buffer, offset, value) {
    buffer[offset] = value;
    buffer[offset + 1] = value >> 8;
    buffer[offset + 2] = value >> 16;
    buffer[offset + 3] = value >> 24;
}
function setUint32$1(buffer, offset, value, littleEndian) {
    if (littleEndian) {
        buffer[offset] = value;
        buffer[offset + 1] = value >> 8;
        buffer[offset + 2] = value >> 16;
        buffer[offset + 3] = value >> 24;
    }
    else {
        buffer[offset] = value >> 24;
        buffer[offset + 1] = value >> 16;
        buffer[offset + 2] = value >> 8;
        buffer[offset + 3] = value;
    }
}

function getUint64BigEndian(buffer, offset) {
    return ((BigInt(buffer[offset]) << 56n) |
        (BigInt(buffer[offset + 1]) << 48n) |
        (BigInt(buffer[offset + 2]) << 40n) |
        (BigInt(buffer[offset + 3]) << 32n) |
        (BigInt(buffer[offset + 4]) << 24n) |
        (BigInt(buffer[offset + 5]) << 16n) |
        (BigInt(buffer[offset + 6]) << 8n) |
        BigInt(buffer[offset + 7]));
}
function getUint64(buffer, offset, littleEndian) {
    return littleEndian
        ? BigInt(buffer[offset]) |
            (BigInt(buffer[offset + 1]) << 8n) |
            (BigInt(buffer[offset + 2]) << 16n) |
            (BigInt(buffer[offset + 3]) << 24n) |
            (BigInt(buffer[offset + 4]) << 32n) |
            (BigInt(buffer[offset + 5]) << 40n) |
            (BigInt(buffer[offset + 6]) << 48n) |
            (BigInt(buffer[offset + 7]) << 56n)
        : (BigInt(buffer[offset]) << 56n) |
            (BigInt(buffer[offset + 1]) << 48n) |
            (BigInt(buffer[offset + 2]) << 40n) |
            (BigInt(buffer[offset + 3]) << 32n) |
            (BigInt(buffer[offset + 4]) << 24n) |
            (BigInt(buffer[offset + 5]) << 16n) |
            (BigInt(buffer[offset + 6]) << 8n) |
            BigInt(buffer[offset + 7]);
}
function setUint64(buffer, offset, value, littleEndian) {
    if (littleEndian) {
        buffer[offset] = Number(value & 0xffn);
        buffer[offset + 1] = Number((value >> 8n) & 0xffn);
        buffer[offset + 2] = Number((value >> 16n) & 0xffn);
        buffer[offset + 3] = Number((value >> 24n) & 0xffn);
        buffer[offset + 4] = Number((value >> 32n) & 0xffn);
        buffer[offset + 5] = Number((value >> 40n) & 0xffn);
        buffer[offset + 6] = Number((value >> 48n) & 0xffn);
        buffer[offset + 7] = Number((value >> 56n) & 0xffn);
    }
    else {
        buffer[offset] = Number((value >> 56n) & 0xffn);
        buffer[offset + 1] = Number((value >> 48n) & 0xffn);
        buffer[offset + 2] = Number((value >> 40n) & 0xffn);
        buffer[offset + 3] = Number((value >> 32n) & 0xffn);
        buffer[offset + 4] = Number((value >> 24n) & 0xffn);
        buffer[offset + 5] = Number((value >> 16n) & 0xffn);
        buffer[offset + 6] = Number((value >> 8n) & 0xffn);
        buffer[offset + 7] = Number(value & 0xffn);
    }
}

/* #__NO_SIDE_EFFECTS__ */
function number(size, serialize, deserialize) {
    const fn = (() => fn);
    Object.assign(fn, field(size, "byob", serialize, deserialize));
    return fn;
}
const u8 = number(1, (value, { buffer, index }) => {
    buffer[index] = value;
}, function* (then, reader) {
    const data = yield* then(reader.readExactly(1));
    return data[0];
});
const u32 = number(4, (value, { buffer, index, littleEndian }) => {
    setUint32$1(buffer, index, value, littleEndian);
}, function* (then, reader, { littleEndian }) {
    const data = yield* then(reader.readExactly(4));
    return getUint32$1(data, 0, littleEndian);
});
const s32 = number(4, (value, { buffer, index, littleEndian }) => {
    setInt32(buffer, index, value, littleEndian);
}, function* (then, reader, { littleEndian }) {
    const data = yield* then(reader.readExactly(4));
    return getInt32$1(data, 0, littleEndian);
});
const u64 = number(8, (value, { buffer, index, littleEndian }) => {
    setUint64(buffer, index, value, littleEndian);
}, function* (then, reader, { littleEndian }) {
    const data = yield* then(reader.readExactly(8));
    return getUint64(data, 0, littleEndian);
});

// This library can't use `@types/node` or `lib: dom`
// because they will pollute the global scope
// So `TextEncoder` and `TextDecoder` types are not available
const { TextEncoder: TextEncoder$1, TextDecoder: TextDecoder$1 } = globalThis;
const SharedEncoder = /* #__PURE__ */ new TextEncoder$1();
const SharedDecoder = /* #__PURE__ */ new TextDecoder$1();
/* #__NO_SIDE_EFFECTS__ */
function encodeUtf8(input) {
    return SharedEncoder.encode(input);
}
/* #__NO_SIDE_EFFECTS__ */
function decodeUtf8(buffer) {
    // `TextDecoder` has internal states in stream mode,
    // but this method is not for stream mode, so the instance can be reused
    return SharedDecoder.decode(buffer);
}

// Prettier will move the annotation and make it invalid
// prettier-ignore
const string = ( /* #__NO_SIDE_EFFECTS__ */(lengthOrField) => {
    const field = buffer(lengthOrField, {
        convert: decodeUtf8,
        back: encodeUtf8,
    });
    field.as = () => field;
    return field;
});

const { AbortController: AbortController$1 } = globalThis;
const ReadableStream$1 = /* #__PURE__ */ (() => {
    const { ReadableStream } = globalThis;
    if (!ReadableStream.from) {
        ReadableStream.from = function (iterable) {
            const iterator = Symbol.asyncIterator in iterable
                ? iterable[Symbol.asyncIterator]()
                : iterable[Symbol.iterator]();
            return new ReadableStream({
                async pull(controller) {
                    const result = await iterator.next();
                    if (result.done) {
                        controller.close();
                        return;
                    }
                    controller.enqueue(result.value);
                },
                async cancel(reason) {
                    await iterator.return?.(reason);
                },
            });
        };
    }
    if (!ReadableStream.prototype[Symbol.asyncIterator] ||
        !ReadableStream.prototype.values) {
        ReadableStream.prototype.values = async function* (options) {
            const reader = this.getReader();
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        return;
                    }
                    yield value;
                }
            }
            finally {
                // Calling `iterator.return` will enter this `finally` block.
                // We don't need to care about the parameter to `iterator.return`,
                // it will be returned as the final `result.value` automatically.
                if (!options?.preventCancel) {
                    await reader.cancel();
                }
                reader.releaseLock();
            }
        };
        ReadableStream.prototype[Symbol.asyncIterator] =
            // eslint-disable-next-line @typescript-eslint/unbound-method
            ReadableStream.prototype.values;
    }
    return ReadableStream;
})();
const { WritableStream: WritableStream$1, TransformStream: TransformStream$1 } = globalThis;

class TaskQueue {
    #ready;
    #disposed = false;
    enqueue(task, bail = false) {
        if (this.#disposed) {
            throw new Error("TaskQueue is disposed");
        }
        if (!this.#ready) {
            // Init state or all previous tasks are synchronous
            try {
                const result = task();
                if (isPromiseLike(result)) {
                    this.#ready = result.then(() => { }, (e) => {
                        if (bail) {
                            throw e;
                        }
                    });
                }
                return result;
            }
            catch (e) {
                if (bail) {
                    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
                    const promise = Promise.reject(e);
                    // Suppress unhandled-rejection without resolving `#ready`
                    void promise.catch(() => { });
                    this.#ready = promise;
                }
                throw e;
            }
        }
        const result = this.#ready.then(() => {
            if (this.#disposed) {
                throw new Error("TaskQueue is disposed");
            }
            return task();
        });
        this.#ready = result.then(() => { }, (e) => {
            if (bail || this.#disposed) {
                throw e;
            }
        });
        return result;
    }
    dispose() {
        this.#disposed = true;
    }
}

class PushReadableStream extends ReadableStream$1 {
    /**
     * Create a new `PushReadableStream` from a source.
     *
     * @param source If `source` returns a `Promise`, the stream will be closed
     * when the `Promise` is resolved, and be errored when the `Promise` is rejected.
     * @param strategy
     */
    constructor(source, strategy, logger) {
        let controller;
        const tasks = new TaskQueue();
        let zeroHighWaterMarkAllowEnqueue = false;
        // Resolves when consumer calls `reader.read`.
        // Rejects when producer calls `controller.close` or `controller.error`,
        // or consumer calls `reader.cancel`.
        let waterMarkLow;
        const abortController = new AbortController$1();
        // Whether either the consumer has called `stream.cancel()`,
        // or the producer has called `controller.close` or `controller.error`.
        let stopped = false;
        const enqueue = (chunk) => {
            logger?.({
                source: "producer",
                operation: "enqueue",
                value: chunk,
                phase: "start",
            });
            if (abortController.signal.aborted) {
                // In original `ReadableStream`, calling `enqueue` or `close`
                // on an cancelled stream will throw an error,
                //
                // But in `PushReadableStream`, `enqueue` is an async function,
                // the producer can't just check `abortSignal.aborted`
                // before calling `enqueue`, as it might change when waiting
                // for the backpressure to be reduced.
                //
                // So IMO it's better to handle this for the producer
                // by simply ignoring the `enqueue` call.
                //
                // Note that we check `abortSignal.aborted` instead of `stopped`,
                // as it's not allowed for the producer to call `enqueue` after
                // they called `close` or `error`.
                //
                // Obviously, the producer should listen to the `abortSignal` and
                // stop producing, but most pushing data sources don't support that.
                logger?.({
                    source: "producer",
                    operation: "enqueue",
                    value: chunk,
                    phase: "ignored",
                });
                return false;
            }
            if (controller.desiredSize === null) {
                // `desiredSize` being `null` means the stream is in error state,
                // `controller.enqueue` will throw an error for us.
                controller.enqueue(chunk);
                // istanbul ignore next
                throw new Error("unreachable");
            }
            if (zeroHighWaterMarkAllowEnqueue) {
                // When `highWaterMark` is set to `0`,
                // `controller.desiredSize` will always be `0`,
                // even if the consumer has called `reader.read()`.
                // (in this case, each `reader.read()`/`pull`
                // should allow one `enqueue` of any size)
                //
                // If the consumer has already called `reader.read()`,
                // before the producer tries to `enqueue`,
                // `controller.desiredSize` is `0` and normal `waterMarkLow` signal
                // will never trigger,
                // (because `ReadableStream` prevents reentrance of `pull`)
                // The stream will stuck.
                //
                // So we need a special signal for this case.
                zeroHighWaterMarkAllowEnqueue = false;
                controller.enqueue(chunk);
                logger?.({
                    source: "producer",
                    operation: "enqueue",
                    value: chunk,
                    phase: "complete",
                });
                return true;
            }
            if (controller.desiredSize <= 0) {
                logger?.({
                    source: "producer",
                    operation: "enqueue",
                    value: chunk,
                    phase: "waiting",
                });
                waterMarkLow = new PromiseResolver();
                return waterMarkLow.promise.then(() => {
                    controller.enqueue(chunk);
                    logger?.({
                        source: "producer",
                        operation: "enqueue",
                        value: chunk,
                        phase: "complete",
                    });
                    return true;
                }, () => {
                    // Only ignore this in-flight `enqueue` call
                    // future calls will trigger `desiredSize === null` and throw
                    logger?.({
                        source: "producer",
                        operation: "enqueue",
                        value: chunk,
                        phase: "ignored",
                    });
                    return false;
                });
            }
            controller.enqueue(chunk);
            logger?.({
                source: "producer",
                operation: "enqueue",
                value: chunk,
                phase: "complete",
            });
            return true;
        };
        const close = (explicit) => {
            logger?.({
                source: "producer",
                operation: "close",
                explicit,
                phase: "start",
            });
            // Allow calling `controller.close` on cancelled stream as `enqueue` does
            // Ignore implicit close on any stopped state
            // But don't allow calling `controller.close` multiple times
            if (abortController.signal.aborted || (stopped && !explicit)) {
                logger?.({
                    source: "producer",
                    operation: "close",
                    explicit,
                    phase: "ignored",
                });
                return;
            }
            // This will throw for us if the stream is not in `readable` state
            controller.close();
            stopped = true;
            // Wake up pending `enqueue`
            waterMarkLow?.reject();
            logger?.({
                source: "producer",
                operation: "close",
                explicit,
                phase: "complete",
            });
        };
        const error = (error, explicit) => {
            logger?.({
                source: "producer",
                operation: "error",
                explicit,
                phase: "start",
            });
            stopped = true;
            // `controller.error` won't throw on closed/errored/cancelled stream
            // so don't need any checks
            controller.error(error);
            // Wake up pending `enqueue`
            waterMarkLow?.reject();
            logger?.({
                source: "producer",
                operation: "error",
                explicit,
                phase: "complete",
            });
        };
        super({
            start: (controller_) => {
                controller = controller_;
                const result = source({
                    abortSignal: abortController.signal,
                    enqueue: async (chunk) => 
                    // Run `enqueue`s in serial
                    // Use `async/await` to always return a `Promise`
                    await tasks.enqueue(() => enqueue(chunk)),
                    close() {
                        close(true);
                    },
                    error(e) {
                        error(e, true);
                    },
                });
                if (!stopped && isPromiseLike(result)) {
                    // If `source` returns a `Promise`,
                    // close the stream when the `Promise` is resolved,
                    // and error the stream when the `Promise` is rejected.
                    // The producer can return a never-settling `Promise`
                    // to disable this behavior.
                    result.then(() => close(false), (e) => error(e, false));
                }
            },
            pull: () => {
                logger?.({
                    source: "consumer",
                    operation: "pull",
                    phase: "start",
                });
                if (waterMarkLow) {
                    waterMarkLow.resolve(undefined);
                    waterMarkLow = undefined;
                }
                else if (strategy?.highWaterMark === 0) {
                    zeroHighWaterMarkAllowEnqueue = true;
                }
                logger?.({
                    source: "consumer",
                    operation: "pull",
                    phase: "complete",
                });
            },
            cancel: (reason) => {
                logger?.({
                    source: "consumer",
                    operation: "cancel",
                    phase: "start",
                });
                stopped = true;
                abortController.abort(reason);
                waterMarkLow?.reject();
                logger?.({
                    source: "consumer",
                    operation: "cancel",
                    phase: "complete",
                });
            },
        }, strategy);
    }
}

function tryClose(value) {
    try {
        const result = value.close();
        if (isPromiseLike(result)) {
            return result.then(() => true, () => false);
        }
        return true;
    }
    catch {
        return false;
    }
}
async function tryCancel(stream) {
    try {
        await stream.cancel();
        return true;
    }
    catch {
        return false;
    }
}

class BufferedReadableStream {
    #buffered;
    // PERF: `subarray` is slow
    // don't use it until absolutely necessary
    #bufferedOffset = 0;
    #bufferedLength = 0;
    #position = 0;
    get position() {
        return this.#position;
    }
    stream;
    reader;
    constructor(stream) {
        this.stream = stream;
        this.reader = stream.getReader();
    }
    #readBuffered(length) {
        if (!this.#buffered) {
            return undefined;
        }
        const value = this.#buffered.subarray(this.#bufferedOffset, this.#bufferedOffset + length);
        // PERF: Synchronous path for reading from internal buffer
        if (this.#bufferedLength > length) {
            this.#position += length;
            this.#bufferedOffset += length;
            this.#bufferedLength -= length;
            return value;
        }
        this.#position += this.#bufferedLength;
        this.#buffered = undefined;
        this.#bufferedOffset = 0;
        this.#bufferedLength = 0;
        return value;
    }
    async #readSource(length) {
        const { done, value } = await this.reader.read();
        if (done) {
            throw new ExactReadableEndedError();
        }
        if (value.length > length) {
            this.#buffered = value;
            this.#bufferedOffset = length;
            this.#bufferedLength = value.length - length;
            this.#position += length;
            return value.subarray(0, length);
        }
        this.#position += value.length;
        return value;
    }
    iterateExactly(length) {
        let state = this.#buffered ? 0 : 1;
        return {
            next: () => {
                switch (state) {
                    case 0: {
                        const value = this.#readBuffered(length);
                        if (value.length === length) {
                            state = 2;
                        }
                        else {
                            length -= value.length;
                            state = 1;
                        }
                        return { done: false, value };
                    }
                    case 1:
                        state = 3;
                        return {
                            done: false,
                            value: this.#readSource(length).then((value) => {
                                if (value.length === length) {
                                    state = 2;
                                }
                                else {
                                    length -= value.length;
                                    state = 1;
                                }
                                return value;
                            }),
                        };
                    case 2:
                        return { done: true, value: undefined };
                    case 3:
                        throw new Error("Can't call `next` before previous Promise resolves");
                    default:
                        throw new Error("unreachable");
                }
            },
        };
    }
    readExactly = bipedal(function* (then, length) {
        let result;
        let index = 0;
        const initial = this.#readBuffered(length);
        if (initial) {
            if (initial.length === length) {
                return initial;
            }
            result = new Uint8Array(length);
            result.set(initial, index);
            index += initial.length;
            length -= initial.length;
        }
        else {
            result = new Uint8Array(length);
        }
        while (length > 0) {
            const value = yield* then(this.#readSource(length));
            result.set(value, index);
            index += value.length;
            length -= value.length;
        }
        return result;
    });
    /**
     * Return a readable stream with unconsumed data (if any) and
     * all data from the wrapped stream.
     * @returns A `ReadableStream`
     */
    release() {
        if (this.#bufferedLength > 0) {
            return new PushReadableStream(async (controller) => {
                // Put the remaining data back to the stream
                const buffered = this.#buffered.subarray(this.#bufferedOffset);
                await controller.enqueue(buffered);
                controller.abortSignal.addEventListener("abort", () => {
                    void tryCancel(this.reader);
                });
                // Manually pipe the stream
                while (true) {
                    const { done, value } = await this.reader.read();
                    if (done) {
                        return;
                    }
                    await controller.enqueue(value);
                }
            });
        }
        else {
            // Simply release the reader and return the stream
            this.reader.releaseLock();
            return this.stream;
        }
    }
    async cancel(reason) {
        await this.reader.cancel(reason);
    }
}

// TODO: BufferedTransformStream: find better implementation
class BufferedTransformStream {
    #readable;
    get readable() {
        return this.#readable;
    }
    #writable;
    get writable() {
        return this.#writable;
    }
    constructor(transform) {
        // Convert incoming chunks to a `BufferedReadableStream`
        let bufferedStreamController;
        let writableStreamController;
        const buffered = new BufferedReadableStream(new PushReadableStream((controller) => {
            bufferedStreamController = controller;
        }));
        this.#readable = new ReadableStream$1({
            async pull(controller) {
                try {
                    const value = await transform(buffered);
                    controller.enqueue(value);
                }
                catch (e) {
                    // Treat `StructEmptyError` as a normal end.
                    // If the `transform` method doesn't have enough data to return a value,
                    // it should throw another error to indicate that.
                    if (e instanceof StructEmptyError) {
                        controller.close();
                        return;
                    }
                    throw e;
                }
            },
            cancel: (reason) => {
                // If a `ReadableStream` is piping into `#writable`,
                // This will cancel the `ReadableStream` immediately.
                // If upstream is writing using `#writable`'s writer, this will
                // throw errors for any future writes
                return writableStreamController.error(reason);
            },
        });
        this.#writable = new WritableStream$1({
            start(controller) {
                writableStreamController = controller;
            },
            async write(chunk) {
                await bufferedStreamController.enqueue(chunk);
            },
            abort() {
                bufferedStreamController.close();
            },
            close() {
                bufferedStreamController.close();
            },
        });
    }
}

// `TransformStream` only calls its `source.flush` method when its `readable` is being read.
// If the user want to use the `Promise` interface, the `flush` method will never be called,
// so the `PromiseResolver` will never be resolved.
// Thus we need to implement our own `TransformStream` using a `WritableStream` and a `ReadableStream`.
/**
 * A `TransformStream` that concatenates strings.
 *
 * Its `readable` is also a `Promise<string>`, so it's possible to `await` it to get the result.
 *
 * ```ts
 * const result: string = await readable.pipeThrough(new ConcatStringStream());
 * ```
 */
class ConcatStringStream {
    // PERF: rope (concat strings) is faster than `[].join('')`
    #result = "";
    #resolver = new PromiseResolver();
    #writable = new WritableStream$1({
        write: (chunk) => {
            this.#result += chunk;
        },
        close: () => {
            this.#resolver.resolve(this.#result);
            this.#readableController.enqueue(this.#result);
            this.#readableController.close();
        },
        abort: (reason) => {
            this.#resolver.reject(reason);
            this.#readableController.error(reason);
        },
    });
    get writable() {
        return this.#writable;
    }
    #readableController;
    #readable = new ReadableStream$1({
        start: (controller) => {
            this.#readableController = controller;
        },
    });
    get readable() {
        return this.#readable;
    }
    constructor() {
        void Object.defineProperties(this.#readable, {
            then: {
                get: () => this.#resolver.promise.then.bind(this.#resolver.promise),
            },
            catch: {
                get: () => this.#resolver.promise.catch.bind(this.#resolver.promise),
            },
            finally: {
                get: () => this.#resolver.promise.finally.bind(this.#resolver.promise),
            },
        });
    }
}
/**
 * A `TransformStream` that concatenates `Uint8Array`s.
 *
 * If you want to decode the result as string,
 * prefer `.pipeThrough(new TextDecoderStream()).pipeThrough(new ConcatStringStream())`,
 * than `.pipeThough(new ConcatBufferStream()).pipeThrough(new TextDecoderStream())`,
 * because of JavaScript engine optimizations,
 * concatenating strings is faster than concatenating `Uint8Array`s.
 */
class ConcatBufferStream {
    #segments = [];
    #resolver = new PromiseResolver();
    #writable = new WritableStream$1({
        write: (chunk) => {
            this.#segments.push(chunk);
        },
        close: () => {
            let result;
            let offset = 0;
            switch (this.#segments.length) {
                case 0:
                    result = EmptyUint8Array;
                    break;
                case 1:
                    result = this.#segments[0];
                    break;
                default:
                    result = new Uint8Array(this.#segments.reduce((prev, item) => prev + item.length, 0));
                    for (const segment of this.#segments) {
                        result.set(segment, offset);
                        offset += segment.length;
                    }
                    break;
            }
            this.#resolver.resolve(result);
            this.#readableController.enqueue(result);
            this.#readableController.close();
        },
        abort: (reason) => {
            this.#resolver.reject(reason);
            this.#readableController.error(reason);
        },
    });
    get writable() {
        return this.#writable;
    }
    #readableController;
    #readable = new ReadableStream$1({
        start: (controller) => {
            this.#readableController = controller;
        },
    });
    get readable() {
        return this.#readable;
    }
    constructor() {
        void Object.defineProperties(this.#readable, {
            then: {
                get: () => this.#resolver.promise.then.bind(this.#resolver.promise),
            },
            catch: {
                get: () => this.#resolver.promise.catch.bind(this.#resolver.promise),
            },
            finally: {
                get: () => this.#resolver.promise.finally.bind(this.#resolver.promise),
            },
        });
    }
}

class ConsumableReadableStream extends ReadableStream$1 {
    static async enqueue(controller, chunk) {
        const output = new Consumable(chunk);
        controller.enqueue(output);
        await output.consumed;
    }
    constructor(source, strategy) {
        let wrappedController;
        let wrappedStrategy;
        if (strategy) {
            wrappedStrategy = {};
            if ("highWaterMark" in strategy) {
                wrappedStrategy.highWaterMark = strategy.highWaterMark;
            }
            if ("size" in strategy) {
                wrappedStrategy.size = (chunk) => {
                    return strategy.size(chunk.value);
                };
            }
        }
        super({
            start(controller) {
                wrappedController = {
                    enqueue(chunk) {
                        return ConsumableReadableStream.enqueue(controller, chunk);
                    },
                    close() {
                        controller.close();
                    },
                    error(reason) {
                        controller.error(reason);
                    },
                };
                return source.start?.(wrappedController);
            },
            pull() {
                return source.pull?.(wrappedController);
            },
            cancel(reason) {
                return source.cancel?.(reason);
            },
        }, wrappedStrategy);
    }
}

class ConsumableWrapByteReadableStream extends ReadableStream$1 {
    constructor(stream, chunkSize, min) {
        const reader = stream.getReader({ mode: "byob" });
        let array = new Uint8Array(chunkSize);
        super({
            async pull(controller) {
                const { done, value } = await reader.read(array, { min });
                if (done) {
                    controller.close();
                    return;
                }
                await ConsumableReadableStream.enqueue(controller, value);
                array = new Uint8Array(value.buffer);
            },
            cancel(reason) {
                return reader.cancel(reason);
            },
        });
    }
}

class ConsumableWrapWritableStream extends WritableStream$1 {
    constructor(stream) {
        const writer = stream.getWriter();
        super({
            write(chunk) {
                return chunk.tryConsume((chunk) => writer.write(chunk));
            },
            abort(reason) {
                return writer.abort(reason);
            },
            close() {
                return writer.close();
            },
        });
    }
}

class ConsumableWritableStream extends WritableStream$1 {
    static async write(writer, value) {
        const consumable = new Consumable(value);
        await writer.write(consumable);
        await consumable.consumed;
    }
    constructor(sink, strategy) {
        let wrappedStrategy;
        if (strategy) {
            wrappedStrategy = {};
            if ("highWaterMark" in strategy) {
                wrappedStrategy.highWaterMark = strategy.highWaterMark;
            }
            if ("size" in strategy) {
                wrappedStrategy.size = (chunk) => {
                    return strategy.size(chunk instanceof Consumable ? chunk.value : chunk);
                };
            }
        }
        super({
            start(controller) {
                return sink.start?.(controller);
            },
            write(chunk, controller) {
                return chunk.tryConsume((chunk) => sink.write?.(chunk, controller));
            },
            abort(reason) {
                return sink.abort?.(reason);
            },
            close() {
                return sink.close?.();
            },
        }, wrappedStrategy);
    }
}

// `createTask` allows browser DevTools to track the call stack across async boundaries.
const { console: console$1 } = globalThis;
const createTask = /* #__PURE__ */ (() => console$1?.createTask?.bind(console$1) ??
    (() => ({
        run(callback) {
            return callback();
        },
    })))();

class Consumable {
    static WritableStream = ConsumableWritableStream;
    static WrapWritableStream = ConsumableWrapWritableStream;
    static ReadableStream = ConsumableReadableStream;
    static WrapByteReadableStream = ConsumableWrapByteReadableStream;
    #task;
    #resolver;
    value;
    consumed;
    constructor(value) {
        this.#task = createTask("Consumable");
        this.value = value;
        this.#resolver = new PromiseResolver();
        this.consumed = this.#resolver.promise;
    }
    consume() {
        this.#resolver.resolve();
    }
    error(error) {
        this.#resolver.reject(error);
    }
    tryConsume(callback) {
        try {
            let result = this.#task.run(() => callback(this.value));
            if (isPromiseLike(result)) {
                result = result.then((value) => {
                    this.#resolver.resolve();
                    return value;
                }, (e) => {
                    this.#resolver.reject(e);
                    throw e;
                });
            }
            else {
                this.#resolver.resolve();
            }
            return result;
        }
        catch (e) {
            this.#resolver.reject(e);
            throw e;
        }
    }
}

function tryConsume(value, callback) {
    if (value instanceof Consumable) {
        return value.tryConsume(callback);
    }
    else {
        return callback(value);
    }
}

class MaybeConsumableWritableStream extends WritableStream$1 {
    constructor(sink, strategy) {
        let wrappedStrategy;
        if (strategy) {
            wrappedStrategy = {};
            if ("highWaterMark" in strategy) {
                wrappedStrategy.highWaterMark = strategy.highWaterMark;
            }
            if ("size" in strategy) {
                wrappedStrategy.size = (chunk) => {
                    return strategy.size(chunk instanceof Consumable ? chunk.value : chunk);
                };
            }
        }
        super({
            start(controller) {
                return sink.start?.(controller);
            },
            write(chunk, controller) {
                return tryConsume(chunk, (chunk) => sink.write?.(chunk, controller));
            },
            abort(reason) {
                return sink.abort?.(reason);
            },
            close() {
                return sink.close?.();
            },
        }, wrappedStrategy);
    }
}

/**
 * Splits or combines buffers to specified size.
 */
class BufferCombiner {
    #capacity;
    #buffer;
    #offset;
    #available;
    constructor(size) {
        this.#capacity = size;
        this.#buffer = new Uint8Array(size);
        this.#offset = 0;
        this.#available = size;
    }
    /**
     * Pushes data to the combiner.
     * @param data The input data to be split or combined.
     * @returns
     * A generator that yields buffers of specified size.
     * It may yield the same buffer multiple times, consume the data before calling `next`.
     */
    *push(data) {
        let offset = 0;
        let available = data.length;
        if (this.#offset !== 0) {
            if (available >= this.#available) {
                this.#buffer.set(data.subarray(0, this.#available), this.#offset);
                offset += this.#available;
                available -= this.#available;
                yield this.#buffer;
                this.#offset = 0;
                this.#available = this.#capacity;
                if (available === 0) {
                    return;
                }
            }
            else {
                this.#buffer.set(data, this.#offset);
                this.#offset += available;
                this.#available -= available;
                return;
            }
        }
        while (available >= this.#capacity) {
            const end = offset + this.#capacity;
            yield data.subarray(offset, end);
            offset = end;
            available -= this.#capacity;
        }
        if (available > 0) {
            this.#buffer.set(data.subarray(offset), this.#offset);
            this.#offset += available;
            this.#available -= available;
        }
    }
    flush() {
        if (this.#offset === 0) {
            return undefined;
        }
        const output = this.#buffer.subarray(0, this.#offset);
        this.#offset = 0;
        this.#available = this.#capacity;
        return output;
    }
}
class DistributionStream extends TransformStream$1 {
    constructor(size, combine = false) {
        const combiner = combine ? new BufferCombiner(size) : undefined;
        super({
            async transform(chunk, controller) {
                await tryConsume(chunk, async (chunk) => {
                    if (combiner) {
                        for (const buffer of combiner.push(chunk)) {
                            await Consumable.ReadableStream.enqueue(controller, buffer);
                        }
                    }
                    else {
                        let offset = 0;
                        let available = chunk.length;
                        while (available > 0) {
                            const end = offset + size;
                            await Consumable.ReadableStream.enqueue(controller, chunk.subarray(offset, end));
                            offset = end;
                            available -= size;
                        }
                    }
                });
            },
            flush(controller) {
                if (combiner) {
                    const data = combiner.flush();
                    if (data) {
                        controller.enqueue(data);
                    }
                }
            },
        });
    }
}

function getWrappedReadableStream(wrapper, controller) {
    if ("start" in wrapper) {
        return wrapper.start(controller);
    }
    else if (typeof wrapper === "function") {
        return wrapper(controller);
    }
    else {
        // Can't use `wrapper instanceof ReadableStream`
        // Because we want to be compatible with any ReadableStream-like objects
        return wrapper;
    }
}
/**
 * This class has multiple usages:
 *
 * 1. Get notified when the stream is cancelled or closed.
 * 2. Synchronously create a `ReadableStream` by asynchronously return another `ReadableStream`.
 * 3. Convert native `ReadableStream`s to polyfilled ones so they can `pipe` between.
 */
class WrapReadableStream extends ReadableStream$1 {
    readable;
    #reader;
    constructor(wrapper, strategy) {
        super({
            start: async (controller) => {
                const readable = await getWrappedReadableStream(wrapper, controller);
                // `start` is called in `super()`, so can't use `this` synchronously.
                // but it's fine after the first `await`
                this.readable = readable;
                this.#reader = this.readable.getReader();
            },
            pull: async (controller) => {
                const { done, value } = await this.#reader
                    .read()
                    .catch((e) => {
                    if ("error" in wrapper) {
                        wrapper.error(e);
                    }
                    throw e;
                });
                if (done) {
                    controller.close();
                    if ("close" in wrapper) {
                        await wrapper.close?.();
                    }
                }
                else {
                    controller.enqueue(value);
                }
            },
            cancel: async (reason) => {
                await this.#reader.cancel(reason);
                if ("cancel" in wrapper) {
                    await wrapper.cancel?.(reason);
                }
            },
        }, strategy);
    }
}

const NOOP$1 = () => {
    // no-op
};
/**
 * A factory for creating a duplex stream.
 *
 * It can create multiple `ReadableStream`s and `WritableStream`s,
 * when any of them is closed, all other streams will be closed as well.
 */
class DuplexStreamFactory {
    #readableControllers = [];
    #writers = [];
    #writableClosed = false;
    get writableClosed() {
        return this.#writableClosed;
    }
    #closed = new PromiseResolver();
    get closed() {
        return this.#closed.promise;
    }
    #options;
    constructor(options) {
        this.#options = options ?? {};
    }
    wrapReadable(readable, strategy) {
        return new WrapReadableStream({
            start: (controller) => {
                this.#readableControllers.push(controller);
                return readable;
            },
            cancel: async () => {
                // cancel means the local peer wants to close the connection.
                await this.close();
            },
            close: async () => {
                // stream end means the remote peer closed the connection first.
                await this.dispose();
            },
        }, strategy);
    }
    createWritable(stream) {
        const writer = stream.getWriter();
        this.#writers.push(writer);
        // `WritableStream` has no way to tell if the remote peer has closed the connection.
        // So it only triggers `close`.
        return new WritableStream$1({
            write: async (chunk) => {
                await writer.write(chunk);
            },
            abort: async (reason) => {
                await writer.abort(reason);
                await this.close();
            },
            close: async () => {
                // NOOP: the writer is already closed
                await writer.close().catch(NOOP$1);
                await this.close();
            },
        });
    }
    async close() {
        if (this.#writableClosed) {
            return;
        }
        this.#writableClosed = true;
        // Call `close` first, so it can still write data to `WritableStream`s.
        if ((await this.#options.close?.()) !== false) {
            // `close` can return `false` to disable automatic `dispose`.
            await this.dispose();
        }
        for (const writer of this.#writers) {
            // NOOP: the writer is already closed
            writer.close().catch(NOOP$1);
        }
    }
    async dispose() {
        this.#writableClosed = true;
        this.#closed.resolve();
        for (const controller of this.#readableControllers) {
            tryClose(controller);
        }
        await this.#options.dispose?.();
    }
}

const Global = globalThis;
const TextDecoderStream = Global.TextDecoderStream;

/**
 * Pipe `pair.readable` to `writable`, then returns `pair.writable`.
 *
 * This is the opposite of `ReadableStream#pipeThrough()`.
 *
 * @param writable The `WritableStream` to write to.
 * @param pair A `TransformStream` that converts chunks.
 * @returns `pair`'s `writable` stream.
 */
function pipeFrom(writable, pair) {
    const writer = pair.writable.getWriter();
    const pipe = pair.readable.pipeTo(writable);
    return new WritableStream$1({
        async write(chunk) {
            await writer.write(chunk);
        },
        async close() {
            await writer.close();
            await pipe;
        },
    });
}

class StructDeserializeStream extends BufferedTransformStream {
    constructor(struct) {
        super((stream) => {
            return struct.deserialize(stream);
        });
    }
}

class AutoDisposable {
    #disposables = [];
    constructor() {
        this.dispose = this.dispose.bind(this);
    }
    addDisposable(disposable) {
        this.#disposables.push(disposable);
        return disposable;
    }
    dispose() {
        for (const disposable of this.#disposables) {
            disposable.dispose();
        }
        this.#disposables = [];
    }
}

class EventEmitter {
    listeners = [];
    constructor() {
        this.event = this.event.bind(this);
    }
    addEventListener(info) {
        this.listeners.push(info);
        const remove = () => {
            const index = this.listeners.indexOf(info);
            if (index !== -1) {
                this.listeners.splice(index, 1);
            }
        };
        remove.dispose = remove;
        return remove;
    }
    event = (listener, thisArg, ...args) => {
        const info = {
            listener: listener,
            thisArg,
            args,
        };
        return this.addEventListener(info);
    };
    fire(e) {
        for (const info of this.listeners.slice()) {
            info.listener.call(info.thisArg, e, ...info.args);
        }
    }
    dispose() {
        this.listeners.length = 0;
    }
}

const Undefined = Symbol("undefined");
class StickyEventEmitter extends EventEmitter {
    #value = Undefined;
    addEventListener(info) {
        if (this.#value !== Undefined) {
            info.listener.call(info.thisArg, this.#value, ...info.args);
        }
        return super.addEventListener(info);
    }
    fire(e) {
        this.#value = e;
        super.fire(e);
    }
}

class AdbServiceBase extends AutoDisposable {
    #adb;
    get adb() {
        return this.#adb;
    }
    constructor(adb) {
        super();
        this.#adb = adb;
    }
}

const Version = struct({ version: u32 }, { littleEndian: true });
const AdbFrameBufferV1 = struct({
    bpp: u32,
    size: u32,
    width: u32,
    height: u32,
    red_offset: u32,
    red_length: u32,
    blue_offset: u32,
    blue_length: u32,
    green_offset: u32,
    green_length: u32,
    alpha_offset: u32,
    alpha_length: u32,
    data: buffer("size"),
}, { littleEndian: true });
const AdbFrameBufferV2 = struct({
    bpp: u32,
    colorSpace: u32,
    size: u32,
    width: u32,
    height: u32,
    red_offset: u32,
    red_length: u32,
    blue_offset: u32,
    blue_length: u32,
    green_offset: u32,
    green_length: u32,
    alpha_offset: u32,
    alpha_length: u32,
    data: buffer("size"),
}, { littleEndian: true });
class AdbFrameBufferError extends Error {
    constructor(message, options) {
        super(message, options);
    }
}
class AdbFrameBufferUnsupportedVersionError extends AdbFrameBufferError {
    constructor(version) {
        super(`Unsupported FrameBuffer version ${version}`);
    }
}
class AdbFrameBufferForbiddenError extends AdbFrameBufferError {
    constructor() {
        super("FrameBuffer is disabled by current app");
    }
}
async function framebuffer(adb) {
    const socket = await adb.createSocket("framebuffer:");
    const stream = new BufferedReadableStream(socket.readable);
    let version;
    try {
        ({ version } = await Version.deserialize(stream));
    }
    catch (e) {
        if (e instanceof StructEmptyError) {
            throw new AdbFrameBufferForbiddenError();
        }
        throw e;
    }
    switch (version) {
        case 1:
            // TODO: AdbFrameBuffer: does all v1 responses uses the same color space? Add it so the command returns same format for all versions.
            return await AdbFrameBufferV1.deserialize(stream);
        case 2:
            return await AdbFrameBufferV2.deserialize(stream);
        default:
            throw new AdbFrameBufferUnsupportedVersionError(version);
    }
}

// cspell: ignore bootloader
// cspell: ignore fastboot
// cspell: ignore keyevent
// cspell: ignore longpress
class AdbPower extends AdbServiceBase {
    reboot(mode = "") {
        return this.adb.createSocketAndWait(`reboot:${mode}`);
    }
    bootloader() {
        return this.reboot("bootloader");
    }
    fastboot() {
        return this.reboot("fastboot");
    }
    recovery() {
        return this.reboot("recovery");
    }
    sideload() {
        return this.reboot("sideload");
    }
    /**
     * Reboot to Qualcomm Emergency Download (EDL) Mode.
     *
     * Only works on some Qualcomm devices.
     */
    qualcommEdlMode() {
        return this.reboot("edl");
    }
    powerOff() {
        return this.adb.subprocess.noneProtocol.spawnWaitText(["reboot", "-p"]);
    }
    powerButton(longPress = false) {
        const args = ["input", "keyevent"];
        if (longPress) {
            args.push("--longpress");
        }
        args.push("POWER");
        return this.adb.subprocess.noneProtocol.spawnWaitText(args);
    }
    /**
     * Reboot to Samsung Odin download mode.
     *
     * Only works on Samsung devices.
     */
    samsungOdin() {
        return this.reboot("download");
    }
}

function toLocalUint8Array(value) {
    if (value.buffer instanceof ArrayBuffer) {
        return value;
    }
    const copy = new Uint8Array(value.length);
    copy.set(value);
    return copy;
}

class AutoResetEvent {
    #set;
    #queue = [];
    constructor(initialSet = false) {
        this.#set = initialSet;
    }
    wait() {
        if (!this.#set) {
            this.#set = true;
            if (this.#queue.length === 0) {
                return Promise.resolve();
            }
        }
        const resolver = new PromiseResolver();
        this.#queue.push(resolver);
        return resolver.promise;
    }
    notifyOne() {
        if (this.#queue.length !== 0) {
            this.#queue.pop().resolve();
        }
        else {
            this.#set = false;
        }
    }
    dispose() {
        for (const item of this.#queue) {
            item.reject(new Error("The AutoResetEvent has been disposed"));
        }
        this.#queue.length = 0;
    }
}

const [charToIndex, indexToChar, paddingChar] = /* #__PURE__ */ (() => {
    // Array is faster than object literal or `Map`
    const charToIndex = [];
    const indexToChar = [];
    const paddingChar = "=".charCodeAt(0);
    function addRange(start, end) {
        const charCodeStart = start.charCodeAt(0);
        const charCodeEnd = end.charCodeAt(0);
        for (let charCode = charCodeStart; charCode <= charCodeEnd; charCode += 1) {
            charToIndex[charCode] = indexToChar.length;
            indexToChar.push(charCode);
        }
    }
    addRange("A", "Z");
    addRange("a", "z");
    addRange("0", "9");
    addRange("+", "+");
    addRange("/", "/");
    return [charToIndex, indexToChar, paddingChar];
})();
/**
 * Calculate the required length of the output buffer for the given input length.
 *
 * @param inputLength Length of the input in bytes
 * @returns Length of the output in bytes
 */
function calculateBase64EncodedLength(inputLength) {
    const remainder = inputLength % 3;
    const paddingLength = remainder !== 0 ? 3 - remainder : 0;
    return [((inputLength + paddingLength) / 3) * 4, paddingLength];
}
function encodeBase64(input, output) {
    const [outputLength, paddingLength] = calculateBase64EncodedLength(input.length);
    if (!output) {
        output = new Uint8Array(outputLength);
        encodeForward(input, output, paddingLength);
        return output;
    }
    else {
        if (output.length < outputLength) {
            throw new TypeError("output buffer is too small");
        }
        output = output.subarray(0, outputLength);
        // When input and output are on same ArrayBuffer,
        // we check if it's possible to encode in-place.
        if (input.buffer !== output.buffer) {
            encodeForward(input, output, paddingLength);
        }
        else if (output.byteOffset + output.length - (paddingLength + 1) <=
            input.byteOffset + input.length) {
            // Output ends before input ends.
            // Can encode forwards, because writing output won't catch up with reading input.
            // The output end is subtracted by `(paddingLength + 1)` because
            // depending on padding length, it's possible to write 1-3 extra bytes after input ends.
            //
            // The following diagrams show how the last read from input and the last write to output
            // are not conflicting.
            //
            // spell: disable
            //
            // `paddingLength === 2` can write 3 extra bytes:
            //
            //   input:  | aaaaaabb |          |          |          |
            //   output: |  aaaaaa  |  bb0000  |    =     |    =     |
            //
            // `paddingLength === 1` can write 2 extra bytes:
            //
            //   input:  | aaaaaabb | bbbbcccc |          |          |
            //   output: |  aaaaaa  |  bbbbbb  |  cccc00  |    =     |
            //
            // `paddingLength === 0` can write 1 extra byte:
            //
            //   input:  | aaaaaabb | bbbbcccc | ccdddddd |          |
            //   output: |  aaaaaa  |  bbbbbb  |  cccccc  |  dddddd  |
            //
            // spell: enable
            encodeForward(input, output, paddingLength);
        }
        else if (output.byteOffset >= input.byteOffset - 1) {
            // Output starts after input starts
            // So in backwards, writing output won't catch up with reading input.
            // The input start is subtracted by `1`, Because as the first 3 bytes becomes 4 bytes,
            // it's possible to write 1 extra byte before input starts.
            // spell: disable-next-line
            //   input:  |          | aaaaaabb | bbbbcccc | ccdddddd |
            //   output: |  aaaaaa  |  bbbbbb  |  cccccc  |  dddddd  |
            // Must encode backwards.
            encodeBackward(input, output, paddingLength);
        }
        else {
            // Input is in the middle of output,
            // It's not possible to read either the first or the last three bytes
            // before they are overwritten by the output.
            throw new TypeError("input and output cannot overlap");
        }
        return outputLength;
    }
}
function encodeForward(input, output, paddingLength) {
    let inputIndex = 0;
    let outputIndex = 0;
    while (inputIndex < input.length - 2) {
        /* cspell: disable-next-line */
        // aaaaaabb
        const x = input[inputIndex];
        inputIndex += 1;
        /* cspell: disable-next-line */
        // bbbbcccc
        const y = input[inputIndex];
        inputIndex += 1;
        /* cspell: disable-next-line */
        // ccdddddd
        const z = input[inputIndex];
        inputIndex += 1;
        output[outputIndex] = indexToChar[x >> 2];
        outputIndex += 1;
        output[outputIndex] = indexToChar[((x & 0b11) << 4) | (y >> 4)];
        outputIndex += 1;
        output[outputIndex] = indexToChar[((y & 0b1111) << 2) | (z >> 6)];
        outputIndex += 1;
        output[outputIndex] = indexToChar[z & 0b111111];
        outputIndex += 1;
    }
    if (paddingLength === 2) {
        /* cspell: disable-next-line */
        // aaaaaabb
        const x = input[inputIndex];
        output[outputIndex] = indexToChar[x >> 2];
        outputIndex += 1;
        output[outputIndex] = indexToChar[(x & 0b11) << 4];
        outputIndex += 1;
        output[outputIndex] = paddingChar;
        outputIndex += 1;
        output[outputIndex] = paddingChar;
    }
    else if (paddingLength === 1) {
        /* cspell: disable-next-line */
        // aaaaaabb
        const x = input[inputIndex];
        inputIndex += 1;
        /* cspell: disable-next-line */
        // bbbbcccc
        const y = input[inputIndex];
        output[outputIndex] = indexToChar[x >> 2];
        outputIndex += 1;
        output[outputIndex] = indexToChar[((x & 0b11) << 4) | (y >> 4)];
        outputIndex += 1;
        output[outputIndex] = indexToChar[(y & 0b1111) << 2];
        outputIndex += 1;
        output[outputIndex] = paddingChar;
    }
}
function encodeBackward(input, output, paddingLength) {
    let inputIndex = input.length - 1;
    let outputIndex = output.length - 1;
    if (paddingLength === 2) {
        /* cspell: disable-next-line */
        // aaaaaabb
        const x = input[inputIndex];
        inputIndex -= 1;
        output[outputIndex] = paddingChar;
        outputIndex -= 1;
        output[outputIndex] = paddingChar;
        outputIndex -= 1;
        output[outputIndex] = indexToChar[(x & 0b11) << 4];
        outputIndex -= 1;
        output[outputIndex] = indexToChar[x >> 2];
        outputIndex -= 1;
    }
    else if (paddingLength === 1) {
        /* cspell: disable-next-line */
        // bbbbcccc
        const y = input[inputIndex];
        inputIndex -= 1;
        /* cspell: disable-next-line */
        // aaaaaabb
        const x = input[inputIndex];
        inputIndex -= 1;
        output[outputIndex] = paddingChar;
        outputIndex -= 1;
        output[outputIndex] = indexToChar[(y & 0b1111) << 2];
        outputIndex -= 1;
        output[outputIndex] = indexToChar[((x & 0b11) << 4) | (y >> 4)];
        outputIndex -= 1;
        output[outputIndex] = indexToChar[x >> 2];
        outputIndex -= 1;
    }
    while (inputIndex >= 0) {
        /* cspell: disable-next-line */
        // ccdddddd
        const z = input[inputIndex];
        inputIndex -= 1;
        /* cspell: disable-next-line */
        // bbbbcccc
        const y = input[inputIndex];
        inputIndex -= 1;
        /* cspell: disable-next-line */
        // aaaaaabb
        const x = input[inputIndex];
        inputIndex -= 1;
        output[outputIndex] = indexToChar[z & 0b111111];
        outputIndex -= 1;
        output[outputIndex] = indexToChar[((y & 0b1111) << 2) | (z >> 6)];
        outputIndex -= 1;
        output[outputIndex] = indexToChar[((x & 0b11) << 4) | (y >> 4)];
        outputIndex -= 1;
        output[outputIndex] = indexToChar[x >> 2];
        outputIndex -= 1;
    }
}

function hexCharToNumber(char) {
    if (char < 48) {
        throw new TypeError(`Invalid hex char ${char}`);
    }
    if (char < 58) {
        // 0-9
        return char - 48;
    }
    if (char < 65) {
        throw new TypeError(`Invalid hex char ${char}`);
    }
    if (char < 71) {
        // A-F
        return char - 55;
    }
    if (char < 97) {
        throw new TypeError(`Invalid hex char ${char}`);
    }
    if (char < 103) {
        // a-f
        return char - 87;
    }
    throw new TypeError(`Invalid hex char ${char}`);
}
// It's 22x faster than converting `data` to string then `Number.parseInt`
// https://jsbench.me/dglha94ozl/1
function hexToNumber(data) {
    let result = 0;
    for (let i = 0; i < data.length; i += 1) {
        result = (result << 4) | hexCharToNumber(data[i]);
    }
    return result;
}

/* #__NO_SIDE_EFFECTS__ */
const NOOP = () => {
    // no-op
};
/**
 * When used in `Promise#catch`, means the promise should never throw errors.
 * An explicit way to suppress ESLint floating promise warnings.
 */
function unreachable(...args) {
    // Trigger runtime's unhandled rejection event.
    throw new Error("Unreachable. Arguments:\n" + args.join("\n"));
}

function sequenceEqual(a, b) {
    if (a.length !== b.length) {
        return false;
    }
    for (let i = 0; i < a.length; i += 1) {
        if (a[i] !== b[i]) {
            return false;
        }
    }
    return true;
}

// cspell: ignore killforward
const AdbReverseStringResponse = struct({
    length: string(4),
    content: string({
        field: "length",
        convert(value) {
            return Number.parseInt(value, 16);
        },
        back(value) {
            return value.toString(16).padStart(4, "0");
        },
    }),
}, { littleEndian: true });
class AdbReverseError extends Error {
    constructor(message) {
        super(message);
    }
}
class AdbReverseNotSupportedError extends AdbReverseError {
    constructor() {
        super("ADB reverse tunnel is not supported on this device when connected wirelessly.");
    }
}
const AdbReverseErrorResponse = extend(AdbReverseStringResponse, {}, {
    postDeserialize(value) {
        // https://issuetracker.google.com/issues/37066218
        // ADB on Android <9 can't create reverse tunnels when connected wirelessly (ADB over Wi-Fi),
        // and returns this confusing "more than one device/emulator" error.
        if (value.content === "more than one device/emulator") {
            throw new AdbReverseNotSupportedError();
        }
        else {
            throw new AdbReverseError(value.content);
        }
    },
});
// Like `hexToNumber`, it's much faster than first converting `buffer` to a string
function decimalToNumber(buffer) {
    let value = 0;
    for (const byte of buffer) {
        // Like `parseInt`, return when it encounters a non-digit character
        if (byte < 48 || byte > 57) {
            return value;
        }
        value = value * 10 + byte - 48;
    }
    return value;
}
const OKAY = encodeUtf8("OKAY");
class AdbReverseService extends AdbServiceBase {
    #deviceAddressToLocalAddress = new Map();
    async createBufferedStream(service) {
        const socket = await this.adb.createSocket(service);
        return new BufferedReadableStream(socket.readable);
    }
    async sendRequest(service) {
        const stream = await this.createBufferedStream(service);
        const response = await stream.readExactly(4);
        if (!sequenceEqual(response, OKAY)) {
            await AdbReverseErrorResponse.deserialize(stream);
        }
        return stream;
    }
    /**
     * Get a list of all reverse port forwarding on the device.
     */
    async list() {
        const stream = await this.createBufferedStream("reverse:list-forward");
        const response = await AdbReverseStringResponse.deserialize(stream);
        return response.content
            .split("\n")
            .filter((line) => !!line)
            .map((line) => {
            const [deviceSerial, localName, remoteName] = line.split(" ");
            return { deviceSerial, localName, remoteName };
        });
        // No need to close the stream, device will close it
    }
    /**
     * Add a reverse port forwarding for a program that already listens on a port.
     */
    async addExternal(deviceAddress, localAddress) {
        const stream = await this.sendRequest(`reverse:forward:${deviceAddress};${localAddress}`);
        // `tcp:0` tells the device to pick an available port.
        // On Android >=8, device will respond with the selected port for all `tcp:` requests.
        if (deviceAddress.startsWith("tcp:")) {
            const position = stream.position;
            try {
                const length = hexToNumber(await stream.readExactly(4));
                const port = decimalToNumber(await stream.readExactly(length));
                deviceAddress = `tcp:${port}`;
            }
            catch (e) {
                if (e instanceof ExactReadableEndedError &&
                    stream.position === position) ;
                else {
                    throw e;
                }
            }
        }
        return deviceAddress;
    }
    /**
     * Add a reverse port forwarding.
     */
    async add(deviceAddress, handler, localAddress) {
        localAddress = await this.adb.transport.addReverseTunnel(handler, localAddress);
        try {
            deviceAddress = await this.addExternal(deviceAddress, localAddress);
            this.#deviceAddressToLocalAddress.set(deviceAddress, localAddress);
            return deviceAddress;
        }
        catch (e) {
            await this.adb.transport.removeReverseTunnel(localAddress);
            throw e;
        }
    }
    /**
     * Remove a reverse port forwarding.
     */
    async remove(deviceAddress) {
        const localAddress = this.#deviceAddressToLocalAddress.get(deviceAddress);
        if (localAddress) {
            await this.adb.transport.removeReverseTunnel(localAddress);
        }
        await this.sendRequest(`reverse:killforward:${deviceAddress}`);
        // No need to close the stream, device will close it
    }
    /**
     * Remove all reverse port forwarding, including the ones added by other programs.
     */
    async removeAll() {
        await this.adb.transport.clearReverseTunnels();
        this.#deviceAddressToLocalAddress.clear();
        await this.sendRequest(`reverse:killforward-all`);
        // No need to close the stream, device will close it
    }
}

class AdbNoneProtocolProcessImpl {
    #socket;
    get stdin() {
        return this.#socket.writable;
    }
    get output() {
        return this.#socket.readable;
    }
    #exited;
    get exited() {
        return this.#exited;
    }
    constructor(socket, signal) {
        this.#socket = socket;
        if (signal) {
            // `signal` won't affect `this.output`
            // So remaining data can still be read
            // (call `controller.error` will discard all pending data)
            const exited = new PromiseResolver();
            this.#socket.closed.then(() => exited.resolve(undefined), (e) => exited.reject(e));
            signal.addEventListener("abort", () => {
                exited.reject(signal.reason);
                this.#socket.close();
            });
            this.#exited = exited.promise;
        }
        else {
            this.#exited = this.#socket.closed;
        }
    }
    kill() {
        return this.#socket.close();
    }
}

class AdbNoneProtocolPtyProcess {
    #socket;
    #writer;
    #input;
    get input() {
        return this.#input;
    }
    get output() {
        return this.#socket.readable;
    }
    get exited() {
        return this.#socket.closed;
    }
    constructor(socket) {
        this.#socket = socket;
        this.#writer = this.#socket.writable.getWriter();
        this.#input = new MaybeConsumableWritableStream({
            write: (chunk) => this.#writer.write(chunk),
        });
    }
    sigint() {
        return this.#writer.write(new Uint8Array([0x03]));
    }
    kill() {
        return this.#socket.close();
    }
}

function escapeArg(s) {
    let result = "";
    result += `'`;
    let base = 0;
    while (true) {
        const found = s.indexOf(`'`, base);
        if (found === -1) {
            result += s.substring(base);
            break;
        }
        result += s.substring(base, found);
        // a'b becomes a'\'b (the backslash is not a escape character)
        result += String.raw `'\''`;
        base = found + 1;
    }
    result += `'`;
    return result;
}
function splitCommand(command) {
    const result = [];
    let quote;
    let isEscaped = false;
    let start = 0;
    for (let i = 0, len = command.length; i < len; i += 1) {
        if (isEscaped) {
            isEscaped = false;
            continue;
        }
        const char = command.charAt(i);
        switch (char) {
            case " ":
                if (!quote && i !== start) {
                    result.push(command.substring(start, i));
                    start = i + 1;
                }
                break;
            case "'":
            case '"':
                if (!quote) {
                    quote = char;
                }
                else if (char === quote) {
                    quote = undefined;
                }
                break;
            case "\\":
                isEscaped = true;
                break;
        }
    }
    if (start < command.length) {
        result.push(command.substring(start));
    }
    return result;
}

class AdbNoneProtocolSpawner {
    #spawn;
    constructor(spawn) {
        this.#spawn = spawn;
    }
    spawn(command, signal) {
        signal?.throwIfAborted();
        if (typeof command === "string") {
            command = splitCommand(command);
        }
        return this.#spawn(command, signal);
    }
    async spawnWait(command) {
        const process = await this.spawn(command);
        return await process.output.pipeThrough(new ConcatBufferStream());
    }
    async spawnWaitText(command) {
        const process = await this.spawn(command);
        return await process.output
            .pipeThrough(new TextDecoderStream())
            .pipeThrough(new ConcatStringStream());
    }
}

class AdbNoneProtocolSubprocessService extends AdbNoneProtocolSpawner {
    #adb;
    get adb() {
        return this.#adb;
    }
    constructor(adb) {
        super(async (command, signal) => {
            // `shell,raw:${command}` also triggers raw mode,
            // But is not supported on Android version <7.
            const socket = await this.#adb.createSocket(`exec:${command.join(" ")}`);
            if (signal?.aborted) {
                await socket.close();
                throw signal.reason;
            }
            return new AdbNoneProtocolProcessImpl(socket, signal);
        });
        this.#adb = adb;
    }
    async pty(command) {
        if (command === undefined) {
            command = "";
        }
        else if (Array.isArray(command)) {
            command = command.join(" ");
        }
        return new AdbNoneProtocolPtyProcess(
        // https://github.com/microsoft/typescript/issues/17002
        await this.#adb.createSocket(`shell:${command}`));
    }
}

// The order follows
// https://cs.android.com/android/platform/superproject/+/master:packages/modules/adb/transport.cpp;l=77;drc=6d14d35d0241f6fee145f8e54ffd77252e8d29fd
const AdbFeature = {
    ShellV2: "shell_v2",
    Cmd: "cmd",
    StatV2: "stat_v2",
    ListV2: "ls_v2",
    FixedPushMkdir: "fixed_push_mkdir",
    Abb: "abb",
    AbbExec: "abb_exec",
    SendReceiveV2: "sendrecv_v2",
    DelayedAck: "delayed_ack",
};

const AdbShellProtocolId = {
    Stdin: 0,
    Stdout: 1,
    Stderr: 2,
    Exit: 3,
    CloseStdin: 4,
    WindowSizeChange: 5,
};
// This packet format is used in both directions.
const AdbShellProtocolPacket = struct({
    id: u8(),
    data: buffer(u32),
}, { littleEndian: true });

class AdbShellProtocolProcessImpl {
    #socket;
    #writer;
    #stdin;
    get stdin() {
        return this.#stdin;
    }
    #stdout;
    get stdout() {
        return this.#stdout;
    }
    #stderr;
    get stderr() {
        return this.#stderr;
    }
    #exited;
    get exited() {
        return this.#exited;
    }
    constructor(socket, signal) {
        this.#socket = socket;
        let stdoutController;
        let stderrController;
        this.#stdout = new PushReadableStream((controller) => {
            stdoutController = controller;
        });
        this.#stderr = new PushReadableStream((controller) => {
            stderrController = controller;
        });
        const exited = new PromiseResolver();
        this.#exited = exited.promise;
        socket.readable
            .pipeThrough(new StructDeserializeStream(AdbShellProtocolPacket))
            .pipeTo(new WritableStream$1({
            write: async (chunk) => {
                switch (chunk.id) {
                    case AdbShellProtocolId.Exit:
                        exited.resolve(chunk.data[0]);
                        break;
                    case AdbShellProtocolId.Stdout:
                        await stdoutController.enqueue(chunk.data);
                        break;
                    case AdbShellProtocolId.Stderr:
                        await stderrController.enqueue(chunk.data);
                        break;
                }
            },
        }))
            .then(() => {
            stdoutController.close();
            stderrController.close();
            // If `exited` has already settled, this will be a no-op
            exited.reject(new Error("Socket ended without exit message"));
        }, (e) => {
            stdoutController.error(e);
            stderrController.error(e);
            // If `exited` has already settled, this will be a no-op
            exited.reject(e);
        });
        if (signal) {
            // `signal` won't affect `this.stdout` and `this.stderr`
            // So remaining data can still be read
            // (call `controller.error` will discard all pending data)
            signal.addEventListener("abort", () => {
                exited.reject(signal.reason);
                this.#socket.close();
            });
        }
        this.#writer = this.#socket.writable.getWriter();
        this.#stdin = new MaybeConsumableWritableStream({
            write: async (chunk) => {
                await this.#writer.write(AdbShellProtocolPacket.serialize({
                    id: AdbShellProtocolId.Stdin,
                    data: chunk,
                }));
            },
            close: () => 
            // Only shell protocol + raw mode supports closing stdin
            this.#writer.write(AdbShellProtocolPacket.serialize({
                id: AdbShellProtocolId.CloseStdin,
                data: EmptyUint8Array,
            })),
        });
    }
    kill() {
        return this.#socket.close();
    }
}

class AdbShellProtocolPtyProcess {
    #socket;
    #writer;
    #input;
    get input() {
        return this.#input;
    }
    #stdout;
    get output() {
        return this.#stdout;
    }
    #exited = new PromiseResolver();
    get exited() {
        return this.#exited.promise;
    }
    constructor(socket) {
        this.#socket = socket;
        let stdoutController;
        this.#stdout = new PushReadableStream((controller) => {
            stdoutController = controller;
        });
        socket.readable
            .pipeThrough(new StructDeserializeStream(AdbShellProtocolPacket))
            .pipeTo(new WritableStream$1({
            write: async (chunk) => {
                switch (chunk.id) {
                    case AdbShellProtocolId.Exit:
                        this.#exited.resolve(chunk.data[0]);
                        break;
                    case AdbShellProtocolId.Stdout:
                        await stdoutController.enqueue(chunk.data);
                        break;
                }
            },
        }))
            .then(() => {
            stdoutController.close();
            // If `#exit` has already resolved, this will be a no-op
            this.#exited.reject(new Error("Socket ended without exit message"));
        }, (e) => {
            stdoutController.error(e);
            // If `#exit` has already resolved, this will be a no-op
            this.#exited.reject(e);
        });
        this.#writer = this.#socket.writable.getWriter();
        this.#input = new MaybeConsumableWritableStream({
            write: (chunk) => this.#writeStdin(chunk),
        });
    }
    #writeStdin(chunk) {
        return this.#writer.write(AdbShellProtocolPacket.serialize({
            id: AdbShellProtocolId.Stdin,
            data: chunk,
        }));
    }
    async resize(rows, cols) {
        await this.#writer.write(AdbShellProtocolPacket.serialize({
            id: AdbShellProtocolId.WindowSizeChange,
            // The "correct" format is `${rows}x${cols},${x_pixels}x${y_pixels}`
            // However, according to https://linux.die.net/man/4/tty_ioctl
            // `x_pixels` and `y_pixels` are unused, so always sending `0` should be fine.
            data: encodeUtf8(`${rows}x${cols},0x0\0`),
        }));
    }
    sigint() {
        return this.#writeStdin(new Uint8Array([0x03]));
    }
    kill() {
        return this.#socket.close();
    }
}

class AdbShellProtocolSpawner {
    #spawn;
    constructor(spawn) {
        this.#spawn = spawn;
    }
    spawn(command, signal) {
        signal?.throwIfAborted();
        if (typeof command === "string") {
            command = splitCommand(command);
        }
        return this.#spawn(command, signal);
    }
    async spawnWait(command) {
        const process = await this.spawn(command);
        const [stdout, stderr, exitCode] = await Promise.all([
            process.stdout.pipeThrough(new ConcatBufferStream()),
            process.stderr.pipeThrough(new ConcatBufferStream()),
            process.exited,
        ]);
        return { stdout, stderr, exitCode };
    }
    async spawnWaitText(command) {
        const process = await this.spawn(command);
        const [stdout, stderr, exitCode] = await Promise.all([
            process.stdout
                .pipeThrough(new TextDecoderStream())
                .pipeThrough(new ConcatStringStream()),
            process.stderr
                .pipeThrough(new TextDecoderStream())
                .pipeThrough(new ConcatStringStream()),
            process.exited,
        ]);
        return { stdout, stderr, exitCode };
    }
}

class AdbShellProtocolSubprocessService extends AdbShellProtocolSpawner {
    #adb;
    get adb() {
        return this.#adb;
    }
    get isSupported() {
        return this.#adb.canUseFeature(AdbFeature.ShellV2);
    }
    constructor(adb) {
        super(async (command, signal) => {
            const socket = await this.#adb.createSocket(`shell,v2,raw:${command.join(" ")}`);
            if (signal?.aborted) {
                await socket.close();
                throw signal.reason;
            }
            return new AdbShellProtocolProcessImpl(socket, signal);
        });
        this.#adb = adb;
    }
    async pty(options) {
        let service = "shell,v2,pty";
        if (options?.terminalType) {
            service += `,TERM=` + options.terminalType;
        }
        service += ":";
        if (options) {
            if (typeof options.command === "string") {
                service += options.command;
            }
            else if (Array.isArray(options.command)) {
                service += options.command.join(" ");
            }
        }
        return new AdbShellProtocolPtyProcess(await this.#adb.createSocket(service));
    }
}

class AdbSubprocessService {
    #adb;
    get adb() {
        return this.#adb;
    }
    #noneProtocol;
    get noneProtocol() {
        return this.#noneProtocol;
    }
    #shellProtocol;
    get shellProtocol() {
        return this.#shellProtocol;
    }
    constructor(adb) {
        this.#adb = adb;
        this.#noneProtocol = new AdbNoneProtocolSubprocessService(adb);
        if (adb.canUseFeature(AdbFeature.ShellV2)) {
            this.#shellProtocol = new AdbShellProtocolSubprocessService(adb);
        }
    }
}

function encodeAsciiUnchecked(value) {
    const result = new Uint8Array(value.length);
    for (let i = 0; i < value.length; i += 1) {
        result[i] = value.charCodeAt(i);
    }
    return result;
}
/**
 * Encode ID to numbers for faster comparison
 * @param value A 4-character string
 * @returns A 32-bit integer by encoding the string as little-endian
 *
 * #__NO_SIDE_EFFECTS__
 */
function adbSyncEncodeId(value) {
    const buffer = encodeAsciiUnchecked(value);
    return getUint32LittleEndian(buffer, 0);
}
const AdbSyncResponseId = {
    Entry: adbSyncEncodeId("DENT"),
    Entry2: adbSyncEncodeId("DNT2"),
    Lstat: adbSyncEncodeId("STAT"),
    Stat: adbSyncEncodeId("STA2"),
    Lstat2: adbSyncEncodeId("LST2"),
    Done: adbSyncEncodeId("DONE"),
    Data: adbSyncEncodeId("DATA"),
    Ok: adbSyncEncodeId("OKAY"),
    Fail: adbSyncEncodeId("FAIL"),
};
class AdbSyncError extends Error {
}
const AdbSyncFailResponse = struct({ message: string(u32) }, {
    littleEndian: true,
    postDeserialize(value) {
        throw new AdbSyncError(value.message);
    },
});
async function adbSyncReadResponse(stream, id, type) {
    if (typeof id === "string") {
        id = adbSyncEncodeId(id);
    }
    const buffer = await stream.readExactly(4);
    switch (getUint32LittleEndian(buffer, 0)) {
        case AdbSyncResponseId.Fail:
            await AdbSyncFailResponse.deserialize(stream);
            throw new Error("Unreachable");
        case id:
            return await type.deserialize(stream);
        default:
            throw new Error(`Expected '${id}', but got '${decodeUtf8(buffer)}'`);
    }
}
async function* adbSyncReadResponses(stream, id, type) {
    if (typeof id === "string") {
        id = adbSyncEncodeId(id);
    }
    while (true) {
        const buffer = await stream.readExactly(4);
        switch (getUint32LittleEndian(buffer, 0)) {
            case AdbSyncResponseId.Fail:
                await AdbSyncFailResponse.deserialize(stream);
                unreachable();
            case AdbSyncResponseId.Done:
                // `DONE` responses' size are always same as the request's normal response.
                //
                // For example, `DONE` responses for `LIST` requests are 16 bytes (same as `DENT` responses),
                // but `DONE` responses for `STAT` requests are 12 bytes (same as `STAT` responses).
                await stream.readExactly(type.size);
                return;
            case id:
                yield await type.deserialize(stream);
                break;
            default:
                throw new Error(`Expected '${id}' or '${AdbSyncResponseId.Done}', but got '${decodeUtf8(buffer)}'`);
        }
    }
}

const AdbSyncRequestId = {
    List: adbSyncEncodeId("LIST"),
    ListV2: adbSyncEncodeId("LIS2"),
    Send: adbSyncEncodeId("SEND"),
    SendV2: adbSyncEncodeId("SND2"),
    Lstat: adbSyncEncodeId("STAT"),
    Stat: adbSyncEncodeId("STA2"),
    LstatV2: adbSyncEncodeId("LST2"),
    Data: adbSyncEncodeId("DATA"),
    Done: adbSyncEncodeId("DONE"),
    Receive: adbSyncEncodeId("RECV"),
};
const AdbSyncNumberRequest = struct({ id: u32, arg: u32 }, { littleEndian: true });
async function adbSyncWriteRequest(writable, id, value) {
    if (typeof id === "string") {
        id = adbSyncEncodeId(id);
    }
    if (typeof value === "number") {
        await writable.write(AdbSyncNumberRequest.serialize({ id, arg: value }));
        return;
    }
    if (typeof value === "string") {
        value = encodeUtf8(value);
    }
    // `writable` is buffered, it copies inputs to an internal buffer,
    // so don't concatenate headers and data here, that will be an unnecessary copy.
    await writable.write(AdbSyncNumberRequest.serialize({ id, arg: value.length }));
    await writable.write(value);
}

// https://github.com/python/cpython/blob/4e581d64b8aff3e2eda99b12f080c877bb78dfca/Lib/stat.py#L36
const LinuxFileType = {
    File: 0o10};
const AdbSyncLstatResponse = struct({ mode: u32, size: u32, mtime: u32 }, {
    littleEndian: true,
    extra: {
        get type() {
            return (this.mode >> 12);
        },
        get permission() {
            return this.mode & 0b00001111_11111111;
        },
    },
    postDeserialize(value) {
        if (value.mode === 0 && value.size === 0 && value.mtime === 0) {
            throw new Error("lstat error");
        }
        return value;
    },
});
const AdbSyncStatErrorCode = {
    SUCCESS: 0,
    EACCES: 13,
    EEXIST: 17,
    EFAULT: 14,
    EFBIG: 27,
    EINTR: 4,
    EINVAL: 22,
    EIO: 5,
    EISDIR: 21,
    ELOOP: 40,
    EMFILE: 24,
    ENAMETOOLONG: 36,
    ENFILE: 23,
    ENOENT: 2,
    ENOMEM: 12,
    ENOSPC: 28,
    ENOTDIR: 20,
    EOVERFLOW: 75,
    EPERM: 1,
    EROFS: 30,
    ETXTBSY: 26,
};
const AdbSyncStatErrorName = /* #__PURE__ */ (() => Object.fromEntries(Object.entries(AdbSyncStatErrorCode).map(([key, value]) => [
    value,
    key,
])))();
const AdbSyncStatResponse = struct({
    error: u32(),
    dev: u64,
    ino: u64,
    mode: u32,
    nlink: u32,
    uid: u32,
    gid: u32,
    size: u64,
    atime: u64,
    mtime: u64,
    ctime: u64,
}, {
    littleEndian: true,
    extra: {
        get type() {
            return (this.mode >> 12);
        },
        get permission() {
            return this.mode & 0b00001111_11111111;
        },
    },
    postDeserialize(value) {
        if (value.error) {
            throw new Error(AdbSyncStatErrorName[value.error]);
        }
        return value;
    },
});
async function adbSyncLstat(socket, path, v2) {
    const locked = await socket.lock();
    try {
        if (v2) {
            await adbSyncWriteRequest(locked, AdbSyncRequestId.LstatV2, path);
            return await adbSyncReadResponse(locked, AdbSyncResponseId.Lstat2, AdbSyncStatResponse);
        }
        else {
            await adbSyncWriteRequest(locked, AdbSyncRequestId.Lstat, path);
            const response = await adbSyncReadResponse(locked, AdbSyncResponseId.Lstat, AdbSyncLstatResponse);
            return {
                mode: response.mode,
                // Convert to `BigInt` to make it compatible with `AdbSyncStatResponse`
                size: BigInt(response.size),
                mtime: BigInt(response.mtime),
                get type() {
                    return response.type;
                },
                get permission() {
                    return response.permission;
                },
            };
        }
    }
    finally {
        locked.release();
    }
}
async function adbSyncStat(socket, path) {
    const locked = await socket.lock();
    try {
        await adbSyncWriteRequest(locked, AdbSyncRequestId.Stat, path);
        return await adbSyncReadResponse(locked, AdbSyncResponseId.Stat, AdbSyncStatResponse);
    }
    finally {
        locked.release();
    }
}

const AdbSyncEntryResponse = extend(AdbSyncLstatResponse, {
    name: string(u32),
});
const AdbSyncEntry2Response = extend(AdbSyncStatResponse, {
    name: string(u32),
});
async function* adbSyncOpenDirV2(socket, path) {
    const locked = await socket.lock();
    try {
        await adbSyncWriteRequest(locked, AdbSyncRequestId.ListV2, path);
        for await (const item of adbSyncReadResponses(locked, AdbSyncResponseId.Entry2, AdbSyncEntry2Response)) {
            // `LST2` can return error codes for failed `lstat` calls.
            // `LIST` just ignores them.
            // But they only contain `name` so still pretty useless.
            if (item.error !== AdbSyncStatErrorCode.SUCCESS) {
                continue;
            }
            yield item;
        }
    }
    finally {
        locked.release();
    }
}
async function* adbSyncOpenDirV1(socket, path) {
    const locked = await socket.lock();
    try {
        await adbSyncWriteRequest(locked, AdbSyncRequestId.List, path);
        for await (const item of adbSyncReadResponses(locked, AdbSyncResponseId.Entry, AdbSyncEntryResponse)) {
            yield item;
        }
    }
    finally {
        locked.release();
    }
}
async function* adbSyncOpenDir(socket, path, v2) {
    if (v2) {
        yield* adbSyncOpenDirV2(socket, path);
    }
    else {
        for await (const item of adbSyncOpenDirV1(socket, path)) {
            // Convert to same format as `AdbSyncEntry2Response` for easier consumption.
            // However it will add some overhead.
            yield {
                mode: item.mode,
                size: BigInt(item.size),
                mtime: BigInt(item.mtime),
                get type() {
                    return item.type;
                },
                get permission() {
                    return item.permission;
                },
                name: item.name,
            };
        }
    }
}

const AdbSyncDataResponse = struct({ data: buffer(u32) }, { littleEndian: true });
async function* adbSyncPullGenerator(socket, path) {
    const locked = await socket.lock();
    let done = false;
    try {
        await adbSyncWriteRequest(locked, AdbSyncRequestId.Receive, path);
        for await (const packet of adbSyncReadResponses(locked, AdbSyncResponseId.Data, AdbSyncDataResponse)) {
            yield packet.data;
        }
        done = true;
    }
    catch (e) {
        done = true;
        throw e;
    }
    finally {
        if (!done) {
            // sync pull can't be cancelled, so we have to read all data
            for await (const packet of adbSyncReadResponses(locked, AdbSyncResponseId.Data, AdbSyncDataResponse)) {
            }
        }
        locked.release();
    }
}
function adbSyncPull(socket, path) {
    return ReadableStream$1.from(adbSyncPullGenerator(socket, path));
}

const ADB_SYNC_MAX_PACKET_SIZE = 64 * 1024;
const AdbSyncOkResponse = struct({ unused: u32 }, { littleEndian: true });
async function pipeFileData(locked, file, packetSize, mtime) {
    // Read and write in parallel,
    // allow error response to abort the write.
    const abortController = new AbortController$1();
    file.pipeThrough(new DistributionStream(packetSize, true))
        .pipeTo(new MaybeConsumableWritableStream({
        write(chunk) {
            return adbSyncWriteRequest(locked, AdbSyncRequestId.Data, chunk);
        },
    }), { signal: abortController.signal })
        .then(async () => {
        await adbSyncWriteRequest(locked, AdbSyncRequestId.Done, mtime);
        await locked.flush();
    }, NOOP);
    await adbSyncReadResponse(locked, AdbSyncResponseId.Ok, AdbSyncOkResponse).catch((e) => {
        abortController.abort();
        throw e;
    });
}
async function adbSyncPushV1({ socket, filename, file, type = LinuxFileType.File, permission = 0o666, mtime = (Date.now() / 1000) | 0, packetSize = ADB_SYNC_MAX_PACKET_SIZE, }) {
    const locked = await socket.lock();
    try {
        const mode = (type << 12) | permission;
        const pathAndMode = `${filename},${mode.toString()}`;
        await adbSyncWriteRequest(locked, AdbSyncRequestId.Send, pathAndMode);
        await pipeFileData(locked, file, packetSize, mtime);
    }
    finally {
        locked.release();
    }
}
const AdbSyncSendV2Flags = {
    None: 0,
    Brotli: 1,
    /**
     * 2
     */
    Lz4: 1 << 1,
    /**
     * 4
     */
    Zstd: 1 << 2,
    DryRun: 0x80000000,
};
const AdbSyncSendV2Request = struct({ id: u32, mode: u32, flags: u32() }, { littleEndian: true });
async function adbSyncPushV2({ socket, filename, file, type = LinuxFileType.File, permission = 0o666, mtime = (Date.now() / 1000) | 0, packetSize = ADB_SYNC_MAX_PACKET_SIZE, dryRun = false, }) {
    const locked = await socket.lock();
    try {
        await adbSyncWriteRequest(locked, AdbSyncRequestId.SendV2, filename);
        const mode = (type << 12) | permission;
        let flags = AdbSyncSendV2Flags.None;
        if (dryRun) {
            flags |= AdbSyncSendV2Flags.DryRun;
        }
        await locked.write(AdbSyncSendV2Request.serialize({
            id: AdbSyncRequestId.SendV2,
            mode,
            flags,
        }));
        await pipeFileData(locked, file, packetSize, mtime);
    }
    finally {
        locked.release();
    }
}
function adbSyncPush(options) {
    if (options.v2) {
        return adbSyncPushV2(options);
    }
    if (options.dryRun) {
        throw new Error("dryRun is not supported in v1");
    }
    return adbSyncPushV1(options);
}

class AdbSyncSocketLocked {
    #writer;
    #readable;
    #socketLock;
    #writeLock = new AutoResetEvent();
    #combiner;
    get position() {
        return this.#readable.position;
    }
    constructor(writer, readable, bufferSize, lock) {
        this.#writer = writer;
        this.#readable = readable;
        this.#socketLock = lock;
        this.#combiner = new BufferCombiner(bufferSize);
    }
    #write(buffer) {
        // `#combiner` will reuse the buffer, so we need to use the Consumable pattern
        return Consumable.WritableStream.write(this.#writer, buffer);
    }
    async flush() {
        try {
            await this.#writeLock.wait();
            const buffer = this.#combiner.flush();
            if (buffer) {
                await this.#write(buffer);
            }
        }
        finally {
            this.#writeLock.notifyOne();
        }
    }
    async write(data) {
        try {
            await this.#writeLock.wait();
            for (const buffer of this.#combiner.push(data)) {
                await this.#write(buffer);
            }
        }
        finally {
            this.#writeLock.notifyOne();
        }
    }
    async readExactly(length) {
        // The request may still be in the internal buffer.
        // Call `flush` to send it before starting reading
        await this.flush();
        return await this.#readable.readExactly(length);
    }
    release() {
        // In theory, the writer shouldn't leave anything in the buffer,
        // but to be safe, call `flush` to throw away any remaining data.
        this.#combiner.flush();
        this.#socketLock.notifyOne();
    }
    async close() {
        await this.#readable.cancel();
    }
}
class AdbSyncSocket {
    #lock = new AutoResetEvent();
    #socket;
    #locked;
    constructor(socket, bufferSize) {
        this.#socket = socket;
        this.#locked = new AdbSyncSocketLocked(socket.writable.getWriter(), new BufferedReadableStream(socket.readable), bufferSize, this.#lock);
    }
    async lock() {
        await this.#lock.wait();
        return this.#locked;
    }
    async close() {
        await this.#locked.close();
        await this.#socket.close();
    }
}

/**
 * A simplified `dirname` function that only handles absolute unix paths.
 * @param path an absolute unix path
 * @returns the directory name of the input path
 */
function dirname(path) {
    const end = path.lastIndexOf("/");
    if (end === -1) {
        throw new Error(`Invalid path`);
    }
    if (end === 0) {
        return "/";
    }
    return path.substring(0, end);
}
class AdbSync {
    _adb;
    _socket;
    #supportsStat;
    #supportsListV2;
    #fixedPushMkdir;
    #supportsSendReceiveV2;
    #needPushMkdirWorkaround;
    get supportsStat() {
        return this.#supportsStat;
    }
    get supportsListV2() {
        return this.#supportsListV2;
    }
    get fixedPushMkdir() {
        return this.#fixedPushMkdir;
    }
    get supportsSendReceiveV2() {
        return this.#supportsSendReceiveV2;
    }
    get needPushMkdirWorkaround() {
        return this.#needPushMkdirWorkaround;
    }
    constructor(adb, socket) {
        this._adb = adb;
        this._socket = new AdbSyncSocket(socket, adb.maxPayloadSize);
        this.#supportsStat = adb.canUseFeature(AdbFeature.StatV2);
        this.#supportsListV2 = adb.canUseFeature(AdbFeature.ListV2);
        this.#fixedPushMkdir = adb.canUseFeature(AdbFeature.FixedPushMkdir);
        this.#supportsSendReceiveV2 = adb.canUseFeature(AdbFeature.SendReceiveV2);
        // https://android.googlesource.com/platform/packages/modules/adb/+/91768a57b7138166e0a3d11f79cd55909dda7014/client/file_sync_client.cpp#1361
        this.#needPushMkdirWorkaround =
            this._adb.canUseFeature(AdbFeature.ShellV2) && !this.fixedPushMkdir;
    }
    /**
     * Gets information of a file or folder.
     *
     * If `path` points to a symbolic link, the returned information is about the link itself (with `type` being `LinuxFileType.Link`).
     */
    async lstat(path) {
        return await adbSyncLstat(this._socket, path, this.#supportsStat);
    }
    /**
     * Gets the information of a file or folder.
     *
     * If `path` points to a symbolic link, it will be resolved and the returned information is about the target (with `type` being `LinuxFileType.File` or `LinuxFileType.Directory`).
     */
    async stat(path) {
        if (!this.#supportsStat) {
            throw new Error("Not supported");
        }
        return await adbSyncStat(this._socket, path);
    }
    /**
     * Checks if `path` is a directory, or a symbolic link to a directory.
     *
     * This uses `lstat` internally, thus works on all Android versions.
     */
    async isDirectory(path) {
        try {
            await this.lstat(path + "/");
            return true;
        }
        catch {
            return false;
        }
    }
    opendir(path) {
        return adbSyncOpenDir(this._socket, path, this.supportsListV2);
    }
    async readdir(path) {
        const results = [];
        for await (const entry of this.opendir(path)) {
            results.push(entry);
        }
        return results;
    }
    /**
     * Reads the content of a file on device.
     *
     * @param filename The full path of the file on device to read.
     * @returns A `ReadableStream` that contains the file content.
     */
    read(filename) {
        return adbSyncPull(this._socket, filename);
    }
    /**
     * Writes a file on device. If the file name already exists, it will be overwritten.
     *
     * @param options The content and options of the file to write.
     */
    async write(options) {
        if (this.needPushMkdirWorkaround) {
            // It may fail if `filename` already exists.
            // Ignore the result.
            // TODO: sync: test push mkdir workaround (need an Android 8 device)
            await this._adb.subprocess.noneProtocol.spawnWait([
                "mkdir",
                "-p",
                escapeArg(dirname(options.filename)),
            ]);
        }
        await adbSyncPush({
            v2: this.supportsSendReceiveV2,
            socket: this._socket,
            ...options,
        });
    }
    lockSocket() {
        return this._socket.lock();
    }
    dispose() {
        return this._socket.close();
    }
}

function parsePort(value) {
    if (!value || value === "0") {
        return undefined;
    }
    return Number.parseInt(value, 10);
}
class AdbTcpIpService extends AdbServiceBase {
    async getListenAddresses() {
        const serviceListenAddresses = await this.adb.getProp("service.adb.listen_addrs");
        const servicePort = await this.adb.getProp("service.adb.tcp.port");
        const persistPort = await this.adb.getProp("persist.adb.tcp.port");
        return {
            serviceListenAddresses: serviceListenAddresses != ""
                ? serviceListenAddresses.split(",")
                : [],
            servicePort: parsePort(servicePort),
            persistPort: parsePort(persistPort),
        };
    }
    async setPort(port) {
        if (port <= 0) {
            throw new TypeError(`Invalid port ${port}`);
        }
        const output = await this.adb.createSocketAndWait(`tcpip:${port}`);
        if (output !== `restarting in TCP mode port: ${port}\n`) {
            throw new Error(output);
        }
        return output;
    }
    async disable() {
        const output = await this.adb.createSocketAndWait("usb:");
        if (output !== "restarting in USB mode\n") {
            throw new Error(output);
        }
        return output;
    }
}

class Adb {
    #transport;
    get transport() {
        return this.#transport;
    }
    get serial() {
        return this.#transport.serial;
    }
    get maxPayloadSize() {
        return this.#transport.maxPayloadSize;
    }
    get banner() {
        return this.#transport.banner;
    }
    get disconnected() {
        return this.#transport.disconnected;
    }
    get clientFeatures() {
        return this.#transport.clientFeatures;
    }
    get deviceFeatures() {
        return this.banner.features;
    }
    subprocess;
    power;
    reverse;
    tcpip;
    constructor(transport) {
        this.#transport = transport;
        this.subprocess = new AdbSubprocessService(this);
        this.power = new AdbPower(this);
        this.reverse = new AdbReverseService(this);
        this.tcpip = new AdbTcpIpService(this);
    }
    canUseFeature(feature) {
        return (this.clientFeatures.includes(feature) &&
            this.deviceFeatures.includes(feature));
    }
    /**
     * Creates a new ADB Socket to the specified service or socket address.
     */
    async createSocket(service) {
        return this.#transport.connect(service);
    }
    async createSocketAndWait(service) {
        const socket = await this.createSocket(service);
        return await socket.readable
            .pipeThrough(new TextDecoderStream())
            .pipeThrough(new ConcatStringStream());
    }
    getProp(key) {
        return this.subprocess.noneProtocol
            .spawnWaitText(["getprop", key])
            .then((output) => output.trim());
    }
    rm(filenames, options) {
        const args = ["rm"];
        if (options?.recursive) {
            args.push("-r");
        }
        if (options?.force) {
            args.push("-f");
        }
        if (Array.isArray(filenames)) {
            for (const filename of filenames) {
                // https://github.com/microsoft/typescript/issues/17002
                args.push(escapeArg(filename));
            }
        }
        else {
            // https://github.com/microsoft/typescript/issues/17002
            args.push(escapeArg(filenames));
        }
        // https://android.googlesource.com/platform/packages/modules/adb/+/1a0fb8846d4e6b671c8aa7f137a8c21d7b248716/client/adb_install.cpp#984
        args.push("</dev/null");
        return this.subprocess.noneProtocol.spawnWaitText(args);
    }
    async sync() {
        const socket = await this.createSocket("sync:");
        return new AdbSync(this, socket);
    }
    async framebuffer() {
        return framebuffer(this);
    }
    async close() {
        await this.#transport.close();
    }
}

const AdbBannerKey = {
    Product: "ro.product.name",
    Model: "ro.product.model",
    Device: "ro.product.device",
    Features: "features",
};
class AdbBanner {
    static parse(banner) {
        let state;
        let product;
        let model;
        let device;
        let features = [];
        const pieces = banner.split("::");
        if (pieces.length > 1) {
            state = (pieces[0].trim() || undefined);
            const props = pieces[1];
            for (const prop of props.split(";")) {
                // istanbul ignore if
                if (!prop) {
                    continue;
                }
                const keyValue = prop.split("=");
                if (keyValue.length !== 2) {
                    continue;
                }
                const [key, value] = keyValue;
                switch (key) {
                    case AdbBannerKey.Product:
                        product = value;
                        break;
                    case AdbBannerKey.Model:
                        model = value;
                        break;
                    case AdbBannerKey.Device:
                        device = value;
                        break;
                    case AdbBannerKey.Features:
                        features = value.split(",");
                        break;
                }
            }
        }
        return new AdbBanner(state, product, model, device, features);
    }
    #state;
    get state() {
        return this.#state;
    }
    #product;
    get product() {
        return this.#product;
    }
    #model;
    get model() {
        return this.#model;
    }
    #device;
    get device() {
        return this.#device;
    }
    #features = [];
    get features() {
        return this.#features;
    }
    // eslint-disable-next-line @typescript-eslint/max-params
    constructor(state, product, model, device, features) {
        this.#state = state;
        this.#product = product;
        this.#model = model;
        this.#device = device;
        this.#features = features;
    }
}

/**
 * Gets the `BigInt` value at the specified byte offset and length from the start of the view. There is
 * no alignment constraint; multi-byte values may be fetched from any offset.
 *
 * Only supports Big-Endian, because that's what ADB uses.
 * @param byteOffset The place in the buffer at which the value should be retrieved.
 */
function getBigUint(array, byteOffset, length) {
    let result = 0n;
    // The leading bytes that do not fill a whole 64-bit word.
    for (let j = 0; j < length % 8; j += 1) {
        result = (result << 8n) | BigInt(array[byteOffset + j]);
    }
    for (let i = byteOffset + (length % 8); i < byteOffset + length; i += 8) {
        result <<= 64n;
        const value = getUint64BigEndian(array, i);
        result |= value;
    }
    return result;
}
/**
 * Stores an arbitrary-precision positive `BigInt` value at the specified byte offset from the start of the view.
 * @param byteOffset The place in the buffer at which the value should be set.
 * @param length The number of bytes to set.
 * @param value The value to set.
 * @param littleEndian If `false` or `undefined`, a big-endian value should be written,
 * otherwise a little-endian value should be written.
 */
// eslint-disable-next-line @typescript-eslint/max-params
function setBigUint(array, byteOffset, length, value, littleEndian) {
    if (littleEndian) {
        while (value > 0n) {
            setInt64LittleEndian(array, byteOffset, value);
            byteOffset += 8;
            value >>= 64n;
        }
    }
    else {
        let position = byteOffset + length - 8;
        while (value > 0n) {
            setInt64BigEndian(array, position, value);
            position -= 8;
            value >>= 64n;
        }
    }
}
// References:
//
//   https://tools.ietf.org/html/rfc8017#appendix-A.1.2
//   PKCS #1: RSA Cryptography Specifications Version 2.2
//     A.1.2.  RSA Private Key Syntax
//
//   https://lapo.it/asn1js/
//   https://github.com/lapo-luchini/asn1js
//   ASN.1 JavaScript decoder
//
//   https://www.itu.int/rec/T-REC-X.690-201508-I/en
//   X.690: Specification of Distinguished Encoding Rules (DER)
/**
 * One DER tag-length-value header: where its content starts and how long it is.
 * @param data The DER-encoded data.
 * @param offset The offset of the header in the data.
 * @returns The content offset and length.
 */
function derHeader(data, offset) {
    offset = offset + 1; // Only low-tag-number forms occur in a PKCS #8 RSA key.
    let length = data[offset];
    offset += 1;
    if (length & 0x80) {
        const lengthBytes = length & 0x7f;
        length = 0;
        for (let i = 0; i < lengthBytes; i += 1) {
            length = (length << 8) | data[offset];
            offset += 1;
        }
    }
    return { offset, length };
}
function rsaParsePrivateKey(key) {
    // PrivateKeyInfo ::= SEQUENCE {
    //     version             INTEGER,
    //     privateKeyAlgorithm AlgorithmIdentifier,
    //     privateKey          OCTET STRING -- wrapping an RSAPrivateKey
    // }
    // RSAPrivateKey ::= SEQUENCE {
    //     version         Version,
    //     modulus         INTEGER, -- n
    //     publicExponent  INTEGER, -- e
    //     privateExponent INTEGER  -- d
    //     -- ... other fields omitted
    // }
    let offset = derHeader(key, 0).offset; // into PrivateKeyInfo
    let header = derHeader(key, offset); // skip version
    offset = header.offset + header.length;
    header = derHeader(key, offset); // skip privateKeyAlgorithm
    offset = header.offset + header.length;
    offset = derHeader(key, offset).offset; // into OCTET STRING
    offset = derHeader(key, offset).offset; // into RSAPrivateKey
    header = derHeader(key, offset); // skip version
    offset = header.offset + header.length;
    const nHeader = derHeader(key, offset); // get modulus
    offset = nHeader.offset + nHeader.length;
    const eHeader = derHeader(key, offset); // skip publicExponent
    offset = eHeader.offset + eHeader.length;
    const dHeader = derHeader(key, offset); // get privateExponent
    const n = getBigUint(key, nHeader.offset, nHeader.length);
    const d = getBigUint(key, dHeader.offset, dHeader.length);
    return [n, d];
}
function nonNegativeMod(m, d) {
    const r = m % d;
    if (r > 0) {
        return r;
    }
    return r + (d );
}
// https://en.wikipedia.org/wiki/Modular_multiplicative_inverse
// Solve for the smallest positive `x` in the equation `a * x ≡ 1 (mod m)`,
// or in other words, `a * x % m = 1`
// Taken from https://stackoverflow.com/a/51562038
// Only used with numbers smaller than 2^32 so doesn't need BigInt
function modInverse(a, m) {
    a = nonNegativeMod(a, m);
    if (!a || m < 2) {
        return NaN; // invalid input
    }
    // find the gcd
    const s = [];
    let b = m;
    while (b) {
        [a, b] = [b, a % b];
        s.push({ a, b });
    }
    /* istanbul ignore next */
    if (a !== 1) {
        return NaN; // inverse does not exists
    }
    // find the inverse
    let x = 1;
    let y = 0;
    for (let i = s.length - 2; i >= 0; i -= 1) {
        [x, y] = [y, x - y * Math.floor(s[i].a / s[i].b)];
    }
    return nonNegativeMod(y, m);
}
const ModulusLengthInBytes = 2048 / 8;
const ModulusLengthInWords = ModulusLengthInBytes / 4;
function adbGetPublicKeySize() {
    return 4 + 4 + ModulusLengthInBytes + ModulusLengthInBytes + 4;
}
function adbGeneratePublicKey(privateKey, output) {
    // cspell: ignore: mincrypt
    // Android 6 and earlier has its own encryption library called mincrypt
    // This is the RSA public key format used by mincrypt:
    // https://android.googlesource.com/platform/system/core/+/bb0c180e62703c2068a1b2c9f8ba6d634bf1553c/include/mincrypt/rsa.h#46
    // `n0inv` and `rr` are pre-calculated to speed up RSA operations
    // Android 7 switched its encryption library to BoringSSL, but still keeps the key format:
    // https://android.googlesource.com/platform/system/core.git/+/91784040db2b9273687f88d8b95f729d4a61ecc2/libcrypto_utils/android_pubkey.cpp#38
    // Except when reading a key, `n0inv` and `rr` are ignored (they are still populated when generating a key):
    // https://android.googlesource.com/platform/system/core.git/+/91784040db2b9273687f88d8b95f729d4a61ecc2/libcrypto_utils/android_pubkey.cpp#55
    // The public key is a struct (in little endian) of:
    //
    // [
    //   modulusLengthInWords, // 32-bit integer, a "word" is 32-bit so it must be 2048 / 8 / 4
    //                         // (the comment in Android source code is incorrect saying "This must be ANDROID_PUBKEY_MODULUS_SIZE")
    //   n0inv,                // 32-bit integer, the modular inverse of (lower 32 bits of `n`)
    //   modulus,              // `n`
    //   rr,                   // Montgomery parameter R^2
    //   exponent,             // 32-bit integer, must be 3 or 65537
    // ]
    let outputType;
    const outputLength = adbGetPublicKeySize();
    if (!output) {
        output = new Uint8Array(outputLength);
        outputType = "Uint8Array";
    }
    else {
        if (output.length < outputLength) {
            throw new TypeError("output buffer is too small");
        }
        outputType = "number";
    }
    const outputView = new DataView(output.buffer, output.byteOffset, output.length);
    let outputOffset = 0;
    // modulusLengthInWords
    outputView.setUint32(outputOffset, ModulusLengthInWords, true);
    outputOffset += 4;
    // extract `n` from private key
    const [n] = rsaParsePrivateKey(privateKey);
    // Calculate `n0inv`
    const n0inv = -modInverse(Number(n % 2n ** 32n), 2 ** 32);
    outputView.setInt32(outputOffset, n0inv, true);
    outputOffset += 4;
    // Write `n` (a.k.a. `modulus`)
    setBigUint(output, outputOffset, ModulusLengthInBytes, n, true);
    outputOffset += ModulusLengthInBytes;
    // Calculate rr = (2 ** (rsa_size)) ** 2 % n
    const rr = 2n ** 4096n % n;
    setBigUint(output, outputOffset, ModulusLengthInBytes, rr, true);
    outputOffset += ModulusLengthInBytes;
    // exponent
    outputView.setUint32(outputOffset, 65537, true);
    if (outputType === "Uint8Array") {
        return output;
    }
    else {
        return outputLength;
    }
}
/**
 * Modular exponentiation.
 *
 * Calculate `(base ** exponent) % modulus` without actually calculating `(base ** exponent)`.
 *
 * See https://en.wikipedia.org/wiki/Modular_exponentiation#Implementation_in_Lua
 */
function powMod(base, exponent, modulus) {
    if (modulus === 1n) {
        return 0n;
    }
    let r = 1n;
    base = base % modulus;
    while (exponent > 0n) {
        if (BigInt.asUintN(1, exponent) === 1n) {
            r = (r * base) % modulus;
        }
        base = (base * base) % modulus;
        exponent >>= 1n;
    }
    return r;
}
const SHA1_DIGEST_LENGTH = 20;
const ASN1_SEQUENCE = 0x30;
const ASN1_OCTET_STRING = 0x04;
const ASN1_NULL = 0x05;
const ASN1_OID = 0x06;
// PKCS#1 SHA-1 hash digest info
const SHA1_DIGEST_INFO = new Uint8Array([
    ASN1_SEQUENCE,
    0x0d + SHA1_DIGEST_LENGTH,
    ASN1_SEQUENCE,
    0x09,
    // SHA-1 (1 3 14 3 2 26)
    ASN1_OID,
    0x05,
    1 * 40 + 3,
    14,
    3,
    2,
    26,
    ASN1_NULL,
    0x00,
    ASN1_OCTET_STRING,
    SHA1_DIGEST_LENGTH,
]);
// SubtleCrypto.sign() will hash the given data and sign the hash
// But we don't need the hashing step
// (In another word, ADB just requires the client to
// encrypt the given data with its private key)
// However SubtileCrypto.encrypt() doesn't accept 'RSASSA-PKCS1-v1_5' algorithm
// So we need to implement the encryption by ourself
function rsaSign(privateKey, data) {
    const [n, d] = rsaParsePrivateKey(privateKey);
    // PKCS#1 padding
    const padded = new Uint8Array(256);
    let index = 0;
    padded[index] = 0;
    index += 1;
    padded[index] = 1;
    index += 1;
    const fillLength = padded.length - SHA1_DIGEST_INFO.length - data.length - 1;
    while (index < fillLength) {
        padded[index] = 0xff;
        index += 1;
    }
    padded[index] = 0;
    index += 1;
    padded.set(SHA1_DIGEST_INFO, index);
    index += SHA1_DIGEST_INFO.length;
    padded.set(data, index);
    // Encryption
    // signature = padded ** d % n
    const signature = powMod(getBigUint(padded, 0, padded.length), d, n);
    // `padded` is not used anymore,
    // re-use the buffer to store the result
    setBigUint(padded, 0, padded.length, signature, false);
    return padded;
}

const AdbCommand = {
    Auth: 0x48545541, // 'AUTH'
    Close: 0x45534c43, // 'CLSE'
    Connect: 0x4e584e43, // 'CNXN'
    Okay: 0x59414b4f, // 'OKAY'
    Open: 0x4e45504f, // 'OPEN'
    Write: 0x45545257, // 'WRTE'
};
const AdbPacketHeader = struct({
    command: u32,
    arg0: u32,
    arg1: u32,
    payloadLength: u32,
    checksum: u32,
    magic: s32,
}, { littleEndian: true });
function calculateChecksum(payload) {
    return payload.reduce((result, item) => result + item, 0);
}
class AdbPacketSerializeStream extends TransformStream$1 {
    constructor() {
        const headerBuffer = new Uint8Array(AdbPacketHeader.size);
        super({
            transform: async (chunk, controller) => {
                await chunk.tryConsume(async (chunk) => {
                    const init = chunk;
                    init.payloadLength = init.payload.length;
                    AdbPacketHeader.serialize(init, headerBuffer);
                    await Consumable.ReadableStream.enqueue(controller, headerBuffer);
                    if (init.payloadLength) {
                        // USB protocol preserves packet boundaries,
                        // so we must write payload separately as native ADB does,
                        // otherwise the read operation on device will fail.
                        await Consumable.ReadableStream.enqueue(controller, init.payload);
                    }
                });
            },
        });
    }
}

const AdbAuthType = {
    Token: 1,
    Signature: 2,
    PublicKey: 3,
};
const AdbSignatureAuthenticator = async function* (credentialStore, getNextRequest) {
    for await (const key of credentialStore.iterateKeys()) {
        const packet = await getNextRequest();
        if (packet.arg0 !== AdbAuthType.Token) {
            return;
        }
        const signature = rsaSign(key.buffer, packet.payload);
        yield {
            command: AdbCommand.Auth,
            arg0: AdbAuthType.Signature,
            arg1: 0,
            payload: signature,
        };
    }
};
const AdbPublicKeyAuthenticator = async function* (credentialStore, getNextRequest) {
    const packet = await getNextRequest();
    if (packet.arg0 !== AdbAuthType.Token) {
        return;
    }
    let privateKey;
    for await (const key of credentialStore.iterateKeys()) {
        privateKey = key;
        break;
    }
    if (!privateKey) {
        privateKey = await credentialStore.generateKey();
    }
    const publicKeyLength = adbGetPublicKeySize();
    const [publicKeyBase64Length] = calculateBase64EncodedLength(publicKeyLength);
    const nameBuffer = privateKey.name?.length
        ? encodeUtf8(privateKey.name)
        : EmptyUint8Array;
    const publicKeyBuffer = new Uint8Array(publicKeyBase64Length +
        (nameBuffer.length ? nameBuffer.length + 1 : 0) + // Space character + name
        1);
    adbGeneratePublicKey(privateKey.buffer, publicKeyBuffer);
    encodeBase64(publicKeyBuffer.subarray(0, publicKeyLength), publicKeyBuffer);
    if (nameBuffer.length) {
        publicKeyBuffer[publicKeyBase64Length] = 0x20;
        publicKeyBuffer.set(nameBuffer, publicKeyBase64Length + 1);
    }
    yield {
        command: AdbCommand.Auth,
        arg0: AdbAuthType.PublicKey,
        arg1: 0,
        payload: publicKeyBuffer,
    };
};
const ADB_DEFAULT_AUTHENTICATORS = [
    AdbSignatureAuthenticator,
    AdbPublicKeyAuthenticator,
];
class AdbAuthenticationProcessor {
    authenticators;
    #credentialStore;
    #pendingRequest = new PromiseResolver();
    #iterator;
    constructor(authenticators, credentialStore) {
        this.authenticators = authenticators;
        this.#credentialStore = credentialStore;
    }
    #getNextRequest = () => {
        return this.#pendingRequest.promise;
    };
    async *#invokeAuthenticator() {
        for (const authenticator of this.authenticators) {
            for await (const packet of authenticator(this.#credentialStore, this.#getNextRequest)) {
                // If the authenticator yielded a response
                // Prepare `nextRequest` for next authentication request
                this.#pendingRequest = new PromiseResolver();
                // Yield the response to outer layer
                yield packet;
            }
            // If the authenticator returned,
            // Next authenticator will be given the same `pendingRequest`
        }
    }
    async process(packet) {
        if (!this.#iterator) {
            this.#iterator = this.#invokeAuthenticator();
        }
        this.#pendingRequest.resolve(packet);
        const result = await this.#iterator.next();
        if (result.done) {
            throw new Error("No authenticator can handle the request");
        }
        return result.value;
    }
    dispose() {
        void this.#iterator?.return?.();
    }
}

class AdbDaemonSocketController {
    #dispatcher;
    localId;
    remoteId;
    localCreated;
    service;
    #readable;
    #readableController;
    get readable() {
        return this.#readable;
    }
    #writableController;
    writable;
    #closed = false;
    #closedPromise = new PromiseResolver();
    get closed() {
        return this.#closedPromise.promise;
    }
    #socket;
    get socket() {
        return this.#socket;
    }
    #availableWriteBytesChanged;
    /**
     * When delayed ack is disabled, returns `Infinity` if the socket is ready to write
     * (exactly one packet can be written no matter how large it is), or `-1` if the socket
     * is waiting for ack message.
     *
     * When delayed ack is enabled, returns a non-negative finite number indicates the number of
     * bytes that can be written to the socket before waiting for ack message.
     */
    #availableWriteBytes = 0;
    constructor(options) {
        this.#dispatcher = options.dispatcher;
        this.localId = options.localId;
        this.remoteId = options.remoteId;
        this.localCreated = options.localCreated;
        this.service = options.service;
        this.#readable = new PushReadableStream((controller) => {
            this.#readableController = controller;
        });
        this.writable = new MaybeConsumableWritableStream({
            start: (controller) => {
                this.#writableController = controller;
                controller.signal.addEventListener("abort", () => {
                    this.#availableWriteBytesChanged?.reject(controller.signal.reason);
                });
            },
            write: async (data) => {
                const size = data.length;
                const chunkSize = this.#dispatcher.options.maxPayloadSize;
                for (let start = 0, end = chunkSize; start < size; start = end, end += chunkSize) {
                    const chunk = data.subarray(start, end);
                    await this.#writeChunk(chunk);
                }
            },
        });
        this.#socket = new AdbDaemonSocket(this);
        this.#availableWriteBytes = options.availableWriteBytes;
    }
    async #writeChunk(data) {
        const length = data.length;
        while (this.#availableWriteBytes < length) {
            // Only one lock is required because Web Streams API guarantees
            // that `write` is not reentrant.
            const resolver = new PromiseResolver();
            this.#availableWriteBytesChanged = resolver;
            await resolver.promise;
        }
        if (this.#availableWriteBytes === Infinity) {
            this.#availableWriteBytes = -1;
        }
        else {
            this.#availableWriteBytes -= length;
        }
        await this.#dispatcher.sendPacket(AdbCommand.Write, this.localId, this.remoteId, data);
    }
    async enqueue(data) {
        await this.#readableController.enqueue(data);
    }
    ack(bytes) {
        this.#availableWriteBytes += bytes;
        this.#availableWriteBytesChanged?.resolve();
    }
    async close() {
        if (this.#closed) {
            return;
        }
        this.#closed = true;
        this.#availableWriteBytesChanged?.reject(new Error("Socket closed"));
        try {
            this.#writableController.error(new Error("Socket closed"));
        }
        catch {
            // ignore
        }
        await this.#dispatcher.sendPacket(AdbCommand.Close, this.localId, this.remoteId, EmptyUint8Array);
    }
    dispose() {
        this.#readableController.close();
        this.#closedPromise.resolve(undefined);
    }
}
/**
 * A duplex stream representing a socket to ADB daemon.
 */
class AdbDaemonSocket {
    #controller;
    get localId() {
        return this.#controller.localId;
    }
    get remoteId() {
        return this.#controller.remoteId;
    }
    get localCreated() {
        return this.#controller.localCreated;
    }
    get service() {
        return this.#controller.service;
    }
    get readable() {
        return this.#controller.readable;
    }
    get writable() {
        return this.#controller.writable;
    }
    get closed() {
        return this.#controller.closed;
    }
    constructor(controller) {
        this.#controller = controller;
    }
    close() {
        return this.#controller.close();
    }
}

/**
 * The dispatcher is the "dumb" part of the connection handling logic.
 *
 * Except some options to change some minor behaviors,
 * its only job is forwarding packets between authenticated underlying streams
 * and abstracted socket objects.
 *
 * The `Adb` class is responsible for doing the authentication,
 * negotiating the options, and has shortcuts to high-level services.
 */
class AdbPacketDispatcher {
    // ADB socket id starts from 1
    // (0 means open failed)
    #initializers = new AsyncOperationManager(1);
    /**
     * Socket local ID to the socket controller.
     */
    #sockets = new Map();
    #writer;
    options;
    #closed = false;
    #disconnected = new PromiseResolver();
    get disconnected() {
        return this.#disconnected.promise;
    }
    #incomingSocketHandlers = new Map();
    #readAbortController = new AbortController$1();
    constructor(connection, options) {
        this.options = options;
        // Don't allow negative values in dispatcher
        if (this.options.initialDelayedAckBytes < 0) {
            this.options.initialDelayedAckBytes = 0;
        }
        connection.readable
            .pipeTo(new WritableStream$1({
            write: async (packet, controller) => {
                switch (packet.command) {
                    case AdbCommand.Close:
                        await this.#handleClose(packet);
                        break;
                    case AdbCommand.Okay:
                        this.#handleOkay(packet);
                        break;
                    case AdbCommand.Open:
                        await this.#handleOpen(packet);
                        break;
                    case AdbCommand.Write:
                        // Don't await - let each socket handle its own backpressure
                        // without blocking other sockets' packet processing.
                        // Fatal errors are propagated via WritableStream's controller.
                        this.#handleWrite(packet).catch((e) => {
                            controller.error(e);
                        });
                        break;
                    default:
                        // Junk data may only appear in the authentication phase,
                        // since the dispatcher only works after authentication,
                        // all packets should have a valid command.
                        // (although it's possible that Adb added new commands in the future)
                        throw new Error(`Unknown command: ${packet.command.toString(16)}`);
                }
            },
        }), {
            preventCancel: options.preserveConnection ?? false,
            signal: this.#readAbortController.signal,
        })
            .then(() => {
            this.#dispose();
        }, (e) => {
            if (!this.#closed) {
                this.#disconnected.reject(e);
            }
            this.#dispose();
        });
        this.#writer = connection.writable.getWriter();
    }
    async #handleClose(packet) {
        // If the socket is still pending
        if (packet.arg0 === 0 &&
            this.#initializers.reject(packet.arg1, new Error("Socket open failed"))) {
            // Device failed to create the socket
            // (unknown service string, failed to execute command, etc.)
            // it doesn't break the connection,
            // so only reject the socket creation promise,
            // don't throw an error here.
            return;
        }
        // From https://android.googlesource.com/platform/packages/modules/adb/+/65d18e2c1cc48b585811954892311b28a4c3d188/adb.cpp#459
        /* According to protocol.txt, p->msg.arg0 might be 0 to indicate
         * a failed OPEN only. However, due to a bug in previous ADB
         * versions, CLOSE(0, remote-id, "") was also used for normal
         * CLOSE() operations.
         */
        // Ignore `arg0` and search for the socket
        const socket = this.#sockets.get(packet.arg1);
        if (socket) {
            await socket.close();
            socket.dispose();
            this.#sockets.delete(packet.arg1);
            return;
        }
        // TODO: adb: is double closing an socket a catastrophic error?
        // If the client sends two `CLSE` packets for one socket,
        // the device may also respond with two `CLSE` packets.
    }
    #handleOkay(packet) {
        let ackBytes;
        if (this.options.initialDelayedAckBytes !== 0) {
            if (packet.payload.length !== 4) {
                throw new Error("Invalid OKAY packet. Payload size should be 4");
            }
            ackBytes = getUint32LittleEndian(packet.payload, 0);
        }
        else {
            if (packet.payload.length !== 0) {
                throw new Error("Invalid OKAY packet. Payload size should be 0");
            }
            ackBytes = Infinity;
        }
        if (this.#initializers.resolve(packet.arg1, {
            remoteId: packet.arg0,
            availableWriteBytes: ackBytes,
        })) {
            // Device successfully created the socket
            return;
        }
        const socket = this.#sockets.get(packet.arg1);
        if (socket) {
            // When delayed ack is enabled, `ackBytes` is a positive number represents
            // how many bytes the device has received from this socket.
            // When delayed ack is disabled, `ackBytes` is always `Infinity` represents
            // the device has received last `WRTE` packet from the socket.
            socket.ack(ackBytes);
            return;
        }
        // Maybe the device is responding to a packet of last connection
        // Tell the device to close the socket
        void this.sendPacket(AdbCommand.Close, packet.arg1, packet.arg0, EmptyUint8Array);
    }
    #sendOkay(localId, remoteId, ackBytes) {
        let payload;
        if (this.options.initialDelayedAckBytes !== 0) {
            // TODO: try reusing this buffer to reduce memory allocation
            // However, that requires blocking reentrance of `sendOkay`, which might be more expensive
            payload = new Uint8Array(4);
            setUint32LittleEndian(payload, 0, ackBytes);
        }
        else {
            payload = EmptyUint8Array;
        }
        return this.sendPacket(AdbCommand.Okay, localId, remoteId, payload);
    }
    async #handleOpen(packet) {
        // Allocate a local ID for the socket from `#initializers`.
        // `AsyncOperationManager` doesn't directly support returning the next ID,
        // so use `add` + `resolve` to simulate this
        const [localId] = this.#initializers.add();
        this.#initializers.resolve(localId, undefined);
        const remoteId = packet.arg0;
        let availableWriteBytes = packet.arg1;
        let service = decodeUtf8(packet.payload);
        // ADB Daemon still adds a null character to the service string
        if (service.endsWith("\0")) {
            service = service.substring(0, service.length - 1);
        }
        // Check remote delayed ack enablement is consistent with local
        if (this.options.initialDelayedAckBytes === 0) {
            if (availableWriteBytes !== 0) {
                throw new Error("Invalid OPEN packet. arg1 should be 0");
            }
            availableWriteBytes = Infinity;
        }
        else {
            if (availableWriteBytes === 0) {
                throw new Error("Invalid OPEN packet. arg1 should be greater than 0");
            }
        }
        const handler = this.#incomingSocketHandlers.get(service);
        if (!handler) {
            await this.sendPacket(AdbCommand.Close, 0, remoteId, EmptyUint8Array);
            return;
        }
        const controller = new AdbDaemonSocketController({
            dispatcher: this,
            localId,
            remoteId,
            localCreated: false,
            service,
            availableWriteBytes,
        });
        try {
            await handler(controller.socket);
            this.#sockets.set(localId, controller);
            await this.#sendOkay(localId, remoteId, this.options.initialDelayedAckBytes);
        }
        catch {
            await this.sendPacket(AdbCommand.Close, 0, remoteId, EmptyUint8Array);
        }
    }
    async #handleWrite(packet) {
        const socket = this.#sockets.get(packet.arg1);
        if (!socket) {
            throw new Error(`Unknown local socket id: ${packet.arg1}`);
        }
        let handled = false;
        const promises = [
            (async () => {
                await socket.enqueue(packet.payload);
                await this.#sendOkay(packet.arg1, packet.arg0, packet.payload.length);
                handled = true;
            })(),
        ];
        if (this.options.readTimeLimit) {
            promises.push((async () => {
                await delay(this.options.readTimeLimit);
                if (!handled) {
                    throw new Error(`readable of \`${socket.service}\` has stalled for ${this.options.readTimeLimit} milliseconds`);
                }
            })());
        }
        await Promise.race(promises);
    }
    async createSocket(service) {
        if (this.options.appendNullToServiceString) {
            service += "\0";
        }
        const [localId, initializer] = this.#initializers.add();
        await this.sendPacket(AdbCommand.Open, localId, this.options.initialDelayedAckBytes, service);
        // Fulfilled by `handleOkay`
        const { remoteId, availableWriteBytes } = await initializer;
        const controller = new AdbDaemonSocketController({
            dispatcher: this,
            localId,
            remoteId,
            localCreated: true,
            service,
            availableWriteBytes,
        });
        this.#sockets.set(localId, controller);
        return controller.socket;
    }
    addReverseTunnel(service, handler) {
        this.#incomingSocketHandlers.set(service, handler);
    }
    removeReverseTunnel(address) {
        this.#incomingSocketHandlers.delete(address);
    }
    clearReverseTunnels() {
        this.#incomingSocketHandlers.clear();
    }
    async sendPacket(command, arg0, arg1, 
    // PERF: It's slightly faster to not use default parameter values
    payload) {
        if (typeof payload === "string") {
            payload = encodeUtf8(payload);
        }
        if (payload.length > this.options.maxPayloadSize) {
            throw new TypeError("payload too large");
        }
        await Consumable.WritableStream.write(this.#writer, {
            command,
            arg0,
            arg1,
            payload,
            checksum: this.options.calculateChecksum
                ? calculateChecksum(payload)
                : 0,
            magic: command ^ 0xffffffff,
        });
    }
    async close() {
        // Send `CLSE` packets for all sockets
        await Promise.all(Array.from(this.#sockets.values(), (socket) => socket.close()));
        // Stop receiving
        // It's possible that we haven't received all `CLSE` confirm packets,
        // but it doesn't matter, the next connection can cope with them.
        this.#closed = true;
        this.#readAbortController.abort();
        if (this.options.preserveConnection) {
            this.#writer.releaseLock();
        }
        else {
            await this.#writer.close();
        }
        // `pipe().then()` will call `dispose`
    }
    #dispose() {
        for (const socket of this.#sockets.values()) {
            socket.dispose();
        }
        this.#disconnected.resolve();
    }
}

const ADB_DAEMON_VERSION_OMIT_CHECKSUM = 0x01000001;
// https://android.googlesource.com/platform/packages/modules/adb/+/79010dc6d5ca7490c493df800d4421730f5466ca/transport.cpp#1252
// There are some other feature constants, but some of them are only used by ADB server, not devices (daemons).
const ADB_DAEMON_DEFAULT_FEATURES = /* #__PURE__ */ (() => [
    AdbFeature.ShellV2,
    AdbFeature.Cmd,
    AdbFeature.StatV2,
    AdbFeature.ListV2,
    AdbFeature.FixedPushMkdir,
    "apex",
    AdbFeature.Abb,
    // only tells the client the symlink timestamp issue in `adb push --sync` has been fixed.
    // No special handling required.
    "fixed_push_symlink_timestamp",
    AdbFeature.AbbExec,
    "remount_shell",
    "track_app",
    AdbFeature.SendReceiveV2,
    "sendrecv_v2_brotli",
    "sendrecv_v2_lz4",
    "sendrecv_v2_zstd",
    "sendrecv_v2_dry_run_send",
    AdbFeature.DelayedAck,
])();
const ADB_DAEMON_DEFAULT_INITIAL_PAYLOAD_SIZE = 32 * 1024 * 1024;
/**
 * An ADB Transport that connects to ADB Daemons directly.
 */
class AdbDaemonTransport {
    /**
     * Authenticate with the ADB Daemon and create a new transport.
     */
    static async authenticate({ serial, connection, credentialStore, authenticators = ADB_DEFAULT_AUTHENTICATORS, features = ADB_DAEMON_DEFAULT_FEATURES, initialDelayedAckBytes = ADB_DAEMON_DEFAULT_INITIAL_PAYLOAD_SIZE, ...options }) {
        // Initially, set to highest-supported version and payload size.
        let version = 0x01000001;
        // Android 4: 4K, Android 7: 256K, Android 9: 1M
        let maxPayloadSize = 1024 * 1024;
        const resolver = new PromiseResolver();
        const authProcessor = new AdbAuthenticationProcessor(authenticators, credentialStore);
        // Here is similar to `AdbPacketDispatcher`,
        // But the received packet types and send packet processing are different.
        const abortController = new AbortController$1();
        const pipe = connection.readable
            .pipeTo(new WritableStream$1({
            async write(packet) {
                switch (packet.command) {
                    case AdbCommand.Connect:
                        version = Math.min(version, packet.arg0);
                        maxPayloadSize = Math.min(maxPayloadSize, packet.arg1);
                        resolver.resolve(decodeUtf8(packet.payload));
                        break;
                    case AdbCommand.Auth: {
                        const response = await authProcessor.process(packet);
                        await sendPacket(response);
                        break;
                    }
                }
            },
        }), {
            // Don't cancel the source ReadableStream on AbortSignal abort.
            preventCancel: true,
            signal: abortController.signal,
        })
            .then(() => {
            // If `resolver` is already settled, call `reject` won't do anything.
            resolver.reject(new Error("Connection closed unexpectedly"));
        }, (e) => {
            resolver.reject(e);
        });
        const writer = connection.writable.getWriter();
        async function sendPacket(init) {
            // Always send checksum in auth steps
            // Because we don't know if the device needs it or not.
            init.checksum = calculateChecksum(init.payload);
            init.magic = init.command ^ 0xffffffff;
            await Consumable.WritableStream.write(writer, init);
        }
        const actualFeatures = features.slice();
        if (initialDelayedAckBytes <= 0) {
            const index = features.indexOf(AdbFeature.DelayedAck);
            if (index !== -1) {
                actualFeatures.splice(index, 1);
            }
        }
        let banner;
        try {
            await sendPacket({
                command: AdbCommand.Connect,
                arg0: version,
                arg1: maxPayloadSize,
                // The terminating `;` is required in formal definition
                // But ADB daemon (all versions) can still work without it
                payload: encodeUtf8(`host::features=${actualFeatures.join(",")}`),
            });
            banner = await resolver.promise;
        }
        finally {
            // When failed, release locks on `connection` so the caller can try again.
            // When success, also release locks so `AdbPacketDispatcher` can use them.
            abortController.abort();
            writer.releaseLock();
            // Wait until pipe stops (`ReadableStream` lock released)
            await pipe;
        }
        return new AdbDaemonTransport({
            serial,
            connection,
            version,
            maxPayloadSize,
            banner,
            features: actualFeatures,
            initialDelayedAckBytes,
            ...options,
        });
    }
    #connection;
    get connection() {
        return this.#connection;
    }
    #dispatcher;
    #serial;
    get serial() {
        return this.#serial;
    }
    #protocolVersion;
    get protocolVersion() {
        return this.#protocolVersion;
    }
    get maxPayloadSize() {
        return this.#dispatcher.options.maxPayloadSize;
    }
    #banner;
    get banner() {
        return this.#banner;
    }
    get disconnected() {
        return this.#dispatcher.disconnected;
    }
    #clientFeatures;
    get clientFeatures() {
        return this.#clientFeatures;
    }
    constructor({ serial, connection, version, banner, features = ADB_DAEMON_DEFAULT_FEATURES, initialDelayedAckBytes, ...options }) {
        this.#serial = serial;
        this.#connection = connection;
        this.#banner = AdbBanner.parse(banner);
        this.#clientFeatures = features;
        if (features.includes(AdbFeature.DelayedAck)) {
            if (initialDelayedAckBytes <= 0) {
                throw new TypeError("`initialDelayedAckBytes` must be greater than 0 when DelayedAck feature is enabled.");
            }
            if (!this.#banner.features.includes(AdbFeature.DelayedAck)) {
                initialDelayedAckBytes = 0;
            }
        }
        else {
            initialDelayedAckBytes = 0;
        }
        let calculateChecksum;
        let appendNullToServiceString;
        if (version >= ADB_DAEMON_VERSION_OMIT_CHECKSUM) {
            calculateChecksum = false;
            appendNullToServiceString = false;
        }
        else {
            calculateChecksum = true;
            appendNullToServiceString = true;
        }
        this.#dispatcher = new AdbPacketDispatcher(connection, {
            calculateChecksum,
            appendNullToServiceString,
            initialDelayedAckBytes,
            ...options,
        });
        this.#protocolVersion = version;
    }
    connect(service) {
        return this.#dispatcher.createSocket(service);
    }
    addReverseTunnel(handler, address) {
        if (!address) {
            const id = Math.random().toString().substring(2);
            address = `localabstract:reverse_${id}`;
        }
        this.#dispatcher.addReverseTunnel(address, handler);
        return address;
    }
    removeReverseTunnel(address) {
        this.#dispatcher.removeReverseTunnel(address);
    }
    clearReverseTunnels() {
        this.#dispatcher.clearReverseTunnels();
    }
    close() {
        return this.#dispatcher.close();
    }
}

function unorderedRemove(array, index) {
    if (index < 0 || index >= array.length) {
        return;
    }
    array[index] = array[array.length - 1];
    array.length -= 1;
}

// cspell: ignore RSASSA
function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("Tango", 1);
        request.onerror = () => {
            reject(request.error);
        };
        request.onupgradeneeded = () => {
            const db = request.result;
            db.createObjectStore("Authentication", { autoIncrement: true });
        };
        request.onsuccess = () => {
            const db = request.result;
            resolve(db);
        };
    });
}
async function saveKey(key) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction("Authentication", "readwrite");
        const store = transaction.objectStore("Authentication");
        const putRequest = store.add(key);
        putRequest.onerror = () => {
            reject(putRequest.error);
        };
        putRequest.onsuccess = () => {
            resolve();
        };
        transaction.onerror = () => {
            reject(transaction.error);
        };
        transaction.oncomplete = () => {
            db.close();
        };
    });
}
async function getAllKeys() {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction("Authentication", "readonly");
        const store = transaction.objectStore("Authentication");
        const getRequest = store.getAll();
        getRequest.onerror = () => {
            reject(getRequest.error);
        };
        getRequest.onsuccess = () => {
            resolve(getRequest.result);
        };
        transaction.onerror = () => {
            reject(transaction.error);
        };
        transaction.oncomplete = () => {
            db.close();
        };
    });
}
/**
 * An `AdbCredentialStore` implementation that creates RSA private keys using Web Crypto API
 * and stores them in IndexedDB.
 */
class AdbWebCredentialStore {
    #appName;
    constructor(appName = "Tango") {
        this.#appName = appName;
    }
    /**
     * Generates a RSA private key and store it into LocalStorage.
     *
     * Calling this method multiple times will overwrite the previous key.
     *
     * @returns The private key in PKCS #8 format.
     */
    async generateKey() {
        const { privateKey: cryptoKey } = await crypto.subtle.generateKey({
            name: "RSASSA-PKCS1-v1_5",
            modulusLength: 2048,
            // 65537
            publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
            hash: "SHA-1",
        }, true, ["sign", "verify"]);
        const privateKey = new Uint8Array(await crypto.subtle.exportKey("pkcs8", cryptoKey));
        await saveKey(privateKey);
        return {
            buffer: privateKey,
            name: `${this.#appName}@${globalThis.location.hostname}`,
        };
    }
    /**
     * Yields the stored RSA private key.
     *
     * This method returns a generator, so `for await...of...` loop should be used to read the key.
     */
    async *iterateKeys() {
        for (const key of await getAllKeys()) {
            yield {
                buffer: key,
                name: `${this.#appName}@${globalThis.location.hostname}`,
            };
        }
    }
}

class DeviceBusyError extends Error {
    constructor(cause) {
        super("The device is already in used by another program", {
            cause,
        });
    }
}

function isErrorName(e, name) {
    // node-usb package doesn't use `DOMException`,
    // so use a looser check
    // https://github.com/node-usb/node-usb/issues/573
    return (typeof e === "object" && e !== null && "name" in e && e.name === name);
}
function isUsbInterfaceFilter(filter) {
    return (filter.classCode !== undefined &&
        filter.subclassCode !== undefined &&
        filter.protocolCode !== undefined);
}
function matchUsbInterfaceFilter(alternate, filter) {
    return (alternate.interfaceClass === filter.classCode &&
        alternate.interfaceSubclass === filter.subclassCode &&
        alternate.interfaceProtocol === filter.protocolCode);
}
function findUsbInterface(device, filter) {
    for (const configuration of device.configurations) {
        for (const interface_ of configuration.interfaces) {
            for (const alternate of interface_.alternates) {
                if (matchUsbInterfaceFilter(alternate, filter)) {
                    return { configuration, interface_, alternate };
                }
            }
        }
    }
    return undefined;
}
function padNumber(value) {
    return value.toString(16).padStart(4, "0");
}
function getSerialNumber(device) {
    if (device.serialNumber) {
        return device.serialNumber;
    }
    return padNumber(device.vendorId) + "x" + padNumber(device.productId);
}
/**
 * Find the first pair of input and output endpoints from an alternate interface.
 *
 * ADB interface only has two endpoints, one for input and one for output.
 */
function findUsbEndpoints(endpoints) {
    if (endpoints.length === 0) {
        throw new TypeError("No endpoints given");
    }
    let inEndpoint;
    let outEndpoint;
    for (const endpoint of endpoints) {
        switch (endpoint.direction) {
            case "in":
                inEndpoint = endpoint;
                if (outEndpoint) {
                    return { inEndpoint, outEndpoint };
                }
                break;
            case "out":
                outEndpoint = endpoint;
                if (inEndpoint) {
                    return { inEndpoint, outEndpoint };
                }
                break;
        }
    }
    if (!inEndpoint) {
        throw new TypeError("No input endpoint found.");
    }
    if (!outEndpoint) {
        throw new TypeError("No output endpoint found.");
    }
    throw new Error("unreachable");
}
function matchFilter(device, filter) {
    if (filter.vendorId !== undefined && device.vendorId !== filter.vendorId) {
        return false;
    }
    if (filter.productId !== undefined &&
        device.productId !== filter.productId) {
        return false;
    }
    if (filter.serialNumber !== undefined &&
        getSerialNumber(device) !== filter.serialNumber) {
        return false;
    }
    if (isUsbInterfaceFilter(filter)) {
        return findUsbInterface(device, filter) || false;
    }
    return true;
}
function matchFilters(device, filters, exclusionFilters) {
    if (exclusionFilters && exclusionFilters.length > 0) {
        if (matchFilters(device, exclusionFilters)) {
            return false;
        }
    }
    for (const filter of filters) {
        const result = matchFilter(device, filter);
        if (result) {
            return result;
        }
    }
    return false;
}

/**
 * The default filter for ADB devices, as defined by Google.
 */
const AdbDefaultInterfaceFilter = {
    classCode: 0xff,
    subclassCode: 0x42,
    protocolCode: 1,
};
function mergeDefaultAdbInterfaceFilter(filters) {
    if (!filters || filters.length === 0) {
        return [AdbDefaultInterfaceFilter];
    }
    else {
        return filters.map((filter) => ({
            ...filter,
            classCode: filter.classCode ?? AdbDefaultInterfaceFilter.classCode,
            subclassCode: filter.subclassCode ?? AdbDefaultInterfaceFilter.subclassCode,
            protocolCode: filter.protocolCode ?? AdbDefaultInterfaceFilter.protocolCode,
        }));
    }
}
class AdbDaemonWebUsbConnection {
    #device;
    get device() {
        return this.#device;
    }
    #inEndpoint;
    get inEndpoint() {
        return this.#inEndpoint;
    }
    #outEndpoint;
    get outEndpoint() {
        return this.#outEndpoint;
    }
    #readable;
    get readable() {
        return this.#readable;
    }
    #writable;
    get writable() {
        return this.#writable;
    }
    constructor(device, inEndpoint, outEndpoint, usbManager) {
        this.#device = device;
        this.#inEndpoint = inEndpoint;
        this.#outEndpoint = outEndpoint;
        let closed = false;
        const duplex = new DuplexStreamFactory({
            close: async () => {
                try {
                    closed = true;
                    await device.raw.close();
                }
                catch {
                    /* device may have already disconnected */
                }
            },
            dispose: () => {
                closed = true;
                usbManager.removeEventListener("disconnect", handleUsbDisconnect);
            },
        });
        function handleUsbDisconnect(e) {
            if (e.device === device.raw) {
                duplex.dispose().catch(unreachable);
            }
        }
        usbManager.addEventListener("disconnect", handleUsbDisconnect);
        this.#readable = duplex.wrapReadable(new ReadableStream$1({
            pull: async (controller) => {
                const packet = await this.#transferIn();
                if (packet) {
                    controller.enqueue(packet);
                }
                else {
                    controller.close();
                }
            },
        }, { highWaterMark: 0 }));
        const zeroMask = outEndpoint.packetSize - 1;
        this.#writable = pipeFrom(duplex.createWritable(new MaybeConsumableWritableStream({
            write: async (chunk) => {
                try {
                    await device.raw.transferOut(outEndpoint.endpointNumber, toLocalUint8Array(chunk));
                    // In USB protocol, a not-full packet indicates the end of a transfer.
                    // If the payload size is a multiple of the packet size,
                    // we need to send an empty packet to indicate the end,
                    // so the OS will send it to the device immediately.
                    if (zeroMask && (chunk.length & zeroMask) === 0) {
                        await device.raw.transferOut(outEndpoint.endpointNumber, EmptyUint8Array);
                    }
                }
                catch (e) {
                    if (closed) {
                        return;
                    }
                    throw e;
                }
            },
        })), new AdbPacketSerializeStream());
    }
    async #transferIn() {
        try {
            while (true) {
                // ADB daemon sends each packet in two parts, the 24-byte header and the payload.
                const result = await this.#device.raw.transferIn(this.#inEndpoint.endpointNumber, this.#inEndpoint.packetSize);
                if (result.data.byteLength !== 24) {
                    continue;
                }
                // Per spec, the `result.data` always covers the whole `buffer`.
                const buffer = new Uint8Array(result.data.buffer);
                const stream = new Uint8ArrayExactReadable(buffer);
                // Add `payload` field to its type, it's assigned below.
                const packet = AdbPacketHeader.deserialize(stream);
                if (packet.magic !== (packet.command ^ 0xffffffff)) {
                    continue;
                }
                if (packet.payloadLength !== 0) {
                    const result = await this.#device.raw.transferIn(this.#inEndpoint.endpointNumber, packet.payloadLength);
                    packet.payload = new Uint8Array(result.data.buffer);
                }
                else {
                    packet.payload = EmptyUint8Array;
                }
                return packet;
            }
        }
        catch (e) {
            // On Windows, disconnecting the device will cause `NetworkError` to be thrown,
            // even before the `disconnect` event is fired.
            // Wait a little while and check if the device is still connected.
            // https://github.com/WICG/webusb/issues/219
            if (isErrorName(e, "NetworkError")) {
                await new Promise((resolve) => {
                    setTimeout(() => {
                        resolve();
                    }, 100);
                });
                if (closed) {
                    return undefined;
                }
            }
            throw e;
        }
    }
}
class AdbDaemonWebUsbDevice {
    static DeviceBusyError = DeviceBusyError;
    #interface;
    #usbManager;
    #raw;
    get raw() {
        return this.#raw;
    }
    #serial;
    get serial() {
        return this.#serial;
    }
    get name() {
        return this.#raw.productName;
    }
    /**
     * Create a new instance of `AdbDaemonWebUsbConnection` using a specified `USBDevice` instance
     *
     * @param device The `USBDevice` instance obtained elsewhere.
     * @param filters The filters to use when searching for ADB interface. Defaults to {@link ADB_DEFAULT_DEVICE_FILTER}.
     */
    constructor(device, interface_, usbManager) {
        this.#raw = device;
        this.#serial = getSerialNumber(device);
        this.#interface = interface_;
        this.#usbManager = usbManager;
    }
    async #claimInterface() {
        if (!this.#raw.opened) {
            await this.#raw.open();
        }
        const { configuration, interface_, alternate } = this.#interface;
        if (this.#raw.configuration?.configurationValue !==
            configuration.configurationValue) {
            // Note: Switching configuration is not supported on Windows,
            // but Android devices should always expose ADB function at the first (default) configuration.
            await this.#raw.selectConfiguration(configuration.configurationValue);
        }
        if (!interface_.claimed) {
            try {
                await this.#raw.claimInterface(interface_.interfaceNumber);
            }
            catch (e) {
                if (isErrorName(e, "NetworkError")) {
                    throw new AdbDaemonWebUsbDevice.DeviceBusyError(e);
                }
                throw e;
            }
        }
        if (interface_.alternate.alternateSetting !== alternate.alternateSetting) {
            await this.#raw.selectAlternateInterface(interface_.interfaceNumber, alternate.alternateSetting);
        }
        return findUsbEndpoints(alternate.endpoints);
    }
    /**
     * Open the device and create a new connection to the ADB Daemon.
     */
    async connect() {
        const { inEndpoint, outEndpoint } = await this.#claimInterface();
        return new AdbDaemonWebUsbConnection(this, inEndpoint, outEndpoint, this.#usbManager);
    }
}

/**
 * A watcher that listens for new WebUSB devices and notifies the callback when
 * a new device is connected or disconnected.
 */
class AdbDaemonWebUsbDeviceObserver {
    static async create(usb, options = {}) {
        const devices = await usb.getDevices();
        return new AdbDaemonWebUsbDeviceObserver(usb, devices, options);
    }
    #filters;
    #exclusionFilters;
    #usbManager;
    #onDeviceAdd = new EventEmitter();
    onDeviceAdd = this.#onDeviceAdd.event;
    #onDeviceRemove = new EventEmitter();
    onDeviceRemove = this.#onDeviceRemove.event;
    #onListChange = new StickyEventEmitter();
    onListChange = this.#onListChange.event;
    current = [];
    constructor(usb, initial, options = {}) {
        this.#filters = mergeDefaultAdbInterfaceFilter(options.filters);
        this.#exclusionFilters = options.exclusionFilters;
        this.#usbManager = usb;
        this.current = initial
            .map((device) => this.#convertDevice(device))
            .filter((device) => !!device);
        // Fire `onListChange` to set the sticky value
        this.#onListChange.fire(this.current);
        this.#usbManager.addEventListener("connect", this.#handleConnect);
        this.#usbManager.addEventListener("disconnect", this.#handleDisconnect);
    }
    #convertDevice(device) {
        const interface_ = matchFilters(device, this.#filters, this.#exclusionFilters);
        if (!interface_) {
            return undefined;
        }
        return new AdbDaemonWebUsbDevice(device, interface_, this.#usbManager);
    }
    #handleConnect = (e) => {
        const device = this.#convertDevice(e.device);
        if (!device) {
            return;
        }
        // We send a `connect` event on `requestDevice` success,
        // but this device might already exist if we already have the permission for it.
        if (this.current.some((item) => item.raw === device.raw)) {
            return;
        }
        const next = this.current.slice();
        next.push(device);
        this.current = next;
        this.#onDeviceAdd.fire([device]);
        this.#onListChange.fire(this.current);
    };
    #handleDisconnect = (e) => {
        const index = this.current.findIndex((device) => device.raw === e.device);
        if (index !== -1) {
            const device = this.current[index];
            const next = this.current.slice();
            unorderedRemove(next, index);
            this.current = next;
            this.#onDeviceRemove.fire([device]);
            this.#onListChange.fire(this.current);
        }
    };
    stop() {
        this.#usbManager.removeEventListener("connect", this.#handleConnect);
        this.#usbManager.removeEventListener("disconnect", this.#handleDisconnect);
        this.#onDeviceAdd.dispose();
        this.#onDeviceRemove.dispose();
        this.#onListChange.dispose();
    }
}

class AdbDaemonWebUsbDeviceManager {
    /**
     * Gets the instance of {@link AdbDaemonWebUsbDeviceManager} using browser WebUSB implementation.
     *
     * May be `undefined` if current runtime does not support WebUSB.
     */
    static BROWSER = /* #__PURE__ */ (() => typeof globalThis.navigator !== "undefined" && globalThis.navigator.usb
        ? new AdbDaemonWebUsbDeviceManager(globalThis.navigator.usb)
        : undefined)();
    #usbManager;
    /**
     * Create a new instance of {@link AdbDaemonWebUsbDeviceManager} using the specified WebUSB implementation.
     * @param usbManager A WebUSB compatible interface.
     */
    constructor(usbManager) {
        this.#usbManager = usbManager;
    }
    /**
     * Call `USB#requestDevice()` to prompt the user to select a device.
     */
    async requestDevice(options = {}) {
        const filters = mergeDefaultAdbInterfaceFilter(options.filters);
        try {
            const device = await this.#usbManager.requestDevice({
                filters,
                exclusionFilters: options.exclusionFilters,
            });
            const interface_ = matchFilters(device, filters, options.exclusionFilters);
            if (!interface_) {
                // `#usbManager` doesn't support `exclusionFilters`,
                // selected device is invalid
                return undefined;
            }
            // If this `requestDevice` adds a new device,
            // Chrome won't fire a `connect` event for it.
            // This will cause device observer to lose track of it,
            // and when the device disconnects, device observer won't fire the disconnect event for it.
            this.#usbManager.dispatchEvent(new USBConnectionEvent("connect", { device }));
            return new AdbDaemonWebUsbDevice(device, interface_, this.#usbManager);
        }
        catch (e) {
            // No device selected
            if (isErrorName(e, "NotFoundError")) {
                return undefined;
            }
            throw e;
        }
    }
    /**
     * Get all connected and requested devices that match the specified filters.
     */
    async getDevices(options = {}) {
        const filters = mergeDefaultAdbInterfaceFilter(options.filters);
        const devices = await this.#usbManager.getDevices();
        // filter map
        const result = [];
        for (const device of devices) {
            const interface_ = matchFilters(device, filters, options.exclusionFilters);
            if (interface_) {
                result.push(new AdbDaemonWebUsbDevice(device, interface_, this.#usbManager));
            }
        }
        return result;
    }
    trackDevices(options = {}) {
        return AdbDaemonWebUsbDeviceObserver.create(this.#usbManager, options);
    }
}

const ZIP_ENTRY_HEADER_BEGIN_LENGTH = 30; // bytes
var DebugLevel;
(function (DebugLevel) {
    DebugLevel[DebugLevel["Silent"] = 0] = "Silent";
    DebugLevel[DebugLevel["Debug"] = 1] = "Debug";
    DebugLevel[DebugLevel["Verbose"] = 2] = "Verbose";
})(DebugLevel || (DebugLevel = {}));
let debugLevel = DebugLevel.Silent;
function logDebug(...data) {
    if (debugLevel >= 1) {
        console.log(...data);
    }
}
function logVerbose(...data) {
    if (debugLevel >= 2) {
        console.log(...data);
    }
}
/**
 * Reads all of the data in the given blob and returns it as an ArrayBuffer.
 *
 * @param {Blob} blob - Blob with the data to read.
 * @returns {Promise<ArrayBuffer>} ArrayBuffer containing data from the blob.
 * @ignore
 */
function readBlobAsBuffer(blob) {
    return new Promise((resolve, reject) => {
        let reader = new FileReader();
        reader.onload = () => {
            resolve(reader.result);
        };
        reader.onerror = () => {
            reject(reader.error);
        };
        reader.readAsArrayBuffer(blob);
    });
}
function waitForFrame() {
    return new Promise((resolve, _reject) => {
        window.requestAnimationFrame(resolve);
    });
}
async function runWithTimedProgress(onProgress, action, item, duration, workPromise) {
    let startTime = new Date().getTime();
    let stop = false;
    onProgress(action, item, 0.0);
    let progressPromise = (async () => {
        let now;
        let targetTime = startTime + duration;
        do {
            now = new Date().getTime();
            onProgress(action, item, (now - startTime) / duration);
            await waitForFrame();
        } while (!stop && now < targetTime);
    })();
    await Promise.race([progressPromise, workPromise]);
    stop = true;
    await progressPromise;
    await workPromise;
    onProgress(action, item, 1.0);
}
/** Exception class for operations that exceeded their timeout duration. */
class TimeoutError extends Error {
    constructor(timeout) {
        super(`Timeout of ${timeout} ms exceeded`);
        this.name = "TimeoutError";
        this.timeout = timeout;
    }
}
function runWithTimeout(promise, timeout) {
    return new Promise((resolve, reject) => {
        // Set up timeout
        let timedOut = false;
        let tid = setTimeout(() => {
            // Set sentinel first to prevent race in promise resolving
            timedOut = true;
            reject(new TimeoutError(timeout));
        }, timeout);
        // Passthrough
        promise
            .then((val) => {
            if (!timedOut) {
                resolve(val);
            }
        })
            .catch((err) => {
            if (!timedOut) {
                reject(err);
            }
        })
            .finally(() => {
            if (!timedOut) {
                clearTimeout(tid);
            }
        });
    });
}
async function getEntryMetadata(blob, entry) {
    const offset = entry.offset;
    const headerBeginRaw = await blob.slice(offset, offset + ZIP_ENTRY_HEADER_BEGIN_LENGTH).arrayBuffer();
    const dataView = new DataView(headerBeginRaw);
    const compressionMethod = dataView.getUint16(8, true);
    const compressedSize = dataView.getUint32(18, true);
    const uncompressedSize = dataView.getUint32(22, true);
    const fileNameLength = dataView.getUint16(26, true);
    const extraFieldLength = dataView.getUint16(28, true);
    const headerSize = ZIP_ENTRY_HEADER_BEGIN_LENGTH + fileNameLength + extraFieldLength;
    return {
        offset,
        compressionMethod,
        compressedSize,
        uncompressedSize,
        headerSize,
    };
}
// Wrapper for Entry#getData() that unwraps ProgressEvent errors
async function zipGetData(entry, writer, options) {
    try {
        return await entry.getData(writer, options);
    }
    catch (e) {
        if (e instanceof ProgressEvent &&
            e.type === "error" &&
            e.target !== null) {
            throw e.target.error;
        }
        else {
            throw e;
        }
    }
}

const FILE_MAGIC = 0xed26ff3a;
const MAJOR_VERSION = 1;
const MINOR_VERSION = 0;
const FILE_HEADER_SIZE = 28;
const CHUNK_HEADER_SIZE = 12;
// AOSP libsparse uses 64 MiB chunks
const RAW_CHUNK_SIZE = 64 * 1024 * 1024;
class ImageError extends Error {
    constructor(message) {
        super(message);
        this.name = "ImageError";
    }
}
var ChunkType;
(function (ChunkType) {
    ChunkType[ChunkType["Raw"] = 51905] = "Raw";
    ChunkType[ChunkType["Fill"] = 51906] = "Fill";
    ChunkType[ChunkType["Skip"] = 51907] = "Skip";
    ChunkType[ChunkType["Crc32"] = 51908] = "Crc32";
})(ChunkType || (ChunkType = {}));
class BlobBuilder {
    constructor(type = "") {
        this.type = type;
        this.blob = new Blob([], { type: this.type });
    }
    append(blob) {
        this.blob = new Blob([this.blob, blob], { type: this.type });
    }
    getBlob() {
        return this.blob;
    }
}
/**
 * Returns a parsed version of the sparse image file header from the given buffer.
 *
 * @param {ArrayBuffer} buffer - Raw file header data.
 * @returns {SparseHeader} Object containing the header information.
 */
function parseFileHeader(buffer) {
    let view = new DataView(buffer);
    let magic = view.getUint32(0, true);
    if (magic !== FILE_MAGIC) {
        return null;
    }
    // v1.0+
    let major = view.getUint16(4, true);
    let minor = view.getUint16(6, true);
    if (major !== MAJOR_VERSION || minor < MINOR_VERSION) {
        throw new ImageError(`Unsupported sparse image version ${major}.${minor}`);
    }
    let fileHdrSize = view.getUint16(8, true);
    let chunkHdrSize = view.getUint16(10, true);
    if (fileHdrSize !== FILE_HEADER_SIZE ||
        chunkHdrSize !== CHUNK_HEADER_SIZE) {
        throw new ImageError(`Invalid file header size ${fileHdrSize}, chunk header size ${chunkHdrSize}`);
    }
    let blockSize = view.getUint32(12, true);
    if (blockSize % 4 !== 0) {
        throw new ImageError(`Block size ${blockSize} is not a multiple of 4`);
    }
    return {
        blockSize: blockSize,
        blocks: view.getUint32(16, true),
        chunks: view.getUint32(20, true),
        crc32: view.getUint32(24, true),
    };
}
function parseChunkHeader(buffer) {
    let view = new DataView(buffer);
    // This isn't the same as what createImage takes.
    // Further processing needs to be done on the chunks.
    return {
        type: view.getUint16(0, true),
        /* 2: reserved, 16 bits */
        blocks: view.getUint32(4, true),
        dataBytes: view.getUint32(8, true) - CHUNK_HEADER_SIZE,
        data: null, // to be populated by consumer
    };
}
function calcChunksBlockSize(chunks) {
    return chunks
        .map((chunk) => chunk.blocks)
        .reduce((total, c) => total + c, 0);
}
function calcChunksDataSize(chunks) {
    return chunks
        .map((chunk) => chunk.data.size)
        .reduce((total, c) => total + c, 0);
}
function calcChunksSize(chunks) {
    // 28-byte file header, 12-byte chunk headers
    let overhead = FILE_HEADER_SIZE + CHUNK_HEADER_SIZE * chunks.length;
    return overhead + calcChunksDataSize(chunks);
}
async function createImage(header, chunks) {
    let blobBuilder = new BlobBuilder();
    let buffer = new ArrayBuffer(FILE_HEADER_SIZE);
    let dataView = new DataView(buffer);
    let arrayView = new Uint8Array(buffer);
    dataView.setUint32(0, FILE_MAGIC, true);
    // v1.0
    dataView.setUint16(4, MAJOR_VERSION, true);
    dataView.setUint16(6, MINOR_VERSION, true);
    dataView.setUint16(8, FILE_HEADER_SIZE, true);
    dataView.setUint16(10, CHUNK_HEADER_SIZE, true);
    // Match input parameters
    dataView.setUint32(12, header.blockSize, true);
    dataView.setUint32(16, header.blocks, true);
    dataView.setUint32(20, chunks.length, true);
    // We don't care about the CRC. AOSP docs specify that this should be a CRC32,
    // but AOSP libsparse always sets 0 and puts the CRC in a final undocumented
    // 0xCAC4 chunk instead.
    dataView.setUint32(24, 0, true);
    blobBuilder.append(new Blob([buffer]));
    for (let chunk of chunks) {
        buffer = new ArrayBuffer(CHUNK_HEADER_SIZE + chunk.data.size);
        dataView = new DataView(buffer);
        arrayView = new Uint8Array(buffer);
        dataView.setUint16(0, chunk.type, true);
        dataView.setUint16(2, 0, true); // reserved
        dataView.setUint32(4, chunk.blocks, true);
        dataView.setUint32(8, CHUNK_HEADER_SIZE + chunk.data.size, true);
        let chunkArrayView = new Uint8Array(await readBlobAsBuffer(chunk.data));
        arrayView.set(chunkArrayView, CHUNK_HEADER_SIZE);
        blobBuilder.append(new Blob([buffer]));
    }
    return blobBuilder.getBlob();
}
/**
 * Creates a sparse image from buffer containing raw image data.
 *
 * @param {Blob} blob - Blob containing the raw image data.
 * @returns {Promise<Blob>} Promise that resolves the blob containing the new sparse image.
 */
async function fromRaw(blob) {
    let header = {
        blockSize: 4096,
        blocks: blob.size / 4096};
    let chunks = [];
    while (blob.size > 0) {
        let chunkSize = Math.min(blob.size, RAW_CHUNK_SIZE);
        chunks.push({
            type: ChunkType.Raw,
            blocks: chunkSize / header.blockSize,
            data: blob.slice(0, chunkSize),
        });
        blob = blob.slice(chunkSize);
    }
    return createImage(header, chunks);
}
/**
 * Split a sparse image into smaller sparse images within the given size.
 * This takes a Blob instead of an ArrayBuffer because it may process images
 * larger than RAM.
 *
 * @param {Blob} blob - Blob containing the sparse image to split.
 * @param {number} splitSize - Maximum size per split.
 * @yields {Object} Data of the next split image and its output size in bytes.
 */
async function* splitBlob(blob, splitSize) {
    logDebug(`Splitting ${blob.size}-byte sparse image into ${splitSize}-byte chunks`);
    // Short-circuit if splitting isn't required
    if (blob.size <= splitSize) {
        logDebug("Blob fits in 1 payload, not splitting");
        yield {
            data: await readBlobAsBuffer(blob),
            bytes: blob.size,
        };
        return;
    }
    let headerData = await readBlobAsBuffer(blob.slice(0, FILE_HEADER_SIZE));
    let header = parseFileHeader(headerData);
    if (header === null) {
        throw new ImageError("Blob is not a sparse image");
    }
    // Remove CRC32 (if present), otherwise splitting will invalidate it
    header.crc32 = 0;
    blob = blob.slice(FILE_HEADER_SIZE);
    let splitChunks = [];
    let splitDataBytes = 0;
    for (let i = 0; i < header.chunks; i++) {
        let chunkHeaderData = await readBlobAsBuffer(blob.slice(0, CHUNK_HEADER_SIZE));
        let chunk = parseChunkHeader(chunkHeaderData);
        chunk.data = blob.slice(CHUNK_HEADER_SIZE, CHUNK_HEADER_SIZE + chunk.dataBytes);
        blob = blob.slice(CHUNK_HEADER_SIZE + chunk.dataBytes);
        let bytesRemaining = splitSize - calcChunksSize(splitChunks);
        logVerbose(`  Chunk ${i}: type ${chunk.type}, ${chunk.dataBytes} bytes / ${chunk.blocks} blocks, ${bytesRemaining} bytes remaining`);
        if (bytesRemaining >= chunk.dataBytes) {
            // Read the chunk and add it
            logVerbose("    Space is available, adding chunk");
            splitChunks.push(chunk);
            // Track amount of data written on the output device, in bytes
            splitDataBytes += chunk.blocks * header.blockSize;
        }
        else {
            // Out of space, finish this split
            // Blocks need to be calculated from chunk headers instead of going by size
            // because FILL and SKIP chunks cover more blocks than the data they contain.
            let splitBlocks = calcChunksBlockSize(splitChunks);
            splitChunks.push({
                type: ChunkType.Skip,
                blocks: header.blocks - splitBlocks,
                data: new Blob([]),
                dataBytes: 0,
            });
            logVerbose(`Partition is ${header.blocks} blocks, used ${splitBlocks}, padded with ${header.blocks - splitBlocks}, finishing split with ${calcChunksBlockSize(splitChunks)} blocks`);
            let splitImage = await createImage(header, splitChunks);
            logDebug(`Finished ${splitImage.size}-byte split with ${splitChunks.length} chunks`);
            yield {
                data: await readBlobAsBuffer(splitImage),
                bytes: splitDataBytes,
            };
            // Start a new split. Every split is considered a full image by the
            // bootloader, so we need to skip the *total* written blocks.
            logVerbose(`Starting new split: skipping first ${splitBlocks} blocks and adding chunk`);
            splitChunks = [
                {
                    type: ChunkType.Skip,
                    blocks: splitBlocks,
                    data: new Blob([]),
                    dataBytes: 0,
                },
                chunk,
            ];
            splitDataBytes = 0;
        }
    }
    // Finish the final split if necessary
    if (splitChunks.length > 0 &&
        (splitChunks.length > 1 || splitChunks[0].type !== ChunkType.Skip)) {
        let splitImage = await createImage(header, splitChunks);
        logDebug(`Finishing final ${splitImage.size}-byte split with ${splitChunks.length} chunks`);
        yield {
            data: await readBlobAsBuffer(splitImage),
            bytes: splitDataBytes,
        };
    }
}

/*
 Copyright (c) 2022 Gildas Lormeau. All rights reserved.

 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions are met:

 1. Redistributions of source code must retain the above copyright notice,
 this list of conditions and the following disclaimer.

 2. Redistributions in binary form must reproduce the above copyright 
 notice, this list of conditions and the following disclaimer in 
 the documentation and/or other materials provided with the distribution.

 3. The names of the authors may not be used to endorse or promote products
 derived from this software without specific prior written permission.

 THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESSED OR IMPLIED WARRANTIES,
 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JCRAFT,
 INC. OR ANY CONTRIBUTORS TO THIS SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT,
 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
 OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/*
 * This program is based on JZlib 1.0.2 ymnk, JCraft,Inc.
 * JZlib is based on zlib-1.1.3, so all credit should go authors
 * Jean-loup Gailly(jloup@gzip.org) and Mark Adler(madler@alumni.caltech.edu)
 * and contributors of zlib.
 */

// deno-lint-ignore-file no-this-alias prefer-const

// Global

const MAX_BITS$1 = 15;
const D_CODES = 30;
const BL_CODES = 19;

const LENGTH_CODES = 29;
const LITERALS = 256;
const L_CODES = (LITERALS + 1 + LENGTH_CODES);
const HEAP_SIZE = (2 * L_CODES + 1);

const END_BLOCK = 256;

// Bit length codes must not exceed MAX_BL_BITS bits
const MAX_BL_BITS = 7;

// repeat previous bit length 3-6 times (2 bits of repeat count)
const REP_3_6 = 16;

// repeat a zero length 3-10 times (3 bits of repeat count)
const REPZ_3_10 = 17;

// repeat a zero length 11-138 times (7 bits of repeat count)
const REPZ_11_138 = 18;

// The lengths of the bit length codes are sent in order of decreasing
// probability, to avoid transmitting the lengths for unused bit
// length codes.

const Buf_size = 8 * 2;

// JZlib version : "1.0.2"
const Z_DEFAULT_COMPRESSION = -1;

// compression strategy
const Z_FILTERED = 1;
const Z_HUFFMAN_ONLY = 2;
const Z_DEFAULT_STRATEGY = 0;

const Z_NO_FLUSH$1 = 0;
const Z_PARTIAL_FLUSH = 1;
const Z_FULL_FLUSH = 3;
const Z_FINISH$1 = 4;

const Z_OK$1 = 0;
const Z_STREAM_END$1 = 1;
const Z_NEED_DICT$1 = 2;
const Z_STREAM_ERROR$1 = -2;
const Z_DATA_ERROR$1 = -3;
const Z_BUF_ERROR$1 = -5;

// Tree

function extractArray(array) {
	return flatArray(array.map(([length, value]) => (new Array(length)).fill(value, 0, length)));
}

function flatArray(array) {
	return array.reduce((a, b) => a.concat(Array.isArray(b) ? flatArray(b) : b), []);
}

// see definition of array dist_code below
const _dist_code = [0, 1, 2, 3].concat(...extractArray([
	[2, 4], [2, 5], [4, 6], [4, 7], [8, 8], [8, 9], [16, 10], [16, 11], [32, 12], [32, 13], [64, 14], [64, 15], [2, 0], [1, 16],
	[1, 17], [2, 18], [2, 19], [4, 20], [4, 21], [8, 22], [8, 23], [16, 24], [16, 25], [32, 26], [32, 27], [64, 28], [64, 29]
]));

function Tree() {
	const that = this;

	// dyn_tree; // the dynamic tree
	// max_code; // largest code with non zero frequency
	// stat_desc; // the corresponding static tree

	// Compute the optimal bit lengths for a tree and update the total bit
	// length
	// for the current block.
	// IN assertion: the fields freq and dad are set, heap[heap_max] and
	// above are the tree nodes sorted by increasing frequency.
	// OUT assertions: the field len is set to the optimal bit length, the
	// array bl_count contains the frequencies for each bit length.
	// The length opt_len is updated; static_len is also updated if stree is
	// not null.
	function gen_bitlen(s) {
		const tree = that.dyn_tree;
		const stree = that.stat_desc.static_tree;
		const extra = that.stat_desc.extra_bits;
		const base = that.stat_desc.extra_base;
		const max_length = that.stat_desc.max_length;
		let h; // heap index
		let n, m; // iterate over the tree elements
		let bits; // bit length
		let xbits; // extra bits
		let f; // frequency
		let overflow = 0; // number of elements with bit length too large

		for (bits = 0; bits <= MAX_BITS$1; bits++)
			s.bl_count[bits] = 0;

		// In a first pass, compute the optimal bit lengths (which may
		// overflow in the case of the bit length tree).
		tree[s.heap[s.heap_max] * 2 + 1] = 0; // root of the heap

		for (h = s.heap_max + 1; h < HEAP_SIZE; h++) {
			n = s.heap[h];
			bits = tree[tree[n * 2 + 1] * 2 + 1] + 1;
			if (bits > max_length) {
				bits = max_length;
				overflow++;
			}
			tree[n * 2 + 1] = bits;
			// We overwrite tree[n*2+1] which is no longer needed

			if (n > that.max_code)
				continue; // not a leaf node

			s.bl_count[bits]++;
			xbits = 0;
			if (n >= base)
				xbits = extra[n - base];
			f = tree[n * 2];
			s.opt_len += f * (bits + xbits);
			if (stree)
				s.static_len += f * (stree[n * 2 + 1] + xbits);
		}
		if (overflow === 0)
			return;

		// This happens for example on obj2 and pic of the Calgary corpus
		// Find the first bit length which could increase:
		do {
			bits = max_length - 1;
			while (s.bl_count[bits] === 0)
				bits--;
			s.bl_count[bits]--; // move one leaf down the tree
			s.bl_count[bits + 1] += 2; // move one overflow item as its brother
			s.bl_count[max_length]--;
			// The brother of the overflow item also moves one step up,
			// but this does not affect bl_count[max_length]
			overflow -= 2;
		} while (overflow > 0);

		for (bits = max_length; bits !== 0; bits--) {
			n = s.bl_count[bits];
			while (n !== 0) {
				m = s.heap[--h];
				if (m > that.max_code)
					continue;
				if (tree[m * 2 + 1] != bits) {
					s.opt_len += (bits - tree[m * 2 + 1]) * tree[m * 2];
					tree[m * 2 + 1] = bits;
				}
				n--;
			}
		}
	}

	// Reverse the first len bits of a code, using straightforward code (a
	// faster
	// method would use a table)
	// IN assertion: 1 <= len <= 15
	function bi_reverse(code, // the value to invert
		len // its bit length
	) {
		let res = 0;
		do {
			res |= code & 1;
			code >>>= 1;
			res <<= 1;
		} while (--len > 0);
		return res >>> 1;
	}

	// Generate the codes for a given tree and bit counts (which need not be
	// optimal).
	// IN assertion: the array bl_count contains the bit length statistics for
	// the given tree and the field len is set for all tree elements.
	// OUT assertion: the field code is set for all tree elements of non
	// zero code length.
	function gen_codes(tree, // the tree to decorate
		max_code, // largest code with non zero frequency
		bl_count // number of codes at each bit length
	) {
		const next_code = []; // next code value for each
		// bit length
		let code = 0; // running code value
		let bits; // bit index
		let n; // code index
		let len;

		// The distribution counts are first used to generate the code values
		// without bit reversal.
		for (bits = 1; bits <= MAX_BITS$1; bits++) {
			next_code[bits] = code = ((code + bl_count[bits - 1]) << 1);
		}

		// Check that the bit counts in bl_count are consistent. The last code
		// must be all ones.
		// Assert (code + bl_count[MAX_BITS]-1 == (1<<MAX_BITS)-1,
		// "inconsistent bit counts");
		// Tracev((stderr,"gen_codes: max_code %d ", max_code));

		for (n = 0; n <= max_code; n++) {
			len = tree[n * 2 + 1];
			if (len === 0)
				continue;
			// Now reverse the bits
			tree[n * 2] = bi_reverse(next_code[len]++, len);
		}
	}

	// Construct one Huffman tree and assigns the code bit strings and lengths.
	// Update the total bit length for the current block.
	// IN assertion: the field freq is set for all tree elements.
	// OUT assertions: the fields len and code are set to the optimal bit length
	// and corresponding code. The length opt_len is updated; static_len is
	// also updated if stree is not null. The field max_code is set.
	that.build_tree = function (s) {
		const tree = that.dyn_tree;
		const stree = that.stat_desc.static_tree;
		const elems = that.stat_desc.elems;
		let n, m; // iterate over heap elements
		let max_code = -1; // largest code with non zero frequency
		let node; // new node being created

		// Construct the initial heap, with least frequent element in
		// heap[1]. The sons of heap[n] are heap[2*n] and heap[2*n+1].
		// heap[0] is not used.
		s.heap_len = 0;
		s.heap_max = HEAP_SIZE;

		for (n = 0; n < elems; n++) {
			if (tree[n * 2] !== 0) {
				s.heap[++s.heap_len] = max_code = n;
				s.depth[n] = 0;
			} else {
				tree[n * 2 + 1] = 0;
			}
		}

		// The pkzip format requires that at least one distance code exists,
		// and that at least one bit should be sent even if there is only one
		// possible code. So to avoid special checks later on we force at least
		// two codes of non zero frequency.
		while (s.heap_len < 2) {
			node = s.heap[++s.heap_len] = max_code < 2 ? ++max_code : 0;
			tree[node * 2] = 1;
			s.depth[node] = 0;
			s.opt_len--;
			if (stree)
				s.static_len -= stree[node * 2 + 1];
			// node is 0 or 1 so it does not have extra bits
		}
		that.max_code = max_code;

		// The elements heap[heap_len/2+1 .. heap_len] are leaves of the tree,
		// establish sub-heaps of increasing lengths:

		for (n = Math.floor(s.heap_len / 2); n >= 1; n--)
			s.pqdownheap(tree, n);

		// Construct the Huffman tree by repeatedly combining the least two
		// frequent nodes.

		node = elems; // next internal node of the tree
		do {
			// n = node of least frequency
			n = s.heap[1];
			s.heap[1] = s.heap[s.heap_len--];
			s.pqdownheap(tree, 1);
			m = s.heap[1]; // m = node of next least frequency

			s.heap[--s.heap_max] = n; // keep the nodes sorted by frequency
			s.heap[--s.heap_max] = m;

			// Create a new node father of n and m
			tree[node * 2] = (tree[n * 2] + tree[m * 2]);
			s.depth[node] = Math.max(s.depth[n], s.depth[m]) + 1;
			tree[n * 2 + 1] = tree[m * 2 + 1] = node;

			// and insert the new node in the heap
			s.heap[1] = node++;
			s.pqdownheap(tree, 1);
		} while (s.heap_len >= 2);

		s.heap[--s.heap_max] = s.heap[1];

		// At this point, the fields freq and dad are set. We can now
		// generate the bit lengths.

		gen_bitlen(s);

		// The field len is now set, we can generate the bit codes
		gen_codes(tree, that.max_code, s.bl_count);
	};

}

Tree._length_code = [0, 1, 2, 3, 4, 5, 6, 7].concat(...extractArray([
	[2, 8], [2, 9], [2, 10], [2, 11], [4, 12], [4, 13], [4, 14], [4, 15], [8, 16], [8, 17], [8, 18], [8, 19],
	[16, 20], [16, 21], [16, 22], [16, 23], [32, 24], [32, 25], [32, 26], [31, 27], [1, 28]]));

Tree.base_length = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 16, 20, 24, 28, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 0];

Tree.base_dist = [0, 1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256, 384, 512, 768, 1024, 1536, 2048, 3072, 4096, 6144, 8192, 12288, 16384,
	24576];

// Mapping from a distance to a distance code. dist is the distance - 1 and
// must not have side effects. _dist_code[256] and _dist_code[257] are never
// used.
Tree.d_code = function (dist) {
	return ((dist) < 256 ? _dist_code[dist] : _dist_code[256 + ((dist) >>> 7)]);
};

// extra bits for each length code
Tree.extra_lbits = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];

// extra bits for each distance code
Tree.extra_dbits = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];

// extra bits for each bit length code
Tree.extra_blbits = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 7];

Tree.bl_order = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

// StaticTree

function StaticTree(static_tree, extra_bits, extra_base, elems, max_length) {
	const that = this;
	that.static_tree = static_tree;
	that.extra_bits = extra_bits;
	that.extra_base = extra_base;
	that.elems = elems;
	that.max_length = max_length;
}

const static_ltree2_first_part = [12, 140, 76, 204, 44, 172, 108, 236, 28, 156, 92, 220, 60, 188, 124, 252, 2, 130, 66, 194, 34, 162, 98, 226, 18, 146, 82,
	210, 50, 178, 114, 242, 10, 138, 74, 202, 42, 170, 106, 234, 26, 154, 90, 218, 58, 186, 122, 250, 6, 134, 70, 198, 38, 166, 102, 230, 22, 150, 86,
	214, 54, 182, 118, 246, 14, 142, 78, 206, 46, 174, 110, 238, 30, 158, 94, 222, 62, 190, 126, 254, 1, 129, 65, 193, 33, 161, 97, 225, 17, 145, 81,
	209, 49, 177, 113, 241, 9, 137, 73, 201, 41, 169, 105, 233, 25, 153, 89, 217, 57, 185, 121, 249, 5, 133, 69, 197, 37, 165, 101, 229, 21, 149, 85,
	213, 53, 181, 117, 245, 13, 141, 77, 205, 45, 173, 109, 237, 29, 157, 93, 221, 61, 189, 125, 253, 19, 275, 147, 403, 83, 339, 211, 467, 51, 307,
	179, 435, 115, 371, 243, 499, 11, 267, 139, 395, 75, 331, 203, 459, 43, 299, 171, 427, 107, 363, 235, 491, 27, 283, 155, 411, 91, 347, 219, 475,
	59, 315, 187, 443, 123, 379, 251, 507, 7, 263, 135, 391, 71, 327, 199, 455, 39, 295, 167, 423, 103, 359, 231, 487, 23, 279, 151, 407, 87, 343, 215,
	471, 55, 311, 183, 439, 119, 375, 247, 503, 15, 271, 143, 399, 79, 335, 207, 463, 47, 303, 175, 431, 111, 367, 239, 495, 31, 287, 159, 415, 95,
	351, 223, 479, 63, 319, 191, 447, 127, 383, 255, 511, 0, 64, 32, 96, 16, 80, 48, 112, 8, 72, 40, 104, 24, 88, 56, 120, 4, 68, 36, 100, 20, 84, 52,
	116, 3, 131, 67, 195, 35, 163, 99, 227];
const static_ltree2_second_part = extractArray([[144, 8], [112, 9], [24, 7], [8, 8]]);
StaticTree.static_ltree = flatArray(static_ltree2_first_part.map((value, index) => [value, static_ltree2_second_part[index]]));

const static_dtree_first_part = [0, 16, 8, 24, 4, 20, 12, 28, 2, 18, 10, 26, 6, 22, 14, 30, 1, 17, 9, 25, 5, 21, 13, 29, 3, 19, 11, 27, 7, 23];
const static_dtree_second_part = extractArray([[30, 5]]);
StaticTree.static_dtree = flatArray(static_dtree_first_part.map((value, index) => [value, static_dtree_second_part[index]]));

StaticTree.static_l_desc = new StaticTree(StaticTree.static_ltree, Tree.extra_lbits, LITERALS + 1, L_CODES, MAX_BITS$1);

StaticTree.static_d_desc = new StaticTree(StaticTree.static_dtree, Tree.extra_dbits, 0, D_CODES, MAX_BITS$1);

StaticTree.static_bl_desc = new StaticTree(null, Tree.extra_blbits, 0, BL_CODES, MAX_BL_BITS);

// Deflate

const MAX_MEM_LEVEL = 9;
const DEF_MEM_LEVEL = 8;

function Config(good_length, max_lazy, nice_length, max_chain, func) {
	const that = this;
	that.good_length = good_length;
	that.max_lazy = max_lazy;
	that.nice_length = nice_length;
	that.max_chain = max_chain;
	that.func = func;
}

const STORED$1 = 0;
const FAST = 1;
const SLOW = 2;
const config_table = [
	new Config(0, 0, 0, 0, STORED$1),
	new Config(4, 4, 8, 4, FAST),
	new Config(4, 5, 16, 8, FAST),
	new Config(4, 6, 32, 32, FAST),
	new Config(4, 4, 16, 16, SLOW),
	new Config(8, 16, 32, 32, SLOW),
	new Config(8, 16, 128, 128, SLOW),
	new Config(8, 32, 128, 256, SLOW),
	new Config(32, 128, 258, 1024, SLOW),
	new Config(32, 258, 258, 4096, SLOW)
];

const z_errmsg = ["need dictionary", // Z_NEED_DICT
	// 2
	"stream end", // Z_STREAM_END 1
	"", // Z_OK 0
	"", // Z_ERRNO (-1)
	"stream error", // Z_STREAM_ERROR (-2)
	"data error", // Z_DATA_ERROR (-3)
	"", // Z_MEM_ERROR (-4)
	"buffer error", // Z_BUF_ERROR (-5)
	"",// Z_VERSION_ERROR (-6)
	""];

// block not completed, need more input or more output
const NeedMore = 0;

// block flush performed
const BlockDone = 1;

// finish started, need only more output at next deflate
const FinishStarted = 2;

// finish done, accept no more input or output
const FinishDone = 3;

// preset dictionary flag in zlib header
const PRESET_DICT$1 = 0x20;

const INIT_STATE = 42;
const BUSY_STATE = 113;
const FINISH_STATE = 666;

// The deflate compression method
const Z_DEFLATED$1 = 8;

const STORED_BLOCK = 0;
const STATIC_TREES = 1;
const DYN_TREES = 2;

const MIN_MATCH = 3;
const MAX_MATCH = 258;
const MIN_LOOKAHEAD = (MAX_MATCH + MIN_MATCH + 1);

function smaller(tree, n, m, depth) {
	const tn2 = tree[n * 2];
	const tm2 = tree[m * 2];
	return (tn2 < tm2 || (tn2 == tm2 && depth[n] <= depth[m]));
}

function Deflate() {

	const that = this;
	let strm; // pointer back to this zlib stream
	let status; // as the name implies
	// pending_buf; // output still pending
	let pending_buf_size; // size of pending_buf
	// pending_out; // next pending byte to output to the stream
	// pending; // nb of bytes in the pending buffer

	// dist_buf; // buffer for distances
	// lc_buf; // buffer for literals or lengths
	// To simplify the code, dist_buf and lc_buf have the same number of elements.
	// To use different lengths, an extra flag array would be necessary.

	let last_flush; // value of flush param for previous deflate call

	let w_size; // LZ77 win size (32K by default)
	let w_bits; // log2(w_size) (8..16)
	let w_mask; // w_size - 1

	let win;
	// Sliding win. Input bytes are read into the second half of the win,
	// and move to the first half later to keep a dictionary of at least wSize
	// bytes. With this organization, matches are limited to a distance of
	// wSize-MAX_MATCH bytes, but this ensures that IO is always
	// performed with a length multiple of the block size. Also, it limits
	// the win size to 64K, which is quite useful on MSDOS.
	// To do: use the user input buffer as sliding win.

	let window_size;
	// Actual size of win: 2*wSize, except when the user input buffer
	// is directly used as sliding win.

	let prev;
	// Link to older string with same hash index. To limit the size of this
	// array to 64K, this link is maintained only for the last 32K strings.
	// An index in this array is thus a win index modulo 32K.

	let head; // Heads of the hash chains or NIL.

	let ins_h; // hash index of string to be inserted
	let hash_size; // number of elements in hash table
	let hash_bits; // log2(hash_size)
	let hash_mask; // hash_size-1

	// Number of bits by which ins_h must be shifted at each input
	// step. It must be such that after MIN_MATCH steps, the oldest
	// byte no longer takes part in the hash key, that is:
	// hash_shift * MIN_MATCH >= hash_bits
	let hash_shift;

	// Window position at the beginning of the current output block. Gets
	// negative when the win is moved backwards.

	let block_start;

	let match_length; // length of best match
	let prev_match; // previous match
	let match_available; // set if previous match exists
	let strstart; // start of string to insert
	let match_start; // start of matching string
	let lookahead; // number of valid bytes ahead in win

	// Length of the best match at previous step. Matches not greater than this
	// are discarded. This is used in the lazy match evaluation.
	let prev_length;

	// To speed up deflation, hash chains are never searched beyond this
	// length. A higher limit improves compression ratio but degrades the speed.
	let max_chain_length;

	// Attempt to find a better match only when the current match is strictly
	// smaller than this value. This mechanism is used only for compression
	// levels >= 4.
	let max_lazy_match;

	// Insert new strings in the hash table only if the match length is not
	// greater than this length. This saves time but degrades compression.
	// max_insert_length is used only for compression levels <= 3.

	let level; // compression level (1..9)
	let strategy; // favor or force Huffman coding

	// Use a faster search when the previous match is longer than this
	let good_match;

	// Stop searching when current match exceeds this
	let nice_match;

	let dyn_ltree; // literal and length tree
	let dyn_dtree; // distance tree
	let bl_tree; // Huffman tree for bit lengths

	const l_desc = new Tree(); // desc for literal tree
	const d_desc = new Tree(); // desc for distance tree
	const bl_desc = new Tree(); // desc for bit length tree

	// that.heap_len; // number of elements in the heap
	// that.heap_max; // element of largest frequency
	// The sons of heap[n] are heap[2*n] and heap[2*n+1]. heap[0] is not used.
	// The same heap array is used to build all trees.

	// Depth of each subtree used as tie breaker for trees of equal frequency
	that.depth = [];

	// Size of match buffer for literals/lengths. There are 4 reasons for
	// limiting lit_bufsize to 64K:
	// - frequencies can be kept in 16 bit counters
	// - if compression is not successful for the first block, all input
	// data is still in the win so we can still emit a stored block even
	// when input comes from standard input. (This can also be done for
	// all blocks if lit_bufsize is not greater than 32K.)
	// - if compression is not successful for a file smaller than 64K, we can
	// even emit a stored file instead of a stored block (saving 5 bytes).
	// This is applicable only for zip (not gzip or zlib).
	// - creating new Huffman trees less frequently may not provide fast
	// adaptation to changes in the input data statistics. (Take for
	// example a binary file with poorly compressible code followed by
	// a highly compressible string table.) Smaller buffer sizes give
	// fast adaptation but have of course the overhead of transmitting
	// trees more frequently.
	// - I can't count above 4
	let lit_bufsize;

	let last_lit; // running index in dist_buf and lc_buf

	// that.opt_len; // bit length of current block with optimal trees
	// that.static_len; // bit length of current block with static trees
	let matches; // number of string matches in current block
	let last_eob_len; // bit length of EOB code for last block

	// Output buffer. bits are inserted starting at the bottom (least
	// significant bits).
	let bi_buf;

	// Number of valid bits in bi_buf. All bits above the last valid bit
	// are always zero.
	let bi_valid;

	// number of codes at each bit length for an optimal tree
	that.bl_count = [];

	// heap used to build the Huffman trees
	that.heap = [];

	dyn_ltree = [];
	dyn_dtree = [];
	bl_tree = [];

	function lm_init() {
		window_size = 2 * w_size;

		head[hash_size - 1] = 0;
		for (let i = 0; i < hash_size - 1; i++) {
			head[i] = 0;
		}

		// Set the default configuration parameters:
		max_lazy_match = config_table[level].max_lazy;
		good_match = config_table[level].good_length;
		nice_match = config_table[level].nice_length;
		max_chain_length = config_table[level].max_chain;

		strstart = 0;
		block_start = 0;
		lookahead = 0;
		match_length = prev_length = MIN_MATCH - 1;
		match_available = 0;
		ins_h = 0;
	}

	function init_block() {
		let i;
		// Initialize the trees.
		for (i = 0; i < L_CODES; i++)
			dyn_ltree[i * 2] = 0;
		for (i = 0; i < D_CODES; i++)
			dyn_dtree[i * 2] = 0;
		for (i = 0; i < BL_CODES; i++)
			bl_tree[i * 2] = 0;

		dyn_ltree[END_BLOCK * 2] = 1;
		that.opt_len = that.static_len = 0;
		last_lit = matches = 0;
	}

	// Initialize the tree data structures for a new zlib stream.
	function tr_init() {

		l_desc.dyn_tree = dyn_ltree;
		l_desc.stat_desc = StaticTree.static_l_desc;

		d_desc.dyn_tree = dyn_dtree;
		d_desc.stat_desc = StaticTree.static_d_desc;

		bl_desc.dyn_tree = bl_tree;
		bl_desc.stat_desc = StaticTree.static_bl_desc;

		bi_buf = 0;
		bi_valid = 0;
		last_eob_len = 8; // enough lookahead for inflate

		// Initialize the first block of the first file:
		init_block();
	}

	// Restore the heap property by moving down the tree starting at node k,
	// exchanging a node with the smallest of its two sons if necessary,
	// stopping
	// when the heap property is re-established (each father smaller than its
	// two sons).
	that.pqdownheap = function (tree, // the tree to restore
		k // node to move down
	) {
		const heap = that.heap;
		const v = heap[k];
		let j = k << 1; // left son of k
		while (j <= that.heap_len) {
			// Set j to the smallest of the two sons:
			if (j < that.heap_len && smaller(tree, heap[j + 1], heap[j], that.depth)) {
				j++;
			}
			// Exit if v is smaller than both sons
			if (smaller(tree, v, heap[j], that.depth))
				break;

			// Exchange v with the smallest son
			heap[k] = heap[j];
			k = j;
			// And continue down the tree, setting j to the left son of k
			j <<= 1;
		}
		heap[k] = v;
	};

	// Scan a literal or distance tree to determine the frequencies of the codes
	// in the bit length tree.
	function scan_tree(tree,// the tree to be scanned
		max_code // and its largest code of non zero frequency
	) {
		let prevlen = -1; // last emitted length
		let curlen; // length of current code
		let nextlen = tree[0 * 2 + 1]; // length of next code
		let count = 0; // repeat count of the current code
		let max_count = 7; // max repeat count
		let min_count = 4; // min repeat count

		if (nextlen === 0) {
			max_count = 138;
			min_count = 3;
		}
		tree[(max_code + 1) * 2 + 1] = 0xffff; // guard

		for (let n = 0; n <= max_code; n++) {
			curlen = nextlen;
			nextlen = tree[(n + 1) * 2 + 1];
			if (++count < max_count && curlen == nextlen) {
				continue;
			} else if (count < min_count) {
				bl_tree[curlen * 2] += count;
			} else if (curlen !== 0) {
				if (curlen != prevlen)
					bl_tree[curlen * 2]++;
				bl_tree[REP_3_6 * 2]++;
			} else if (count <= 10) {
				bl_tree[REPZ_3_10 * 2]++;
			} else {
				bl_tree[REPZ_11_138 * 2]++;
			}
			count = 0;
			prevlen = curlen;
			if (nextlen === 0) {
				max_count = 138;
				min_count = 3;
			} else if (curlen == nextlen) {
				max_count = 6;
				min_count = 3;
			} else {
				max_count = 7;
				min_count = 4;
			}
		}
	}

	// Construct the Huffman tree for the bit lengths and return the index in
	// bl_order of the last bit length code to send.
	function build_bl_tree() {
		let max_blindex; // index of last bit length code of non zero freq

		// Determine the bit length frequencies for literal and distance trees
		scan_tree(dyn_ltree, l_desc.max_code);
		scan_tree(dyn_dtree, d_desc.max_code);

		// Build the bit length tree:
		bl_desc.build_tree(that);
		// opt_len now includes the length of the tree representations, except
		// the lengths of the bit lengths codes and the 5+5+4 bits for the
		// counts.

		// Determine the number of bit length codes to send. The pkzip format
		// requires that at least 4 bit length codes be sent. (appnote.txt says
		// 3 but the actual value used is 4.)
		for (max_blindex = BL_CODES - 1; max_blindex >= 3; max_blindex--) {
			if (bl_tree[Tree.bl_order[max_blindex] * 2 + 1] !== 0)
				break;
		}
		// Update opt_len to include the bit length tree and counts
		that.opt_len += 3 * (max_blindex + 1) + 5 + 5 + 4;

		return max_blindex;
	}

	// Output a byte on the stream.
	// IN assertion: there is enough room in pending_buf.
	function put_byte(p) {
		that.pending_buf[that.pending++] = p;
	}

	function put_short(w) {
		put_byte(w & 0xff);
		put_byte((w >>> 8) & 0xff);
	}

	function putShortMSB(b) {
		put_byte((b >> 8) & 0xff);
		put_byte((b & 0xff) & 0xff);
	}

	function send_bits(value, length) {
		let val;
		const len = length;
		if (bi_valid > Buf_size - len) {
			val = value;
			// bi_buf |= (val << bi_valid);
			bi_buf |= ((val << bi_valid) & 0xffff);
			put_short(bi_buf);
			bi_buf = val >>> (Buf_size - bi_valid);
			bi_valid += len - Buf_size;
		} else {
			// bi_buf |= (value) << bi_valid;
			bi_buf |= (((value) << bi_valid) & 0xffff);
			bi_valid += len;
		}
	}

	function send_code(c, tree) {
		const c2 = c * 2;
		send_bits(tree[c2] & 0xffff, tree[c2 + 1] & 0xffff);
	}

	// Send a literal or distance tree in compressed form, using the codes in
	// bl_tree.
	function send_tree(tree,// the tree to be sent
		max_code // and its largest code of non zero frequency
	) {
		let n; // iterates over all tree elements
		let prevlen = -1; // last emitted length
		let curlen; // length of current code
		let nextlen = tree[0 * 2 + 1]; // length of next code
		let count = 0; // repeat count of the current code
		let max_count = 7; // max repeat count
		let min_count = 4; // min repeat count

		if (nextlen === 0) {
			max_count = 138;
			min_count = 3;
		}

		for (n = 0; n <= max_code; n++) {
			curlen = nextlen;
			nextlen = tree[(n + 1) * 2 + 1];
			if (++count < max_count && curlen == nextlen) {
				continue;
			} else if (count < min_count) {
				do {
					send_code(curlen, bl_tree);
				} while (--count !== 0);
			} else if (curlen !== 0) {
				if (curlen != prevlen) {
					send_code(curlen, bl_tree);
					count--;
				}
				send_code(REP_3_6, bl_tree);
				send_bits(count - 3, 2);
			} else if (count <= 10) {
				send_code(REPZ_3_10, bl_tree);
				send_bits(count - 3, 3);
			} else {
				send_code(REPZ_11_138, bl_tree);
				send_bits(count - 11, 7);
			}
			count = 0;
			prevlen = curlen;
			if (nextlen === 0) {
				max_count = 138;
				min_count = 3;
			} else if (curlen == nextlen) {
				max_count = 6;
				min_count = 3;
			} else {
				max_count = 7;
				min_count = 4;
			}
		}
	}

	// Send the header for a block using dynamic Huffman trees: the counts, the
	// lengths of the bit length codes, the literal tree and the distance tree.
	// IN assertion: lcodes >= 257, dcodes >= 1, blcodes >= 4.
	function send_all_trees(lcodes, dcodes, blcodes) {
		let rank; // index in bl_order

		send_bits(lcodes - 257, 5); // not +255 as stated in appnote.txt
		send_bits(dcodes - 1, 5);
		send_bits(blcodes - 4, 4); // not -3 as stated in appnote.txt
		for (rank = 0; rank < blcodes; rank++) {
			send_bits(bl_tree[Tree.bl_order[rank] * 2 + 1], 3);
		}
		send_tree(dyn_ltree, lcodes - 1); // literal tree
		send_tree(dyn_dtree, dcodes - 1); // distance tree
	}

	// Flush the bit buffer, keeping at most 7 bits in it.
	function bi_flush() {
		if (bi_valid == 16) {
			put_short(bi_buf);
			bi_buf = 0;
			bi_valid = 0;
		} else if (bi_valid >= 8) {
			put_byte(bi_buf & 0xff);
			bi_buf >>>= 8;
			bi_valid -= 8;
		}
	}

	// Send one empty static block to give enough lookahead for inflate.
	// This takes 10 bits, of which 7 may remain in the bit buffer.
	// The current inflate code requires 9 bits of lookahead. If the
	// last two codes for the previous block (real code plus EOB) were coded
	// on 5 bits or less, inflate may have only 5+3 bits of lookahead to decode
	// the last real code. In this case we send two empty static blocks instead
	// of one. (There are no problems if the previous block is stored or fixed.)
	// To simplify the code, we assume the worst case of last real code encoded
	// on one bit only.
	function _tr_align() {
		send_bits(STATIC_TREES << 1, 3);
		send_code(END_BLOCK, StaticTree.static_ltree);

		bi_flush();

		// Of the 10 bits for the empty block, we have already sent
		// (10 - bi_valid) bits. The lookahead for the last real code (before
		// the EOB of the previous block) was thus at least one plus the length
		// of the EOB plus what we have just sent of the empty static block.
		if (1 + last_eob_len + 10 - bi_valid < 9) {
			send_bits(STATIC_TREES << 1, 3);
			send_code(END_BLOCK, StaticTree.static_ltree);
			bi_flush();
		}
		last_eob_len = 7;
	}

	// Save the match info and tally the frequency counts. Return true if
	// the current block must be flushed.
	function _tr_tally(dist, // distance of matched string
		lc // match length-MIN_MATCH or unmatched char (if dist==0)
	) {
		let out_length, in_length, dcode;
		that.dist_buf[last_lit] = dist;
		that.lc_buf[last_lit] = lc & 0xff;
		last_lit++;

		if (dist === 0) {
			// lc is the unmatched char
			dyn_ltree[lc * 2]++;
		} else {
			matches++;
			// Here, lc is the match length - MIN_MATCH
			dist--; // dist = match distance - 1
			dyn_ltree[(Tree._length_code[lc] + LITERALS + 1) * 2]++;
			dyn_dtree[Tree.d_code(dist) * 2]++;
		}

		if ((last_lit & 0x1fff) === 0 && level > 2) {
			// Compute an upper bound for the compressed length
			out_length = last_lit * 8;
			in_length = strstart - block_start;
			for (dcode = 0; dcode < D_CODES; dcode++) {
				out_length += dyn_dtree[dcode * 2] * (5 + Tree.extra_dbits[dcode]);
			}
			out_length >>>= 3;
			if ((matches < Math.floor(last_lit / 2)) && out_length < Math.floor(in_length / 2))
				return true;
		}

		return (last_lit == lit_bufsize - 1);
		// We avoid equality with lit_bufsize because of wraparound at 64K
		// on 16 bit machines and because stored blocks are restricted to
		// 64K-1 bytes.
	}

	// Send the block data compressed using the given Huffman trees
	function compress_block(ltree, dtree) {
		let dist; // distance of matched string
		let lc; // match length or unmatched char (if dist === 0)
		let lx = 0; // running index in dist_buf and lc_buf
		let code; // the code to send
		let extra; // number of extra bits to send

		if (last_lit !== 0) {
			do {
				dist = that.dist_buf[lx];
				lc = that.lc_buf[lx];
				lx++;

				if (dist === 0) {
					send_code(lc, ltree); // send a literal byte
				} else {
					// Here, lc is the match length - MIN_MATCH
					code = Tree._length_code[lc];

					send_code(code + LITERALS + 1, ltree); // send the length
					// code
					extra = Tree.extra_lbits[code];
					if (extra !== 0) {
						lc -= Tree.base_length[code];
						send_bits(lc, extra); // send the extra length bits
					}
					dist--; // dist is now the match distance - 1
					code = Tree.d_code(dist);

					send_code(code, dtree); // send the distance code
					extra = Tree.extra_dbits[code];
					if (extra !== 0) {
						dist -= Tree.base_dist[code];
						send_bits(dist, extra); // send the extra distance bits
					}
				} // literal or match pair ?
			} while (lx < last_lit);
		}

		send_code(END_BLOCK, ltree);
		last_eob_len = ltree[END_BLOCK * 2 + 1];
	}

	// Flush the bit buffer and align the output on a byte boundary
	function bi_windup() {
		if (bi_valid > 8) {
			put_short(bi_buf);
		} else if (bi_valid > 0) {
			put_byte(bi_buf & 0xff);
		}
		bi_buf = 0;
		bi_valid = 0;
	}

	// Copy a stored block, storing first the length and its
	// one's complement if requested.
	function copy_block(buf, // the input data
		len, // its length
		header // true if block header must be written
	) {
		bi_windup(); // align on byte boundary
		last_eob_len = 8; // enough lookahead for inflate

		{
			put_short(len);
			put_short(~len);
		}

		that.pending_buf.set(win.subarray(buf, buf + len), that.pending);
		that.pending += len;
	}

	// Send a stored block
	function _tr_stored_block(buf, // input block
		stored_len, // length of input block
		eof // true if this is the last block for a file
	) {
		send_bits((STORED_BLOCK << 1) + (eof ? 1 : 0), 3); // send block type
		copy_block(buf, stored_len); // with header
	}

	// Determine the best encoding for the current block: dynamic trees, static
	// trees or store, and output the encoded block to the zip file.
	function _tr_flush_block(buf, // input block, or NULL if too old
		stored_len, // length of input block
		eof // true if this is the last block for a file
	) {
		let opt_lenb, static_lenb;// opt_len and static_len in bytes
		let max_blindex = 0; // index of last bit length code of non zero freq

		// Build the Huffman trees unless a stored block is forced
		if (level > 0) {
			// Construct the literal and distance trees
			l_desc.build_tree(that);

			d_desc.build_tree(that);

			// At this point, opt_len and static_len are the total bit lengths
			// of
			// the compressed block data, excluding the tree representations.

			// Build the bit length tree for the above two trees, and get the
			// index
			// in bl_order of the last bit length code to send.
			max_blindex = build_bl_tree();

			// Determine the best encoding. Compute first the block length in
			// bytes
			opt_lenb = (that.opt_len + 3 + 7) >>> 3;
			static_lenb = (that.static_len + 3 + 7) >>> 3;

			if (static_lenb <= opt_lenb)
				opt_lenb = static_lenb;
		} else {
			opt_lenb = static_lenb = stored_len + 5; // force a stored block
		}

		if ((stored_len + 4 <= opt_lenb) && buf != -1) {
			// 4: two words for the lengths
			// The test buf != NULL is only necessary if LIT_BUFSIZE > WSIZE.
			// Otherwise we can't have processed more than WSIZE input bytes
			// since
			// the last block flush, because compression would have been
			// successful. If LIT_BUFSIZE <= WSIZE, it is never too late to
			// transform a block into a stored block.
			_tr_stored_block(buf, stored_len, eof);
		} else if (static_lenb == opt_lenb) {
			send_bits((STATIC_TREES << 1) + (eof ? 1 : 0), 3);
			compress_block(StaticTree.static_ltree, StaticTree.static_dtree);
		} else {
			send_bits((DYN_TREES << 1) + (eof ? 1 : 0), 3);
			send_all_trees(l_desc.max_code + 1, d_desc.max_code + 1, max_blindex + 1);
			compress_block(dyn_ltree, dyn_dtree);
		}

		// The above check is made mod 2^32, for files larger than 512 MB
		// and uLong implemented on 32 bits.

		init_block();

		if (eof) {
			bi_windup();
		}
	}

	function flush_block_only(eof) {
		_tr_flush_block(block_start >= 0 ? block_start : -1, strstart - block_start, eof);
		block_start = strstart;
		strm.flush_pending();
	}

	// Fill the win when the lookahead becomes insufficient.
	// Updates strstart and lookahead.
	//
	// IN assertion: lookahead < MIN_LOOKAHEAD
	// OUT assertions: strstart <= window_size-MIN_LOOKAHEAD
	// At least one byte has been read, or avail_in === 0; reads are
	// performed for at least two bytes (required for the zip translate_eol
	// option -- not supported here).
	function fill_window() {
		let n, m;
		let p;
		let more; // Amount of free space at the end of the win.

		do {
			more = (window_size - lookahead - strstart);

			// Deal with !@#$% 64K limit:
			if (more === 0 && strstart === 0 && lookahead === 0) {
				more = w_size;
			} else if (more == -1) {
				// Very unlikely, but possible on 16 bit machine if strstart ==
				// 0
				// and lookahead == 1 (input done one byte at time)
				more--;

				// If the win is almost full and there is insufficient
				// lookahead,
				// move the upper half to the lower one to make room in the
				// upper half.
			} else if (strstart >= w_size + w_size - MIN_LOOKAHEAD) {
				win.set(win.subarray(w_size, w_size + w_size), 0);

				match_start -= w_size;
				strstart -= w_size; // we now have strstart >= MAX_DIST
				block_start -= w_size;

				// Slide the hash table (could be avoided with 32 bit values
				// at the expense of memory usage). We slide even when level ==
				// 0
				// to keep the hash table consistent if we switch back to level
				// > 0
				// later. (Using level 0 permanently is not an optimal usage of
				// zlib, so we don't care about this pathological case.)

				n = hash_size;
				p = n;
				do {
					m = (head[--p] & 0xffff);
					head[p] = (m >= w_size ? m - w_size : 0);
				} while (--n !== 0);

				n = w_size;
				p = n;
				do {
					m = (prev[--p] & 0xffff);
					prev[p] = (m >= w_size ? m - w_size : 0);
					// If n is not on any hash chain, prev[n] is garbage but
					// its value will never be used.
				} while (--n !== 0);
				more += w_size;
			}

			if (strm.avail_in === 0)
				return;

			// If there was no sliding:
			// strstart <= WSIZE+MAX_DIST-1 && lookahead <= MIN_LOOKAHEAD - 1 &&
			// more == window_size - lookahead - strstart
			// => more >= window_size - (MIN_LOOKAHEAD-1 + WSIZE + MAX_DIST-1)
			// => more >= window_size - 2*WSIZE + 2
			// In the BIG_MEM or MMAP case (not yet supported),
			// window_size == input_size + MIN_LOOKAHEAD &&
			// strstart + s->lookahead <= input_size => more >= MIN_LOOKAHEAD.
			// Otherwise, window_size == 2*WSIZE so more >= 2.
			// If there was sliding, more >= WSIZE. So in all cases, more >= 2.

			n = strm.read_buf(win, strstart + lookahead, more);
			lookahead += n;

			// Initialize the hash value now that we have some input:
			if (lookahead >= MIN_MATCH) {
				ins_h = win[strstart] & 0xff;
				ins_h = (((ins_h) << hash_shift) ^ (win[strstart + 1] & 0xff)) & hash_mask;
			}
			// If the whole input has less than MIN_MATCH bytes, ins_h is
			// garbage,
			// but this is not important since only literal bytes will be
			// emitted.
		} while (lookahead < MIN_LOOKAHEAD && strm.avail_in !== 0);
	}

	// Copy without compression as much as possible from the input stream,
	// return
	// the current block state.
	// This function does not insert new strings in the dictionary since
	// uncompressible data is probably not useful. This function is used
	// only for the level=0 compression option.
	// NOTE: this function should be optimized to avoid extra copying from
	// win to pending_buf.
	function deflate_stored(flush) {
		// Stored blocks are limited to 0xffff bytes, pending_buf is limited
		// to pending_buf_size, and each stored block has a 5 byte header:

		let max_block_size = 0xffff;
		let max_start;

		if (max_block_size > pending_buf_size - 5) {
			max_block_size = pending_buf_size - 5;
		}

		// Copy as much as possible from input to output:
		// eslint-disable-next-line no-constant-condition
		while (true) {
			// Fill the win as much as possible:
			if (lookahead <= 1) {
				fill_window();
				if (lookahead === 0 && flush == Z_NO_FLUSH$1)
					return NeedMore;
				if (lookahead === 0)
					break; // flush the current block
			}

			strstart += lookahead;
			lookahead = 0;

			// Emit a stored block if pending_buf will be full:
			max_start = block_start + max_block_size;
			if (strstart === 0 || strstart >= max_start) {
				// strstart === 0 is possible when wraparound on 16-bit machine
				lookahead = (strstart - max_start);
				strstart = max_start;

				flush_block_only(false);
				if (strm.avail_out === 0)
					return NeedMore;

			}

			// Flush if we may have to slide, otherwise block_start may become
			// negative and the data will be gone:
			if (strstart - block_start >= w_size - MIN_LOOKAHEAD) {
				flush_block_only(false);
				if (strm.avail_out === 0)
					return NeedMore;
			}
		}

		flush_block_only(flush == Z_FINISH$1);
		if (strm.avail_out === 0)
			return (flush == Z_FINISH$1) ? FinishStarted : NeedMore;

		return flush == Z_FINISH$1 ? FinishDone : BlockDone;
	}

	function longest_match(cur_match) {
		let chain_length = max_chain_length; // max hash chain length
		let scan = strstart; // current string
		let match; // matched string
		let len; // length of current match
		let best_len = prev_length; // best match length so far
		const limit = strstart > (w_size - MIN_LOOKAHEAD) ? strstart - (w_size - MIN_LOOKAHEAD) : 0;
		let _nice_match = nice_match;

		// Stop when cur_match becomes <= limit. To simplify the code,
		// we prevent matches with the string of win index 0.

		const wmask = w_mask;

		const strend = strstart + MAX_MATCH;
		let scan_end1 = win[scan + best_len - 1];
		let scan_end = win[scan + best_len];

		// The code is optimized for HASH_BITS >= 8 and MAX_MATCH-2 multiple of
		// 16.
		// It is easy to get rid of this optimization if necessary.

		// Do not waste too much time if we already have a good match:
		if (prev_length >= good_match) {
			chain_length >>= 2;
		}

		// Do not look for matches beyond the end of the input. This is
		// necessary
		// to make deflate deterministic.
		if (_nice_match > lookahead)
			_nice_match = lookahead;

		do {
			match = cur_match;

			// Skip to next match if the match length cannot increase
			// or if the match length is less than 2:
			if (win[match + best_len] != scan_end || win[match + best_len - 1] != scan_end1 || win[match] != win[scan]
				|| win[++match] != win[scan + 1])
				continue;

			// The check at best_len-1 can be removed because it will be made
			// again later. (This heuristic is not always a win.)
			// It is not necessary to compare scan[2] and match[2] since they
			// are always equal when the other bytes match, given that
			// the hash keys are equal and that HASH_BITS >= 8.
			scan += 2;
			match++;

			// We check for insufficient lookahead only every 8th comparison;
			// the 256th check will be made at strstart+258.
			// eslint-disable-next-line no-empty
			do {
				// empty block
			} while (win[++scan] == win[++match] && win[++scan] == win[++match] && win[++scan] == win[++match]
			&& win[++scan] == win[++match] && win[++scan] == win[++match] && win[++scan] == win[++match]
			&& win[++scan] == win[++match] && win[++scan] == win[++match] && scan < strend);

			len = MAX_MATCH - (strend - scan);
			scan = strend - MAX_MATCH;

			if (len > best_len) {
				match_start = cur_match;
				best_len = len;
				if (len >= _nice_match)
					break;
				scan_end1 = win[scan + best_len - 1];
				scan_end = win[scan + best_len];
			}

		} while ((cur_match = (prev[cur_match & wmask] & 0xffff)) > limit && --chain_length !== 0);

		if (best_len <= lookahead)
			return best_len;
		return lookahead;
	}

	// Compress as much as possible from the input stream, return the current
	// block state.
	// This function does not perform lazy evaluation of matches and inserts
	// new strings in the dictionary only for unmatched strings or for short
	// matches. It is used only for the fast compression options.
	function deflate_fast(flush) {
		// short hash_head = 0; // head of the hash chain
		let hash_head = 0; // head of the hash chain
		let bflush; // set if current block must be flushed

		// eslint-disable-next-line no-constant-condition
		while (true) {
			// Make sure that we always have enough lookahead, except
			// at the end of the input file. We need MAX_MATCH bytes
			// for the next match, plus MIN_MATCH bytes to insert the
			// string following the next match.
			if (lookahead < MIN_LOOKAHEAD) {
				fill_window();
				if (lookahead < MIN_LOOKAHEAD && flush == Z_NO_FLUSH$1) {
					return NeedMore;
				}
				if (lookahead === 0)
					break; // flush the current block
			}

			// Insert the string win[strstart .. strstart+2] in the
			// dictionary, and set hash_head to the head of the hash chain:
			if (lookahead >= MIN_MATCH) {
				ins_h = (((ins_h) << hash_shift) ^ (win[(strstart) + (MIN_MATCH - 1)] & 0xff)) & hash_mask;

				// prev[strstart&w_mask]=hash_head=head[ins_h];
				hash_head = (head[ins_h] & 0xffff);
				prev[strstart & w_mask] = head[ins_h];
				head[ins_h] = strstart;
			}

			// Find the longest match, discarding those <= prev_length.
			// At this point we have always match_length < MIN_MATCH

			if (hash_head !== 0 && ((strstart - hash_head) & 0xffff) <= w_size - MIN_LOOKAHEAD) {
				// To simplify the code, we prevent matches with the string
				// of win index 0 (in particular we have to avoid a match
				// of the string with itself at the start of the input file).
				if (strategy != Z_HUFFMAN_ONLY) {
					match_length = longest_match(hash_head);
				}
				// longest_match() sets match_start
			}
			if (match_length >= MIN_MATCH) {
				// check_match(strstart, match_start, match_length);

				bflush = _tr_tally(strstart - match_start, match_length - MIN_MATCH);

				lookahead -= match_length;

				// Insert new strings in the hash table only if the match length
				// is not too large. This saves time but degrades compression.
				if (match_length <= max_lazy_match && lookahead >= MIN_MATCH) {
					match_length--; // string at strstart already in hash table
					do {
						strstart++;

						ins_h = ((ins_h << hash_shift) ^ (win[(strstart) + (MIN_MATCH - 1)] & 0xff)) & hash_mask;
						// prev[strstart&w_mask]=hash_head=head[ins_h];
						hash_head = (head[ins_h] & 0xffff);
						prev[strstart & w_mask] = head[ins_h];
						head[ins_h] = strstart;

						// strstart never exceeds WSIZE-MAX_MATCH, so there are
						// always MIN_MATCH bytes ahead.
					} while (--match_length !== 0);
					strstart++;
				} else {
					strstart += match_length;
					match_length = 0;
					ins_h = win[strstart] & 0xff;

					ins_h = (((ins_h) << hash_shift) ^ (win[strstart + 1] & 0xff)) & hash_mask;
					// If lookahead < MIN_MATCH, ins_h is garbage, but it does
					// not
					// matter since it will be recomputed at next deflate call.
				}
			} else {
				// No match, output a literal byte

				bflush = _tr_tally(0, win[strstart] & 0xff);
				lookahead--;
				strstart++;
			}
			if (bflush) {

				flush_block_only(false);
				if (strm.avail_out === 0)
					return NeedMore;
			}
		}

		flush_block_only(flush == Z_FINISH$1);
		if (strm.avail_out === 0) {
			if (flush == Z_FINISH$1)
				return FinishStarted;
			else
				return NeedMore;
		}
		return flush == Z_FINISH$1 ? FinishDone : BlockDone;
	}

	// Same as above, but achieves better compression. We use a lazy
	// evaluation for matches: a match is finally adopted only if there is
	// no better match at the next win position.
	function deflate_slow(flush) {
		// short hash_head = 0; // head of hash chain
		let hash_head = 0; // head of hash chain
		let bflush; // set if current block must be flushed
		let max_insert;

		// Process the input block.
		// eslint-disable-next-line no-constant-condition
		while (true) {
			// Make sure that we always have enough lookahead, except
			// at the end of the input file. We need MAX_MATCH bytes
			// for the next match, plus MIN_MATCH bytes to insert the
			// string following the next match.

			if (lookahead < MIN_LOOKAHEAD) {
				fill_window();
				if (lookahead < MIN_LOOKAHEAD && flush == Z_NO_FLUSH$1) {
					return NeedMore;
				}
				if (lookahead === 0)
					break; // flush the current block
			}

			// Insert the string win[strstart .. strstart+2] in the
			// dictionary, and set hash_head to the head of the hash chain:

			if (lookahead >= MIN_MATCH) {
				ins_h = (((ins_h) << hash_shift) ^ (win[(strstart) + (MIN_MATCH - 1)] & 0xff)) & hash_mask;
				// prev[strstart&w_mask]=hash_head=head[ins_h];
				hash_head = (head[ins_h] & 0xffff);
				prev[strstart & w_mask] = head[ins_h];
				head[ins_h] = strstart;
			}

			// Find the longest match, discarding those <= prev_length.
			prev_length = match_length;
			prev_match = match_start;
			match_length = MIN_MATCH - 1;

			if (hash_head !== 0 && prev_length < max_lazy_match && ((strstart - hash_head) & 0xffff) <= w_size - MIN_LOOKAHEAD) {
				// To simplify the code, we prevent matches with the string
				// of win index 0 (in particular we have to avoid a match
				// of the string with itself at the start of the input file).

				if (strategy != Z_HUFFMAN_ONLY) {
					match_length = longest_match(hash_head);
				}
				// longest_match() sets match_start

				if (match_length <= 5 && (strategy == Z_FILTERED || (match_length == MIN_MATCH && strstart - match_start > 4096))) {

					// If prev_match is also MIN_MATCH, match_start is garbage
					// but we will ignore the current match anyway.
					match_length = MIN_MATCH - 1;
				}
			}

			// If there was a match at the previous step and the current
			// match is not better, output the previous match:
			if (prev_length >= MIN_MATCH && match_length <= prev_length) {
				max_insert = strstart + lookahead - MIN_MATCH;
				// Do not insert strings in hash table beyond this.

				// check_match(strstart-1, prev_match, prev_length);

				bflush = _tr_tally(strstart - 1 - prev_match, prev_length - MIN_MATCH);

				// Insert in hash table all strings up to the end of the match.
				// strstart-1 and strstart are already inserted. If there is not
				// enough lookahead, the last two strings are not inserted in
				// the hash table.
				lookahead -= prev_length - 1;
				prev_length -= 2;
				do {
					if (++strstart <= max_insert) {
						ins_h = (((ins_h) << hash_shift) ^ (win[(strstart) + (MIN_MATCH - 1)] & 0xff)) & hash_mask;
						// prev[strstart&w_mask]=hash_head=head[ins_h];
						hash_head = (head[ins_h] & 0xffff);
						prev[strstart & w_mask] = head[ins_h];
						head[ins_h] = strstart;
					}
				} while (--prev_length !== 0);
				match_available = 0;
				match_length = MIN_MATCH - 1;
				strstart++;

				if (bflush) {
					flush_block_only(false);
					if (strm.avail_out === 0)
						return NeedMore;
				}
			} else if (match_available !== 0) {

				// If there was no match at the previous position, output a
				// single literal. If there was a match but the current match
				// is longer, truncate the previous match to a single literal.

				bflush = _tr_tally(0, win[strstart - 1] & 0xff);

				if (bflush) {
					flush_block_only(false);
				}
				strstart++;
				lookahead--;
				if (strm.avail_out === 0)
					return NeedMore;
			} else {
				// There is no previous match to compare with, wait for
				// the next step to decide.

				match_available = 1;
				strstart++;
				lookahead--;
			}
		}

		if (match_available !== 0) {
			bflush = _tr_tally(0, win[strstart - 1] & 0xff);
			match_available = 0;
		}
		flush_block_only(flush == Z_FINISH$1);

		if (strm.avail_out === 0) {
			if (flush == Z_FINISH$1)
				return FinishStarted;
			else
				return NeedMore;
		}

		return flush == Z_FINISH$1 ? FinishDone : BlockDone;
	}

	function deflateReset(strm) {
		strm.total_in = strm.total_out = 0;
		strm.msg = null; //

		that.pending = 0;
		that.pending_out = 0;

		status = BUSY_STATE;

		last_flush = Z_NO_FLUSH$1;

		tr_init();
		lm_init();
		return Z_OK$1;
	}

	that.deflateInit = function (strm, _level, bits, _method, memLevel, _strategy) {
		if (!_method)
			_method = Z_DEFLATED$1;
		if (!memLevel)
			memLevel = DEF_MEM_LEVEL;
		if (!_strategy)
			_strategy = Z_DEFAULT_STRATEGY;

		// byte[] my_version=ZLIB_VERSION;

		//
		// if (!version || version[0] != my_version[0]
		// || stream_size != sizeof(z_stream)) {
		// return Z_VERSION_ERROR;
		// }

		strm.msg = null;

		if (_level == Z_DEFAULT_COMPRESSION)
			_level = 6;

		if (memLevel < 1 || memLevel > MAX_MEM_LEVEL || _method != Z_DEFLATED$1 || bits < 9 || bits > 15 || _level < 0 || _level > 9 || _strategy < 0
			|| _strategy > Z_HUFFMAN_ONLY) {
			return Z_STREAM_ERROR$1;
		}

		strm.dstate = that;

		w_bits = bits;
		w_size = 1 << w_bits;
		w_mask = w_size - 1;

		hash_bits = memLevel + 7;
		hash_size = 1 << hash_bits;
		hash_mask = hash_size - 1;
		hash_shift = Math.floor((hash_bits + MIN_MATCH - 1) / MIN_MATCH);

		win = new Uint8Array(w_size * 2);
		prev = [];
		head = [];

		lit_bufsize = 1 << (memLevel + 6); // 16K elements by default

		that.pending_buf = new Uint8Array(lit_bufsize * 4);
		pending_buf_size = lit_bufsize * 4;

		that.dist_buf = new Uint16Array(lit_bufsize);
		that.lc_buf = new Uint8Array(lit_bufsize);

		level = _level;

		strategy = _strategy;

		return deflateReset(strm);
	};

	that.deflateEnd = function () {
		if (status != INIT_STATE && status != BUSY_STATE && status != FINISH_STATE) {
			return Z_STREAM_ERROR$1;
		}
		// Deallocate in reverse order of allocations:
		that.lc_buf = null;
		that.dist_buf = null;
		that.pending_buf = null;
		head = null;
		prev = null;
		win = null;
		// free
		that.dstate = null;
		return status == BUSY_STATE ? Z_DATA_ERROR$1 : Z_OK$1;
	};

	that.deflateParams = function (strm, _level, _strategy) {
		let err = Z_OK$1;

		if (_level == Z_DEFAULT_COMPRESSION) {
			_level = 6;
		}
		if (_level < 0 || _level > 9 || _strategy < 0 || _strategy > Z_HUFFMAN_ONLY) {
			return Z_STREAM_ERROR$1;
		}

		if (config_table[level].func != config_table[_level].func && strm.total_in !== 0) {
			// Flush the last buffer:
			err = strm.deflate(Z_PARTIAL_FLUSH);
		}

		if (level != _level) {
			level = _level;
			max_lazy_match = config_table[level].max_lazy;
			good_match = config_table[level].good_length;
			nice_match = config_table[level].nice_length;
			max_chain_length = config_table[level].max_chain;
		}
		strategy = _strategy;
		return err;
	};

	that.deflateSetDictionary = function (_strm, dictionary, dictLength) {
		let length = dictLength;
		let n, index = 0;

		if (!dictionary || status != INIT_STATE)
			return Z_STREAM_ERROR$1;

		if (length < MIN_MATCH)
			return Z_OK$1;
		if (length > w_size - MIN_LOOKAHEAD) {
			length = w_size - MIN_LOOKAHEAD;
			index = dictLength - length; // use the tail of the dictionary
		}
		win.set(dictionary.subarray(index, index + length), 0);

		strstart = length;
		block_start = length;

		// Insert all strings in the hash table (except for the last two bytes).
		// s->lookahead stays null, so s->ins_h will be recomputed at the next
		// call of fill_window.

		ins_h = win[0] & 0xff;
		ins_h = (((ins_h) << hash_shift) ^ (win[1] & 0xff)) & hash_mask;

		for (n = 0; n <= length - MIN_MATCH; n++) {
			ins_h = (((ins_h) << hash_shift) ^ (win[(n) + (MIN_MATCH - 1)] & 0xff)) & hash_mask;
			prev[n & w_mask] = head[ins_h];
			head[ins_h] = n;
		}
		return Z_OK$1;
	};

	that.deflate = function (_strm, flush) {
		let i, header, level_flags, old_flush, bstate;

		if (flush > Z_FINISH$1 || flush < 0) {
			return Z_STREAM_ERROR$1;
		}

		if (!_strm.next_out || (!_strm.next_in && _strm.avail_in !== 0) || (status == FINISH_STATE && flush != Z_FINISH$1)) {
			_strm.msg = z_errmsg[Z_NEED_DICT$1 - (Z_STREAM_ERROR$1)];
			return Z_STREAM_ERROR$1;
		}
		if (_strm.avail_out === 0) {
			_strm.msg = z_errmsg[Z_NEED_DICT$1 - (Z_BUF_ERROR$1)];
			return Z_BUF_ERROR$1;
		}

		strm = _strm; // just in case
		old_flush = last_flush;
		last_flush = flush;

		// Write the zlib header
		if (status == INIT_STATE) {
			header = (Z_DEFLATED$1 + ((w_bits - 8) << 4)) << 8;
			level_flags = ((level - 1) & 0xff) >> 1;

			if (level_flags > 3)
				level_flags = 3;
			header |= (level_flags << 6);
			if (strstart !== 0)
				header |= PRESET_DICT$1;
			header += 31 - (header % 31);

			status = BUSY_STATE;
			putShortMSB(header);
		}

		// Flush as much pending output as possible
		if (that.pending !== 0) {
			strm.flush_pending();
			if (strm.avail_out === 0) {
				// console.log(" avail_out==0");
				// Since avail_out is 0, deflate will be called again with
				// more output space, but possibly with both pending and
				// avail_in equal to zero. There won't be anything to do,
				// but this is not an error situation so make sure we
				// return OK instead of BUF_ERROR at next call of deflate:
				last_flush = -1;
				return Z_OK$1;
			}

			// Make sure there is something to do and avoid duplicate
			// consecutive
			// flushes. For repeated and useless calls with Z_FINISH, we keep
			// returning Z_STREAM_END instead of Z_BUFF_ERROR.
		} else if (strm.avail_in === 0 && flush <= old_flush && flush != Z_FINISH$1) {
			strm.msg = z_errmsg[Z_NEED_DICT$1 - (Z_BUF_ERROR$1)];
			return Z_BUF_ERROR$1;
		}

		// User must not provide more input after the first FINISH:
		if (status == FINISH_STATE && strm.avail_in !== 0) {
			_strm.msg = z_errmsg[Z_NEED_DICT$1 - (Z_BUF_ERROR$1)];
			return Z_BUF_ERROR$1;
		}

		// Start a new block or continue the current one.
		if (strm.avail_in !== 0 || lookahead !== 0 || (flush != Z_NO_FLUSH$1 && status != FINISH_STATE)) {
			bstate = -1;
			switch (config_table[level].func) {
				case STORED$1:
					bstate = deflate_stored(flush);
					break;
				case FAST:
					bstate = deflate_fast(flush);
					break;
				case SLOW:
					bstate = deflate_slow(flush);
					break;
			}

			if (bstate == FinishStarted || bstate == FinishDone) {
				status = FINISH_STATE;
			}
			if (bstate == NeedMore || bstate == FinishStarted) {
				if (strm.avail_out === 0) {
					last_flush = -1; // avoid BUF_ERROR next call, see above
				}
				return Z_OK$1;
				// If flush != Z_NO_FLUSH && avail_out === 0, the next call
				// of deflate should use the same flush parameter to make sure
				// that the flush is complete. So we don't have to output an
				// empty block here, this will be done at next call. This also
				// ensures that for a very small output buffer, we emit at most
				// one empty block.
			}

			if (bstate == BlockDone) {
				if (flush == Z_PARTIAL_FLUSH) {
					_tr_align();
				} else { // FULL_FLUSH or SYNC_FLUSH
					_tr_stored_block(0, 0, false);
					// For a full flush, this empty block will be recognized
					// as a special marker by inflate_sync().
					if (flush == Z_FULL_FLUSH) {
						// state.head[s.hash_size-1]=0;
						for (i = 0; i < hash_size/*-1*/; i++)
							// forget history
							head[i] = 0;
					}
				}
				strm.flush_pending();
				if (strm.avail_out === 0) {
					last_flush = -1; // avoid BUF_ERROR at next call, see above
					return Z_OK$1;
				}
			}
		}

		if (flush != Z_FINISH$1)
			return Z_OK$1;
		return Z_STREAM_END$1;
	};
}

// ZStream

function ZStream$1() {
	const that = this;
	that.next_in_index = 0;
	that.next_out_index = 0;
	// that.next_in; // next input byte
	that.avail_in = 0; // number of bytes available at next_in
	that.total_in = 0; // total nb of input bytes read so far
	// that.next_out; // next output byte should be put there
	that.avail_out = 0; // remaining free space at next_out
	that.total_out = 0; // total nb of bytes output so far
	// that.msg;
	// that.dstate;
}

ZStream$1.prototype = {
	deflateInit(level, bits) {
		const that = this;
		that.dstate = new Deflate();
		if (!bits)
			bits = MAX_BITS$1;
		return that.dstate.deflateInit(that, level, bits);
	},

	deflate(flush) {
		const that = this;
		if (!that.dstate) {
			return Z_STREAM_ERROR$1;
		}
		return that.dstate.deflate(that, flush);
	},

	deflateEnd() {
		const that = this;
		if (!that.dstate)
			return Z_STREAM_ERROR$1;
		const ret = that.dstate.deflateEnd();
		that.dstate = null;
		return ret;
	},

	deflateParams(level, strategy) {
		const that = this;
		if (!that.dstate)
			return Z_STREAM_ERROR$1;
		return that.dstate.deflateParams(that, level, strategy);
	},

	deflateSetDictionary(dictionary, dictLength) {
		const that = this;
		if (!that.dstate)
			return Z_STREAM_ERROR$1;
		return that.dstate.deflateSetDictionary(that, dictionary, dictLength);
	},

	// Read a new buffer from the current input stream, update the
	// total number of bytes read. All deflate() input goes through
	// this function so some applications may wish to modify it to avoid
	// allocating a large strm->next_in buffer and copying from it.
	// (See also flush_pending()).
	read_buf(buf, start, size) {
		const that = this;
		let len = that.avail_in;
		if (len > size)
			len = size;
		if (len === 0)
			return 0;
		that.avail_in -= len;
		buf.set(that.next_in.subarray(that.next_in_index, that.next_in_index + len), start);
		that.next_in_index += len;
		that.total_in += len;
		return len;
	},

	// Flush as much pending output as possible. All deflate() output goes
	// through this function so some applications may wish to modify it
	// to avoid allocating a large strm->next_out buffer and copying into it.
	// (See also read_buf()).
	flush_pending() {
		const that = this;
		let len = that.dstate.pending;

		if (len > that.avail_out)
			len = that.avail_out;
		if (len === 0)
			return;

		// if (that.dstate.pending_buf.length <= that.dstate.pending_out || that.next_out.length <= that.next_out_index
		// || that.dstate.pending_buf.length < (that.dstate.pending_out + len) || that.next_out.length < (that.next_out_index +
		// len)) {
		// console.log(that.dstate.pending_buf.length + ", " + that.dstate.pending_out + ", " + that.next_out.length + ", " +
		// that.next_out_index + ", " + len);
		// console.log("avail_out=" + that.avail_out);
		// }

		that.next_out.set(that.dstate.pending_buf.subarray(that.dstate.pending_out, that.dstate.pending_out + len), that.next_out_index);

		that.next_out_index += len;
		that.dstate.pending_out += len;
		that.total_out += len;
		that.avail_out -= len;
		that.dstate.pending -= len;
		if (that.dstate.pending === 0) {
			that.dstate.pending_out = 0;
		}
	}
};

// Deflate

function ZipDeflate(options) {
	const that = this;
	const z = new ZStream$1();
	const bufsize = getMaximumCompressedSize(options && options.chunkSize ? options.chunkSize : 64 * 1024);
	const flush = Z_NO_FLUSH$1;
	const buf = new Uint8Array(bufsize);
	let level = options ? options.level : Z_DEFAULT_COMPRESSION;
	if (typeof level == "undefined")
		level = Z_DEFAULT_COMPRESSION;
	z.deflateInit(level);
	z.next_out = buf;

	that.append = function (data, onprogress) {
		let err, array, lastIndex = 0, bufferIndex = 0, bufferSize = 0;
		const buffers = [];
		if (!data.length)
			return;
		z.next_in_index = 0;
		z.next_in = data;
		z.avail_in = data.length;
		do {
			z.next_out_index = 0;
			z.avail_out = bufsize;
			err = z.deflate(flush);
			if (err != Z_OK$1)
				throw new Error("deflating: " + z.msg);
			if (z.next_out_index)
				if (z.next_out_index == bufsize)
					buffers.push(new Uint8Array(buf));
				else
					buffers.push(buf.slice(0, z.next_out_index));
			bufferSize += z.next_out_index;
			if (onprogress && z.next_in_index > 0 && z.next_in_index != lastIndex) {
				onprogress(z.next_in_index);
				lastIndex = z.next_in_index;
			}
		} while (z.avail_in > 0 || z.avail_out === 0);
		if (buffers.length > 1) {
			array = new Uint8Array(bufferSize);
			buffers.forEach(function (chunk) {
				array.set(chunk, bufferIndex);
				bufferIndex += chunk.length;
			});
		} else {
			array = buffers[0] || new Uint8Array();
		}
		return array;
	};
	that.flush = function () {
		let err, array, bufferIndex = 0, bufferSize = 0;
		const buffers = [];
		do {
			z.next_out_index = 0;
			z.avail_out = bufsize;
			err = z.deflate(Z_FINISH$1);
			if (err != Z_STREAM_END$1 && err != Z_OK$1)
				throw new Error("deflating: " + z.msg);
			if (bufsize - z.avail_out > 0)
				buffers.push(buf.slice(0, z.next_out_index));
			bufferSize += z.next_out_index;
		} while (z.avail_in > 0 || z.avail_out === 0);
		z.deflateEnd();
		array = new Uint8Array(bufferSize);
		buffers.forEach(function (chunk) {
			array.set(chunk, bufferIndex);
			bufferIndex += chunk.length;
		});
		return array;
	};
}

function getMaximumCompressedSize(uncompressedSize) {
	return uncompressedSize + (5 * (Math.floor(uncompressedSize / 16383) + 1));
}

/*
 Copyright (c) 2022 Gildas Lormeau. All rights reserved.

 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions are met:

 1. Redistributions of source code must retain the above copyright notice,
 this list of conditions and the following disclaimer.

 2. Redistributions in binary form must reproduce the above copyright 
 notice, this list of conditions and the following disclaimer in 
 the documentation and/or other materials provided with the distribution.

 3. The names of the authors may not be used to endorse or promote products
 derived from this software without specific prior written permission.

 THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESSED OR IMPLIED WARRANTIES,
 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JCRAFT,
 INC. OR ANY CONTRIBUTORS TO THIS SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT,
 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
 OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/*
 * This program is based on JZlib 1.0.2 ymnk, JCraft,Inc.
 * JZlib is based on zlib-1.1.3, so all credit should go authors
 * Jean-loup Gailly(jloup@gzip.org) and Mark Adler(madler@alumni.caltech.edu)
 * and contributors of zlib.
 */

// deno-lint-ignore-file no-this-alias prefer-const

// Global

const MAX_BITS = 15;

const Z_OK = 0;
const Z_STREAM_END = 1;
const Z_NEED_DICT = 2;
const Z_STREAM_ERROR = -2;
const Z_DATA_ERROR = -3;
const Z_MEM_ERROR = -4;
const Z_BUF_ERROR = -5;

const inflate_mask = [0x00000000, 0x00000001, 0x00000003, 0x00000007, 0x0000000f, 0x0000001f, 0x0000003f, 0x0000007f, 0x000000ff, 0x000001ff, 0x000003ff,
	0x000007ff, 0x00000fff, 0x00001fff, 0x00003fff, 0x00007fff, 0x0000ffff];

const MANY = 1440;

// JZlib version : "1.0.2"
const Z_NO_FLUSH = 0;
const Z_FINISH = 4;

// InfTree
const fixed_bl = 9;
const fixed_bd = 5;

const fixed_tl = [96, 7, 256, 0, 8, 80, 0, 8, 16, 84, 8, 115, 82, 7, 31, 0, 8, 112, 0, 8, 48, 0, 9, 192, 80, 7, 10, 0, 8, 96, 0, 8, 32, 0, 9, 160, 0, 8, 0,
	0, 8, 128, 0, 8, 64, 0, 9, 224, 80, 7, 6, 0, 8, 88, 0, 8, 24, 0, 9, 144, 83, 7, 59, 0, 8, 120, 0, 8, 56, 0, 9, 208, 81, 7, 17, 0, 8, 104, 0, 8, 40,
	0, 9, 176, 0, 8, 8, 0, 8, 136, 0, 8, 72, 0, 9, 240, 80, 7, 4, 0, 8, 84, 0, 8, 20, 85, 8, 227, 83, 7, 43, 0, 8, 116, 0, 8, 52, 0, 9, 200, 81, 7, 13,
	0, 8, 100, 0, 8, 36, 0, 9, 168, 0, 8, 4, 0, 8, 132, 0, 8, 68, 0, 9, 232, 80, 7, 8, 0, 8, 92, 0, 8, 28, 0, 9, 152, 84, 7, 83, 0, 8, 124, 0, 8, 60,
	0, 9, 216, 82, 7, 23, 0, 8, 108, 0, 8, 44, 0, 9, 184, 0, 8, 12, 0, 8, 140, 0, 8, 76, 0, 9, 248, 80, 7, 3, 0, 8, 82, 0, 8, 18, 85, 8, 163, 83, 7,
	35, 0, 8, 114, 0, 8, 50, 0, 9, 196, 81, 7, 11, 0, 8, 98, 0, 8, 34, 0, 9, 164, 0, 8, 2, 0, 8, 130, 0, 8, 66, 0, 9, 228, 80, 7, 7, 0, 8, 90, 0, 8,
	26, 0, 9, 148, 84, 7, 67, 0, 8, 122, 0, 8, 58, 0, 9, 212, 82, 7, 19, 0, 8, 106, 0, 8, 42, 0, 9, 180, 0, 8, 10, 0, 8, 138, 0, 8, 74, 0, 9, 244, 80,
	7, 5, 0, 8, 86, 0, 8, 22, 192, 8, 0, 83, 7, 51, 0, 8, 118, 0, 8, 54, 0, 9, 204, 81, 7, 15, 0, 8, 102, 0, 8, 38, 0, 9, 172, 0, 8, 6, 0, 8, 134, 0,
	8, 70, 0, 9, 236, 80, 7, 9, 0, 8, 94, 0, 8, 30, 0, 9, 156, 84, 7, 99, 0, 8, 126, 0, 8, 62, 0, 9, 220, 82, 7, 27, 0, 8, 110, 0, 8, 46, 0, 9, 188, 0,
	8, 14, 0, 8, 142, 0, 8, 78, 0, 9, 252, 96, 7, 256, 0, 8, 81, 0, 8, 17, 85, 8, 131, 82, 7, 31, 0, 8, 113, 0, 8, 49, 0, 9, 194, 80, 7, 10, 0, 8, 97,
	0, 8, 33, 0, 9, 162, 0, 8, 1, 0, 8, 129, 0, 8, 65, 0, 9, 226, 80, 7, 6, 0, 8, 89, 0, 8, 25, 0, 9, 146, 83, 7, 59, 0, 8, 121, 0, 8, 57, 0, 9, 210,
	81, 7, 17, 0, 8, 105, 0, 8, 41, 0, 9, 178, 0, 8, 9, 0, 8, 137, 0, 8, 73, 0, 9, 242, 80, 7, 4, 0, 8, 85, 0, 8, 21, 80, 8, 258, 83, 7, 43, 0, 8, 117,
	0, 8, 53, 0, 9, 202, 81, 7, 13, 0, 8, 101, 0, 8, 37, 0, 9, 170, 0, 8, 5, 0, 8, 133, 0, 8, 69, 0, 9, 234, 80, 7, 8, 0, 8, 93, 0, 8, 29, 0, 9, 154,
	84, 7, 83, 0, 8, 125, 0, 8, 61, 0, 9, 218, 82, 7, 23, 0, 8, 109, 0, 8, 45, 0, 9, 186, 0, 8, 13, 0, 8, 141, 0, 8, 77, 0, 9, 250, 80, 7, 3, 0, 8, 83,
	0, 8, 19, 85, 8, 195, 83, 7, 35, 0, 8, 115, 0, 8, 51, 0, 9, 198, 81, 7, 11, 0, 8, 99, 0, 8, 35, 0, 9, 166, 0, 8, 3, 0, 8, 131, 0, 8, 67, 0, 9, 230,
	80, 7, 7, 0, 8, 91, 0, 8, 27, 0, 9, 150, 84, 7, 67, 0, 8, 123, 0, 8, 59, 0, 9, 214, 82, 7, 19, 0, 8, 107, 0, 8, 43, 0, 9, 182, 0, 8, 11, 0, 8, 139,
	0, 8, 75, 0, 9, 246, 80, 7, 5, 0, 8, 87, 0, 8, 23, 192, 8, 0, 83, 7, 51, 0, 8, 119, 0, 8, 55, 0, 9, 206, 81, 7, 15, 0, 8, 103, 0, 8, 39, 0, 9, 174,
	0, 8, 7, 0, 8, 135, 0, 8, 71, 0, 9, 238, 80, 7, 9, 0, 8, 95, 0, 8, 31, 0, 9, 158, 84, 7, 99, 0, 8, 127, 0, 8, 63, 0, 9, 222, 82, 7, 27, 0, 8, 111,
	0, 8, 47, 0, 9, 190, 0, 8, 15, 0, 8, 143, 0, 8, 79, 0, 9, 254, 96, 7, 256, 0, 8, 80, 0, 8, 16, 84, 8, 115, 82, 7, 31, 0, 8, 112, 0, 8, 48, 0, 9,
	193, 80, 7, 10, 0, 8, 96, 0, 8, 32, 0, 9, 161, 0, 8, 0, 0, 8, 128, 0, 8, 64, 0, 9, 225, 80, 7, 6, 0, 8, 88, 0, 8, 24, 0, 9, 145, 83, 7, 59, 0, 8,
	120, 0, 8, 56, 0, 9, 209, 81, 7, 17, 0, 8, 104, 0, 8, 40, 0, 9, 177, 0, 8, 8, 0, 8, 136, 0, 8, 72, 0, 9, 241, 80, 7, 4, 0, 8, 84, 0, 8, 20, 85, 8,
	227, 83, 7, 43, 0, 8, 116, 0, 8, 52, 0, 9, 201, 81, 7, 13, 0, 8, 100, 0, 8, 36, 0, 9, 169, 0, 8, 4, 0, 8, 132, 0, 8, 68, 0, 9, 233, 80, 7, 8, 0, 8,
	92, 0, 8, 28, 0, 9, 153, 84, 7, 83, 0, 8, 124, 0, 8, 60, 0, 9, 217, 82, 7, 23, 0, 8, 108, 0, 8, 44, 0, 9, 185, 0, 8, 12, 0, 8, 140, 0, 8, 76, 0, 9,
	249, 80, 7, 3, 0, 8, 82, 0, 8, 18, 85, 8, 163, 83, 7, 35, 0, 8, 114, 0, 8, 50, 0, 9, 197, 81, 7, 11, 0, 8, 98, 0, 8, 34, 0, 9, 165, 0, 8, 2, 0, 8,
	130, 0, 8, 66, 0, 9, 229, 80, 7, 7, 0, 8, 90, 0, 8, 26, 0, 9, 149, 84, 7, 67, 0, 8, 122, 0, 8, 58, 0, 9, 213, 82, 7, 19, 0, 8, 106, 0, 8, 42, 0, 9,
	181, 0, 8, 10, 0, 8, 138, 0, 8, 74, 0, 9, 245, 80, 7, 5, 0, 8, 86, 0, 8, 22, 192, 8, 0, 83, 7, 51, 0, 8, 118, 0, 8, 54, 0, 9, 205, 81, 7, 15, 0, 8,
	102, 0, 8, 38, 0, 9, 173, 0, 8, 6, 0, 8, 134, 0, 8, 70, 0, 9, 237, 80, 7, 9, 0, 8, 94, 0, 8, 30, 0, 9, 157, 84, 7, 99, 0, 8, 126, 0, 8, 62, 0, 9,
	221, 82, 7, 27, 0, 8, 110, 0, 8, 46, 0, 9, 189, 0, 8, 14, 0, 8, 142, 0, 8, 78, 0, 9, 253, 96, 7, 256, 0, 8, 81, 0, 8, 17, 85, 8, 131, 82, 7, 31, 0,
	8, 113, 0, 8, 49, 0, 9, 195, 80, 7, 10, 0, 8, 97, 0, 8, 33, 0, 9, 163, 0, 8, 1, 0, 8, 129, 0, 8, 65, 0, 9, 227, 80, 7, 6, 0, 8, 89, 0, 8, 25, 0, 9,
	147, 83, 7, 59, 0, 8, 121, 0, 8, 57, 0, 9, 211, 81, 7, 17, 0, 8, 105, 0, 8, 41, 0, 9, 179, 0, 8, 9, 0, 8, 137, 0, 8, 73, 0, 9, 243, 80, 7, 4, 0, 8,
	85, 0, 8, 21, 80, 8, 258, 83, 7, 43, 0, 8, 117, 0, 8, 53, 0, 9, 203, 81, 7, 13, 0, 8, 101, 0, 8, 37, 0, 9, 171, 0, 8, 5, 0, 8, 133, 0, 8, 69, 0, 9,
	235, 80, 7, 8, 0, 8, 93, 0, 8, 29, 0, 9, 155, 84, 7, 83, 0, 8, 125, 0, 8, 61, 0, 9, 219, 82, 7, 23, 0, 8, 109, 0, 8, 45, 0, 9, 187, 0, 8, 13, 0, 8,
	141, 0, 8, 77, 0, 9, 251, 80, 7, 3, 0, 8, 83, 0, 8, 19, 85, 8, 195, 83, 7, 35, 0, 8, 115, 0, 8, 51, 0, 9, 199, 81, 7, 11, 0, 8, 99, 0, 8, 35, 0, 9,
	167, 0, 8, 3, 0, 8, 131, 0, 8, 67, 0, 9, 231, 80, 7, 7, 0, 8, 91, 0, 8, 27, 0, 9, 151, 84, 7, 67, 0, 8, 123, 0, 8, 59, 0, 9, 215, 82, 7, 19, 0, 8,
	107, 0, 8, 43, 0, 9, 183, 0, 8, 11, 0, 8, 139, 0, 8, 75, 0, 9, 247, 80, 7, 5, 0, 8, 87, 0, 8, 23, 192, 8, 0, 83, 7, 51, 0, 8, 119, 0, 8, 55, 0, 9,
	207, 81, 7, 15, 0, 8, 103, 0, 8, 39, 0, 9, 175, 0, 8, 7, 0, 8, 135, 0, 8, 71, 0, 9, 239, 80, 7, 9, 0, 8, 95, 0, 8, 31, 0, 9, 159, 84, 7, 99, 0, 8,
	127, 0, 8, 63, 0, 9, 223, 82, 7, 27, 0, 8, 111, 0, 8, 47, 0, 9, 191, 0, 8, 15, 0, 8, 143, 0, 8, 79, 0, 9, 255];
const fixed_td = [80, 5, 1, 87, 5, 257, 83, 5, 17, 91, 5, 4097, 81, 5, 5, 89, 5, 1025, 85, 5, 65, 93, 5, 16385, 80, 5, 3, 88, 5, 513, 84, 5, 33, 92, 5,
	8193, 82, 5, 9, 90, 5, 2049, 86, 5, 129, 192, 5, 24577, 80, 5, 2, 87, 5, 385, 83, 5, 25, 91, 5, 6145, 81, 5, 7, 89, 5, 1537, 85, 5, 97, 93, 5,
	24577, 80, 5, 4, 88, 5, 769, 84, 5, 49, 92, 5, 12289, 82, 5, 13, 90, 5, 3073, 86, 5, 193, 192, 5, 24577];

// Tables for deflate from PKZIP's appnote.txt.
const cplens = [ // Copy lengths for literal codes 257..285
	3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0];

// see note #13 above about 258
const cplext = [ // Extra bits for literal codes 257..285
	0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0, 112, 112 // 112==invalid
];

const cpdist = [ // Copy offsets for distance codes 0..29
	1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];

const cpdext = [ // Extra bits for distance codes
	0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];

// If BMAX needs to be larger than 16, then h and x[] should be uLong.
const BMAX = 15; // maximum bit length of any code

function InfTree() {
	const that = this;

	let hn; // hufts used in space
	let v; // work area for huft_build
	let c; // bit length count table
	let r; // table entry for structure assignment
	let u; // table stack
	let x; // bit offsets, then code stack

	function huft_build(b, // code lengths in bits (all assumed <=
		// BMAX)
		bindex, n, // number of codes (assumed <= 288)
		s, // number of simple-valued codes (0..s-1)
		d, // list of base values for non-simple codes
		e, // list of extra bits for non-simple codes
		t, // result: starting table
		m, // maximum lookup bits, returns actual
		hp,// space for trees
		hn,// hufts used in space
		v // working area: values in order of bit length
	) {
		// Given a list of code lengths and a maximum table size, make a set of
		// tables to decode that set of codes. Return Z_OK on success,
		// Z_BUF_ERROR
		// if the given code set is incomplete (the tables are still built in
		// this
		// case), Z_DATA_ERROR if the input is invalid (an over-subscribed set
		// of
		// lengths), or Z_MEM_ERROR if not enough memory.

		let a; // counter for codes of length k
		let f; // i repeats in table every f entries
		let g; // maximum code length
		let h; // table level
		let i; // counter, current code
		let j; // counter
		let k; // number of bits in current code
		let l; // bits per table (returned in m)
		let mask; // (1 << w) - 1, to avoid cc -O bug on HP
		let p; // pointer into c[], b[], or v[]
		let q; // points to current table
		let w; // bits before this table == (l * h)
		let xp; // pointer into x
		let y; // number of dummy codes added
		let z; // number of entries in current table

		// Generate counts for each bit length

		p = 0;
		i = n;
		do {
			c[b[bindex + p]]++;
			p++;
			i--; // assume all entries <= BMAX
		} while (i !== 0);

		if (c[0] == n) { // null input--all zero length codes
			t[0] = -1;
			m[0] = 0;
			return Z_OK;
		}

		// Find minimum and maximum length, bound *m by those
		l = m[0];
		for (j = 1; j <= BMAX; j++)
			if (c[j] !== 0)
				break;
		k = j; // minimum code length
		if (l < j) {
			l = j;
		}
		for (i = BMAX; i !== 0; i--) {
			if (c[i] !== 0)
				break;
		}
		g = i; // maximum code length
		if (l > i) {
			l = i;
		}
		m[0] = l;

		// Adjust last length count to fill out codes, if needed
		for (y = 1 << j; j < i; j++, y <<= 1) {
			if ((y -= c[j]) < 0) {
				return Z_DATA_ERROR;
			}
		}
		if ((y -= c[i]) < 0) {
			return Z_DATA_ERROR;
		}
		c[i] += y;

		// Generate starting offsets into the value table for each length
		x[1] = j = 0;
		p = 1;
		xp = 2;
		while (--i !== 0) { // note that i == g from above
			x[xp] = (j += c[p]);
			xp++;
			p++;
		}

		// Make a table of values in order of bit lengths
		i = 0;
		p = 0;
		do {
			if ((j = b[bindex + p]) !== 0) {
				v[x[j]++] = i;
			}
			p++;
		} while (++i < n);
		n = x[g]; // set n to length of v

		// Generate the Huffman codes and for each, make the table entries
		x[0] = i = 0; // first Huffman code is zero
		p = 0; // grab values in bit order
		h = -1; // no tables yet--level -1
		w = -l; // bits decoded == (l * h)
		u[0] = 0; // just to keep compilers happy
		q = 0; // ditto
		z = 0; // ditto

		// go through the bit lengths (k already is bits in shortest code)
		for (; k <= g; k++) {
			a = c[k];
			while (a-- !== 0) {
				// here i is the Huffman code of length k bits for value *p
				// make tables up to required level
				while (k > w + l) {
					h++;
					w += l; // previous table always l bits
					// compute minimum size table less than or equal to l bits
					z = g - w;
					z = (z > l) ? l : z; // table size upper limit
					if ((f = 1 << (j = k - w)) > a + 1) { // try a k-w bit table
						// too few codes for
						// k-w bit table
						f -= a + 1; // deduct codes from patterns left
						xp = k;
						if (j < z) {
							while (++j < z) { // try smaller tables up to z bits
								if ((f <<= 1) <= c[++xp])
									break; // enough codes to use up j bits
								f -= c[xp]; // else deduct codes from patterns
							}
						}
					}
					z = 1 << j; // table entries for j-bit table

					// allocate new table
					if (hn[0] + z > MANY) { // (note: doesn't matter for fixed)
						return Z_DATA_ERROR; // overflow of MANY
					}
					u[h] = q = /* hp+ */hn[0]; // DEBUG
					hn[0] += z;

					// connect to last table, if there is one
					if (h !== 0) {
						x[h] = i; // save pattern for backing up
						r[0] = /* (byte) */j; // bits in this table
						r[1] = /* (byte) */l; // bits to dump before this table
						j = i >>> (w - l);
						r[2] = /* (int) */(q - u[h - 1] - j); // offset to this table
						hp.set(r, (u[h - 1] + j) * 3);
						// to
						// last
						// table
					} else {
						t[0] = q; // first table is returned result
					}
				}

				// set up table entry in r
				r[1] = /* (byte) */(k - w);
				if (p >= n) {
					r[0] = 128 + 64; // out of values--invalid code
				} else if (v[p] < s) {
					r[0] = /* (byte) */(v[p] < 256 ? 0 : 32 + 64); // 256 is
					// end-of-block
					r[2] = v[p++]; // simple code is just the value
				} else {
					r[0] = /* (byte) */(e[v[p] - s] + 16 + 64); // non-simple--look
					// up in lists
					r[2] = d[v[p++] - s];
				}

				// fill code-like entries with r
				f = 1 << (k - w);
				for (j = i >>> w; j < z; j += f) {
					hp.set(r, (q + j) * 3);
				}

				// backwards increment the k-bit code i
				for (j = 1 << (k - 1); (i & j) !== 0; j >>>= 1) {
					i ^= j;
				}
				i ^= j;

				// backup over finished tables
				mask = (1 << w) - 1; // needed on HP, cc -O bug
				while ((i & mask) != x[h]) {
					h--; // don't need to update q
					w -= l;
					mask = (1 << w) - 1;
				}
			}
		}
		// Return Z_BUF_ERROR if we were given an incomplete table
		return y !== 0 && g != 1 ? Z_BUF_ERROR : Z_OK;
	}

	function initWorkArea(vsize) {
		let i;
		if (!hn) {
			hn = []; // []; //new Array(1);
			v = []; // new Array(vsize);
			c = new Int32Array(BMAX + 1); // new Array(BMAX + 1);
			r = []; // new Array(3);
			u = new Int32Array(BMAX); // new Array(BMAX);
			x = new Int32Array(BMAX + 1); // new Array(BMAX + 1);
		}
		if (v.length < vsize) {
			v = []; // new Array(vsize);
		}
		for (i = 0; i < vsize; i++) {
			v[i] = 0;
		}
		for (i = 0; i < BMAX + 1; i++) {
			c[i] = 0;
		}
		for (i = 0; i < 3; i++) {
			r[i] = 0;
		}
		// for(int i=0; i<BMAX; i++){u[i]=0;}
		u.set(c.subarray(0, BMAX), 0);
		// for(int i=0; i<BMAX+1; i++){x[i]=0;}
		x.set(c.subarray(0, BMAX + 1), 0);
	}

	that.inflate_trees_bits = function (c, // 19 code lengths
		bb, // bits tree desired/actual depth
		tb, // bits tree result
		hp, // space for trees
		z // for messages
	) {
		let result;
		initWorkArea(19);
		hn[0] = 0;
		result = huft_build(c, 0, 19, 19, null, null, tb, bb, hp, hn, v);

		if (result == Z_DATA_ERROR) {
			z.msg = "oversubscribed dynamic bit lengths tree";
		} else if (result == Z_BUF_ERROR || bb[0] === 0) {
			z.msg = "incomplete dynamic bit lengths tree";
			result = Z_DATA_ERROR;
		}
		return result;
	};

	that.inflate_trees_dynamic = function (nl, // number of literal/length codes
		nd, // number of distance codes
		c, // that many (total) code lengths
		bl, // literal desired/actual bit depth
		bd, // distance desired/actual bit depth
		tl, // literal/length tree result
		td, // distance tree result
		hp, // space for trees
		z // for messages
	) {
		let result;

		// build literal/length tree
		initWorkArea(288);
		hn[0] = 0;
		result = huft_build(c, 0, nl, 257, cplens, cplext, tl, bl, hp, hn, v);
		if (result != Z_OK || bl[0] === 0) {
			if (result == Z_DATA_ERROR) {
				z.msg = "oversubscribed literal/length tree";
			} else if (result != Z_MEM_ERROR) {
				z.msg = "incomplete literal/length tree";
				result = Z_DATA_ERROR;
			}
			return result;
		}

		// build distance tree
		initWorkArea(288);
		result = huft_build(c, nl, nd, 0, cpdist, cpdext, td, bd, hp, hn, v);

		if (result != Z_OK || (bd[0] === 0 && nl > 257)) {
			if (result == Z_DATA_ERROR) {
				z.msg = "oversubscribed distance tree";
			} else if (result == Z_BUF_ERROR) {
				z.msg = "incomplete distance tree";
				result = Z_DATA_ERROR;
			} else if (result != Z_MEM_ERROR) {
				z.msg = "empty distance tree with lengths";
				result = Z_DATA_ERROR;
			}
			return result;
		}

		return Z_OK;
	};

}

InfTree.inflate_trees_fixed = function (bl, // literal desired/actual bit depth
	bd, // distance desired/actual bit depth
	tl,// literal/length tree result
	td// distance tree result
) {
	bl[0] = fixed_bl;
	bd[0] = fixed_bd;
	tl[0] = fixed_tl;
	td[0] = fixed_td;
	return Z_OK;
};

// InfCodes

// waiting for "i:"=input,
// "o:"=output,
// "x:"=nothing
const START = 0; // x: set up for LEN
const LEN = 1; // i: get length/literal/eob next
const LENEXT = 2; // i: getting length extra (have base)
const DIST = 3; // i: get distance next
const DISTEXT = 4;// i: getting distance extra
const COPY = 5; // o: copying bytes in win, waiting
// for space
const LIT = 6; // o: got literal, waiting for output
// space
const WASH = 7; // o: got eob, possibly still output
// waiting
const END = 8; // x: got eob and all data flushed
const BADCODE = 9;// x: got error

function InfCodes() {
	const that = this;

	let mode; // current inflate_codes mode

	// mode dependent information
	let len = 0;

	let tree; // pointer into tree
	let tree_index = 0;
	let need = 0; // bits needed

	let lit = 0;

	// if EXT or COPY, where and how much
	let get = 0; // bits to get for extra
	let dist = 0; // distance back to copy from

	let lbits = 0; // ltree bits decoded per branch
	let dbits = 0; // dtree bits decoder per branch
	let ltree; // literal/length/eob tree
	let ltree_index = 0; // literal/length/eob tree
	let dtree; // distance tree
	let dtree_index = 0; // distance tree

	// Called with number of bytes left to write in win at least 258
	// (the maximum string length) and number of input bytes available
	// at least ten. The ten bytes are six bytes for the longest length/
	// distance pair plus four bytes for overloading the bit buffer.

	function inflate_fast(bl, bd, tl, tl_index, td, td_index, s, z) {
		let t; // temporary pointer
		let tp; // temporary pointer
		let tp_index; // temporary pointer
		let e; // extra bits or operation
		let b; // bit buffer
		let k; // bits in bit buffer
		let p; // input data pointer
		let n; // bytes available there
		let q; // output win write pointer
		let m; // bytes to end of win or read pointer
		let ml; // mask for literal/length tree
		let md; // mask for distance tree
		let c; // bytes to copy
		let d; // distance back to copy from
		let r; // copy source pointer

		let tp_index_t_3; // (tp_index+t)*3

		// load input, output, bit values
		p = z.next_in_index;
		n = z.avail_in;
		b = s.bitb;
		k = s.bitk;
		q = s.write;
		m = q < s.read ? s.read - q - 1 : s.end - q;

		// initialize masks
		ml = inflate_mask[bl];
		md = inflate_mask[bd];

		// do until not enough input or output space for fast loop
		do { // assume called with m >= 258 && n >= 10
			// get literal/length code
			while (k < (20)) { // max bits for literal/length code
				n--;
				b |= (z.read_byte(p++) & 0xff) << k;
				k += 8;
			}

			t = b & ml;
			tp = tl;
			tp_index = tl_index;
			tp_index_t_3 = (tp_index + t) * 3;
			if ((e = tp[tp_index_t_3]) === 0) {
				b >>= (tp[tp_index_t_3 + 1]);
				k -= (tp[tp_index_t_3 + 1]);

				s.win[q++] = /* (byte) */tp[tp_index_t_3 + 2];
				m--;
				continue;
			}
			do {

				b >>= (tp[tp_index_t_3 + 1]);
				k -= (tp[tp_index_t_3 + 1]);

				if ((e & 16) !== 0) {
					e &= 15;
					c = tp[tp_index_t_3 + 2] + (/* (int) */b & inflate_mask[e]);

					b >>= e;
					k -= e;

					// decode distance base of block to copy
					while (k < (15)) { // max bits for distance code
						n--;
						b |= (z.read_byte(p++) & 0xff) << k;
						k += 8;
					}

					t = b & md;
					tp = td;
					tp_index = td_index;
					tp_index_t_3 = (tp_index + t) * 3;
					e = tp[tp_index_t_3];

					do {

						b >>= (tp[tp_index_t_3 + 1]);
						k -= (tp[tp_index_t_3 + 1]);

						if ((e & 16) !== 0) {
							// get extra bits to add to distance base
							e &= 15;
							while (k < (e)) { // get extra bits (up to 13)
								n--;
								b |= (z.read_byte(p++) & 0xff) << k;
								k += 8;
							}

							d = tp[tp_index_t_3 + 2] + (b & inflate_mask[e]);

							b >>= (e);
							k -= (e);

							// do the copy
							m -= c;
							if (q >= d) { // offset before dest
								// just copy
								r = q - d;
								if (q - r > 0 && 2 > (q - r)) {
									s.win[q++] = s.win[r++]; // minimum
									// count is
									// three,
									s.win[q++] = s.win[r++]; // so unroll
									// loop a
									// little
									c -= 2;
								} else {
									s.win.set(s.win.subarray(r, r + 2), q);
									q += 2;
									r += 2;
									c -= 2;
								}
							} else { // else offset after destination
								r = q - d;
								do {
									r += s.end; // force pointer in win
								} while (r < 0); // covers invalid distances
								e = s.end - r;
								if (c > e) { // if source crosses,
									c -= e; // wrapped copy
									if (q - r > 0 && e > (q - r)) {
										do {
											s.win[q++] = s.win[r++];
										} while (--e !== 0);
									} else {
										s.win.set(s.win.subarray(r, r + e), q);
										q += e;
										r += e;
										e = 0;
									}
									r = 0; // copy rest from start of win
								}

							}

							// copy all or what's left
							if (q - r > 0 && c > (q - r)) {
								do {
									s.win[q++] = s.win[r++];
								} while (--c !== 0);
							} else {
								s.win.set(s.win.subarray(r, r + c), q);
								q += c;
								r += c;
								c = 0;
							}
							break;
						} else if ((e & 64) === 0) {
							t += tp[tp_index_t_3 + 2];
							t += (b & inflate_mask[e]);
							tp_index_t_3 = (tp_index + t) * 3;
							e = tp[tp_index_t_3];
						} else {
							z.msg = "invalid distance code";

							c = z.avail_in - n;
							c = (k >> 3) < c ? k >> 3 : c;
							n += c;
							p -= c;
							k -= c << 3;

							s.bitb = b;
							s.bitk = k;
							z.avail_in = n;
							z.total_in += p - z.next_in_index;
							z.next_in_index = p;
							s.write = q;

							return Z_DATA_ERROR;
						}
						// eslint-disable-next-line no-constant-condition
					} while (true);
					break;
				}

				if ((e & 64) === 0) {
					t += tp[tp_index_t_3 + 2];
					t += (b & inflate_mask[e]);
					tp_index_t_3 = (tp_index + t) * 3;
					if ((e = tp[tp_index_t_3]) === 0) {

						b >>= (tp[tp_index_t_3 + 1]);
						k -= (tp[tp_index_t_3 + 1]);

						s.win[q++] = /* (byte) */tp[tp_index_t_3 + 2];
						m--;
						break;
					}
				} else if ((e & 32) !== 0) {

					c = z.avail_in - n;
					c = (k >> 3) < c ? k >> 3 : c;
					n += c;
					p -= c;
					k -= c << 3;

					s.bitb = b;
					s.bitk = k;
					z.avail_in = n;
					z.total_in += p - z.next_in_index;
					z.next_in_index = p;
					s.write = q;

					return Z_STREAM_END;
				} else {
					z.msg = "invalid literal/length code";

					c = z.avail_in - n;
					c = (k >> 3) < c ? k >> 3 : c;
					n += c;
					p -= c;
					k -= c << 3;

					s.bitb = b;
					s.bitk = k;
					z.avail_in = n;
					z.total_in += p - z.next_in_index;
					z.next_in_index = p;
					s.write = q;

					return Z_DATA_ERROR;
				}
				// eslint-disable-next-line no-constant-condition
			} while (true);
		} while (m >= 258 && n >= 10);

		// not enough input or output--restore pointers and return
		c = z.avail_in - n;
		c = (k >> 3) < c ? k >> 3 : c;
		n += c;
		p -= c;
		k -= c << 3;

		s.bitb = b;
		s.bitk = k;
		z.avail_in = n;
		z.total_in += p - z.next_in_index;
		z.next_in_index = p;
		s.write = q;

		return Z_OK;
	}

	that.init = function (bl, bd, tl, tl_index, td, td_index) {
		mode = START;
		lbits = /* (byte) */bl;
		dbits = /* (byte) */bd;
		ltree = tl;
		ltree_index = tl_index;
		dtree = td;
		dtree_index = td_index;
		tree = null;
	};

	that.proc = function (s, z, r) {
		let j; // temporary storage
		let tindex; // temporary pointer
		let e; // extra bits or operation
		let b = 0; // bit buffer
		let k = 0; // bits in bit buffer
		let p = 0; // input data pointer
		let n; // bytes available there
		let q; // output win write pointer
		let m; // bytes to end of win or read pointer
		let f; // pointer to copy strings from

		// copy input/output information to locals (UPDATE macro restores)
		p = z.next_in_index;
		n = z.avail_in;
		b = s.bitb;
		k = s.bitk;
		q = s.write;
		m = q < s.read ? s.read - q - 1 : s.end - q;

		// process input and output based on current state
		// eslint-disable-next-line no-constant-condition
		while (true) {
			switch (mode) {
				// waiting for "i:"=input, "o:"=output, "x:"=nothing
				case START: // x: set up for LEN
					if (m >= 258 && n >= 10) {

						s.bitb = b;
						s.bitk = k;
						z.avail_in = n;
						z.total_in += p - z.next_in_index;
						z.next_in_index = p;
						s.write = q;
						r = inflate_fast(lbits, dbits, ltree, ltree_index, dtree, dtree_index, s, z);

						p = z.next_in_index;
						n = z.avail_in;
						b = s.bitb;
						k = s.bitk;
						q = s.write;
						m = q < s.read ? s.read - q - 1 : s.end - q;

						if (r != Z_OK) {
							mode = r == Z_STREAM_END ? WASH : BADCODE;
							break;
						}
					}
					need = lbits;
					tree = ltree;
					tree_index = ltree_index;

					mode = LEN;
				/* falls through */
				case LEN: // i: get length/literal/eob next
					j = need;

					while (k < (j)) {
						if (n !== 0)
							r = Z_OK;
						else {

							s.bitb = b;
							s.bitk = k;
							z.avail_in = n;
							z.total_in += p - z.next_in_index;
							z.next_in_index = p;
							s.write = q;
							return s.inflate_flush(z, r);
						}
						n--;
						b |= (z.read_byte(p++) & 0xff) << k;
						k += 8;
					}

					tindex = (tree_index + (b & inflate_mask[j])) * 3;

					b >>>= (tree[tindex + 1]);
					k -= (tree[tindex + 1]);

					e = tree[tindex];

					if (e === 0) { // literal
						lit = tree[tindex + 2];
						mode = LIT;
						break;
					}
					if ((e & 16) !== 0) { // length
						get = e & 15;
						len = tree[tindex + 2];
						mode = LENEXT;
						break;
					}
					if ((e & 64) === 0) { // next table
						need = e;
						tree_index = tindex / 3 + tree[tindex + 2];
						break;
					}
					if ((e & 32) !== 0) { // end of block
						mode = WASH;
						break;
					}
					mode = BADCODE; // invalid code
					z.msg = "invalid literal/length code";
					r = Z_DATA_ERROR;

					s.bitb = b;
					s.bitk = k;
					z.avail_in = n;
					z.total_in += p - z.next_in_index;
					z.next_in_index = p;
					s.write = q;
					return s.inflate_flush(z, r);

				case LENEXT: // i: getting length extra (have base)
					j = get;

					while (k < (j)) {
						if (n !== 0)
							r = Z_OK;
						else {

							s.bitb = b;
							s.bitk = k;
							z.avail_in = n;
							z.total_in += p - z.next_in_index;
							z.next_in_index = p;
							s.write = q;
							return s.inflate_flush(z, r);
						}
						n--;
						b |= (z.read_byte(p++) & 0xff) << k;
						k += 8;
					}

					len += (b & inflate_mask[j]);

					b >>= j;
					k -= j;

					need = dbits;
					tree = dtree;
					tree_index = dtree_index;
					mode = DIST;
				/* falls through */
				case DIST: // i: get distance next
					j = need;

					while (k < (j)) {
						if (n !== 0)
							r = Z_OK;
						else {

							s.bitb = b;
							s.bitk = k;
							z.avail_in = n;
							z.total_in += p - z.next_in_index;
							z.next_in_index = p;
							s.write = q;
							return s.inflate_flush(z, r);
						}
						n--;
						b |= (z.read_byte(p++) & 0xff) << k;
						k += 8;
					}

					tindex = (tree_index + (b & inflate_mask[j])) * 3;

					b >>= tree[tindex + 1];
					k -= tree[tindex + 1];

					e = (tree[tindex]);
					if ((e & 16) !== 0) { // distance
						get = e & 15;
						dist = tree[tindex + 2];
						mode = DISTEXT;
						break;
					}
					if ((e & 64) === 0) { // next table
						need = e;
						tree_index = tindex / 3 + tree[tindex + 2];
						break;
					}
					mode = BADCODE; // invalid code
					z.msg = "invalid distance code";
					r = Z_DATA_ERROR;

					s.bitb = b;
					s.bitk = k;
					z.avail_in = n;
					z.total_in += p - z.next_in_index;
					z.next_in_index = p;
					s.write = q;
					return s.inflate_flush(z, r);

				case DISTEXT: // i: getting distance extra
					j = get;

					while (k < (j)) {
						if (n !== 0)
							r = Z_OK;
						else {

							s.bitb = b;
							s.bitk = k;
							z.avail_in = n;
							z.total_in += p - z.next_in_index;
							z.next_in_index = p;
							s.write = q;
							return s.inflate_flush(z, r);
						}
						n--;
						b |= (z.read_byte(p++) & 0xff) << k;
						k += 8;
					}

					dist += (b & inflate_mask[j]);

					b >>= j;
					k -= j;

					mode = COPY;
				/* falls through */
				case COPY: // o: copying bytes in win, waiting for space
					f = q - dist;
					while (f < 0) { // modulo win size-"while" instead
						f += s.end; // of "if" handles invalid distances
					}
					while (len !== 0) {

						if (m === 0) {
							if (q == s.end && s.read !== 0) {
								q = 0;
								m = q < s.read ? s.read - q - 1 : s.end - q;
							}
							if (m === 0) {
								s.write = q;
								r = s.inflate_flush(z, r);
								q = s.write;
								m = q < s.read ? s.read - q - 1 : s.end - q;

								if (q == s.end && s.read !== 0) {
									q = 0;
									m = q < s.read ? s.read - q - 1 : s.end - q;
								}

								if (m === 0) {
									s.bitb = b;
									s.bitk = k;
									z.avail_in = n;
									z.total_in += p - z.next_in_index;
									z.next_in_index = p;
									s.write = q;
									return s.inflate_flush(z, r);
								}
							}
						}

						s.win[q++] = s.win[f++];
						m--;

						if (f == s.end)
							f = 0;
						len--;
					}
					mode = START;
					break;
				case LIT: // o: got literal, waiting for output space
					if (m === 0) {
						if (q == s.end && s.read !== 0) {
							q = 0;
							m = q < s.read ? s.read - q - 1 : s.end - q;
						}
						if (m === 0) {
							s.write = q;
							r = s.inflate_flush(z, r);
							q = s.write;
							m = q < s.read ? s.read - q - 1 : s.end - q;

							if (q == s.end && s.read !== 0) {
								q = 0;
								m = q < s.read ? s.read - q - 1 : s.end - q;
							}
							if (m === 0) {
								s.bitb = b;
								s.bitk = k;
								z.avail_in = n;
								z.total_in += p - z.next_in_index;
								z.next_in_index = p;
								s.write = q;
								return s.inflate_flush(z, r);
							}
						}
					}
					r = Z_OK;

					s.win[q++] = /* (byte) */lit;
					m--;

					mode = START;
					break;
				case WASH: // o: got eob, possibly more output
					if (k > 7) { // return unused byte, if any
						k -= 8;
						n++;
						p--; // can always return one
					}

					s.write = q;
					r = s.inflate_flush(z, r);
					q = s.write;
					m = q < s.read ? s.read - q - 1 : s.end - q;

					if (s.read != s.write) {
						s.bitb = b;
						s.bitk = k;
						z.avail_in = n;
						z.total_in += p - z.next_in_index;
						z.next_in_index = p;
						s.write = q;
						return s.inflate_flush(z, r);
					}
					mode = END;
				/* falls through */
				case END:
					r = Z_STREAM_END;
					s.bitb = b;
					s.bitk = k;
					z.avail_in = n;
					z.total_in += p - z.next_in_index;
					z.next_in_index = p;
					s.write = q;
					return s.inflate_flush(z, r);

				case BADCODE: // x: got error

					r = Z_DATA_ERROR;

					s.bitb = b;
					s.bitk = k;
					z.avail_in = n;
					z.total_in += p - z.next_in_index;
					z.next_in_index = p;
					s.write = q;
					return s.inflate_flush(z, r);

				default:
					r = Z_STREAM_ERROR;

					s.bitb = b;
					s.bitk = k;
					z.avail_in = n;
					z.total_in += p - z.next_in_index;
					z.next_in_index = p;
					s.write = q;
					return s.inflate_flush(z, r);
			}
		}
	};

	that.free = function () {
		// ZFREE(z, c);
	};

}

// InfBlocks

// Table for deflate from PKZIP's appnote.txt.
const border = [ // Order of the bit length code lengths
	16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

const TYPE = 0; // get type bits (3, including end bit)
const LENS = 1; // get lengths for stored
const STORED = 2;// processing stored block
const TABLE = 3; // get table lengths
const BTREE = 4; // get bit lengths tree for a dynamic
// block
const DTREE = 5; // get length, distance trees for a
// dynamic block
const CODES = 6; // processing fixed or dynamic block
const DRY = 7; // output remaining win bytes
const DONELOCKS = 8; // finished last block, done
const BADBLOCKS = 9; // ot a data error--stuck here

function InfBlocks(z, w) {
	const that = this;

	let mode = TYPE; // current inflate_block mode

	let left = 0; // if STORED, bytes left to copy

	let table = 0; // table lengths (14 bits)
	let index = 0; // index into blens (or border)
	let blens; // bit lengths of codes
	const bb = [0]; // bit length tree depth
	const tb = [0]; // bit length decoding tree

	const codes = new InfCodes(); // if CODES, current state

	let last = 0; // true if this block is the last block

	let hufts = new Int32Array(MANY * 3); // single malloc for tree space
	const check = 0; // check on output
	const inftree = new InfTree();

	that.bitk = 0; // bits in bit buffer
	that.bitb = 0; // bit buffer
	that.win = new Uint8Array(w); // sliding win
	that.end = w; // one byte after sliding win
	that.read = 0; // win read pointer
	that.write = 0; // win write pointer

	that.reset = function (z, c) {
		if (c)
			c[0] = check;
		// if (mode == BTREE || mode == DTREE) {
		// }
		if (mode == CODES) {
			codes.free(z);
		}
		mode = TYPE;
		that.bitk = 0;
		that.bitb = 0;
		that.read = that.write = 0;
	};

	that.reset(z, null);

	// copy as much as possible from the sliding win to the output area
	that.inflate_flush = function (z, r) {
		let n;
		let p;
		let q;

		// local copies of source and destination pointers
		p = z.next_out_index;
		q = that.read;

		// compute number of bytes to copy as far as end of win
		n = /* (int) */((q <= that.write ? that.write : that.end) - q);
		if (n > z.avail_out)
			n = z.avail_out;
		if (n !== 0 && r == Z_BUF_ERROR)
			r = Z_OK;

		// update counters
		z.avail_out -= n;
		z.total_out += n;

		// copy as far as end of win
		z.next_out.set(that.win.subarray(q, q + n), p);
		p += n;
		q += n;

		// see if more to copy at beginning of win
		if (q == that.end) {
			// wrap pointers
			q = 0;
			if (that.write == that.end)
				that.write = 0;

			// compute bytes to copy
			n = that.write - q;
			if (n > z.avail_out)
				n = z.avail_out;
			if (n !== 0 && r == Z_BUF_ERROR)
				r = Z_OK;

			// update counters
			z.avail_out -= n;
			z.total_out += n;

			// copy
			z.next_out.set(that.win.subarray(q, q + n), p);
			p += n;
			q += n;
		}

		// update pointers
		z.next_out_index = p;
		that.read = q;

		// done
		return r;
	};

	that.proc = function (z, r) {
		let t; // temporary storage
		let b; // bit buffer
		let k; // bits in bit buffer
		let p; // input data pointer
		let n; // bytes available there
		let q; // output win write pointer
		let m; // bytes to end of win or read pointer

		let i;

		// copy input/output information to locals (UPDATE macro restores)
		// {
		p = z.next_in_index;
		n = z.avail_in;
		b = that.bitb;
		k = that.bitk;
		// }
		// {
		q = that.write;
		m = /* (int) */(q < that.read ? that.read - q - 1 : that.end - q);
		// }

		// process input based on current state
		// DEBUG dtree
		// eslint-disable-next-line no-constant-condition
		while (true) {
			let bl, bd, tl, td, bl_, bd_, tl_, td_;
			switch (mode) {
				case TYPE:

					while (k < (3)) {
						if (n !== 0) {
							r = Z_OK;
						} else {
							that.bitb = b;
							that.bitk = k;
							z.avail_in = n;
							z.total_in += p - z.next_in_index;
							z.next_in_index = p;
							that.write = q;
							return that.inflate_flush(z, r);
						}
						n--;
						b |= (z.read_byte(p++) & 0xff) << k;
						k += 8;
					}
					t = /* (int) */(b & 7);
					last = t & 1;

					switch (t >>> 1) {
						case 0: // stored
							// {
							b >>>= (3);
							k -= (3);
							// }
							t = k & 7; // go to byte boundary

							// {
							b >>>= (t);
							k -= (t);
							// }
							mode = LENS; // get length of stored block
							break;
						case 1: // fixed
							// {
							bl = []; // new Array(1);
							bd = []; // new Array(1);
							tl = [[]]; // new Array(1);
							td = [[]]; // new Array(1);

							InfTree.inflate_trees_fixed(bl, bd, tl, td);
							codes.init(bl[0], bd[0], tl[0], 0, td[0], 0);
							// }

							// {
							b >>>= (3);
							k -= (3);
							// }

							mode = CODES;
							break;
						case 2: // dynamic

							// {
							b >>>= (3);
							k -= (3);
							// }

							mode = TABLE;
							break;
						case 3: // illegal

							// {
							b >>>= (3);
							k -= (3);
							// }
							mode = BADBLOCKS;
							z.msg = "invalid block type";
							r = Z_DATA_ERROR;

							that.bitb = b;
							that.bitk = k;
							z.avail_in = n;
							z.total_in += p - z.next_in_index;
							z.next_in_index = p;
							that.write = q;
							return that.inflate_flush(z, r);
					}
					break;
				case LENS:

					while (k < (32)) {
						if (n !== 0) {
							r = Z_OK;
						} else {
							that.bitb = b;
							that.bitk = k;
							z.avail_in = n;
							z.total_in += p - z.next_in_index;
							z.next_in_index = p;
							that.write = q;
							return that.inflate_flush(z, r);
						}
						n--;
						b |= (z.read_byte(p++) & 0xff) << k;
						k += 8;
					}

					if ((((~b) >>> 16) & 0xffff) != (b & 0xffff)) {
						mode = BADBLOCKS;
						z.msg = "invalid stored block lengths";
						r = Z_DATA_ERROR;

						that.bitb = b;
						that.bitk = k;
						z.avail_in = n;
						z.total_in += p - z.next_in_index;
						z.next_in_index = p;
						that.write = q;
						return that.inflate_flush(z, r);
					}
					left = (b & 0xffff);
					b = k = 0; // dump bits
					mode = left !== 0 ? STORED : (last !== 0 ? DRY : TYPE);
					break;
				case STORED:
					if (n === 0) {
						that.bitb = b;
						that.bitk = k;
						z.avail_in = n;
						z.total_in += p - z.next_in_index;
						z.next_in_index = p;
						that.write = q;
						return that.inflate_flush(z, r);
					}

					if (m === 0) {
						if (q == that.end && that.read !== 0) {
							q = 0;
							m = /* (int) */(q < that.read ? that.read - q - 1 : that.end - q);
						}
						if (m === 0) {
							that.write = q;
							r = that.inflate_flush(z, r);
							q = that.write;
							m = /* (int) */(q < that.read ? that.read - q - 1 : that.end - q);
							if (q == that.end && that.read !== 0) {
								q = 0;
								m = /* (int) */(q < that.read ? that.read - q - 1 : that.end - q);
							}
							if (m === 0) {
								that.bitb = b;
								that.bitk = k;
								z.avail_in = n;
								z.total_in += p - z.next_in_index;
								z.next_in_index = p;
								that.write = q;
								return that.inflate_flush(z, r);
							}
						}
					}
					r = Z_OK;

					t = left;
					if (t > n)
						t = n;
					if (t > m)
						t = m;
					that.win.set(z.read_buf(p, t), q);
					p += t;
					n -= t;
					q += t;
					m -= t;
					if ((left -= t) !== 0)
						break;
					mode = last !== 0 ? DRY : TYPE;
					break;
				case TABLE:

					while (k < (14)) {
						if (n !== 0) {
							r = Z_OK;
						} else {
							that.bitb = b;
							that.bitk = k;
							z.avail_in = n;
							z.total_in += p - z.next_in_index;
							z.next_in_index = p;
							that.write = q;
							return that.inflate_flush(z, r);
						}

						n--;
						b |= (z.read_byte(p++) & 0xff) << k;
						k += 8;
					}

					table = t = (b & 0x3fff);
					if ((t & 0x1f) > 29 || ((t >> 5) & 0x1f) > 29) {
						mode = BADBLOCKS;
						z.msg = "too many length or distance symbols";
						r = Z_DATA_ERROR;

						that.bitb = b;
						that.bitk = k;
						z.avail_in = n;
						z.total_in += p - z.next_in_index;
						z.next_in_index = p;
						that.write = q;
						return that.inflate_flush(z, r);
					}
					t = 258 + (t & 0x1f) + ((t >> 5) & 0x1f);
					if (!blens || blens.length < t) {
						blens = []; // new Array(t);
					} else {
						for (i = 0; i < t; i++) {
							blens[i] = 0;
						}
					}

					// {
					b >>>= (14);
					k -= (14);
					// }

					index = 0;
					mode = BTREE;
				/* falls through */
				case BTREE:
					while (index < 4 + (table >>> 10)) {
						while (k < (3)) {
							if (n !== 0) {
								r = Z_OK;
							} else {
								that.bitb = b;
								that.bitk = k;
								z.avail_in = n;
								z.total_in += p - z.next_in_index;
								z.next_in_index = p;
								that.write = q;
								return that.inflate_flush(z, r);
							}
							n--;
							b |= (z.read_byte(p++) & 0xff) << k;
							k += 8;
						}

						blens[border[index++]] = b & 7;

						// {
						b >>>= (3);
						k -= (3);
						// }
					}

					while (index < 19) {
						blens[border[index++]] = 0;
					}

					bb[0] = 7;
					t = inftree.inflate_trees_bits(blens, bb, tb, hufts, z);
					if (t != Z_OK) {
						r = t;
						if (r == Z_DATA_ERROR) {
							blens = null;
							mode = BADBLOCKS;
						}

						that.bitb = b;
						that.bitk = k;
						z.avail_in = n;
						z.total_in += p - z.next_in_index;
						z.next_in_index = p;
						that.write = q;
						return that.inflate_flush(z, r);
					}

					index = 0;
					mode = DTREE;
				/* falls through */
				case DTREE:
					// eslint-disable-next-line no-constant-condition
					while (true) {
						t = table;
						if (index >= 258 + (t & 0x1f) + ((t >> 5) & 0x1f)) {
							break;
						}

						let j, c;

						t = bb[0];

						while (k < (t)) {
							if (n !== 0) {
								r = Z_OK;
							} else {
								that.bitb = b;
								that.bitk = k;
								z.avail_in = n;
								z.total_in += p - z.next_in_index;
								z.next_in_index = p;
								that.write = q;
								return that.inflate_flush(z, r);
							}
							n--;
							b |= (z.read_byte(p++) & 0xff) << k;
							k += 8;
						}

						// if (tb[0] == -1) {
						// System.err.println("null...");
						// }

						t = hufts[(tb[0] + (b & inflate_mask[t])) * 3 + 1];
						c = hufts[(tb[0] + (b & inflate_mask[t])) * 3 + 2];

						if (c < 16) {
							b >>>= (t);
							k -= (t);
							blens[index++] = c;
						} else { // c == 16..18
							i = c == 18 ? 7 : c - 14;
							j = c == 18 ? 11 : 3;

							while (k < (t + i)) {
								if (n !== 0) {
									r = Z_OK;
								} else {
									that.bitb = b;
									that.bitk = k;
									z.avail_in = n;
									z.total_in += p - z.next_in_index;
									z.next_in_index = p;
									that.write = q;
									return that.inflate_flush(z, r);
								}
								n--;
								b |= (z.read_byte(p++) & 0xff) << k;
								k += 8;
							}

							b >>>= (t);
							k -= (t);

							j += (b & inflate_mask[i]);

							b >>>= (i);
							k -= (i);

							i = index;
							t = table;
							if (i + j > 258 + (t & 0x1f) + ((t >> 5) & 0x1f) || (c == 16 && i < 1)) {
								blens = null;
								mode = BADBLOCKS;
								z.msg = "invalid bit length repeat";
								r = Z_DATA_ERROR;

								that.bitb = b;
								that.bitk = k;
								z.avail_in = n;
								z.total_in += p - z.next_in_index;
								z.next_in_index = p;
								that.write = q;
								return that.inflate_flush(z, r);
							}

							c = c == 16 ? blens[i - 1] : 0;
							do {
								blens[i++] = c;
							} while (--j !== 0);
							index = i;
						}
					}

					tb[0] = -1;
					// {
					bl_ = []; // new Array(1);
					bd_ = []; // new Array(1);
					tl_ = []; // new Array(1);
					td_ = []; // new Array(1);
					bl_[0] = 9; // must be <= 9 for lookahead assumptions
					bd_[0] = 6; // must be <= 9 for lookahead assumptions

					t = table;
					t = inftree.inflate_trees_dynamic(257 + (t & 0x1f), 1 + ((t >> 5) & 0x1f), blens, bl_, bd_, tl_, td_, hufts, z);

					if (t != Z_OK) {
						if (t == Z_DATA_ERROR) {
							blens = null;
							mode = BADBLOCKS;
						}
						r = t;

						that.bitb = b;
						that.bitk = k;
						z.avail_in = n;
						z.total_in += p - z.next_in_index;
						z.next_in_index = p;
						that.write = q;
						return that.inflate_flush(z, r);
					}
					codes.init(bl_[0], bd_[0], hufts, tl_[0], hufts, td_[0]);
					// }
					mode = CODES;
				/* falls through */
				case CODES:
					that.bitb = b;
					that.bitk = k;
					z.avail_in = n;
					z.total_in += p - z.next_in_index;
					z.next_in_index = p;
					that.write = q;

					if ((r = codes.proc(that, z, r)) != Z_STREAM_END) {
						return that.inflate_flush(z, r);
					}
					r = Z_OK;
					codes.free(z);

					p = z.next_in_index;
					n = z.avail_in;
					b = that.bitb;
					k = that.bitk;
					q = that.write;
					m = /* (int) */(q < that.read ? that.read - q - 1 : that.end - q);

					if (last === 0) {
						mode = TYPE;
						break;
					}
					mode = DRY;
				/* falls through */
				case DRY:
					that.write = q;
					r = that.inflate_flush(z, r);
					q = that.write;
					m = /* (int) */(q < that.read ? that.read - q - 1 : that.end - q);
					if (that.read != that.write) {
						that.bitb = b;
						that.bitk = k;
						z.avail_in = n;
						z.total_in += p - z.next_in_index;
						z.next_in_index = p;
						that.write = q;
						return that.inflate_flush(z, r);
					}
					mode = DONELOCKS;
				/* falls through */
				case DONELOCKS:
					r = Z_STREAM_END;

					that.bitb = b;
					that.bitk = k;
					z.avail_in = n;
					z.total_in += p - z.next_in_index;
					z.next_in_index = p;
					that.write = q;
					return that.inflate_flush(z, r);
				case BADBLOCKS:
					r = Z_DATA_ERROR;

					that.bitb = b;
					that.bitk = k;
					z.avail_in = n;
					z.total_in += p - z.next_in_index;
					z.next_in_index = p;
					that.write = q;
					return that.inflate_flush(z, r);

				default:
					r = Z_STREAM_ERROR;

					that.bitb = b;
					that.bitk = k;
					z.avail_in = n;
					z.total_in += p - z.next_in_index;
					z.next_in_index = p;
					that.write = q;
					return that.inflate_flush(z, r);
			}
		}
	};

	that.free = function (z) {
		that.reset(z, null);
		that.win = null;
		hufts = null;
		// ZFREE(z, s);
	};

	that.set_dictionary = function (d, start, n) {
		that.win.set(d.subarray(start, start + n), 0);
		that.read = that.write = n;
	};

	// Returns true if inflate is currently at the end of a block generated
	// by Z_SYNC_FLUSH or Z_FULL_FLUSH.
	that.sync_point = function () {
		return mode == LENS ? 1 : 0;
	};

}

// Inflate

// preset dictionary flag in zlib header
const PRESET_DICT = 0x20;

const Z_DEFLATED = 8;

const METHOD = 0; // waiting for method byte
const FLAG = 1; // waiting for flag byte
const DICT4 = 2; // four dictionary check bytes to go
const DICT3 = 3; // three dictionary check bytes to go
const DICT2 = 4; // two dictionary check bytes to go
const DICT1 = 5; // one dictionary check byte to go
const DICT0 = 6; // waiting for inflateSetDictionary
const BLOCKS = 7; // decompressing blocks
const DONE = 12; // finished check, done
const BAD = 13; // got an error--stay here

const mark = [0, 0, 0xff, 0xff];

function Inflate() {
	const that = this;

	that.mode = 0; // current inflate mode

	// mode dependent information
	that.method = 0; // if FLAGS, method byte

	// if CHECK, check values to compare
	that.was = [0]; // new Array(1); // computed check value
	that.need = 0; // stream check value

	// if BAD, inflateSync's marker bytes count
	that.marker = 0;

	// mode independent information
	that.wbits = 0; // log2(win size) (8..15, defaults to 15)

	// this.blocks; // current inflate_blocks state

	function inflateReset(z) {
		if (!z || !z.istate)
			return Z_STREAM_ERROR;

		z.total_in = z.total_out = 0;
		z.msg = null;
		z.istate.mode = BLOCKS;
		z.istate.blocks.reset(z, null);
		return Z_OK;
	}

	that.inflateEnd = function (z) {
		if (that.blocks)
			that.blocks.free(z);
		that.blocks = null;
		// ZFREE(z, z->state);
		return Z_OK;
	};

	that.inflateInit = function (z, w) {
		z.msg = null;
		that.blocks = null;

		// set win size
		if (w < 8 || w > 15) {
			that.inflateEnd(z);
			return Z_STREAM_ERROR;
		}
		that.wbits = w;

		z.istate.blocks = new InfBlocks(z, 1 << w);

		// reset state
		inflateReset(z);
		return Z_OK;
	};

	that.inflate = function (z, f) {
		let r;
		let b;

		if (!z || !z.istate || !z.next_in)
			return Z_STREAM_ERROR;
		const istate = z.istate;
		f = f == Z_FINISH ? Z_BUF_ERROR : Z_OK;
		r = Z_BUF_ERROR;
		// eslint-disable-next-line no-constant-condition
		while (true) {
			switch (istate.mode) {
				case METHOD:

					if (z.avail_in === 0)
						return r;
					r = f;

					z.avail_in--;
					z.total_in++;
					if (((istate.method = z.read_byte(z.next_in_index++)) & 0xf) != Z_DEFLATED) {
						istate.mode = BAD;
						z.msg = "unknown compression method";
						istate.marker = 5; // can't try inflateSync
						break;
					}
					if ((istate.method >> 4) + 8 > istate.wbits) {
						istate.mode = BAD;
						z.msg = "invalid win size";
						istate.marker = 5; // can't try inflateSync
						break;
					}
					istate.mode = FLAG;
				/* falls through */
				case FLAG:

					if (z.avail_in === 0)
						return r;
					r = f;

					z.avail_in--;
					z.total_in++;
					b = (z.read_byte(z.next_in_index++)) & 0xff;

					if ((((istate.method << 8) + b) % 31) !== 0) {
						istate.mode = BAD;
						z.msg = "incorrect header check";
						istate.marker = 5; // can't try inflateSync
						break;
					}

					if ((b & PRESET_DICT) === 0) {
						istate.mode = BLOCKS;
						break;
					}
					istate.mode = DICT4;
				/* falls through */
				case DICT4:

					if (z.avail_in === 0)
						return r;
					r = f;

					z.avail_in--;
					z.total_in++;
					istate.need = ((z.read_byte(z.next_in_index++) & 0xff) << 24) & 0xff000000;
					istate.mode = DICT3;
				/* falls through */
				case DICT3:

					if (z.avail_in === 0)
						return r;
					r = f;

					z.avail_in--;
					z.total_in++;
					istate.need += ((z.read_byte(z.next_in_index++) & 0xff) << 16) & 0xff0000;
					istate.mode = DICT2;
				/* falls through */
				case DICT2:

					if (z.avail_in === 0)
						return r;
					r = f;

					z.avail_in--;
					z.total_in++;
					istate.need += ((z.read_byte(z.next_in_index++) & 0xff) << 8) & 0xff00;
					istate.mode = DICT1;
				/* falls through */
				case DICT1:

					if (z.avail_in === 0)
						return r;
					r = f;

					z.avail_in--;
					z.total_in++;
					istate.need += (z.read_byte(z.next_in_index++) & 0xff);
					istate.mode = DICT0;
					return Z_NEED_DICT;
				case DICT0:
					istate.mode = BAD;
					z.msg = "need dictionary";
					istate.marker = 0; // can try inflateSync
					return Z_STREAM_ERROR;
				case BLOCKS:

					r = istate.blocks.proc(z, r);
					if (r == Z_DATA_ERROR) {
						istate.mode = BAD;
						istate.marker = 0; // can try inflateSync
						break;
					}
					if (r == Z_OK) {
						r = f;
					}
					if (r != Z_STREAM_END) {
						return r;
					}
					r = f;
					istate.blocks.reset(z, istate.was);
					istate.mode = DONE;
				/* falls through */
				case DONE:
					z.avail_in = 0;
					return Z_STREAM_END;
				case BAD:
					return Z_DATA_ERROR;
				default:
					return Z_STREAM_ERROR;
			}
		}
	};

	that.inflateSetDictionary = function (z, dictionary, dictLength) {
		let index = 0, length = dictLength;
		if (!z || !z.istate || z.istate.mode != DICT0)
			return Z_STREAM_ERROR;
		const istate = z.istate;
		if (length >= (1 << istate.wbits)) {
			length = (1 << istate.wbits) - 1;
			index = dictLength - length;
		}
		istate.blocks.set_dictionary(dictionary, index, length);
		istate.mode = BLOCKS;
		return Z_OK;
	};

	that.inflateSync = function (z) {
		let n; // number of bytes to look at
		let p; // pointer to bytes
		let m; // number of marker bytes found in a row
		let r, w; // temporaries to save total_in and total_out

		// set up
		if (!z || !z.istate)
			return Z_STREAM_ERROR;
		const istate = z.istate;
		if (istate.mode != BAD) {
			istate.mode = BAD;
			istate.marker = 0;
		}
		if ((n = z.avail_in) === 0)
			return Z_BUF_ERROR;
		p = z.next_in_index;
		m = istate.marker;

		// search
		while (n !== 0 && m < 4) {
			if (z.read_byte(p) == mark[m]) {
				m++;
			} else if (z.read_byte(p) !== 0) {
				m = 0;
			} else {
				m = 4 - m;
			}
			p++;
			n--;
		}

		// restore
		z.total_in += p - z.next_in_index;
		z.next_in_index = p;
		z.avail_in = n;
		istate.marker = m;

		// return no joy or set up to restart on a new block
		if (m != 4) {
			return Z_DATA_ERROR;
		}
		r = z.total_in;
		w = z.total_out;
		inflateReset(z);
		z.total_in = r;
		z.total_out = w;
		istate.mode = BLOCKS;
		return Z_OK;
	};

	// Returns true if inflate is currently at the end of a block generated
	// by Z_SYNC_FLUSH or Z_FULL_FLUSH. This function is used by one PPP
	// implementation to provide an additional safety check. PPP uses
	// Z_SYNC_FLUSH
	// but removes the length bytes of the resulting empty stored block. When
	// decompressing, PPP checks that at the end of input packet, inflate is
	// waiting for these length bytes.
	that.inflateSyncPoint = function (z) {
		if (!z || !z.istate || !z.istate.blocks)
			return Z_STREAM_ERROR;
		return z.istate.blocks.sync_point();
	};
}

// ZStream

function ZStream() {
}

ZStream.prototype = {
	inflateInit(bits) {
		const that = this;
		that.istate = new Inflate();
		if (!bits)
			bits = MAX_BITS;
		return that.istate.inflateInit(that, bits);
	},

	inflate(f) {
		const that = this;
		if (!that.istate)
			return Z_STREAM_ERROR;
		return that.istate.inflate(that, f);
	},

	inflateEnd() {
		const that = this;
		if (!that.istate)
			return Z_STREAM_ERROR;
		const ret = that.istate.inflateEnd(that);
		that.istate = null;
		return ret;
	},

	inflateSync() {
		const that = this;
		if (!that.istate)
			return Z_STREAM_ERROR;
		return that.istate.inflateSync(that);
	},
	inflateSetDictionary(dictionary, dictLength) {
		const that = this;
		if (!that.istate)
			return Z_STREAM_ERROR;
		return that.istate.inflateSetDictionary(that, dictionary, dictLength);
	},
	read_byte(start) {
		const that = this;
		return that.next_in[start];
	},
	read_buf(start, size) {
		const that = this;
		return that.next_in.subarray(start, start + size);
	}
};

// Inflater

function ZipInflate(options) {
	const that = this;
	const z = new ZStream();
	const bufsize = options && options.chunkSize ? Math.floor(options.chunkSize * 2) : 128 * 1024;
	const flush = Z_NO_FLUSH;
	const buf = new Uint8Array(bufsize);
	let nomoreinput = false;

	z.inflateInit();
	z.next_out = buf;

	that.append = function (data, onprogress) {
		const buffers = [];
		let err, array, lastIndex = 0, bufferIndex = 0, bufferSize = 0;
		if (data.length === 0)
			return;
		z.next_in_index = 0;
		z.next_in = data;
		z.avail_in = data.length;
		do {
			z.next_out_index = 0;
			z.avail_out = bufsize;
			if ((z.avail_in === 0) && (!nomoreinput)) { // if buffer is empty and more input is available, refill it
				z.next_in_index = 0;
				nomoreinput = true;
			}
			err = z.inflate(flush);
			if (nomoreinput && (err === Z_BUF_ERROR)) {
				if (z.avail_in !== 0)
					throw new Error("inflating: bad input");
			} else if (err !== Z_OK && err !== Z_STREAM_END)
				throw new Error("inflating: " + z.msg);
			if ((nomoreinput || err === Z_STREAM_END) && (z.avail_in === data.length))
				throw new Error("inflating: bad input");
			if (z.next_out_index)
				if (z.next_out_index === bufsize)
					buffers.push(new Uint8Array(buf));
				else
					buffers.push(buf.slice(0, z.next_out_index));
			bufferSize += z.next_out_index;
			if (onprogress && z.next_in_index > 0 && z.next_in_index != lastIndex) {
				onprogress(z.next_in_index);
				lastIndex = z.next_in_index;
			}
		} while (z.avail_in > 0 || z.avail_out === 0);
		if (buffers.length > 1) {
			array = new Uint8Array(bufferSize);
			buffers.forEach(function (chunk) {
				array.set(chunk, bufferIndex);
				bufferIndex += chunk.length;
			});
		} else {
			array = buffers[0] || new Uint8Array();
		}
		return array;
	};
	that.flush = function () {
		z.inflateEnd();
	};
}

/*
 Copyright (c) 2022 Gildas Lormeau. All rights reserved.

 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions are met:

 1. Redistributions of source code must retain the above copyright notice,
 this list of conditions and the following disclaimer.

 2. Redistributions in binary form must reproduce the above copyright 
 notice, this list of conditions and the following disclaimer in 
 the documentation and/or other materials provided with the distribution.

 3. The names of the authors may not be used to endorse or promote products
 derived from this software without specific prior written permission.

 THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESSED OR IMPLIED WARRANTIES,
 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JCRAFT,
 INC. OR ANY CONTRIBUTORS TO THIS SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT,
 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
 OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

const MAX_32_BITS = 0xffffffff;
const MAX_16_BITS = 0xffff;
const COMPRESSION_METHOD_DEFLATE = 0x08;
const COMPRESSION_METHOD_STORE = 0x00;
const COMPRESSION_METHOD_AES = 0x63;

const LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const SPLIT_ZIP_FILE_SIGNATURE = 0x08074b50;
const CENTRAL_FILE_HEADER_SIGNATURE = 0x02014b50;
const END_OF_CENTRAL_DIR_SIGNATURE = 0x06054b50;
const ZIP64_END_OF_CENTRAL_DIR_SIGNATURE = 0x06064b50;
const ZIP64_END_OF_CENTRAL_DIR_LOCATOR_SIGNATURE = 0x07064b50;
const END_OF_CENTRAL_DIR_LENGTH = 22;
const ZIP64_END_OF_CENTRAL_DIR_LOCATOR_LENGTH = 20;
const ZIP64_END_OF_CENTRAL_DIR_LENGTH = 56;

const EXTRAFIELD_TYPE_ZIP64 = 0x0001;
const EXTRAFIELD_TYPE_AES = 0x9901;
const EXTRAFIELD_TYPE_NTFS = 0x000a;
const EXTRAFIELD_TYPE_NTFS_TAG1 = 0x0001;
const EXTRAFIELD_TYPE_EXTENDED_TIMESTAMP = 0x5455;
const EXTRAFIELD_TYPE_UNICODE_PATH = 0x7075;
const EXTRAFIELD_TYPE_UNICODE_COMMENT = 0x6375;

const BITFLAG_ENCRYPTED = 0x01;
const BITFLAG_LEVEL = 0x06;
const BITFLAG_DATA_DESCRIPTOR = 0x0008;
const BITFLAG_LANG_ENCODING_FLAG = 0x0800;
const FILE_ATTR_MSDOS_DIR_MASK = 0x10;

const DIRECTORY_SIGNATURE = "/";

const UNDEFINED_VALUE = undefined;
const UNDEFINED_TYPE$1 = "undefined";
const FUNCTION_TYPE$1 = "function";

/*
 Copyright (c) 2022 Gildas Lormeau. All rights reserved.

 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions are met:

 1. Redistributions of source code must retain the above copyright notice,
 this list of conditions and the following disclaimer.

 2. Redistributions in binary form must reproduce the above copyright 
 notice, this list of conditions and the following disclaimer in 
 the documentation and/or other materials provided with the distribution.

 3. The names of the authors may not be used to endorse or promote products
 derived from this software without specific prior written permission.

 THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESSED OR IMPLIED WARRANTIES,
 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JCRAFT,
 INC. OR ANY CONTRIBUTORS TO THIS SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT,
 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
 OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

class StreamAdapter {

	constructor(Codec) {
		return class extends TransformStream {
			constructor(_format, options) {
				const codec = new Codec(options);
				super({
					transform(chunk, controller) {
						controller.enqueue(codec.append(chunk));
					},
					flush(controller) {
						const chunk = codec.flush();
						if (chunk) {
							controller.enqueue(chunk);
						}
					}
				});
			}
		};
	}
}

/*
 Copyright (c) 2022 Gildas Lormeau. All rights reserved.

 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions are met:

 1. Redistributions of source code must retain the above copyright notice,
 this list of conditions and the following disclaimer.

 2. Redistributions in binary form must reproduce the above copyright 
 notice, this list of conditions and the following disclaimer in 
 the documentation and/or other materials provided with the distribution.

 3. The names of the authors may not be used to endorse or promote products
 derived from this software without specific prior written permission.

 THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESSED OR IMPLIED WARRANTIES,
 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JCRAFT,
 INC. OR ANY CONTRIBUTORS TO THIS SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT,
 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
 OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

const MINIMUM_CHUNK_SIZE = 64;
let maxWorkers = 2;
try {
	if (typeof navigator != UNDEFINED_TYPE$1 && navigator.hardwareConcurrency) {
		maxWorkers = navigator.hardwareConcurrency;
	}
} catch (_error) {
	// ignored
}
const DEFAULT_CONFIGURATION = {
	chunkSize: 512 * 1024,
	maxWorkers,
	terminateWorkerTimeout: 5000,
	useWebWorkers: true,
	useCompressionStream: true,
	workerScripts: UNDEFINED_VALUE,
	CompressionStreamNative: typeof CompressionStream != UNDEFINED_TYPE$1 && CompressionStream,
	DecompressionStreamNative: typeof DecompressionStream != UNDEFINED_TYPE$1 && DecompressionStream
};

const config = Object.assign({}, DEFAULT_CONFIGURATION);

function getConfiguration() {
	return config;
}

function getChunkSize(config) {
	return Math.max(config.chunkSize, MINIMUM_CHUNK_SIZE);
}

function configure(configuration) {
	const {
		baseURL,
		chunkSize,
		maxWorkers,
		terminateWorkerTimeout,
		useCompressionStream,
		useWebWorkers,
		Deflate,
		Inflate,
		CompressionStream,
		DecompressionStream,
		workerScripts
	} = configuration;
	setIfDefined("baseURL", baseURL);
	setIfDefined("chunkSize", chunkSize);
	setIfDefined("maxWorkers", maxWorkers);
	setIfDefined("terminateWorkerTimeout", terminateWorkerTimeout);
	setIfDefined("useCompressionStream", useCompressionStream);
	setIfDefined("useWebWorkers", useWebWorkers);
	if (Deflate) {
		config.CompressionStream = new StreamAdapter(Deflate);
	}
	if (Inflate) {
		config.DecompressionStream = new StreamAdapter(Inflate);
	}
	setIfDefined("CompressionStream", CompressionStream);
	setIfDefined("DecompressionStream", DecompressionStream);
	if (workerScripts !== UNDEFINED_VALUE) {
		const { deflate, inflate } = workerScripts;
		if (deflate || inflate) {
			if (!config.workerScripts) {
				config.workerScripts = {};
			}
		}
		if (deflate) {
			if (!Array.isArray(deflate)) {
				throw new Error("workerScripts.deflate must be an array");
			}
			config.workerScripts.deflate = deflate;
		}
		if (inflate) {
			if (!Array.isArray(inflate)) {
				throw new Error("workerScripts.inflate must be an array");
			}
			config.workerScripts.inflate = inflate;
		}
	}
}

function setIfDefined(propertyName, propertyValue) {
	if (propertyValue !== UNDEFINED_VALUE) {
		config[propertyName] = propertyValue;
	}
}

/*
 Copyright (c) 2022 Gildas Lormeau. All rights reserved.

 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions are met:

 1. Redistributions of source code must retain the above copyright notice,
 this list of conditions and the following disclaimer.

 2. Redistributions in binary form must reproduce the above copyright 
 notice, this list of conditions and the following disclaimer in 
 the documentation and/or other materials provided with the distribution.

 3. The names of the authors may not be used to endorse or promote products
 derived from this software without specific prior written permission.

 THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESSED OR IMPLIED WARRANTIES,
 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JCRAFT,
 INC. OR ANY CONTRIBUTORS TO THIS SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT,
 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
 OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

const table$1 = {
	"application": {
		"andrew-inset": "ez",
		"annodex": "anx",
		"atom+xml": "atom",
		"atomcat+xml": "atomcat",
		"atomserv+xml": "atomsrv",
		"bbolin": "lin",
		"cap": ["cap", "pcap"],
		"cu-seeme": "cu",
		"davmount+xml": "davmount",
		"dsptype": "tsp",
		"ecmascript": ["es", "ecma"],
		"futuresplash": "spl",
		"hta": "hta",
		"java-archive": "jar",
		"java-serialized-object": "ser",
		"java-vm": "class",
		"javascript": "js",
		"m3g": "m3g",
		"mac-binhex40": "hqx",
		"mathematica": ["nb", "ma", "mb"],
		"msaccess": "mdb",
		"msword": ["doc", "dot"],
		"mxf": "mxf",
		"oda": "oda",
		"ogg": "ogx",
		"pdf": "pdf",
		"pgp-keys": "key",
		"pgp-signature": ["asc", "sig"],
		"pics-rules": "prf",
		"postscript": ["ps", "ai", "eps", "epsi", "epsf", "eps2", "eps3"],
		"rar": "rar",
		"rdf+xml": "rdf",
		"rss+xml": "rss",
		"rtf": "rtf",
		"smil": ["smi", "smil"],
		"xhtml+xml": ["xhtml", "xht"],
		"xml": ["xml", "xsl", "xsd"],
		"xspf+xml": "xspf",
		"zip": "zip",
		"vnd.android.package-archive": "apk",
		"vnd.cinderella": "cdy",
		"vnd.google-earth.kml+xml": "kml",
		"vnd.google-earth.kmz": "kmz",
		"vnd.mozilla.xul+xml": "xul",
		"vnd.ms-excel": ["xls", "xlb", "xlt", "xlm", "xla", "xlc", "xlw"],
		"vnd.ms-pki.seccat": "cat",
		"vnd.ms-pki.stl": "stl",
		"vnd.ms-powerpoint": ["ppt", "pps", "pot"],
		"vnd.oasis.opendocument.chart": "odc",
		"vnd.oasis.opendocument.database": "odb",
		"vnd.oasis.opendocument.formula": "odf",
		"vnd.oasis.opendocument.graphics": "odg",
		"vnd.oasis.opendocument.graphics-template": "otg",
		"vnd.oasis.opendocument.image": "odi",
		"vnd.oasis.opendocument.presentation": "odp",
		"vnd.oasis.opendocument.presentation-template": "otp",
		"vnd.oasis.opendocument.spreadsheet": "ods",
		"vnd.oasis.opendocument.spreadsheet-template": "ots",
		"vnd.oasis.opendocument.text": "odt",
		"vnd.oasis.opendocument.text-master": "odm",
		"vnd.oasis.opendocument.text-template": "ott",
		"vnd.oasis.opendocument.text-web": "oth",
		"vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
		"vnd.openxmlformats-officedocument.spreadsheetml.template": "xltx",
		"vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
		"vnd.openxmlformats-officedocument.presentationml.slideshow": "ppsx",
		"vnd.openxmlformats-officedocument.presentationml.template": "potx",
		"vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
		"vnd.openxmlformats-officedocument.wordprocessingml.template": "dotx",
		"vnd.smaf": "mmf",
		"vnd.stardivision.calc": "sdc",
		"vnd.stardivision.chart": "sds",
		"vnd.stardivision.draw": "sda",
		"vnd.stardivision.impress": "sdd",
		"vnd.stardivision.math": ["sdf", "smf"],
		"vnd.stardivision.writer": ["sdw", "vor"],
		"vnd.stardivision.writer-global": "sgl",
		"vnd.sun.xml.calc": "sxc",
		"vnd.sun.xml.calc.template": "stc",
		"vnd.sun.xml.draw": "sxd",
		"vnd.sun.xml.draw.template": "std",
		"vnd.sun.xml.impress": "sxi",
		"vnd.sun.xml.impress.template": "sti",
		"vnd.sun.xml.math": "sxm",
		"vnd.sun.xml.writer": "sxw",
		"vnd.sun.xml.writer.global": "sxg",
		"vnd.sun.xml.writer.template": "stw",
		"vnd.symbian.install": ["sis", "sisx"],
		"vnd.visio": ["vsd", "vst", "vss", "vsw"],
		"vnd.wap.wbxml": "wbxml",
		"vnd.wap.wmlc": "wmlc",
		"vnd.wap.wmlscriptc": "wmlsc",
		"vnd.wordperfect": "wpd",
		"vnd.wordperfect5.1": "wp5",
		"x-123": "wk",
		"x-7z-compressed": "7z",
		"x-abiword": "abw",
		"x-apple-diskimage": "dmg",
		"x-bcpio": "bcpio",
		"x-bittorrent": "torrent",
		"x-cbr": ["cbr", "cba", "cbt", "cb7"],
		"x-cbz": "cbz",
		"x-cdf": ["cdf", "cda"],
		"x-cdlink": "vcd",
		"x-chess-pgn": "pgn",
		"x-cpio": "cpio",
		"x-csh": "csh",
		"x-debian-package": ["deb", "udeb"],
		"x-director": ["dcr", "dir", "dxr", "cst", "cct", "cxt", "w3d", "fgd", "swa"],
		"x-dms": "dms",
		"x-doom": "wad",
		"x-dvi": "dvi",
		"x-httpd-eruby": "rhtml",
		"x-font": "pcf.Z",
		"x-freemind": "mm",
		"x-gnumeric": "gnumeric",
		"x-go-sgf": "sgf",
		"x-graphing-calculator": "gcf",
		"x-gtar": ["gtar", "taz"],
		"x-hdf": "hdf",
		"x-httpd-php": ["phtml", "pht", "php"],
		"x-httpd-php-source": "phps",
		"x-httpd-php3": "php3",
		"x-httpd-php3-preprocessed": "php3p",
		"x-httpd-php4": "php4",
		"x-httpd-php5": "php5",
		"x-ica": "ica",
		"x-info": "info",
		"x-internet-signup": ["ins", "isp"],
		"x-iphone": "iii",
		"x-iso9660-image": "iso",
		"x-java-jnlp-file": "jnlp",
		"x-jmol": "jmz",
		"x-killustrator": "kil",
		"x-koan": ["skp", "skd", "skt", "skm"],
		"x-kpresenter": ["kpr", "kpt"],
		"x-kword": ["kwd", "kwt"],
		"x-latex": "latex",
		"x-lha": "lha",
		"x-lyx": "lyx",
		"x-lzh": "lzh",
		"x-lzx": "lzx",
		"x-maker": ["frm", "maker", "frame", "fm", "fb", "book", "fbdoc"],
		"x-ms-wmd": "wmd",
		"x-ms-wmz": "wmz",
		"x-msdos-program": ["com", "exe", "bat", "dll"],
		"x-msi": "msi",
		"x-netcdf": ["nc", "cdf"],
		"x-ns-proxy-autoconfig": ["pac", "dat"],
		"x-nwc": "nwc",
		"x-object": "o",
		"x-oz-application": "oza",
		"x-pkcs7-certreqresp": "p7r",
		"x-python-code": ["pyc", "pyo"],
		"x-qgis": ["qgs", "shp", "shx"],
		"x-quicktimeplayer": "qtl",
		"x-redhat-package-manager": "rpm",
		"x-ruby": "rb",
		"x-sh": "sh",
		"x-shar": "shar",
		"x-shockwave-flash": ["swf", "swfl"],
		"x-silverlight": "scr",
		"x-stuffit": "sit",
		"x-sv4cpio": "sv4cpio",
		"x-sv4crc": "sv4crc",
		"x-tar": "tar",
		"x-tcl": "tcl",
		"x-tex-gf": "gf",
		"x-tex-pk": "pk",
		"x-texinfo": ["texinfo", "texi"],
		"x-trash": ["~", "%", "bak", "old", "sik"],
		"x-troff": ["t", "tr", "roff"],
		"x-troff-man": "man",
		"x-troff-me": "me",
		"x-troff-ms": "ms",
		"x-ustar": "ustar",
		"x-wais-source": "src",
		"x-wingz": "wz",
		"x-x509-ca-cert": ["crt", "der", "cer"],
		"x-xcf": "xcf",
		"x-xfig": "fig",
		"x-xpinstall": "xpi",
		"applixware": "aw",
		"atomsvc+xml": "atomsvc",
		"ccxml+xml": "ccxml",
		"cdmi-capability": "cdmia",
		"cdmi-container": "cdmic",
		"cdmi-domain": "cdmid",
		"cdmi-object": "cdmio",
		"cdmi-queue": "cdmiq",
		"docbook+xml": "dbk",
		"dssc+der": "dssc",
		"dssc+xml": "xdssc",
		"emma+xml": "emma",
		"epub+zip": "epub",
		"exi": "exi",
		"font-tdpfr": "pfr",
		"gml+xml": "gml",
		"gpx+xml": "gpx",
		"gxf": "gxf",
		"hyperstudio": "stk",
		"inkml+xml": ["ink", "inkml"],
		"ipfix": "ipfix",
		"json": "json",
		"jsonml+json": "jsonml",
		"lost+xml": "lostxml",
		"mads+xml": "mads",
		"marc": "mrc",
		"marcxml+xml": "mrcx",
		"mathml+xml": "mathml",
		"mbox": "mbox",
		"mediaservercontrol+xml": "mscml",
		"metalink+xml": "metalink",
		"metalink4+xml": "meta4",
		"mets+xml": "mets",
		"mods+xml": "mods",
		"mp21": ["m21", "mp21"],
		"mp4": "mp4s",
		"oebps-package+xml": "opf",
		"omdoc+xml": "omdoc",
		"onenote": ["onetoc", "onetoc2", "onetmp", "onepkg"],
		"oxps": "oxps",
		"patch-ops-error+xml": "xer",
		"pgp-encrypted": "pgp",
		"pkcs10": "p10",
		"pkcs7-mime": ["p7m", "p7c"],
		"pkcs7-signature": "p7s",
		"pkcs8": "p8",
		"pkix-attr-cert": "ac",
		"pkix-crl": "crl",
		"pkix-pkipath": "pkipath",
		"pkixcmp": "pki",
		"pls+xml": "pls",
		"prs.cww": "cww",
		"pskc+xml": "pskcxml",
		"reginfo+xml": "rif",
		"relax-ng-compact-syntax": "rnc",
		"resource-lists+xml": "rl",
		"resource-lists-diff+xml": "rld",
		"rls-services+xml": "rs",
		"rpki-ghostbusters": "gbr",
		"rpki-manifest": "mft",
		"rpki-roa": "roa",
		"rsd+xml": "rsd",
		"sbml+xml": "sbml",
		"scvp-cv-request": "scq",
		"scvp-cv-response": "scs",
		"scvp-vp-request": "spq",
		"scvp-vp-response": "spp",
		"sdp": "sdp",
		"set-payment-initiation": "setpay",
		"set-registration-initiation": "setreg",
		"shf+xml": "shf",
		"sparql-query": "rq",
		"sparql-results+xml": "srx",
		"srgs": "gram",
		"srgs+xml": "grxml",
		"sru+xml": "sru",
		"ssdl+xml": "ssdl",
		"ssml+xml": "ssml",
		"tei+xml": ["tei", "teicorpus"],
		"thraud+xml": "tfi",
		"timestamped-data": "tsd",
		"vnd.3gpp.pic-bw-large": "plb",
		"vnd.3gpp.pic-bw-small": "psb",
		"vnd.3gpp.pic-bw-var": "pvb",
		"vnd.3gpp2.tcap": "tcap",
		"vnd.3m.post-it-notes": "pwn",
		"vnd.accpac.simply.aso": "aso",
		"vnd.accpac.simply.imp": "imp",
		"vnd.acucobol": "acu",
		"vnd.acucorp": ["atc", "acutc"],
		"vnd.adobe.air-application-installer-package+zip": "air",
		"vnd.adobe.formscentral.fcdt": "fcdt",
		"vnd.adobe.fxp": ["fxp", "fxpl"],
		"vnd.adobe.xdp+xml": "xdp",
		"vnd.adobe.xfdf": "xfdf",
		"vnd.ahead.space": "ahead",
		"vnd.airzip.filesecure.azf": "azf",
		"vnd.airzip.filesecure.azs": "azs",
		"vnd.amazon.ebook": "azw",
		"vnd.americandynamics.acc": "acc",
		"vnd.amiga.ami": "ami",
		"vnd.anser-web-certificate-issue-initiation": "cii",
		"vnd.anser-web-funds-transfer-initiation": "fti",
		"vnd.antix.game-component": "atx",
		"vnd.apple.installer+xml": "mpkg",
		"vnd.apple.mpegurl": "m3u8",
		"vnd.aristanetworks.swi": "swi",
		"vnd.astraea-software.iota": "iota",
		"vnd.audiograph": "aep",
		"vnd.blueice.multipass": "mpm",
		"vnd.bmi": "bmi",
		"vnd.businessobjects": "rep",
		"vnd.chemdraw+xml": "cdxml",
		"vnd.chipnuts.karaoke-mmd": "mmd",
		"vnd.claymore": "cla",
		"vnd.cloanto.rp9": "rp9",
		"vnd.clonk.c4group": ["c4g", "c4d", "c4f", "c4p", "c4u"],
		"vnd.cluetrust.cartomobile-config": "c11amc",
		"vnd.cluetrust.cartomobile-config-pkg": "c11amz",
		"vnd.commonspace": "csp",
		"vnd.contact.cmsg": "cdbcmsg",
		"vnd.cosmocaller": "cmc",
		"vnd.crick.clicker": "clkx",
		"vnd.crick.clicker.keyboard": "clkk",
		"vnd.crick.clicker.palette": "clkp",
		"vnd.crick.clicker.template": "clkt",
		"vnd.crick.clicker.wordbank": "clkw",
		"vnd.criticaltools.wbs+xml": "wbs",
		"vnd.ctc-posml": "pml",
		"vnd.cups-ppd": "ppd",
		"vnd.curl.car": "car",
		"vnd.curl.pcurl": "pcurl",
		"vnd.dart": "dart",
		"vnd.data-vision.rdz": "rdz",
		"vnd.dece.data": ["uvf", "uvvf", "uvd", "uvvd"],
		"vnd.dece.ttml+xml": ["uvt", "uvvt"],
		"vnd.dece.unspecified": ["uvx", "uvvx"],
		"vnd.dece.zip": ["uvz", "uvvz"],
		"vnd.denovo.fcselayout-link": "fe_launch",
		"vnd.dna": "dna",
		"vnd.dolby.mlp": "mlp",
		"vnd.dpgraph": "dpg",
		"vnd.dreamfactory": "dfac",
		"vnd.ds-keypoint": "kpxx",
		"vnd.dvb.ait": "ait",
		"vnd.dvb.service": "svc",
		"vnd.dynageo": "geo",
		"vnd.ecowin.chart": "mag",
		"vnd.enliven": "nml",
		"vnd.epson.esf": "esf",
		"vnd.epson.msf": "msf",
		"vnd.epson.quickanime": "qam",
		"vnd.epson.salt": "slt",
		"vnd.epson.ssf": "ssf",
		"vnd.eszigno3+xml": ["es3", "et3"],
		"vnd.ezpix-album": "ez2",
		"vnd.ezpix-package": "ez3",
		"vnd.fdf": "fdf",
		"vnd.fdsn.mseed": "mseed",
		"vnd.fdsn.seed": ["seed", "dataless"],
		"vnd.flographit": "gph",
		"vnd.fluxtime.clip": "ftc",
		"vnd.framemaker": ["fm", "frame", "maker", "book"],
		"vnd.frogans.fnc": "fnc",
		"vnd.frogans.ltf": "ltf",
		"vnd.fsc.weblaunch": "fsc",
		"vnd.fujitsu.oasys": "oas",
		"vnd.fujitsu.oasys2": "oa2",
		"vnd.fujitsu.oasys3": "oa3",
		"vnd.fujitsu.oasysgp": "fg5",
		"vnd.fujitsu.oasysprs": "bh2",
		"vnd.fujixerox.ddd": "ddd",
		"vnd.fujixerox.docuworks": "xdw",
		"vnd.fujixerox.docuworks.binder": "xbd",
		"vnd.fuzzysheet": "fzs",
		"vnd.genomatix.tuxedo": "txd",
		"vnd.geogebra.file": "ggb",
		"vnd.geogebra.tool": "ggt",
		"vnd.geometry-explorer": ["gex", "gre"],
		"vnd.geonext": "gxt",
		"vnd.geoplan": "g2w",
		"vnd.geospace": "g3w",
		"vnd.gmx": "gmx",
		"vnd.grafeq": ["gqf", "gqs"],
		"vnd.groove-account": "gac",
		"vnd.groove-help": "ghf",
		"vnd.groove-identity-message": "gim",
		"vnd.groove-injector": "grv",
		"vnd.groove-tool-message": "gtm",
		"vnd.groove-tool-template": "tpl",
		"vnd.groove-vcard": "vcg",
		"vnd.hal+xml": "hal",
		"vnd.handheld-entertainment+xml": "zmm",
		"vnd.hbci": "hbci",
		"vnd.hhe.lesson-player": "les",
		"vnd.hp-hpgl": "hpgl",
		"vnd.hp-hpid": "hpid",
		"vnd.hp-hps": "hps",
		"vnd.hp-jlyt": "jlt",
		"vnd.hp-pcl": "pcl",
		"vnd.hp-pclxl": "pclxl",
		"vnd.hydrostatix.sof-data": "sfd-hdstx",
		"vnd.ibm.minipay": "mpy",
		"vnd.ibm.modcap": ["afp", "listafp", "list3820"],
		"vnd.ibm.rights-management": "irm",
		"vnd.ibm.secure-container": "sc",
		"vnd.iccprofile": ["icc", "icm"],
		"vnd.igloader": "igl",
		"vnd.immervision-ivp": "ivp",
		"vnd.immervision-ivu": "ivu",
		"vnd.insors.igm": "igm",
		"vnd.intercon.formnet": ["xpw", "xpx"],
		"vnd.intergeo": "i2g",
		"vnd.intu.qbo": "qbo",
		"vnd.intu.qfx": "qfx",
		"vnd.ipunplugged.rcprofile": "rcprofile",
		"vnd.irepository.package+xml": "irp",
		"vnd.is-xpr": "xpr",
		"vnd.isac.fcs": "fcs",
		"vnd.jam": "jam",
		"vnd.jcp.javame.midlet-rms": "rms",
		"vnd.jisp": "jisp",
		"vnd.joost.joda-archive": "joda",
		"vnd.kahootz": ["ktz", "ktr"],
		"vnd.kde.karbon": "karbon",
		"vnd.kde.kchart": "chrt",
		"vnd.kde.kformula": "kfo",
		"vnd.kde.kivio": "flw",
		"vnd.kde.kontour": "kon",
		"vnd.kde.kpresenter": ["kpr", "kpt"],
		"vnd.kde.kspread": "ksp",
		"vnd.kde.kword": ["kwd", "kwt"],
		"vnd.kenameaapp": "htke",
		"vnd.kidspiration": "kia",
		"vnd.kinar": ["kne", "knp"],
		"vnd.koan": ["skp", "skd", "skt", "skm"],
		"vnd.kodak-descriptor": "sse",
		"vnd.las.las+xml": "lasxml",
		"vnd.llamagraphics.life-balance.desktop": "lbd",
		"vnd.llamagraphics.life-balance.exchange+xml": "lbe",
		"vnd.lotus-1-2-3": "123",
		"vnd.lotus-approach": "apr",
		"vnd.lotus-freelance": "pre",
		"vnd.lotus-notes": "nsf",
		"vnd.lotus-organizer": "org",
		"vnd.lotus-screencam": "scm",
		"vnd.lotus-wordpro": "lwp",
		"vnd.macports.portpkg": "portpkg",
		"vnd.mcd": "mcd",
		"vnd.medcalcdata": "mc1",
		"vnd.mediastation.cdkey": "cdkey",
		"vnd.mfer": "mwf",
		"vnd.mfmp": "mfm",
		"vnd.micrografx.flo": "flo",
		"vnd.micrografx.igx": "igx",
		"vnd.mif": "mif",
		"vnd.mobius.daf": "daf",
		"vnd.mobius.dis": "dis",
		"vnd.mobius.mbk": "mbk",
		"vnd.mobius.mqy": "mqy",
		"vnd.mobius.msl": "msl",
		"vnd.mobius.plc": "plc",
		"vnd.mobius.txf": "txf",
		"vnd.mophun.application": "mpn",
		"vnd.mophun.certificate": "mpc",
		"vnd.ms-artgalry": "cil",
		"vnd.ms-cab-compressed": "cab",
		"vnd.ms-excel.addin.macroenabled.12": "xlam",
		"vnd.ms-excel.sheet.binary.macroenabled.12": "xlsb",
		"vnd.ms-excel.sheet.macroenabled.12": "xlsm",
		"vnd.ms-excel.template.macroenabled.12": "xltm",
		"vnd.ms-fontobject": "eot",
		"vnd.ms-htmlhelp": "chm",
		"vnd.ms-ims": "ims",
		"vnd.ms-lrm": "lrm",
		"vnd.ms-officetheme": "thmx",
		"vnd.ms-powerpoint.addin.macroenabled.12": "ppam",
		"vnd.ms-powerpoint.presentation.macroenabled.12": "pptm",
		"vnd.ms-powerpoint.slide.macroenabled.12": "sldm",
		"vnd.ms-powerpoint.slideshow.macroenabled.12": "ppsm",
		"vnd.ms-powerpoint.template.macroenabled.12": "potm",
		"vnd.ms-project": ["mpp", "mpt"],
		"vnd.ms-word.document.macroenabled.12": "docm",
		"vnd.ms-word.template.macroenabled.12": "dotm",
		"vnd.ms-works": ["wps", "wks", "wcm", "wdb"],
		"vnd.ms-wpl": "wpl",
		"vnd.ms-xpsdocument": "xps",
		"vnd.mseq": "mseq",
		"vnd.musician": "mus",
		"vnd.muvee.style": "msty",
		"vnd.mynfc": "taglet",
		"vnd.neurolanguage.nlu": "nlu",
		"vnd.nitf": ["ntf", "nitf"],
		"vnd.noblenet-directory": "nnd",
		"vnd.noblenet-sealer": "nns",
		"vnd.noblenet-web": "nnw",
		"vnd.nokia.n-gage.data": "ngdat",
		"vnd.nokia.n-gage.symbian.install": "n-gage",
		"vnd.nokia.radio-preset": "rpst",
		"vnd.nokia.radio-presets": "rpss",
		"vnd.novadigm.edm": "edm",
		"vnd.novadigm.edx": "edx",
		"vnd.novadigm.ext": "ext",
		"vnd.oasis.opendocument.chart-template": "otc",
		"vnd.oasis.opendocument.formula-template": "odft",
		"vnd.oasis.opendocument.image-template": "oti",
		"vnd.olpc-sugar": "xo",
		"vnd.oma.dd2+xml": "dd2",
		"vnd.openofficeorg.extension": "oxt",
		"vnd.openxmlformats-officedocument.presentationml.slide": "sldx",
		"vnd.osgeo.mapguide.package": "mgp",
		"vnd.osgi.dp": "dp",
		"vnd.osgi.subsystem": "esa",
		"vnd.palm": ["pdb", "pqa", "oprc"],
		"vnd.pawaafile": "paw",
		"vnd.pg.format": "str",
		"vnd.pg.osasli": "ei6",
		"vnd.picsel": "efif",
		"vnd.pmi.widget": "wg",
		"vnd.pocketlearn": "plf",
		"vnd.powerbuilder6": "pbd",
		"vnd.previewsystems.box": "box",
		"vnd.proteus.magazine": "mgz",
		"vnd.publishare-delta-tree": "qps",
		"vnd.pvi.ptid1": "ptid",
		"vnd.quark.quarkxpress": ["qxd", "qxt", "qwd", "qwt", "qxl", "qxb"],
		"vnd.realvnc.bed": "bed",
		"vnd.recordare.musicxml": "mxl",
		"vnd.recordare.musicxml+xml": "musicxml",
		"vnd.rig.cryptonote": "cryptonote",
		"vnd.rn-realmedia": "rm",
		"vnd.rn-realmedia-vbr": "rmvb",
		"vnd.route66.link66+xml": "link66",
		"vnd.sailingtracker.track": "st",
		"vnd.seemail": "see",
		"vnd.sema": "sema",
		"vnd.semd": "semd",
		"vnd.semf": "semf",
		"vnd.shana.informed.formdata": "ifm",
		"vnd.shana.informed.formtemplate": "itp",
		"vnd.shana.informed.interchange": "iif",
		"vnd.shana.informed.package": "ipk",
		"vnd.simtech-mindmapper": ["twd", "twds"],
		"vnd.smart.teacher": "teacher",
		"vnd.solent.sdkm+xml": ["sdkm", "sdkd"],
		"vnd.spotfire.dxp": "dxp",
		"vnd.spotfire.sfs": "sfs",
		"vnd.stepmania.package": "smzip",
		"vnd.stepmania.stepchart": "sm",
		"vnd.sus-calendar": ["sus", "susp"],
		"vnd.svd": "svd",
		"vnd.syncml+xml": "xsm",
		"vnd.syncml.dm+wbxml": "bdm",
		"vnd.syncml.dm+xml": "xdm",
		"vnd.tao.intent-module-archive": "tao",
		"vnd.tcpdump.pcap": ["pcap", "cap", "dmp"],
		"vnd.tmobile-livetv": "tmo",
		"vnd.trid.tpt": "tpt",
		"vnd.triscape.mxs": "mxs",
		"vnd.trueapp": "tra",
		"vnd.ufdl": ["ufd", "ufdl"],
		"vnd.uiq.theme": "utz",
		"vnd.umajin": "umj",
		"vnd.unity": "unityweb",
		"vnd.uoml+xml": "uoml",
		"vnd.vcx": "vcx",
		"vnd.visionary": "vis",
		"vnd.vsf": "vsf",
		"vnd.webturbo": "wtb",
		"vnd.wolfram.player": "nbp",
		"vnd.wqd": "wqd",
		"vnd.wt.stf": "stf",
		"vnd.xara": "xar",
		"vnd.xfdl": "xfdl",
		"vnd.yamaha.hv-dic": "hvd",
		"vnd.yamaha.hv-script": "hvs",
		"vnd.yamaha.hv-voice": "hvp",
		"vnd.yamaha.openscoreformat": "osf",
		"vnd.yamaha.openscoreformat.osfpvg+xml": "osfpvg",
		"vnd.yamaha.smaf-audio": "saf",
		"vnd.yamaha.smaf-phrase": "spf",
		"vnd.yellowriver-custom-menu": "cmp",
		"vnd.zul": ["zir", "zirz"],
		"vnd.zzazz.deck+xml": "zaz",
		"voicexml+xml": "vxml",
		"widget": "wgt",
		"winhlp": "hlp",
		"wsdl+xml": "wsdl",
		"wspolicy+xml": "wspolicy",
		"x-ace-compressed": "ace",
		"x-authorware-bin": ["aab", "x32", "u32", "vox"],
		"x-authorware-map": "aam",
		"x-authorware-seg": "aas",
		"x-blorb": ["blb", "blorb"],
		"x-bzip": "bz",
		"x-bzip2": ["bz2", "boz"],
		"x-cfs-compressed": "cfs",
		"x-chat": "chat",
		"x-conference": "nsc",
		"x-dgc-compressed": "dgc",
		"x-dtbncx+xml": "ncx",
		"x-dtbook+xml": "dtb",
		"x-dtbresource+xml": "res",
		"x-eva": "eva",
		"x-font-bdf": "bdf",
		"x-font-ghostscript": "gsf",
		"x-font-linux-psf": "psf",
		"x-font-otf": "otf",
		"x-font-pcf": "pcf",
		"x-font-snf": "snf",
		"x-font-ttf": ["ttf", "ttc"],
		"x-font-type1": ["pfa", "pfb", "pfm", "afm"],
		"x-font-woff": "woff",
		"x-freearc": "arc",
		"x-gca-compressed": "gca",
		"x-glulx": "ulx",
		"x-gramps-xml": "gramps",
		"x-install-instructions": "install",
		"x-lzh-compressed": ["lzh", "lha"],
		"x-mie": "mie",
		"x-mobipocket-ebook": ["prc", "mobi"],
		"x-ms-application": "application",
		"x-ms-shortcut": "lnk",
		"x-ms-xbap": "xbap",
		"x-msbinder": "obd",
		"x-mscardfile": "crd",
		"x-msclip": "clp",
		"x-msdownload": ["exe", "dll", "com", "bat", "msi"],
		"x-msmediaview": ["mvb", "m13", "m14"],
		"x-msmetafile": ["wmf", "wmz", "emf", "emz"],
		"x-msmoney": "mny",
		"x-mspublisher": "pub",
		"x-msschedule": "scd",
		"x-msterminal": "trm",
		"x-mswrite": "wri",
		"x-nzb": "nzb",
		"x-pkcs12": ["p12", "pfx"],
		"x-pkcs7-certificates": ["p7b", "spc"],
		"x-research-info-systems": "ris",
		"x-silverlight-app": "xap",
		"x-sql": "sql",
		"x-stuffitx": "sitx",
		"x-subrip": "srt",
		"x-t3vm-image": "t3",
		"x-tads": "gam",
		"x-tex": "tex",
		"x-tex-tfm": "tfm",
		"x-tgif": "obj",
		"x-xliff+xml": "xlf",
		"x-xz": "xz",
		"x-zmachine": ["z1", "z2", "z3", "z4", "z5", "z6", "z7", "z8"],
		"xaml+xml": "xaml",
		"xcap-diff+xml": "xdf",
		"xenc+xml": "xenc",
		"xml-dtd": "dtd",
		"xop+xml": "xop",
		"xproc+xml": "xpl",
		"xslt+xml": "xslt",
		"xv+xml": ["mxml", "xhvml", "xvml", "xvm"],
		"yang": "yang",
		"yin+xml": "yin",
		"envoy": "evy",
		"fractals": "fif",
		"internet-property-stream": "acx",
		"olescript": "axs",
		"vnd.ms-outlook": "msg",
		"vnd.ms-pkicertstore": "sst",
		"x-compress": "z",
		"x-compressed": "tgz",
		"x-gzip": "gz",
		"x-perfmon": ["pma", "pmc", "pml", "pmr", "pmw"],
		"x-pkcs7-mime": ["p7c", "p7m"],
		"ynd.ms-pkipko": "pko"
	},
	"audio": {
		"amr": "amr",
		"amr-wb": "awb",
		"annodex": "axa",
		"basic": ["au", "snd"],
		"flac": "flac",
		"midi": ["mid", "midi", "kar", "rmi"],
		"mpeg": ["mpga", "mpega", "mp2", "mp3", "m4a", "mp2a", "m2a", "m3a"],
		"mpegurl": "m3u",
		"ogg": ["oga", "ogg", "spx"],
		"prs.sid": "sid",
		"x-aiff": ["aif", "aiff", "aifc"],
		"x-gsm": "gsm",
		"x-ms-wma": "wma",
		"x-ms-wax": "wax",
		"x-pn-realaudio": "ram",
		"x-realaudio": "ra",
		"x-sd2": "sd2",
		"x-wav": "wav",
		"adpcm": "adp",
		"mp4": "mp4a",
		"s3m": "s3m",
		"silk": "sil",
		"vnd.dece.audio": ["uva", "uvva"],
		"vnd.digital-winds": "eol",
		"vnd.dra": "dra",
		"vnd.dts": "dts",
		"vnd.dts.hd": "dtshd",
		"vnd.lucent.voice": "lvp",
		"vnd.ms-playready.media.pya": "pya",
		"vnd.nuera.ecelp4800": "ecelp4800",
		"vnd.nuera.ecelp7470": "ecelp7470",
		"vnd.nuera.ecelp9600": "ecelp9600",
		"vnd.rip": "rip",
		"webm": "weba",
		"x-aac": "aac",
		"x-caf": "caf",
		"x-matroska": "mka",
		"x-pn-realaudio-plugin": "rmp",
		"xm": "xm",
		"mid": ["mid", "rmi"]
	},
	"chemical": {
		"x-alchemy": "alc",
		"x-cache": ["cac", "cache"],
		"x-cache-csf": "csf",
		"x-cactvs-binary": ["cbin", "cascii", "ctab"],
		"x-cdx": "cdx",
		"x-chem3d": "c3d",
		"x-cif": "cif",
		"x-cmdf": "cmdf",
		"x-cml": "cml",
		"x-compass": "cpa",
		"x-crossfire": "bsd",
		"x-csml": ["csml", "csm"],
		"x-ctx": "ctx",
		"x-cxf": ["cxf", "cef"],
		"x-embl-dl-nucleotide": ["emb", "embl"],
		"x-gamess-input": ["inp", "gam", "gamin"],
		"x-gaussian-checkpoint": ["fch", "fchk"],
		"x-gaussian-cube": "cub",
		"x-gaussian-input": ["gau", "gjc", "gjf"],
		"x-gaussian-log": "gal",
		"x-gcg8-sequence": "gcg",
		"x-genbank": "gen",
		"x-hin": "hin",
		"x-isostar": ["istr", "ist"],
		"x-jcamp-dx": ["jdx", "dx"],
		"x-kinemage": "kin",
		"x-macmolecule": "mcm",
		"x-macromodel-input": ["mmd", "mmod"],
		"x-mdl-molfile": "mol",
		"x-mdl-rdfile": "rd",
		"x-mdl-rxnfile": "rxn",
		"x-mdl-sdfile": ["sd", "sdf"],
		"x-mdl-tgf": "tgf",
		"x-mmcif": "mcif",
		"x-mol2": "mol2",
		"x-molconn-Z": "b",
		"x-mopac-graph": "gpt",
		"x-mopac-input": ["mop", "mopcrt", "mpc", "zmt"],
		"x-mopac-out": "moo",
		"x-ncbi-asn1": "asn",
		"x-ncbi-asn1-ascii": ["prt", "ent"],
		"x-ncbi-asn1-binary": ["val", "aso"],
		"x-pdb": ["pdb", "ent"],
		"x-rosdal": "ros",
		"x-swissprot": "sw",
		"x-vamas-iso14976": "vms",
		"x-vmd": "vmd",
		"x-xtel": "xtel",
		"x-xyz": "xyz"
	},
	"image": {
		"gif": "gif",
		"ief": "ief",
		"jpeg": ["jpeg", "jpg", "jpe"],
		"pcx": "pcx",
		"png": "png",
		"svg+xml": ["svg", "svgz"],
		"tiff": ["tiff", "tif"],
		"vnd.djvu": ["djvu", "djv"],
		"vnd.wap.wbmp": "wbmp",
		"x-canon-cr2": "cr2",
		"x-canon-crw": "crw",
		"x-cmu-raster": "ras",
		"x-coreldraw": "cdr",
		"x-coreldrawpattern": "pat",
		"x-coreldrawtemplate": "cdt",
		"x-corelphotopaint": "cpt",
		"x-epson-erf": "erf",
		"x-icon": "ico",
		"x-jg": "art",
		"x-jng": "jng",
		"x-nikon-nef": "nef",
		"x-olympus-orf": "orf",
		"x-photoshop": "psd",
		"x-portable-anymap": "pnm",
		"x-portable-bitmap": "pbm",
		"x-portable-graymap": "pgm",
		"x-portable-pixmap": "ppm",
		"x-rgb": "rgb",
		"x-xbitmap": "xbm",
		"x-xpixmap": "xpm",
		"x-xwindowdump": "xwd",
		"bmp": "bmp",
		"cgm": "cgm",
		"g3fax": "g3",
		"ktx": "ktx",
		"prs.btif": "btif",
		"sgi": "sgi",
		"vnd.dece.graphic": ["uvi", "uvvi", "uvg", "uvvg"],
		"vnd.dwg": "dwg",
		"vnd.dxf": "dxf",
		"vnd.fastbidsheet": "fbs",
		"vnd.fpx": "fpx",
		"vnd.fst": "fst",
		"vnd.fujixerox.edmics-mmr": "mmr",
		"vnd.fujixerox.edmics-rlc": "rlc",
		"vnd.ms-modi": "mdi",
		"vnd.ms-photo": "wdp",
		"vnd.net-fpx": "npx",
		"vnd.xiff": "xif",
		"webp": "webp",
		"x-3ds": "3ds",
		"x-cmx": "cmx",
		"x-freehand": ["fh", "fhc", "fh4", "fh5", "fh7"],
		"x-pict": ["pic", "pct"],
		"x-tga": "tga",
		"cis-cod": "cod",
		"pipeg": "jfif"
	},
	"message": {
		"rfc822": ["eml", "mime", "mht", "mhtml", "nws"]
	},
	"model": {
		"iges": ["igs", "iges"],
		"mesh": ["msh", "mesh", "silo"],
		"vrml": ["wrl", "vrml"],
		"x3d+vrml": ["x3dv", "x3dvz"],
		"x3d+xml": ["x3d", "x3dz"],
		"x3d+binary": ["x3db", "x3dbz"],
		"vnd.collada+xml": "dae",
		"vnd.dwf": "dwf",
		"vnd.gdl": "gdl",
		"vnd.gtw": "gtw",
		"vnd.mts": "mts",
		"vnd.vtu": "vtu"
	},
	"text": {
		"cache-manifest": ["manifest", "appcache"],
		"calendar": ["ics", "icz", "ifb"],
		"css": "css",
		"csv": "csv",
		"h323": "323",
		"html": ["html", "htm", "shtml", "stm"],
		"iuls": "uls",
		"mathml": "mml",
		"plain": ["txt", "text", "brf", "conf", "def", "list", "log", "in", "bas"],
		"richtext": "rtx",
		"scriptlet": ["sct", "wsc"],
		"texmacs": ["tm", "ts"],
		"tab-separated-values": "tsv",
		"vnd.sun.j2me.app-descriptor": "jad",
		"vnd.wap.wml": "wml",
		"vnd.wap.wmlscript": "wmls",
		"x-bibtex": "bib",
		"x-boo": "boo",
		"x-c++hdr": ["h++", "hpp", "hxx", "hh"],
		"x-c++src": ["c++", "cpp", "cxx", "cc"],
		"x-component": "htc",
		"x-dsrc": "d",
		"x-diff": ["diff", "patch"],
		"x-haskell": "hs",
		"x-java": "java",
		"x-literate-haskell": "lhs",
		"x-moc": "moc",
		"x-pascal": ["p", "pas"],
		"x-pcs-gcd": "gcd",
		"x-perl": ["pl", "pm"],
		"x-python": "py",
		"x-scala": "scala",
		"x-setext": "etx",
		"x-tcl": ["tcl", "tk"],
		"x-tex": ["tex", "ltx", "sty", "cls"],
		"x-vcalendar": "vcs",
		"x-vcard": "vcf",
		"n3": "n3",
		"prs.lines.tag": "dsc",
		"sgml": ["sgml", "sgm"],
		"troff": ["t", "tr", "roff", "man", "me", "ms"],
		"turtle": "ttl",
		"uri-list": ["uri", "uris", "urls"],
		"vcard": "vcard",
		"vnd.curl": "curl",
		"vnd.curl.dcurl": "dcurl",
		"vnd.curl.scurl": "scurl",
		"vnd.curl.mcurl": "mcurl",
		"vnd.dvb.subtitle": "sub",
		"vnd.fly": "fly",
		"vnd.fmi.flexstor": "flx",
		"vnd.graphviz": "gv",
		"vnd.in3d.3dml": "3dml",
		"vnd.in3d.spot": "spot",
		"x-asm": ["s", "asm"],
		"x-c": ["c", "cc", "cxx", "cpp", "h", "hh", "dic"],
		"x-fortran": ["f", "for", "f77", "f90"],
		"x-opml": "opml",
		"x-nfo": "nfo",
		"x-sfv": "sfv",
		"x-uuencode": "uu",
		"webviewhtml": "htt"
	},
	"video": {
		"avif": ".avif",
		"3gpp": "3gp",
		"annodex": "axv",
		"dl": "dl",
		"dv": ["dif", "dv"],
		"fli": "fli",
		"gl": "gl",
		"mpeg": ["mpeg", "mpg", "mpe", "m1v", "m2v", "mp2", "mpa", "mpv2"],
		"mp4": ["mp4", "mp4v", "mpg4"],
		"quicktime": ["qt", "mov"],
		"ogg": "ogv",
		"vnd.mpegurl": ["mxu", "m4u"],
		"x-flv": "flv",
		"x-la-asf": ["lsf", "lsx"],
		"x-mng": "mng",
		"x-ms-asf": ["asf", "asx", "asr"],
		"x-ms-wm": "wm",
		"x-ms-wmv": "wmv",
		"x-ms-wmx": "wmx",
		"x-ms-wvx": "wvx",
		"x-msvideo": "avi",
		"x-sgi-movie": "movie",
		"x-matroska": ["mpv", "mkv", "mk3d", "mks"],
		"3gpp2": "3g2",
		"h261": "h261",
		"h263": "h263",
		"h264": "h264",
		"jpeg": "jpgv",
		"jpm": ["jpm", "jpgm"],
		"mj2": ["mj2", "mjp2"],
		"vnd.dece.hd": ["uvh", "uvvh"],
		"vnd.dece.mobile": ["uvm", "uvvm"],
		"vnd.dece.pd": ["uvp", "uvvp"],
		"vnd.dece.sd": ["uvs", "uvvs"],
		"vnd.dece.video": ["uvv", "uvvv"],
		"vnd.dvb.file": "dvb",
		"vnd.fvt": "fvt",
		"vnd.ms-playready.media.pyv": "pyv",
		"vnd.uvvu.mp4": ["uvu", "uvvu"],
		"vnd.vivo": "viv",
		"webm": "webm",
		"x-f4v": "f4v",
		"x-m4v": "m4v",
		"x-ms-vob": "vob",
		"x-smv": "smv"
	},
	"x-conference": {
		"x-cooltalk": "ice"
	},
	"x-world": {
		"x-vrml": ["vrm", "vrml", "wrl", "flr", "wrz", "xaf", "xof"]
	}
};

(() => {
	const mimeTypes = {};
	for (const type in table$1) {
		// eslint-disable-next-line no-prototype-builtins
		if (table$1.hasOwnProperty(type)) {
			for (const subtype in table$1[type]) {
				// eslint-disable-next-line no-prototype-builtins
				if (table$1[type].hasOwnProperty(subtype)) {
					const value = table$1[type][subtype];
					if (typeof value == "string") {
						mimeTypes[value] = type + "/" + subtype;
					} else {
						for (let indexMimeType = 0; indexMimeType < value.length; indexMimeType++) {
							mimeTypes[value[indexMimeType]] = type + "/" + subtype;
						}
					}
				}
			}
		}
	}
	return mimeTypes;
})();

/*
 Copyright (c) 2022 Gildas Lormeau. All rights reserved.

 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions are met:

 1. Redistributions of source code must retain the above copyright notice,
 this list of conditions and the following disclaimer.

 2. Redistributions in binary form must reproduce the above copyright 
 notice, this list of conditions and the following disclaimer in 
 the documentation and/or other materials provided with the distribution.

 3. The names of the authors may not be used to endorse or promote products
 derived from this software without specific prior written permission.

 THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESSED OR IMPLIED WARRANTIES,
 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JCRAFT,
 INC. OR ANY CONTRIBUTORS TO THIS SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT,
 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
 OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

const table = [];
for (let i = 0; i < 256; i++) {
	let t = i;
	for (let j = 0; j < 8; j++) {
		if (t & 1) {
			t = (t >>> 1) ^ 0xEDB88320;
		} else {
			t = t >>> 1;
		}
	}
	table[i] = t;
}

class Crc32 {

	constructor(crc) {
		this.crc = crc || -1;
	}

	append(data) {
		let crc = this.crc | 0;
		for (let offset = 0, length = data.length | 0; offset < length; offset++) {
			crc = (crc >>> 8) ^ table[(crc ^ data[offset]) & 0xFF];
		}
		this.crc = crc;
	}

	get() {
		return ~this.crc;
	}
}

/*
 Copyright (c) 2022 Gildas Lormeau. All rights reserved.

 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions are met:

 1. Redistributions of source code must retain the above copyright notice,
 this list of conditions and the following disclaimer.

 2. Redistributions in binary form must reproduce the above copyright 
 notice, this list of conditions and the following disclaimer in 
 the documentation and/or other materials provided with the distribution.

 3. The names of the authors may not be used to endorse or promote products
 derived from this software without specific prior written permission.

 THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESSED OR IMPLIED WARRANTIES,
 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JCRAFT,
 INC. OR ANY CONTRIBUTORS TO THIS SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT,
 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
 OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

class Crc32Stream extends TransformStream {

	constructor() {
		const crc32 = new Crc32();
		super({
			transform(chunk) {
				crc32.append(chunk);
			},
			flush(controller) {
				const value = new Uint8Array(4);
				const dataView = new DataView(value.buffer);
				dataView.setUint32(0, crc32.get());
				controller.enqueue(value);
			}
		});
	}
}

/*
 Copyright (c) 2022 Gildas Lormeau. All rights reserved.

 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions are met:

 1. Redistributions of source code must retain the above copyright notice,
 this list of conditions and the following disclaimer.

 2. Redistributions in binary form must reproduce the above copyright 
 notice, this list of conditions and the following disclaimer in 
 the documentation and/or other materials provided with the distribution.

 3. The names of the authors may not be used to endorse or promote products
 derived from this software without specific prior written permission.

 THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESSED OR IMPLIED WARRANTIES,
 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JCRAFT,
 INC. OR ANY CONTRIBUTORS TO THIS SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT,
 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
 OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

function encodeText(value) {
	if (typeof TextEncoder == "undefined") {
		value = unescape(encodeURIComponent(value));
		const result = new Uint8Array(value.length);
		for (let i = 0; i < result.length; i++) {
			result[i] = value.charCodeAt(i);
		}
		return result;
	} else {
		return new TextEncoder().encode(value);
	}
}

// Derived from https://github.com/xqdoo00o/jszip/blob/master/lib/sjcl.js and https://github.com/bitwiseshiftleft/sjcl

// deno-lint-ignore-file no-this-alias

/*
 * SJCL is open. You can use, modify and redistribute it under a BSD
 * license or under the GNU GPL, version 2.0.
 */

/** @fileOverview Javascript cryptography implementation.
 *
 * Crush to remove comments, shorten variable names and
 * generally reduce transmission size.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */

/*jslint indent: 2, bitwise: false, nomen: false, plusplus: false, white: false, regexp: false */

/** @fileOverview Arrays of bits, encoded as arrays of Numbers.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */

/**
 * Arrays of bits, encoded as arrays of Numbers.
 * @namespace
 * @description
 * <p>
 * These objects are the currency accepted by SJCL's crypto functions.
 * </p>
 *
 * <p>
 * Most of our crypto primitives operate on arrays of 4-byte words internally,
 * but many of them can take arguments that are not a multiple of 4 bytes.
 * This library encodes arrays of bits (whose size need not be a multiple of 8
 * bits) as arrays of 32-bit words.  The bits are packed, big-endian, into an
 * array of words, 32 bits at a time.  Since the words are double-precision
 * floating point numbers, they fit some extra data.  We use this (in a private,
 * possibly-changing manner) to encode the number of bits actually  present
 * in the last word of the array.
 * </p>
 *
 * <p>
 * Because bitwise ops clear this out-of-band data, these arrays can be passed
 * to ciphers like AES which want arrays of words.
 * </p>
 */
const bitArray = {
	/**
	 * Concatenate two bit arrays.
	 * @param {bitArray} a1 The first array.
	 * @param {bitArray} a2 The second array.
	 * @return {bitArray} The concatenation of a1 and a2.
	 */
	concat(a1, a2) {
		if (a1.length === 0 || a2.length === 0) {
			return a1.concat(a2);
		}

		const last = a1[a1.length - 1], shift = bitArray.getPartial(last);
		if (shift === 32) {
			return a1.concat(a2);
		} else {
			return bitArray._shiftRight(a2, shift, last | 0, a1.slice(0, a1.length - 1));
		}
	},

	/**
	 * Find the length of an array of bits.
	 * @param {bitArray} a The array.
	 * @return {Number} The length of a, in bits.
	 */
	bitLength(a) {
		const l = a.length;
		if (l === 0) {
			return 0;
		}
		const x = a[l - 1];
		return (l - 1) * 32 + bitArray.getPartial(x);
	},

	/**
	 * Truncate an array.
	 * @param {bitArray} a The array.
	 * @param {Number} len The length to truncate to, in bits.
	 * @return {bitArray} A new array, truncated to len bits.
	 */
	clamp(a, len) {
		if (a.length * 32 < len) {
			return a;
		}
		a = a.slice(0, Math.ceil(len / 32));
		const l = a.length;
		len = len & 31;
		if (l > 0 && len) {
			a[l - 1] = bitArray.partial(len, a[l - 1] & 0x80000000 >> (len - 1), 1);
		}
		return a;
	},

	/**
	 * Make a partial word for a bit array.
	 * @param {Number} len The number of bits in the word.
	 * @param {Number} x The bits.
	 * @param {Number} [_end=0] Pass 1 if x has already been shifted to the high side.
	 * @return {Number} The partial word.
	 */
	partial(len, x, _end) {
		if (len === 32) {
			return x;
		}
		return (_end ? x | 0 : x << (32 - len)) + len * 0x10000000000;
	},

	/**
	 * Get the number of bits used by a partial word.
	 * @param {Number} x The partial word.
	 * @return {Number} The number of bits used by the partial word.
	 */
	getPartial(x) {
		return Math.round(x / 0x10000000000) || 32;
	},

	/** Shift an array right.
	 * @param {bitArray} a The array to shift.
	 * @param {Number} shift The number of bits to shift.
	 * @param {Number} [carry=0] A byte to carry in
	 * @param {bitArray} [out=[]] An array to prepend to the output.
	 * @private
	 */
	_shiftRight(a, shift, carry, out) {
		if (out === undefined) {
			out = [];
		}

		for (; shift >= 32; shift -= 32) {
			out.push(carry);
			carry = 0;
		}
		if (shift === 0) {
			return out.concat(a);
		}

		for (let i = 0; i < a.length; i++) {
			out.push(carry | a[i] >>> shift);
			carry = a[i] << (32 - shift);
		}
		const last2 = a.length ? a[a.length - 1] : 0;
		const shift2 = bitArray.getPartial(last2);
		out.push(bitArray.partial(shift + shift2 & 31, (shift + shift2 > 32) ? carry : out.pop(), 1));
		return out;
	}
};

/** @fileOverview Bit array codec implementations.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */

/**
 * Arrays of bytes
 * @namespace
 */
const codec = {
	bytes: {
		/** Convert from a bitArray to an array of bytes. */
		fromBits(arr) {
			const bl = bitArray.bitLength(arr);
			const byteLength = bl / 8;
			const out = new Uint8Array(byteLength);
			let tmp;
			for (let i = 0; i < byteLength; i++) {
				if ((i & 3) === 0) {
					tmp = arr[i / 4];
				}
				out[i] = tmp >>> 24;
				tmp <<= 8;
			}
			return out;
		},
		/** Convert from an array of bytes to a bitArray. */
		toBits(bytes) {
			const out = [];
			let i;
			let tmp = 0;
			for (i = 0; i < bytes.length; i++) {
				tmp = tmp << 8 | bytes[i];
				if ((i & 3) === 3) {
					out.push(tmp);
					tmp = 0;
				}
			}
			if (i & 3) {
				out.push(bitArray.partial(8 * (i & 3), tmp));
			}
			return out;
		}
	}
};

const hash = {};

/**
 * Context for a SHA-1 operation in progress.
 * @constructor
 */
hash.sha1 = class {
	constructor(hash) {
		const sha1 = this;
		/**
		 * The hash's block size, in bits.
		 * @constant
		 */
		sha1.blockSize = 512;
		/**
		 * The SHA-1 initialization vector.
		 * @private
		 */
		sha1._init = [0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0xC3D2E1F0];
		/**
		 * The SHA-1 hash key.
		 * @private
		 */
		sha1._key = [0x5A827999, 0x6ED9EBA1, 0x8F1BBCDC, 0xCA62C1D6];
		if (hash) {
			sha1._h = hash._h.slice(0);
			sha1._buffer = hash._buffer.slice(0);
			sha1._length = hash._length;
		} else {
			sha1.reset();
		}
	}

	/**
	 * Reset the hash state.
	 * @return this
	 */
	reset() {
		const sha1 = this;
		sha1._h = sha1._init.slice(0);
		sha1._buffer = [];
		sha1._length = 0;
		return sha1;
	}

	/**
	 * Input several words to the hash.
	 * @param {bitArray|String} data the data to hash.
	 * @return this
	 */
	update(data) {
		const sha1 = this;
		if (typeof data === "string") {
			data = codec.utf8String.toBits(data);
		}
		const b = sha1._buffer = bitArray.concat(sha1._buffer, data);
		const ol = sha1._length;
		const nl = sha1._length = ol + bitArray.bitLength(data);
		if (nl > 9007199254740991) {
			throw new Error("Cannot hash more than 2^53 - 1 bits");
		}
		const c = new Uint32Array(b);
		let j = 0;
		for (let i = sha1.blockSize + ol - ((sha1.blockSize + ol) & (sha1.blockSize - 1)); i <= nl;
			i += sha1.blockSize) {
			sha1._block(c.subarray(16 * j, 16 * (j + 1)));
			j += 1;
		}
		b.splice(0, 16 * j);
		return sha1;
	}

	/**
	 * Complete hashing and output the hash value.
	 * @return {bitArray} The hash value, an array of 5 big-endian words. TODO
	 */
	finalize() {
		const sha1 = this;
		let b = sha1._buffer;
		const h = sha1._h;

		// Round out and push the buffer
		b = bitArray.concat(b, [bitArray.partial(1, 1)]);
		// Round out the buffer to a multiple of 16 words, less the 2 length words.
		for (let i = b.length + 2; i & 15; i++) {
			b.push(0);
		}

		// append the length
		b.push(Math.floor(sha1._length / 0x100000000));
		b.push(sha1._length | 0);

		while (b.length) {
			sha1._block(b.splice(0, 16));
		}

		sha1.reset();
		return h;
	}

	/**
	 * The SHA-1 logical functions f(0), f(1), ..., f(79).
	 * @private
	 */
	_f(t, b, c, d) {
		if (t <= 19) {
			return (b & c) | (~b & d);
		} else if (t <= 39) {
			return b ^ c ^ d;
		} else if (t <= 59) {
			return (b & c) | (b & d) | (c & d);
		} else if (t <= 79) {
			return b ^ c ^ d;
		}
	}

	/**
	 * Circular left-shift operator.
	 * @private
	 */
	_S(n, x) {
		return (x << n) | (x >>> 32 - n);
	}

	/**
	 * Perform one cycle of SHA-1.
	 * @param {Uint32Array|bitArray} words one block of words.
	 * @private
	 */
	_block(words) {
		const sha1 = this;
		const h = sha1._h;
		// When words is passed to _block, it has 16 elements. SHA1 _block
		// function extends words with new elements (at the end there are 80 elements). 
		// The problem is that if we use Uint32Array instead of Array, 
		// the length of Uint32Array cannot be changed. Thus, we replace words with a 
		// normal Array here.
		const w = Array(80); // do not use Uint32Array here as the instantiation is slower
		for (let j = 0; j < 16; j++) {
			w[j] = words[j];
		}

		let a = h[0];
		let b = h[1];
		let c = h[2];
		let d = h[3];
		let e = h[4];

		for (let t = 0; t <= 79; t++) {
			if (t >= 16) {
				w[t] = sha1._S(1, w[t - 3] ^ w[t - 8] ^ w[t - 14] ^ w[t - 16]);
			}
			const tmp = (sha1._S(5, a) + sha1._f(t, b, c, d) + e + w[t] +
				sha1._key[Math.floor(t / 20)]) | 0;
			e = d;
			d = c;
			c = sha1._S(30, b);
			b = a;
			a = tmp;
		}

		h[0] = (h[0] + a) | 0;
		h[1] = (h[1] + b) | 0;
		h[2] = (h[2] + c) | 0;
		h[3] = (h[3] + d) | 0;
		h[4] = (h[4] + e) | 0;
	}
};

/** @fileOverview Low-level AES implementation.
 *
 * This file contains a low-level implementation of AES, optimized for
 * size and for efficiency on several browsers.  It is based on
 * OpenSSL's aes_core.c, a public-domain implementation by Vincent
 * Rijmen, Antoon Bosselaers and Paulo Barreto.
 *
 * An older version of this implementation is available in the public
 * domain, but this one is (c) Emily Stark, Mike Hamburg, Dan Boneh,
 * Stanford University 2008-2010 and BSD-licensed for liability
 * reasons.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */

const cipher = {};

/**
 * Schedule out an AES key for both encryption and decryption.  This
 * is a low-level class.  Use a cipher mode to do bulk encryption.
 *
 * @constructor
 * @param {Array} key The key as an array of 4, 6 or 8 words.
 */
cipher.aes = class {
	constructor(key) {
		/**
		 * The expanded S-box and inverse S-box tables.  These will be computed
		 * on the client so that we don't have to send them down the wire.
		 *
		 * There are two tables, _tables[0] is for encryption and
		 * _tables[1] is for decryption.
		 *
		 * The first 4 sub-tables are the expanded S-box with MixColumns.  The
		 * last (_tables[01][4]) is the S-box itself.
		 *
		 * @private
		 */
		const aes = this;
		aes._tables = [[[], [], [], [], []], [[], [], [], [], []]];

		if (!aes._tables[0][0][0]) {
			aes._precompute();
		}

		const sbox = aes._tables[0][4];
		const decTable = aes._tables[1];
		const keyLen = key.length;

		let i, encKey, decKey, rcon = 1;

		if (keyLen !== 4 && keyLen !== 6 && keyLen !== 8) {
			throw new Error("invalid aes key size");
		}

		aes._key = [encKey = key.slice(0), decKey = []];

		// schedule encryption keys
		for (i = keyLen; i < 4 * keyLen + 28; i++) {
			let tmp = encKey[i - 1];

			// apply sbox
			if (i % keyLen === 0 || (keyLen === 8 && i % keyLen === 4)) {
				tmp = sbox[tmp >>> 24] << 24 ^ sbox[tmp >> 16 & 255] << 16 ^ sbox[tmp >> 8 & 255] << 8 ^ sbox[tmp & 255];

				// shift rows and add rcon
				if (i % keyLen === 0) {
					tmp = tmp << 8 ^ tmp >>> 24 ^ rcon << 24;
					rcon = rcon << 1 ^ (rcon >> 7) * 283;
				}
			}

			encKey[i] = encKey[i - keyLen] ^ tmp;
		}

		// schedule decryption keys
		for (let j = 0; i; j++, i--) {
			const tmp = encKey[j & 3 ? i : i - 4];
			if (i <= 4 || j < 4) {
				decKey[j] = tmp;
			} else {
				decKey[j] = decTable[0][sbox[tmp >>> 24]] ^
					decTable[1][sbox[tmp >> 16 & 255]] ^
					decTable[2][sbox[tmp >> 8 & 255]] ^
					decTable[3][sbox[tmp & 255]];
			}
		}
	}
	// public
	/* Something like this might appear here eventually
	name: "AES",
	blockSize: 4,
	keySizes: [4,6,8],
	*/

	/**
	 * Encrypt an array of 4 big-endian words.
	 * @param {Array} data The plaintext.
	 * @return {Array} The ciphertext.
	 */
	encrypt(data) {
		return this._crypt(data, 0);
	}

	/**
	 * Decrypt an array of 4 big-endian words.
	 * @param {Array} data The ciphertext.
	 * @return {Array} The plaintext.
	 */
	decrypt(data) {
		return this._crypt(data, 1);
	}

	/**
	 * Expand the S-box tables.
	 *
	 * @private
	 */
	_precompute() {
		const encTable = this._tables[0];
		const decTable = this._tables[1];
		const sbox = encTable[4];
		const sboxInv = decTable[4];
		const d = [];
		const th = [];
		let xInv, x2, x4, x8;

		// Compute double and third tables
		for (let i = 0; i < 256; i++) {
			th[(d[i] = i << 1 ^ (i >> 7) * 283) ^ i] = i;
		}

		for (let x = xInv = 0; !sbox[x]; x ^= x2 || 1, xInv = th[xInv] || 1) {
			// Compute sbox
			let s = xInv ^ xInv << 1 ^ xInv << 2 ^ xInv << 3 ^ xInv << 4;
			s = s >> 8 ^ s & 255 ^ 99;
			sbox[x] = s;
			sboxInv[s] = x;

			// Compute MixColumns
			x8 = d[x4 = d[x2 = d[x]]];
			let tDec = x8 * 0x1010101 ^ x4 * 0x10001 ^ x2 * 0x101 ^ x * 0x1010100;
			let tEnc = d[s] * 0x101 ^ s * 0x1010100;

			for (let i = 0; i < 4; i++) {
				encTable[i][x] = tEnc = tEnc << 24 ^ tEnc >>> 8;
				decTable[i][s] = tDec = tDec << 24 ^ tDec >>> 8;
			}
		}

		// Compactify.  Considerable speedup on Firefox.
		for (let i = 0; i < 5; i++) {
			encTable[i] = encTable[i].slice(0);
			decTable[i] = decTable[i].slice(0);
		}
	}

	/**
	 * Encryption and decryption core.
	 * @param {Array} input Four words to be encrypted or decrypted.
	 * @param dir The direction, 0 for encrypt and 1 for decrypt.
	 * @return {Array} The four encrypted or decrypted words.
	 * @private
	 */
	_crypt(input, dir) {
		if (input.length !== 4) {
			throw new Error("invalid aes block size");
		}

		const key = this._key[dir];

		const nInnerRounds = key.length / 4 - 2;
		const out = [0, 0, 0, 0];
		const table = this._tables[dir];

		// load up the tables
		const t0 = table[0];
		const t1 = table[1];
		const t2 = table[2];
		const t3 = table[3];
		const sbox = table[4];

		// state variables a,b,c,d are loaded with pre-whitened data
		let a = input[0] ^ key[0];
		let b = input[dir ? 3 : 1] ^ key[1];
		let c = input[2] ^ key[2];
		let d = input[dir ? 1 : 3] ^ key[3];
		let kIndex = 4;
		let a2, b2, c2;

		// Inner rounds.  Cribbed from OpenSSL.
		for (let i = 0; i < nInnerRounds; i++) {
			a2 = t0[a >>> 24] ^ t1[b >> 16 & 255] ^ t2[c >> 8 & 255] ^ t3[d & 255] ^ key[kIndex];
			b2 = t0[b >>> 24] ^ t1[c >> 16 & 255] ^ t2[d >> 8 & 255] ^ t3[a & 255] ^ key[kIndex + 1];
			c2 = t0[c >>> 24] ^ t1[d >> 16 & 255] ^ t2[a >> 8 & 255] ^ t3[b & 255] ^ key[kIndex + 2];
			d = t0[d >>> 24] ^ t1[a >> 16 & 255] ^ t2[b >> 8 & 255] ^ t3[c & 255] ^ key[kIndex + 3];
			kIndex += 4;
			a = a2; b = b2; c = c2;
		}

		// Last round.
		for (let i = 0; i < 4; i++) {
			out[dir ? 3 & -i : i] =
				sbox[a >>> 24] << 24 ^
				sbox[b >> 16 & 255] << 16 ^
				sbox[c >> 8 & 255] << 8 ^
				sbox[d & 255] ^
				key[kIndex++];
			a2 = a; a = b; b = c; c = d; d = a2;
		}

		return out;
	}
};

/**
 * Random values
 * @namespace
 */
const random = {
	/** 
	 * Generate random words with pure js, cryptographically not as strong & safe as native implementation.
	 * @param {TypedArray} typedArray The array to fill.
	 * @return {TypedArray} The random values.
	 */
	getRandomValues(typedArray) {
		const words = new Uint32Array(typedArray.buffer);
		const r = (m_w) => {
			let m_z = 0x3ade68b1;
			const mask = 0xffffffff;
			return function () {
				m_z = (0x9069 * (m_z & 0xFFFF) + (m_z >> 0x10)) & mask;
				m_w = (0x4650 * (m_w & 0xFFFF) + (m_w >> 0x10)) & mask;
				const result = ((((m_z << 0x10) + m_w) & mask) / 0x100000000) + .5;
				return result * (Math.random() > .5 ? 1 : -1);
			};
		};
		for (let i = 0, rcache; i < typedArray.length; i += 4) {
			const _r = r((rcache || Math.random()) * 0x100000000);
			rcache = _r() * 0x3ade67b7;
			words[i / 4] = (_r() * 0x100000000) | 0;
		}
		return typedArray;
	}
};

/** @fileOverview CTR mode implementation.
 *
 * Special thanks to Roy Nicholson for pointing out a bug in our
 * implementation.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */

/** Brian Gladman's CTR Mode.
* @constructor
* @param {Object} _prf The aes instance to generate key.
* @param {bitArray} _iv The iv for ctr mode, it must be 128 bits.
*/

const mode = {};

/**
 * Brian Gladman's CTR Mode.
 * @namespace
 */
mode.ctrGladman = class {
	constructor(prf, iv) {
		this._prf = prf;
		this._initIv = iv;
		this._iv = iv;
	}

	reset() {
		this._iv = this._initIv;
	}

	/** Input some data to calculate.
	 * @param {bitArray} data the data to process, it must be intergral multiple of 128 bits unless it's the last.
	 */
	update(data) {
		return this.calculate(this._prf, data, this._iv);
	}

	incWord(word) {
		if (((word >> 24) & 0xff) === 0xff) { //overflow
			let b1 = (word >> 16) & 0xff;
			let b2 = (word >> 8) & 0xff;
			let b3 = word & 0xff;

			if (b1 === 0xff) { // overflow b1   
				b1 = 0;
				if (b2 === 0xff) {
					b2 = 0;
					if (b3 === 0xff) {
						b3 = 0;
					} else {
						++b3;
					}
				} else {
					++b2;
				}
			} else {
				++b1;
			}

			word = 0;
			word += (b1 << 16);
			word += (b2 << 8);
			word += b3;
		} else {
			word += (0x01 << 24);
		}
		return word;
	}

	incCounter(counter) {
		if ((counter[0] = this.incWord(counter[0])) === 0) {
			// encr_data in fileenc.c from  Dr Brian Gladman's counts only with DWORD j < 8
			counter[1] = this.incWord(counter[1]);
		}
	}

	calculate(prf, data, iv) {
		let l;
		if (!(l = data.length)) {
			return [];
		}
		const bl = bitArray.bitLength(data);
		for (let i = 0; i < l; i += 4) {
			this.incCounter(iv);
			const e = prf.encrypt(iv);
			data[i] ^= e[0];
			data[i + 1] ^= e[1];
			data[i + 2] ^= e[2];
			data[i + 3] ^= e[3];
		}
		return bitArray.clamp(data, bl);
	}
};

const misc = {
	importKey(password) {
		return new misc.hmacSha1(codec.bytes.toBits(password));
	},
	pbkdf2(prf, salt, count, length) {
		count = count || 10000;
		if (length < 0 || count < 0) {
			throw new Error("invalid params to pbkdf2");
		}
		const byteLength = ((length >> 5) + 1) << 2;
		let u, ui, i, j, k;
		const arrayBuffer = new ArrayBuffer(byteLength);
		const out = new DataView(arrayBuffer);
		let outLength = 0;
		const b = bitArray;
		salt = codec.bytes.toBits(salt);
		for (k = 1; outLength < (byteLength || 1); k++) {
			u = ui = prf.encrypt(b.concat(salt, [k]));
			for (i = 1; i < count; i++) {
				ui = prf.encrypt(ui);
				for (j = 0; j < ui.length; j++) {
					u[j] ^= ui[j];
				}
			}
			for (i = 0; outLength < (byteLength || 1) && i < u.length; i++) {
				out.setInt32(outLength, u[i]);
				outLength += 4;
			}
		}
		return arrayBuffer.slice(0, length / 8);
	}
};

/** @fileOverview HMAC implementation.
 *
 * @author Emily Stark
 * @author Mike Hamburg
 * @author Dan Boneh
 */

/** HMAC with the specified hash function.
 * @constructor
 * @param {bitArray} key the key for HMAC.
 * @param {Object} [Hash=hash.sha1] The hash function to use.
 */
misc.hmacSha1 = class {

	constructor(key) {
		const hmac = this;
		const Hash = hmac._hash = hash.sha1;
		const exKey = [[], []];
		hmac._baseHash = [new Hash(), new Hash()];
		const bs = hmac._baseHash[0].blockSize / 32;

		if (key.length > bs) {
			key = new Hash().update(key).finalize();
		}

		for (let i = 0; i < bs; i++) {
			exKey[0][i] = key[i] ^ 0x36363636;
			exKey[1][i] = key[i] ^ 0x5C5C5C5C;
		}

		hmac._baseHash[0].update(exKey[0]);
		hmac._baseHash[1].update(exKey[1]);
		hmac._resultHash = new Hash(hmac._baseHash[0]);
	}
	reset() {
		const hmac = this;
		hmac._resultHash = new hmac._hash(hmac._baseHash[0]);
		hmac._updated = false;
	}

	update(data) {
		const hmac = this;
		hmac._updated = true;
		hmac._resultHash.update(data);
	}

	digest() {
		const hmac = this;
		const w = hmac._resultHash.finalize();
		const result = new (hmac._hash)(hmac._baseHash[1]).update(w).finalize();

		hmac.reset();

		return result;
	}

	encrypt(data) {
		if (!this._updated) {
			this.update(data);
			return this.digest(data);
		} else {
			throw new Error("encrypt on already updated hmac called!");
		}
	}
};

/*
 Copyright (c) 2022 Gildas Lormeau. All rights reserved.

 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions are met:

 1. Redistributions of source code must retain the above copyright notice,
 this list of conditions and the following disclaimer.

 2. Redistributions in binary form must reproduce the above copyright 
 notice, this list of conditions and the following disclaimer in 
 the documentation and/or other materials provided with the distribution.

 3. The names of the authors may not be used to endorse or promote products
 derived from this software without specific prior written permission.

 THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESSED OR IMPLIED WARRANTIES,
 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JCRAFT,
 INC. OR ANY CONTRIBUTORS TO THIS SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT,
 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
 OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

const GET_RANDOM_VALUES_SUPPORTED = typeof crypto != "undefined" && typeof crypto.getRandomValues == "function";

const ERR_INVALID_PASSWORD = "Invalid password";
const ERR_INVALID_SIGNATURE = "Invalid signature";
const ERR_ABORT_CHECK_PASSWORD = "zipjs-abort-check-password";

function getRandomValues(array) {
	if (GET_RANDOM_VALUES_SUPPORTED) {
		return crypto.getRandomValues(array);
	} else {
		return random.getRandomValues(array);
	}
}

/*
 Copyright (c) 2022 Gildas Lormeau. All rights reserved.

 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions are met:

 1. Redistributions of source code must retain the above copyright notice,
 this list of conditions and the following disclaimer.

 2. Redistributions in binary form must reproduce the above copyright 
 notice, this list of conditions and the following disclaimer in 
 the documentation and/or other materials provided with the distribution.

 3. The names of the authors may not be used to endorse or promote products
 derived from this software without specific prior written permission.

 THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESSED OR IMPLIED WARRANTIES,
 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JCRAFT,
 INC. OR ANY CONTRIBUTORS TO THIS SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT,
 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
 OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

const BLOCK_LENGTH = 16;
const RAW_FORMAT = "raw";
const PBKDF2_ALGORITHM = { name: "PBKDF2" };
const HASH_ALGORITHM = { name: "HMAC" };
const HASH_FUNCTION = "SHA-1";
const BASE_KEY_ALGORITHM = Object.assign({ hash: HASH_ALGORITHM }, PBKDF2_ALGORITHM);
const DERIVED_BITS_ALGORITHM = Object.assign({ iterations: 1000, hash: { name: HASH_FUNCTION } }, PBKDF2_ALGORITHM);
const DERIVED_BITS_USAGE = ["deriveBits"];
const SALT_LENGTH = [8, 12, 16];
const KEY_LENGTH = [16, 24, 32];
const SIGNATURE_LENGTH = 10;
const COUNTER_DEFAULT_VALUE = [0, 0, 0, 0];
const UNDEFINED_TYPE = "undefined";
const FUNCTION_TYPE = "function";
// deno-lint-ignore valid-typeof
const CRYPTO_API_SUPPORTED = typeof crypto != UNDEFINED_TYPE;
const subtle = CRYPTO_API_SUPPORTED && crypto.subtle;
const SUBTLE_API_SUPPORTED = CRYPTO_API_SUPPORTED && typeof subtle != UNDEFINED_TYPE;
const codecBytes = codec.bytes;
const Aes = cipher.aes;
const CtrGladman = mode.ctrGladman;
const HmacSha1 = misc.hmacSha1;

let IMPORT_KEY_SUPPORTED = CRYPTO_API_SUPPORTED && SUBTLE_API_SUPPORTED && typeof subtle.importKey == FUNCTION_TYPE;
let DERIVE_BITS_SUPPORTED = CRYPTO_API_SUPPORTED && SUBTLE_API_SUPPORTED && typeof subtle.deriveBits == FUNCTION_TYPE;

class AESDecryptionStream extends TransformStream {

	constructor({ password, signed, encryptionStrength, checkPasswordOnly }) {
		super({
			start() {
				Object.assign(this, {
					ready: new Promise(resolve => this.resolveReady = resolve),
					password,
					signed,
					strength: encryptionStrength - 1,
					pending: new Uint8Array()
				});
			},
			async transform(chunk, controller) {
				const aesCrypto = this;
				const {
					password,
					strength,
					resolveReady,
					ready
				} = aesCrypto;
				if (password) {
					await createDecryptionKeys(aesCrypto, strength, password, subarray(chunk, 0, SALT_LENGTH[strength] + 2));
					chunk = subarray(chunk, SALT_LENGTH[strength] + 2);
					if (checkPasswordOnly) {
						controller.error(new Error(ERR_ABORT_CHECK_PASSWORD));
					} else {
						resolveReady();
					}
				} else {
					await ready;
				}
				const output = new Uint8Array(chunk.length - SIGNATURE_LENGTH - ((chunk.length - SIGNATURE_LENGTH) % BLOCK_LENGTH));
				controller.enqueue(append(aesCrypto, chunk, output, 0, SIGNATURE_LENGTH, true));
			},
			async flush(controller) {
				const {
					signed,
					ctr,
					hmac,
					pending,
					ready
				} = this;
				await ready;
				const chunkToDecrypt = subarray(pending, 0, pending.length - SIGNATURE_LENGTH);
				const originalSignature = subarray(pending, pending.length - SIGNATURE_LENGTH);
				let decryptedChunkArray = new Uint8Array();
				if (chunkToDecrypt.length) {
					const encryptedChunk = toBits(codecBytes, chunkToDecrypt);
					hmac.update(encryptedChunk);
					const decryptedChunk = ctr.update(encryptedChunk);
					decryptedChunkArray = fromBits(codecBytes, decryptedChunk);
				}
				if (signed) {
					const signature = subarray(fromBits(codecBytes, hmac.digest()), 0, SIGNATURE_LENGTH);
					for (let indexSignature = 0; indexSignature < SIGNATURE_LENGTH; indexSignature++) {
						if (signature[indexSignature] != originalSignature[indexSignature]) {
							throw new Error(ERR_INVALID_SIGNATURE);
						}
					}
				}
				controller.enqueue(decryptedChunkArray);
			}
		});
	}
}

class AESEncryptionStream extends TransformStream {

	constructor({ password, encryptionStrength }) {
		// deno-lint-ignore prefer-const
		let stream;
		super({
			start() {
				Object.assign(this, {
					ready: new Promise(resolve => this.resolveReady = resolve),
					password,
					strength: encryptionStrength - 1,
					pending: new Uint8Array()
				});
			},
			async transform(chunk, controller) {
				const aesCrypto = this;
				const {
					password,
					strength,
					resolveReady,
					ready
				} = aesCrypto;
				let preamble = new Uint8Array();
				if (password) {
					preamble = await createEncryptionKeys(aesCrypto, strength, password);
					resolveReady();
				} else {
					await ready;
				}
				const output = new Uint8Array(preamble.length + chunk.length - (chunk.length % BLOCK_LENGTH));
				output.set(preamble, 0);
				controller.enqueue(append(aesCrypto, chunk, output, preamble.length, 0));
			},
			async flush(controller) {
				const {
					ctr,
					hmac,
					pending,
					ready
				} = this;
				await ready;
				let encryptedChunkArray = new Uint8Array();
				if (pending.length) {
					const encryptedChunk = ctr.update(toBits(codecBytes, pending));
					hmac.update(encryptedChunk);
					encryptedChunkArray = fromBits(codecBytes, encryptedChunk);
				}
				stream.signature = fromBits(codecBytes, hmac.digest()).slice(0, SIGNATURE_LENGTH);
				controller.enqueue(concat(encryptedChunkArray, stream.signature));
			}
		});
		stream = this;
	}
}

function append(aesCrypto, input, output, paddingStart, paddingEnd, verifySignature) {
	const {
		ctr,
		hmac,
		pending
	} = aesCrypto;
	const inputLength = input.length - paddingEnd;
	if (pending.length) {
		input = concat(pending, input);
		output = expand(output, inputLength - (inputLength % BLOCK_LENGTH));
	}
	let offset;
	for (offset = 0; offset <= inputLength - BLOCK_LENGTH; offset += BLOCK_LENGTH) {
		const inputChunk = toBits(codecBytes, subarray(input, offset, offset + BLOCK_LENGTH));
		if (verifySignature) {
			hmac.update(inputChunk);
		}
		const outputChunk = ctr.update(inputChunk);
		if (!verifySignature) {
			hmac.update(outputChunk);
		}
		output.set(fromBits(codecBytes, outputChunk), offset + paddingStart);
	}
	aesCrypto.pending = subarray(input, offset);
	return output;
}

async function createDecryptionKeys(decrypt, strength, password, preamble) {
	const passwordVerificationKey = await createKeys$1(decrypt, strength, password, subarray(preamble, 0, SALT_LENGTH[strength]));
	const passwordVerification = subarray(preamble, SALT_LENGTH[strength]);
	if (passwordVerificationKey[0] != passwordVerification[0] || passwordVerificationKey[1] != passwordVerification[1]) {
		throw new Error(ERR_INVALID_PASSWORD);
	}
}

async function createEncryptionKeys(encrypt, strength, password) {
	const salt = getRandomValues(new Uint8Array(SALT_LENGTH[strength]));
	const passwordVerification = await createKeys$1(encrypt, strength, password, salt);
	return concat(salt, passwordVerification);
}

async function createKeys$1(aesCrypto, strength, password, salt) {
	aesCrypto.password = null;
	const encodedPassword = encodeText(password);
	const baseKey = await importKey(RAW_FORMAT, encodedPassword, BASE_KEY_ALGORITHM, false, DERIVED_BITS_USAGE);
	const derivedBits = await deriveBits(Object.assign({ salt }, DERIVED_BITS_ALGORITHM), baseKey, 8 * ((KEY_LENGTH[strength] * 2) + 2));
	const compositeKey = new Uint8Array(derivedBits);
	const key = toBits(codecBytes, subarray(compositeKey, 0, KEY_LENGTH[strength]));
	const authentication = toBits(codecBytes, subarray(compositeKey, KEY_LENGTH[strength], KEY_LENGTH[strength] * 2));
	const passwordVerification = subarray(compositeKey, KEY_LENGTH[strength] * 2);
	Object.assign(aesCrypto, {
		keys: {
			key,
			authentication,
			passwordVerification
		},
		ctr: new CtrGladman(new Aes(key), Array.from(COUNTER_DEFAULT_VALUE)),
		hmac: new HmacSha1(authentication)
	});
	return passwordVerification;
}

async function importKey(format, password, algorithm, extractable, keyUsages) {
	if (IMPORT_KEY_SUPPORTED) {
		try {
			return await subtle.importKey(format, password, algorithm, extractable, keyUsages);
		} catch (_error) {
			IMPORT_KEY_SUPPORTED = false;
			return misc.importKey(password);
		}
	} else {
		return misc.importKey(password);
	}
}

async function deriveBits(algorithm, baseKey, length) {
	if (DERIVE_BITS_SUPPORTED) {
		try {
			return await subtle.deriveBits(algorithm, baseKey, length);
		} catch (_error) {
			DERIVE_BITS_SUPPORTED = false;
			return misc.pbkdf2(baseKey, algorithm.salt, DERIVED_BITS_ALGORITHM.iterations, length);
		}
	} else {
		return misc.pbkdf2(baseKey, algorithm.salt, DERIVED_BITS_ALGORITHM.iterations, length);
	}
}

function concat(leftArray, rightArray) {
	let array = leftArray;
	if (leftArray.length + rightArray.length) {
		array = new Uint8Array(leftArray.length + rightArray.length);
		array.set(leftArray, 0);
		array.set(rightArray, leftArray.length);
	}
	return array;
}

function expand(inputArray, length) {
	if (length && length > inputArray.length) {
		const array = inputArray;
		inputArray = new Uint8Array(length);
		inputArray.set(array, 0);
	}
	return inputArray;
}

function subarray(array, begin, end) {
	return array.subarray(begin, end);
}

function fromBits(codecBytes, chunk) {
	return codecBytes.fromBits(chunk);
}
function toBits(codecBytes, chunk) {
	return codecBytes.toBits(chunk);
}

/*
 Copyright (c) 2022 Gildas Lormeau. All rights reserved.

 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions are met:

 1. Redistributions of source code must retain the above copyright notice,
 this list of conditions and the following disclaimer.

 2. Redistributions in binary form must reproduce the above copyright 
 notice, this list of conditions and the following disclaimer in 
 the documentation and/or other materials provided with the distribution.

 3. The names of the authors may not be used to endorse or promote products
 derived from this software without specific prior written permission.

 THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESSED OR IMPLIED WARRANTIES,
 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JCRAFT,
 INC. OR ANY CONTRIBUTORS TO THIS SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT,
 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
 OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

const HEADER_LENGTH = 12;

class ZipCryptoDecryptionStream extends TransformStream {

	constructor({ password, passwordVerification, checkPasswordOnly }) {
		super({
			start() {
				Object.assign(this, {
					password,
					passwordVerification
				});
				createKeys(this, password);
			},
			transform(chunk, controller) {
				const zipCrypto = this;
				if (zipCrypto.password) {
					const decryptedHeader = decrypt(zipCrypto, chunk.subarray(0, HEADER_LENGTH));
					zipCrypto.password = null;
					if (decryptedHeader[HEADER_LENGTH - 1] != zipCrypto.passwordVerification) {
						throw new Error(ERR_INVALID_PASSWORD);
					}
					chunk = chunk.subarray(HEADER_LENGTH);
				}
				if (checkPasswordOnly) {
					controller.error(new Error(ERR_ABORT_CHECK_PASSWORD));
				} else {
					controller.enqueue(decrypt(zipCrypto, chunk));
				}
			}
		});
	}
}

class ZipCryptoEncryptionStream extends TransformStream {

	constructor({ password, passwordVerification }) {
		super({
			start() {
				Object.assign(this, {
					password,
					passwordVerification
				});
				createKeys(this, password);
			},
			transform(chunk, controller) {
				const zipCrypto = this;
				let output;
				let offset;
				if (zipCrypto.password) {
					zipCrypto.password = null;
					const header = getRandomValues(new Uint8Array(HEADER_LENGTH));
					header[HEADER_LENGTH - 1] = zipCrypto.passwordVerification;
					output = new Uint8Array(chunk.length + header.length);
					output.set(encrypt(zipCrypto, header), 0);
					offset = HEADER_LENGTH;
				} else {
					output = new Uint8Array(chunk.length);
					offset = 0;
				}
				output.set(encrypt(zipCrypto, chunk), offset);
				controller.enqueue(output);
			}
		});
	}
}

function decrypt(target, input) {
	const output = new Uint8Array(input.length);
	for (let index = 0; index < input.length; index++) {
		output[index] = getByte(target) ^ input[index];
		updateKeys(target, output[index]);
	}
	return output;
}

function encrypt(target, input) {
	const output = new Uint8Array(input.length);
	for (let index = 0; index < input.length; index++) {
		output[index] = getByte(target) ^ input[index];
		updateKeys(target, input[index]);
	}
	return output;
}

function createKeys(target, password) {
	const keys = [0x12345678, 0x23456789, 0x34567890];
	Object.assign(target, {
		keys,
		crcKey0: new Crc32(keys[0]),
		crcKey2: new Crc32(keys[2]),
	});
	for (let index = 0; index < password.length; index++) {
		updateKeys(target, password.charCodeAt(index));
	}
}

function updateKeys(target, byte) {
	let [key0, key1, key2] = target.keys;
	target.crcKey0.append([byte]);
	key0 = ~target.crcKey0.get();
	key1 = getInt32(Math.imul(getInt32(key1 + getInt8(key0)), 134775813) + 1);
	target.crcKey2.append([key1 >>> 24]);
	key2 = ~target.crcKey2.get();
	target.keys = [key0, key1, key2];
}

function getByte(target) {
	const temp = target.keys[2] | 2;
	return getInt8(Math.imul(temp, (temp ^ 1)) >>> 8);
}

function getInt8(number) {
	return number & 0xFF;
}

function getInt32(number) {
	return number & 0xFFFFFFFF;
}

/*
 Copyright (c) 2022 Gildas Lormeau. All rights reserved.

 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions are met:

 1. Redistributions of source code must retain the above copyright notice,
 this list of conditions and the following disclaimer.

 2. Redistributions in binary form must reproduce the above copyright 
 notice, this list of conditions and the following disclaimer in 
 the documentation and/or other materials provided with the distribution.

 3. The names of the authors may not be used to endorse or promote products
 derived from this software without specific prior written permission.

 THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESSED OR IMPLIED WARRANTIES,
 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JCRAFT,
 INC. OR ANY CONTRIBUTORS TO THIS SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT,
 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
 OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

const COMPRESSION_FORMAT = "deflate-raw";

class DeflateStream extends TransformStream {

	constructor(options, { chunkSize, CompressionStream, CompressionStreamNative }) {
		super({});
		const { compressed, encrypted, useCompressionStream, zipCrypto, signed, level } = options;
		const stream = this;
		let crc32Stream, encryptionStream;
		let readable = filterEmptyChunks(super.readable);
		if ((!encrypted || zipCrypto) && signed) {
			[readable, crc32Stream] = readable.tee();
			crc32Stream = pipeThrough(crc32Stream, new Crc32Stream());
		}
		if (compressed) {
			readable = pipeThroughCommpressionStream(readable, useCompressionStream, { level, chunkSize }, CompressionStreamNative, CompressionStream);
		}
		if (encrypted) {
			if (zipCrypto) {
				readable = pipeThrough(readable, new ZipCryptoEncryptionStream(options));
			} else {
				encryptionStream = new AESEncryptionStream(options);
				readable = pipeThrough(readable, encryptionStream);
			}
		}
		setReadable(stream, readable, async () => {
			let signature;
			if (encrypted && !zipCrypto) {
				signature = encryptionStream.signature;
			}
			if ((!encrypted || zipCrypto) && signed) {
				signature = await crc32Stream.getReader().read();
				signature = new DataView(signature.value.buffer).getUint32(0);
			}
			stream.signature = signature;
		});
	}
}

class InflateStream extends TransformStream {

	constructor(options, { chunkSize, DecompressionStream, DecompressionStreamNative }) {
		super({});
		const { zipCrypto, encrypted, signed, signature, compressed, useCompressionStream } = options;
		let crc32Stream, decryptionStream;
		let readable = filterEmptyChunks(super.readable);
		if (encrypted) {
			if (zipCrypto) {
				readable = pipeThrough(readable, new ZipCryptoDecryptionStream(options));
			} else {
				decryptionStream = new AESDecryptionStream(options);
				readable = pipeThrough(readable, decryptionStream);
			}
		}
		if (compressed) {
			readable = pipeThroughCommpressionStream(readable, useCompressionStream, { chunkSize }, DecompressionStreamNative, DecompressionStream);
		}
		if ((!encrypted || zipCrypto) && signed) {
			[readable, crc32Stream] = readable.tee();
			crc32Stream = pipeThrough(crc32Stream, new Crc32Stream());
		}
		setReadable(this, readable, async () => {
			if ((!encrypted || zipCrypto) && signed) {
				const streamSignature = await crc32Stream.getReader().read();
				const dataViewSignature = new DataView(streamSignature.value.buffer);
				if (signature != dataViewSignature.getUint32(0, false)) {
					throw new Error(ERR_INVALID_SIGNATURE);
				}
			}
		});
	}
}

function filterEmptyChunks(readable) {
	return pipeThrough(readable, new TransformStream({
		transform(chunk, controller) {
			if (chunk && chunk.length) {
				controller.enqueue(chunk);
			}
		}
	}));
}

function setReadable(stream, readable, flush) {
	readable = pipeThrough(readable, new TransformStream({ flush }));
	Object.defineProperty(stream, "readable", {
		get() {
			return readable;
		}
	});
}

function pipeThroughCommpressionStream(readable, useCompressionStream, options, CodecStreamNative, CodecStream) {
	try {
		const CompressionStream = useCompressionStream && CodecStreamNative ? CodecStreamNative : CodecStream;
		readable = pipeThrough(readable, new CompressionStream(COMPRESSION_FORMAT, options));
	} catch (error) {
		if (useCompressionStream) {
			readable = pipeThrough(readable, new CodecStream(COMPRESSION_FORMAT, options));
		} else {
			throw error;
		}
	}
	return readable;
}

function pipeThrough(readable, transformStream) {
	return readable.pipeThrough(transformStream);
}

/*
 Copyright (c) 2022 Gildas Lormeau. All rights reserved.

 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions are met:

 1. Redistributions of source code must retain the above copyright notice,
 this list of conditions and the following disclaimer.

 2. Redistributions in binary form must reproduce the above copyright 
 notice, this list of conditions and the following disclaimer in 
 the documentation and/or other materials provided with the distribution.

 3. The names of the authors may not be used to endorse or promote products
 derived from this software without specific prior written permission.

 THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESSED OR IMPLIED WARRANTIES,
 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JCRAFT,
 INC. OR ANY CONTRIBUTORS TO THIS SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT,
 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
 OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

const MESSAGE_EVENT_TYPE = "message";
const MESSAGE_START = "start";
const MESSAGE_PULL = "pull";
const MESSAGE_DATA = "data";
const MESSAGE_ACK_DATA = "ack";
const MESSAGE_CLOSE = "close";
const CODEC_DEFLATE = "deflate";
const CODEC_INFLATE = "inflate";

class CodecStream extends TransformStream {

	constructor(options, config) {
		super({});
		const codec = this;
		const { codecType } = options;
		let Stream;
		if (codecType.startsWith(CODEC_DEFLATE)) {
			Stream = DeflateStream;
		} else if (codecType.startsWith(CODEC_INFLATE)) {
			Stream = InflateStream;
		}
		let size = 0;
		const stream = new Stream(options, config);
		const readable = super.readable;
		const transformStream = new TransformStream({
			transform(chunk, controller) {
				if (chunk && chunk.length) {
					size += chunk.length;
					controller.enqueue(chunk);
				}
			},
			flush() {
				const { signature } = stream;
				Object.assign(codec, {
					signature,
					size
				});
			}
		});
		Object.defineProperty(codec, "readable", {
			get() {
				return readable.pipeThrough(stream).pipeThrough(transformStream);
			}
		});
	}
}

/*
 Copyright (c) 2022 Gildas Lormeau. All rights reserved.

 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions are met:

 1. Redistributions of source code must retain the above copyright notice,
 this list of conditions and the following disclaimer.

 2. Redistributions in binary form must reproduce the above copyright 
 notice, this list of conditions and the following disclaimer in 
 the documentation and/or other materials provided with the distribution.

 3. The names of the authors may not be used to endorse or promote products
 derived from this software without specific prior written permission.

 THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESSED OR IMPLIED WARRANTIES,
 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JCRAFT,
 INC. OR ANY CONTRIBUTORS TO THIS SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT,
 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
 OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

// deno-lint-ignore valid-typeof
const WEB_WORKERS_SUPPORTED = typeof Worker != UNDEFINED_TYPE$1;

class CodecWorker {

	constructor(workerData, { readable, writable }, { options, config, streamOptions, useWebWorkers, transferStreams, scripts }, onTaskFinished) {
		const { signal } = streamOptions;
		Object.assign(workerData, {
			busy: true,
			readable: readable.pipeThrough(new ProgressWatcherStream(readable, streamOptions, config), { signal }),
			writable,
			options: Object.assign({}, options),
			scripts,
			transferStreams,
			terminate() {
				const { worker, busy } = workerData;
				if (worker && !busy) {
					worker.terminate();
					workerData.interface = null;
				}
			},
			onTaskFinished() {
				workerData.busy = false;
				onTaskFinished(workerData);
			}
		});
		return (useWebWorkers && WEB_WORKERS_SUPPORTED ? createWebWorkerInterface : createWorkerInterface)(workerData, config);
	}
}

class ProgressWatcherStream extends TransformStream {

	constructor(readableSource, { onstart, onprogress, size, onend }, { chunkSize }) {
		let chunkOffset = 0;
		super({
			start() {
				if (onstart) {
					callHandler(onstart, size);
				}
			},
			async transform(chunk, controller) {
				chunkOffset += chunk.length;
				if (onprogress) {
					await callHandler(onprogress, chunkOffset, size);
				}
				controller.enqueue(chunk);
			},
			flush() {
				readableSource.size = chunkOffset;
				if (onend) {
					callHandler(onend, chunkOffset);
				}
			}
		}, { highWaterMark: 1, size: () => chunkSize });
	}
}

async function callHandler(handler, ...parameters) {
	try {
		await handler(...parameters);
	} catch (_error) {
		// ignored
	}
}

function createWorkerInterface(workerData, config) {
	return {
		run: () => runWorker$1(workerData, config)
	};
}

function createWebWorkerInterface(workerData, { baseURL, chunkSize }) {
	if (!workerData.interface) {
		Object.assign(workerData, {
			worker: getWebWorker(workerData.scripts[0], baseURL, workerData),
			interface: {
				run: () => runWebWorker(workerData, { chunkSize })
			}
		});
	}
	return workerData.interface;
}

async function runWorker$1({ options, readable, writable, onTaskFinished }, config) {
	const codecStream = new CodecStream(options, config);
	try {
		await readable.pipeThrough(codecStream).pipeTo(writable, { preventClose: true, preventAbort: true });
		const {
			signature,
			size
		} = codecStream;
		return {
			signature,
			size
		};
	} finally {
		onTaskFinished();
	}
}

async function runWebWorker(workerData, config) {
	let resolveResult, rejectResult;
	const result = new Promise((resolve, reject) => {
		resolveResult = resolve;
		rejectResult = reject;
	});
	Object.assign(workerData, {
		reader: null,
		writer: null,
		resolveResult,
		rejectResult,
		result
	});
	const { readable, options, scripts } = workerData;
	const { writable, closed } = watchClosedStream(workerData.writable);
	const streamsTransferred = sendMessage({
		type: MESSAGE_START,
		scripts: scripts.slice(1),
		options,
		config,
		readable,
		writable
	}, workerData);
	if (!streamsTransferred) {
		Object.assign(workerData, {
			reader: readable.getReader(),
			writer: writable.getWriter()
		});
	}
	const resultValue = await result;
	try {
		await writable.close();
	} catch (_error) {
		// ignored
	}
	await closed;
	return resultValue;
}

function watchClosedStream(writableSource) {
	const writer = writableSource.getWriter();
	let resolveStreamClosed;
	const closed = new Promise(resolve => resolveStreamClosed = resolve);
	const writable = new WritableStream({
		async write(chunk) {
			await writer.ready;
			await writer.write(chunk);
		},
		close() {
			writer.releaseLock();
			resolveStreamClosed();
		},
		abort(reason) {
			return writer.abort(reason);
		}
	});
	return { writable, closed };
}

let classicWorkersSupported = true;
let transferStreamsSupported = true;

function getWebWorker(url, baseURL, workerData) {
	const workerOptions = { type: "module" };
	let scriptUrl, worker;
	// deno-lint-ignore valid-typeof
	if (typeof url == FUNCTION_TYPE$1) {
		url = url();
	}
	try {
		scriptUrl = new URL(url, baseURL);
	} catch (_error) {
		scriptUrl = url;
	}
	if (classicWorkersSupported) {
		try {
			worker = new Worker(scriptUrl);
		} catch (_error) {
			classicWorkersSupported = false;
			worker = new Worker(scriptUrl, workerOptions);
		}
	} else {
		worker = new Worker(scriptUrl, workerOptions);
	}
	worker.addEventListener(MESSAGE_EVENT_TYPE, event => onMessage(event, workerData));
	return worker;
}

function sendMessage(message, { worker, writer, onTaskFinished, transferStreams }) {
	try {
		let { value, readable, writable } = message;
		const transferables = [];
		if (value) {
			const { buffer, length } = value;
			if (length != buffer.byteLength) {
				value = new Uint8Array(value);
			}
			message.value = value.buffer;
			transferables.push(message.value);
		}
		if (transferStreams && transferStreamsSupported) {
			if (readable) {
				transferables.push(readable);
			}
			if (writable) {
				transferables.push(writable);
			}
		} else {
			message.readable = message.writable = null;
		}
		if (transferables.length) {
			try {
				worker.postMessage(message, transferables);
				return true;
			} catch (_error) {
				transferStreamsSupported = false;
				message.readable = message.writable = null;
				worker.postMessage(message);
			}
		} else {
			worker.postMessage(message);
		}
	} catch (error) {
		if (writer) {
			writer.releaseLock();
		}
		onTaskFinished();
		throw error;
	}
}

async function onMessage({ data }, workerData) {
	const { type, value, messageId, result, error } = data;
	const { reader, writer, resolveResult, rejectResult, onTaskFinished } = workerData;
	try {
		if (error) {
			const { message, stack, code, name } = error;
			const responseError = new Error(message);
			Object.assign(responseError, { stack, code, name });
			close(responseError);
		} else {
			if (type == MESSAGE_PULL) {
				const { value, done } = await reader.read();
				sendMessage({ type: MESSAGE_DATA, value, done, messageId }, workerData);
			}
			if (type == MESSAGE_DATA) {
				await writer.ready;
				await writer.write(new Uint8Array(value));
				sendMessage({ type: MESSAGE_ACK_DATA, messageId }, workerData);
			}
			if (type == MESSAGE_CLOSE) {
				close(null, result);
			}
		}
	} catch (error) {
		close(error);
	}

	function close(error, result) {
		if (error) {
			rejectResult(error);
		} else {
			resolveResult(result);
		}
		if (writer) {
			writer.releaseLock();
		}
		onTaskFinished();
	}
}

/*
 Copyright (c) 2022 Gildas Lormeau. All rights reserved.

 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions are met:

 1. Redistributions of source code must retain the above copyright notice,
 this list of conditions and the following disclaimer.

 2. Redistributions in binary form must reproduce the above copyright 
 notice, this list of conditions and the following disclaimer in 
 the documentation and/or other materials provided with the distribution.

 3. The names of the authors may not be used to endorse or promote products
 derived from this software without specific prior written permission.

 THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESSED OR IMPLIED WARRANTIES,
 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JCRAFT,
 INC. OR ANY CONTRIBUTORS TO THIS SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT,
 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
 OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

let pool = [];
const pendingRequests = [];

let indexWorker = 0;

async function runWorker(stream, workerOptions) {
	const { options, config } = workerOptions;
	const { transferStreams, useWebWorkers, useCompressionStream, codecType, compressed, signed, encrypted } = options;
	const { workerScripts, maxWorkers, terminateWorkerTimeout } = config;
	workerOptions.transferStreams = transferStreams || transferStreams === UNDEFINED_VALUE;
	const streamCopy = !compressed && !signed && !encrypted && !workerOptions.transferStreams;
	workerOptions.useWebWorkers = !streamCopy && (useWebWorkers || (useWebWorkers === UNDEFINED_VALUE && config.useWebWorkers));
	workerOptions.scripts = workerOptions.useWebWorkers && workerScripts ? workerScripts[codecType] : [];
	options.useCompressionStream = useCompressionStream || (useCompressionStream === UNDEFINED_VALUE && config.useCompressionStream);
	let worker;
	const workerData = pool.find(workerData => !workerData.busy);
	if (workerData) {
		clearTerminateTimeout(workerData);
		worker = new CodecWorker(workerData, stream, workerOptions, onTaskFinished);
	} else if (pool.length < maxWorkers) {
		const workerData = { indexWorker };
		indexWorker++;
		pool.push(workerData);
		worker = new CodecWorker(workerData, stream, workerOptions, onTaskFinished);
	} else {
		worker = await new Promise(resolve => pendingRequests.push({ resolve, stream, workerOptions }));
	}
	return worker.run();

	function onTaskFinished(workerData) {
		if (pendingRequests.length) {
			const [{ resolve, stream, workerOptions }] = pendingRequests.splice(0, 1);
			resolve(new CodecWorker(workerData, stream, workerOptions, onTaskFinished));
		} else if (workerData.worker) {
			clearTerminateTimeout(workerData);
			if (Number.isFinite(terminateWorkerTimeout) && terminateWorkerTimeout >= 0) {
				workerData.terminateTimeout = setTimeout(() => {
					pool = pool.filter(data => data != workerData);
					workerData.terminate();
				}, terminateWorkerTimeout);
			}
		} else {
			pool = pool.filter(data => data != workerData);
		}
	}
}

function clearTerminateTimeout(workerData) {
	const { terminateTimeout } = workerData;
	if (terminateTimeout) {
		clearTimeout(terminateTimeout);
		workerData.terminateTimeout = null;
	}
}

function e(e){const t=()=>URL.createObjectURL(new Blob(['const{Array:e,Object:t,Number:n,Math:r,Error:s,Uint8Array:i,Uint16Array:o,Uint32Array:c,Int32Array:f,Map:a,DataView:l,Promise:u,TextEncoder:w,crypto:h,postMessage:d,TransformStream:p,ReadableStream:y,WritableStream:m,CompressionStream:b,DecompressionStream:g}=self;class k{constructor(e){return class extends p{constructor(t,n){const r=new e(n);super({transform(e,t){t.enqueue(r.append(e))},flush(e){const t=r.flush();t&&e.enqueue(t)}})}}}}const v=[];for(let e=0;256>e;e++){let t=e;for(let e=0;8>e;e++)1&t?t=t>>>1^3988292384:t>>>=1;v[e]=t}class S{constructor(e){this.t=e||-1}append(e){let t=0|this.t;for(let n=0,r=0|e.length;r>n;n++)t=t>>>8^v[255&(t^e[n])];this.t=t}get(){return~this.t}}class z extends p{constructor(){const e=new S;super({transform(t){e.append(t)},flush(t){const n=new i(4);new l(n.buffer).setUint32(0,e.get()),t.enqueue(n)}})}}const C={concat(e,t){if(0===e.length||0===t.length)return e.concat(t);const n=e[e.length-1],r=C.i(n);return 32===r?e.concat(t):C.o(t,r,0|n,e.slice(0,e.length-1))},l(e){const t=e.length;if(0===t)return 0;const n=e[t-1];return 32*(t-1)+C.i(n)},u(e,t){if(32*e.length<t)return e;const n=(e=e.slice(0,r.ceil(t/32))).length;return t&=31,n>0&&t&&(e[n-1]=C.h(t,e[n-1]&2147483648>>t-1,1)),e},h:(e,t,n)=>32===e?t:(n?0|t:t<<32-e)+1099511627776*e,i:e=>r.round(e/1099511627776)||32,o(e,t,n,r){for(void 0===r&&(r=[]);t>=32;t-=32)r.push(n),n=0;if(0===t)return r.concat(e);for(let s=0;s<e.length;s++)r.push(n|e[s]>>>t),n=e[s]<<32-t;const s=e.length?e[e.length-1]:0,i=C.i(s);return r.push(C.h(t+i&31,t+i>32?n:r.pop(),1)),r}},x={p:{m(e){const t=C.l(e)/8,n=new i(t);let r;for(let s=0;t>s;s++)0==(3&s)&&(r=e[s/4]),n[s]=r>>>24,r<<=8;return n},g(e){const t=[];let n,r=0;for(n=0;n<e.length;n++)r=r<<8|e[n],3==(3&n)&&(t.push(r),r=0);return 3&n&&t.push(C.h(8*(3&n),r)),t}}},_=class{constructor(e){const t=this;t.blockSize=512,t.k=[1732584193,4023233417,2562383102,271733878,3285377520],t.v=[1518500249,1859775393,2400959708,3395469782],e?(t.S=e.S.slice(0),t.C=e.C.slice(0),t._=e._):t.reset()}reset(){const e=this;return e.S=e.k.slice(0),e.C=[],e._=0,e}update(e){const t=this;"string"==typeof e&&(e=x.A.g(e));const n=t.C=C.concat(t.C,e),r=t._,i=t._=r+C.l(e);if(i>9007199254740991)throw new s("Cannot hash more than 2^53 - 1 bits");const o=new c(n);let f=0;for(let e=t.blockSize+r-(t.blockSize+r&t.blockSize-1);i>=e;e+=t.blockSize)t.I(o.subarray(16*f,16*(f+1))),f+=1;return n.splice(0,16*f),t}D(){const e=this;let t=e.C;const n=e.S;t=C.concat(t,[C.h(1,1)]);for(let e=t.length+2;15&e;e++)t.push(0);for(t.push(r.floor(e._/4294967296)),t.push(0|e._);t.length;)e.I(t.splice(0,16));return e.reset(),n}V(e,t,n,r){return e>19?e>39?e>59?e>79?void 0:t^n^r:t&n|t&r|n&r:t^n^r:t&n|~t&r}P(e,t){return t<<e|t>>>32-e}I(t){const n=this,s=n.S,i=e(80);for(let e=0;16>e;e++)i[e]=t[e];let o=s[0],c=s[1],f=s[2],a=s[3],l=s[4];for(let e=0;79>=e;e++){16>e||(i[e]=n.P(1,i[e-3]^i[e-8]^i[e-14]^i[e-16]));const t=n.P(5,o)+n.V(e,c,f,a)+l+i[e]+n.v[r.floor(e/20)]|0;l=a,a=f,f=n.P(30,c),c=o,o=t}s[0]=s[0]+o|0,s[1]=s[1]+c|0,s[2]=s[2]+f|0,s[3]=s[3]+a|0,s[4]=s[4]+l|0}},A={getRandomValues(e){const t=new c(e.buffer),n=e=>{let t=987654321;const n=4294967295;return()=>(t=36969*(65535&t)+(t>>16)&n,(((t<<16)+(e=18e3*(65535&e)+(e>>16)&n)&n)/4294967296+.5)*(r.random()>.5?1:-1))};for(let s,i=0;i<e.length;i+=4){const e=n(4294967296*(s||r.random()));s=987654071*e(),t[i/4]=4294967296*e()|0}return e}},I={importKey:e=>new I.R(x.p.g(e)),B(e,t,n,r){if(n=n||1e4,0>r||0>n)throw new s("invalid params to pbkdf2");const i=1+(r>>5)<<2;let o,c,f,a,u;const w=new ArrayBuffer(i),h=new l(w);let d=0;const p=C;for(t=x.p.g(t),u=1;(i||1)>d;u++){for(o=c=e.encrypt(p.concat(t,[u])),f=1;n>f;f++)for(c=e.encrypt(c),a=0;a<c.length;a++)o[a]^=c[a];for(f=0;(i||1)>d&&f<o.length;f++)h.setInt32(d,o[f]),d+=4}return w.slice(0,r/8)},R:class{constructor(e){const t=this,n=t.M=_,r=[[],[]];t.K=[new n,new n];const s=t.K[0].blockSize/32;e.length>s&&(e=(new n).update(e).D());for(let t=0;s>t;t++)r[0][t]=909522486^e[t],r[1][t]=1549556828^e[t];t.K[0].update(r[0]),t.K[1].update(r[1]),t.U=new n(t.K[0])}reset(){const e=this;e.U=new e.M(e.K[0]),e.N=!1}update(e){this.N=!0,this.U.update(e)}digest(){const e=this,t=e.U.D(),n=new e.M(e.K[1]).update(t).D();return e.reset(),n}encrypt(e){if(this.N)throw new s("encrypt on already updated hmac called!");return this.update(e),this.digest(e)}}},D=void 0!==h&&"function"==typeof h.getRandomValues,V="Invalid password",P="Invalid signature",R="zipjs-abort-check-password";function B(e){return D?h.getRandomValues(e):A.getRandomValues(e)}const E=16,M={name:"PBKDF2"},K=t.assign({hash:{name:"HMAC"}},M),U=t.assign({iterations:1e3,hash:{name:"SHA-1"}},M),N=["deriveBits"],O=[8,12,16],T=[16,24,32],W=10,j=[0,0,0,0],H="undefined",L="function",F=typeof h!=H,q=F&&h.subtle,G=F&&typeof q!=H,J=x.p,Q=class{constructor(e){const t=this;t.O=[[[],[],[],[],[]],[[],[],[],[],[]]],t.O[0][0][0]||t.T();const n=t.O[0][4],r=t.O[1],i=e.length;let o,c,f,a=1;if(4!==i&&6!==i&&8!==i)throw new s("invalid aes key size");for(t.v=[c=e.slice(0),f=[]],o=i;4*i+28>o;o++){let e=c[o-1];(o%i==0||8===i&&o%i==4)&&(e=n[e>>>24]<<24^n[e>>16&255]<<16^n[e>>8&255]<<8^n[255&e],o%i==0&&(e=e<<8^e>>>24^a<<24,a=a<<1^283*(a>>7))),c[o]=c[o-i]^e}for(let e=0;o;e++,o--){const t=c[3&e?o:o-4];f[e]=4>=o||4>e?t:r[0][n[t>>>24]]^r[1][n[t>>16&255]]^r[2][n[t>>8&255]]^r[3][n[255&t]]}}encrypt(e){return this.W(e,0)}decrypt(e){return this.W(e,1)}T(){const e=this.O[0],t=this.O[1],n=e[4],r=t[4],s=[],i=[];let o,c,f,a;for(let e=0;256>e;e++)i[(s[e]=e<<1^283*(e>>7))^e]=e;for(let l=o=0;!n[l];l^=c||1,o=i[o]||1){let i=o^o<<1^o<<2^o<<3^o<<4;i=i>>8^255&i^99,n[l]=i,r[i]=l,a=s[f=s[c=s[l]]];let u=16843009*a^65537*f^257*c^16843008*l,w=257*s[i]^16843008*i;for(let n=0;4>n;n++)e[n][l]=w=w<<24^w>>>8,t[n][i]=u=u<<24^u>>>8}for(let n=0;5>n;n++)e[n]=e[n].slice(0),t[n]=t[n].slice(0)}W(e,t){if(4!==e.length)throw new s("invalid aes block size");const n=this.v[t],r=n.length/4-2,i=[0,0,0,0],o=this.O[t],c=o[0],f=o[1],a=o[2],l=o[3],u=o[4];let w,h,d,p=e[0]^n[0],y=e[t?3:1]^n[1],m=e[2]^n[2],b=e[t?1:3]^n[3],g=4;for(let e=0;r>e;e++)w=c[p>>>24]^f[y>>16&255]^a[m>>8&255]^l[255&b]^n[g],h=c[y>>>24]^f[m>>16&255]^a[b>>8&255]^l[255&p]^n[g+1],d=c[m>>>24]^f[b>>16&255]^a[p>>8&255]^l[255&y]^n[g+2],b=c[b>>>24]^f[p>>16&255]^a[y>>8&255]^l[255&m]^n[g+3],g+=4,p=w,y=h,m=d;for(let e=0;4>e;e++)i[t?3&-e:e]=u[p>>>24]<<24^u[y>>16&255]<<16^u[m>>8&255]<<8^u[255&b]^n[g++],w=p,p=y,y=m,m=b,b=w;return i}},X=class{constructor(e,t){this.j=e,this.H=t,this.L=t}reset(){this.L=this.H}update(e){return this.F(this.j,e,this.L)}q(e){if(255==(e>>24&255)){let t=e>>16&255,n=e>>8&255,r=255&e;255===t?(t=0,255===n?(n=0,255===r?r=0:++r):++n):++t,e=0,e+=t<<16,e+=n<<8,e+=r}else e+=1<<24;return e}G(e){0===(e[0]=this.q(e[0]))&&(e[1]=this.q(e[1]))}F(e,t,n){let r;if(!(r=t.length))return[];const s=C.l(t);for(let s=0;r>s;s+=4){this.G(n);const r=e.encrypt(n);t[s]^=r[0],t[s+1]^=r[1],t[s+2]^=r[2],t[s+3]^=r[3]}return C.u(t,s)}},Y=I.R;let Z=F&&G&&typeof q.importKey==L,$=F&&G&&typeof q.deriveBits==L;class ee extends p{constructor({password:e,signed:n,encryptionStrength:r,checkPasswordOnly:o}){super({start(){t.assign(this,{ready:new u((e=>this.J=e)),password:e,signed:n,X:r-1,pending:new i})},async transform(e,t){const n=this,{password:r,X:c,J:f,ready:a}=n;r?(await(async(e,t,n,r)=>{const i=await re(e,t,n,ie(r,0,O[t])),o=ie(r,O[t]);if(i[0]!=o[0]||i[1]!=o[1])throw new s(V)})(n,c,r,ie(e,0,O[c]+2)),e=ie(e,O[c]+2),o?t.error(new s(R)):f()):await a;const l=new i(e.length-W-(e.length-W)%E);t.enqueue(ne(n,e,l,0,W,!0))},async flush(e){const{signed:t,Y:n,Z:r,pending:o,ready:c}=this;await c;const f=ie(o,0,o.length-W),a=ie(o,o.length-W);let l=new i;if(f.length){const e=ce(J,f);r.update(e);const t=n.update(e);l=oe(J,t)}if(t){const e=ie(oe(J,r.digest()),0,W);for(let t=0;W>t;t++)if(e[t]!=a[t])throw new s(P)}e.enqueue(l)}})}}class te extends p{constructor({password:e,encryptionStrength:n}){let r;super({start(){t.assign(this,{ready:new u((e=>this.J=e)),password:e,X:n-1,pending:new i})},async transform(e,t){const n=this,{password:r,X:s,J:o,ready:c}=n;let f=new i;r?(f=await(async(e,t,n)=>{const r=B(new i(O[t]));return se(r,await re(e,t,n,r))})(n,s,r),o()):await c;const a=new i(f.length+e.length-e.length%E);a.set(f,0),t.enqueue(ne(n,e,a,f.length,0))},async flush(e){const{Y:t,Z:n,pending:s,ready:o}=this;await o;let c=new i;if(s.length){const e=t.update(ce(J,s));n.update(e),c=oe(J,e)}r.signature=oe(J,n.digest()).slice(0,W),e.enqueue(se(c,r.signature))}}),r=this}}function ne(e,t,n,r,s,o){const{Y:c,Z:f,pending:a}=e,l=t.length-s;let u;for(a.length&&(t=se(a,t),n=((e,t)=>{if(t&&t>e.length){const n=e;(e=new i(t)).set(n,0)}return e})(n,l-l%E)),u=0;l-E>=u;u+=E){const e=ce(J,ie(t,u,u+E));o&&f.update(e);const s=c.update(e);o||f.update(s),n.set(oe(J,s),u+r)}return e.pending=ie(t,u),n}async function re(n,r,s,o){n.password=null;const c=(e=>{if(void 0===w){const t=new i((e=unescape(encodeURIComponent(e))).length);for(let n=0;n<t.length;n++)t[n]=e.charCodeAt(n);return t}return(new w).encode(e)})(s),f=await(async(e,t,n,r,s)=>{if(!Z)return I.importKey(t);try{return await q.importKey("raw",t,n,!1,s)}catch(e){return Z=!1,I.importKey(t)}})(0,c,K,0,N),a=await(async(e,t,n)=>{if(!$)return I.B(t,e.salt,U.iterations,n);try{return await q.deriveBits(e,t,n)}catch(r){return $=!1,I.B(t,e.salt,U.iterations,n)}})(t.assign({salt:o},U),f,8*(2*T[r]+2)),l=new i(a),u=ce(J,ie(l,0,T[r])),h=ce(J,ie(l,T[r],2*T[r])),d=ie(l,2*T[r]);return t.assign(n,{keys:{key:u,$:h,passwordVerification:d},Y:new X(new Q(u),e.from(j)),Z:new Y(h)}),d}function se(e,t){let n=e;return e.length+t.length&&(n=new i(e.length+t.length),n.set(e,0),n.set(t,e.length)),n}function ie(e,t,n){return e.subarray(t,n)}function oe(e,t){return e.m(t)}function ce(e,t){return e.g(t)}class fe extends p{constructor({password:e,passwordVerification:n,checkPasswordOnly:r}){super({start(){t.assign(this,{password:e,passwordVerification:n}),we(this,e)},transform(e,t){const n=this;if(n.password){const t=le(n,e.subarray(0,12));if(n.password=null,t[11]!=n.passwordVerification)throw new s(V);e=e.subarray(12)}r?t.error(new s(R)):t.enqueue(le(n,e))}})}}class ae extends p{constructor({password:e,passwordVerification:n}){super({start(){t.assign(this,{password:e,passwordVerification:n}),we(this,e)},transform(e,t){const n=this;let r,s;if(n.password){n.password=null;const t=B(new i(12));t[11]=n.passwordVerification,r=new i(e.length+t.length),r.set(ue(n,t),0),s=12}else r=new i(e.length),s=0;r.set(ue(n,e),s),t.enqueue(r)}})}}function le(e,t){const n=new i(t.length);for(let r=0;r<t.length;r++)n[r]=de(e)^t[r],he(e,n[r]);return n}function ue(e,t){const n=new i(t.length);for(let r=0;r<t.length;r++)n[r]=de(e)^t[r],he(e,t[r]);return n}function we(e,n){const r=[305419896,591751049,878082192];t.assign(e,{keys:r,ee:new S(r[0]),te:new S(r[2])});for(let t=0;t<n.length;t++)he(e,n.charCodeAt(t))}function he(e,t){let[n,s,i]=e.keys;e.ee.append([t]),n=~e.ee.get(),s=ye(r.imul(ye(s+pe(n)),134775813)+1),e.te.append([s>>>24]),i=~e.te.get(),e.keys=[n,s,i]}function de(e){const t=2|e.keys[2];return pe(r.imul(t,1^t)>>>8)}function pe(e){return 255&e}function ye(e){return 4294967295&e}const me="deflate-raw";class be extends p{constructor(e,{chunkSize:t,CompressionStream:n,CompressionStreamNative:r}){super({});const{compressed:s,encrypted:i,useCompressionStream:o,zipCrypto:c,signed:f,level:a}=e,u=this;let w,h,d=ke(super.readable);i&&!c||!f||([d,w]=d.tee(),w=ze(w,new z)),s&&(d=Se(d,o,{level:a,chunkSize:t},r,n)),i&&(c?d=ze(d,new ae(e)):(h=new te(e),d=ze(d,h))),ve(u,d,(async()=>{let e;i&&!c&&(e=h.signature),i&&!c||!f||(e=await w.getReader().read(),e=new l(e.value.buffer).getUint32(0)),u.signature=e}))}}class ge extends p{constructor(e,{chunkSize:t,DecompressionStream:n,DecompressionStreamNative:r}){super({});const{zipCrypto:i,encrypted:o,signed:c,signature:f,compressed:a,useCompressionStream:u}=e;let w,h,d=ke(super.readable);o&&(i?d=ze(d,new fe(e)):(h=new ee(e),d=ze(d,h))),a&&(d=Se(d,u,{chunkSize:t},r,n)),o&&!i||!c||([d,w]=d.tee(),w=ze(w,new z)),ve(this,d,(async()=>{if((!o||i)&&c){const e=await w.getReader().read(),t=new l(e.value.buffer);if(f!=t.getUint32(0,!1))throw new s(P)}}))}}function ke(e){return ze(e,new p({transform(e,t){e&&e.length&&t.enqueue(e)}}))}function ve(e,n,r){n=ze(n,new p({flush:r})),t.defineProperty(e,"readable",{get:()=>n})}function Se(e,t,n,r,s){try{e=ze(e,new(t&&r?r:s)(me,n))}catch(r){if(!t)throw r;e=ze(e,new s(me,n))}return e}function ze(e,t){return e.pipeThrough(t)}const Ce="data";class xe extends p{constructor(e,n){super({});const r=this,{codecType:s}=e;let i;s.startsWith("deflate")?i=be:s.startsWith("inflate")&&(i=ge);let o=0;const c=new i(e,n),f=super.readable,a=new p({transform(e,t){e&&e.length&&(o+=e.length,t.enqueue(e))},flush(){const{signature:e}=c;t.assign(r,{signature:e,size:o})}});t.defineProperty(r,"readable",{get:()=>f.pipeThrough(c).pipeThrough(a)})}}const _e=new a,Ae=new a;let Ie=0;async function De(e){try{const{options:t,scripts:r,config:s}=e;r&&r.length&&importScripts.apply(void 0,r),self.initCodec&&self.initCodec(),s.CompressionStreamNative=self.CompressionStream,s.DecompressionStreamNative=self.DecompressionStream,self.Deflate&&(s.CompressionStream=new k(self.Deflate)),self.Inflate&&(s.DecompressionStream=new k(self.Inflate));const i={highWaterMark:1,size:()=>s.chunkSize},o=e.readable||new y({async pull(e){const t=new u((e=>_e.set(Ie,e)));Ve({type:"pull",messageId:Ie}),Ie=(Ie+1)%n.MAX_SAFE_INTEGER;const{value:r,done:s}=await t;e.enqueue(r),s&&e.close()}},i),c=e.writable||new m({async write(e){let t;const r=new u((e=>t=e));Ae.set(Ie,t),Ve({type:Ce,value:e,messageId:Ie}),Ie=(Ie+1)%n.MAX_SAFE_INTEGER,await r}},i),f=new xe(t,s);await o.pipeThrough(f).pipeTo(c,{preventClose:!0,preventAbort:!0});try{await c.close()}catch(e){}const{signature:a,size:l}=f;Ve({type:"close",result:{signature:a,size:l}})}catch(e){Pe(e)}}function Ve(e){let{value:t}=e;if(t)if(t.length)try{t=new i(t),e.value=t.buffer,d(e,[e.value])}catch(t){d(e)}else d(e);else d(e)}function Pe(e){const{message:t,stack:n,code:r,name:s}=e;d({error:{message:t,stack:n,code:r,name:s}})}addEventListener("message",(({data:e})=>{const{type:t,messageId:n,value:r,done:s}=e;try{if("start"==t&&De(e),t==Ce){const e=_e.get(n);_e.delete(n),e({value:new i(r),done:s})}if("ack"==t){const e=Ae.get(n);Ae.delete(n),e()}}catch(e){Pe(e)}}));const Re=-2;function Be(t){return Ee(t.map((([t,n])=>new e(t).fill(n,0,t))))}function Ee(t){return t.reduce(((t,n)=>t.concat(e.isArray(n)?Ee(n):n)),[])}const Me=[0,1,2,3].concat(...Be([[2,4],[2,5],[4,6],[4,7],[8,8],[8,9],[16,10],[16,11],[32,12],[32,13],[64,14],[64,15],[2,0],[1,16],[1,17],[2,18],[2,19],[4,20],[4,21],[8,22],[8,23],[16,24],[16,25],[32,26],[32,27],[64,28],[64,29]]));function Ke(){const e=this;function t(e,t){let n=0;do{n|=1&e,e>>>=1,n<<=1}while(--t>0);return n>>>1}e.ne=n=>{const s=e.re,i=e.ie.se,o=e.ie.oe;let c,f,a,l=-1;for(n.ce=0,n.fe=573,c=0;o>c;c++)0!==s[2*c]?(n.ae[++n.ce]=l=c,n.le[c]=0):s[2*c+1]=0;for(;2>n.ce;)a=n.ae[++n.ce]=2>l?++l:0,s[2*a]=1,n.le[a]=0,n.ue--,i&&(n.we-=i[2*a+1]);for(e.he=l,c=r.floor(n.ce/2);c>=1;c--)n.de(s,c);a=o;do{c=n.ae[1],n.ae[1]=n.ae[n.ce--],n.de(s,1),f=n.ae[1],n.ae[--n.fe]=c,n.ae[--n.fe]=f,s[2*a]=s[2*c]+s[2*f],n.le[a]=r.max(n.le[c],n.le[f])+1,s[2*c+1]=s[2*f+1]=a,n.ae[1]=a++,n.de(s,1)}while(n.ce>=2);n.ae[--n.fe]=n.ae[1],(t=>{const n=e.re,r=e.ie.se,s=e.ie.pe,i=e.ie.ye,o=e.ie.me;let c,f,a,l,u,w,h=0;for(l=0;15>=l;l++)t.be[l]=0;for(n[2*t.ae[t.fe]+1]=0,c=t.fe+1;573>c;c++)f=t.ae[c],l=n[2*n[2*f+1]+1]+1,l>o&&(l=o,h++),n[2*f+1]=l,f>e.he||(t.be[l]++,u=0,i>f||(u=s[f-i]),w=n[2*f],t.ue+=w*(l+u),r&&(t.we+=w*(r[2*f+1]+u)));if(0!==h){do{for(l=o-1;0===t.be[l];)l--;t.be[l]--,t.be[l+1]+=2,t.be[o]--,h-=2}while(h>0);for(l=o;0!==l;l--)for(f=t.be[l];0!==f;)a=t.ae[--c],a>e.he||(n[2*a+1]!=l&&(t.ue+=(l-n[2*a+1])*n[2*a],n[2*a+1]=l),f--)}})(n),((e,n,r)=>{const s=[];let i,o,c,f=0;for(i=1;15>=i;i++)s[i]=f=f+r[i-1]<<1;for(o=0;n>=o;o++)c=e[2*o+1],0!==c&&(e[2*o]=t(s[c]++,c))})(s,e.he,n.be)}}function Ue(e,t,n,r,s){const i=this;i.se=e,i.pe=t,i.ye=n,i.oe=r,i.me=s}Ke.ge=[0,1,2,3,4,5,6,7].concat(...Be([[2,8],[2,9],[2,10],[2,11],[4,12],[4,13],[4,14],[4,15],[8,16],[8,17],[8,18],[8,19],[16,20],[16,21],[16,22],[16,23],[32,24],[32,25],[32,26],[31,27],[1,28]])),Ke.ke=[0,1,2,3,4,5,6,7,8,10,12,14,16,20,24,28,32,40,48,56,64,80,96,112,128,160,192,224,0],Ke.ve=[0,1,2,3,4,6,8,12,16,24,32,48,64,96,128,192,256,384,512,768,1024,1536,2048,3072,4096,6144,8192,12288,16384,24576],Ke.Se=e=>256>e?Me[e]:Me[256+(e>>>7)],Ke.ze=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0],Ke.Ce=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13],Ke.xe=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7],Ke._e=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];const Ne=Be([[144,8],[112,9],[24,7],[8,8]]);Ue.Ae=Ee([12,140,76,204,44,172,108,236,28,156,92,220,60,188,124,252,2,130,66,194,34,162,98,226,18,146,82,210,50,178,114,242,10,138,74,202,42,170,106,234,26,154,90,218,58,186,122,250,6,134,70,198,38,166,102,230,22,150,86,214,54,182,118,246,14,142,78,206,46,174,110,238,30,158,94,222,62,190,126,254,1,129,65,193,33,161,97,225,17,145,81,209,49,177,113,241,9,137,73,201,41,169,105,233,25,153,89,217,57,185,121,249,5,133,69,197,37,165,101,229,21,149,85,213,53,181,117,245,13,141,77,205,45,173,109,237,29,157,93,221,61,189,125,253,19,275,147,403,83,339,211,467,51,307,179,435,115,371,243,499,11,267,139,395,75,331,203,459,43,299,171,427,107,363,235,491,27,283,155,411,91,347,219,475,59,315,187,443,123,379,251,507,7,263,135,391,71,327,199,455,39,295,167,423,103,359,231,487,23,279,151,407,87,343,215,471,55,311,183,439,119,375,247,503,15,271,143,399,79,335,207,463,47,303,175,431,111,367,239,495,31,287,159,415,95,351,223,479,63,319,191,447,127,383,255,511,0,64,32,96,16,80,48,112,8,72,40,104,24,88,56,120,4,68,36,100,20,84,52,116,3,131,67,195,35,163,99,227].map(((e,t)=>[e,Ne[t]])));const Oe=Be([[30,5]]);function Te(e,t,n,r,s){const i=this;i.Ie=e,i.De=t,i.Ve=n,i.Pe=r,i.Re=s}Ue.Be=Ee([0,16,8,24,4,20,12,28,2,18,10,26,6,22,14,30,1,17,9,25,5,21,13,29,3,19,11,27,7,23].map(((e,t)=>[e,Oe[t]]))),Ue.Ee=new Ue(Ue.Ae,Ke.ze,257,286,15),Ue.Me=new Ue(Ue.Be,Ke.Ce,0,30,15),Ue.Ke=new Ue(null,Ke.xe,0,19,7);const We=[new Te(0,0,0,0,0),new Te(4,4,8,4,1),new Te(4,5,16,8,1),new Te(4,6,32,32,1),new Te(4,4,16,16,2),new Te(8,16,32,32,2),new Te(8,16,128,128,2),new Te(8,32,128,256,2),new Te(32,128,258,1024,2),new Te(32,258,258,4096,2)],je=["need dictionary","stream end","","","stream error","data error","","buffer error","",""],He=113,Le=666,Fe=262;function qe(e,t,n,r){const s=e[2*t],i=e[2*n];return i>s||s==i&&r[t]<=r[n]}function Ge(){const e=this;let t,n,s,c,f,a,l,u,w,h,d,p,y,m,b,g,k,v,S,z,C,x,_,A,I,D,V,P,R,B,E,M,K;const U=new Ke,N=new Ke,O=new Ke;let T,W,j,H,L,F;function q(){let t;for(t=0;286>t;t++)E[2*t]=0;for(t=0;30>t;t++)M[2*t]=0;for(t=0;19>t;t++)K[2*t]=0;E[512]=1,e.ue=e.we=0,W=j=0}function G(e,t){let n,r=-1,s=e[1],i=0,o=7,c=4;0===s&&(o=138,c=3),e[2*(t+1)+1]=65535;for(let f=0;t>=f;f++)n=s,s=e[2*(f+1)+1],++i<o&&n==s||(c>i?K[2*n]+=i:0!==n?(n!=r&&K[2*n]++,K[32]++):i>10?K[36]++:K[34]++,i=0,r=n,0===s?(o=138,c=3):n==s?(o=6,c=3):(o=7,c=4))}function J(t){e.Ue[e.pending++]=t}function Q(e){J(255&e),J(e>>>8&255)}function X(e,t){let n;const r=t;F>16-r?(n=e,L|=n<<F&65535,Q(L),L=n>>>16-F,F+=r-16):(L|=e<<F&65535,F+=r)}function Y(e,t){const n=2*e;X(65535&t[n],65535&t[n+1])}function Z(e,t){let n,r,s=-1,i=e[1],o=0,c=7,f=4;for(0===i&&(c=138,f=3),n=0;t>=n;n++)if(r=i,i=e[2*(n+1)+1],++o>=c||r!=i){if(f>o)do{Y(r,K)}while(0!=--o);else 0!==r?(r!=s&&(Y(r,K),o--),Y(16,K),X(o-3,2)):o>10?(Y(18,K),X(o-11,7)):(Y(17,K),X(o-3,3));o=0,s=r,0===i?(c=138,f=3):r==i?(c=6,f=3):(c=7,f=4)}}function $(){16==F?(Q(L),L=0,F=0):8>F||(J(255&L),L>>>=8,F-=8)}function ee(t,n){let s,i,o;if(e.Ne[W]=t,e.Oe[W]=255&n,W++,0===t?E[2*n]++:(j++,t--,E[2*(Ke.ge[n]+256+1)]++,M[2*Ke.Se(t)]++),0==(8191&W)&&V>2){for(s=8*W,i=C-k,o=0;30>o;o++)s+=M[2*o]*(5+Ke.Ce[o]);if(s>>>=3,j<r.floor(W/2)&&s<r.floor(i/2))return!0}return W==T-1}function te(t,n){let r,s,i,o,c=0;if(0!==W)do{r=e.Ne[c],s=e.Oe[c],c++,0===r?Y(s,t):(i=Ke.ge[s],Y(i+256+1,t),o=Ke.ze[i],0!==o&&(s-=Ke.ke[i],X(s,o)),r--,i=Ke.Se(r),Y(i,n),o=Ke.Ce[i],0!==o&&(r-=Ke.ve[i],X(r,o)))}while(W>c);Y(256,t),H=t[513]}function ne(){F>8?Q(L):F>0&&J(255&L),L=0,F=0}function re(t,n,r){X(0+(r?1:0),3),((t,n)=>{ne(),H=8,Q(n),Q(~n),e.Ue.set(u.subarray(t,t+n),e.pending),e.pending+=n})(t,n)}function se(n){((t,n,r)=>{let s,i,o=0;V>0?(U.ne(e),N.ne(e),o=(()=>{let t;for(G(E,U.he),G(M,N.he),O.ne(e),t=18;t>=3&&0===K[2*Ke._e[t]+1];t--);return e.ue+=14+3*(t+1),t})(),s=e.ue+3+7>>>3,i=e.we+3+7>>>3,i>s||(s=i)):s=i=n+5,n+4>s||-1==t?i==s?(X(2+(r?1:0),3),te(Ue.Ae,Ue.Be)):(X(4+(r?1:0),3),((e,t,n)=>{let r;for(X(e-257,5),X(t-1,5),X(n-4,4),r=0;n>r;r++)X(K[2*Ke._e[r]+1],3);Z(E,e-1),Z(M,t-1)})(U.he+1,N.he+1,o+1),te(E,M)):re(t,n,r),q(),r&&ne()})(0>k?-1:k,C-k,n),k=C,t.Te()}function ie(){let e,n,r,s;do{if(s=w-_-C,0===s&&0===C&&0===_)s=f;else if(-1==s)s--;else if(C>=f+f-Fe){u.set(u.subarray(f,f+f),0),x-=f,C-=f,k-=f,e=y,r=e;do{n=65535&d[--r],d[r]=f>n?0:n-f}while(0!=--e);e=f,r=e;do{n=65535&h[--r],h[r]=f>n?0:n-f}while(0!=--e);s+=f}if(0===t.We)return;e=t.je(u,C+_,s),_+=e,3>_||(p=255&u[C],p=(p<<g^255&u[C+1])&b)}while(Fe>_&&0!==t.We)}function oe(e){let t,n,r=I,s=C,i=A;const o=C>f-Fe?C-(f-Fe):0;let c=B;const a=l,w=C+258;let d=u[s+i-1],p=u[s+i];R>A||(r>>=2),c>_&&(c=_);do{if(t=e,u[t+i]==p&&u[t+i-1]==d&&u[t]==u[s]&&u[++t]==u[s+1]){s+=2,t++;do{}while(u[++s]==u[++t]&&u[++s]==u[++t]&&u[++s]==u[++t]&&u[++s]==u[++t]&&u[++s]==u[++t]&&u[++s]==u[++t]&&u[++s]==u[++t]&&u[++s]==u[++t]&&w>s);if(n=258-(w-s),s=w-258,n>i){if(x=e,i=n,n>=c)break;d=u[s+i-1],p=u[s+i]}}}while((e=65535&h[e&a])>o&&0!=--r);return i>_?_:i}e.le=[],e.be=[],e.ae=[],E=[],M=[],K=[],e.de=(t,n)=>{const r=e.ae,s=r[n];let i=n<<1;for(;i<=e.ce&&(i<e.ce&&qe(t,r[i+1],r[i],e.le)&&i++,!qe(t,s,r[i],e.le));)r[n]=r[i],n=i,i<<=1;r[n]=s},e.He=(t,S,x,W,j,G)=>(W||(W=8),j||(j=8),G||(G=0),t.Le=null,-1==S&&(S=6),1>j||j>9||8!=W||9>x||x>15||0>S||S>9||0>G||G>2?Re:(t.Fe=e,a=x,f=1<<a,l=f-1,m=j+7,y=1<<m,b=y-1,g=r.floor((m+3-1)/3),u=new i(2*f),h=[],d=[],T=1<<j+6,e.Ue=new i(4*T),s=4*T,e.Ne=new o(T),e.Oe=new i(T),V=S,P=G,(t=>(t.qe=t.Ge=0,t.Le=null,e.pending=0,e.Je=0,n=He,c=0,U.re=E,U.ie=Ue.Ee,N.re=M,N.ie=Ue.Me,O.re=K,O.ie=Ue.Ke,L=0,F=0,H=8,q(),(()=>{w=2*f,d[y-1]=0;for(let e=0;y-1>e;e++)d[e]=0;D=We[V].De,R=We[V].Ie,B=We[V].Ve,I=We[V].Pe,C=0,k=0,_=0,v=A=2,z=0,p=0})(),0))(t))),e.Qe=()=>42!=n&&n!=He&&n!=Le?Re:(e.Oe=null,e.Ne=null,e.Ue=null,d=null,h=null,u=null,e.Fe=null,n==He?-3:0),e.Xe=(e,t,n)=>{let r=0;return-1==t&&(t=6),0>t||t>9||0>n||n>2?Re:(We[V].Re!=We[t].Re&&0!==e.qe&&(r=e.Ye(1)),V!=t&&(V=t,D=We[V].De,R=We[V].Ie,B=We[V].Ve,I=We[V].Pe),P=n,r)},e.Ze=(e,t,r)=>{let s,i=r,o=0;if(!t||42!=n)return Re;if(3>i)return 0;for(i>f-Fe&&(i=f-Fe,o=r-i),u.set(t.subarray(o,o+i),0),C=i,k=i,p=255&u[0],p=(p<<g^255&u[1])&b,s=0;i-3>=s;s++)p=(p<<g^255&u[s+2])&b,h[s&l]=d[p],d[p]=s;return 0},e.Ye=(r,i)=>{let o,w,m,I,R;if(i>4||0>i)return Re;if(!r.$e||!r.et&&0!==r.We||n==Le&&4!=i)return r.Le=je[4],Re;if(0===r.tt)return r.Le=je[7],-5;var B;if(t=r,I=c,c=i,42==n&&(w=8+(a-8<<4)<<8,m=(V-1&255)>>1,m>3&&(m=3),w|=m<<6,0!==C&&(w|=32),w+=31-w%31,n=He,J((B=w)>>8&255),J(255&B)),0!==e.pending){if(t.Te(),0===t.tt)return c=-1,0}else if(0===t.We&&I>=i&&4!=i)return t.Le=je[7],-5;if(n==Le&&0!==t.We)return r.Le=je[7],-5;if(0!==t.We||0!==_||0!=i&&n!=Le){switch(R=-1,We[V].Re){case 0:R=(e=>{let n,r=65535;for(r>s-5&&(r=s-5);;){if(1>=_){if(ie(),0===_&&0==e)return 0;if(0===_)break}if(C+=_,_=0,n=k+r,(0===C||C>=n)&&(_=C-n,C=n,se(!1),0===t.tt))return 0;if(C-k>=f-Fe&&(se(!1),0===t.tt))return 0}return se(4==e),0===t.tt?4==e?2:0:4==e?3:1})(i);break;case 1:R=(e=>{let n,r=0;for(;;){if(Fe>_){if(ie(),Fe>_&&0==e)return 0;if(0===_)break}if(3>_||(p=(p<<g^255&u[C+2])&b,r=65535&d[p],h[C&l]=d[p],d[p]=C),0===r||(C-r&65535)>f-Fe||2!=P&&(v=oe(r)),3>v)n=ee(0,255&u[C]),_--,C++;else if(n=ee(C-x,v-3),_-=v,v>D||3>_)C+=v,v=0,p=255&u[C],p=(p<<g^255&u[C+1])&b;else{v--;do{C++,p=(p<<g^255&u[C+2])&b,r=65535&d[p],h[C&l]=d[p],d[p]=C}while(0!=--v);C++}if(n&&(se(!1),0===t.tt))return 0}return se(4==e),0===t.tt?4==e?2:0:4==e?3:1})(i);break;case 2:R=(e=>{let n,r,s=0;for(;;){if(Fe>_){if(ie(),Fe>_&&0==e)return 0;if(0===_)break}if(3>_||(p=(p<<g^255&u[C+2])&b,s=65535&d[p],h[C&l]=d[p],d[p]=C),A=v,S=x,v=2,0!==s&&D>A&&f-Fe>=(C-s&65535)&&(2!=P&&(v=oe(s)),5>=v&&(1==P||3==v&&C-x>4096)&&(v=2)),3>A||v>A)if(0!==z){if(n=ee(0,255&u[C-1]),n&&se(!1),C++,_--,0===t.tt)return 0}else z=1,C++,_--;else{r=C+_-3,n=ee(C-1-S,A-3),_-=A-1,A-=2;do{++C>r||(p=(p<<g^255&u[C+2])&b,s=65535&d[p],h[C&l]=d[p],d[p]=C)}while(0!=--A);if(z=0,v=2,C++,n&&(se(!1),0===t.tt))return 0}}return 0!==z&&(n=ee(0,255&u[C-1]),z=0),se(4==e),0===t.tt?4==e?2:0:4==e?3:1})(i)}if(2!=R&&3!=R||(n=Le),0==R||2==R)return 0===t.tt&&(c=-1),0;if(1==R){if(1==i)X(2,3),Y(256,Ue.Ae),$(),9>1+H+10-F&&(X(2,3),Y(256,Ue.Ae),$()),H=7;else if(re(0,0,!1),3==i)for(o=0;y>o;o++)d[o]=0;if(t.Te(),0===t.tt)return c=-1,0}}return 4!=i?0:1}}function Je(){const e=this;e.nt=0,e.rt=0,e.We=0,e.qe=0,e.tt=0,e.Ge=0}function Qe(e){const t=new Je,n=(o=e&&e.chunkSize?e.chunkSize:65536)+5*(r.floor(o/16383)+1);var o;const c=new i(n);let f=e?e.level:-1;void 0===f&&(f=-1),t.He(f),t.$e=c,this.append=(e,r)=>{let o,f,a=0,l=0,u=0;const w=[];if(e.length){t.nt=0,t.et=e,t.We=e.length;do{if(t.rt=0,t.tt=n,o=t.Ye(0),0!=o)throw new s("deflating: "+t.Le);t.rt&&(t.rt==n?w.push(new i(c)):w.push(c.slice(0,t.rt))),u+=t.rt,r&&t.nt>0&&t.nt!=a&&(r(t.nt),a=t.nt)}while(t.We>0||0===t.tt);return w.length>1?(f=new i(u),w.forEach((e=>{f.set(e,l),l+=e.length}))):f=w[0]||new i,f}},this.flush=()=>{let e,r,o=0,f=0;const a=[];do{if(t.rt=0,t.tt=n,e=t.Ye(4),1!=e&&0!=e)throw new s("deflating: "+t.Le);n-t.tt>0&&a.push(c.slice(0,t.rt)),f+=t.rt}while(t.We>0||0===t.tt);return t.Qe(),r=new i(f),a.forEach((e=>{r.set(e,o),o+=e.length})),r}}Je.prototype={He(e,t){const n=this;return n.Fe=new Ge,t||(t=15),n.Fe.He(n,e,t)},Ye(e){const t=this;return t.Fe?t.Fe.Ye(t,e):Re},Qe(){const e=this;if(!e.Fe)return Re;const t=e.Fe.Qe();return e.Fe=null,t},Xe(e,t){const n=this;return n.Fe?n.Fe.Xe(n,e,t):Re},Ze(e,t){const n=this;return n.Fe?n.Fe.Ze(n,e,t):Re},je(e,t,n){const r=this;let s=r.We;return s>n&&(s=n),0===s?0:(r.We-=s,e.set(r.et.subarray(r.nt,r.nt+s),t),r.nt+=s,r.qe+=s,s)},Te(){const e=this;let t=e.Fe.pending;t>e.tt&&(t=e.tt),0!==t&&(e.$e.set(e.Fe.Ue.subarray(e.Fe.Je,e.Fe.Je+t),e.rt),e.rt+=t,e.Fe.Je+=t,e.Ge+=t,e.tt-=t,e.Fe.pending-=t,0===e.Fe.pending&&(e.Fe.Je=0))}};const Xe=-2,Ye=-3,Ze=-5,$e=[0,1,3,7,15,31,63,127,255,511,1023,2047,4095,8191,16383,32767,65535],et=[96,7,256,0,8,80,0,8,16,84,8,115,82,7,31,0,8,112,0,8,48,0,9,192,80,7,10,0,8,96,0,8,32,0,9,160,0,8,0,0,8,128,0,8,64,0,9,224,80,7,6,0,8,88,0,8,24,0,9,144,83,7,59,0,8,120,0,8,56,0,9,208,81,7,17,0,8,104,0,8,40,0,9,176,0,8,8,0,8,136,0,8,72,0,9,240,80,7,4,0,8,84,0,8,20,85,8,227,83,7,43,0,8,116,0,8,52,0,9,200,81,7,13,0,8,100,0,8,36,0,9,168,0,8,4,0,8,132,0,8,68,0,9,232,80,7,8,0,8,92,0,8,28,0,9,152,84,7,83,0,8,124,0,8,60,0,9,216,82,7,23,0,8,108,0,8,44,0,9,184,0,8,12,0,8,140,0,8,76,0,9,248,80,7,3,0,8,82,0,8,18,85,8,163,83,7,35,0,8,114,0,8,50,0,9,196,81,7,11,0,8,98,0,8,34,0,9,164,0,8,2,0,8,130,0,8,66,0,9,228,80,7,7,0,8,90,0,8,26,0,9,148,84,7,67,0,8,122,0,8,58,0,9,212,82,7,19,0,8,106,0,8,42,0,9,180,0,8,10,0,8,138,0,8,74,0,9,244,80,7,5,0,8,86,0,8,22,192,8,0,83,7,51,0,8,118,0,8,54,0,9,204,81,7,15,0,8,102,0,8,38,0,9,172,0,8,6,0,8,134,0,8,70,0,9,236,80,7,9,0,8,94,0,8,30,0,9,156,84,7,99,0,8,126,0,8,62,0,9,220,82,7,27,0,8,110,0,8,46,0,9,188,0,8,14,0,8,142,0,8,78,0,9,252,96,7,256,0,8,81,0,8,17,85,8,131,82,7,31,0,8,113,0,8,49,0,9,194,80,7,10,0,8,97,0,8,33,0,9,162,0,8,1,0,8,129,0,8,65,0,9,226,80,7,6,0,8,89,0,8,25,0,9,146,83,7,59,0,8,121,0,8,57,0,9,210,81,7,17,0,8,105,0,8,41,0,9,178,0,8,9,0,8,137,0,8,73,0,9,242,80,7,4,0,8,85,0,8,21,80,8,258,83,7,43,0,8,117,0,8,53,0,9,202,81,7,13,0,8,101,0,8,37,0,9,170,0,8,5,0,8,133,0,8,69,0,9,234,80,7,8,0,8,93,0,8,29,0,9,154,84,7,83,0,8,125,0,8,61,0,9,218,82,7,23,0,8,109,0,8,45,0,9,186,0,8,13,0,8,141,0,8,77,0,9,250,80,7,3,0,8,83,0,8,19,85,8,195,83,7,35,0,8,115,0,8,51,0,9,198,81,7,11,0,8,99,0,8,35,0,9,166,0,8,3,0,8,131,0,8,67,0,9,230,80,7,7,0,8,91,0,8,27,0,9,150,84,7,67,0,8,123,0,8,59,0,9,214,82,7,19,0,8,107,0,8,43,0,9,182,0,8,11,0,8,139,0,8,75,0,9,246,80,7,5,0,8,87,0,8,23,192,8,0,83,7,51,0,8,119,0,8,55,0,9,206,81,7,15,0,8,103,0,8,39,0,9,174,0,8,7,0,8,135,0,8,71,0,9,238,80,7,9,0,8,95,0,8,31,0,9,158,84,7,99,0,8,127,0,8,63,0,9,222,82,7,27,0,8,111,0,8,47,0,9,190,0,8,15,0,8,143,0,8,79,0,9,254,96,7,256,0,8,80,0,8,16,84,8,115,82,7,31,0,8,112,0,8,48,0,9,193,80,7,10,0,8,96,0,8,32,0,9,161,0,8,0,0,8,128,0,8,64,0,9,225,80,7,6,0,8,88,0,8,24,0,9,145,83,7,59,0,8,120,0,8,56,0,9,209,81,7,17,0,8,104,0,8,40,0,9,177,0,8,8,0,8,136,0,8,72,0,9,241,80,7,4,0,8,84,0,8,20,85,8,227,83,7,43,0,8,116,0,8,52,0,9,201,81,7,13,0,8,100,0,8,36,0,9,169,0,8,4,0,8,132,0,8,68,0,9,233,80,7,8,0,8,92,0,8,28,0,9,153,84,7,83,0,8,124,0,8,60,0,9,217,82,7,23,0,8,108,0,8,44,0,9,185,0,8,12,0,8,140,0,8,76,0,9,249,80,7,3,0,8,82,0,8,18,85,8,163,83,7,35,0,8,114,0,8,50,0,9,197,81,7,11,0,8,98,0,8,34,0,9,165,0,8,2,0,8,130,0,8,66,0,9,229,80,7,7,0,8,90,0,8,26,0,9,149,84,7,67,0,8,122,0,8,58,0,9,213,82,7,19,0,8,106,0,8,42,0,9,181,0,8,10,0,8,138,0,8,74,0,9,245,80,7,5,0,8,86,0,8,22,192,8,0,83,7,51,0,8,118,0,8,54,0,9,205,81,7,15,0,8,102,0,8,38,0,9,173,0,8,6,0,8,134,0,8,70,0,9,237,80,7,9,0,8,94,0,8,30,0,9,157,84,7,99,0,8,126,0,8,62,0,9,221,82,7,27,0,8,110,0,8,46,0,9,189,0,8,14,0,8,142,0,8,78,0,9,253,96,7,256,0,8,81,0,8,17,85,8,131,82,7,31,0,8,113,0,8,49,0,9,195,80,7,10,0,8,97,0,8,33,0,9,163,0,8,1,0,8,129,0,8,65,0,9,227,80,7,6,0,8,89,0,8,25,0,9,147,83,7,59,0,8,121,0,8,57,0,9,211,81,7,17,0,8,105,0,8,41,0,9,179,0,8,9,0,8,137,0,8,73,0,9,243,80,7,4,0,8,85,0,8,21,80,8,258,83,7,43,0,8,117,0,8,53,0,9,203,81,7,13,0,8,101,0,8,37,0,9,171,0,8,5,0,8,133,0,8,69,0,9,235,80,7,8,0,8,93,0,8,29,0,9,155,84,7,83,0,8,125,0,8,61,0,9,219,82,7,23,0,8,109,0,8,45,0,9,187,0,8,13,0,8,141,0,8,77,0,9,251,80,7,3,0,8,83,0,8,19,85,8,195,83,7,35,0,8,115,0,8,51,0,9,199,81,7,11,0,8,99,0,8,35,0,9,167,0,8,3,0,8,131,0,8,67,0,9,231,80,7,7,0,8,91,0,8,27,0,9,151,84,7,67,0,8,123,0,8,59,0,9,215,82,7,19,0,8,107,0,8,43,0,9,183,0,8,11,0,8,139,0,8,75,0,9,247,80,7,5,0,8,87,0,8,23,192,8,0,83,7,51,0,8,119,0,8,55,0,9,207,81,7,15,0,8,103,0,8,39,0,9,175,0,8,7,0,8,135,0,8,71,0,9,239,80,7,9,0,8,95,0,8,31,0,9,159,84,7,99,0,8,127,0,8,63,0,9,223,82,7,27,0,8,111,0,8,47,0,9,191,0,8,15,0,8,143,0,8,79,0,9,255],tt=[80,5,1,87,5,257,83,5,17,91,5,4097,81,5,5,89,5,1025,85,5,65,93,5,16385,80,5,3,88,5,513,84,5,33,92,5,8193,82,5,9,90,5,2049,86,5,129,192,5,24577,80,5,2,87,5,385,83,5,25,91,5,6145,81,5,7,89,5,1537,85,5,97,93,5,24577,80,5,4,88,5,769,84,5,49,92,5,12289,82,5,13,90,5,3073,86,5,193,192,5,24577],nt=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0],rt=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,112,112],st=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577],it=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];function ot(){let e,t,n,r,s,i;function o(e,t,o,c,f,a,l,u,w,h,d){let p,y,m,b,g,k,v,S,z,C,x,_,A,I,D;C=0,g=o;do{n[e[t+C]]++,C++,g--}while(0!==g);if(n[0]==o)return l[0]=-1,u[0]=0,0;for(S=u[0],k=1;15>=k&&0===n[k];k++);for(v=k,k>S&&(S=k),g=15;0!==g&&0===n[g];g--);for(m=g,S>g&&(S=g),u[0]=S,I=1<<k;g>k;k++,I<<=1)if(0>(I-=n[k]))return Ye;if(0>(I-=n[g]))return Ye;for(n[g]+=I,i[1]=k=0,C=1,A=2;0!=--g;)i[A]=k+=n[C],A++,C++;g=0,C=0;do{0!==(k=e[t+C])&&(d[i[k]++]=g),C++}while(++g<o);for(o=i[m],i[0]=g=0,C=0,b=-1,_=-S,s[0]=0,x=0,D=0;m>=v;v++)for(p=n[v];0!=p--;){for(;v>_+S;){if(b++,_+=S,D=m-_,D=D>S?S:D,(y=1<<(k=v-_))>p+1&&(y-=p+1,A=v,D>k))for(;++k<D&&(y<<=1)>n[++A];)y-=n[A];if(D=1<<k,h[0]+D>1440)return Ye;s[b]=x=h[0],h[0]+=D,0!==b?(i[b]=g,r[0]=k,r[1]=S,k=g>>>_-S,r[2]=x-s[b-1]-k,w.set(r,3*(s[b-1]+k))):l[0]=x}for(r[1]=v-_,o>C?d[C]<c?(r[0]=256>d[C]?0:96,r[2]=d[C++]):(r[0]=a[d[C]-c]+16+64,r[2]=f[d[C++]-c]):r[0]=192,y=1<<v-_,k=g>>>_;D>k;k+=y)w.set(r,3*(x+k));for(k=1<<v-1;0!=(g&k);k>>>=1)g^=k;for(g^=k,z=(1<<_)-1;(g&z)!=i[b];)b--,_-=S,z=(1<<_)-1}return 0!==I&&1!=m?Ze:0}function c(o){let c;for(e||(e=[],t=[],n=new f(16),r=[],s=new f(15),i=new f(16)),t.length<o&&(t=[]),c=0;o>c;c++)t[c]=0;for(c=0;16>c;c++)n[c]=0;for(c=0;3>c;c++)r[c]=0;s.set(n.subarray(0,15),0),i.set(n.subarray(0,16),0)}this.st=(n,r,s,i,f)=>{let a;return c(19),e[0]=0,a=o(n,0,19,19,null,null,s,r,i,e,t),a==Ye?f.Le="oversubscribed dynamic bit lengths tree":a!=Ze&&0!==r[0]||(f.Le="incomplete dynamic bit lengths tree",a=Ye),a},this.it=(n,r,s,i,f,a,l,u,w)=>{let h;return c(288),e[0]=0,h=o(s,0,n,257,nt,rt,a,i,u,e,t),0!=h||0===i[0]?(h==Ye?w.Le="oversubscribed literal/length tree":-4!=h&&(w.Le="incomplete literal/length tree",h=Ye),h):(c(288),h=o(s,n,r,0,st,it,l,f,u,e,t),0!=h||0===f[0]&&n>257?(h==Ye?w.Le="oversubscribed distance tree":h==Ze?(w.Le="incomplete distance tree",h=Ye):-4!=h&&(w.Le="empty distance tree with lengths",h=Ye),h):0)}}function ct(){const e=this;let t,n,r,s,i=0,o=0,c=0,f=0,a=0,l=0,u=0,w=0,h=0,d=0;function p(e,t,n,r,s,i,o,c){let f,a,l,u,w,h,d,p,y,m,b,g,k,v,S,z;d=c.nt,p=c.We,w=o.ot,h=o.ct,y=o.write,m=y<o.read?o.read-y-1:o.end-y,b=$e[e],g=$e[t];do{for(;20>h;)p--,w|=(255&c.ft(d++))<<h,h+=8;if(f=w&b,a=n,l=r,z=3*(l+f),0!==(u=a[z]))for(;;){if(w>>=a[z+1],h-=a[z+1],0!=(16&u)){for(u&=15,k=a[z+2]+(w&$e[u]),w>>=u,h-=u;15>h;)p--,w|=(255&c.ft(d++))<<h,h+=8;for(f=w&g,a=s,l=i,z=3*(l+f),u=a[z];;){if(w>>=a[z+1],h-=a[z+1],0!=(16&u)){for(u&=15;u>h;)p--,w|=(255&c.ft(d++))<<h,h+=8;if(v=a[z+2]+(w&$e[u]),w>>=u,h-=u,m-=k,v>y){S=y-v;do{S+=o.end}while(0>S);if(u=o.end-S,k>u){if(k-=u,y-S>0&&u>y-S)do{o.lt[y++]=o.lt[S++]}while(0!=--u);else o.lt.set(o.lt.subarray(S,S+u),y),y+=u,S+=u,u=0;S=0}}else S=y-v,y-S>0&&2>y-S?(o.lt[y++]=o.lt[S++],o.lt[y++]=o.lt[S++],k-=2):(o.lt.set(o.lt.subarray(S,S+2),y),y+=2,S+=2,k-=2);if(y-S>0&&k>y-S)do{o.lt[y++]=o.lt[S++]}while(0!=--k);else o.lt.set(o.lt.subarray(S,S+k),y),y+=k,S+=k,k=0;break}if(0!=(64&u))return c.Le="invalid distance code",k=c.We-p,k=k>h>>3?h>>3:k,p+=k,d-=k,h-=k<<3,o.ot=w,o.ct=h,c.We=p,c.qe+=d-c.nt,c.nt=d,o.write=y,Ye;f+=a[z+2],f+=w&$e[u],z=3*(l+f),u=a[z]}break}if(0!=(64&u))return 0!=(32&u)?(k=c.We-p,k=k>h>>3?h>>3:k,p+=k,d-=k,h-=k<<3,o.ot=w,o.ct=h,c.We=p,c.qe+=d-c.nt,c.nt=d,o.write=y,1):(c.Le="invalid literal/length code",k=c.We-p,k=k>h>>3?h>>3:k,p+=k,d-=k,h-=k<<3,o.ot=w,o.ct=h,c.We=p,c.qe+=d-c.nt,c.nt=d,o.write=y,Ye);if(f+=a[z+2],f+=w&$e[u],z=3*(l+f),0===(u=a[z])){w>>=a[z+1],h-=a[z+1],o.lt[y++]=a[z+2],m--;break}}else w>>=a[z+1],h-=a[z+1],o.lt[y++]=a[z+2],m--}while(m>=258&&p>=10);return k=c.We-p,k=k>h>>3?h>>3:k,p+=k,d-=k,h-=k<<3,o.ot=w,o.ct=h,c.We=p,c.qe+=d-c.nt,c.nt=d,o.write=y,0}e.init=(e,i,o,c,f,a)=>{t=0,u=e,w=i,r=o,h=c,s=f,d=a,n=null},e.ut=(e,y,m)=>{let b,g,k,v,S,z,C,x=0,_=0,A=0;for(A=y.nt,v=y.We,x=e.ot,_=e.ct,S=e.write,z=S<e.read?e.read-S-1:e.end-S;;)switch(t){case 0:if(z>=258&&v>=10&&(e.ot=x,e.ct=_,y.We=v,y.qe+=A-y.nt,y.nt=A,e.write=S,m=p(u,w,r,h,s,d,e,y),A=y.nt,v=y.We,x=e.ot,_=e.ct,S=e.write,z=S<e.read?e.read-S-1:e.end-S,0!=m)){t=1==m?7:9;break}c=u,n=r,o=h,t=1;case 1:for(b=c;b>_;){if(0===v)return e.ot=x,e.ct=_,y.We=v,y.qe+=A-y.nt,y.nt=A,e.write=S,e.wt(y,m);m=0,v--,x|=(255&y.ft(A++))<<_,_+=8}if(g=3*(o+(x&$e[b])),x>>>=n[g+1],_-=n[g+1],k=n[g],0===k){f=n[g+2],t=6;break}if(0!=(16&k)){a=15&k,i=n[g+2],t=2;break}if(0==(64&k)){c=k,o=g/3+n[g+2];break}if(0!=(32&k)){t=7;break}return t=9,y.Le="invalid literal/length code",m=Ye,e.ot=x,e.ct=_,y.We=v,y.qe+=A-y.nt,y.nt=A,e.write=S,e.wt(y,m);case 2:for(b=a;b>_;){if(0===v)return e.ot=x,e.ct=_,y.We=v,y.qe+=A-y.nt,y.nt=A,e.write=S,e.wt(y,m);m=0,v--,x|=(255&y.ft(A++))<<_,_+=8}i+=x&$e[b],x>>=b,_-=b,c=w,n=s,o=d,t=3;case 3:for(b=c;b>_;){if(0===v)return e.ot=x,e.ct=_,y.We=v,y.qe+=A-y.nt,y.nt=A,e.write=S,e.wt(y,m);m=0,v--,x|=(255&y.ft(A++))<<_,_+=8}if(g=3*(o+(x&$e[b])),x>>=n[g+1],_-=n[g+1],k=n[g],0!=(16&k)){a=15&k,l=n[g+2],t=4;break}if(0==(64&k)){c=k,o=g/3+n[g+2];break}return t=9,y.Le="invalid distance code",m=Ye,e.ot=x,e.ct=_,y.We=v,y.qe+=A-y.nt,y.nt=A,e.write=S,e.wt(y,m);case 4:for(b=a;b>_;){if(0===v)return e.ot=x,e.ct=_,y.We=v,y.qe+=A-y.nt,y.nt=A,e.write=S,e.wt(y,m);m=0,v--,x|=(255&y.ft(A++))<<_,_+=8}l+=x&$e[b],x>>=b,_-=b,t=5;case 5:for(C=S-l;0>C;)C+=e.end;for(;0!==i;){if(0===z&&(S==e.end&&0!==e.read&&(S=0,z=S<e.read?e.read-S-1:e.end-S),0===z&&(e.write=S,m=e.wt(y,m),S=e.write,z=S<e.read?e.read-S-1:e.end-S,S==e.end&&0!==e.read&&(S=0,z=S<e.read?e.read-S-1:e.end-S),0===z)))return e.ot=x,e.ct=_,y.We=v,y.qe+=A-y.nt,y.nt=A,e.write=S,e.wt(y,m);e.lt[S++]=e.lt[C++],z--,C==e.end&&(C=0),i--}t=0;break;case 6:if(0===z&&(S==e.end&&0!==e.read&&(S=0,z=S<e.read?e.read-S-1:e.end-S),0===z&&(e.write=S,m=e.wt(y,m),S=e.write,z=S<e.read?e.read-S-1:e.end-S,S==e.end&&0!==e.read&&(S=0,z=S<e.read?e.read-S-1:e.end-S),0===z)))return e.ot=x,e.ct=_,y.We=v,y.qe+=A-y.nt,y.nt=A,e.write=S,e.wt(y,m);m=0,e.lt[S++]=f,z--,t=0;break;case 7:if(_>7&&(_-=8,v++,A--),e.write=S,m=e.wt(y,m),S=e.write,z=S<e.read?e.read-S-1:e.end-S,e.read!=e.write)return e.ot=x,e.ct=_,y.We=v,y.qe+=A-y.nt,y.nt=A,e.write=S,e.wt(y,m);t=8;case 8:return m=1,e.ot=x,e.ct=_,y.We=v,y.qe+=A-y.nt,y.nt=A,e.write=S,e.wt(y,m);case 9:return m=Ye,e.ot=x,e.ct=_,y.We=v,y.qe+=A-y.nt,y.nt=A,e.write=S,e.wt(y,m);default:return m=Xe,e.ot=x,e.ct=_,y.We=v,y.qe+=A-y.nt,y.nt=A,e.write=S,e.wt(y,m)}},e.ht=()=>{}}ot.dt=(e,t,n,r)=>(e[0]=9,t[0]=5,n[0]=et,r[0]=tt,0);const ft=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];function at(e,t){const n=this;let r,s=0,o=0,c=0,a=0;const l=[0],u=[0],w=new ct;let h=0,d=new f(4320);const p=new ot;n.ct=0,n.ot=0,n.lt=new i(t),n.end=t,n.read=0,n.write=0,n.reset=(e,t)=>{t&&(t[0]=0),6==s&&w.ht(e),s=0,n.ct=0,n.ot=0,n.read=n.write=0},n.reset(e,null),n.wt=(e,t)=>{let r,s,i;return s=e.rt,i=n.read,r=(i>n.write?n.end:n.write)-i,r>e.tt&&(r=e.tt),0!==r&&t==Ze&&(t=0),e.tt-=r,e.Ge+=r,e.$e.set(n.lt.subarray(i,i+r),s),s+=r,i+=r,i==n.end&&(i=0,n.write==n.end&&(n.write=0),r=n.write-i,r>e.tt&&(r=e.tt),0!==r&&t==Ze&&(t=0),e.tt-=r,e.Ge+=r,e.$e.set(n.lt.subarray(i,i+r),s),s+=r,i+=r),e.rt=s,n.read=i,t},n.ut=(e,t)=>{let i,f,y,m,b,g,k,v;for(m=e.nt,b=e.We,f=n.ot,y=n.ct,g=n.write,k=g<n.read?n.read-g-1:n.end-g;;){let S,z,C,x,_,A,I,D;switch(s){case 0:for(;3>y;){if(0===b)return n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);t=0,b--,f|=(255&e.ft(m++))<<y,y+=8}switch(i=7&f,h=1&i,i>>>1){case 0:f>>>=3,y-=3,i=7&y,f>>>=i,y-=i,s=1;break;case 1:S=[],z=[],C=[[]],x=[[]],ot.dt(S,z,C,x),w.init(S[0],z[0],C[0],0,x[0],0),f>>>=3,y-=3,s=6;break;case 2:f>>>=3,y-=3,s=3;break;case 3:return f>>>=3,y-=3,s=9,e.Le="invalid block type",t=Ye,n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t)}break;case 1:for(;32>y;){if(0===b)return n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);t=0,b--,f|=(255&e.ft(m++))<<y,y+=8}if((~f>>>16&65535)!=(65535&f))return s=9,e.Le="invalid stored block lengths",t=Ye,n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);o=65535&f,f=y=0,s=0!==o?2:0!==h?7:0;break;case 2:if(0===b)return n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);if(0===k&&(g==n.end&&0!==n.read&&(g=0,k=g<n.read?n.read-g-1:n.end-g),0===k&&(n.write=g,t=n.wt(e,t),g=n.write,k=g<n.read?n.read-g-1:n.end-g,g==n.end&&0!==n.read&&(g=0,k=g<n.read?n.read-g-1:n.end-g),0===k)))return n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);if(t=0,i=o,i>b&&(i=b),i>k&&(i=k),n.lt.set(e.je(m,i),g),m+=i,b-=i,g+=i,k-=i,0!=(o-=i))break;s=0!==h?7:0;break;case 3:for(;14>y;){if(0===b)return n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);t=0,b--,f|=(255&e.ft(m++))<<y,y+=8}if(c=i=16383&f,(31&i)>29||(i>>5&31)>29)return s=9,e.Le="too many length or distance symbols",t=Ye,n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);if(i=258+(31&i)+(i>>5&31),!r||r.length<i)r=[];else for(v=0;i>v;v++)r[v]=0;f>>>=14,y-=14,a=0,s=4;case 4:for(;4+(c>>>10)>a;){for(;3>y;){if(0===b)return n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);t=0,b--,f|=(255&e.ft(m++))<<y,y+=8}r[ft[a++]]=7&f,f>>>=3,y-=3}for(;19>a;)r[ft[a++]]=0;if(l[0]=7,i=p.st(r,l,u,d,e),0!=i)return(t=i)==Ye&&(r=null,s=9),n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);a=0,s=5;case 5:for(;i=c,258+(31&i)+(i>>5&31)>a;){let o,w;for(i=l[0];i>y;){if(0===b)return n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);t=0,b--,f|=(255&e.ft(m++))<<y,y+=8}if(i=d[3*(u[0]+(f&$e[i]))+1],w=d[3*(u[0]+(f&$e[i]))+2],16>w)f>>>=i,y-=i,r[a++]=w;else{for(v=18==w?7:w-14,o=18==w?11:3;i+v>y;){if(0===b)return n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);t=0,b--,f|=(255&e.ft(m++))<<y,y+=8}if(f>>>=i,y-=i,o+=f&$e[v],f>>>=v,y-=v,v=a,i=c,v+o>258+(31&i)+(i>>5&31)||16==w&&1>v)return r=null,s=9,e.Le="invalid bit length repeat",t=Ye,n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);w=16==w?r[v-1]:0;do{r[v++]=w}while(0!=--o);a=v}}if(u[0]=-1,_=[],A=[],I=[],D=[],_[0]=9,A[0]=6,i=c,i=p.it(257+(31&i),1+(i>>5&31),r,_,A,I,D,d,e),0!=i)return i==Ye&&(r=null,s=9),t=i,n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);w.init(_[0],A[0],d,I[0],d,D[0]),s=6;case 6:if(n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,1!=(t=w.ut(n,e,t)))return n.wt(e,t);if(t=0,w.ht(e),m=e.nt,b=e.We,f=n.ot,y=n.ct,g=n.write,k=g<n.read?n.read-g-1:n.end-g,0===h){s=0;break}s=7;case 7:if(n.write=g,t=n.wt(e,t),g=n.write,k=g<n.read?n.read-g-1:n.end-g,n.read!=n.write)return n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);s=8;case 8:return t=1,n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);case 9:return t=Ye,n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t);default:return t=Xe,n.ot=f,n.ct=y,e.We=b,e.qe+=m-e.nt,e.nt=m,n.write=g,n.wt(e,t)}}},n.ht=e=>{n.reset(e,null),n.lt=null,d=null},n.yt=(e,t,r)=>{n.lt.set(e.subarray(t,t+r),0),n.read=n.write=r},n.bt=()=>1==s?1:0}const lt=13,ut=[0,0,255,255];function wt(){const e=this;function t(e){return e&&e.gt?(e.qe=e.Ge=0,e.Le=null,e.gt.mode=7,e.gt.kt.reset(e,null),0):Xe}e.mode=0,e.method=0,e.vt=[0],e.St=0,e.marker=0,e.zt=0,e.Ct=t=>(e.kt&&e.kt.ht(t),e.kt=null,0),e.xt=(n,r)=>(n.Le=null,e.kt=null,8>r||r>15?(e.Ct(n),Xe):(e.zt=r,n.gt.kt=new at(n,1<<r),t(n),0)),e._t=(e,t)=>{let n,r;if(!e||!e.gt||!e.et)return Xe;const s=e.gt;for(t=4==t?Ze:0,n=Ze;;)switch(s.mode){case 0:if(0===e.We)return n;if(n=t,e.We--,e.qe++,8!=(15&(s.method=e.ft(e.nt++)))){s.mode=lt,e.Le="unknown compression method",s.marker=5;break}if(8+(s.method>>4)>s.zt){s.mode=lt,e.Le="invalid win size",s.marker=5;break}s.mode=1;case 1:if(0===e.We)return n;if(n=t,e.We--,e.qe++,r=255&e.ft(e.nt++),((s.method<<8)+r)%31!=0){s.mode=lt,e.Le="incorrect header check",s.marker=5;break}if(0==(32&r)){s.mode=7;break}s.mode=2;case 2:if(0===e.We)return n;n=t,e.We--,e.qe++,s.St=(255&e.ft(e.nt++))<<24&4278190080,s.mode=3;case 3:if(0===e.We)return n;n=t,e.We--,e.qe++,s.St+=(255&e.ft(e.nt++))<<16&16711680,s.mode=4;case 4:if(0===e.We)return n;n=t,e.We--,e.qe++,s.St+=(255&e.ft(e.nt++))<<8&65280,s.mode=5;case 5:return 0===e.We?n:(n=t,e.We--,e.qe++,s.St+=255&e.ft(e.nt++),s.mode=6,2);case 6:return s.mode=lt,e.Le="need dictionary",s.marker=0,Xe;case 7:if(n=s.kt.ut(e,n),n==Ye){s.mode=lt,s.marker=0;break}if(0==n&&(n=t),1!=n)return n;n=t,s.kt.reset(e,s.vt),s.mode=12;case 12:return e.We=0,1;case lt:return Ye;default:return Xe}},e.At=(e,t,n)=>{let r=0,s=n;if(!e||!e.gt||6!=e.gt.mode)return Xe;const i=e.gt;return s<1<<i.zt||(s=(1<<i.zt)-1,r=n-s),i.kt.yt(t,r,s),i.mode=7,0},e.It=e=>{let n,r,s,i,o;if(!e||!e.gt)return Xe;const c=e.gt;if(c.mode!=lt&&(c.mode=lt,c.marker=0),0===(n=e.We))return Ze;for(r=e.nt,s=c.marker;0!==n&&4>s;)e.ft(r)==ut[s]?s++:s=0!==e.ft(r)?0:4-s,r++,n--;return e.qe+=r-e.nt,e.nt=r,e.We=n,c.marker=s,4!=s?Ye:(i=e.qe,o=e.Ge,t(e),e.qe=i,e.Ge=o,c.mode=7,0)},e.Dt=e=>e&&e.gt&&e.gt.kt?e.gt.kt.bt():Xe}function ht(){}function dt(e){const t=new ht,n=e&&e.chunkSize?r.floor(2*e.chunkSize):131072,o=new i(n);let c=!1;t.xt(),t.$e=o,this.append=(e,r)=>{const f=[];let a,l,u=0,w=0,h=0;if(0!==e.length){t.nt=0,t.et=e,t.We=e.length;do{if(t.rt=0,t.tt=n,0!==t.We||c||(t.nt=0,c=!0),a=t._t(0),c&&a===Ze){if(0!==t.We)throw new s("inflating: bad input")}else if(0!==a&&1!==a)throw new s("inflating: "+t.Le);if((c||1===a)&&t.We===e.length)throw new s("inflating: bad input");t.rt&&(t.rt===n?f.push(new i(o)):f.push(o.slice(0,t.rt))),h+=t.rt,r&&t.nt>0&&t.nt!=u&&(r(t.nt),u=t.nt)}while(t.We>0||0===t.tt);return f.length>1?(l=new i(h),f.forEach((e=>{l.set(e,w),w+=e.length}))):l=f[0]||new i,l}},this.flush=()=>{t.Ct()}}ht.prototype={xt(e){const t=this;return t.gt=new wt,e||(e=15),t.gt.xt(t,e)},_t(e){const t=this;return t.gt?t.gt._t(t,e):Xe},Ct(){const e=this;if(!e.gt)return Xe;const t=e.gt.Ct(e);return e.gt=null,t},It(){const e=this;return e.gt?e.gt.It(e):Xe},At(e,t){const n=this;return n.gt?n.gt.At(n,e,t):Xe},ft(e){return this.et[e]},je(e,t){return this.et.subarray(e,e+t)}},self.initCodec=()=>{self.Deflate=Qe,self.Inflate=dt};\n'],{type:"text/javascript"}));e({workerScripts:{inflate:[t],deflate:[t]}});}

/*
 Copyright (c) 2022 Gildas Lormeau. All rights reserved.

 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions are met:

 1. Redistributions of source code must retain the above copyright notice,
 this list of conditions and the following disclaimer.

 2. Redistributions in binary form must reproduce the above copyright 
 notice, this list of conditions and the following disclaimer in 
 the documentation and/or other materials provided with the distribution.

 3. The names of the authors may not be used to endorse or promote products
 derived from this software without specific prior written permission.

 THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESSED OR IMPLIED WARRANTIES,
 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JCRAFT,
 INC. OR ANY CONTRIBUTORS TO THIS SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT,
 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
 OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
const ERR_ITERATOR_COMPLETED_TOO_SOON = "Writer iterator completed too soon";
const HTTP_HEADER_CONTENT_TYPE = "Content-Type";
const DEFAULT_CHUNK_SIZE = 64 * 1024;

const PROPERTY_NAME_WRITABLE = "writable";

class Stream {

	constructor() {
		this.size = 0;
	}

	init() {
		this.initialized = true;
	}
}

class Reader extends Stream {

	get readable() {
		const reader = this;
		const { chunkSize = DEFAULT_CHUNK_SIZE } = reader;
		const readable = new ReadableStream({
			start() {
				this.chunkOffset = 0;
			},
			async pull(controller) {
				const { offset = 0, size, diskNumberStart } = readable;
				const { chunkOffset } = this;
				controller.enqueue(await readUint8Array(reader, offset + chunkOffset, Math.min(chunkSize, size - chunkOffset), diskNumberStart));
				if (chunkOffset + chunkSize > size) {
					controller.close();
				} else {
					this.chunkOffset += chunkSize;
				}
			}
		});
		return readable;
	}
}

class BlobReader extends Reader {

	constructor(blob) {
		super();
		Object.assign(this, {
			blob,
			size: blob.size
		});
	}

	async readUint8Array(offset, length) {
		const reader = this;
		const offsetEnd = offset + length;
		const blob = offset || offsetEnd < reader.size ? reader.blob.slice(offset, offsetEnd) : reader.blob;
		return new Uint8Array(await blob.arrayBuffer());
	}
}

class BlobWriter extends Stream {

	constructor(contentType) {
		super();
		const writer = this;
		const transformStream = new TransformStream();
		const headers = [];
		if (contentType) {
			headers.push([HTTP_HEADER_CONTENT_TYPE, contentType]);
		}
		Object.defineProperty(writer, PROPERTY_NAME_WRITABLE, {
			get() {
				return transformStream.writable;
			}
		});
		writer.blob = new Response(transformStream.readable, { headers }).blob();
	}

	getData() {
		return this.blob;
	}
}

class TextWriter extends BlobWriter {

	constructor(encoding) {
		super(encoding);
		Object.assign(this, {
			encoding,
			utf8: !encoding || encoding.toLowerCase() == "utf-8"
		});
	}

	async getData() {
		const {
			encoding,
			utf8
		} = this;
		const blob = await super.getData();
		if (blob.text && utf8) {
			return blob.text();
		} else {
			const reader = new FileReader();
			return new Promise((resolve, reject) => {
				Object.assign(reader, {
					onload: ({ target }) => resolve(target.result),
					onerror: () => reject(reader.error)
				});
				reader.readAsText(blob, encoding);
			});
		}
	}
}

class SplitDataReader extends Reader {

	constructor(readers) {
		super();
		this.readers = readers;
	}

	async init() {
		const reader = this;
		const { readers } = reader;
		reader.lastDiskNumber = 0;
		await Promise.all(readers.map(async diskReader => {
			await diskReader.init();
			reader.size += diskReader.size;
		}));
		super.init();
	}

	async readUint8Array(offset, length, diskNumber = 0) {
		const reader = this;
		const { readers } = this;
		let result;
		let currentDiskNumber = diskNumber;
		if (currentDiskNumber == -1) {
			currentDiskNumber = readers.length - 1;
		}
		let currentReaderOffset = offset;
		while (currentReaderOffset >= readers[currentDiskNumber].size) {
			currentReaderOffset -= readers[currentDiskNumber].size;
			currentDiskNumber++;
		}
		const currentReader = readers[currentDiskNumber];
		const currentReaderSize = currentReader.size;
		if (currentReaderOffset + length <= currentReaderSize) {
			result = await readUint8Array(currentReader, currentReaderOffset, length);
		} else {
			const chunkLength = currentReaderSize - currentReaderOffset;
			result = new Uint8Array(length);
			result.set(await readUint8Array(currentReader, currentReaderOffset, chunkLength));
			result.set(await reader.readUint8Array(offset + chunkLength, length - chunkLength, diskNumber), chunkLength);
		}
		reader.lastDiskNumber = Math.max(currentDiskNumber, reader.lastDiskNumber);
		return result;
	}
}

class SplitDataWriter extends Stream {

	constructor(writerGenerator, maxSize = 4294967295) {
		super();
		const zipWriter = this;
		Object.assign(zipWriter, {
			diskNumber: 0,
			diskOffset: 0,
			size: 0,
			maxSize,
			availableSize: maxSize
		});
		let diskSourceWriter, diskWritable, diskWriter;
		const writable = new WritableStream({
			async write(chunk) {
				const { availableSize } = zipWriter;
				if (!diskWriter) {
					const { value, done } = await writerGenerator.next();
					if (done && !value) {
						throw new Error(ERR_ITERATOR_COMPLETED_TOO_SOON);
					} else {
						diskSourceWriter = value;
						diskSourceWriter.size = 0;
						if (diskSourceWriter.maxSize) {
							zipWriter.maxSize = diskSourceWriter.maxSize;
						}
						zipWriter.availableSize = zipWriter.maxSize;
						await initStream(diskSourceWriter);
						diskWritable = value.writable;
						diskWriter = diskWritable.getWriter();
					}
					await this.write(chunk);
				} else if (chunk.length >= availableSize) {
					await writeChunk(chunk.slice(0, availableSize));
					await closeDisk();
					zipWriter.diskOffset += diskSourceWriter.size;
					zipWriter.diskNumber++;
					diskWriter = null;
					await this.write(chunk.slice(availableSize));
				} else {
					await writeChunk(chunk);
				}
			},
			async close() {
				await diskWriter.ready;
				await closeDisk();
			}
		});
		Object.defineProperty(zipWriter, PROPERTY_NAME_WRITABLE, {
			get() {
				return writable;
			}
		});

		async function writeChunk(chunk) {
			const chunkLength = chunk.length;
			if (chunkLength) {
				await diskWriter.ready;
				await diskWriter.write(chunk);
				diskSourceWriter.size += chunkLength;
				zipWriter.size += chunkLength;
				zipWriter.availableSize -= chunkLength;
			}
		}

		async function closeDisk() {
			diskWritable.size = diskSourceWriter.size;
			await diskWriter.close();
		}
	}
}

async function initStream(stream, initSize) {
	if (stream.init && !stream.initialized) {
		await stream.init(initSize);
	}
}

function initReader(reader) {
	if (Array.isArray(reader)) {
		reader = new SplitDataReader(reader);
	}
	if (reader instanceof ReadableStream) {
		reader = {
			readable: reader
		};
	}
	return reader;
}

function initWriter(writer) {
	if (writer.writable === UNDEFINED_VALUE && typeof writer.next == FUNCTION_TYPE$1) {
		writer = new SplitDataWriter(writer);
	}
	if (writer instanceof WritableStream) {
		writer = {
			writable: writer
		};
	}
	const { writable } = writer;
	if (writable.size === UNDEFINED_VALUE) {
		writable.size = 0;
	}
	const splitZipFile = writer instanceof SplitDataWriter;
	if (!splitZipFile) {
		Object.assign(writer, {
			diskNumber: 0,
			diskOffset: 0,
			availableSize: Infinity,
			maxSize: Infinity
		});
	}
	return writer;
}

function readUint8Array(reader, offset, size, diskNumber) {
	return reader.readUint8Array(offset, size, diskNumber);
}

/*
 Copyright (c) 2022 Gildas Lormeau. All rights reserved.

 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions are met:

 1. Redistributions of source code must retain the above copyright notice,
 this list of conditions and the following disclaimer.

 2. Redistributions in binary form must reproduce the above copyright 
 notice, this list of conditions and the following disclaimer in 
 the documentation and/or other materials provided with the distribution.

 3. The names of the authors may not be used to endorse or promote products
 derived from this software without specific prior written permission.

 THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESSED OR IMPLIED WARRANTIES,
 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JCRAFT,
 INC. OR ANY CONTRIBUTORS TO THIS SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT,
 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
 OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/* global TextDecoder */

const CP437 = "\0☺☻♥♦♣♠•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼ !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~⌂ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ".split("");
const VALID_CP437 = CP437.length == 256;

function decodeCP437(stringValue) {
	if (VALID_CP437) {
		let result = "";
		for (let indexCharacter = 0; indexCharacter < stringValue.length; indexCharacter++) {
			result += CP437[stringValue[indexCharacter]];
		}
		return result;
	} else {
		return new TextDecoder().decode(stringValue);
	}
}

/*
 Copyright (c) 2022 Gildas Lormeau. All rights reserved.

 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions are met:

 1. Redistributions of source code must retain the above copyright notice,
 this list of conditions and the following disclaimer.

 2. Redistributions in binary form must reproduce the above copyright 
 notice, this list of conditions and the following disclaimer in 
 the documentation and/or other materials provided with the distribution.

 3. The names of the authors may not be used to endorse or promote products
 derived from this software without specific prior written permission.

 THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESSED OR IMPLIED WARRANTIES,
 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JCRAFT,
 INC. OR ANY CONTRIBUTORS TO THIS SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT,
 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
 OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

function decodeText(value, encoding) {
	if (encoding && encoding.trim().toLowerCase() == "cp437") {
		return decodeCP437(value);
	} else {
		return new TextDecoder(encoding).decode(value);
	}
}

/*
 Copyright (c) 2022 Gildas Lormeau. All rights reserved.

 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions are met:

 1. Redistributions of source code must retain the above copyright notice,
 this list of conditions and the following disclaimer.

 2. Redistributions in binary form must reproduce the above copyright 
 notice, this list of conditions and the following disclaimer in 
 the documentation and/or other materials provided with the distribution.

 3. The names of the authors may not be used to endorse or promote products
 derived from this software without specific prior written permission.

 THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESSED OR IMPLIED WARRANTIES,
 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JCRAFT,
 INC. OR ANY CONTRIBUTORS TO THIS SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT,
 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
 OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

const PROPERTY_NAME_FILENAME = "filename";
const PROPERTY_NAME_RAW_FILENAME = "rawFilename";
const PROPERTY_NAME_COMMENT = "comment";
const PROPERTY_NAME_RAW_COMMENT = "rawComment";
const PROPERTY_NAME_UNCOMPPRESSED_SIZE = "uncompressedSize";
const PROPERTY_NAME_COMPPRESSED_SIZE = "compressedSize";
const PROPERTY_NAME_OFFSET = "offset";
const PROPERTY_NAME_DISK_NUMBER_START = "diskNumberStart";
const PROPERTY_NAME_LAST_MODIFICATION_DATE = "lastModDate";
const PROPERTY_NAME_RAW_LAST_MODIFICATION_DATE = "rawLastModDate";
const PROPERTY_NAME_LAST_ACCESS_DATE = "lastAccessDate";
const PROPERTY_NAME_RAW_LAST_ACCESS_DATE = "rawLastAccessDate";
const PROPERTY_NAME_CREATION_DATE = "creationDate";
const PROPERTY_NAME_RAW_CREATION_DATE = "rawCreationDate";
const PROPERTY_NAME_INTERNAL_FILE_ATTRIBUTE = "internalFileAttribute";
const PROPERTY_NAME_EXTERNAL_FILE_ATTRIBUTE = "externalFileAttribute";
const PROPERTY_NAME_MS_DOS_COMPATIBLE = "msDosCompatible";
const PROPERTY_NAME_ZIP64 = "zip64";

const PROPERTY_NAMES = [
	PROPERTY_NAME_FILENAME, PROPERTY_NAME_RAW_FILENAME, PROPERTY_NAME_COMPPRESSED_SIZE, PROPERTY_NAME_UNCOMPPRESSED_SIZE,
	PROPERTY_NAME_LAST_MODIFICATION_DATE, PROPERTY_NAME_RAW_LAST_MODIFICATION_DATE, PROPERTY_NAME_COMMENT, PROPERTY_NAME_RAW_COMMENT,
	PROPERTY_NAME_LAST_ACCESS_DATE, PROPERTY_NAME_CREATION_DATE, PROPERTY_NAME_OFFSET, PROPERTY_NAME_DISK_NUMBER_START,
	PROPERTY_NAME_DISK_NUMBER_START, PROPERTY_NAME_INTERNAL_FILE_ATTRIBUTE, PROPERTY_NAME_EXTERNAL_FILE_ATTRIBUTE,
	PROPERTY_NAME_MS_DOS_COMPATIBLE, PROPERTY_NAME_ZIP64,
	"directory", "bitFlag", "encrypted", "signature", "filenameUTF8", "commentUTF8", "compressionMethod", "version", "versionMadeBy",
	"extraField", "rawExtraField", "extraFieldZip64", "extraFieldUnicodePath", "extraFieldUnicodeComment", "extraFieldAES", "extraFieldNTFS",
	"extraFieldExtendedTimestamp"];

class Entry {

	constructor(data) {
		PROPERTY_NAMES.forEach(name => this[name] = data[name]);
	}

}

/*
 Copyright (c) 2022 Gildas Lormeau. All rights reserved.

 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions are met:

 1. Redistributions of source code must retain the above copyright notice,
 this list of conditions and the following disclaimer.

 2. Redistributions in binary form must reproduce the above copyright 
 notice, this list of conditions and the following disclaimer in 
 the documentation and/or other materials provided with the distribution.

 3. The names of the authors may not be used to endorse or promote products
 derived from this software without specific prior written permission.

 THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESSED OR IMPLIED WARRANTIES,
 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JCRAFT,
 INC. OR ANY CONTRIBUTORS TO THIS SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT,
 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
 OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

const ERR_BAD_FORMAT = "File format is not recognized";
const ERR_EOCDR_NOT_FOUND = "End of central directory not found";
const ERR_EOCDR_ZIP64_NOT_FOUND = "End of Zip64 central directory not found";
const ERR_EOCDR_LOCATOR_ZIP64_NOT_FOUND = "End of Zip64 central directory locator not found";
const ERR_CENTRAL_DIRECTORY_NOT_FOUND = "Central directory header not found";
const ERR_LOCAL_FILE_HEADER_NOT_FOUND = "Local file header not found";
const ERR_EXTRAFIELD_ZIP64_NOT_FOUND = "Zip64 extra field not found";
const ERR_ENCRYPTED = "File contains encrypted entry";
const ERR_UNSUPPORTED_ENCRYPTION = "Encryption method not supported";
const ERR_UNSUPPORTED_COMPRESSION = "Compression method not supported";
const ERR_SPLIT_ZIP_FILE = "Split zip file";
const CHARSET_UTF8 = "utf-8";
const CHARSET_CP437 = "cp437";
const ZIP64_PROPERTIES = [
	[PROPERTY_NAME_UNCOMPPRESSED_SIZE, MAX_32_BITS],
	[PROPERTY_NAME_COMPPRESSED_SIZE, MAX_32_BITS],
	[PROPERTY_NAME_OFFSET, MAX_32_BITS],
	[PROPERTY_NAME_DISK_NUMBER_START, MAX_16_BITS]
];
const ZIP64_EXTRACTION = {
	[MAX_16_BITS]: {
		getValue: getUint32,
		bytes: 4
	},
	[MAX_32_BITS]: {
		getValue: getBigUint64,
		bytes: 8
	}
};

class ZipReader {

	constructor(reader, options = {}) {
		Object.assign(this, {
			reader: initReader(reader),
			options,
			config: getConfiguration()
		});
	}

	async* getEntriesGenerator(options = {}) {
		const zipReader = this;
		let { reader } = zipReader;
		const { config } = zipReader;
		await initStream(reader);
		if (reader.size === UNDEFINED_VALUE || !reader.readUint8Array) {
			reader = new BlobReader(await new Response(reader.readable).blob());
			await initStream(reader);
		}
		if (reader.size < END_OF_CENTRAL_DIR_LENGTH) {
			throw new Error(ERR_BAD_FORMAT);
		}
		reader.chunkSize = getChunkSize(config);
		const endOfDirectoryInfo = await seekSignature(reader, END_OF_CENTRAL_DIR_SIGNATURE, reader.size, END_OF_CENTRAL_DIR_LENGTH, MAX_16_BITS * 16);
		if (!endOfDirectoryInfo) {
			const signatureArray = await readUint8Array(reader, 0, 4);
			const signatureView = getDataView(signatureArray);
			if (getUint32(signatureView) == SPLIT_ZIP_FILE_SIGNATURE) {
				throw new Error(ERR_SPLIT_ZIP_FILE);
			} else {
				throw new Error(ERR_EOCDR_NOT_FOUND);
			}
		}
		const endOfDirectoryView = getDataView(endOfDirectoryInfo);
		let directoryDataLength = getUint32(endOfDirectoryView, 12);
		let directoryDataOffset = getUint32(endOfDirectoryView, 16);
		const commentOffset = endOfDirectoryInfo.offset;
		const commentLength = getUint16(endOfDirectoryView, 20);
		const appendedDataOffset = commentOffset + END_OF_CENTRAL_DIR_LENGTH + commentLength;
		let lastDiskNumber = getUint16(endOfDirectoryView, 4);
		const expectedLastDiskNumber = reader.lastDiskNumber || 0;
		let diskNumber = getUint16(endOfDirectoryView, 6);
		let filesLength = getUint16(endOfDirectoryView, 8);
		let prependedDataLength = 0;
		let startOffset = 0;
		if (directoryDataOffset == MAX_32_BITS || directoryDataLength == MAX_32_BITS || filesLength == MAX_16_BITS || diskNumber == MAX_16_BITS) {
			const endOfDirectoryLocatorArray = await readUint8Array(reader, endOfDirectoryInfo.offset - ZIP64_END_OF_CENTRAL_DIR_LOCATOR_LENGTH, ZIP64_END_OF_CENTRAL_DIR_LOCATOR_LENGTH);
			const endOfDirectoryLocatorView = getDataView(endOfDirectoryLocatorArray);
			if (getUint32(endOfDirectoryLocatorView, 0) != ZIP64_END_OF_CENTRAL_DIR_LOCATOR_SIGNATURE) {
				throw new Error(ERR_EOCDR_ZIP64_NOT_FOUND);
			}
			directoryDataOffset = getBigUint64(endOfDirectoryLocatorView, 8);
			let endOfDirectoryArray = await readUint8Array(reader, directoryDataOffset, ZIP64_END_OF_CENTRAL_DIR_LENGTH, -1);
			let endOfDirectoryView = getDataView(endOfDirectoryArray);
			const expectedDirectoryDataOffset = endOfDirectoryInfo.offset - ZIP64_END_OF_CENTRAL_DIR_LOCATOR_LENGTH - ZIP64_END_OF_CENTRAL_DIR_LENGTH;
			if (getUint32(endOfDirectoryView, 0) != ZIP64_END_OF_CENTRAL_DIR_SIGNATURE && directoryDataOffset != expectedDirectoryDataOffset) {
				const originalDirectoryDataOffset = directoryDataOffset;
				directoryDataOffset = expectedDirectoryDataOffset;
				prependedDataLength = directoryDataOffset - originalDirectoryDataOffset;
				endOfDirectoryArray = await readUint8Array(reader, directoryDataOffset, ZIP64_END_OF_CENTRAL_DIR_LENGTH, -1);
				endOfDirectoryView = getDataView(endOfDirectoryArray);
			}
			if (getUint32(endOfDirectoryView, 0) != ZIP64_END_OF_CENTRAL_DIR_SIGNATURE) {
				throw new Error(ERR_EOCDR_LOCATOR_ZIP64_NOT_FOUND);
			}
			if (lastDiskNumber == MAX_16_BITS) {
				lastDiskNumber = getUint32(endOfDirectoryView, 16);
			}
			if (diskNumber == MAX_16_BITS) {
				diskNumber = getUint32(endOfDirectoryView, 20);
			}
			if (filesLength == MAX_16_BITS) {
				filesLength = getBigUint64(endOfDirectoryView, 32);
			}
			if (directoryDataLength == MAX_32_BITS) {
				directoryDataLength = getBigUint64(endOfDirectoryView, 40);
			}
			directoryDataOffset -= directoryDataLength;
		}
		if (expectedLastDiskNumber != lastDiskNumber) {
			throw new Error(ERR_SPLIT_ZIP_FILE);
		}
		if (directoryDataOffset < 0 || directoryDataOffset >= reader.size) {
			throw new Error(ERR_BAD_FORMAT);
		}
		let offset = 0;
		let directoryArray = await readUint8Array(reader, directoryDataOffset, directoryDataLength, diskNumber);
		let directoryView = getDataView(directoryArray);
		if (directoryDataLength) {
			const expectedDirectoryDataOffset = endOfDirectoryInfo.offset - directoryDataLength;
			if (getUint32(directoryView, offset) != CENTRAL_FILE_HEADER_SIGNATURE && directoryDataOffset != expectedDirectoryDataOffset) {
				const originalDirectoryDataOffset = directoryDataOffset;
				directoryDataOffset = expectedDirectoryDataOffset;
				prependedDataLength = directoryDataOffset - originalDirectoryDataOffset;
				directoryArray = await readUint8Array(reader, directoryDataOffset, directoryDataLength, diskNumber);
				directoryView = getDataView(directoryArray);
			}
		}
		if (directoryDataOffset < 0 || directoryDataOffset >= reader.size) {
			throw new Error(ERR_BAD_FORMAT);
		}
		const filenameEncoding = getOptionValue(zipReader, options, "filenameEncoding");
		const commentEncoding = getOptionValue(zipReader, options, "commentEncoding");
		for (let indexFile = 0; indexFile < filesLength; indexFile++) {
			const fileEntry = new ZipEntry(reader, config, zipReader.options);
			if (getUint32(directoryView, offset) != CENTRAL_FILE_HEADER_SIGNATURE) {
				throw new Error(ERR_CENTRAL_DIRECTORY_NOT_FOUND);
			}
			readCommonHeader(fileEntry, directoryView, offset + 6);
			const languageEncodingFlag = Boolean(fileEntry.bitFlag.languageEncodingFlag);
			const filenameOffset = offset + 46;
			const extraFieldOffset = filenameOffset + fileEntry.filenameLength;
			const commentOffset = extraFieldOffset + fileEntry.extraFieldLength;
			const versionMadeBy = getUint16(directoryView, offset + 4);
			const msDosCompatible = (versionMadeBy & 0) == 0;
			const rawFilename = directoryArray.subarray(filenameOffset, extraFieldOffset);
			const commentLength = getUint16(directoryView, offset + 32);
			const endOffset = commentOffset + commentLength;
			const rawComment = directoryArray.subarray(commentOffset, endOffset);
			const filenameUTF8 = languageEncodingFlag;
			const commentUTF8 = languageEncodingFlag;
			const directory = msDosCompatible && ((getUint8(directoryView, offset + 38) & FILE_ATTR_MSDOS_DIR_MASK) == FILE_ATTR_MSDOS_DIR_MASK);
			const offsetFileEntry = getUint32(directoryView, offset + 42) + prependedDataLength;
			Object.assign(fileEntry, {
				versionMadeBy,
				msDosCompatible,
				compressedSize: 0,
				uncompressedSize: 0,
				commentLength,
				directory,
				offset: offsetFileEntry,
				diskNumberStart: getUint16(directoryView, offset + 34),
				internalFileAttribute: getUint16(directoryView, offset + 36),
				externalFileAttribute: getUint32(directoryView, offset + 38),
				rawFilename,
				filenameUTF8,
				commentUTF8,
				rawExtraField: directoryArray.subarray(extraFieldOffset, commentOffset)
			});
			const [filename, comment] = await Promise.all([
				decodeText(rawFilename, filenameUTF8 ? CHARSET_UTF8 : filenameEncoding || CHARSET_CP437),
				decodeText(rawComment, commentUTF8 ? CHARSET_UTF8 : commentEncoding || CHARSET_CP437)
			]);
			Object.assign(fileEntry, {
				rawComment,
				filename,
				comment,
				directory: directory || filename.endsWith(DIRECTORY_SIGNATURE)
			});
			startOffset = Math.max(offsetFileEntry, startOffset);
			await readCommonFooter(fileEntry, fileEntry, directoryView, offset + 6);
			const entry = new Entry(fileEntry);
			entry.getData = (writer, options) => fileEntry.getData(writer, entry, options);
			offset = endOffset;
			const { onprogress } = options;
			if (onprogress) {
				try {
					await onprogress(indexFile + 1, filesLength, new Entry(fileEntry));
				} catch (_error) {
					// ignored
				}
			}
			yield entry;
		}
		const extractPrependedData = getOptionValue(zipReader, options, "extractPrependedData");
		const extractAppendedData = getOptionValue(zipReader, options, "extractAppendedData");
		if (extractPrependedData) {
			zipReader.prependedData = startOffset > 0 ? await readUint8Array(reader, 0, startOffset) : new Uint8Array();
		}
		zipReader.comment = commentLength ? await readUint8Array(reader, commentOffset + END_OF_CENTRAL_DIR_LENGTH, commentLength) : new Uint8Array();
		if (extractAppendedData) {
			zipReader.appendedData = appendedDataOffset < reader.size ? await readUint8Array(reader, appendedDataOffset, reader.size - appendedDataOffset) : new Uint8Array();
		}
		return true;
	}

	async getEntries(options = {}) {
		const entries = [];
		for await (const entry of this.getEntriesGenerator(options)) {
			entries.push(entry);
		}
		return entries;
	}

	async close() {
	}
}

class ZipEntry {

	constructor(reader, config, options) {
		Object.assign(this, {
			reader,
			config,
			options
		});
	}

	async getData(writer, fileEntry, options = {}) {
		const zipEntry = this;
		const {
			reader,
			offset,
			diskNumberStart,
			extraFieldAES,
			compressionMethod,
			config,
			bitFlag,
			signature,
			rawLastModDate,
			uncompressedSize,
			compressedSize
		} = zipEntry;
		const localDirectory = zipEntry.localDirectory = {};
		const dataArray = await readUint8Array(reader, offset, 30, diskNumberStart);
		const dataView = getDataView(dataArray);
		let password = getOptionValue(zipEntry, options, "password");
		password = password && password.length && password;
		if (extraFieldAES) {
			if (extraFieldAES.originalCompressionMethod != COMPRESSION_METHOD_AES) {
				throw new Error(ERR_UNSUPPORTED_COMPRESSION);
			}
		}
		if (compressionMethod != COMPRESSION_METHOD_STORE && compressionMethod != COMPRESSION_METHOD_DEFLATE) {
			throw new Error(ERR_UNSUPPORTED_COMPRESSION);
		}
		if (getUint32(dataView, 0) != LOCAL_FILE_HEADER_SIGNATURE) {
			throw new Error(ERR_LOCAL_FILE_HEADER_NOT_FOUND);
		}
		readCommonHeader(localDirectory, dataView, 4);
		localDirectory.rawExtraField = localDirectory.extraFieldLength ?
			await readUint8Array(reader, offset + 30 + localDirectory.filenameLength, localDirectory.extraFieldLength, diskNumberStart) :
			new Uint8Array();
		await readCommonFooter(zipEntry, localDirectory, dataView, 4);
		Object.assign(fileEntry, {
			lastAccessDate: localDirectory.lastAccessDate,
			creationDate: localDirectory.creationDate
		});
		const encrypted = zipEntry.encrypted && localDirectory.encrypted;
		const zipCrypto = encrypted && !extraFieldAES;
		if (encrypted) {
			if (!zipCrypto && extraFieldAES.strength === UNDEFINED_VALUE) {
				throw new Error(ERR_UNSUPPORTED_ENCRYPTION);
			} else if (!password) {
				throw new Error(ERR_ENCRYPTED);
			}
		}
		const dataOffset = offset + 30 + localDirectory.filenameLength + localDirectory.extraFieldLength;
		const readable = reader.readable;
		readable.diskNumberStart = diskNumberStart;
		readable.offset = dataOffset;
		let size = readable.size = compressedSize;
		const signal = getOptionValue(zipEntry, options, "signal");
		const checkPasswordOnly = getOptionValue(zipEntry, options, "checkPasswordOnly");
		if (checkPasswordOnly) {
			writer = new WritableStream();
		}
		writer = initWriter(writer);
		await initStream(writer, uncompressedSize);
		const { writable } = writer;
		const { onstart, onprogress, onend } = options;
		const workerOptions = {
			options: {
				codecType: CODEC_INFLATE,
				password,
				zipCrypto,
				encryptionStrength: extraFieldAES && extraFieldAES.strength,
				signed: getOptionValue(zipEntry, options, "checkSignature"),
				passwordVerification: zipCrypto && (bitFlag.dataDescriptor ? ((rawLastModDate >>> 8) & 0xFF) : ((signature >>> 24) & 0xFF)),
				signature,
				compressed: compressionMethod != 0,
				encrypted,
				useWebWorkers: getOptionValue(zipEntry, options, "useWebWorkers"),
				useCompressionStream: getOptionValue(zipEntry, options, "useCompressionStream"),
				transferStreams: getOptionValue(zipEntry, options, "transferStreams"),
				checkPasswordOnly
			},
			config,
			streamOptions: { signal, size, onstart, onprogress, onend }
		};
		let outputSize = 0;
		try {
			({ outputSize } = (await runWorker({ readable, writable }, workerOptions)));
		} catch (error) {
			if (!checkPasswordOnly || error.message != ERR_ABORT_CHECK_PASSWORD) {
				throw error;
			}
		} finally {
			const preventClose = getOptionValue(zipEntry, options, "preventClose");
			writable.size += outputSize;
			if (!preventClose && !writable.locked) {
				await writable.close();
			}
		}
		return checkPasswordOnly ? undefined : writer.getData ? writer.getData() : writable;
	}
}

function readCommonHeader(directory, dataView, offset) {
	const rawBitFlag = directory.rawBitFlag = getUint16(dataView, offset + 2);
	const encrypted = (rawBitFlag & BITFLAG_ENCRYPTED) == BITFLAG_ENCRYPTED;
	const rawLastModDate = getUint32(dataView, offset + 6);
	Object.assign(directory, {
		encrypted,
		version: getUint16(dataView, offset),
		bitFlag: {
			level: (rawBitFlag & BITFLAG_LEVEL) >> 1,
			dataDescriptor: (rawBitFlag & BITFLAG_DATA_DESCRIPTOR) == BITFLAG_DATA_DESCRIPTOR,
			languageEncodingFlag: (rawBitFlag & BITFLAG_LANG_ENCODING_FLAG) == BITFLAG_LANG_ENCODING_FLAG
		},
		rawLastModDate,
		lastModDate: getDate(rawLastModDate),
		filenameLength: getUint16(dataView, offset + 22),
		extraFieldLength: getUint16(dataView, offset + 24)
	});
}

async function readCommonFooter(fileEntry, directory, dataView, offset) {
	const { rawExtraField } = directory;
	const extraField = directory.extraField = new Map();
	const rawExtraFieldView = getDataView(new Uint8Array(rawExtraField));
	let offsetExtraField = 0;
	try {
		while (offsetExtraField < rawExtraField.length) {
			const type = getUint16(rawExtraFieldView, offsetExtraField);
			const size = getUint16(rawExtraFieldView, offsetExtraField + 2);
			extraField.set(type, {
				type,
				data: rawExtraField.slice(offsetExtraField + 4, offsetExtraField + 4 + size)
			});
			offsetExtraField += 4 + size;
		}
	} catch (_error) {
		// ignored
	}
	const compressionMethod = getUint16(dataView, offset + 4);
	Object.assign(directory, {
		signature: getUint32(dataView, offset + 10),
		uncompressedSize: getUint32(dataView, offset + 18),
		compressedSize: getUint32(dataView, offset + 14)
	});
	const extraFieldZip64 = extraField.get(EXTRAFIELD_TYPE_ZIP64);
	if (extraFieldZip64) {
		readExtraFieldZip64(extraFieldZip64, directory);
		directory.extraFieldZip64 = extraFieldZip64;
	}
	const extraFieldUnicodePath = extraField.get(EXTRAFIELD_TYPE_UNICODE_PATH);
	if (extraFieldUnicodePath) {
		await readExtraFieldUnicode(extraFieldUnicodePath, PROPERTY_NAME_FILENAME, PROPERTY_NAME_RAW_FILENAME, directory, fileEntry);
		directory.extraFieldUnicodePath = extraFieldUnicodePath;
	}
	const extraFieldUnicodeComment = extraField.get(EXTRAFIELD_TYPE_UNICODE_COMMENT);
	if (extraFieldUnicodeComment) {
		await readExtraFieldUnicode(extraFieldUnicodeComment, PROPERTY_NAME_COMMENT, PROPERTY_NAME_RAW_COMMENT, directory, fileEntry);
		directory.extraFieldUnicodeComment = extraFieldUnicodeComment;
	}
	const extraFieldAES = extraField.get(EXTRAFIELD_TYPE_AES);
	if (extraFieldAES) {
		readExtraFieldAES(extraFieldAES, directory, compressionMethod);
		directory.extraFieldAES = extraFieldAES;
	} else {
		directory.compressionMethod = compressionMethod;
	}
	const extraFieldNTFS = extraField.get(EXTRAFIELD_TYPE_NTFS);
	if (extraFieldNTFS) {
		readExtraFieldNTFS(extraFieldNTFS, directory);
		directory.extraFieldNTFS = extraFieldNTFS;
	}
	const extraFieldExtendedTimestamp = extraField.get(EXTRAFIELD_TYPE_EXTENDED_TIMESTAMP);
	if (extraFieldExtendedTimestamp) {
		readExtraFieldExtendedTimestamp(extraFieldExtendedTimestamp, directory);
		directory.extraFieldExtendedTimestamp = extraFieldExtendedTimestamp;
	}
}

function readExtraFieldZip64(extraFieldZip64, directory) {
	directory.zip64 = true;
	const extraFieldView = getDataView(extraFieldZip64.data);
	const missingProperties = ZIP64_PROPERTIES.filter(([propertyName, max]) => directory[propertyName] == max);
	for (let indexMissingProperty = 0, offset = 0; indexMissingProperty < missingProperties.length; indexMissingProperty++) {
		const [propertyName, max] = missingProperties[indexMissingProperty];
		if (directory[propertyName] == max) {
			const extraction = ZIP64_EXTRACTION[max];
			directory[propertyName] = extraFieldZip64[propertyName] = extraction.getValue(extraFieldView, offset);
			offset += extraction.bytes;
		} else if (extraFieldZip64[propertyName]) {
			throw new Error(ERR_EXTRAFIELD_ZIP64_NOT_FOUND);
		}
	}
}

async function readExtraFieldUnicode(extraFieldUnicode, propertyName, rawPropertyName, directory, fileEntry) {
	const extraFieldView = getDataView(extraFieldUnicode.data);
	const crc32 = new Crc32();
	crc32.append(fileEntry[rawPropertyName]);
	const dataViewSignature = getDataView(new Uint8Array(4));
	dataViewSignature.setUint32(0, crc32.get(), true);
	Object.assign(extraFieldUnicode, {
		version: getUint8(extraFieldView, 0),
		signature: getUint32(extraFieldView, 1),
		[propertyName]: await decodeText(extraFieldUnicode.data.subarray(5)),
		valid: !fileEntry.bitFlag.languageEncodingFlag && extraFieldUnicode.signature == getUint32(dataViewSignature, 0)
	});
	if (extraFieldUnicode.valid) {
		directory[propertyName] = extraFieldUnicode[propertyName];
		directory[propertyName + "UTF8"] = true;
	}
}

function readExtraFieldAES(extraFieldAES, directory, compressionMethod) {
	const extraFieldView = getDataView(extraFieldAES.data);
	const strength = getUint8(extraFieldView, 4);
	Object.assign(extraFieldAES, {
		vendorVersion: getUint8(extraFieldView, 0),
		vendorId: getUint8(extraFieldView, 2),
		strength,
		originalCompressionMethod: compressionMethod,
		compressionMethod: getUint16(extraFieldView, 5)
	});
	directory.compressionMethod = extraFieldAES.compressionMethod;
}

function readExtraFieldNTFS(extraFieldNTFS, directory) {
	const extraFieldView = getDataView(extraFieldNTFS.data);
	let offsetExtraField = 4;
	let tag1Data;
	try {
		while (offsetExtraField < extraFieldNTFS.data.length && !tag1Data) {
			const tagValue = getUint16(extraFieldView, offsetExtraField);
			const attributeSize = getUint16(extraFieldView, offsetExtraField + 2);
			if (tagValue == EXTRAFIELD_TYPE_NTFS_TAG1) {
				tag1Data = extraFieldNTFS.data.slice(offsetExtraField + 4, offsetExtraField + 4 + attributeSize);
			}
			offsetExtraField += 4 + attributeSize;
		}
	} catch (_error) {
		// ignored
	}
	try {
		if (tag1Data && tag1Data.length == 24) {
			const tag1View = getDataView(tag1Data);
			const rawLastModDate = tag1View.getBigUint64(0, true);
			const rawLastAccessDate = tag1View.getBigUint64(8, true);
			const rawCreationDate = tag1View.getBigUint64(16, true);
			Object.assign(extraFieldNTFS, {
				rawLastModDate,
				rawLastAccessDate,
				rawCreationDate
			});
			const lastModDate = getDateNTFS(rawLastModDate);
			const lastAccessDate = getDateNTFS(rawLastAccessDate);
			const creationDate = getDateNTFS(rawCreationDate);
			const extraFieldData = { lastModDate, lastAccessDate, creationDate };
			Object.assign(extraFieldNTFS, extraFieldData);
			Object.assign(directory, extraFieldData);
		}
	} catch (_error) {
		// ignored
	}
}

function readExtraFieldExtendedTimestamp(extraFieldExtendedTimestamp, directory) {
	const extraFieldView = getDataView(extraFieldExtendedTimestamp.data);
	const flags = getUint8(extraFieldView, 0);
	const timeProperties = [];
	const timeRawProperties = [];
	if ((flags & 0x1) == 0x1) {
		timeProperties.push(PROPERTY_NAME_LAST_MODIFICATION_DATE);
		timeRawProperties.push(PROPERTY_NAME_RAW_LAST_MODIFICATION_DATE);
	}
	if ((flags & 0x2) == 0x2) {
		timeProperties.push(PROPERTY_NAME_LAST_ACCESS_DATE);
		timeRawProperties.push(PROPERTY_NAME_RAW_LAST_ACCESS_DATE);
	}
	if ((flags & 0x4) == 0x4) {
		timeProperties.push(PROPERTY_NAME_CREATION_DATE);
		timeRawProperties.push(PROPERTY_NAME_RAW_CREATION_DATE);
	}
	let offset = 1;
	timeProperties.forEach((propertyName, indexProperty) => {
		if (extraFieldExtendedTimestamp.data.length >= offset + 4) {
			const time = getUint32(extraFieldView, offset);
			directory[propertyName] = extraFieldExtendedTimestamp[propertyName] = new Date(time * 1000);
			const rawPropertyName = timeRawProperties[indexProperty];
			extraFieldExtendedTimestamp[rawPropertyName] = time;
		}
		offset += 4;
	});
}

async function seekSignature(reader, signature, startOffset, minimumBytes, maximumLength) {
	const signatureArray = new Uint8Array(4);
	const signatureView = getDataView(signatureArray);
	setUint32(signatureView, 0, signature);
	const maximumBytes = minimumBytes + maximumLength;
	return (await seek(minimumBytes)) || await seek(Math.min(maximumBytes, startOffset));

	async function seek(length) {
		const offset = startOffset - length;
		const bytes = await readUint8Array(reader, offset, length);
		for (let indexByte = bytes.length - minimumBytes; indexByte >= 0; indexByte--) {
			if (bytes[indexByte] == signatureArray[0] && bytes[indexByte + 1] == signatureArray[1] &&
				bytes[indexByte + 2] == signatureArray[2] && bytes[indexByte + 3] == signatureArray[3]) {
				return {
					offset: offset + indexByte,
					buffer: bytes.slice(indexByte, indexByte + minimumBytes).buffer
				};
			}
		}
	}
}

function getOptionValue(zipReader, options, name) {
	return options[name] === UNDEFINED_VALUE ? zipReader.options[name] : options[name];
}

function getDate(timeRaw) {
	const date = (timeRaw & 0xffff0000) >> 16, time = timeRaw & 0x0000ffff;
	try {
		return new Date(1980 + ((date & 0xFE00) >> 9), ((date & 0x01E0) >> 5) - 1, date & 0x001F, (time & 0xF800) >> 11, (time & 0x07E0) >> 5, (time & 0x001F) * 2, 0);
	} catch (_error) {
		// ignored
	}
}

function getDateNTFS(timeRaw) {
	return new Date((Number((timeRaw / BigInt(10000)) - BigInt(11644473600000))));
}

function getUint8(view, offset) {
	return view.getUint8(offset);
}

function getUint16(view, offset) {
	return view.getUint16(offset, true);
}

function getUint32(view, offset) {
	return view.getUint32(offset, true);
}

function getBigUint64(view, offset) {
	return Number(view.getBigUint64(offset, true));
}

function setUint32(view, offset, value) {
	view.setUint32(offset, value, true);
}

function getDataView(array) {
	return new DataView(array.buffer);
}

/*
 Copyright (c) 2022 Gildas Lormeau. All rights reserved.

 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions are met:

 1. Redistributions of source code must retain the above copyright notice,
 this list of conditions and the following disclaimer.

 2. Redistributions in binary form must reproduce the above copyright 
 notice, this list of conditions and the following disclaimer in 
 the documentation and/or other materials provided with the distribution.

 3. The names of the authors may not be used to endorse or promote products
 derived from this software without specific prior written permission.

 THIS SOFTWARE IS PROVIDED ''AS IS'' AND ANY EXPRESSED OR IMPLIED WARRANTIES,
 INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL JCRAFT,
 INC. OR ANY CONTRIBUTORS TO THIS SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT,
 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA,
 OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

let baseURL;
try {
	baseURL = import.meta.url;
} catch (_error) {
	// ignored
}
configure({ baseURL });
e(configure);

/// <reference types="./index.d.ts" />

configure({ Deflate: ZipDeflate, Inflate: ZipInflate });

function parseIndex(index, size) {
    return index < 0 ?
        Math.max(index + size, 0) :
        Math.min(index, size);
}
class BlobEntryReaderImpl extends Reader {
    constructor(blob, entryMetadata) {
        super(blob);
        this.blob = blob;
        this.offset = entryMetadata.offset + entryMetadata.headerSize;
        this.size = entryMetadata.compressedSize;
    }
    async readUint8Array(index, length) {
        const start = parseIndex(index, this.size) + this.offset;
        const end = parseIndex(index + length, this.size) + this.offset;
        const blob = this.blob.slice(start, end);
        return new Uint8Array(await blob.arrayBuffer());
    }
}
/**
 * Represents a {@link Reader} instance used to read data of an entry in a zip
 * file provided as a {@link Blob}. It directly reads data if it is uncompressed.
 */
class BlobEntryReader extends Reader {
    /**
     * @param blob - The blob to read data from, usually the outer zip file.
     * @param entry - The entry to read data of, usually the inner zip file.
     * @param mimeString - The MIME type of the data.
     * @param options - Represents options passed to {@link Entry#getData}.
     */
    constructor(blob, entry, mimeString, options) {
        super();
        this.blob = blob;
        this.entry = entry;
        this.mimeString = mimeString;
        this.options = options;
    }
    async init() {
        const entryMetadata = await getEntryMetadata(this.blob, this.entry);
        if (entryMetadata.compressionMethod !== 0) {
            const entryBlob = await zipGetData(this.entry, new BlobWriter(this.mimeString), this.options);
            this.reader = new BlobReader(entryBlob);
        }
        else {
            this.reader = new BlobEntryReaderImpl(this.blob, entryMetadata);
        }
        this.size = this.reader.size;
    }
    async readUint8Array(index, length) {
        return this.reader.readUint8Array(index, length);
    }
}

// Images needed for fastbootd
const BOOT_CRITICAL_IMAGES = [
    "boot",
    "dt",
    "dtbo",
    "init_boot",
    "pvmfw",
    "recovery",
    "vbmeta_system",
    "vbmeta_vendor",
    "vbmeta",
    "vendor_boot",
    "vendor_kernel_boot",
];
// Less critical images to flash after boot-critical ones
const SYSTEM_IMAGES = [
    "odm",
    "odm_dlkm",
    "product",
    "system_dlkm",
    "system_ext",
    "system",
    "vendor_dlkm",
    "vendor",
];
const BOOTLOADER_REBOOT_TIME = 4000; // ms
const FASTBOOTD_REBOOT_TIME = 16000; // ms
const USERDATA_ERASE_TIME = 1000; // ms
async function flashEntryBlob(device, entry, onProgress, partition) {
    const blob = await zipGetData(entry, new BlobWriter("application/octet-stream"), {
        onstart(total) {
            logDebug(`Unpacking ${partition} (${total} bytes)`);
            onProgress("unpack", partition, 0.0);
            return;
        },
        onprogress(progress, total) {
            onProgress("unpack", partition, progress / total);
            return;
        }
    });
    logDebug(`Flashing ${partition}`);
    onProgress("flash", partition, 0.0);
    await device.flashBlob(partition, blob, (progress) => {
        onProgress("flash", partition, progress);
    });
}
async function tryFlashImages(device, entries, onProgress, imageNames) {
    for (let imageName of imageNames) {
        let pattern = new RegExp(`${imageName}(?:-.+)?\\.img$`);
        let entry = entries.find((entry) => entry.filename.match(pattern));
        if (entry !== undefined) {
            if (imageName == "bootloader") {
                let current_slot = await device.getVariable("current-slot");
                if (current_slot == "a") {
                    await flashEntryBlob(device, entry, onProgress, (imageName + "_b"));
                    await device.runCommand("set_active:b");
                }
                else if (current_slot == "b") {
                    await flashEntryBlob(device, entry, onProgress, (imageName + "_a"));
                    await device.runCommand("set_active:a");
                }
                else {
                    throw new FastbootError("FAIL", `Invalid slot given by bootloader.`);
                }
            }
            else {
                await flashEntryBlob(device, entry, onProgress, imageName);
            }
        }
    }
}
async function checkRequirements(device, androidInfo) {
    // Deal with CRLF just in case
    for (let line of androidInfo.replace("\r", "").split("\n")) {
        let match = line.match(/^require\s+(.+?)=(.+)$/);
        if (!match) {
            continue;
        }
        let variable = match[1];
        // Historical mismatch that we still need to deal with
        if (variable === "board") {
            variable = "product";
        }
        let expectValue = match[2];
        let expectValues = expectValue.split("|");
        // Special case: not a real variable at all
        if (variable === "partition-exists") {
            // Check whether the partition exists on the device:
            // has-slot = undefined || FAIL => doesn't exist
            // has-slot = yes || no         => exists
            let hasSlot = await device.getVariable(`has-slot:${expectValue}`);
            if (hasSlot !== "yes" && hasSlot !== "no") {
                throw new FastbootError("FAIL", `Requirement ${variable}=${expectValue} failed, device lacks partition`);
            }
            // Check whether we recognize the partition
            if (!BOOT_CRITICAL_IMAGES.includes(expectValue) &&
                !SYSTEM_IMAGES.includes(expectValue)) {
                throw new FastbootError("FAIL", `Requirement ${variable}=${expectValue} failed, unrecognized partition`);
            }
        }
        else {
            let realValue = await device.getVariable(variable);
            if (expectValues.includes(realValue)) {
                logDebug(`Requirement ${variable}=${expectValue} passed`);
            }
            else {
                let msg = `Requirement ${variable}=${expectValue} failed, value = ${realValue}`;
                logDebug(msg);
                throw new FastbootError("FAIL", msg);
            }
        }
    }
}
async function tryReboot(device, target, onReconnect) {
    try {
        await device.reboot(target, false);
    }
    catch (e) {
        /* Failed = device rebooted by itself */
    }
    await device.waitForConnect(onReconnect);
}
async function flashZip(device, blob, wipe, onReconnect, onProgress = (_action, _item, _progress) => { }) {
    onProgress("load", "package", 0.0);
    let reader = new ZipReader(new BlobReader(blob));
    let entries = await reader.getEntries();
    // Bootloader and radio packs can only be flashed in the bare-metal bootloader
    if ((await device.getVariable("is-userspace")) === "yes") {
        await device.reboot("bootloader", true, onReconnect);
    }
    // 1. Bootloader pack (repeated for slot A and B)
    await tryFlashImages(device, entries, onProgress, ["bootloader"]);
    await runWithTimedProgress(onProgress, "reboot", "device", BOOTLOADER_REBOOT_TIME, tryReboot(device, "bootloader", onReconnect));
    await tryFlashImages(device, entries, onProgress, ["bootloader"]);
    await runWithTimedProgress(onProgress, "reboot", "device", BOOTLOADER_REBOOT_TIME, tryReboot(device, "bootloader", onReconnect));
    // 2. Radio pack
    await tryFlashImages(device, entries, onProgress, ["radio"]);
    await runWithTimedProgress(onProgress, "reboot", "device", BOOTLOADER_REBOOT_TIME, tryReboot(device, "bootloader", onReconnect));
    // Cancel snapshot update if in progress
    let snapshotStatus = await device.getVariable("snapshot-update-status");
    if (snapshotStatus !== null && snapshotStatus !== "none") {
        await device.runCommand("snapshot-update:cancel");
    }
    // Load nested images for the following steps
    let entry = entries.find((e) => e.filename.match(/image-.+\.zip$/));
    const imageReader = new ZipReader(new BlobEntryReader(blob, entry, "application/zip", {
        onstart(total) {
            logDebug(`Loading nested images from zip (${total} bytes)`);
            onProgress("unpack", "images", 0.0);
            return;
        },
        onprogress(progress, total) {
            onProgress("unpack", "images", progress / total);
            return;
        }
    }));
    const imageEntries = await imageReader.getEntries();
    // 3. Check requirements
    entry = imageEntries.find((e) => e.filename === "android-info.txt");
    if (entry !== undefined) {
        const reqText = await zipGetData(entry, new TextWriter());
        await checkRequirements(device, reqText);
    }
    // 4. Boot-critical images
    await tryFlashImages(device, imageEntries, onProgress, BOOT_CRITICAL_IMAGES);
    // 5. Super partition template
    // This is also where we reboot to fastbootd.
    entry = imageEntries.find((e) => e.filename === "super_empty.img");
    if (entry !== undefined) {
        await runWithTimedProgress(onProgress, "reboot", "device", FASTBOOTD_REBOOT_TIME, device.reboot("fastboot", true, onReconnect));
        let superName = await device.getVariable("super-partition-name");
        if (!superName) {
            superName = "super";
        }
        let superAction = wipe ? "wipe" : "flash";
        onProgress(superAction, "super", 0.0);
        const superBlob = await zipGetData(entry, new BlobWriter("application/octet-stream"));
        await device.upload(superName, await readBlobAsBuffer(superBlob), (progress) => {
            onProgress(superAction, "super", progress);
        });
        await device.runCommand(`update-super:${superName}${wipe ? ":wipe" : ""}`);
    }
    // 6. Remaining system images
    await tryFlashImages(device, imageEntries, onProgress, SYSTEM_IMAGES);
    // We unconditionally reboot back to the bootloader here if we're in fastbootd,
    // even when there's no custom AVB key, because common follow-up actions like
    // locking the bootloader and wiping data need to be done in the bootloader.
    if ((await device.getVariable("is-userspace")) === "yes") {
        await runWithTimedProgress(onProgress, "reboot", "device", BOOTLOADER_REBOOT_TIME, device.reboot("bootloader", true, onReconnect));
    }
    // 7. Custom AVB key
    entry = entries.find((e) => e.filename.endsWith("avb_pkmd.bin"));
    if (entry !== undefined) {
        await device.runCommand("erase:avb_custom_key");
        await flashEntryBlob(device, entry, onProgress, "avb_custom_key");
    }
    // 8. Wipe userdata
    if (wipe) {
        await runWithTimedProgress(onProgress, "wipe", "data", USERDATA_ERASE_TIME, device.runCommand("erase:userdata"));
    }
}

const FASTBOOT_USB_CLASS = 0xff;
const FASTBOOT_USB_SUBCLASS = 0x42;
const FASTBOOT_USB_PROTOCOL = 0x03;
const BULK_TRANSFER_SIZE = 16384;
const DEFAULT_DOWNLOAD_SIZE = 512 * 1024 * 1024; // 512 MiB
// To conserve RAM and work around Chromium's ~2 GiB size limit, we limit the
// max download size even if the bootloader can accept more data.
const MAX_DOWNLOAD_SIZE = 1024 * 1024 * 1024; // 1 GiB
const GETVAR_TIMEOUT = 10000; // ms
/**
 * Exception class for USB errors not directly thrown by WebUSB.
 */
class UsbError extends Error {
    constructor(message) {
        super(message);
        this.name = "UsbError";
    }
}
/**
 * Exception class for errors returned by the bootloader, as well as high-level
 * fastboot errors resulting from bootloader responses.
 */
class FastbootError extends Error {
    constructor(status, message) {
        super(`Bootloader replied with ${status}: ${message}`);
        this.status = status;
        this.bootloaderMessage = message;
        this.name = "FastbootError";
    }
}
/**
 * This class is a client for executing fastboot commands and operations on a
 * device connected over USB.
 */
let FastbootDevice$1 = class FastbootDevice {
    /**
     * Create a new fastboot device instance. This doesn't actually connect to
     * any USB devices; call {@link connect} to do so.
     */
    constructor() {
        this.device = null;
        this.epIn = null;
        this.epOut = null;
        this._registeredUsbListeners = false;
        this._connectResolve = null;
        this._connectReject = null;
        this._disconnectResolve = null;
    }
    /**
     * Returns whether a USB device is connected and ready for use.
     */
    get isConnected() {
        return (this.device !== null &&
            this.device.opened &&
            this.device.configurations[0].interfaces[0].claimed);
    }
    /**
     * Validate the current USB device's details and connect to it.
     *
     * @private
     */
    async _validateAndConnectDevice() {
        if (this.device === null) {
            throw new UsbError("Attempted to connect to null device");
        }
        // Validate device
        let ife = this.device.configurations[0].interfaces[0].alternates[0];
        if (ife.endpoints.length !== 2) {
            throw new UsbError("Interface has wrong number of endpoints");
        }
        this.epIn = null;
        this.epOut = null;
        for (let endpoint of ife.endpoints) {
            logVerbose("Checking endpoint:", endpoint);
            if (endpoint.type !== "bulk") {
                throw new UsbError("Interface endpoint is not bulk");
            }
            if (endpoint.direction === "in") {
                if (this.epIn === null) {
                    this.epIn = endpoint.endpointNumber;
                }
                else {
                    throw new UsbError("Interface has multiple IN endpoints");
                }
            }
            else if (endpoint.direction === "out") {
                if (this.epOut === null) {
                    this.epOut = endpoint.endpointNumber;
                }
                else {
                    throw new UsbError("Interface has multiple OUT endpoints");
                }
            }
        }
        logVerbose("Endpoints: in =", this.epIn, ", out =", this.epOut);
        try {
            await this.device.open();
            // Opportunistically reset to fix issues on some platforms
            try {
                await this.device.reset();
            }
            catch (error) {
                /* Failed = doesn't support reset */
            }
            await this.device.selectConfiguration(1);
            await this.device.claimInterface(0); // fastboot
        }
        catch (error) {
            // Propagate exception from waitForConnect()
            if (this._connectReject !== null) {
                this._connectReject(error);
                this._connectResolve = null;
                this._connectReject = null;
            }
            throw error;
        }
        // Return from waitForConnect()
        if (this._connectResolve !== null) {
            this._connectResolve(undefined);
            this._connectResolve = null;
            this._connectReject = null;
        }
    }
    /**
     * Wait for the current USB device to disconnect, if it's still connected.
     * Returns immediately if no device is connected.
     */
    async waitForDisconnect() {
        if (this.device === null) {
            return;
        }
        return await new Promise((resolve, _reject) => {
            this._disconnectResolve = resolve;
        });
    }
    /**
     * Wait for the USB device to connect. Returns at the next connection,
     * regardless of whether the connected USB device matches the previous one.
     *
     * @param {ReconnectCallback} onReconnect - Callback to request device reconnection on Android.
     */
    async waitForConnect(onReconnect = () => { }) {
        // On Android, we need to request the user to reconnect the device manually
        // because there is no support for automatic reconnection.
        if (navigator.userAgent.includes("Android")) {
            await this.waitForDisconnect();
            onReconnect();
        }
        return await new Promise((resolve, reject) => {
            this._connectResolve = resolve;
            this._connectReject = reject;
        });
    }
    /**
     * Request the user to select a USB device and connect to it using the
     * fastboot protocol.
     *
     * @throws {UsbError}
     */
    async connect() {
        let devices = await navigator.usb.getDevices();
        logDebug("Found paired USB devices:", devices);
        if (devices.length === 1) {
            this.device = devices[0];
        }
        else {
            // If multiple paired devices are connected, request the user to
            // select a specific one to reduce ambiguity. This is also necessary
            // if no devices are already paired, i.e. first use.
            logDebug("No or multiple paired devices are connected, requesting one");
            this.device = await navigator.usb.requestDevice({
                filters: [
                    {
                        classCode: FASTBOOT_USB_CLASS,
                        subclassCode: FASTBOOT_USB_SUBCLASS,
                        protocolCode: FASTBOOT_USB_PROTOCOL,
                    },
                ],
            });
        }
        logDebug("Using USB device:", this.device);
        if (!this._registeredUsbListeners) {
            navigator.usb.addEventListener("disconnect", (event) => {
                if (event.device === this.device) {
                    logDebug("USB device disconnected");
                    if (this._disconnectResolve !== null) {
                        this._disconnectResolve(undefined);
                        this._disconnectResolve = null;
                    }
                }
            });
            navigator.usb.addEventListener("connect", async (event) => {
                logDebug("USB device connected");
                this.device = event.device;
                // Check whether waitForConnect() is pending and save it for later
                let hasPromiseReject = this._connectReject !== null;
                try {
                    await this._validateAndConnectDevice();
                }
                catch (error) {
                    // Only rethrow errors from the event handler if waitForConnect()
                    // didn't already handle them
                    if (!hasPromiseReject) {
                        throw error;
                    }
                }
            });
            this._registeredUsbListeners = true;
        }
        await this._validateAndConnectDevice();
    }
    /**
     * Read a raw command response from the bootloader.
     *
     * @private
     * @returns {Promise<CommandResponse>} Object containing response text and data size, if any.
     * @throws {FastbootError}
     */
    async _readResponse() {
        let respData = {
            text: "",
        };
        let respStatus;
        do {
            let respPacket = await this.device.transferIn(this.epIn, 64);
            let response = new TextDecoder().decode(respPacket.data);
            respStatus = response.substring(0, 4);
            let respMessage = response.substring(4);
            logDebug(`Response: ${respStatus} ${respMessage}`);
            if (respStatus === "OKAY") {
                // OKAY = end of response for this command
                respData.text += respMessage;
            }
            else if (respStatus === "INFO") {
                // INFO = additional info line
                respData.text += respMessage + "\n";
            }
            else if (respStatus === "DATA") {
                // DATA = hex string, but it's returned separately for safety
                respData.dataSize = respMessage;
            }
            else {
                // Assume FAIL or garbage data
                throw new FastbootError(respStatus, respMessage);
            }
            // INFO = more packets are coming
        } while (respStatus === "INFO");
        return respData;
    }
    /**
     * Send a textual command to the bootloader and read the response.
     * This is in raw fastboot format, not AOSP fastboot syntax.
     *
     * @param {string} command - The command to send.
     * @returns {Promise<CommandResponse>} Object containing response text and data size, if any.
     * @throws {FastbootError}
     */
    async runCommand(command) {
        // Command and response length is always 64 bytes regardless of protocol
        if (command.length > 64) {
            throw new RangeError();
        }
        // Send raw UTF-8 command
        let cmdPacket = new TextEncoder().encode(command);
        await this.device.transferOut(this.epOut, cmdPacket);
        logDebug("Command:", command);
        return this._readResponse();
    }
    /**
     * Read the value of a bootloader variable. Returns undefined if the variable
     * does not exist.
     *
     * @param {string} varName - The name of the variable to get.
     * @returns {Promise<string>} Textual content of the variable.
     * @throws {FastbootError}
     */
    async getVariable(varName) {
        let resp;
        try {
            resp = (await runWithTimeout(this.runCommand(`getvar:${varName}`), GETVAR_TIMEOUT)).text;
        }
        catch (error) {
            // Some bootloaders return FAIL instead of empty responses, despite
            // what the spec says. Normalize it here.
            if (error instanceof FastbootError && error.status == "FAIL") {
                resp = null;
            }
            else {
                throw error;
            }
        }
        // Some bootloaders send whitespace around some variables.
        // According to the spec, non-existent variables should return empty
        // responses
        return resp ? resp.trim() : null;
    }
    /**
     * Get the maximum download size for a single payload, in bytes.
     *
     * @private
     * @returns {Promise<number>}
     * @throws {FastbootError}
     */
    async _getDownloadSize() {
        try {
            let resp = (await this.getVariable("max-download-size")).toLowerCase();
            if (resp) {
                // AOSP fastboot requires hex
                return Math.min(parseInt(resp, 16), MAX_DOWNLOAD_SIZE);
            }
        }
        catch (error) {
            /* Failed = no value, fallthrough */
        }
        // FAIL or empty variable means no max, set a reasonable limit to conserve memory
        return DEFAULT_DOWNLOAD_SIZE;
    }
    /**
     * Send a raw data payload to the bootloader.
     *
     * @private
     */
    async _sendRawPayload(buffer, onProgress) {
        let i = 0;
        let remainingBytes = buffer.byteLength;
        while (remainingBytes > 0) {
            let chunk = buffer.slice(i * BULK_TRANSFER_SIZE, (i + 1) * BULK_TRANSFER_SIZE);
            if (i % 1000 === 0) {
                logVerbose(`  Sending ${chunk.byteLength} bytes to endpoint, ${remainingBytes} remaining, i=${i}`);
            }
            if (i % 10 === 0) {
                onProgress((buffer.byteLength - remainingBytes) / buffer.byteLength);
            }
            await this.device.transferOut(this.epOut, chunk);
            remainingBytes -= chunk.byteLength;
            i += 1;
        }
        onProgress(1.0);
    }
    /**
     * Upload a payload to the bootloader for later use, e.g. flashing.
     * Does not handle raw images, flashing, or splitting.
     *
     * @param {string} partition - Name of the partition the payload is intended for.
     * @param {ArrayBuffer} buffer - Buffer containing the data to upload.
     * @param {FlashProgressCallback} onProgress - Callback for upload progress updates.
     * @throws {FastbootError}
     */
    async upload(partition, buffer, onProgress = (_progress) => { }) {
        logDebug(`Uploading single sparse to ${partition}: ${buffer.byteLength} bytes`);
        // Bootloader requires an 8-digit hex number
        let xferHex = buffer.byteLength.toString(16).padStart(8, "0");
        if (xferHex.length !== 8) {
            throw new FastbootError("FAIL", `Transfer size overflow: ${xferHex} is more than 8 digits`);
        }
        // Check with the device and make sure size matches
        let downloadResp = await this.runCommand(`download:${xferHex}`);
        if (downloadResp.dataSize === undefined) {
            throw new FastbootError("FAIL", `Unexpected response to download command: ${downloadResp.text}`);
        }
        let downloadSize = parseInt(downloadResp.dataSize, 16);
        if (downloadSize !== buffer.byteLength) {
            throw new FastbootError("FAIL", `Bootloader wants ${buffer.byteLength} bytes, requested to send ${buffer.byteLength} bytes`);
        }
        logDebug(`Sending payload: ${buffer.byteLength} bytes`);
        await this._sendRawPayload(buffer, onProgress);
        logDebug("Payload sent, waiting for response...");
        await this._readResponse();
    }
    /**
     * Reboot to the given target, and optionally wait for the device to
     * reconnect.
     *
     * @param {string} target - Where to reboot to, i.e. fastboot or bootloader.
     * @param {boolean} wait - Whether to wait for the device to reconnect.
     * @param {ReconnectCallback} onReconnect - Callback to request device reconnection, if wait is enabled.
     */
    async reboot(target = "", wait = false, onReconnect = () => { }) {
        if (target.length > 0) {
            await this.runCommand(`reboot-${target}`);
        }
        else {
            await this.runCommand("reboot");
        }
        if (wait) {
            await this.waitForConnect(onReconnect);
        }
    }
    /**
     * Flash the given Blob to the given partition on the device. Any image
     * format supported by the bootloader is allowed, e.g. sparse or raw images.
     * Large raw images will be converted to sparse images automatically, and
     * large sparse images will be split and flashed in multiple passes
     * depending on the bootloader's payload size limit.
     *
     * @param {string} partition - The name of the partition to flash.
     * @param {Blob} blob - The Blob to retrieve data from.
     * @param {FlashProgressCallback} onProgress - Callback for flashing progress updates.
     * @throws {FastbootError}
     */
    async flashBlob(partition, blob, onProgress = (_progress) => { }) {
        // Use current slot if partition is A/B
        if ((await this.getVariable(`has-slot:${partition}`)) === "yes") {
            partition += "_" + (await this.getVariable("current-slot"));
        }
        let maxDlSize = await this._getDownloadSize();
        let fileHeader = await readBlobAsBuffer(blob.slice(0, FILE_HEADER_SIZE));
        let totalBytes = blob.size;
        let isSparse = false;
        try {
            let sparseHeader = parseFileHeader(fileHeader);
            if (sparseHeader !== null) {
                totalBytes = sparseHeader.blocks * sparseHeader.blockSize;
                isSparse = true;
            }
        }
        catch (error) {
            // ImageError = invalid, so keep blob.size
        }
        // Logical partitions need to be resized before flashing because they're
        // sized perfectly to the payload.
        if ((await this.getVariable(`is-logical:${partition}`)) === "yes") {
            // As per AOSP fastboot, we reset the partition to 0 bytes first
            // to optimize extent allocation.
            await this.runCommand(`resize-logical-partition:${partition}:0`);
            // Set the actual size
            await this.runCommand(`resize-logical-partition:${partition}:${totalBytes}`);
        }
        // Convert image to sparse (for splitting) if it exceeds the size limit
        if (blob.size > maxDlSize && !isSparse) {
            logDebug(`${partition} image is raw, converting to sparse`);
            blob = await fromRaw(blob);
        }
        logDebug(`Flashing ${blob.size} bytes to ${partition}, ${maxDlSize} bytes per split`);
        let splits = 0;
        let sentBytes = 0;
        for await (let split of splitBlob(blob, maxDlSize)) {
            await this.upload(partition, split.data, (progress) => {
                onProgress((sentBytes + progress * split.bytes) / totalBytes);
            });
            logDebug("Flashing payload...");
            await this.runCommand(`flash:${partition}`);
            splits += 1;
            sentBytes += split.bytes;
        }
        logDebug(`Flashed ${partition} with ${splits} split(s)`);
    }
    /**
     * Boot the given Blob on the device.
     * Equivalent to `fastboot boot boot.img`.
     *
     * @param {Blob} blob - The Blob to retrieve data from.
     * @param {FlashProgressCallback} onProgress - Callback for flashing progress updates.
     * @throws {FastbootError}
     */
    async bootBlob(blob, onProgress = (_progress) => { }) {
        logDebug(`Booting ${blob.size} bytes image`);
        let data = await readBlobAsBuffer(blob);
        await this.upload("boot.img", data, onProgress);
        logDebug("Booting payload...");
        await this.runCommand("boot");
        logDebug(`Booted ${blob.size} bytes image`);
    }
    /**
     * Flash the given factory images zip onto the device, with automatic handling
     * of firmware, system, and logical partitions as AOSP fastboot and
     * flash-all.sh would do.
     * Equivalent to `fastboot update name.zip`.
     *
     * @param {Blob} blob - Blob containing the zip file to flash.
     * @param {boolean} wipe - Whether to wipe super and userdata. Equivalent to `fastboot -w`.
     * @param {ReconnectCallback} onReconnect - Callback to request device reconnection.
     * @param {FactoryProgressCallback} onProgress - Progress callback for image flashing.
     */
    async flashFactoryZip(blob, wipe, onReconnect, onProgress = (_progress) => { }) {
        return await flashZip(this, blob, wipe, onReconnect, onProgress);
    }
};

// The pinned vendor bundle has no declaration file.
// @ts-expect-error -- runtime code is supplied by vendor/fastboot.js.
const FastbootDevice = FastbootDevice$1;

const fastbootFilter = {
    classCode: 0xff,
    subclassCode: 0x42,
    protocolCode: 0x03,
};
const encoder$1 = new TextEncoder();
const adbProperties = {
    "boot-devices": "ro.boot.boot_devices",
    "build-fingerprint": "ro.build.fingerprint",
    "build-id": "ro.build.id",
    "build-incremental": "ro.build.version.incremental",
    device: "ro.product.device",
    "flash-locked": "ro.boot.flash.locked",
    "hardware-sku": "ro.boot.hardware.sku",
    manufacturer: "ro.product.manufacturer",
    model: "ro.product.model",
    "security-patch": "ro.build.version.security_patch",
    "slot-suffix": "ro.boot.slot_suffix",
    "vbmeta-device-state": "ro.boot.vbmeta.device_state",
    "vbmeta-digest": "ro.boot.vbmeta.digest",
    "verified-boot-state": "ro.boot.verifiedbootstate",
};
const fastbootVariables = {
    "battery-soc-ok": "battery-soc-ok",
    "bootloader-version": "version-bootloader",
    "current-slot": "current-slot",
    "hardware-revision": "hw-revision",
    "is-userspace": "is-userspace",
    "max-download-size": "max-download-size",
    product: "product",
    secure: "secure",
    "slot-count": "slot-count",
    "snapshot-status": "snapshot-update-status",
    "super-partition-name": "super-partition-name",
    unlocked: "unlocked",
    variant: "variant",
};
function identityOf(device, backendSerial) {
    const result = {
        vendorId: device.vendorId,
        productId: device.productId,
    };
    if (device.serialNumber !== null && device.serialNumber.length > 0) {
        result.serial = device.serialNumber;
    }
    else if (backendSerial !== undefined && backendSerial.length > 0) {
        result.serial = backendSerial;
    }
    return result;
}
function requireStableSerial(identity, transport) {
    if (identity.serial === undefined || identity.serial.length === 0) {
        throw fail("safety-refusal", `${transport} connection requires a stable device serial`);
    }
    return identity.serial;
}
function sameIdentity(left, right) {
    return (left.serial === right.serial &&
        left.vendorId === right.vendorId &&
        left.productId === right.productId);
}
function checkFactSize(value, maxBytes, transport) {
    if (value !== null && encoder$1.encode(value).byteLength > maxBytes) {
        throw fail("safety-refusal", `${transport} fact exceeds the remaining output budget`);
    }
    return value;
}
class TangoAdbProbeAdapter {
    kind = "adb";
    #manager;
    #backends = [];
    #adb;
    #closed = false;
    constructor() {
        const manager = AdbDaemonWebUsbDeviceManager.BROWSER;
        if (manager === undefined) {
            throw fail("safety-refusal", "WebUSB is unavailable");
        }
        if (typeof globalThis.indexedDB === "undefined" ||
            globalThis.crypto?.subtle === undefined) {
            throw fail("safety-refusal", "browser credential storage is unavailable");
        }
        this.#manager = manager;
    }
    async listDevices() {
        if (this.#closed) {
            throw fail("usage", "ADB adapter is closed");
        }
        this.#backends = await this.#manager.getDevices();
        if (this.#backends.length === 0) {
            const selected = await this.#manager.requestDevice();
            if (selected !== undefined) {
                this.#backends = [selected];
            }
        }
        return this.#backends.map((backend) => identityOf(backend.raw, backend.serial));
    }
    async connect(identity) {
        const selectedSerial = requireStableSerial(identity, "ADB");
        const backend = this.#backends.find((candidate) => sameIdentity(identityOf(candidate.raw, candidate.serial), identity));
        if (backend === undefined) {
            throw fail("device-missing", "selected ADB device disconnected");
        }
        if (requireStableSerial(identityOf(backend.raw, backend.serial), "ADB") !==
            selectedSerial) {
            throw fail("safety-refusal", "ADB selected a different device");
        }
        const connection = await backend.connect();
        const transport = await AdbDaemonTransport.authenticate({
            serial: backend.serial,
            connection,
            credentialStore: new AdbWebCredentialStore("Mura Flash"),
        });
        this.#adb = new Adb(transport);
        const connected = identityOf(backend.raw, backend.serial);
        if (requireStableSerial(connected, "ADB") !== selectedSerial) {
            await this.close();
            throw fail("safety-refusal", "ADB connected a different device");
        }
        return connected;
    }
    async readFact(fact, signal, maxBytes) {
        signal.throwIfAborted();
        const property = adbProperties[fact];
        if (property === undefined) {
            throw fail("safety-refusal", `ADB fact ${JSON.stringify(fact)} is denied`);
        }
        if (this.#adb === undefined) {
            throw fail("device-missing", "ADB device is not connected");
        }
        // Tango exposes a fixed single-property operation, not a byte-limited
        // stream. Check abort and encoded size around that bounded response.
        const value = await this.#adb.getProp(property);
        signal.throwIfAborted();
        if (this.#closed) {
            throw fail("probe-failed", "ADB adapter closed during probe");
        }
        return checkFactSize(value.length === 0 ? null : value, maxBytes, "ADB");
    }
    async close() {
        this.#closed = true;
        const adb = this.#adb;
        this.#adb = undefined;
        if (adb !== undefined) {
            await adb.close();
        }
    }
}
class GrapheneFastbootProbeAdapter {
    kind = "fastboot";
    #device = new FastbootDevice();
    #devices = [];
    #closed = false;
    async listDevices() {
        if (this.#closed) {
            throw fail("usage", "fastboot adapter is closed");
        }
        if (globalThis.navigator?.usb === undefined) {
            throw fail("safety-refusal", "WebUSB is unavailable");
        }
        this.#devices = (await globalThis.navigator.usb.getDevices()).filter((device) => device.configurations.some((configuration) => configuration.interfaces.some((interface_) => interface_.alternates.some((alternate) => alternate.interfaceClass === fastbootFilter.classCode &&
            alternate.interfaceSubclass === fastbootFilter.subclassCode &&
            alternate.interfaceProtocol === fastbootFilter.protocolCode))));
        if (this.#devices.length === 0) {
            try {
                this.#devices = [
                    await globalThis.navigator.usb.requestDevice({
                        filters: [fastbootFilter],
                    }),
                ];
            }
            catch (error) {
                if (error instanceof DOMException && error.name === "NotFoundError") {
                    return [];
                }
                throw error;
            }
        }
        return this.#devices.map((device) => identityOf(device));
    }
    async connect(identity) {
        const selectedSerial = requireStableSerial(identity, "fastboot");
        if (!this.#devices.some((device) => sameIdentity(identityOf(device), identity))) {
            throw fail("device-missing", "selected fastboot device disconnected");
        }
        await this.#device.connect();
        if (this.#device.device === null) {
            throw fail("device-missing", "fastboot connection did not select a device");
        }
        const connected = identityOf(this.#device.device);
        if (requireStableSerial(connected, "fastboot") !== selectedSerial) {
            await this.close();
            throw fail("safety-refusal", "fastboot connected a different device");
        }
        return connected;
    }
    async readFact(fact, signal, maxBytes) {
        signal.throwIfAborted();
        if (this.#closed) {
            throw fail("probe-failed", "fastboot adapter is closed");
        }
        const variable = fastbootVariables[fact];
        if (variable === undefined) {
            throw fail("safety-refusal", `fastboot fact ${JSON.stringify(fact)} is denied`);
        }
        // The pinned API exposes one fixed getvar response and no abortable or
        // byte-limited stream. Closing on timeout plus these pre/post checks
        // prevents a late response from being used by the session.
        const value = await this.#device.getVariable(variable);
        signal.throwIfAborted();
        if (this.#closed) {
            throw fail("probe-failed", "fastboot adapter closed during probe");
        }
        return checkFactSize(value, maxBytes, "fastboot");
    }
    async close() {
        this.#closed = true;
        const device = this.#device.device;
        if (device?.opened === true) {
            await device.close();
        }
    }
}

const encoder = new TextEncoder();
function stableSerial(identity) {
    if (identity.serial === undefined || identity.serial.length === 0) {
        throw fail("safety-refusal", "device continuity requires a stable serial");
    }
    return identity.serial;
}
async function withTimeout(operation, seconds, detail, close) {
    const controller = new AbortController();
    let timer;
    const timeout = new Promise((_resolve, reject) => {
        timer = setTimeout(() => {
            controller.abort();
            void close().catch(() => undefined);
            reject(fail("probe-timeout", detail));
        }, seconds * 1000);
    });
    try {
        return await Promise.race([operation(controller.signal), timeout]);
    }
    finally {
        if (timer !== undefined) {
            clearTimeout(timer);
        }
    }
}
function nativeFactory(kind) {
    return kind === "adb"
        ? () => new TangoAdbProbeAdapter()
        : () => new GrapheneFastbootProbeAdapter();
}
class BrowserSession {
    #catalog;
    #factories;
    #now;
    #redactFacts = new Set();
    #adapter;
    #boundSerial;
    #closed = false;
    #transcript = [];
    constructor(options = {}) {
        this.#catalog = options.catalog ?? loadCatalog();
        this.#factories = {
            adb: options.transports?.adb ??
                options.createAdbTransport ??
                nativeFactory("adb"),
            fastboot: options.transports?.fastboot ??
                options.createFastbootTransport ??
                nativeFactory("fastboot"),
        };
        this.#now = options.now ?? (() => new Date());
    }
    get transcript() {
        return Object.freeze(redactTranscript(this.#transcript, [...this.#redactFacts]).map((entry) => Object.freeze(entry)));
    }
    async inspect(target, options = {}) {
        if (this.#closed) {
            throw fail("usage", "browser session is closed");
        }
        const recipe = typeof target === "string"
            ? getTarget(target, this.#catalog)
            : validateRecipe(target);
        if (!recipe.frontends.includes("webusb")) {
            throw fail("safety-refusal", `target ${JSON.stringify(recipe.id)} does not enable the WebUSB frontend`);
        }
        for (const fact of recipe.redactFacts) {
            this.#redactFacts.add(fact);
        }
        const probeTransports = new Set();
        for (const probeId of recipe.probes) {
            const probe = probesById.get(probeId);
            if (probe !== undefined) {
                probeTransports.add(probe.transport);
            }
        }
        let transport = options.transport;
        if (transport === undefined) {
            if (probeTransports.size !== 1) {
                throw fail("usage", "transport is required when a recipe spans ADB and fastboot");
            }
            transport = [...probeTransports][0];
        }
        if (transport === undefined || !probeTransports.has(transport)) {
            throw fail("usage", `recipe has no ${transport ?? "selected"} probes`);
        }
        await this.#closeAdapter();
        const adapter = await this.#factories[transport]();
        if (adapter.kind !== transport) {
            throw fail("safety-refusal", "transport factory returned the wrong kind");
        }
        this.#adapter = adapter;
        try {
            const devices = await withTimeout(() => adapter.listDevices(), contract.limits.reconnectTimeoutSeconds, `${transport} device discovery timed out`, () => this.#closeAdapter());
            if (devices.length === 0) {
                throw fail("device-missing", `no ${transport} device is connected`);
            }
            if (devices.length > contract.limits.maxDevices) {
                throw fail("device-ambiguous", `expected one ${transport} device, found ${devices.length}`);
            }
            const selected = devices[0];
            if (selected === undefined) {
                throw fail("device-missing", `no ${transport} device is connected`);
            }
            const selectedSerial = stableSerial(selected);
            if (this.#boundSerial !== undefined &&
                this.#boundSerial !== selectedSerial) {
                throw fail("safety-refusal", "reconnected device does not match the original unit");
            }
            const connected = await withTimeout(() => adapter.connect(selected), contract.limits.reconnectTimeoutSeconds, `${transport} connection timed out`, () => this.#closeAdapter());
            const connectedSerial = stableSerial(connected);
            if (selectedSerial !== connectedSerial) {
                throw fail("safety-refusal", "connected device does not match the selected unit");
            }
            if (this.#boundSerial !== undefined &&
                this.#boundSerial !== connectedSerial) {
                throw fail("safety-refusal", "connected device does not match the original unit");
            }
            this.#boundSerial = connectedSerial;
            const facts = {};
            const start = this.#transcript.length;
            let outputBytes = 0;
            for (const probeId of recipe.probes) {
                const probe = probesById.get(probeId);
                if (probe === undefined || probe.transport !== transport) {
                    continue;
                }
                try {
                    const remainingBytes = contract.limits.maxOutputBytes - outputBytes;
                    if (remainingBytes <= 0) {
                        throw fail("safety-refusal", `probe output reached ${contract.limits.maxOutputBytes} bytes`);
                    }
                    const value = await withTimeout((signal) => adapter.readFact(probe.fact, signal, remainingBytes), contract.limits.probeTimeoutSeconds, `probe ${probe.id} timed out`, () => this.#closeAdapter());
                    outputBytes += value === null ? 0 : encoder.encode(value).byteLength;
                    if (outputBytes > contract.limits.maxOutputBytes) {
                        throw fail("safety-refusal", `probe output exceeds ${contract.limits.maxOutputBytes} bytes`);
                    }
                    const sensitive = probe.sensitive === true || recipe.redactFacts.includes(probe.fact);
                    facts[probe.fact] =
                        sensitive && value !== null ? "[REDACTED]" : value;
                    this.#transcript.push({
                        at: this.#now().toISOString(),
                        transport,
                        probeId: probe.id,
                        fact: probe.fact,
                        status: "ok",
                        value,
                    });
                }
                catch (error) {
                    const stableError = error instanceof MuraFlashError
                        ? error
                        : fail("probe-failed", `probe ${probe.id} failed`, error);
                    this.#transcript.push({
                        at: this.#now().toISOString(),
                        transport,
                        probeId: probe.id,
                        fact: probe.fact,
                        status: "error",
                        error: stableError.message,
                    });
                    throw stableError;
                }
            }
            const reportTranscript = redactTranscript(this.#transcript.slice(start), recipe.redactFacts);
            return Object.freeze({
                targetId: recipe.id,
                transport,
                facts: Object.freeze(facts),
                transcript: Object.freeze(reportTranscript.map((entry) => Object.freeze(entry))),
            });
        }
        finally {
            await this.#closeAdapter();
        }
    }
    async close() {
        if (!this.#closed) {
            this.#closed = true;
            await this.#closeAdapter();
        }
    }
    async #closeAdapter() {
        const adapter = this.#adapter;
        this.#adapter = undefined;
        if (adapter !== undefined) {
            await adapter.close();
        }
    }
}
function createBrowserSession(options = {}) {
    return new BrowserSession(options);
}

export { createBrowserSession, getTarget, loadCatalog, redactTranscript, validateRecipe };
//# sourceMappingURL=mura-flash.mjs.map
