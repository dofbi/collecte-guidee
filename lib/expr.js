// Petit langage d'expressions partagé par l'app, les tests et le générateur XLSForm.
// Grammaire : nombres, identifiants, + - * / ( ), comparaisons (> >= < <= ==), and / or,
// fonctions sum(a, b, ...) et round(x). Aucune évaluation de code arbitraire.

const TOKEN = /\s*(?:(\d+(?:\.\d+)?)|([a-z_][a-z0-9_]*)|(>=|<=|==|[-+*/(),<>]))/y;

export function tokenize(src) {
  const out = [];
  TOKEN.lastIndex = 0;
  let i = 0;
  while (i < src.length) {
    if (/^\s*$/.test(src.slice(i))) break;
    TOKEN.lastIndex = i;
    const m = TOKEN.exec(src);
    if (!m) throw new Error(`Expression invalide près de « ${src.slice(i)} »`);
    if (m[1] !== undefined) out.push({ t: "num", v: Number(m[1]) });
    else if (m[2] !== undefined) out.push(m[2] === "and" || m[2] === "or" ? { t: "op", v: m[2] } : { t: "id", v: m[2] });
    else out.push({ t: "op", v: m[3] });
    i = TOKEN.lastIndex;
  }
  return out;
}

export function parse(src) {
  const toks = tokenize(src);
  let p = 0;
  const peek = () => toks[p];
  const eat = (v) => {
    const tk = toks[p];
    if (!tk || (v && tk.v !== v)) throw new Error(`Attendu « ${v} » dans « ${src} »`);
    p++;
    return tk;
  };
  const bin = (next, ops) => () => {
    let left = next();
    while (peek() && peek().t === "op" && ops.includes(peek().v)) {
      const op = eat().v;
      left = { k: "bin", op, a: left, b: next() };
    }
    return left;
  };
  const primary = () => {
    const tk = peek();
    if (!tk) throw new Error(`Expression incomplète : « ${src} »`);
    if (tk.t === "num") { p++; return { k: "num", v: tk.v }; }
    if (tk.t === "op" && tk.v === "(") { p++; const e = or(); eat(")"); return e; }
    if (tk.t === "op" && tk.v === "-") { p++; return { k: "neg", a: primary() }; }
    if (tk.t === "id") {
      p++;
      if (peek() && peek().v === "(") {
        p++;
        const args = [];
        if (peek() && peek().v !== ")") {
          args.push(or());
          while (peek() && peek().v === ",") { p++; args.push(or()); }
        }
        eat(")");
        if (!["sum", "round"].includes(tk.v)) throw new Error(`Fonction inconnue : ${tk.v}`);
        return { k: "fn", f: tk.v, args };
      }
      return { k: "var", v: tk.v };
    }
    throw new Error(`Symbole inattendu « ${tk.v} » dans « ${src} »`);
  };
  const mul = bin(primary, ["*", "/"]);
  const add = bin(mul, ["+", "-"]);
  const cmp = bin(add, [">", ">=", "<", "<=", "=="]);
  const and = bin(cmp, ["and"]);
  const or = bin(and, ["or"]);
  const ast = or();
  if (p !== toks.length) throw new Error(`Fin inattendue dans « ${src} »`);
  return ast;
}

export function variables(src) {
  const out = new Set();
  const walk = (n) => {
    if (n.k === "var") out.add(n.v);
    if (n.a) walk(n.a);
    if (n.b) walk(n.b);
    if (n.args) n.args.forEach(walk);
  };
  walk(parse(src));
  return [...out];
}

// Évalue avec des valeurs numériques. Une variable absente vaut NaN (le résultat devient NaN).
export function evaluate(src, vars) {
  const num = (x) => (x === "" || x === null || x === undefined ? NaN : Number(x));
  const ev = (n) => {
    switch (n.k) {
      case "num": return n.v;
      case "var": return num(vars[n.v]);
      case "neg": return -ev(n.a);
      case "fn":
        if (n.f === "sum") return n.args.reduce((s, a) => s + (Number.isNaN(ev(a)) ? 0 : ev(a)), 0);
        return Math.round(ev(n.args[0]));
      case "bin": {
        const a = ev(n.a), b = ev(n.b);
        switch (n.op) {
          case "+": return a + b;
          case "-": return a - b;
          case "*": return a * b;
          case "/": return b === 0 ? NaN : a / b;
          case ">": return a > b;
          case ">=": return a >= b;
          case "<": return a < b;
          case "<=": return a <= b;
          case "==": return a === b;
          case "and": return Boolean(a) && Boolean(b);
          case "or": return Boolean(a) || Boolean(b);
        }
      }
    }
    throw new Error("Nœud d'expression inconnu");
  };
  return ev(parse(src));
}

// Traduit en XPath XLSForm. `nom(id)` renvoie le nom du champ dans le formulaire.
export function toXPath(src, nom) {
  const tx = (n) => {
    switch (n.k) {
      case "num": return String(n.v);
      case "var": return `number(\${${nom(n.v)}})`;
      case "neg": return `-(${tx(n.a)})`;
      case "fn":
        if (n.f === "sum") return `(${n.args.map((a) => (a.k === "var" ? `if(string-length(\${${nom(a.v)}}) = 0, 0, number(\${${nom(a.v)}}))` : tx(a))).join(" + ")})`;
        return `round(${tx(n.args[0])})`;
      case "bin": {
        const op = { "/": "div", "==": "=" }[n.op] || n.op;
        return `(${tx(n.a)} ${op} ${tx(n.b)})`;
      }
    }
    throw new Error("Nœud d'expression inconnu");
  };
  return tx(parse(src));
}
