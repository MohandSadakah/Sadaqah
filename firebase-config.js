// firebase-config.js — plain script (NOT a module), works when opened via file://
// Loaded via <script src="./firebase-config.js"></script> AFTER the firebase-app-compat
// and firebase-firestore-compat scripts.

var firebaseConfig = {
  apiKey: "AIzaSyBe8PZ2DSHla1I-pC4of7PfJ1-Gig2KJM4",
  authDomain: "sadaqah-3730e.firebaseapp.com",
  projectId: "sadaqah-3730e",
  storageBucket: "sadaqah-3730e.firebasestorage.app",
  messagingSenderId: "570471753390",
  appId: "1:570471753390:web:020ac0cfe0c0fe0396ef3f"
};

firebase.initializeApp(firebaseConfig);
var db = firebase.firestore();
// storage is only available on pages that also load firebase-storage-compat.js
var storage = (typeof firebase.storage === 'function') ? firebase.storage() : null;

var USERS = ["adham", "mohand", "shady", "bassem", "haidy"];
var NAMES = { adham: "Adham", mohand: "Mohand", shady: "Shady", bassem: "Bassem", haidy: "Haidy" };
var COLORS = { adham: "#3e8bff", mohand: "#ff7a45", shady: "#9b6eff", bassem: "#2fc9c9", haidy: "#ff5d8f" };
var AVATARS = { adham: "A", mohand: "M", shady: "S", bassem: "B", haidy: "h" };
var DEFAULT_ADMIN_PASSWORD = "admin";

// Make sure the 5 user docs + the admin settings doc exist.
// Default password for every user = their own username (they can change it after logging in).
async function ensureSeedData() {
  for (var i = 0; i < USERS.length; i++) {
    var u = USERS[i];
    var ref = db.collection('users').doc(u);
    var snap = await ref.get();
    if (!snap.exists) {
      await ref.set({ password: u, displayName: NAMES[u], points: 0 });
    }
  }
  var adminRef = db.collection('settings').doc('admin');
  var adminSnap = await adminRef.get();
  if (!adminSnap.exists) {
    await adminRef.set({ password: DEFAULT_ADMIN_PASSWORD });
  }
}

// Recalculate and persist a user's total points based on their done tasks.
async function recalcUserPoints(username) {
  var snap = await db.collection('tasks')
    .where('assignedTo', '==', username)
    .where('done', '==', true)
    .get();
  var total = 0;
  snap.forEach(function (d) { total += (d.data().points || 0); });
  await db.collection('users').doc(username).update({ points: total });
}

// Notify a specific user (shown to them inside the app, e.g. "Admin assigned you a task" / "Admin sent you a message")
async function notifyUser(username, type, text, extra) {
  var payload = {
    user: username,
    type: type, // 'task_added' | 'admin_message'
    text: text || '',
    createdAt: Date.now(),
    seen: false
  };
  if (extra) { for (var k in extra) payload[k] = extra[k]; }
  await db.collection('user_notifications').add(payload);
}

// Upload a photo the user sends to the admin (tied to the user, not to a specific task/challenge).
async function uploadUserPhoto(username, file) {
  if (!storage) throw new Error('Storage not initialized — make sure firebase-storage-compat.js is loaded on this page.');
  var path = 'user_photos/' + username + '/' + Date.now() + '_' + file.name;
  var ref = storage.ref().child(path);
  await ref.put(file);
  return await ref.getDownloadURL();
}

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, function (s) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[s];
  });
}
