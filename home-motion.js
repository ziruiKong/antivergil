const dialog = document.querySelector('#consent');
const categories = ['preferences','statistics','marketing'];
const defaults = {preferences:true,statistics:true,marketing:true};
const key = 'antivergil-consent-v1';
let choices;
try { choices = JSON.parse(localStorage.getItem(key)); } catch {}

function applyChoices(value = defaults){
  for(const name of categories) dialog.querySelector('[name="'+name+'"]').checked = Boolean(value?.[name] ?? defaults[name]);
}

function currentSelection(){
  return Object.fromEntries(categories.map(name=>[name,dialog.querySelector('[name="'+name+'"]').checked]));
}

function persist(value){
  choices={necessary:true,...value};
  if(window.AntivergilPrivacy?.save) window.AntivergilPrivacy.save(value);
  else try {localStorage.setItem(key,JSON.stringify(choices));}catch{}
  document.querySelector('#cookies').setAttribute('aria-label','Privacy settings saved');
}

function showConsent(){
  applyChoices(choices);
  if(!dialog.open) dialog.showModal();
}

dialog.addEventListener('click', event=>{
  const button=event.target.closest('button[data-choice]');
  if(!button)return;
  persist(currentSelection());
  dialog.close();
});
dialog.addEventListener('cancel',e=>{if(!choices)e.preventDefault()});
document.querySelector('#cookies').onclick=showConsent;
if(!choices)showConsent();
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const mobileGallery=matchMedia('(max-width: 650px)');
function scramble(event){
  if(reduced.matches)return;
  const label=event.currentTarget;
  if(label.dataset.running)return;
  const original=label.textContent;
  label.dataset.running='1';
  const start=performance.now();
  function frame(now){
    const count=Math.floor((now-start)/30);
    label.textContent=Array.from(original,(c,i)=>i<count||c===' '?c:String.fromCharCode(65+Math.floor(Math.random()*26))).join('');
    if(count<original.length)requestAnimationFrame(frame);else delete label.dataset.running;
  }
  requestAnimationFrame(frame);
}
for(const tile of gallery.children){
  const img=tile.querySelector('img');
  const title=tile.dataset.title || tile.textContent.replace(' ↗','');
  const frame=document.createElement('div');
  frame.className='photo-window';
  frame.append(img);
  tile.setAttribute('aria-label',title);
  tile.replaceChildren(frame);
  if(tile.dataset.credit){
    const credit=document.createElement('span');
    credit.className='tile-credit';
    credit.textContent=tile.dataset.credit;
    frame.append(credit);
  }
}
for(const link of document.querySelectorAll('nav a')){
  link.addEventListener('pointerenter',()=>scramble({currentTarget:link}));
}
const originals=[...gallery.children];
for(const tile of originals){const copy=tile.cloneNode(true);copy.tabIndex=-1;copy.setAttribute('aria-hidden','true');gallery.append(copy);}
const track=document.createElement('div');
track.className='gallery-track';
track.append(...gallery.children);
for(const tile of originals){const copy=tile.cloneNode(true);copy.tabIndex=-1;copy.setAttribute("aria-hidden","true");track.append(copy);}
gallery.append(track);

