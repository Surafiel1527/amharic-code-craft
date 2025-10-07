// This blog needs backend integration:
// 1. Supabase Database with 'posts' table (id, title, content, author_id, created_at)
// 2. Supabase Auth for user authentication
// 3. RLS policies for secure data access

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// TODO: Replace with actual Supabase credentials
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State
let currentUser = null;

// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const createPostBtn = document.getElementById('createPostBtn');
const loginModal = document.getElementById('loginModal');
const signupModal = document.getElementById('signupModal');
const createPostModal = document.getElementById('createPostModal');
const postsContainer = document.getElementById('postsContainer');

// Initialize
async function init() {
    // Check auth state
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        updateUIForAuth(true);
    }
    
    // Load posts
    loadPosts();
    
    // Auth state listener
    supabase.auth.onAuthStateChange((event, session) => {
        currentUser = session?.user || null;
        updateUIForAuth(!!session);
        if (event === 'SIGNED_IN') {
            closeAllModals();
            loadPosts();
        }
    });
}

// Update UI based on auth state
function updateUIForAuth(isAuthenticated) {
    if (isAuthenticated) {
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'block';
        createPostBtn.style.display = 'block';
    } else {
        loginBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
        createPostBtn.style.display = 'none';
    }
}

// Load posts from database
async function loadPosts() {
    try {
        postsContainer.innerHTML = '<div class="loading">Loading posts...</div>';
        
        const { data: posts, error } = await supabase
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (!posts || posts.length === 0) {
            postsContainer.innerHTML = `
                <div class="empty-state">
                    <h2>No posts yet</h2>
                    <p>Be the first to create a post!</p>
                </div>
            `;
            return;
        }
        
        postsContainer.innerHTML = posts.map(post => `
            <div class="post-card">
                <h3>${escapeHtml(post.title)}</h3>
                <div class="post-meta">
                    ${new Date(post.created_at).toLocaleDateString()}
                </div>
                <p class="post-excerpt">${escapeHtml(post.content.substring(0, 150))}${post.content.length > 150 ? '...' : ''}</p>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading posts:', error);
        postsContainer.innerHTML = `
            <div class="empty-state">
                <h2>Error loading posts</h2>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// Authentication handlers
loginBtn.addEventListener('click', () => {
    loginModal.classList.add('active');
});

logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    loadPosts();
});

createPostBtn.addEventListener('click', () => {
    createPostModal.classList.add('active');
});

// Login form
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        alert('Login successful!');
    } catch (error) {
        alert('Error: ' + error.message);
    }
});

// Signup form
document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    
    try {
        const { error } = await supabase.auth.signUp({ 
            email, 
            password,
            options: {
                emailRedirectTo: window.location.origin
            }
        });
        if (error) throw error;
        alert('Signup successful! Please check your email to confirm.');
        closeAllModals();
    } catch (error) {
        alert('Error: ' + error.message);
    }
});

// Create post form
document.getElementById('createPostForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
        alert('Please login first');
        return;
    }
    
    const title = document.getElementById('postTitle').value;
    const content = document.getElementById('postContent').value;
    
    try {
        const { error } = await supabase
            .from('posts')
            .insert([
                { 
                    title, 
                    content, 
                    author_id: currentUser.id 
                }
            ]);
        
        if (error) throw error;
        
        alert('Post created successfully!');
        document.getElementById('createPostForm').reset();
        closeAllModals();
        loadPosts();
    } catch (error) {
        alert('Error creating post: ' + error.message);
    }
});

// Modal controls
document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', closeAllModals);
});

document.getElementById('showSignup').addEventListener('click', (e) => {
    e.preventDefault();
    loginModal.classList.remove('active');
    signupModal.classList.add('active');
});

document.getElementById('showLogin').addEventListener('click', (e) => {
    e.preventDefault();
    signupModal.classList.remove('active');
    loginModal.classList.add('active');
});

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
}

// Close modal on outside click
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        closeAllModals();
    }
});

// Utility function
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize app
init();
