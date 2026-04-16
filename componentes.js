/* SnapBite — app.js
   Auth, Carrinho, Cookies, Toasts, Modal
   Simula Node.js auth flow no frontend
*/

'use strict';

// ────────────────────────────────────────
// ESTADO GLOBAL
// ────────────────────────────────────────
const App = {
  usuario: JSON.parse(localStorage.getItem('snapbite_user') || 'null'),
  carrinho: JSON.parse(localStorage.getItem('snapbite_cart') || '[]'),
  pendingProduct: null,   // produto aguardando login
  metodoPagamento: null,
  pixChaveAtual: null,    // chave PIX gerada na sessão atual
  codigoResgate: null,    // código de retirada gerado após pagamento
};

// ────────────────────────────────────────
// UTILIDADES
// ────────────────────────────────────────
function formatBRL(valor) {
  return `R$ ${Number(valor).toFixed(2).replace('.', ',')}`;
}

function salvarCarrinho() {
  localStorage.setItem('snapbite_cart', JSON.stringify(App.carrinho));
}

function atualizarBadgeCarrinho() {
  const badges = document.querySelectorAll('.carrinho-badge');
  const total = App.carrinho.reduce((acc, i) => acc + i.qtd, 0);
  badges.forEach(b => {
    b.textContent = total;
    b.style.display = total > 0 ? 'flex' : 'none';
  });
}

// ────────────────────────────────────────
// GERADOR DE CHAVE PIX ALEATÓRIA
// ────────────────────────────────────────
function gerarChavePix() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const seg = (n) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  // Formato: snp-XXXX-XXXX@pix.senai.br
  return `snp-${seg(4)}-${seg(4)}@pix.senai.br`;
}

// ────────────────────────────────────────
// GERADOR DE CÓDIGO DE RETIRADA
// ────────────────────────────────────────
function gerarCodigoResgate() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const seg = (n) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  // Formato: SB-XXXX-XXXX
  return `SB-${seg(4)}-${seg(4)}`;
}

// ────────────────────────────────────────
// COPIAR CHAVE PIX
// ────────────────────────────────────────
function copiarChavePix() {
  if (!App.pixChaveAtual) return;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(App.pixChaveAtual)
      .then(() => showToast('Chave PIX copiada! 📋', 'success'))
      .catch(() => showToast('Não foi possível copiar automaticamente.', 'warning'));
  } else {
    // Fallback para navegadores sem clipboard API
    const el = document.createElement('textarea');
    el.value = App.pixChaveAtual;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    showToast('Chave PIX copiada! 📋', 'success');
  }
}

// ────────────────────────────────────────
// COPIAR CÓDIGO DE RETIRADA
// ────────────────────────────────────────
function copiarCodigoResgate() {
  if (!App.codigoResgate) return;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(App.codigoResgate)
      .then(() => showToast('Código copiado! 🎟️', 'success'))
      .catch(() => showToast('Não foi possível copiar automaticamente.', 'warning'));
  } else {
    const el = document.createElement('textarea');
    el.value = App.codigoResgate;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    showToast('Código copiado! 🎟️', 'success');
  }
}

// ────────────────────────────────────────
// RENDERIZAR QR CODE PIX
// ────────────────────────────────────────
function renderizarQRCodePix(chave) {
  const qrEl = document.getElementById('pix-qrcode');
  if (!qrEl) return;

  qrEl.innerHTML = '';

  // Tenta usar a biblioteca QRCode.js (carregada via components.js)
  if (typeof QRCode !== 'undefined') {
    new QRCode(qrEl, { 
      text: chave,
      width: 160,
      height: 160,
      colorDark: '#1A0F0A',
      colorLight: '#FFF8F0',
      correctLevel: QRCode.CorrectLevel.M,
    });
  } else {
    // Fallback: usa Google Charts API caso QRCode.js ainda não tenha carregado
    const encoded = encodeURIComponent(chave);
    const img = document.createElement('img');
    img.src = `https://chart.googleapis.com/chart?chs=160x160&cht=qr&chl=${encoded}&choe=UTF-8`;
    img.alt = 'QR Code PIX';
    img.style.cssText = 'border-radius:8px;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.12);';
    qrEl.appendChild(img);
  }
}

