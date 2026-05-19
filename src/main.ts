document.addEventListener('DOMContentLoaded', () => {
  const langToggle = document.getElementById('lang-toggle');
  
  if (langToggle) {
    langToggle.addEventListener('click', toggleLanguage);
  }

  // Initialize lang state
  updateLanguageDisplay(document.documentElement.lang);
});

function toggleLanguage() {
  const currentLang = document.documentElement.lang;
  const newLang = currentLang === 'en' ? 'ar' : 'en';
  
  document.documentElement.lang = newLang;
  document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
  
  updateLanguageDisplay(newLang);
}

function updateLanguageDisplay(lang) {
  const toggleBtn = document.getElementById('lang-toggle');
  if (toggleBtn) {
    toggleBtn.innerText = lang === 'en' ? 'عربي' : 'EN';
  }

  document.querySelectorAll('[data-en][data-ar]').forEach(el => {
    // For inputs and textareas, update placeholder
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        if(el.hasAttribute('placeholder')) {
            el.setAttribute('placeholder', el.getAttribute(`data-${lang}`));
        }
    } else {
        // Find if element contains children that are not just text
        // If it's a simple element update textContent
        if(el.children.length === 0) {
            el.textContent = el.getAttribute(`data-${lang}`);
        } else {
             // For buttons or complex elements where we just want to update text parts
             // This is simplistic, a full site might need deeper DOM traversal
             el.innerHTML = el.getAttribute(`data-${lang}`);
        }
    }
  });
}
