"use strict";

const SLOT_PASSWORDS={
1:"38423",
2:"39099",
3:"02833",
4:"82731",
5:"29373",
6:"63742",
7:"92382",
8:"92842",
9:"93832"
};

const PUBLIC_LIMIT=500;
const PRIVATE_LIMIT=1024;

const PUBLIC_USED=
"barmaan_cloud_public_used";

const PRIVATE_USED=
"barmaan_cloud_private_used";

const FILES=
"barmaan_cloud_files";

const LOCK_COUNT=
"barmaan_cloud_lock_count";

const LOCK_START=
"barmaan_cloud_lock_start";

const LOCK_DURATION=
"barmaan_cloud_lock_duration";

const PERMANENT=
"barmaan_cloud_permanent";

const SYNC=
"barmaan_cloud_sync";

const LOCK_TIMES=[
600000,
1800000,
3600000,
5400000,
7200000,
86400000,
604800000,
31536000000
];

let currentSlot=0;

const pages=[
"homePage",
"publicPage",
"loginPage",
"privatePage",
"checkPage",
"fullPage",
"noSpacePage",
"lockPage"
];

function $(id){
return document.getElementById(id);
}

function show(id){
pages.forEach(page=>{
$(page).classList.add("hidden");
});
$(id).classList.remove("hidden");
}

function isLocked(){

if(localStorage.getItem(PERMANENT)==="1"){
return true;
}

const start=
Number(localStorage.getItem(LOCK_START)||0);

const duration=
Number(localStorage.getItem(LOCK_DURATION)||0);

if(!start||!duration){
return false;
}

if(Date.now()-start<duration){
return true;
}

localStorage.removeItem(LOCK_START);
localStorage.removeItem(LOCK_DURATION);

return false;
}

function home(){

if(isLocked()){
showLock();
return;
}

show("homePage");
updateStats();
}

function getPublicUsed(){
return Number(
localStorage.getItem(PUBLIC_USED)||0
);
}

function setPublicUsed(value){

value=Math.max(
0,
Math.min(PUBLIC_LIMIT,value)
);

localStorage.setItem(
PUBLIC_USED,
String(value)
);
}

function publicFull(){
return getPublicUsed()>=PUBLIC_LIMIT;
}

function publicPercent(){

return Math.min(
100,
getPublicUsed()/PUBLIC_LIMIT*100
);

}

function updatePublic(){

const used=getPublicUsed();
const percent=publicPercent();

$("publicUsed").textContent=
used+" MB";

$("publicPercent").textContent=
percent.toFixed(1)+"%";

$("publicProgress").style.width=
percent+"%";

$("publicUsed2").textContent=
used+" MB";

$("publicPercent2").textContent=
percent.toFixed(1)+"%";

$("publicProgress2").style.width=
percent+"%";

}

function getPrivateUsage(){

try{

return JSON.parse(
localStorage.getItem(PRIVATE_USED)||"{}"
);

}catch(error){

return {};

}

}

function privateUsed(slot){

const data=getPrivateUsage();

return Number(data[slot]||0);

}

function privatePercent(slot){

return Math.min(
100,
privateUsed(slot)/PRIVATE_LIMIT*100
);

}

function updatePrivate(){

for(let slot=1;slot<=9;slot++){

$("percent"+slot).textContent=
privatePercent(slot).toFixed(1)+"%";

}

}

function updateStats(){

updatePublic();
updatePrivate();

}

function openPublic(){

if(isLocked()){
showLock();
return;
}

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

if(publicFull()){
show("fullPage");
return;
}

currentSlot=slot;

$("loginText").textContent=
"Enter password for Slot "+slot+".";

$("slotPassword").value="";
$("loginError").textContent="";

show("loginPage");

}

function login(){

const password=
$("slotPassword").value;

if(password!==SLOT_PASSWORDS[currentSlot]){

$("loginError").textContent=
"Incorrect password.";

return;

}

$("loginError").textContent="";

openPrivate(currentSlot);

}

function openPrivate(slot){

if(isLocked()){
showLock();
return;
}

currentSlot=slot;

$("privateTitle").textContent=
"Slot "+slot;

const used=privateUsed(slot);
const percent=privatePercent(slot);

$("privateInfo").innerHTML=
"<b>Slot "+slot+"</b><br>"+
"1GB available<br>"+
used+" MB used<br>"+
percent.toFixed(1)+"% full"+
'<div class="progress">'+
'<div class="bar private" style="width:'+
percent+'%"></div>'+
"</div>";

renderPrivate(slot);

show("privatePage");

}