// ────────────────────────────────────────
// TOASTS
// ────────────────────────────────────────
function showToast(msg, tipo = 'success', duracao = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${tipo}`;
  toast.innerHTML = `<span class="toast-icon">${icons[tipo] || '✅'}</span> ${msg}`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.4s, transform 0.4s';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(60px)';
    setTimeout(() => toast.remove(), 400);
  }, duracao);
}

// ────────────────────────────────────────
// MODAL GENÉRICO
// ────────────────────────────────────────
function openModal(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.add('active'); document.body.style.overflow = 'hidden'; }
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.remove('active'); document.body.style.overflow = ''; }
}

// Fechar ao clicar fora
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
    document.body.style.overflow = '';
  }
});

// ────────────────────────────────────────
// NAVBAR
// ────────────────────────────────────────
function initNavbar() {
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('nav-links');

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
    navLinks.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => navLinks.classList.remove('open'));
    });
  }

  const current = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.navbar-links a').forEach(a => {
    if (a.getAttribute('href') === current) a.classList.add('active');
  });

  atualizarNavAuth();
}

function atualizarNavAuth() {
  const areaLogin = document.getElementById('nav-auth-area');
  if (!areaLogin) return;

  if (App.usuario) {
    areaLogin.innerHTML = `
      <span style="color:#aaa;font-size:0.85rem;font-weight:700;">Olá, <strong style="color:var(--amarelo)">${App.usuario.nome.split(' ')[0]}</strong></span>
      <button onclick="logout()" class="btn-login-nav" style="border-color:var(--vermelho);color:var(--vermelho);">Sair</button>
    `;
  } else {
    areaLogin.innerHTML = `
      <button onclick="openModal('modal-login')" class="btn-login-nav">Entrar</button>
    `;
  }
}

// ────────────────────────────────────────
// AUTENTICAÇÃO
// ────────────────────────────────────────
function mockServerAuth(tipo, dados) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (tipo === 'google') {
        resolve({ nome: 'Estudante Google', email: 'aluno@gmail.com', avatar: '🧑‍🎓', provider: 'google' });
      } else if (tipo === 'facebook') {
        resolve({ nome: 'Estudante Facebook', email: 'aluno@facebook.com', avatar: '📘', provider: 'facebook' });
      } else if (tipo === 'login') {
        if (dados.email && dados.senha.length >= 6) {
          resolve({ nome: 'Aluno SENAI', email: dados.email, avatar: '🎒', provider: 'site' });
        } else {
          reject('Email ou senha inválidos.');
        }
      } else if (tipo === 'cadastro') {
        if (dados.nome && dados.email && dados.senha.length >= 6) {
          resolve({ nome: dados.nome, email: dados.email, avatar: '🎒', provider: 'site' });
        } else {
          reject('Preencha todos os campos corretamente.');
        }
      }
    }, 800);
  });
}

async function fazerLogin(tipo, dados = {}) {
  showToast('Conectando...', 'info', 1500);

  try {
    const user = await mockServerAuth(tipo, dados);
    App.usuario = user;
    localStorage.setItem('snapbite_user', JSON.stringify(user));
    closeModal('modal-login');
    atualizarNavAuth();
    showToast(`Bem-vindo(a), ${user.nome.split(' ')[0]}! 🎉`, 'success');

    if (App.pendingProduct) {
      adicionarAoCarrinho(App.pendingProduct);
      App.pendingProduct = null;
    }
  } catch (erro) {
    showToast(erro || 'Erro ao fazer login. Tente novamente.', 'error');
  }
}

function logout() {
  App.usuario = null;
  localStorage.removeItem('snapbite_user');
  atualizarNavAuth();
  showToast('Você saiu da conta.', 'info');
}

function initAuthForms() {
  document.querySelectorAll('.modal-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab)?.classList.add('active');
    });
  });

  document.getElementById('form-login')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const senha = document.getElementById('login-senha').value;
    const aceitouTermos = document.getElementById('login-termos')?.checked;

    if (!aceitouTermos) {
      showToast('campos obrigatórios', 'warning', 2800);
      return;
    }

    await fazerLogin('login', { email, senha });
  });

  document.getElementById('form-cadastro')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('cad-nome').value;
    const email = document.getElementById('cad-email').value;
    const senha = document.getElementById('cad-senha').value;
    const aceitouTermos = document.getElementById('cad-termos')?.checked;

    if (!aceitouTermos) {
      showToast('campos obrigatórios', 'warning', 2800);
      return;
    }

    await fazerLogin('cadastro', { nome, email, senha });
  });

  document.getElementById('btn-google')?.addEventListener('click', () => fazerLogin('google'));
  document.getElementById('btn-facebook')?.addEventListener('click', () => fazerLogin('facebook'));

  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      closeModal(btn.dataset.modal || 'modal-login');
    });
  });
}

// ────────────────────────────────────────
// CARRINHO
// ────────────────────────────────────────
function adicionarAoCarrinho(produto) {
  if (!App.usuario) {
    App.pendingProduct = produto;
    showToast('⚠️ Você precisa fazer login para comprar!', 'warning', 4000);
    openModal('modal-login');
    return;
  }

  const existente = App.carrinho.find(i => i.id === produto.id);
  if (existente) {
    existente.qtd += 1;
  } else {
    App.carrinho.push({ ...produto, qtd: 1 });
  }

  salvarCarrinho();
  atualizarBadgeCarrinho();
  showToast(`${produto.nome} adicionado ao carrinho! 🛒`, 'success');
}

function removerDoCarrinho(id) {
  App.carrinho = App.carrinho.filter(i => i.id !== id);
  salvarCarrinho();
  renderizarCarrinho();
  atualizarBadgeCarrinho();
}

function alterarQtd(id, delta) {
  const item = App.carrinho.find(i => i.id === id);
  if (!item) return;
  item.qtd += delta;
  if (item.qtd <= 0) {
    removerDoCarrinho(id);
  } else {
    salvarCarrinho();
    renderizarCarrinho();
    atualizarBadgeCarrinho();
  }
}

function calcularTotais() {
  const subtotal = App.carrinho.reduce((acc, i) => acc + (i.preco * i.qtd), 0);
  const taxa = 0;
  return { subtotal, taxa, total: subtotal + taxa };
}

function renderizarCarrinho() {
  const lista = document.getElementById('carrinho-lista');
  const subtotalEl = document.getElementById('resumo-subtotal');
  const totalEl = document.getElementById('resumo-total');
  const qtdEl = document.getElementById('resumo-qtd');

  if (!lista) return;

  if (App.carrinho.length === 0) {
    lista.innerHTML = `
      <div class="vazio">
        <div class="vazio-emoji">🛒</div>
        <h3>Carrinho vazio</h3>
        <p>Adicione seus lanches favoritos!</p>
        <a href="cardapio.html" class="btn-primary" style="margin-top:20px;display:inline-flex">Ver Cardápio</a>
      </div>
    `;
  } else {
    lista.innerHTML = App.carrinho.map(item => `
      <div class="c-item" data-id="${item.id}">
        <div class="c-emoji">${item.emoji}</div>
        <div class="c-info">
          <div class="c-nome">${item.nome}</div>
          <div class="c-desc">${item.desc || ''}</div>
        </div>
        <div class="c-qtd">
          <button class="qtd-b" onclick="alterarQtd('${item.id}', -1)">−</button>
          <span class="qtd-n">${item.qtd}</span>
          <button class="qtd-b" onclick="alterarQtd('${item.id}', 1)">+</button>
        </div>
        <div class="c-preco">${formatBRL(item.preco * item.qtd)}</div>
        <button class="c-rm" onclick="removerDoCarrinho('${item.id}')" title="Remover">✕</button>
      </div>
    `).join('');
  }

  const { subtotal, total } = calcularTotais();
  const qtd = App.carrinho.reduce((a, i) => a + i.qtd, 0);

  if (subtotalEl) subtotalEl.textContent = formatBRL(subtotal);
  if (totalEl) totalEl.textContent = formatBRL(total);
  if (qtdEl) qtdEl.textContent = `${qtd} ${qtd === 1 ? 'item' : 'itens'}`;
}

function finalizarPedido() {
  if (!App.usuario) {
    showToast('⚠️ Você precisa fazer login!', 'warning');
    openModal('modal-login');
    return;
  }
  if (App.carrinho.length === 0) {
    showToast('Seu carrinho está vazio!', 'error');
    return;
  }

  const pillEl = document.getElementById('pag-total-pill');
  if (pillEl) {
    const { total } = calcularTotais();
    pillEl.textContent = 'Total: ' + formatBRL(total);
  }

  // Reset estado do modal de pagamento
  document.querySelectorAll('.metodo-btn').forEach(b => b.classList.remove('ativo'));
  document.querySelectorAll('.pag-extra').forEach(el => el.style.display = 'none');
  const btnConf = document.getElementById('btn-confirmar-pag');
  if (btnConf) { btnConf.disabled = true; btnConf.textContent = 'Confirmar pagamento'; }

  // Reset PIX
  App.metodoPagamento = null;
  App.pixChaveAtual = null;
  const chaveEl = document.getElementById('pix-chave');
  const qrEl = document.getElementById('pix-qrcode');
  if (chaveEl) chaveEl.textContent = '—';
  if (qrEl) qrEl.innerHTML = '<div style="font-size:0.8rem;color:var(--cinza-q)">Gerando QR Code...</div>';

  openModal('modal-pagamento');
}

// ────────────────────────────────────────
// PAGAMENTO
// ────────────────────────────────────────
function selecionarPagamento(btn) {
  document.querySelectorAll('.metodo-btn').forEach(b => b.classList.remove('ativo'));
  document.querySelectorAll('.pag-extra').forEach(el => el.style.display = 'none');

  btn.classList.add('ativo');
  const metodo = btn.dataset.metodo;
  App.metodoPagamento = metodo;

  if (metodo === 'cartao') {
    const el = document.getElementById('form-cartao');
    if (el) el.style.display = 'block';

  } else if (metodo === 'pix') {
    // Gera chave aleatória e renderiza QR Code
    const chave = gerarChavePix();
    App.pixChaveAtual = chave;

    const chaveEl = document.getElementById('pix-chave');
    if (chaveEl) chaveEl.textContent = chave;

    renderizarQRCodePix(chave);

    const el = document.getElementById('info-pix');
    if (el) el.style.display = 'block';

  } else if (metodo === 'paypal') {
    document.getElementById('wallet-emoji').textContent = '🅿️';
    document.getElementById('wallet-msg').textContent = 'Você será direcionado ao PayPal na retirada. Tenha sua conta pronta!';
    const el = document.getElementById('info-wallet');
    if (el) el.style.display = 'block';

  } else if (metodo === 'picpay') {
    document.getElementById('wallet-emoji').textContent = '🟢';
    document.getElementById('wallet-msg').textContent = 'Pague via PicPay na retirada usando o QR Code que será exibido no balcão.';
    const el = document.getElementById('info-wallet');
    if (el) el.style.display = 'block';
  }

  const btnConf = document.getElementById('btn-confirmar-pag');
  if (btnConf) btnConf.disabled = false;
}

async function confirmarPagamento() {
  if (!App.metodoPagamento) return;

  const btn = document.getElementById('btn-confirmar-pag');
  if (btn) { btn.disabled = true; btn.textContent = 'Processando...'; }

  await new Promise(r => setTimeout(r, 1200));

  // Gera código de retirada único
  const codigo = gerarCodigoResgate();
  App.codigoResgate = codigo;

  // Atualiza o modal de sucesso com o código
  const codigoEl = document.getElementById('codigo-resgate');
  if (codigoEl) codigoEl.textContent = codigo;

  // Limpa carrinho
  App.carrinho = [];
  salvarCarrinho();
  atualizarBadgeCarrinho();
  renderizarCarrinho();

  closeModal('modal-pagamento');
  setTimeout(() => openModal('modal-sucesso'), 250);

  if (btn) { btn.disabled = false; btn.textContent = 'Confirmar pagamento'; }
}

// ────────────────────────────────────────
// COOKIES
// ────────────────────────────────────────
function initCookieBanner() {
  const banner = document.getElementById('cookie-banner');
  if (!banner) return;

  const aceito = localStorage.getItem('snapbite_cookies');
  if (aceito) {
    banner.classList.add('hidden');
    return;
  }

  document.getElementById('btn-aceitar-cookies')?.addEventListener('click', () => {
    localStorage.setItem('snapbite_cookies', 'aceito');
    banner.classList.add('hidden');
    showToast('Cookies aceitos! Obrigado 🍪', 'success', 2500);
  });

  document.getElementById('btn-recusar-cookies')?.addEventListener('click', () => {
    showToast('Você precisa aceitar os termos para continuar.', 'warning', 3200);
  });
}

// ────────────────────────────────────────
// COUNTDOWN DE PROMOÇÕES
// ────────────────────────────────────────
function initCountdown() {
  const el = document.getElementById('promo-countdown');
  if (!el) return;

  const target = new Date();
  target.setHours(target.getHours() + 6, 30, 0, 0);

  function atualizar() {
    const agora = new Date();
    const diff = Math.max(0, target - agora);

    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    const pad = n => String(n).padStart(2, '0');

    const hEl = document.getElementById('cd-horas');
    const mEl = document.getElementById('cd-min');
    const sEl = document.getElementById('cd-seg');

    if (hEl) hEl.textContent = pad(h);
    if (mEl) mEl.textContent = pad(m);
    if (sEl) sEl.textContent = pad(s);
  }

  atualizar();
  setInterval(atualizar, 1000);
}

// ────────────────────────────────────────
// FILTROS DO CARDÁPIO
// ────────────────────────────────────────
function initFiltros() {
  const btns = document.querySelectorAll('.filtro-btn');
  const cards = document.querySelectorAll('.produto-card');

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filtro = btn.dataset.filtro;

      cards.forEach(card => {
        if (filtro === 'todos' || card.dataset.categoria === filtro) {
          card.style.display = '';
          card.style.animation = 'fadeInCard 0.3s ease';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  const buscaInput = document.getElementById('busca-cardapio');
  if (buscaInput) {
    buscaInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      cards.forEach(card => {
        const nome = card.querySelector('.produto-nome')?.textContent.toLowerCase() || '';
        card.style.display = nome.includes(q) ? '' : 'none';
      });
    });
  }
}

// ────────────────────────────────────────
// FORMULÁRIO DE CONTATO
// ────────────────────────────────────────
function initContato() {
  const form = document.getElementById('form-contato');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    showToast('Mensagem enviada com sucesso! Em breve retornaremos. 📬', 'success', 4000);
    form.reset();
  });
}

// ────────────────────────────────────────
// INIT GERAL
// ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initAuthForms();
  initCookieBanner();
  initCountdown();
  initFiltros();
  initContato();
  atualizarBadgeCarrinho();

  if (document.getElementById('carrinho-lista')) {
    renderizarCarrinho();
  }
});

// Expor funções globais necessárias para onclick inline
window.adicionarAoCarrinho = adicionarAoCarrinho;
window.removerDoCarrinho = removerDoCarrinho;
window.alterarQtd = alterarQtd;
window.finalizarPedido = finalizarPedido;
window.selecionarPagamento = selecionarPagamento;
window.confirmarPagamento = confirmarPagamento;
window.openModal = openModal;
window.closeModal = closeModal;
window.logout = logout;
window.showToast = showToast;
window.copiarChavePix = copiarChavePix;
window.copiarCodigoResgate = copiarCodigoResgate;
