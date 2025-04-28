// Replace with your Firebase config
const firebaseConfig = {
    apiKey: "/////////////",
    authDomain: "//////////////",
    projectId: "///////////",
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', () => {
  const showRegisterBtn = document.getElementById('show-register');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const cancelRegisterBtn = document.getElementById('cancel-register');

  // Show register form
  if (showRegisterBtn && registerForm && loginForm) {
    showRegisterBtn.onclick = () => {
      loginForm.style.display = 'none';
      registerForm.style.display = 'block';
    };
  }
  // Hide register form
  if (cancelRegisterBtn && registerForm && loginForm) {
    cancelRegisterBtn.onclick = () => {
      registerForm.style.display = 'none';
      loginForm.style.display = 'block';
    };
  }

  // Register logic
  if (registerForm) {
    registerForm.onsubmit = async e => {
      e.preventDefault();
      const email = document.getElementById('register-email').value;
      const password = document.getElementById('register-password').value;
      try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await cred.user.sendEmailVerification();
        showMessage('Registration successful! Please verify your email.');
      } catch (err) {
        showMessage(err.message);
      }
    };
  }

  // Login logic
  if (loginForm) {
    loginForm.onsubmit = async e => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      try {
        const cred = await auth.signInWithEmailAndPassword(email, password);
        if (cred.user.emailVerified) {
          window.location.href = "dashboard.html";
        } else {
          showMessage('Please verify your email before logging in.');
          auth.signOut();
        }
      } catch (err) {
        showMessage(err.message);
      }
    };
  }

  function showMessage(msg) {
    const msgDiv = document.getElementById('message');
    if (msgDiv) msgDiv.innerText = msg;
  }

  // --- Dashboard Logic ---
  if (document.getElementById('task-form')) {
    auth.onAuthStateChanged(user => {
      if (!user || !user.emailVerified) {
        window.location.href = "index.html";
      } else {
        loadTasks();
      }
    });

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.onclick = () => {
        auth.signOut().then(() => window.location.href = "index.html");
      };
    }

    document.getElementById('task-form').onsubmit = async e => {
      e.preventDefault();
      const title = document.getElementById('task-title').value;
      const description = document.getElementById('task-desc').value;
      const dueDate = document.getElementById('task-due-date').value;
      const dueTime = document.getElementById('task-time').value;
      const user = auth.currentUser;
      if (!user) return;
      await db.collection('todos').add({
        uid: user.uid,
        title,
        description,
        dueDate,
        dueTime,
        done: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      document.getElementById('task-form').reset();
    };

    function loadTasks() {
      const user = auth.currentUser;
      db.collection('todos')
        .where('uid', '==', user.uid)
        //.orderBy('createdAt', 'desc') //
        .onSnapshot(snapshot => {
          const taskList = document.getElementById('task-list');
          taskList.innerHTML = '';
          snapshot.forEach(doc => {
            const task = doc.data();
            const div = document.createElement('div');
            div.className = 'task-item' + (task.done ? ' done' : '');
            div.innerHTML = `
              <input type="checkbox" ${task.done ? 'checked disabled' : ''} data-id="${doc.id}">
              <span class="task-title">${task.title}</span>
              <span class="task-desc">${task.description || ''}</span>
              <span class="task-date">${task.dueDate} ${task.dueTime || ''}</span>
            `;
            const checkbox = div.querySelector('input[type=checkbox]');
            if (checkbox && !task.done) {
              checkbox.onchange = async () => {
                // Animate out
                div.classList.add('removing');
                setTimeout(async () => {
                  await db.collection('todos').doc(doc.id).update({ done: true });
                  // onSnapshot will remove it from the DOM after update
                }, 500); // Match the CSS transition duration
              };
            }
            taskList.appendChild(div);
          });
        });
    }
  }
});