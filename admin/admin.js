import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const SUPABASE_URL     = 'https://jkasolurdoqvdhukxzgm.supabase.co';
const SUPABASE_ANON_KEY= 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const path = window.location.pathname;
const isLogin = path.endsWith('/admin/index.html');

// 1️⃣ Préremplir l’email si déjà saisi
document.addEventListener('DOMContentLoaded', () => {
  const stored = localStorage.getItem('admin_email');
  if (stored && isLogin) {
    document.getElementById('email').value = stored;
  }
});

// 2️⃣ LOGIN
if (isLogin) {
  document.getElementById('login-form')
    .addEventListener('submit', async e => {
      e.preventDefault();
      const emailEl = document.getElementById('email');
      const pwdEl   = document.getElementById('password');
      const email   = emailEl.value;
      const pass    = pwdEl.value;

      localStorage.setItem('admin_email', email);
      const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) {
        document.getElementById('error-msg').textContent = error.message;
      } else {
        // redirection vers dashboard
        window.location.href = 'dashboard.html';
      }
    });
}

// 3️⃣ DASHBOARD
if (!isLogin) {
  // 3.1 Sign-out
  document.getElementById('logout')
    .addEventListener('click', () =>
      supabase.auth.signOut().then(() => window.location.href = 'index.html')
    );

  // 3.2 Liste des pages
  const pages = [
    { slug: 'index',      title: 'Accueil' },
    { slug: 'prestations',title: 'Prestations' },
    { slug: 'portfolio',  title: 'Portfolio' },
    { slug: 'contact',    title: 'Contact' },
  ];
  const pageList = document.getElementById('page-list');
  pages.forEach(p => {
    const li = document.createElement('li');
    li.textContent      = p.title;
    li.dataset.slug     = p.slug;
    li.addEventListener('click', () => loadPage(p.slug));
    pageList.append(li);
  });

  let currentSlug = pages[0].slug;

  // 3.3 Charger en mode “preview + édition”
  const iframe = document.getElementById('preview');
  async function loadPage(slug) {
    currentSlug = slug;
    iframe.src  = `../${slug}.html`;
    // désactiver édition
    editMode = false;
    editBtn.textContent = 'Mode édition';
  }

  // 3.4 Mode édition
  let editMode = false;
  const editBtn   = document.getElementById('edit-mode');
  const saveBtn   = document.getElementById('save-changes');

  editBtn.addEventListener('click', () => {
    const doc       = iframe.contentDocument;
    const container = doc.querySelector('.container');
    if (!container) return alert('Zone éditable introuvable.');
    editMode = !editMode;
    container.contentEditable = editMode;
    editBtn.textContent = editMode ? 'Quitter édition' : 'Mode édition';
  });

  // 3.5 Enregistrer la modif
  saveBtn.addEventListener('click', async () => {
    const doc       = iframe.contentDocument;
    const container = doc.querySelector('.container');
    const html      = container.innerHTML;
    const { error } = await supabase
      .from('pages_texts')
      .upsert({ page_slug: currentSlug, content: html });
    if (error) return alert('Erreur : ' + error.message);
    alert('Modifications enregistrées !');
  });

  // Démarrage sûr sur la première page
  loadPage(currentSlug);
}
