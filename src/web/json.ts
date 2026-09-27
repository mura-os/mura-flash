import { fail } from "./errors";

class DuplicateKeyScanner {
  readonly #text: string;
  #offset = 0;

  constructor(text: string) {
    this.#text = text;
  }

  scan(): void {
    this.#skipWhitespace();
    this.#value("$");
    this.#skipWhitespace();
    if (this.#offset !== this.#text.length) {
      throw fail("recipe-invalid", "invalid JSON after root value");
    }
  }

  #value(path: string): void {
    this.#skipWhitespace();
    const token = this.#text[this.#offset];
    if (token === "{") {
      this.#object(path);
    } else if (token === "[") {
      this.#array(path);
    } else if (token === '"') {
      this.#string();
    } else if (token === "t") {
      this.#literal("true");
    } else if (token === "f") {
      this.#literal("false");
    } else if (token === "n") {
      this.#literal("null");
    } else if (token === "-" || (token !== undefined && /[0-9]/u.test(token))) {
      this.#number();
    } else {
      throw fail("recipe-invalid", `invalid JSON value at ${path}`);
    }
  }

  #object(path: string): void {
    this.#offset += 1;
    this.#skipWhitespace();
    const keys = new Set<string>();
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
        throw fail(
          "recipe-invalid",
          `duplicate key ${JSON.stringify(key)} at ${path}`,
        );
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

  #array(path: string): void {
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

  #string(): string {
    const start = this.#offset;
    this.#offset += 1;
    while (this.#offset < this.#text.length) {
      const character = this.#text[this.#offset];
      if (character === '"') {
        this.#offset += 1;
        const token = this.#text.slice(start, this.#offset);
        try {
          return JSON.parse(token) as string;
        } catch (error) {
          throw fail("recipe-invalid", "invalid JSON string", error);
        }
      }
      if (character === "\\") {
        this.#offset += 2;
      } else {
        if (
          character === undefined ||
          character.charCodeAt(0) < 0x20
        ) {
          throw fail("recipe-invalid", "invalid control character in JSON string");
        }
        this.#offset += 1;
      }
    }
    throw fail("recipe-invalid", "unterminated JSON string");
  }

  #number(): void {
    const rest = this.#text.slice(this.#offset);
    const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/u.exec(rest);
    if (match === null) {
      throw fail("recipe-invalid", "invalid JSON number");
    }
    this.#offset += match[0].length;
  }

  #literal(literal: string): void {
    if (!this.#text.startsWith(literal, this.#offset)) {
      throw fail("recipe-invalid", "invalid JSON literal");
    }
    this.#offset += literal.length;
  }

  #skipWhitespace(): void {
    while (
      this.#offset < this.#text.length &&
      /[\t\n\r ]/u.test(this.#text[this.#offset] ?? "")
    ) {
      this.#offset += 1;
    }
  }

  #consume(character: string): boolean {
    if (this.#text[this.#offset] !== character) {
      return false;
    }
    this.#offset += 1;
    return true;
  }

  #expect(character: string): void {
    if (!this.#consume(character)) {
      throw fail("recipe-invalid", `expected ${JSON.stringify(character)} in JSON`);
    }
  }
}

export function parseJsonStrict(text: string): unknown {
  new DuplicateKeyScanner(text).scan();
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw fail("recipe-invalid", "invalid JSON", error);
  }
}
