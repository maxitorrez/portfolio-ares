import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderPage } from '../src/pagina.js';
import { contenido } from '../src/contenido/index.js';

const SECCIONES = ['inicio', 'sobre-mi', 'experiencia', 'formacion', 'skills', 'stack', 'proyectos', 'personales', 'contacto'];

for (const lang of ['es', 'en']) {
  const html = renderPage(contenido, lang);

  test(`PF-05 [${lang}] tiene las nueve secciones en orden`, () => {
    let last = -1;
    for (const id of SECCIONES) {
      const i = html.indexOf(`id="${id}"`);
      assert.ok(i > last, `falta o está fuera de orden: ${id}`);
      last = i;
    }
  });

  test(`PF-05b [${lang}] SEO: lang, título, descripción, canonical, hreflang y JSON-LD`, () => {
    assert.match(html, new RegExp(`<html lang="${lang}">`));
    assert.match(html, /<title>[^<]{10,}<\/title>/);
    assert.match(html, /<meta name="description" content="[^"]{50,}">/);
    assert.match(html, /<link rel="canonical" href="https:\/\/maxitorrez\.github\.io\//);
    assert.match(html, /hreflang="es"/);
    assert.match(html, /hreflang="en"/);
    const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert.ok(ld, 'falta JSON-LD');
    assert.equal(JSON.parse(ld[1])['@type'], 'Person');
  });

  test(`PF-05c [${lang}] accesibilidad básica: un h1, imágenes con alt, salto al contenido`, () => {
    assert.equal((html.match(/<h1[\s>]/g) || []).length, 1);
    for (const img of html.match(/<img[^>]*>/g) || []) assert.match(img, /alt="/, img);
    assert.match(html, /class="skip"/);
    assert.match(html, /<main id="contenido"/);
  });

  test(`PF-11 [${lang}] temática Ares: la mascota encabeza el inicio y se usa Cinzel`, () => {
    const hero = html.slice(html.indexOf('id="inicio"'), html.indexOf('id="sobre-mi"'));
    assert.match(hero, /<img[^>]*class="mascot"[^>]*src="(\.\.\/)?assets\/ares\.svg"[^>]*alt="[^"]+"/);
    assert.match(html, /family=Cinzel/);
  });

  test(`PF-13 [${lang}] carga motion antes que reveal.js, ambos diferidos y con la ruta del idioma`, () => {
    const base = lang === 'es' ? '' : '\\.\\./';
    const m = html.search(new RegExp(`<script src="${base}vendor/motion\\.js" defer></script>`));
    const r = html.search(new RegExp(`<script src="${base}reveal\\.js" defer></script>`));
    assert.ok(m > -1, 'falta vendor/motion.js');
    assert.ok(r > m, 'reveal.js debe ir después de motion.js');
  });

  test(`PF-15 [${lang}] la página tiene la barra de progreso de lectura, oculta a lectores de pantalla`, () => {
    assert.match(html, /<div class="progress" aria-hidden="true"><\/div>/);
  });

  test(`PF-05d [${lang}] no se filtran valores vacíos`, () => {
    assert.doesNotMatch(html, /undefined|null|\[object Object\]/);
  });
}

test('PF-07 honestidad: no aparecen tecnologías sin confirmar', () => {
  const html = renderPage(contenido, 'es');
  const stack = html.slice(html.indexOf('id="stack"'), html.indexOf('id="proyectos"'));
  for (const g of contenido.stack) for (const t of g.items) {
    if (!t.confirmed) assert.doesNotMatch(stack, new RegExp(`>${t.name.replace(/[.+]/g, '\\$&')}<`), t.name);
  }
});

test('PF-20 stack: todas confirmadas; niveles declarados por el titular (2026-11-25)', () => {
  const nivel = Object.fromEntries(contenido.stack.flatMap((g) => g.items.map((t) => [t.name, t.level])));
  for (const g of contenido.stack) for (const t of g.items) assert.ok(t.confirmed, `${t.name} sin confirmar`);
  for (const n of ['.NET', 'SQL', 'Node.js', 'JavaScript', 'C#']) assert.equal(nivel[n], 'intermedio', n);
  for (const n of ['Java', 'HTML', 'CSS', 'TypeScript', 'Python', 'PHP', 'React', 'Bootstrap', 'MySQL', 'PostgreSQL', 'SQLite', 'Git', 'Docker']) assert.equal(nivel[n], 'junior', n);
  for (const n of ['APIs REST', 'JSON', 'XML', 'OAuth 2.0', 'Postman', 'Magento / Adobe Commerce', 'Jira', 'Figma', 'Magento Admin']) assert.equal(nivel[n], 'intermedio', n);
});

test('PF-22 formación sin ORT; Liderazgo emitido por Udemy', () => {
  assert.ok(!contenido.formacion.some((e) => e.institution === 'ORT'), 'ORT sigue en formación');
  assert.equal(contenido.formacion.find((e) => /Liderazgo/.test(e.title.es)).institution, 'Udemy');
});

test('PF-23 los casos laborales indican que son en Movistar', () => {
  for (const p of contenido.proyectos) for (const l of ['es', 'en']) assert.match(p.category[l], /^Movistar SA · /, `${p.id} ${l}`);
});

test('PF-24 tipografía de lectura: Commissioner en lugar de Inter', () => {
  const html = renderPage(contenido, 'es');
  assert.match(html, /family=Commissioner:wght@400;500;600/);
  assert.doesNotMatch(html, /family=Inter/);
});

test('PF-21 proyectos nuevos con captura; la página en inglés la resuelve desde la raíz', () => {
  const ids = contenido.personales.map((p) => p.id);
  for (const id of ['hades', 'margen360', 'afinados']) {
    assert.ok(ids.includes(id), `falta el proyecto ${id}`);
    assert.ok(contenido.personales.find((p) => p.id === id).screenshot, `${id} sin captura`);
  }
  assert.match(renderPage(contenido, 'en'), /<img src="\.\.\/assets\/capturas\/hades\.jpg"/);
});

test('PF-08 confidencialidad: el contenido no contiene URLs internas ni credenciales', () => {
  const texto = JSON.stringify(contenido);
  assert.doesNotMatch(texto, /(api[_-]?key|password|token|secret|localhost|192\.168|\.internal)/i);
});

test('PF-09 los proyectos laborales no muestran métricas inventadas', () => {
  for (const p of contenido.proyectos) {
    assert.doesNotMatch(`${p.result.es} ${p.result.en}`, /\d+\s?%/, p.id);
  }
});
