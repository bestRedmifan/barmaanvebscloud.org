"use strict";

const SLOT_PASSWORDS={
  1:"38423",2:"39099",3:"02833",
  4:"82731",5:"29373",6:"63742",
  7:"92382",8:"92842",9:"93832"
};

const PUBLIC_LIMIT=500*1024*1024;
const PRIVATE_LIMIT=1024*1024*1024;

const PUBLIC_USED="barmaan_cloud_public_used";
const PRIVATE_USED="barmaan_cloud_private_used";
const FILES="barmaan_cloud_files";
const LOCK_COUNT="barmaan_cloud_lock_count";
const LOCK_START="barmaan_cloud_lock_start";
const LOCK_DURATION="barmaan_cloud_lock_duration";
const PERMANENT="barmaan_cloud_permanent";
const SYNC="barmaan_cloud_sync";
const POSTS_URL="posts.json";

const LOCK_TIMES=[
  600000,1800000,3600000,5400000,
  7200000,86400000,604800000,31536000000
];

let currentSlot=0;
let cloudPosts=[];

const pages=[
  "homePage","publicPage","loginPage",
  "privatePage","checkPage","fullPage",
  "noSpacePage","lockPage","restorePage"
];

function $(id){
  return document.getElementById(id);
}

function getFiles(){
  try{
    const data=JSON.parse(
      localStorage.getItem(FILES)||"[]"
    );
    return Array.isArray(data)?data:[];
  }catch(e){
    return [];
  }
}

function saveFiles(files){
  localStorage.setItem(
    FILES,
    JSON.stringify(
      Array.isArray(files)?files:[]
    )
  );
}

async function loadPosts(){
  try{
    const response=await fetch(
      POSTS_URL,
      {cache:"no-store"}
    );

    if(!response.ok){
      throw new Error(
        "posts.json unavailable"
      );
    }

    const data=await response.json();

    cloudPosts=
      Array.isArray(data)?data:[];

  }catch(error){
    console.error(
      "posts.json error:",
      error
    );

    cloudPosts=[];
  }

  return cloudPosts;
}

function normalizeSlot(slot){
  if(
    String(slot).toLowerCase()==="public"
  ){
    return "public";
  }

  const text=String(slot||"");

  const match=text.match(
    /slot\s*([1-9])/i
  );

  if(match){
    return "slot"+match[1];
  }

  if(/^[1-9]$/.test(text)){
    return "slot"+text;
  }

  if(/^slot[1-9]$/i.test(text)){
    return text.toLowerCase();
  }

  return text.toLowerCase();
}

function postBelongsToSlot(post,slot){
  return normalizeSlot(
    post.slot||
    post.space||
    post.storage
  )===normalizeSlot(slot);
}

function getPostsForSlot(slot){
  return cloudPosts.filter(
    post=>postBelongsToSlot(post,slot)
  );
}

function postFileName(post){
  return String(
    post.file||
    post.name||
    post.filename||
    ""
  ).trim();
}

function hasRestorableFile(post){
  return postFileName(post)!=="";
}

function getFileSize(post){
  const value=Number(
    post.size||
    post.fileSize||
    post.filesize||
    post.bytes||
    0
  );

  return Number.isFinite(value)&&value>0
    ?value
    :0;
}

function getLocalFileSize(file){
  const value=Number(
    file.size||
    file.fileSize||
    file.filesize||
    file.bytes||
    0
  );

  return Number.isFinite(value)&&value>0
    ?value
    :0;
}

function findPostByFile(name,slot){
  const target=String(name||"")
    .trim()
    .toLowerCase();

  return getPostsForSlot(slot).find(
    post=>
      postFileName(post)
        .toLowerCase()===target
  );
}

function getRestorePassword(post){
  return String(
    post.backupPassword||
    post.password||
    post.restorePassword||
    ""
  );
}

function getDownloadURL(post){
  return String(
    post.url||
    post.link||
    post.download||
    postFileName(post)
  );
}

function findPostById(id){
  return cloudPosts.find(
    post=>
      String(
        post.id||
        postFileName(post)
      )===String(id)
  );
}

