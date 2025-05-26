// admin/admin.js

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ————— Supabase init —————
const SUPABASE_URL      = 'https://jkasolurdoqvdhukxzgm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprYXNvbHVyZG9xdWt4emdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5MTE3NTAsImV4cCI6MjA2MzQ4Nzc1MH0.C817YgR525jvDxOkpbcFA2SRCYqieucrPvWqtWGLNSg';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// debug
console.log('→ Supabase URL :', SUPABASE_URL);
console.log('→ ANON key (début) :', SUPABASE_ANON_KEY.slice(0,10) + '…');
console.log('→ signInWithPassword is a', typeof supabase.auth.signInWithPassword);

// ————— Détection de page —————
const path    = window.location.pathname;
const isLogin = path.endsWith('/admin/') || path.endsWith('/admin/index.html');

// ————— Forcer l’authent sur le dashboard —————
async function checkAuthOrRedirect() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) window.location.replace('index.html');
}
if (!isLogin) checkAuthOrRedirect();

// ————— Login : pré-fill + redirect auto —————
document.addEventListener('DOMContentLoaded', async () => {
  if (isLogin) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      window.location.replace('dashboard.html');
      return;
    }
    const saved = localStorage.getItem('admin_email');
    if (saved) {
      const emailIn = document.getElementById('email');
      const remIn   = document.getElementById('remember');
      if (emailIn) emailIn.value = saved;
      if (remIn)   remIn.checked = true;
    }
  }
});

// ————— Gestion du login —————
if (isLogin) {
  document.getElementById('login-form')
    .addEventListener('submit', async e => {
      e.preventDefault();
      const emailEl    = document.getElementById('email');
      const passEl     = document.getElementById('password');
      const remEl      = document.getElementById('remember');
      const email      = emailEl.value;
      const password   = passEl.value;

      if (remEl?.checked)  localStorage.setItem('admin_email', email);
      else                 localStorage.removeItem('admin_email');

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        document.getElementById('error-msg').textContent = error.message;
      } else {
        window.location.replace('dashboard.html');
      }
    });
}

// ————— Dashboard —————
if (!isLogin) {
  // sign-out
  document.getElementById('logout')
    .addEventListener('click', () =>
      supabase.auth.signOut().then(() => window.location.replace('index.html'))
    );

  // pages disponibles
  const pages = [
    { slug: 'index',       title: 'Accueil'     },
    { slug: 'prestations', title: 'Prestations' },
    { slug: 'portfolio',   title: 'Portfolio'   },
    { slug: 'contact',     title: 'Contact'     },
  ];
  // mapping slug→titre
  const titleMap = pages.reduce((m,p) => (m[p.slug]=p.title, m), {});

  // construire la sidebar
  const pageListEl = document.getElementById('page-list');
  pages.forEach((p,i) => {
    const li = document.createElement('li');
    li.textContent  = p.title;
    li.dataset.slug = p.slug;
    li.addEventListener('click', () => {
      document.querySelectorAll('.sidebar li')
              .forEach(el => el.classList.remove('active'));
      li.classList.add('active');
      loadPage(p.slug);
    });
    if (i===0) li.classList.add('active');
    pageListEl.appendChild(li);
  });

  // éléments du dashboard
  let currentSlug      = pages[0].slug;
  const editorTitle    = document.getElementById('editor-title');
  const iframe         = document.getElementById('preview');
  const editBtn        = document.getElementById('edit-mode');
  const saveBtn        = document.getElementById('save-changes');
  const fileInput      = document.getElementById('image-upload');
  const insertBtn      = document.getElementById('insert-image');
  let editMode         = false;
  let draggedImage     = null;

  // injection de ton CSS public dans l’iframe
  iframe.addEventListener('load', () => {
    const doc = iframe.contentDocument;
    if (!doc) return;
    const link = doc.createElement('link');
    link.rel  = 'stylesheet';
    link.href = '../styles.css';
    doc.head.appendChild(link);
    doc.querySelector('.container')?.setAttribute('contentEditable','false');
  });

  // chargement + mise à jour du titre
  function loadPage(slug) {
    currentSlug = slug;
    editorTitle.textContent = `Édition : ${titleMap[slug]||slug}`;
    iframe.src = `../${slug}.html`;
    editMode = false;
    editBtn.textContent = 'Mode édition';
  }

  // config des images pour drag & drop + suppression
  function setupImageEditing() {
    const doc = iframe.contentDocument;
    const imgs = doc.querySelectorAll('.container img');
    imgs.forEach(img => {
      img.draggable = true;
      img.style.cursor = 'move';
      img.addEventListener('dragstart', e => { draggedImage = img; });
      img.addEventListener('dragover',  e => e.preventDefault());
      img.addEventListener('drop', e => {
        e.preventDefault();
        if (draggedImage && draggedImage!==img) {
          img.parentNode.insertBefore(draggedImage, img.nextSibling);
        }
      });
      img.addEventListener('click', () => {
        if (editMode && confirm('Supprimer cette image ?')) {
          img.remove();
        }
      });
    });
  }
  function tearDownImageEditing() {
    const doc = iframe.contentDocument;
    const imgs = doc.querySelectorAll('.container img');
    imgs.forEach(img => {
      img.removeAttribute('draggable');
      img.style.cursor = '';
      // cloneNode pour ôter listeners
      img.replaceWith(img.cloneNode(true));
    });
  }

  // toggle édition
  editBtn.addEventListener('click', () => {
    const doc = iframe.contentDocument;
    const container = doc?.querySelector('.container');
    if (!container) return alert('Zone éditable introuvable.');
    editMode = !editMode;
    container.contentEditable = editMode;
    editBtn.textContent = editMode? 'Quitter édition' : 'Mode édition';
    if (editMode) setupImageEditing();
    else tearDownImageEditing();
  });

  // enregistrement (avec onConflict pour éviter les 409)
  saveBtn.addEventListener('click', async () => {
    console.log(`[Admin] Saving slug: ${currentSlug}`);
    const doc = iframe.contentDocument;
    const container = doc?.querySelector('.container');
    if (!container) return alert('Zone éditable introuvable.');

    const html = container.innerHTML;
    const { error } = await supabase
      .from('pages_texts')
      .upsert(
        { page_slug: currentSlug, content: html },
        { onConflict: 'page_slug' }
      );
    if (error) return alert('Erreur : '+error.message);
    alert('Modifications enregistrées sur : '+currentSlug);
  });

  // upload + insertion d’image
  insertBtn.addEventListener('click', async () => {
    if (!editMode) return alert('Active d’abord le mode édition.');
    const file = fileInput.files[0];
    if (!file) return alert('Choisis un fichier image.');

    const { error: upErr } = await supabase
      .storage
      .from('admin-images')
      .upload(file.name, file, { upsert: true });
    if (upErr) return alert('Upload échoué : '+upErr.message);

    const { data: { publicUrl } } = supabase
      .storage
      .from('admin-images')
      .getPublicUrl(file.name);

    const doc = iframe.contentDocument;
    const container = doc.querySelector('.container');
    container.insertAdjacentHTML('beforeend',
      `<img src="${publicUrl}" alt="${file.name}" style="max-width:100%;margin:0.5em 0;">`
    );
    fileInput.value = '';
    alert('Image insérée !');
  });

  // chargement initial
  loadPage(currentSlug);
}
