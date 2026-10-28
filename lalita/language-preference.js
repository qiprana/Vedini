(function(global){"use strict";
const key="vedini.lalita.language";
function get(){try{return localStorage.getItem(key)==="kn"?"kn":"dev"}catch(e){return "dev"}}
function set(value){const lang=value==="kn"?"kn":"dev";try{localStorage.setItem(key,lang)}catch(e){};return lang}
function bind(onChange){
 const buttons=[...document.querySelectorAll(".lalita-language-bar [data-lalita-language]")];
 function sync(lang){buttons.forEach(b=>{const active=b.dataset.lalitaLanguage===lang;b.classList.toggle("chosen",active);b.setAttribute("aria-pressed",String(active))})}
 for(const button of buttons)button.addEventListener("click",()=>{const lang=set(button.dataset.lalitaLanguage);sync(lang);onChange(lang)});
 const lang=get();sync(lang);return {language:lang,sync};
}
global.VediniLanguage={get,set,bind};
})(window);