function getFileType(name){
  const n=String(name||"")
    .toLowerCase();

  if(
    n.endsWith(".jpg")||
    n.endsWith(".jpeg")||
    n.endsWith(".png")||
    n.endsWith(".gif")||
    n.endsWith(".webp")
  ){
    return "photoFile";
  }

  if(
    n.endsWith(".mp4")||
    n.endsWith(".mkv")||
    n.endsWith(".avi")||
    n.endsWith(".mov")||
    n.endsWith(".webm")
  ){
    return "videoFile";
  }

  if(
    n.endsWith(".apk")||
    n.endsWith(".exe")
  ){
    return "apkFile";
  }

  if(
    n.includes("mobileconfig")||
    n.includes("backup")||
    n.includes("config")
  ){
    return "mobileFile";
  }

  return "docFile";
}

function formatSize(bytes){
  bytes=Math.max(
    0,
    Number(bytes)||0
  );

  if(bytes<1024){
    return bytes.toFixed(0)+" B";
  }

  if(bytes<1024**2){
    return (bytes/1024).toFixed(2)+" KB";
  }

  if(bytes<1024**3){
    return (bytes/1024**2).toFixed(2)+" MB";
  }

  return (bytes/1024**3).toFixed(2)+" GB";
}

function getPublicSize(){
  let total=0;
  const names=new Set();

  getFiles()
    .filter(
      file=>normalizeSlot(file.slot)==="public"
    )
    .forEach(file=>{
      const name=String(
        file.name||
        file.file||
        file.filename||
        ""
      ).trim().toLowerCase();

      if(!name||names.has(name)){
        return;
      }

      names.add(name);
      total+=getLocalFileSize(file);
    });

  getPostsForSlot("public")
    .filter(hasRestorableFile)
    .forEach(post=>{
      const name=postFileName(post)
        .toLowerCase();

      if(!name||names.has(name)){
        return;
      }

      names.add(name);
      total+=getFileSize(post);
    });

  return total;
}

function getPrivateSize(slot){
  let total=0;
  const names=new Set();

  getFiles()
    .filter(
      file=>
        normalizeSlot(file.slot)==="slot"+slot
    )
    .forEach(file=>{
      const name=String(
        file.name||
        file.file||
        file.filename||
        ""
      ).trim().toLowerCase();

      if(!name||names.has(name)){
        return;
      }

      names.add(name);
      total+=getLocalFileSize(file);
    });

  getPostsForSlot("slot"+slot)
    .filter(hasRestorableFile)
    .forEach(post=>{
      const name=postFileName(post)
        .toLowerCase();

      if(!name||names.has(name)){
        return;
      }

      names.add(name);
      total+=getFileSize(post);
    });

  return total;
}

function getPublicUsed(){
  const value=getPublicSize();

  localStorage.setItem(
    PUBLIC_USED,
    String(value)
  );

  return value;
}

function publicAvailable(){
  return Math.max(
    0,
    PUBLIC_LIMIT-getPublicUsed()
  );
}

function publicFull(){
  return getPublicUsed()>=PUBLIC_LIMIT;
}

function publicPercent(){
  return Math.min(
    100,
    getPublicUsed()/
    PUBLIC_LIMIT*100
  );
}

function privateUsed(slot){
  const value=getPrivateSize(slot);

  let all={};

  try{
    all=JSON.parse(
      localStorage.getItem(
        PRIVATE_USED
      )||"{}"
    );
  }catch(e){
    all={};
  }

  all[slot]=value;

  localStorage.setItem(
    PRIVATE_USED,
    JSON.stringify(all)
  );

  return value;
}

function privateAvailable(slot){
  return Math.max(
    0,
    PRIVATE_LIMIT-privateUsed(slot)
  );
}

function privateFull(slot){
  return privateUsed(slot)>=PRIVATE_LIMIT;
}

function privatePercent(slot){
  return Math.min(
    100,
    privateUsed(slot)/
    PRIVATE_LIMIT*100
  );
}

function updatePublic(){
  const used=getPublicUsed();
  const available=publicAvailable();
  const percent=publicPercent();

  if($("publicUsed"))
    $("publicUsed").textContent=
      formatSize(used);

  if($("publicAvailable"))
    $("publicAvailable").textContent=
      formatSize(available);

  if($("publicPercent"))
    $("publicPercent").textContent=
      percent.toFixed(4)+"%";

  if($("publicProgress"))
    $("publicProgress").style.width=
      percent+"%";

  if($("publicPercentText"))
    $("publicPercentText").textContent=
      percent.toFixed(4)+"%";

  setFullState(
    "public",
    used>=PUBLIC_LIMIT
  );

  setFullTextState(
    "public",
    used>=PUBLIC_LIMIT
  );
}

