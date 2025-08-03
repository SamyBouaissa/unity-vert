// admin/admin.js

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// — Supabase init —
const SUPABASE_URL      = 'https://jkasolurdoqvdhukxzgm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprYXNvbHVyZG9xdmRodWt4emdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5MTE3NTAsImV4cCI6MjA2MzQ4Nzc1MH0.C817YgR525jvDxOkpbcFA2SRCYqieucrPvWqtWGLNSg';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// — Debug —
console.log('Supabase URL:', SUPABASE_URL);
console.log('ANON key start:', SUPABASE_ANON_KEY.slice(0,10)+'…');

// — Page detection —
const path    = window.location.pathname;
const isLogin = path.endsWith('/admin/') || path.endsWith('/admin/index.html');

// — Auth guard —
async function checkAuthOrRedirect() {
  const { data:{ session } } = await supabase.auth.getSession();
  if (!session) window.location.replace('index.html');
}
if (!isLogin) checkAuthOrRedirect();

// — Login prefilling & redirect —
document.addEventListener('DOMContentLoaded', async () => {
  if (isLogin) {
    const { data:{ session } } = await supabase.auth.getSession();
    if (session) {
      window.location.replace('dashboard.html');
      return;
    }
    const saved = localStorage.getItem('admin_email');
    if (saved) {
      document.getElementById('email').value      = saved;
      document.getElementById('remember').checked = true;
    }
  }
});

// — Login handler —
if (isLogin) {
  document.getElementById('login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const emailEl  = document.getElementById('email');
    const passEl   = document.getElementById('password');
    const remember = document.getElementById('remember').checked;
    const email    = emailEl.value;
    const password = passEl.value;

    if (remember) localStorage.setItem('admin_email', email);
    else          localStorage.removeItem('admin_email');

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      document.getElementById('error-msg').textContent = error.message;
    } else {
      window.location.replace('dashboard.html');
    }
  });
}

