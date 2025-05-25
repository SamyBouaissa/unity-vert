// admin/admin.js

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ————— Supabase init —————
const SUPABASE_URL      = 'https://jkasolurdoqvdhukxzgm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprYXNvbHVyZG9xdWt4emdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5MTE3NTAsImV4cCI6MjA2MzQ4Nzc1MH0.C817YgR525jvDxOkpbcFA2SRCYqieucrPvWqtWGLNSg';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ————— Détection de page —————
const path    = window.location.pathname;
const isLogin = path.endsWith('/admin/') || path.endsWith('/admin/index.html');

// ————— Forcer l’auth sur le dashboard —————
async function checkAuthOrRedirect() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.replace('index.html');
  }
}
if (!isLogin) {
  checkAuthOrRedirect();
}

// ————— Pré-remplissage email & redirection auto si déjà connecté —————
document.addEventListener('DOMContentLoaded', async () => {
  if (isLogin) {
    // si déjà connecté, on passe direct au dashboard
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      window.location.replace('dashboard.html');
      return;
    }
    // sinon on pré-remplit l’email
    const saved = localStorage.getItem('admin_email');
    if (saved) {
      const emailInput = document.getElementById('email');
      const remember   = document.getElementById('remember');
      if (emailInput) emailInput.value = saved;
      if (remember)   remember.checked = true;
    }
  }
});

// ————— Gestion du formulaire de login —————
if (isLogin) {
  document.getElementById('login-form')
    ?.addEventListener('submit', async e => {
      e.preventDefault();
      const emailEl    = document.getElementById('email');
      const passEl     = document.getElementById('password');
      const rememberEl = document.getElementById('remember');
      const email      = emailEl.value;
      const password   = passEl.value;

      // mémorisation éventuelle de l’email
      if (rememberEl?.checked) {
        localStorage.setItem('admin_email', email);
      } else {
        localStorage.removeItem('admin_email');
      }

      // tentative de connexion
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        document.getElementById('error-msg').textContent = error.message;
      } else {
        window.location.replace('dashboard.html');
      }
    });
}

// ————— Dashboard (sidebar + iframe + édition) —————
if (!isLogin) {
  // — Sign-out
  document.getElementById('logout')
    ?.addEventListener('click', () =>
      supabase.auth.signOut().then(() => window.location.replace('index.html'))
    );

  // — Définition des pages
  const pages = [
    { slug: 'index',       title: 'Accueil'      },
    { slug: 'prestations', title: 'Prestations'  },
    { slug: 'portfolio',   title: 'Portfolio'    },
    { slug: 'contact',     title: 'Contact'      },
  ];

  // — Construction de la sidebar
  const pageListEl = document.getElementById('page-list');
  pages.forEach((p, i) => {
    const li = document.createElement('li');
    li.textContent  = p.title;
    li.dataset.slug = p.slug;
    li.addEventListener('click', () => {
      // mise à jour du style actif
      document.querySelectorAll('.sidebar li').forEach(el => el.classList.remove('active'));
      li.classList.add('active');
      loadPage(p.slug);
    });
    if (i === 0) li.classList.add('active');
    pageListEl.appendChild(li);
  });

  // — Iframe et contrôles
  let currentSlug = pages[0].slug;
  const iframe         = document.getElementById('preview');
  const editBtn        = document.getElementById('edit-mode');
  const saveBtn        = document.getElementById('save-changes');
  const fileInput      = document.getElementById('image-upload');
  const insertImageBtn = document.getElementById('insert-image');
  let editMode         = false;

  // Injection du CSS public dans l’iframe
  iframe.addEventListener('load', () => {
    const doc = iframe.contentDocument;
    if (!doc) return;
    const link = doc.createElement('link');
    link.rel  = 'stylesheet';
    link.href = '../styles.css';
    doc.head.appendChild(link);
    // on désactive toujours l’édition à chaque nouveau chargement
    doc.querySelector('.container')?.setAttribute('contentEditable', 'false');
  });

  // Fonction de chargement d’une page
  async function loadPage(slug) {
    currentSlug = slug;
    iframe.src  = `../${slug}.html`;
    editMode    = false;
    editBtn.textContent = 'Mode édition';
  }

  // Toggle du mode édition
  editBtn.addEventListener('click', () => {
    const doc       = iframe.contentDocument;
    const container = doc?.querySelector('.container');
    if (!container) return alert('Zone éditable introuvable.');
    editMode = !editMode;
    container.contentEditable = editMode;
    editBtn.textContent = editMode ? 'Quitter édition' : 'Mode édition';
  });

  // Sauvegarde dans Supabase
  saveBtn.addEventListener('click', async () => {
    const doc       = iframe.contentDocument;
    const container = doc?.querySelector('.container');
    if (!container) return alert('Zone éditable introuvable.');
    const html = container.innerHTML;
    const { error } = await supabase
      .from('pages_texts')
      .upsert({ page_slug: currentSlug, content: html });
    if (error) return alert('Erreur : ' + error.message);
    alert('Modifications enregistrées !');
  });

  // Upload & insertion d’images
  insertImageBtn.addEventListener('click', async () => {
    if (!editMode) return alert('Active d’abord le mode édition.');
    const file = fileInput.files[0];
    if (!file) return alert('Choisis un fichier image.');

    // upload dans le bucket
    const { error: upErr } = await supabase.storage
      .from('admin-images')
      .upload(file.name, file, { upsert: true });
    if (upErr) return alert('Upload échoué : ' + upErr.message);

    // récupération de l’URL publique
    const { data: { publicUrl } } = supabase.storage
      .from('admin-images')
      .getPublicUrl(file.name);

    // insertion dans la page
    const doc       = iframe.contentDocument;
    const container = doc.querySelector('.container');
    container.insertAdjacentHTML('beforeend',
      `<img src="${publicUrl}" alt="${file.name}" style="max-width:100%;margin:0.5em 0;">`
    );
    fileInput.value = '';
    alert('Image insérée !');
  });

  // Page initiale
  loadPage(currentSlug);
}