function updatePrivate(slot){
  const used=privateUsed(slot);
  const available=
    privateAvailable(slot);
  const percent=
    privatePercent(slot);

  if($("available"+slot))
    $("available"+slot).textContent=
      formatSize(available);

  if($("percent"+slot))
    $("percent"+slot).textContent=
      percent.toFixed(4)+"%";

  if($("progress"+slot))
    $("progress"+slot).style.width=
      percent+"%";

  if($("percentText"+slot))
    $("percentText"+slot).textContent=
      percent.toFixed(4)+"%";

  setFullState(
    "slot"+slot,
    used>=PRIVATE_LIMIT
  );

  setFullTextState(
    "slot"+slot,
    used>=PRIVATE_LIMIT
  );
}

function updateStats(){
  updatePublic();

  for(let i=1;i<=9;i++){
    updatePrivate(i);
  }
}

function setFullState(slot,full){
  const element=
    slot==="public"
      ?$("publicButton")
      :document.querySelector(
        '.join[data-slot="'+
        slot.replace("slot","")+
        '"]'
      );

  if(element){
    element.classList.toggle(
      "full",
      !!full
    );
  }
}

function setFullTextState(slot,full){
  const page=
    slot==="public"
      ?$("publicPage")
      :$("privatePage");

  if(page){
    page.classList.toggle(
      "storageFull",
      !!full
    );
  }
      }
