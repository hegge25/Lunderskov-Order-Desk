import './styles.css';
import { renderOrders } from './views/orders.js';
import { renderOrder } from './views/order.js';

const app = document.getElementById('app');
let cleanup = () => {};

function route() {
  cleanup();
  const hash = location.hash || '#/orders';
  const m = hash.match(/^#\/order\/(.+)$/);
  document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('on', !m && a.getAttribute('href') === '#/orders'));
  app.className = m ? 'app-order' : 'app-list';
  cleanup = m ? renderOrder(app, decodeURIComponent(m[1])) : renderOrders(app);
}
window.addEventListener('hashchange', route);
route();
