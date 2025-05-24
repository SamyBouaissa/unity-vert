// admin/admin.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const SUPABASE_URL = 'https://jkasolurdoqvdhukxzgm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprYXNvbHVyZG9xdmRodWt4emdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5MTE3NTAsImV4cCI6MjA2MzQ4Nzc1MH0.C817YgR525jvDxOkpbcFA2SRCYqieucrPvWqtWGLNSg';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Si on est sur /admin/ sans préciser index.html
if (location.pathname.endsWith('/admin/') || location.pathname.endsWith('/admin')) {
  location.replace('index.html');
}

const isLoginPage = location.pathname.endsWith('/admin/index.html');

async function checkAuth() {
  const { data } = await supabase.auth.getSession();
  if (!data.session && !isLoginPage) {
    window.location.href = 'login.html';
  }
  if (data.session && isLoginPage) {
    window.location.href = 'dashboard.html';
  }
}
checkAuth();

// --- LOGIN ---
if (isLoginPage) {
  document.getElementById('login-form')
    .addEventListener('submit', async e => {
      e.preventDefault();
      const email = e.target.email.value;
      const password = e.target.password.value;
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        document.getElementById('error-msg').textContent = error.message;
      }
    });
}

// --- DASHBOARD ---
if (!isLoginPage) {
  // Déconnexion
  document.getElementById('logout')
    .addEventListener('click', () => supabase.auth.signOut().then(() => window.location.href = 'login.html'));

  // Chargement des pages
  async function loadPages() {
    const { data } = await supabase.from('pages_texts').select();
    const select = document.getElementById('page-select');
    data.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.page_slug;
      opt.text = p.page_slug;
      select.add(opt);
    });
  }
  loadPages();

  // Afficher le contenu quand on change de page
  document.getElementById('page-select')
    .addEventListener('change', async e => {
      const slug = e.target.value;
      const { data } = await supabase
        .from('pages_texts')
        .select('content')
        .eq('page_slug', slug)
        .single();
      document.getElementById('page-content').value = data.content;
    });

  // Enregistrer le texte
  document.getElementById('save-text')
    .addEventListener('click', async () => {
      const slug = document.getElementById('page-select').value;
      const content = document.getElementById('page-content').value;
      await supabase.from('pages_texts')
        .upsert({ page_slug: slug, content });
      alert('Texte enregistré !');
    });

  // Gestion des images
  async function listImages() {
    const { data } = await supabase.storage.from('admin-images').list();
    const ul = document.getElementById('image-list');
    ul.innerHTML = '';
    data.forEach(img => {
      const li = document.createElement('li');
      const url = supabase.storage.from('admin-images').getPublicUrl(img.name).data.publicUrl;
      li.innerHTML = `<img src="${url}" width="100" /><br>${img.name}`;
      ul.appendChild(li);
    });
  }
  listImages();

  // Téléverser une image
  document.getElementById('upload-image')
    .addEventListener('click', async () => {
      const file = document.getElementById('image-upload').files[0];
      if (!file) return alert('Choisis un fichier d’abord.');
      const { error } = await supabase.storage
        .from('admin-images')
        .upload(file.name, file, { upsert: true });
      if (error) return alert(error.message);
      await listImages();
      alert('Image uploadée !');
    });
}
