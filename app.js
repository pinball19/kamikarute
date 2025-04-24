// ---------------- Firebase 初期化 ----------------
const firebaseConfig = {
  apiKey: "AIzaSyAU8ESmE4c7rpV9E-UhOrJsR3L13i19J04",
  authDomain: "kamikarute-2ef80.firebaseapp.com",
  projectId: "kamikarute-2ef80",
  storageBucket: "kamikarute-2ef80.firebasestorage.app",
  messagingSenderId: "576153997748",
  appId: "1:576153997748:web:8643dc7aafed322ee462e1",
  measurementId: "G-GR2H2BXK2T"
};
firebase.initializeApp(firebaseConfig);
const auth  = firebase.auth();
const db    = firebase.firestore();
const store = firebase.storage().ref();

// ---------------- DOM ----------------
const list        = document.getElementById("list");
const searchInput = document.getElementById("search");
const addCustBtn  = document.getElementById("addCustomer");
const logoutBtn   = document.getElementById("logout"); // 後日用
const custDlg     = document.getElementById("custDlg");
const visitList   = document.getElementById("visitList");
const custNameHd  = document.getElementById("custName");
const photos      = document.getElementById("photos");
const memo        = document.getElementById("memo");
const addVisitBtn = document.getElementById("addVisit");

// ---------------- 匿名ログインが前提 ----------------
let uid = "";
auth.onAuthStateChanged(user => {
  if (!user) {
    alert("認証に失敗しました。ページを再読み込みしてください。");
    return;
  }
  uid = user.uid;
  listenCustomers();          // 顧客リアルタイム監視
});

// ---------------- 顧客リアルタイム取得 ----------------
function listenCustomers() {
  db.collection("users").doc(uid).collection("customers")
    .orderBy("lastVisit", "desc")
    .onSnapshot(ss => {
      const data = ss.docs.map(d => ({ id: d.id, ...d.data() }));
      renderCustomers(data);
    });
}

// ---------------- 顧客一覧描画 ----------------
function renderCustomers(data) {
  const kw = searchInput.value.trim().toLowerCase();
  list.innerHTML = "";
  data
    .filter(c =>
      !kw ||
      c.name.toLowerCase().includes(kw) ||
      (c.tel || "").includes(kw)
    )
    .forEach(c => {
      const li = document.createElement("li");
      li.innerHTML = `
        <div class="avatar"></div>
        <div>
          <strong>${c.name}</strong><br>
          <small>${c.lastVisit || "初来店なし"}</small>
        </div>`;
      li.onclick = () => openCustomer(c);
      list.appendChild(li);
    });
}

// 検索
searchInput.oninput = () => listenCustomers();

// ---------------- 顧客追加 ----------------
addCustBtn.onclick = async () => {
  const name = prompt("お名前");
  if (!name) return;
  const tel = prompt("電話番号 (任意)") || "";
  await db.collection("users").doc(uid)
          .collection("customers")
          .add({ name, tel, lastVisit: null });
};

// ---------------- 顧客詳細表示 ----------------
let currentId = "";
function openCustomer(c) {
  currentId = c.id;
  custNameHd.textContent = c.name;
  custDlg.showModal();

  db.doc(`users/${uid}/customers/${c.id}`)
    .collection("visits")
    .orderBy("day", "desc")
    .onSnapshot(ss => {
      visitList.innerHTML = "";
      ss.forEach(d => {
        const v = d.data();
        const li = document.createElement("li");
        li.innerHTML = `
          <p><small>${v.day}</small></p>
          ${v.urls.map(u => `<img src="${u}" />`).join("")}
          <p>${v.memo || ""}</p>`;
        visitList.appendChild(li);
      });
    });
}

// ---------------- 来店記録追加 ----------------
addVisitBtn.onclick = async () => {
  const files = photos.files;
  const text  = memo.value.trim();
  if (!files.length && !text) return alert("写真かメモを入力してください");

  const urls = [];
  for (let f of files) {
    const snap = await store
      .child(`${uid}/${currentId}/${Date.now()}_${f.name}`)
      .put(f);
    urls.push(await snap.ref.getDownloadURL());
  }

  const day = new Date().toISOString().split("T")[0];
  await db.doc(`users/${uid}/customers/${currentId}`)
          .collection("visits")
          .add({ day, memo: text, urls });

  await db.doc(`users/${uid}/customers/${currentId}`)
          .update({ lastVisit: day });

  photos.value = "";
  memo.value   = "";
};

// ---------------- ログアウト（現段階では非表示） ----------------
logoutBtn.style.display = "none";
// 後日メール認証を復活させる際は↑を削除して ↓を有効化
// logoutBtn.onclick = () => auth.signOut();