// — Dashboard —
if (!isLogin) {
  // Sign out
  document.getElementById('logout').addEventListener('click', () =>
    supabase.auth.signOut().then(() => window.location.replace('index.html'))
  );

  // Pages list
  const pages = [
    { slug:'index',       title:'Accueil'     },
    { slug:'prestations', title:'Prestations' },
    { slug:'portfolio',   title:'Portfolio'   },
    { slug:'contact',     title:'Contact'     },
  ];
  const titleMap = pages.reduce((m,p) => (m[p.slug]=p.title, m), {});

  // Sidebar
  const pageListEl = document.getElementById('page-list');
  pages.forEach((p,i) => {
    const li = document.createElement('li');
    li.textContent  = p.title;
    li.dataset.slug = p.slug;
    li.addEventListener('click', () => {
      document.querySelectorAll('.sidebar li').forEach(el => el.classList.remove('active'));
      li.classList.add('active');
      loadPage(p.slug);
    });
    if (i===0) li.classList.add('active');
    pageListEl.appendChild(li);
  });

  // Dashboard elements
  let   currentSlug = pages[0].slug;
  const iframe      = document.getElementById('preview');
  const editBtn     = document.getElementById('edit-mode');
  const saveBtn     = document.getElementById('save-changes');
  const fileInput   = document.getElementById('image-upload');
  const insertBtn   = document.getElementById('insert-image');
  let   editMode    = false;
  let   draggedImg  = null;

  // Delegated image handlers
function onContainerClick(e) {
  if (!editMode) return;
  const img = e.target.closest('img.gallery-img');
  if (!img) return;

  // 1) Empêche l’action native (ouverture de la lightbox)
  e.preventDefault();
  // 2) Bloque la bulle et tout autre listener
  e.stopPropagation();
  e.stopImmediatePropagation();

  // 3) Ta pop-up de suppression
  if (confirm('Supprimer cette image ?')) {
    img.remove();
  }
}

  function onImgDragStart(e) {
    if (!editMode) return;
    const img = e.target.closest('img.gallery-img');
    if (!img) return;
    draggedImg = img;
  }
  function onContainerDragOver(e) {
    if (!editMode) return;
    if (e.target.closest('img.gallery-img')) e.preventDefault();
  }
  function onContainerDrop(e) {
    if (!editMode) return;
    const img = e.target.closest('img.gallery-img');
    if (img && draggedImg && draggedImg !== img) {
      e.preventDefault();
      img.parentNode.insertBefore(draggedImg, img.nextSibling);
    }
  }

  // Inject site CSS, intercept nav, and install delegation
  iframe.addEventListener('load', () => {
  const doc = iframe.contentDocument;
  if (!doc) return;

  // 1) Lien vers ton styles.css
  const link = doc.createElement('link');
  link.rel  = 'stylesheet';
  link.href = '../styles.css';
  doc.head.appendChild(link);

  // 2) Reset marges du body
  const reset = doc.createElement('style');
  reset.textContent = `
    html, body {
      margin: 0 !important;
      padding: 0 !important;
    }
  `;
  doc.head.appendChild(reset);

  // 3) **OVERRIDE** le padding des sections
  const override = doc.createElement('style');
  override.textContent = `
    /* supprime le 4rem vertical sur toutes les sections */
    section {
      padding: 0 !important;
    }
  `;
  doc.head.appendChild(override);

  doc.querySelectorAll('.container img').forEach(img => {
    const clone = img.cloneNode(true);
    clone.className = img.className;   // conserver les classes
    clone.src       = img.src;         // et la source
    img.replaceWith(clone);
  });

  // 2) disable edit by default on all containers
  const containers = Array.from(doc.querySelectorAll('.container'));
  containers.forEach(c => c.setAttribute('contentEditable','false'));

  // 3) install delegated listeners in capture phase on each container
  containers.forEach(container => {
    container.removeEventListener('click',    onContainerClick, true);
    container.addEventListener   ('click',    onContainerClick, true);
    container.removeEventListener('dragstart',onImgDragStart, true);
    container.addEventListener   ('dragstart',onImgDragStart, true);
    container.removeEventListener('dragover', onContainerDragOver, true);
    container.addEventListener   ('dragover', onContainerDragOver, true);
    container.removeEventListener('drop',     onContainerDrop, true);
    container.addEventListener   ('drop',     onContainerDrop, true);
  });



  // 4) intercept in-iframe nav links
  doc.querySelectorAll('nav a').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const slug = a.getAttribute('href').replace('.html','');
      document.querySelectorAll('.sidebar li').forEach(el => el.classList.remove('active'));
      const target = document.querySelector(`.sidebar li[data-slug="${slug}"]`);
      if (target) target.classList.add('active');
      loadPage(slug);
    });
  });
});

  // Load a page into the iframe
  function loadPage(slug) {
    currentSlug = slug;
    editorTitle.textContent = `Édition : ${titleMap[slug]||slug}`;
    iframe.src = `../${slug}.html`;
    editMode = false;
    editBtn.textContent = 'Mode édition';
  }

  // Toggle edit mode
  editBtn.addEventListener('click', () => {
    const doc = iframe.contentDocument;
    const container = doc?.querySelector('.container');
    if (!container) return alert('Zone éditable introuvable.');
    editMode = !editMode;
    container.contentEditable = editMode;
    editBtn.textContent = editMode ? 'Quitter édition' : 'Mode édition';
  });

  // Save changes
  saveBtn.addEventListener('click', async () => {
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
    if (error) return alert('Erreur : ' + error.message);
    alert('Modifications enregistrées sur : ' + currentSlug);
  });

  // Upload & insert image with site’s gallery-img class
insertBtn.addEventListener('click', async () => {
  if (!editMode) return alert('Active d’abord le mode édition.');
  const file = fileInput.files[0];
  if (!file) return alert('Choisis un fichier image.');

  // sanitize filename
  const safeName = file.name.replace(/[^\w.\-]/g,'_');
  const { error: upErr } = await supabase
    .storage
    .from('admin-images')
    .upload(safeName, file, { upsert: true });
  if (upErr) return alert('Upload échoué : ' + upErr.message);

  const { data:{ publicUrl } } = supabase
    .storage
    .from('admin-images')
    .getPublicUrl(safeName);

  // alert facultative
  alert('Image stockée sous :\n' + publicUrl);

  // on choisit la galerie si elle existe, sinon la container principale
  const doc       = iframe.contentDocument;
  const gallery   = doc.querySelector('.gallery');
  const container = doc.querySelector('.container');
  const html      = `<img src="${publicUrl}" alt="${safeName}" class="gallery-img" />`;

  if (gallery) {
    gallery.insertAdjacentHTML('beforeend', html);
  } else {
    container.insertAdjacentHTML('beforeend', html);
  }

  fileInput.value = '';
  });

  // Initial load
  loadPage(currentSlug);
}
