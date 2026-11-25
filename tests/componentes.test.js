import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esc, chips, stackGroup, projectCard, contactLinks, educationItem, statusBadge } from '../src/componentes.js';

// PF-01 — todo texto se escapa
test('PF-01 esc escapa los caracteres de HTML', () => {
  assert.equal(esc('<a href="x">&\'</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
  assert.equal(esc(undefined), '');
});

test('PF-01b chips escapa y lista cada elemento', () => {
  const out = chips(['SQL', '<b>']);
  assert.match(out, /SQL/);
  assert.match(out, /&lt;b&gt;/);
  assert.doesNotMatch(out, /<b>/);
});

// PF-02 — stack: solo tecnologías confirmadas y niveles válidos
test('PF-02 stackGroup omite tecnologías no confirmadas', () => {
  const g = { id: 'lang', title: { es: 'Lenguajes', en: 'Languages' }, items: [
    { name: 'SQL', confirmed: true, level: 'intermedio' },
    { name: 'Python', confirmed: false, level: null },
  ] };
  const out = stackGroup(g, 'es');
  assert.match(out, /SQL/);
  assert.doesNotMatch(out, /Python/);
  assert.match(out, /Intermedio/);
});

test('PF-02b stackGroup sin tecnologías confirmadas no se muestra', () => {
  const g = { id: 'devops', title: { es: 'DevOps', en: 'DevOps' }, items: [{ name: 'Docker', confirmed: false }] };
  assert.equal(stackGroup(g, 'es'), '');
});

test('PF-02c nivel desconocido lanza error', () => {
  const g = { id: 'x', title: { es: 'X', en: 'X' }, items: [{ name: 'SQL', confirmed: true, level: 'experto' }] };
  assert.throws(() => stackGroup(g, 'es'), /nivel/i);
});

test('PF-02d tecnología confirmada sin nivel se muestra sin etiqueta de nivel', () => {
  const g = { id: 'x', title: { es: 'X', en: 'X' }, items: [{ name: 'Jira', confirmed: true, level: null }] };
  const out = stackGroup(g, 'en');
  assert.match(out, /Jira/);
  assert.doesNotMatch(out, /class="level/);
});

// PF-03 — proyectos: estado visible y campos completos
const proyecto = {
  id: 'p', name: 'P', status: 'prototipo', kind: 'personal',
  problem: { es: 'Problema', en: 'Problem' }, goal: { es: 'Objetivo', en: 'Goal' },
  solution: { es: 'Solución', en: 'Solution' }, role: { es: 'Rol', en: 'Role' },
  tech: ['Node.js'], flow: { es: ['a', 'b'], en: ['a', 'b'] },
  result: { es: 'Resultado', en: 'Result' },
};

test('PF-03 projectCard muestra los ocho campos y el estado', () => {
  const out = projectCard(proyecto, 'es');
  for (const t of ['Problema', 'Objetivo', 'Solución', 'Rol', 'Node.js', 'Resultado', 'Prototipo']) assert.match(out, new RegExp(t));
  assert.match(out, /<ol[^>]*>\s*<li>a<\/li>\s*<li>b<\/li>/);
});

test('PF-03b projectCard rechaza un proyecto incompleto', () => {
  const { result, ...incompleto } = proyecto;
  assert.throws(() => projectCard(incompleto, 'es'), /result/);
});

test('PF-03c estado desconocido lanza error', () => {
  assert.throws(() => statusBadge('terminado-casi', 'es'), /estado/i);
});

// PF-04 — contacto: solo canales disponibles
test('PF-04 contactLinks omite canales vacíos', () => {
  const out = contactLinks({ github: 'https://github.com/x', linkedin: '', email: '' }, 'es');
  assert.match(out, /github\.com\/x/);
  assert.doesNotMatch(out, /linkedin|mailto/i);
});

test('PF-04b contactLinks usa mailto para el correo', () => {
  const out = contactLinks({ github: '', linkedin: '', email: 'a@b.com' }, 'es');
  assert.match(out, /href="mailto:a@b\.com"/);
});

// PF-06 — formación: no inventa fechas
test('PF-06 educationItem no muestra período si no hay dato', () => {
  const out = educationItem({ title: { es: 'Formación en Sistemas', en: 'Systems' }, institution: 'ORT', period: '' }, 'es');
  assert.match(out, /ORT/);
  assert.doesNotMatch(out, /class="period/);
});

test('PF-06b educationItem acepta un período bilingüe', () => {
  const e = { title: { es: 'A', en: 'A' }, institution: 'UP', period: { es: 'Carrera de 3 años', en: '3-year degree' } };
  assert.match(educationItem(e, 'en'), /<p class="period">3-year degree<\/p>/);
  assert.doesNotMatch(educationItem(e, 'es'), /object/);
});

// PF-19 — formación: nota bilingüe opcional (promedio)
test('PF-19 educationItem muestra la nota cuando existe y la omite si no', () => {
  const e = { title: { es: 'A', en: 'A' }, institution: 'UP', period: '', note: { es: 'Promedio: 8,52', en: 'GPA: 8.52' } };
  assert.match(educationItem(e, 'es'), /<p class="note">Promedio: 8,52<\/p>/);
  assert.match(educationItem(e, 'en'), /<p class="note">GPA: 8\.52<\/p>/);
  assert.doesNotMatch(educationItem({ ...e, note: undefined }, 'es'), /class="note"/);
});

// PF-18 — proyectos: captura de cómo quedó, con texto alternativo bilingüe
test('PF-18 projectCard muestra la captura con alt del idioma, ancho y alto', () => {
  const p = { ...proyecto, screenshot: { src: 'assets/capturas/p.jpg', width: 1280, height: 800, alt: { es: 'Pantalla de P', en: 'P screen' } } };
  const out = projectCard(p, 'en');
  assert.match(out, /<figure class="project-shot"><img src="assets\/capturas\/p\.jpg" alt="P screen" width="1280" height="800" loading="lazy" decoding="async"><\/figure>/);
  assert.doesNotMatch(projectCard(proyecto, 'es'), /project-shot/);
});

test('PF-18b projectCard rechaza una captura sin texto alternativo', () => {
  const p = { ...proyecto, screenshot: { src: 'x.jpg', width: 1, height: 1, alt: { es: '', en: 'x' } } };
  assert.throws(() => projectCard(p, 'es'), /alt/);
});
