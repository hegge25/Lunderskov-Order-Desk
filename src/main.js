import './styles.css';
import { renderOrders } from './views/orders.js';
import { renderOrder } from './views/order.js';
import { renderWeb } from './views/web.js';
import { maybeStartTour, startTour } from './views/tour.js';

const app = document.getElementById('app');
let cleanup = () => {};

function route() {
  cleanup();
  const hash = location.hash || '#/orders';
  const m = hash.match(/^#\/order\/(.+)$/);
  const web = hash.startsWith('#/web');
  document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('on', !m && a.getAttribute('href') === (web ? '#/web' : '#/orders')));
  app.className = m || web ? 'app-order' : 'app-list';
  document.body.classList.toggle('is-web', web);
  if (web) cleanup = renderWeb(app);
  else cleanup = m ? renderOrder(app, decodeURIComponent(m[1])) : renderOrders(app);
}
window.addEventListener('hashchange', route);
route();
document.querySelector('[data-tour]').addEventListener('click', () => startTour());
// Data note under the top bar: what comes from the case and report, and what is assumed.
const note = document.querySelector('[data-note]');
const detail = note.querySelector('.dn-detail');
document.querySelectorAll('[data-note-toggle]').forEach((b) => b.addEventListener('click', () => {
  detail.hidden = !detail.hidden;
  note.classList.toggle('open', !detail.hidden);
  note.querySelector('.dn-more').setAttribute('aria-expanded', String(!detail.hidden));
  note.querySelector('.dn-more').textContent = detail.hidden ? 'What comes from where' : 'Hide';
}));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !detail.hidden) note.querySelector('.dn-more').click(); });
maybeStartTour();