function getFiles(){

try{

return JSON.parse(
localStorage.getItem(FILES)||"[]"
);

}catch(error){

return [];

}

}

function renderPublic(){

const files=
getFiles().filter(file=>
file.slot==="public"
);

if(!files.length){

$("publicFiles").textContent=
"No files in Public Slot.";

return;

}

$("publicFiles").innerHTML=
files.map(renderFile).join("");

}

function renderPrivate(slot){

const files=
getFiles().filter(file=>
Number(file.slot)===slot
);

if(!files.length){

$("privateFiles").textContent=
"No private files.";

return;

}

$("privateFiles").innerHTML=
files.map(renderFile).join("");

}

function renderFile(file){

const type=
getFileType(
file.name||file.type||""
);

return `
<div class="file ${type}">
<b>${safe(file.name||"Backup")}</b>
<br>
Size: ${Number(file.size||0)} MB
<br>
Type: ${safe(file.type||"Unknown")}
${file.caption?
"<br>Caption: "+safe(file.caption):
""}
</div>
`;

}

function getFileType(name){

const n=
String(name).toLowerCase();

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
n.endsWith(".mov")
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

return "";

}

function openCheck(){

if(isLocked()){
showLock();
return;
}

$("checkSlot").value="";
$("checkPassword").value="";
$("checkError").textContent="";
$("checkResult").classList.add("hidden");

show("checkPage");

}

function checkPrivate(){

const slot=
Number($("checkSlot").value);

const password=
$("checkPassword").value;

if(slot<1||slot>9){

$("checkError").textContent=
"Enter Slot 1 to Slot 9.";

return;

}

if(password!==SLOT_PASSWORDS[slot]){

$("checkError").textContent=
"Incorrect password.";

return;

}

$("checkError").textContent="";

const files=
getFiles().filter(file=>
Number(file.slot)===slot
);

$("checkResult").classList.remove("hidden");

if(files.length){

$("checkResult").innerHTML=
"<h3>Already owned</h3>"+
"<p>Here's full please manage here</p>"+
files.map(renderFile).join("");

}else{

$("checkResult").innerHTML=
"<h3>No files.</h3>"+
"<p>This Slot is empty.</p>";

}

}

function agree(){

localStorage.setItem(SYNC,"1");

show("homePage");
updateStats();

}

function refuse(){

let count=
Number(localStorage.getItem(LOCK_COUNT)||0);

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
localStorage.getItem(PERMANENT)==="1"
){

$("timer").textContent=
"PERMANENTLY LOCKED";

button.disabled=true;

return;

}

const start=
Number(localStorage.getItem(LOCK_START)||0);

const duration=
Number(localStorage.getItem(LOCK_DURATION)||0);

const remaining=Math.max(
0,
duration-(Date.now()-start)
);

if(remaining<=0){

$("timer").textContent=
"00:00:00";

button.disabled=false;

return;

}

button.disabled=true;

$("timer").textContent=
formatTime(remaining);

setTimeout(
updateTimer,
1000
);

}

function formatTime(ms){

let seconds=
Math.ceil(ms/1000);

const days=
Math.floor(seconds/86400);

seconds%=86400;

const hours=
Math.floor(seconds/3600);

seconds%=3600;

const minutes=
Math.floor(seconds/60);

seconds%=60;

if(days){

return days+"d "+
String(hours).padStart(2,"0")+":"+
String(minutes).padStart(2,"0")+":"+
String(seconds).padStart(2,"0");

}

return String(hours).padStart(2,"0")+":"+
String(minutes).padStart(2,"0")+":"+
String(seconds).padStart(2,"0");

}

function sorry(){

if(isLocked()){

updateTimer();

return;

}

localStorage.removeItem(LOCK_START);
localStorage.removeItem(LOCK_DURATION);

home();

}

function safe(value){

return String(value)
.replaceAll("&","&amp;")
.replaceAll("<","&lt;")
.replaceAll(">","&gt;")
.replaceAll('"',"&quot;")
.replaceAll("'","&#039;");

}

$("publicButton").onclick=
openPublic;

$("checkButton").onclick=
openCheck;

$("loginButton").onclick=
login;

$("checkPrivateButton").onclick=
checkPrivate;

$("agreeButton").onclick=
agree;

$("refuseButton").onclick=
refuse;

$("sorryButton").onclick=
sorry;

document.querySelectorAll(".join")
.forEach(button=>{

button.onclick=()=>{

join(
Number(button.dataset.slot)
);

};

});

document.querySelectorAll(".back")
.forEach(button=>{

button.onclick=home;

});

updateStats();

if(isLocked()){
showLock();
}else{
show("homePage");
}