function safe(value){
  return String(value)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function renderTypeLegend(){
  return `<div class="typeLegend">
    <span class="type doc">DOC</span>
    <span class="type photo">Photo</span>
    <span class="type video">Video</span>
    <span class="type apk">APK/EXE</span>
    <span class="type mobile">Mobile backup/config</span>
  </div>`;
}

function renderRestoreButton(post){
  if(!post||!hasRestorableFile(post)){
    return "";
  }

  const id=String(
    post.id||
    postFileName(post)
  );

  return `<button
    class="restoreButton"
    data-restore-id="${safe(id)}"
  >Restore</button>`;
}

function renderPostFile(post,slot){
  const file=postFileName(post);
  const type=getFileType(file);
  const caption=
    post.caption||
    post.title||
    "";

  const id=String(
    post.id||file
  );

  return `<div
    class="file cloudFile ${type}"
    data-post-id="${safe(id)}"
    data-slot="${safe(slot)}"
  >
    <div class="fileName">
      ${safe(file)}
    </div>

    <div class="fileType">
      ${safe(type)}
    </div>

    <div class="fileSize">
      ${formatSize(getFileSize(post))}
    </div>

    ${
      caption
        ?`<div class="fileCaption">
          ${safe(caption)}
        </div>`
        :""
    }

    ${renderRestoreButton(post)}
  </div>`;
}

function renderFile(file){
  const name=String(
    file.name||
    file.file||
    file.filename||
    "Unnamed file"
  );

  const type=getFileType(name);

  const caption=
    file.caption||
    file.description||
    "";

  const post=findPostByFile(
    name,
    file.slot
  );

  return `<div
    class="file ${type}"
    data-file-name="${safe(name)}"
  >
    <div class="fileName">
      ${safe(name)}
    </div>

    <div class="fileType">
      ${safe(type)}
    </div>

    <div class="fileSize">
      ${formatSize(getLocalFileSize(file))}
    </div>

    ${
      caption
        ?`<div class="fileCaption">
          ${safe(caption)}
        </div>`
        :""
    }

    ${
      post
        ?renderRestoreButton(post)
        :""
    }
  </div>`;
}

function bindRestoreButtons(){
  document
    .querySelectorAll(".restoreButton")
    .forEach(button=>{
      if(button.dataset.bound==="1"){
        return;
      }

      button.dataset.bound="1";

      button.addEventListener(
        "click",
        ()=>{
          restorePost(
            button.dataset.restoreId
          );
        }
      );
    });
}

function renderPublic(){
  const box=$("publicFiles");

  if(!box){
    return;
  }

  box.innerHTML=
    renderTypeLegend();

  const names=new Set();

  getFiles()
    .filter(
      file=>
        normalizeSlot(file.slot)==="public"
    )
    .forEach(file=>{
      const name=String(
        file.name||
        file.file||
        file.filename||
        ""
      ).trim().toLowerCase();

      if(name){
        names.add(name);
      }

      box.insertAdjacentHTML(
        "beforeend",
        renderFile(file)
      );
    });

  getPostsForSlot("public")
    .filter(hasRestorableFile)
    .forEach(post=>{
      const name=
        postFileName(post)
          .toLowerCase();

      if(names.has(name)){
        return;
      }

      names.add(name);

      box.insertAdjacentHTML(
        "beforeend",
        renderPostFile(
          post,
          "public"
        )
      );
    });

  bindRestoreButtons();
}

function renderPrivate(slot){
  const box=$("privateFiles");

  if(!box){
    return;
  }

  box.innerHTML=
    renderTypeLegend();

  const names=new Set();

  getFiles()
    .filter(
      file=>
        normalizeSlot(file.slot)==="slot"+slot
    )
    .forEach(file=>{
      const name=String(
        file.name||
        file.file||
        file.filename||
        ""
      ).trim().toLowerCase();

      if(name){
        names.add(name);
      }

      box.insertAdjacentHTML(
        "beforeend",
        renderFile(file)
      );
    });

  getPostsForSlot("slot"+slot)
    .filter(hasRestorableFile)
    .forEach(post=>{
      const name=
        postFileName(post)
          .toLowerCase();

      if(names.has(name)){
        return;
      }

      names.add(name);

      box.insertAdjacentHTML(
        "beforeend",
        renderPostFile(
          post,
          "slot"+slot
        )
      );
    });

  bindRestoreButtons();
}

function showRestorePage(){
  let page=$("restorePage");

  if(!page){
    page=document.createElement(
      "section"
    );

    page.id="restorePage";

    page.innerHTML=`
      <h2>Restoring...</h2>

      <div id="restoreTimer">
        0%
      </div>

      <div class="restoreProgress">
        <div
          id="restoreProgress"
          style="width:0%"
        ></div>
      </div>

      <div id="restoreResult"></div>
    `;

    document.body.appendChild(page);
  }

  pages.forEach(id=>{
    const element=$(id);

    if(element){
      element.classList.add(
        "hidden"
      );
    }
  });

  page.classList.remove(
    "hidden"
  );
}

async function runRestore(post){
  showRestorePage();

  const progress=
    $("restoreProgress");

  const timer=
    $("restoreTimer");

  const result=
    $("restoreResult");

  if(result){
    result.textContent=
      "Preparing restore...";
  }

  let percent=0;

  while(percent<100){
    await new Promise(
      resolve=>
        setTimeout(resolve,100)
    );

    percent+=10;

    if(progress){
      progress.style.width=
        percent+"%";
    }

    if(timer){
      timer.textContent=
        percent+"%";
    }
  }

  const url=
    getDownloadURL(post);

  if(result){
    result.innerHTML=`
      <div>
        restore successful
      </div>

      <a
        class="restoreDownload"
        href="${safe(url)}"
        target="_blank"
        rel="noopener"
      >
        Download / Open
      </a>

      <br><br>

      <button id="restoreOk">
        OK
      </button>
    `;

    const ok=$("restoreOk");

    if(ok){
      ok.addEventListener(
        "click",
        home
      );
    }
  }
}

async function restorePost(id){
  const post=findPostById(id);

  if(
    !post||
    !hasRestorableFile(post)
  ){
    return;
  }

  const slot=
    normalizeSlot(post.slot);

  if(slot==="public"){
    const password=
      prompt(
        "Enter backup password:"
      );

    if(password===null){
      return;
    }

    if(
      password!==
      getRestorePassword(post)
    ){
      alert(
        "restore unsuccessful"
      );
      return;
    }
  }

  await runRestore(post);
}

function show(pageId){
  pages.forEach(id=>{
    const page=$(id);

    if(page){
      page.classList.add(
        "hidden"
      );
    }
  });

  const target=$(pageId);

  if(target){
    target.classList.remove(
      "hidden"
    );
  }

  window.scrollTo(0,0);
}

function home(){
  if(isLocked()){
    showLock();
    return;
  }

  updateStats();
  show("homePage");
}

function goHome(){
  home();
}

function goPublic(){
  openPublic();
}

function goPrivate(slot){
  openPrivate(slot);
}
async function openPublic(){
  if(isLocked()){
    showLock();
    return;
  }

  await loadPosts();

  updatePublic();

  if(publicFull()){
    show("fullPage");
    return;
  }

  show("publicPage");
  updatePublic();
  renderPublic();
}

function join(slot){
  if(isLocked()){
    showLock();
    return;
  }

  slot=Number(slot);

  if(
    !Number.isInteger(slot)||
    slot<1||
    slot>9
  ){
    return;
  }

  currentSlot=slot;

  if($("loginText")){
    $("loginText").textContent=
      "Enter password for Slot "+
      slot+".";
  }

  if($("slotPassword")){
    $("slotPassword").value="";
  }

  if($("loginError")){
    $("loginError").textContent="";
  }

  show("loginPage");
}

function login(){
  const password=
    $("slotPassword")
      ?$("slotPassword").value
      :"";

  if(
    password!==SLOT_PASSWORDS[currentSlot]
  ){
    if($("loginError")){
      $("loginError").textContent=
        "Incorrect password.";
    }

    return;
  }

  if($("loginError")){
    $("loginError").textContent="";
  }

  openPrivate(currentSlot);
}

async function openPrivate(slot){
  if(isLocked()){
    showLock();
    return;
  }

  currentSlot=Number(slot);

  await loadPosts();

  if($("privateTitle")){
    $("privateTitle").textContent=
      "Slot "+slot;
  }

  updatePrivate(slot);
  renderPrivate(slot);
  show("privatePage");
}

function openCheck(){
  if(isLocked()){
    showLock();
    return;
  }

  if($("checkSlot")){
    $("checkSlot").value="";
  }

  if($("checkPassword")){
    $("checkPassword").value="";
  }

  if($("checkError")){
    $("checkError").textContent="";
  }

  if($("checkResult")){
    $("checkResult")
      .classList.add("hidden");
  }

  show("checkPage");
}

async function checkPrivate(){
  await loadPosts();

  const slot=Number(
    $("checkSlot")
      ?$("checkSlot").value
      :0
  );

  const password=
    $("checkPassword")
      ?$("checkPassword").value
      :"";

  if(
    slot<1||
    slot>9
  ){
    if($("checkError")){
      $("checkError").textContent=
        "Invalid slot.";
    }

    return;
  }

  if(
    password!==SLOT_PASSWORDS[slot]
  ){
    if($("checkError")){
      $("checkError").textContent=
        "Incorrect password.";
    }

    return;
  }

  if($("checkError")){
    $("checkError").textContent="";
  }

  const total=getPrivateSize(slot);

  if($("checkResult")){
    $("checkResult")
      .classList.remove("hidden");

    $("checkResult").innerHTML=`
      <strong>Slot ${slot}</strong><br>
      Used: ${formatSize(total)}<br>
      Available:
      ${formatSize(
        Math.max(
          0,
          PRIVATE_LIMIT-total
        )
      )}<br>
      Used:
      ${Math.min(
        100,
        total/PRIVATE_LIMIT*100
      ).toFixed(4)}%
    `;
  }
}

function agree(){
  localStorage.setItem(
    SYNC,
    "1"
  );

  updateStats();
  show("homePage");
}

function isLocked(){
  if(
    localStorage.getItem(
      PERMANENT
    )==="1"
  ){
    return true;
  }

  const start=Number(
    localStorage.getItem(
      LOCK_START
    )||0
  );

  const duration=Number(
    localStorage.getItem(
      LOCK_DURATION
    )||0
  );

  if(!start||!duration){
    return false;
  }

  return (
    duration-
    (Date.now()-start)
  )>0;
}

function refuse(){
  let count=Number(
    localStorage.getItem(
      LOCK_COUNT
    )||0
  );

  count++;

  localStorage.setItem(
    LOCK_COUNT,
    String(count)
  );

  if(count>=9){
    localStorage.setItem(
      PERMANENT,
      "1"
    );

    localStorage.setItem(
      LOCK_START,
      String(Date.now())
    );

    showLock();
    return;
  }

  const duration=
    LOCK_TIMES[count-1];

  localStorage.setItem(
    LOCK_DURATION,
    String(duration)
  );

  localStorage.setItem(
    LOCK_START,
    String(Date.now())
  );

  showLock();
}

function showLock(){
  show("lockPage");
  updateTimer();
}

function updateTimer(){
  const button=
    $("sorryButton");

  if(
    localStorage.getItem(
      PERMANENT
    )==="1"
  ){
    if($("timer")){
      $("timer").textContent=
        "PERMANENTLY LOCKED";
    }

    if(button){
      button.disabled=true;
    }

    return;
  }

  const start=Number(
    localStorage.getItem(
      LOCK_START
    )||0
  );

  const duration=Number(
    localStorage.getItem(
      LOCK_DURATION
    )||0
  );

  const remaining=Math.max(
    0,
    duration-(Date.now()-start)
  );

  if(remaining<=0){
    if($("timer")){
      $("timer").textContent=
        "00:00:00";
    }

    if(button){
      button.disabled=false;
    }

    return;
  }

  if(button){
    button.disabled=true;
  }

  if($("timer")){
    $("timer").textContent=
      formatTime(remaining);
  }

  setTimeout(
    updateTimer,
    1000
  );
}

function formatTime(ms){
  let total=Math.ceil(
    ms/1000
  );

  const days=Math.floor(
    total/86400
  );

  total%=86400;

  const hours=Math.floor(
    total/3600
  );

  total%=3600;

  const minutes=Math.floor(
    total/60
  );

  const seconds=total%60;

  if(days>0){
    return (
      String(days).padStart(2,"0")+
      ":"+
      String(hours).padStart(2,"0")+
      ":"+
      String(minutes).padStart(2,"0")+
      ":"+
      String(seconds).padStart(2,"0")
    );
  }

  return (
    String(hours).padStart(2,"0")+
    ":"+
    String(minutes).padStart(2,"0")+
    ":"+
    String(seconds).padStart(2,"0")
  );
}

function sorry(){
  if(isLocked()){
    updateTimer();
    return;
  }

  localStorage.removeItem(
    LOCK_START
  );

  localStorage.removeItem(
    LOCK_DURATION
  );

  home();
}

async function refreshCloud(){
  await loadPosts();

  updateStats();

  const publicPage=
    $("publicPage");

  const privatePage=
    $("privatePage");

  if(
    publicPage&&
    !publicPage.classList.contains(
      "hidden"
    )
  ){
    renderPublic();
  }

  if(
    privatePage&&
    !privatePage.classList.contains(
      "hidden"
    )
  ){
    renderPrivate(
      currentSlot
    );
  }

  bindRestoreButtons();
}

function syncLocalFileCounts(){
  const allPrivate={};

  for(let i=1;i<=9;i++){
    allPrivate[i]=
      getPrivateSize(i);
  }

  localStorage.setItem(
    PUBLIC_USED,
    String(
      getPublicSize()
    )
  );

  localStorage.setItem(
    PRIVATE_USED,
    JSON.stringify(
      allPrivate
    )
  );
}

window.addEventListener(
  "error",
  event=>{
    console.error(
      "Barmaan Cloud error:",
      event.error||
      event.message
    );
  }
);

window.addEventListener(
  "unhandledrejection",
  event=>{
    console.error(
      "Barmaan Cloud promise error:",
      event.reason
    );
  }
);
document.addEventListener(
  "DOMContentLoaded",
  ()=>{
    const publicButton=
      $("publicButton");

    if(publicButton){
      publicButton.addEventListener(
        "click",
        openPublic
      );
    }

    const checkButton=
      $("checkButton");

    if(checkButton){
      checkButton.addEventListener(
        "click",
        openCheck
      );
    }

    const loginButton=
      $("loginButton");

    if(loginButton){
      loginButton.addEventListener(
        "click",
        login
      );
    }

    const checkPrivateButton=
      $("checkPrivateButton");

    if(checkPrivateButton){
      checkPrivateButton.addEventListener(
        "click",
        checkPrivate
      );
    }

    const agreeButton=
      $("agreeButton");

    if(agreeButton){
      agreeButton.addEventListener(
        "click",
        agree
      );
    }

    const refuseButton=
      $("refuseButton");

    if(refuseButton){
      refuseButton.addEventListener(
        "click",
        refuse
      );
    }

    const sorryButton=
      $("sorryButton");

    if(sorryButton){
      sorryButton.addEventListener(
        "click",
        sorry
      );
    }

    document
      .querySelectorAll(".join")
      .forEach(button=>{
        button.addEventListener(
          "click",
          ()=>{
            join(
              Number(
                button.dataset.slot
              )
            );
          }
        );
      });

    document
      .querySelectorAll(".back")
      .forEach(button=>{
        button.addEventListener(
          "click",
          home
        );
      });

    const slotPassword=
      $("slotPassword");

    if(slotPassword){
      slotPassword.addEventListener(
        "keydown",
        event=>{
          if(event.key==="Enter"){
            event.preventDefault();
            login();
          }
        }
      );
    }

    const checkPassword=
      $("checkPassword");

    if(checkPassword){
      checkPassword.addEventListener(
        "keydown",
        event=>{
          if(event.key==="Enter"){
            event.preventDefault();
            checkPrivate();
          }
        }
      );
    }

    syncLocalFileCounts();

    loadPosts()
      .then(()=>{
        updateStats();
        bindRestoreButtons();

        if(isLocked()){
          showLock();
        }else{
          show("homePage");
        }
      })
      .catch(error=>{
        console.error(error);
        updateStats();

        if(isLocked()){
          showLock();
        }else{
          show("homePage");
        }
      });
  }
);

setInterval(
  ()=>{
    if(isLocked()){
      updateTimer();
    }
  },
  1000
);

window.addEventListener(
  "pageshow",
  ()=>{
    loadPosts().then(()=>{
      updateStats();
      bindRestoreButtons();

      const publicPage=
        $("publicPage");

      if(
        publicPage&&
        !publicPage.classList.contains(
          "hidden"
        )
      ){
        renderPublic();
      }

      const privatePage=
        $("privatePage");

      if(
        privatePage&&
        !privatePage.classList.contains(
          "hidden"
        )
      ){
        renderPrivate(
          currentSlot
        );
      }
    });
  }
);

document.addEventListener(
  "visibilitychange",
  ()=>{
    if(
      document.visibilityState!=="visible"
    ){
      return;
    }

    loadPosts().then(()=>{
      updateStats();

      const publicPage=
        $("publicPage");

      const privatePage=
        $("privatePage");

      if(
        publicPage&&
        !publicPage.classList.contains(
          "hidden"
        )
      ){
        renderPublic();
      }

      if(
        privatePage&&
        !privatePage.classList.contains(
          "hidden"
        )
      ){
        renderPrivate(
          currentSlot
        );
      }

      bindRestoreButtons();
    });
  }
);

window.addEventListener(
  "storage",
  event=>{
    if(
      event.key===FILES||
      event.key===PUBLIC_USED||
      event.key===PRIVATE_USED
    ){
      loadPosts().then(()=>{
        updateStats();

        const publicPage=
          $("publicPage");

        const privatePage=
          $("privatePage");

        if(
          publicPage&&
          !publicPage.classList.contains(
            "hidden"
          )
        ){
          renderPublic();
        }

        if(
          privatePage&&
          !privatePage.classList.contains(
            "hidden"
          )
        ){
          renderPrivate(
            currentSlot
          );
        }
      });
    }
  }
);

window.BarmaanCloud={
  loadPosts,
  getPostsForSlot,
  renderPublic,
  renderPrivate,
  restorePost,
  openPublic,
  openPrivate,
  join,
  login,
  openCheck,
  checkPrivate,
  updateStats,
  getPublicSize,
  getPrivateSize,
  getPublicUsed,
  privateUsed,
  publicAvailable,
  privateAvailable,
  publicPercent,
  privatePercent,
  formatSize,
  isLocked,
  showLock,
  refreshCloud
};

(async function(){
  try{
    await loadPosts();

    updateStats();
    bindRestoreButtons();

    if(isLocked()){
      showLock();
    }else{
      show("homePage");
    }

  }catch(error){
    console.error(
      "Barmaan Cloud startup error:",
      error
    );

    updateStats();

    if(isLocked()){
      showLock();
    }else{
      show("homePage");
    }
  }
})();
