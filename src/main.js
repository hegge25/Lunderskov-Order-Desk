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
maybeStartTour();