const hoverLabel=document.createElement('div');
hoverLabel.className='gallery-hover-label';
hoverLabel.setAttribute('aria-hidden','true');
gallery.append(hoverLabel);
let hoverLabelTitle='';
let hoverScrambleToken=0;
function scrambleHoverLabel(text){
  const original=String(text||'');
  const token=++hoverScrambleToken;
  if(reduced.matches){hoverLabel.textContent=original;return;}
  const start=performance.now();
  function frame(now){
    if(token!==hoverScrambleToken)return;
    const count=Math.floor((now-start)/30);
    hoverLabel.textContent=Array.from(original,(c,i)=>i<count||c===' '?c:String.fromCharCode(65+Math.floor(Math.random()*26))).join('');
    if(count<original.length)requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
function hideHoverLabel(){
  hoverLabel.classList.remove('is-visible');
  hoverLabelTitle='';
}
gallery.addEventListener('pointermove',event=>{
  if(event.pointerType==='touch'){hideHoverLabel();return;}
  const tile=event.target.closest('.tile');
  if(!tile){hideHoverLabel();return;}
  const frame=event.target.closest('.photo-window');
  if(frame){
    const frameRect=frame.getBoundingClientRect();
    frame.style.setProperty('--pan',((event.clientX-frameRect.left)/frameRect.width-.5)*9+'%');
    frame.style.setProperty('--lift',((event.clientY-frameRect.top)/frameRect.height-.5)*5+'%');
  }
  const title=tile.getAttribute('aria-label')||'';
  if(title!==hoverLabelTitle){
    hoverLabelTitle=title;
    scrambleHoverLabel(title.toUpperCase());
  }
  hoverLabel.classList.add('is-visible');
  const galleryRect=gallery.getBoundingClientRect();
  const labelRect=hoverLabel.getBoundingClientRect();
  const left=Math.max(10,Math.min(galleryRect.width-labelRect.width-10,event.clientX-galleryRect.left+16));
  const top=Math.max(10,Math.min(galleryRect.height-labelRect.height-10,event.clientY-galleryRect.top+16));
  hoverLabel.style.left=`${left}px`;
  hoverLabel.style.top=`${top}px`;
});
gallery.addEventListener('pointerleave',hideHoverLabel);
const motion=track.animate(
  [{transform:'translate3d(0,0,0)'},{transform:'translate3d(-33.3333333333%,0,0)'}],
  {duration:1000,iterations:Infinity,easing:'linear'}
);
function resizeTrack(){
  const duration=track.getBoundingClientRect().width/3/32*1000;
  if(duration>0)motion.effect.updateTiming({duration});
}
new ResizeObserver(resizeTrack).observe(track);
resizeTrack();
let resumeTimer;
function syncPlayback(){
  clearTimeout(resumeTimer);
  if(mobileGallery.matches){
    motion.pause();
    motion.currentTime=0;
    return;
  }
  if(reduced.matches || document.hidden || gallery.matches(':hover,:focus-within'))motion.pause();
  else motion.play();
}
for(const event of ['pointerenter','pointerleave','focusin'])gallery.addEventListener(event,syncPlayback);
gallery.addEventListener('focusout',()=>requestAnimationFrame(syncPlayback));
reduced.addEventListener('change',syncPlayback);
mobileGallery.addEventListener('change',()=>{
  if(!mobileGallery.matches)gallery.scrollLeft=0;
  syncPlayback();
});
document.addEventListener('visibilitychange',syncPlayback);
syncPlayback();

const footerMenu = document.querySelector('footer details');
if (footerMenu) {
  let closeTimer;
  let menuPinned = false;
  const summary = footerMenu.querySelector('summary');
  const closeMenu = () => {
    clearTimeout(closeTimer);
    footerMenu.open = false;
    menuPinned = false;
  };
  footerMenu.addEventListener('pointerenter', () => {
    clearTimeout(closeTimer);
    footerMenu.open = true;
  });
  footerMenu.addEventListener('pointerleave', () => {
    clearTimeout(closeTimer);
    if (!menuPinned) closeTimer = setTimeout(() => { footerMenu.open = false; }, 140);
  });
  summary.addEventListener('click', event => {
    event.preventDefault();
    clearTimeout(closeTimer);
    if (!footerMenu.open) {
      footerMenu.open = true;
      menuPinned = true;
    } else if (!menuPinned) {
      menuPinned = true;
    } else {
      closeMenu();
    }
  });
  footerMenu.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenu();
  });
  document.addEventListener('pointerdown', event => {
    if (menuPinned && !footerMenu.contains(event.target)) closeMenu();
  });
}
