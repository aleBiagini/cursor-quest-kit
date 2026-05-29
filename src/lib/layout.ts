function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function h(strings: TemplateStringsArray, ...values: unknown[]): string {
  let out = "";
  strings.forEach((part, i) => {
    out += part;
    if (i < values.length) {
      const v = values[i];
      if (v instanceof SafeString) {
        out += v.value;
      } else if (Array.isArray(v)) {
        out += v.map((item) => (item instanceof SafeString ? item.value : escapeHtml(item))).join("");
      } else {
        out += escapeHtml(v);
      }
    }
  });
  return out;
}

export class SafeString {
  constructor(public value: string) {}
}

export function raw(value: string): SafeString {
  return new SafeString(value);
}

export type LayoutOptions = {
  title: string;
  user?: { display_name: string; role: string } | null;
  body: string;
  flash?: string | null;
};

export function layout({ title, user, body, flash }: LayoutOptions): string {
  const nav = user
    ? h`
        <span class="nav-user">${user.display_name} <span class="badge">${user.role}</span></span>
        <form method="post" action="/logout" class="inline">
          <button type="submit" class="link">Esci</button>
        </form>
      `
    : h`<a href="/login">Accedi</a>`;
  return `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} - Task Floometer</title>
  <link rel="stylesheet" href="/styles.css" />
</head>
<body>
  <header class="topbar">
    <a class="brand" href="/dashboard">Task Floometer</a>
    <nav>${nav}</nav>
  </header>
  ${flash ? `<div class="flash">${escapeHtml(flash)}</div>` : ""}
  <main>${body}</main>
</body>
</html>`;
}
